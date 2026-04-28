import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

export async function notify(
  client: Tx,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      metadata: input.metadata as object | undefined,
    },
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
