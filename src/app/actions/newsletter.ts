"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logEmail } from "@/lib/email";

export type NewsletterState = { ok: boolean; message?: string };

export async function subscribeToNewsletter(
  _prev: NewsletterState | undefined,
  formData: FormData,
): Promise<NewsletterState> {
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "footer");
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return { ok: false, message: "Enter a valid email." };
  }
  const rl = await rateLimit(`newsletter:${emailRaw}`, 5, 60 * 60);
  if (!rl.allowed) return { ok: false, message: "Try again later." };

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: emailRaw } });
  if (existing && existing.status === "CONFIRMED") {
    return { ok: true, message: "You're already subscribed." };
  }

  const unsubToken = randomBytes(16).toString("hex");
  await prisma.newsletterSubscriber.upsert({
    where: { email: emailRaw },
    update: { status: "CONFIRMED", source, confirmedAt: new Date() },
    create: { email: emailRaw, status: "CONFIRMED", source, unsubToken, confirmedAt: new Date() },
  });

  await logEmail({
    toEmail: emailRaw,
    subject: "Welcome to ProBoost.gg",
    templateName: "newsletter.welcome",
    metadata: { source },
  });
  return { ok: true, message: "Subscribed! Check your inbox for a welcome." };
}
