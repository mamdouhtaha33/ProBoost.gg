"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

async function audit(event: Parameters<typeof logAudit>[1]) {
  return logAudit(prisma, event);
}

export async function createOffer(formData: FormData) {
  const session = await requireRole("ADMIN");
  const slug = String(formData.get("slug") ?? "").trim();
  const gameSlug = String(formData.get("gameSlug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const productType = String(formData.get("productType") ?? "BOOSTING") as
    | "BOOSTING"
    | "CURRENCY"
    | "ACCOUNT";
  const basePriceCents = Math.max(0, Number.parseInt(String(formData.get("basePriceCents") ?? "0"), 10) || 0);
  const salePriceRaw = String(formData.get("salePriceCents") ?? "").trim();
  const salePriceCents = salePriceRaw ? Math.max(0, Number.parseInt(salePriceRaw, 10) || 0) : null;
  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const hot = formData.get("hot") === "on";
  const popular = formData.get("popular") === "on";
  const status = (String(formData.get("status") ?? "PUBLISHED")) as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();

  if (!slug || !gameSlug || !title || basePriceCents <= 0) {
    redirect("/dashboard/admin/offers?error=missing");
  }

  const category = categorySlug
    ? await prisma.offerCategory.findUnique({
        where: { gameSlug_slug: { gameSlug, slug: categorySlug } },
      })
    : null;

  const offer = await prisma.offer.create({
    data: {
      slug,
      gameSlug,
      title,
      summary,
      description,
      productType,
      basePriceCents,
      salePriceCents,
      features,
      hot,
      popular,
      status,
      categoryId: category?.id ?? null,
      badge: hot ? "HOT" : popular ? "POPULAR" : salePriceCents != null ? "SALE" : "NONE",
    },
  });
  await audit({
    actorUserId: session.id,
    action: "offer.created",
    targetType: "OFFER",
    targetId: offer.id,
    after: offer,
  });
  revalidatePath("/dashboard/admin/offers");
  revalidatePath("/offers");
  redirect("/dashboard/admin/offers");
}

export async function archiveOffer(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.offer.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit({
    actorUserId: session.id,
    action: "offer.archived",
    targetType: "OFFER",
    targetId: id,
  });
  revalidatePath("/dashboard/admin/offers");
}

export async function publishOffer(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.offer.update({ where: { id }, data: { status: "PUBLISHED" } });
  await audit({
    actorUserId: session.id,
    action: "offer.published",
    targetType: "OFFER",
    targetId: id,
  });
  revalidatePath("/dashboard/admin/offers");
}

export async function createCoupon(formData: FormData) {
  const session = await requireRole("ADMIN");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "PERCENT") as "PERCENT" | "FIXED";
  const valuePercent = type === "PERCENT" ? Number.parseInt(String(formData.get("valuePercent") ?? "0"), 10) || null : null;
  const valueCents = type === "FIXED" ? Number.parseInt(String(formData.get("valueCents") ?? "0"), 10) || null : null;
  const scope = String(formData.get("scope") ?? "GLOBAL") as "GLOBAL" | "GAME" | "OFFER" | "USER";
  const scopeRefId = String(formData.get("scopeRefId") ?? "").trim() || null;
  const minOrderCents = Number.parseInt(String(formData.get("minOrderCents") ?? "0"), 10) || 0;
  const perUserLimit = Number.parseInt(String(formData.get("perUserLimit") ?? "1"), 10) || 1;
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (!code) redirect("/dashboard/admin/coupons?error=missing-code");

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type,
      valuePercent,
      valueCents,
      scope,
      scopeRefId,
      minOrderCents,
      perUserLimit,
      expiresAt,
      status: "ACTIVE",
    },
  });
  await audit({
    actorUserId: session.id,
    action: "coupon.created",
    targetType: "COUPON",
    targetId: coupon.id,
    after: coupon,
  });
  revalidatePath("/dashboard/admin/coupons");
  redirect("/dashboard/admin/coupons");
}

export async function setCouponStatus(formData: FormData) {
  const session = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "ACTIVE") as "ACTIVE" | "PAUSED" | "EXPIRED";
  if (!id) return;
  await prisma.coupon.update({ where: { id }, data: { status } });
  await audit({
    actorUserId: session.id,
    action: `coupon.${status.toLowerCase()}`,
    targetType: "COUPON",
    targetId: id,
  });
  revalidatePath("/dashboard/admin/coupons");
}

export async function setCounter(formData: FormData) {
  await requireRole("ADMIN");
  const key = String(formData.get("key") ?? "");
  const value = Number.parseInt(String(formData.get("value") ?? "0"), 10) || 0;
  if (!key) return;
  await prisma.siteCounter.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidatePath("/dashboard/admin/site");
  revalidatePath("/");
}
