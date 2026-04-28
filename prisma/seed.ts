import { PrismaClient } from "@prisma/client";
import { computeBasePriceFor, defaultOrderTitle, getGameBySlug } from "../src/lib/games";

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

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
