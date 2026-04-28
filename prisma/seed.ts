import { PrismaClient } from "@prisma/client";
import { computeBasePriceFor, defaultOrderTitle, getGameBySlug } from "../src/lib/games";
import { DEFAULT_TIERS } from "../src/lib/cashback";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ProBoost.gg marketplace...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@proboost.gg" },
    update: { role: "ADMIN" },
    create: { email: "admin@proboost.gg", name: "Admin", role: "ADMIN", handle: "admin" },
  });

  const customer = await prisma.user.upsert({
    where: { email: "user@proboost.gg" },
    update: {},
    create: {
      email: "user@proboost.gg",
      name: "Demo Player",
      role: "USER",
      handle: "demo-player",
    },
  });

  const pros = await Promise.all(
    [
      {
        email: "raidking@proboost.gg",
        name: "RaidKing_77",
        handle: "raidking-77",
        proHeadline: "Top 0.1% NA-East · 10k+ raids cleared",
        proRank: "DIAMOND" as const,
        proCompletedJobs: 250,
        proAverageRating: 4.95,
        proLanguages: ["English", "Arabic"],
        proCountry: "US",
        proVerified: true,
      },
      {
        email: "ghost@proboost.gg",
        name: "GhostScout",
        handle: "ghostscout",
        proHeadline: "Stealth specialist · solo queue carry",
        proRank: "PLATINUM" as const,
        proCompletedJobs: 120,
        proAverageRating: 4.85,
        proLanguages: ["English"],
        proCountry: "GB",
        proVerified: true,
      },
      {
        email: "voidwalker@proboost.gg",
        name: "Voidwalker",
        handle: "voidwalker",
        proHeadline: "Apex coach · streamed & VOD-reviewed",
        proRank: "GOLD" as const,
        proCompletedJobs: 60,
        proAverageRating: 4.7,
        proLanguages: ["English", "Spanish"],
        proCountry: "ES",
        proVerified: true,
      },
    ].map((p) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: {
          role: "PRO",
          proApplicationStatus: "APPROVED",
          proHeadline: p.proHeadline,
          handle: p.handle,
          proRank: p.proRank,
          proCompletedJobs: p.proCompletedJobs,
          proAverageRating: p.proAverageRating,
          proLanguages: p.proLanguages,
          proCountry: p.proCountry,
          proVerified: p.proVerified,
        },
        create: {
          ...p,
          role: "PRO",
          proApplicationStatus: "APPROVED",
        },
      }),
    ),
  );

  console.log(`  • Admin:     ${admin.email}`);
  console.log(`  • Customer:  ${customer.email}`);
  pros.forEach((p) => console.log(`  • Pro:       ${p.email}`));

  const game = getGameBySlug("arc-raiders")!;
  const opts = {
    service: "boosting" as const,
    region: "na-east",
    platform: "pc",
    currentRank: "veteran",
    targetRank: "apex",
    addons: ["express"],
    notes: "Account share. Need it before the weekend.",
  };
  const basePrice = computeBasePriceFor(game, opts);

  const existing = await prisma.order.findFirst({
    where: { customerId: customer.id, title: defaultOrderTitle(game, opts) },
  });

  let order = existing;
  if (!order) {
    order = await prisma.order.create({
      data: {
        customerId: customer.id,
        service: opts.service,
        title: defaultOrderTitle(game, opts),
        description: opts.notes,
        options: { ...opts, gameSlug: game.slug },
        basePrice,
        status: "OPEN",
        paymentStatus: "PAID",
        game: game.name,
        gameSlug: game.slug,
      },
    });
    await prisma.conversation.create({ data: { orderId: order.id } });
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "MANUAL",
        status: "PAID",
        amount: basePrice,
        currency: "USD",
        paidAt: new Date(),
      },
    });
    await prisma.orderActivity.create({
      data: {
        orderId: order.id,
        type: "CREATED",
        message: `Order placed: ${order.title}`,
        actorUserId: customer.id,
      },
    });
    await prisma.orderActivity.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_CONFIRMED",
        message: "Payment confirmed (seed).",
      },
    });
  }
  console.log(`  • Order:     ${order.title} (${order.status})`);

  for (let i = 0; i < pros.length; i++) {
    const p = pros[i];
    await prisma.bid.upsert({
      where: { orderId_proId: { orderId: order.id, proId: p.id } },
      update: {},
      create: {
        orderId: order.id,
        proId: p.id,
        amount: basePrice + (i - 1) * 1500,
        message: ["I can start tonight.", "Top 0.1% NA-East.", "Streamed if you want."][i],
        status: "PENDING",
      },
    });
  }
  console.log(`  • Seeded ${pros.length} bids on the demo order.`);

  // Sample auto-assignment rule
  await prisma.autoAssignmentRule.upsert({
    where: { id: "seed-aa-arcraiders" },
    update: {},
    create: {
      id: "seed-aa-arcraiders",
      name: "ARC Raiders — Diamond Pros only",
      gameSlug: "arc-raiders",
      service: null,
      minProRank: "DIAMOND",
      maxBidPercent: 110,
      minBidPercent: 70,
      requireProVerified: true,
      enabled: false,
      priority: 100,
    },
  });

  // Sample blog posts
  await prisma.blogPost.upsert({
    where: { slug: "how-to-climb-fast-arc-raiders" },
    update: {},
    create: {
      slug: "how-to-climb-fast-arc-raiders",
      authorId: admin.id,
      title: "How to climb fast in ARC Raiders",
      excerpt:
        "Top 5 raid loadouts and routes our Pros use to push from Veteran to Apex Raider in under a week.",
      body:
        "## Loadouts\n\n1. Mid-range pulse rifle + revive grenades\n2. SMG + flashbang\n3. Marksman rifle + smoke...\n\n## Routes\n\nBegin with low-density POIs and rotate every two extractions.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      tags: ["arc-raiders", "guides"],
    },
  });

  await prisma.blogPost.upsert({
    where: { slug: "valorant-aim-routine" },
    update: {},
    create: {
      slug: "valorant-aim-routine",
      authorId: admin.id,
      title: "The 30-minute Valorant aim routine our Pros swear by",
      excerpt:
        "A repeatable warm-up that works in Aim Lab, the Range, and warmup deathmatch.",
      body:
        "Aim Lab: gridshot ultimate × 3, sphere track × 3.\nRange: bot-100, all heads, no-respawn.\nDM: focus on isolation, no spray.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      tags: ["valorant", "training"],
    },
  });

  // Phase-4: Cashback tiers
  for (const [category, tiers] of Object.entries(DEFAULT_TIERS) as Array<
    ["BOOSTING" | "CURRENCY_ACCOUNT", { name: string; thresholdCents: number; percentBasis100: number }[]]
  >) {
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const id = `seed-cb-${category}-${i}`;
      await prisma.cashbackTier.upsert({
        where: { id },
        update: { thresholdCents: t.thresholdCents, percentBasis100: t.percentBasis100, displayOrder: i * 100 },
        create: {
          id,
          category,
          name: t.name,
          thresholdCents: t.thresholdCents,
          percentBasis100: t.percentBasis100,
          displayOrder: i * 100,
        },
      });
    }
  }

  // Phase-4: OfferCategories
  const categoriesByGame: Record<string, Array<{ slug: string; name: string }>> = {
    "arc-raiders": [
      { slug: "boosting", name: "Boosting" },
      { slug: "raids", name: "Raids" },
      { slug: "blueprints", name: "Blueprints" },
      { slug: "coins", name: "Coins" },
      { slug: "weapons", name: "Weapons" },
    ],
    valorant: [
      { slug: "rank-boost", name: "Rank Boost" },
      { slug: "placements", name: "Placements" },
      { slug: "coaching", name: "Coaching" },
      { slug: "accounts", name: "Accounts" },
    ],
    "apex-legends": [
      { slug: "rank-boost", name: "Rank Boost" },
      { slug: "kills", name: "Kills & Badges" },
      { slug: "coaching", name: "Coaching" },
    ],
    "league-of-legends": [
      { slug: "rank-boost", name: "Rank Boost" },
      { slug: "placements", name: "Placements" },
      { slug: "coaching", name: "Coaching" },
      { slug: "accounts", name: "Accounts" },
    ],
    wow: [
      { slug: "raids", name: "Raids" },
      { slug: "dungeons", name: "Mythic+" },
      { slug: "gold", name: "Gold" },
      { slug: "powerleveling", name: "Powerleveling" },
      { slug: "pvp", name: "PvP" },
    ],
  };

  for (const [gameSlug, cats] of Object.entries(categoriesByGame)) {
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      await prisma.offerCategory.upsert({
        where: { gameSlug_slug: { gameSlug, slug: c.slug } },
        update: { name: c.name, displayOrder: i * 100 },
        create: { gameSlug, slug: c.slug, name: c.name, displayOrder: i * 100 },
      });
    }
  }

  // Phase-4: Offers
  type SeedOffer = {
    slug: string;
    gameSlug: string;
    categorySlug: string;
    productType?: "BOOSTING" | "CURRENCY" | "ACCOUNT";
    title: string;
    summary: string;
    features: string[];
    basePriceCents: number;
    salePriceCents?: number;
    badge?: "HOT" | "POPULAR" | "NEW" | "SALE" | "NONE";
    hot?: boolean;
    popular?: boolean;
    deliveryMode?: "PILOTED" | "SELF_PLAY" | "BOTH";
    deliveryHours?: number;
  };

  const seedOffers: SeedOffer[] = [
    {
      slug: "arc-raiders-veteran-to-apex",
      gameSlug: "arc-raiders",
      categorySlug: "boosting",
      title: "Veteran → Apex Raider Boost",
      summary: "Push to Apex Raider in under 7 days. Top NA pros, streamed.",
      features: ["Top 0.1% NA Pros", "Streamed on request", "Lifetime warranty"],
      basePriceCents: 12999,
      salePriceCents: 8999,
      hot: true,
      popular: true,
      badge: "HOT",
      deliveryMode: "BOTH",
      deliveryHours: 168,
    },
    {
      slug: "arc-raiders-blueprints-bundle",
      gameSlug: "arc-raiders",
      categorySlug: "blueprints",
      productType: "CURRENCY",
      title: "Any Blueprint",
      summary: "Skip the grind. Any blueprint, any tier.",
      features: ["No more RNG", "Same-day delivery", "100% safe"],
      basePriceCents: 299,
      badge: "POPULAR",
      popular: true,
      deliveryHours: 6,
    },
    {
      slug: "arc-raiders-coins-pack",
      gameSlug: "arc-raiders",
      categorySlug: "coins",
      productType: "CURRENCY",
      title: "ARC Raiders Coins (Any Amount)",
      summary: "Skip the grind. Fast & secure.",
      features: ["Any amount", "Cheapest coins", "Instant"],
      basePriceCents: 256,
      salePriceCents: 179,
      badge: "SALE",
      deliveryHours: 1,
    },
    {
      slug: "valorant-iron-to-diamond",
      gameSlug: "valorant",
      categorySlug: "rank-boost",
      title: "Iron → Diamond Rank Boost",
      summary: "Verified Immortal+ boosters. Any region.",
      features: ["24/7 availability", "Win-rate 92%", "Lifetime warranty"],
      basePriceCents: 14999,
      salePriceCents: 11999,
      hot: true,
      badge: "HOT",
      deliveryMode: "BOTH",
      deliveryHours: 240,
    },
    {
      slug: "valorant-account-immortal",
      gameSlug: "valorant",
      categorySlug: "accounts",
      productType: "ACCOUNT",
      title: "Valorant Immortal Account",
      summary: "Top weapons skins, any region.",
      features: ["Best skins", "100% safe transfer", "Reputable seller"],
      basePriceCents: 9999,
      badge: "POPULAR",
      popular: true,
    },
    {
      slug: "apex-rookie-to-diamond",
      gameSlug: "apex-legends",
      categorySlug: "rank-boost",
      title: "Rookie → Diamond Rank Boost",
      summary: "Predator-grade boosters, kill records included.",
      features: ["High KDR boosters", "All platforms", "Lifetime warranty"],
      basePriceCents: 12999,
      hot: true,
      badge: "HOT",
    },
    {
      slug: "lol-iron-to-platinum",
      gameSlug: "league-of-legends",
      categorySlug: "rank-boost",
      title: "Iron → Platinum (Solo/Duo)",
      summary: "Pick your champ pool. Any region.",
      features: ["Champ pool respected", "All regions", "Streamed option"],
      basePriceCents: 9999,
      salePriceCents: 7999,
      badge: "SALE",
      popular: true,
    },
    {
      slug: "wow-mythic-plus-2-20",
      gameSlug: "wow",
      categorySlug: "dungeons",
      title: "Mythic +2-20 Dungeons Boost",
      summary: "259-266 ilvl Gear, 269-272 Weekly Vault.",
      features: ["FREE Timer & Traders", "Expert party", "Quick start"],
      basePriceCents: 939,
      salePriceCents: 849,
      hot: true,
      badge: "HOT",
    },
    {
      slug: "wow-gold-any-amount",
      gameSlug: "wow",
      categorySlug: "gold",
      productType: "CURRENCY",
      title: "WoW Gold (Any Amount)",
      summary: "Cheapest gold, fast delivery.",
      features: ["Any amount", "Fast delivery", "Cheapest gold"],
      basePriceCents: 643,
      popular: true,
      badge: "POPULAR",
    },
  ];

  for (const o of seedOffers) {
    const cat = await prisma.offerCategory.findUnique({
      where: { gameSlug_slug: { gameSlug: o.gameSlug, slug: o.categorySlug } },
    });
    await prisma.offer.upsert({
      where: { slug: o.slug },
      update: {
        title: o.title,
        summary: o.summary,
        features: o.features,
        basePriceCents: o.basePriceCents,
        salePriceCents: o.salePriceCents ?? null,
        productType: o.productType ?? "BOOSTING",
        deliveryMode: o.deliveryMode ?? "BOTH",
        deliveryHours: o.deliveryHours,
        hot: !!o.hot,
        popular: !!o.popular,
        badge: o.badge ?? "NONE",
        status: "PUBLISHED",
        categoryId: cat?.id ?? null,
        gameSlug: o.gameSlug,
      },
      create: {
        slug: o.slug,
        title: o.title,
        summary: o.summary,
        features: o.features,
        basePriceCents: o.basePriceCents,
        salePriceCents: o.salePriceCents ?? null,
        productType: o.productType ?? "BOOSTING",
        deliveryMode: o.deliveryMode ?? "BOTH",
        deliveryHours: o.deliveryHours,
        hot: !!o.hot,
        popular: !!o.popular,
        badge: o.badge ?? "NONE",
        status: "PUBLISHED",
        categoryId: cat?.id ?? null,
        gameSlug: o.gameSlug,
      },
    });
  }

  // Phase-4: Sample coupons
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      valuePercent: 10,
      scope: "GLOBAL",
      maxUses: null,
      perUserLimit: 1,
      status: "ACTIVE",
      description: "10% off your first order",
    },
  });
  await prisma.coupon.upsert({
    where: { code: "SAVE5" },
    update: {},
    create: {
      code: "SAVE5",
      type: "FIXED",
      valueCents: 500,
      scope: "GLOBAL",
      perUserLimit: 1,
      status: "ACTIVE",
      description: "$5 off any order",
    },
  });

  // Phase-4: Sample currency listing seller (use one of the pros)
  const seller = pros[0];
  await prisma.currencyListing.upsert({
    where: { id: "seed-currency-arc-coins" },
    update: {},
    create: {
      id: "seed-currency-arc-coins",
      sellerId: seller.id,
      gameSlug: "arc-raiders",
      currencyName: "ARC Coins",
      unit: "1,000 coins",
      pricePerUnitCents: 179,
      minQty: 1,
      maxQty: 500,
      deliveryHours: 1,
      status: "AVAILABLE",
      description: "Trusted seller, 1k coins per unit, in-raid handoff.",
    },
  });
  await prisma.accountListing.upsert({
    where: { id: "seed-account-valorant-imm" },
    update: {},
    create: {
      id: "seed-account-valorant-imm",
      sellerId: seller.id,
      gameSlug: "valorant",
      title: "Valorant Immortal NA Account · 70+ skins",
      description: "Knife collection, all agents unlocked, EU servers.",
      priceCents: 9999,
      attributes: { rank: "Immortal", region: "NA", agentsUnlocked: 22, skins: 73 },
      screenshots: [],
      status: "AVAILABLE",
    },
  });

  // Phase-4: site counters seed
  for (const [key, value] of Object.entries({
    prosOnline: 47,
    completedOrders: 1842,
    happyCustomers: 743,
  })) {
    await prisma.siteCounter.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
