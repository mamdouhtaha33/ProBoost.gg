/*
  Warnings:

  - A unique constraint covering the columns `[accountListingId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BOOSTING', 'CURRENCY', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('PILOTED', 'SELF_PLAY', 'BOTH');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OfferBadge" AS ENUM ('NONE', 'HOT', 'POPULAR', 'NEW', 'SALE');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('GLOBAL', 'GAME', 'OFFER', 'USER');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WalletEntryKind" AS ENUM ('CASHBACK_EARNED', 'CASHBACK_USED', 'REFERRAL_REWARD', 'PROMO_CREDIT', 'REFUND_CREDIT', 'TIP_RECEIVED', 'TIP_SENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashbackCategory" AS ENUM ('BOOSTING', 'CURRENCY_ACCOUNT');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'PAUSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "TipStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditTargetType" ADD VALUE 'OFFER';
ALTER TYPE "AuditTargetType" ADD VALUE 'COUPON';
ALTER TYPE "AuditTargetType" ADD VALUE 'CASHBACK_TIER';
ALTER TYPE "AuditTargetType" ADD VALUE 'ACCOUNT_LISTING';
ALTER TYPE "AuditTargetType" ADD VALUE 'CURRENCY_LISTING';
ALTER TYPE "AuditTargetType" ADD VALUE 'TIP';
ALTER TYPE "AuditTargetType" ADD VALUE 'NEWSLETTER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accountListingId" TEXT,
ADD COLUMN     "cashbackEarnedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "couponDiscountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currencyListingId" TEXT,
ADD COLUMN     "currencyQuantity" INTEGER,
ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "offerId" TEXT,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'BOOSTING',
ADD COLUMN     "tipAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walletAppliedCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cookieAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cookieMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalSpentCents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OfferCategory" (
    "id" TEXT NOT NULL,
    "gameSlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "iconKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gameSlug" TEXT NOT NULL,
    "categoryId" TEXT,
    "productType" "ProductType" NOT NULL DEFAULT 'BOOSTING',
    "service" TEXT NOT NULL DEFAULT 'boosting',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "basePriceCents" INTEGER NOT NULL,
    "salePriceCents" INTEGER,
    "discountPercent" INTEGER,
    "badge" "OfferBadge" NOT NULL DEFAULT 'NONE',
    "hot" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'BOTH',
    "deliveryHours" INTEGER,
    "status" "OfferStatus" NOT NULL DEFAULT 'PUBLISHED',
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "valuePercent" INTEGER,
    "valueCents" INTEGER,
    "scope" "CouponScope" NOT NULL DEFAULT 'GLOBAL',
    "scopeRefId" TEXT,
    "minOrderCents" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountAppliedCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashbackTier" (
    "id" TEXT NOT NULL,
    "category" "CashbackCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "thresholdCents" INTEGER NOT NULL DEFAULT 0,
    "percentBasis100" INTEGER NOT NULL DEFAULT 500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashbackTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "kind" "WalletEntryKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "gameSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "salePriceCents" INTEGER,
    "attributes" JSONB,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "loginEmail" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "soldOrderId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "gameSlug" TEXT NOT NULL,
    "currencyName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "pricePerUnitCents" INTEGER NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 1000000,
    "deliveryHours" INTEGER NOT NULL DEFAULT 2,
    "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TipStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "unsubToken" TEXT NOT NULL,
    "source" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCounter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "OfferCategory_gameSlug_displayOrder_idx" ON "OfferCategory"("gameSlug", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "OfferCategory_gameSlug_slug_key" ON "OfferCategory"("gameSlug", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_slug_key" ON "Offer"("slug");

-- CreateIndex
CREATE INDEX "Offer_gameSlug_idx" ON "Offer"("gameSlug");

-- CreateIndex
CREATE INDEX "Offer_status_gameSlug_idx" ON "Offer"("status", "gameSlug");

-- CreateIndex
CREATE INDEX "Offer_hot_idx" ON "Offer"("hot");

-- CreateIndex
CREATE INDEX "Offer_popular_idx" ON "Offer"("popular");

-- CreateIndex
CREATE INDEX "Offer_categoryId_idx" ON "Offer"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");

-- CreateIndex
CREATE INDEX "Coupon_scope_idx" ON "Coupon"("scope");

-- CreateIndex
CREATE INDEX "Coupon_expiresAt_idx" ON "Coupon"("expiresAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_orderId_key" ON "CouponRedemption"("couponId", "orderId");

-- CreateIndex
CREATE INDEX "CashbackTier_category_thresholdCents_idx" ON "CashbackTier"("category", "thresholdCents");

-- CreateIndex
CREATE INDEX "WalletEntry_userId_createdAt_idx" ON "WalletEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletEntry_orderId_idx" ON "WalletEntry"("orderId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_offerId_key" ON "WishlistItem"("userId", "offerId");

-- CreateIndex
CREATE INDEX "ProductReview_offerId_idx" ON "ProductReview"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_offerId_authorId_orderId_key" ON "ProductReview"("offerId", "authorId", "orderId");

-- CreateIndex
CREATE INDEX "AccountListing_gameSlug_status_idx" ON "AccountListing"("gameSlug", "status");

-- CreateIndex
CREATE INDEX "AccountListing_sellerId_idx" ON "AccountListing"("sellerId");

-- CreateIndex
CREATE INDEX "CurrencyListing_gameSlug_status_idx" ON "CurrencyListing"("gameSlug", "status");

-- CreateIndex
CREATE INDEX "CurrencyListing_sellerId_idx" ON "CurrencyListing"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tip_orderId_key" ON "Tip"("orderId");

-- CreateIndex
CREATE INDEX "Tip_toUserId_idx" ON "Tip"("toUserId");

-- CreateIndex
CREATE INDEX "Tip_fromUserId_idx" ON "Tip"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubToken_key" ON "NewsletterSubscriber"("unsubToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_accountListingId_key" ON "Order"("accountListingId");

-- CreateIndex
CREATE INDEX "Order_offerId_idx" ON "Order"("offerId");

-- CreateIndex
CREATE INDEX "Order_productType_idx" ON "Order"("productType");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_accountListingId_fkey" FOREIGN KEY ("accountListingId") REFERENCES "AccountListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_currencyListingId_fkey" FOREIGN KEY ("currencyListingId") REFERENCES "CurrencyListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OfferCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountListing" ADD CONSTRAINT "AccountListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyListing" ADD CONSTRAINT "CurrencyListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
