"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOtpAuthUrl,
  generateBase32Secret,
  generateRecoveryCodes,
  verifyTotp,
} from "@/lib/two-factor";
import { logAudit } from "@/lib/audit";

export type TwoFactorEnrollState = {
  ok: boolean;
  error?: string;
  otpauthUrl?: string;
  secret?: string;
  recoveryCodes?: string[];
};

export async function startTwoFactorEnrollment(): Promise<TwoFactorEnrollState> {
  const user = await requireUser();

  const existing = await prisma.twoFactorSecret.findUnique({
    where: { userId: user.id },
  });
  if (existing?.enabled) {
    return {
      ok: false,
      error: "2FA is already enabled. Disable it first to re-enroll.",
    };
  }

  const secret = generateBase32Secret();
  const codes = generateRecoveryCodes();

  await prisma.twoFactorSecret.upsert({
    where: { userId: user.id },
    update: { secret, enabled: false, recoveryCodes: codes },
    create: { userId: user.id, secret, enabled: false, recoveryCodes: codes },
  });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const otpauthUrl = buildOtpAuthUrl({
    issuer: "ProBoost.gg",
    account: dbUser?.email ?? user.id,
    secret,
  });

  return { ok: true, otpauthUrl, secret, recoveryCodes: codes };
}

const confirmSchema = z.object({ token: z.string().min(6).max(8) });

export async function confirmTwoFactor(
  _prev: { ok: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = confirmSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return { ok: false, error: "Enter a 6-digit code." };

  const tf = await prisma.twoFactorSecret.findUnique({ where: { userId: user.id } });
  if (!tf) return { ok: false, error: "Start enrollment first." };

  if (!verifyTotp(tf.secret, parsed.data.token)) {
    return { ok: false, error: "Code didn't match. Try again." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.twoFactorSecret.update({
      where: { userId: user.id },
      data: { enabled: true },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    await logAudit(tx, {
      actorUserId: user.id,
      action: "two_factor.enable",
      targetType: "USER",
      targetId: user.id,
    });
  });

  revalidatePath("/settings/two-factor");
  return { ok: true };
}

export async function disableTwoFactor(): Promise<void> {
  const user = await requireUser();
  await prisma.$transaction(async (tx) => {
    await tx.twoFactorSecret.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false },
    });
    await logAudit(tx, {
      actorUserId: user.id,
      action: "two_factor.disable",
      targetType: "USER",
      targetId: user.id,
    });
  });
  revalidatePath("/settings/two-factor");
}
