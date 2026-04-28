// Multi-game catalog. Each game has its own pricing schema and presets.
// Slugs are stable URLs; do not rename without a redirect.

import { z } from "zod";

export type GameServiceId = "boosting" | "coaching" | "carry";

export type GameRank = { id: string; label: string; tier: number };
export type GameRegion = { id: string; label: string };
export type GamePlatform = { id: string; label: string };
export type GameAddon = { id: string; label: string; priceCents: number };

export type GameDef = {
  slug: string;
  name: string;
  publisher: string;
  hero: string;
  tagline: string;
  description: string;
  accent: string;
  ranks: GameRank[];
  regions: GameRegion[];
  platforms: GamePlatform[];
  addons: GameAddon[];
  services: {
    boosting?: { pricePerTierJump: number; topTierMultiplier: number };
    coaching?: { pricePerHour: number };
    carry?: { pricePerRun: number };
  };
};

const COMMON_REGIONS: GameRegion[] = [
  { id: "na-east", label: "NA-East" },
  { id: "na-west", label: "NA-West" },
  { id: "eu", label: "EU" },
  { id: "asia", label: "Asia" },
  { id: "oce", label: "OCE" },
  { id: "sa", label: "South America" },
];

const COMMON_ADDONS: GameAddon[] = [
  { id: "stream", label: "Live stream", priceCents: 1500 },
  { id: "express", label: "Express delivery (24h)", priceCents: 4900 },
  { id: "priority", label: "Priority queue", priceCents: 2500 },
  { id: "duo", label: "Duo with Pro (no account share)", priceCents: 7500 },
  { id: "vod", label: "Recorded VOD review", priceCents: 2000 },
];

