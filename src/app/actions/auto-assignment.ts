"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProRank } from "@prisma/client";
import { requireRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const ruleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  gameSlug: z.string().optional(),
  service: z.string().optional(),
  minProRank: z.enum(["UNRANKED", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"]),
  maxBidPercent: z.coerce.number().int().min(10).max(500),
  minBidPercent: z.coerce.number().int().min(10).max(500),
  requireProVerified: z.coerce.boolean().optional().default(false),
  enabled: z.coerce.boolean().optional().default(false),
  priority: z.coerce.number().int().min(0).max(10000).default(100),
});

export async function upsertAutoAssignmentRule(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const parsed = ruleSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    gameSlug: formData.get("gameSlug") || undefined,
    service: formData.get("service") || undefined,
    minProRank: formData.get("minProRank") || "GOLD",
    maxBidPercent: formData.get("maxBidPercent") || 110,
    minBidPercent: formData.get("minBidPercent") || 60,
    requireProVerified: formData.get("requireProVerified") === "on",
    enabled: formData.get("enabled") === "on",
    priority: formData.get("priority") || 100,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid rule");
  }
  const data = parsed.data;

  if (data.id) {
    const before = await prisma.autoAssignmentRule.findUnique({ where: { id: data.id } });
    const after = await prisma.autoAssignmentRule.update({
      where: { id: data.id },
      data: {
        name: data.name,
        gameSlug: data.gameSlug ?? null,
        service: data.service ?? null,
        minProRank: data.minProRank as ProRank,
        maxBidPercent: data.maxBidPercent,
        minBidPercent: data.minBidPercent,
        requireProVerified: data.requireProVerified,
        enabled: data.enabled,
        priority: data.priority,
      },
    });
    await logAudit(prisma, {
      actorUserId: admin.id,
      action: "auto_assign.update",
      targetType: "AUTO_ASSIGNMENT_RULE",
      targetId: after.id,
      before: { ...before },
      after: { ...after },
    });
  } else {
    const created = await prisma.autoAssignmentRule.create({
      data: {
        name: data.name,
        gameSlug: data.gameSlug ?? null,
        service: data.service ?? null,
        minProRank: data.minProRank as ProRank,
        maxBidPercent: data.maxBidPercent,
        minBidPercent: data.minBidPercent,
        requireProVerified: data.requireProVerified,
        enabled: data.enabled,
        priority: data.priority,
      },
    });
    await logAudit(prisma, {
      actorUserId: admin.id,
      action: "auto_assign.create",
      targetType: "AUTO_ASSIGNMENT_RULE",
      targetId: created.id,
      after: { ...created },
    });
  }
  revalidatePath("/dashboard/admin/auto-assignment");
}

export async function deleteAutoAssignmentRule(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  await prisma.autoAssignmentRule.delete({ where: { id } });
  await logAudit(prisma, {
    actorUserId: admin.id,
    action: "auto_assign.delete",
    targetType: "AUTO_ASSIGNMENT_RULE",
    targetId: id,
  });
  revalidatePath("/dashboard/admin/auto-assignment");
}
