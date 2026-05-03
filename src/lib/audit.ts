import { AuditTargetType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

export type AuditEvent = {
  actorUserId?: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function logAudit(client: Tx, event: AuditEvent): Promise<void> {
  await client.auditLog.create({
    data: {
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      before: event.before as object | undefined,
      after: event.after as object | undefined,
      ip: event.ip ?? null,
      userAgent: event.userAgent ?? null,
    },
  });
}