export const GAMES: GameDef[] = [
  {
    slug: "arc-raiders",
    name: "ARC Raiders",
    publisher: "Embark Studios",
    hero: "/games/arc-raiders.svg",
    tagline: "PvPvE looter shooter on a hostile Earth",
    description:
      "Climb the raid ladder against ARC drones, hostile squads, and the unknown. Top-tier ProBoost.gg Pros run NA, EU, and OCE accounts.",
    accent: "#3b82f6",
    ranks: [
      { id: "scavenger", label: "Scavenger", tier: 1 },
      { id: "raider", label: "Raider", tier: 2 },
      { id: "veteran", label: "Veteran", tier: 3 },
      { id: "elite", label: "Elite", tier: 4 },
      { id: "master", label: "Master", tier: 5 },
      { id: "apex", label: "Apex Raider", tier: 6 },
    ],
    regions: COMMON_REGIONS,
    platforms: [
      { id: "pc", label: "PC" },
      { id: "ps5", label: "PlayStation 5" },
      { id: "xbox", label: "Xbox Series X|S" },
    ],
    addons: COMMON_ADDONS,
    services: {
      boosting: { pricePerTierJump: 1900, topTierMultiplier: 1.35 },
      coaching: { pricePerHour: 2500 },
      carry: { pricePerRun: 1500 },
    },
  },
  {
    slug: "valorant",
    name: "Valorant",
    publisher: "Riot Games",
    hero: "/games/valorant.svg",
    tagline: "5v5 tactical shooter — climb every act",
    description:
      "Iron through Radiant. Verified Immortal+ boosters available 24/7 on every Valorant region.",
    accent: "#fa4454",
    ranks: [
      { id: "iron", label: "Iron", tier: 1 },
      { id: "bronze", label: "Bronze", tier: 2 },
      { id: "silver", label: "Silver", tier: 3 },
      { id: "gold", label: "Gold", tier: 4 },
      { id: "platinum", label: "Platinum", tier: 5 },
      { id: "diamond", label: "Diamond", tier: 6 },
      { id: "ascendant", label: "Ascendant", tier: 7 },
      { id: "immortal", label: "Immortal", tier: 8 },
      { id: "radiant", label: "Radiant", tier: 9 },
    ],
    regions: COMMON_REGIONS,
    platforms: [{ id: "pc", label: "PC" }],
    addons: COMMON_ADDONS,
    services: {
      boosting: { pricePerTierJump: 1500, topTierMultiplier: 1.6 },
      coaching: { pricePerHour: 3000 },
      carry: { pricePerRun: 1200 },
    },
  },
  {
    slug: "apex-legends",
    name: "Apex Legends",
    publisher: "Respawn / EA",
    hero: "/games/apex.svg",
    tagline: "Battle-royale legends — Predator-grade boosting",
    description:
      "Trios, ranked, badge farming, kill records. Pros stack KDR while you watch.",
    accent: "#fc4626",
    ranks: [
      { id: "rookie", label: "Rookie", tier: 1 },
      { id: "bronze", label: "Bronze", tier: 2 },
      { id: "silver", label: "Silver", tier: 3 },
      { id: "gold", label: "Gold", tier: 4 },
      { id: "platinum", label: "Platinum", tier: 5 },
      { id: "diamond", label: "Diamond", tier: 6 },
      { id: "master", label: "Master", tier: 7 },
      { id: "predator", label: "Apex Predator", tier: 8 },
    ],
    regions: COMMON_REGIONS,
    platforms: [
      { id: "pc", label: "PC" },
      { id: "ps5", label: "PlayStation 5" },
      { id: "xbox", label: "Xbox Series X|S" },
    ],
    addons: COMMON_ADDONS,
    services: {
      boosting: { pricePerTierJump: 1700, topTierMultiplier: 1.5 },
      coaching: { pricePerHour: 2800 },
      carry: { pricePerRun: 1400 },
    },
  },
  {
    slug: "league-of-legends",
    name: "League of Legends",
    publisher: "Riot Games",
    hero: "/games/lol.svg",
    tagline: "Solo/duo, flex, and placements — every region",
    description:
      "Iron to Challenger. Region-specific Pros, smurf-safe accounts, optional VPN tunnels for stealth.",
    accent: "#c89b3c",
    ranks: [
      { id: "iron", label: "Iron", tier: 1 },
      { id: "bronze", label: "Bronze", tier: 2 },
      { id: "silver", label: "Silver", tier: 3 },
      { id: "gold", label: "Gold", tier: 4 },
      { id: "platinum", label: "Platinum", tier: 5 },
      { id: "emerald", label: "Emerald", tier: 6 },
      { id: "diamond", label: "Diamond", tier: 7 },
      { id: "master", label: "Master", tier: 8 },
      { id: "grandmaster", label: "Grandmaster", tier: 9 },
      { id: "challenger", label: "Challenger", tier: 10 },
    ],
    regions: [
      { id: "na", label: "NA" },
      { id: "euw", label: "EUW" },
      { id: "eune", label: "EUNE" },
      { id: "kr", label: "KR" },
      { id: "br", label: "BR" },
      { id: "lan", label: "LAN" },
      { id: "oce", label: "OCE" },
    ],
    platforms: [{ id: "pc", label: "PC" }],
    addons: COMMON_ADDONS,
    services: {
      boosting: { pricePerTierJump: 1300, topTierMultiplier: 1.7 },
      coaching: { pricePerHour: 3500 },
      carry: { pricePerRun: 1100 },
    },
  },
  {
    slug: "destiny-2",
    name: "Destiny 2",
    publisher: "Bungie",
    hero: "/games/destiny2.svg",
    tagline: "Raids, dungeons, and Crucible Glory",
    description:
      "Day-one raid clears, dungeon flawless, Trials Adept, Iron Banner — Sherpa or carry.",
    accent: "#dcd5c5",
    ranks: [
      { id: "guardian-1", label: "Guardian I", tier: 1 },
      { id: "guardian-2", label: "Guardian II", tier: 2 },
      { id: "brave-1", label: "Brave", tier: 3 },
      { id: "heroic", label: "Heroic", tier: 4 },
      { id: "fabled", label: "Fabled", tier: 5 },
      { id: "mythic", label: "Mythic", tier: 6 },
      { id: "legend", label: "Legend", tier: 7 },
    ],
    regions: COMMON_REGIONS,
    platforms: [
      { id: "pc", label: "PC" },
      { id: "ps5", label: "PlayStation 5" },
      { id: "xbox", label: "Xbox Series X|S" },
    ],
    addons: COMMON_ADDONS,
    services: {
      boosting: { pricePerTierJump: 1800, topTierMultiplier: 1.4 },
      coaching: { pricePerHour: 2700 },
      carry: { pricePerRun: 1700 },
    },
  },
  {
    slug: "wow",
    name: "World of Warcraft",
    publisher: "Blizzard",
    hero: "/games/wow.svg",
    tagline: "Mythic+, Raids, PvP — Retail & Classic",
    description:
      "Cutting-edge raid bosses, +20s timed, Gladiator titles, leveling, and gold farming.",
    accent: "#f8b700",
    ranks: [
      { id: "leveling", label: "Leveling", tier: 1 },
      { id: "heroic", label: "Heroic", tier: 2 },
      { id: "mythic", label: "Mythic", tier: 3 },
      { id: "ahead-of-curve", label: "Ahead of the Curve", tier: 4 },
      { id: "cutting-edge", label: "Cutting Edge", tier: 5 },
      { id: "gladiator", label: "Gladiator", tier: 6 },
    ],
    regions: [
      { id: "us", label: "US" },
      { id: "eu", label: "EU" },
      { id: "asia", label: "Asia" },
    ],
    platforms: [{ id: "pc", label: "PC" }],
    addons: COMMON_ADDONS,
    services: {
      boosting: { pricePerTierJump: 2200, topTierMultiplier: 1.5 },
      coaching: { pricePerHour: 3200 },
      carry: { pricePerRun: 2500 },
    },
  },
];

