// ARC Raiders pricing configuration. All prices are in cents (USD).
// This drives the dynamic pricing form on the services page and server-side
// price recalculation on order creation (clients never set price directly).

import { z } from "zod";

export const RANKS = [
  { id: "scavenger",  label: "Scavenger",   tier: 1 },
  { id: "raider",     label: "Raider",      tier: 2 },
  { id: "veteran",    label: "Veteran",     tier: 3 },
  { id: "elite",      label: "Elite",       tier: 4 },
  { id: "master",     label: "Master",      tier: 5 },
  { id: "apex",       label: "Apex Raider", tier: 6 },
] as const;

export type RankId = (typeof RANKS)[number]["id"];

export const REGIONS = [
  { id: "na-east", label: "NA-East" },
  { id: "na-west", label: "NA-West" },
  { id: "eu",      label: "EU" },
  { id: "asia",    label: "Asia" },
  { id: "oce",     label: "OCE" },
  { id: "sa",      label: "South America" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const PLATFORMS = [
  { id: "pc",   label: "PC" },
  { id: "ps5",  label: "PlayStation 5" },
  { id: "xbox", label: "Xbox Series X|S" },
] as const;

export const ADDONS = [
  { id: "stream",       label: "Live stream",            price: 1500 }, // +$15
  { id: "express",      label: "Express delivery (24h)", price: 4900 }, // +$49
  { id: "priority",     label: "Priority queue",         price: 2500 }, // +$25
  { id: "duo",          label: "Duo with Pro (no account share)", price: 7500 }, // +$75
  { id: "vod",          label: "Recorded VOD review",    price: 2000 }, // +$20
] as const;

export type AddonId = (typeof ADDONS)[number]["id"];

export const SERVICES = {
  boosting: {
    id: "boosting",
    name: "ARC Raiders: Rank Boosting",
    blurb: "Climb to your goal rank, played by a verified top-tier Pro.",
    priceSchema: "rank-jump",
    pricePerTierJump: 1900, // $19 / tier
  },
  coaching: {
    id: "coaching",
    name: "ARC Raiders: Pro Coaching",
    blurb: "1-on-1 sessions with top 0.1% players. Game-sense, aim, looting.",
    priceSchema: "hours",
    pricePerHour: 2500, // $25 / hr
  },
  carry: {
    id: "carry",
    name: "ARC Raiders: Carry & Co-op",
    blurb: "Squad up with a Pro for raids and missions.",
    priceSchema: "runs",
    pricePerRun: 1500, // $15 / run
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

// ----- Form payload schema -----
export const orderOptionsSchema = z.object({
  service: z.enum(["boosting", "coaching", "carry"]),
  region: z.enum(["na-east", "na-west", "eu", "asia", "oce", "sa"]),
  platform: z.enum(["pc", "ps5", "xbox"]),
  // boosting:
  currentRank: z.string().optional(),
  targetRank:  z.string().optional(),
  // coaching:
  hours: z.coerce.number().int().min(1).max(20).optional(),
  // carry:
  runs: z.coerce.number().int().min(1).max(20).optional(),
  // common:
  addons: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional().default(""),
});

export type OrderOptions = z.infer<typeof orderOptionsSchema>;

// ----- Pricing engine -----
export function computeBasePrice(opts: OrderOptions): number {
  let price = 0;
  switch (opts.service) {
    case "boosting": {
      const cur = RANKS.find((r) => r.id === opts.currentRank);
      const tgt = RANKS.find((r) => r.id === opts.targetRank);
      if (!cur || !tgt) return 0;
      const tiers = Math.max(0, tgt.tier - cur.tier);
      price = tiers * SERVICES.boosting.pricePerTierJump;
      // High-tier multiplier: pushing into Master/Apex is harder
      if (tgt.tier >= 5) price = Math.round(price * 1.35);
      break;
    }
    case "coaching":
      price = (opts.hours ?? 1) * SERVICES.coaching.pricePerHour;
      break;
    case "carry":
      price = (opts.runs ?? 1) * SERVICES.carry.pricePerRun;
      break;
  }

  // Add-ons
  for (const id of opts.addons) {
    const addon = ADDONS.find((a) => a.id === id);
    if (addon) price += addon.price;
  }

  // Region surcharge for low-pop regions (small)
  if (opts.region === "oce" || opts.region === "sa") price = Math.round(price * 1.1);

  return price;
}

export function defaultTitle(opts: OrderOptions): string {
  switch (opts.service) {
    case "boosting": {
      const cur = RANKS.find((r) => r.id === opts.currentRank)?.label ?? "?";
      const tgt = RANKS.find((r) => r.id === opts.targetRank)?.label ?? "?";
      return `Boosting ${cur} → ${tgt}`;
    }
    case "coaching":
      return `Pro Coaching · ${opts.hours ?? 1}h`;
    case "carry":
      return `Carry & Co-op · ${opts.runs ?? 1} run${(opts.runs ?? 1) > 1 ? "s" : ""}`;
  }
}
