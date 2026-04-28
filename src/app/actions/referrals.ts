"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, renderHtml, escapeHtml } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { REFERRAL_REWARD_CENTS } from "@/lib/referrals";

function makeReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function ensureReferralCode(): Promise<string> {
  const sessionUser = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (dbUser?.referralCode) return dbUser.referralCode;

  for (let i = 0; i < 8; i++) {
    const code = makeReferralCode();
    try {
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: { referralCode: code },
      });
      return code;
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === "P2002") continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique referral code. Please try again.");
}

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function inviteByEmail(formData: FormData) {
  const sessionUser = await requireUser();
  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) throw new Error("Enter a valid email.");

  const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  const code = dbUser?.referralCode ?? (await ensureReferralCode());
  const link = `${process.env.NEXTAUTH_URL ?? ""}/?ref=${code}`;

  await prisma.referral.create({
    data: {
      referrerId: sessionUser.id,
      referredEmail: parsed.data.email.toLowerCase(),
      rewardCents: REFERRAL_REWARD_CENTS,
      status: "PENDING",
    },
  });

  await sendEmail({
    to: parsed.data.email,
    template: "referral.reward",
    subject: `${sessionUser.name ?? "A friend"} invited you to ProBoost.gg`,
    html: renderHtml({
      title: "You've been invited",
      bodyHtml: `<p>${escapeHtml(sessionUser.name ?? "A friend")} thinks you'll love ProBoost.gg. Sign up using their link to give them a $10 wallet credit.</p>`,
      ctaUrl: link,
      ctaLabel: "Join ProBoost.gg",
    }),
  });

  revalidatePath("/dashboard/referrals");
}

// Called after a successful order to credit the referrer.
export async function maybeAttributeFirstOrder(userId: string, orderId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.referredById) return;

  const existing = await prisma.referral.findFirst({
    where: { referrerId: user.referredById, referredUserId: user.id },
  });
  if (!existing) return;
  if (existing.status === "REWARD_GRANTED") return;

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: existing.id },
      data: {
        status: "REWARD_GRANTED",
        attributedOrderId: orderId,
      },
    });
    await tx.user.update({
      where: { id: user.referredById! },
      data: { walletCreditCents: { increment: existing.rewardCents } },
    });
    await logAudit(tx, {
      actorUserId: null,
      action: "referral.reward_granted",
      targetType: "REFERRAL",
      targetId: existing.id,
      after: { rewardCents: existing.rewardCents, orderId },
    });
  });

  await notify(prisma, {
    userId: user.referredById,
    type: "REFERRAL_REWARD",
    title: "Referral reward earned",
    body: `You earned $${(existing.rewardCents / 100).toFixed(2)} wallet credit from a referral.`,
    link: "/dashboard/referrals",
  });
}

// Called from the signup flow when a `?ref=CODE` query is present.
export async function consumeReferralCookie(newUserId: string): Promise<void> {
  const c = await cookies();
  const code = c.get("ref_code")?.value;
  if (!code) return;
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === newUserId) return;

  const newUser = await prisma.user.findUnique({ where: { id: newUserId } });
  if (!newUser) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: newUserId },
      data: { referredById: referrer.id },
    });
    await tx.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUserId,
        referredEmail: newUser.email,
        rewardCents: REFERRAL_REWARD_CENTS,
        status: "SIGNED_UP",
      },
    });
  });
  c.delete("ref_code");
}

export async function captureRefCookie(code: string): Promise<void> {
  const c = await cookies();
  c.set("ref_code", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
}

export async function consumeMyReferralCookie(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await consumeReferralCookie(session.user.id);
}