export function getGameBySlug(slug: string): GameDef | null {
  return GAMES.find((g) => g.slug === slug) ?? null;
}

export function listPublishedGames(): GameDef[] {
  return GAMES;
}

// ----- Form payload schema (game-aware) -----
export const orderOptionsSchema = z.object({
  service: z.enum(["boosting", "coaching", "carry"]),
  region: z.string().min(1).max(40),
  platform: z.string().min(1).max(40),
  currentRank: z.string().optional(),
  targetRank: z.string().optional(),
  hours: z.coerce.number().int().min(1).max(20).optional(),
  runs: z.coerce.number().int().min(1).max(20).optional(),
  addons: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional().default(""),
});

export type OrderOptions = z.infer<typeof orderOptionsSchema>;

// ----- Pricing engine -----
export function computeBasePriceFor(game: GameDef, opts: OrderOptions): number {
  let price = 0;
  switch (opts.service) {
    case "boosting": {
      const cfg = game.services.boosting;
      if (!cfg) return 0;
      const cur = game.ranks.find((r) => r.id === opts.currentRank);
      const tgt = game.ranks.find((r) => r.id === opts.targetRank);
      if (!cur || !tgt) return 0;
      const tiers = Math.max(0, tgt.tier - cur.tier);
      price = tiers * cfg.pricePerTierJump;
      const topTier = game.ranks[game.ranks.length - 1]?.tier ?? Infinity;
      if (tgt.tier >= topTier - 1) {
        price = Math.round(price * cfg.topTierMultiplier);
      }
      break;
    }
    case "coaching": {
      const cfg = game.services.coaching;
      if (!cfg) return 0;
      price = (opts.hours ?? 1) * cfg.pricePerHour;
      break;
    }
    case "carry": {
      const cfg = game.services.carry;
      if (!cfg) return 0;
      price = (opts.runs ?? 1) * cfg.pricePerRun;
      break;
    }
  }

  for (const id of opts.addons) {
    const addon = game.addons.find((a) => a.id === id);
    if (addon) price += addon.priceCents;
  }

  if (opts.region === "oce" || opts.region === "sa") {
    price = Math.round(price * 1.1);
  }

  return price;
}

export function defaultOrderTitle(game: GameDef, opts: OrderOptions): string {
  switch (opts.service) {
    case "boosting": {
      const cur = game.ranks.find((r) => r.id === opts.currentRank)?.label ?? "?";
      const tgt = game.ranks.find((r) => r.id === opts.targetRank)?.label ?? "?";
      return `${game.name} · ${cur} → ${tgt}`;
    }
    case "coaching":
      return `${game.name} · Coaching · ${opts.hours ?? 1}h`;
    case "carry":
      return `${game.name} · Carry · ${opts.runs ?? 1} run${(opts.runs ?? 1) > 1 ? "s" : ""}`;
  }
}
