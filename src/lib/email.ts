// Email abstraction. Uses Resend when RESEND_API_KEY is set; otherwise logs to
// the EmailLog table with status=SKIPPED so we can audit messages even in dev.

import { prisma } from "@/lib/prisma";

export type EmailTemplate =
  | "order.created"
  | "order.paid"
  | "bid.placed"
  | "bid.accepted"
  | "bid.rejected"
  | "status.changed"
  | "review.received"
  | "refund.requested"
  | "dispute.opened"
  | "dispute.updated"
  | "pro.application.update"
  | "referral.reward";

type SendEmailInput = {
  to: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
};

const FROM = process.env.EMAIL_FROM ?? "ProBoost.gg <noreply@proboost.gg>";

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await prisma.emailLog.create({
      data: {
        toEmail: input.to,
        templateName: input.template,
        subject: input.subject,
        status: "SKIPPED",
        error: "RESEND_API_KEY not configured",
        metadata: input.metadata as object | undefined,
      },
    });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    await prisma.emailLog.create({
      data: {
        toEmail: input.to,
        templateName: input.template,
        subject: input.subject,
        status: res.ok ? "SENT" : "FAILED",
        providerRef: json.id ?? null,
        error: res.ok ? null : json.message ?? `HTTP ${res.status}`,
        metadata: input.metadata as object | undefined,
        sentAt: res.ok ? new Date() : null,
      },
    });
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        toEmail: input.to,
        templateName: input.template,
        subject: input.subject,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
        metadata: input.metadata as object | undefined,
      },
    });
  }
}

export function renderHtml(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0d15;color:#e6e9f2;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#11151f;border:1px solid #1e2434;border-radius:12px;padding:32px;">
${opts.preheader ? `<div style="display:none;color:transparent;height:0;width:0;">${opts.preheader}</div>` : ""}
<div style="font-size:14px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;font-weight:600;">ProBoost.gg</div>
<h1 style="font-size:22px;margin:8px 0 16px;color:#fff;">${opts.title}</h1>
<div style="line-height:1.6;color:#c9cee0;">${opts.bodyHtml}</div>
${
  opts.ctaUrl && opts.ctaLabel
    ? `<div style="margin-top:24px;"><a href="${opts.ctaUrl}" style="display:inline-block;background:#3b82f6;color:#000;font-weight:600;padding:10px 18px;border-radius:8px;text-decoration:none;">${opts.ctaLabel}</a></div>`
    : ""
}
<hr style="margin:32px 0;border:none;border-top:1px solid #1e2434;" />
<div style="font-size:12px;color:#7b8294;">You're receiving this because you have an active ProBoost.gg account. Update your preferences in Settings.</div>
</div></body></html>`;
}
