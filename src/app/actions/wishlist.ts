"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleWishlist(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;
  const offerId = String(formData.get("offerId") ?? "");
  if (!offerId) return;

  const userId = session.user.id!;
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_offerId: { userId, offerId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({ data: { userId, offerId } });
  }
  revalidatePath("/dashboard/wishlist");
  revalidatePath(`/offers`);
}
