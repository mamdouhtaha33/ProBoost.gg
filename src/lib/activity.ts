import type {
  OrderActivityType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx =
  | PrismaClient
  | Prisma.TransactionClient;

export async function logActivity(
  client: Tx,
  args: {
    orderId: string;
    type: OrderActivityType;
    message: string;
    actorUserId?: string | null;
    metadata?: Prisma.InputJsonValue;
    visibleToPro?: boolean;
    visibleToUser?: boolean;
  },
) {
  return client.orderActivity.create({
    data: {
      orderId: args.orderId,
      type: args.type,
      message: args.message,
      actorUserId: args.actorUserId ?? null,
      metadata: args.metadata,
      visibleToPro: args.visibleToPro ?? true,
      visibleToUser: args.visibleToUser ?? true,
    },
  });
}

export async function logActivityNow(args: {
  orderId: string;
  type: OrderActivityType;
  message: string;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
  visibleToPro?: boolean;
  visibleToUser?: boolean;
}) {
  return logActivity(prisma, args);
}
