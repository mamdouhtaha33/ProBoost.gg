import { PrismaClient } from "@prisma/client";
import { computeBasePrice, defaultTitle } from "../src/lib/arc-pricing";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ProBoost.gg marketplace...");

  // Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@proboost.gg" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@proboost.gg",
      name: "Admin",
      role: "ADMIN",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "user@proboost.gg" },
    update: {},
    create: {
      email: "user@proboost.gg",
      name: "Demo Player",
      role: "USER",
    },
  });

  const pros = await Promise.all(
    [
      { email: "raidking@proboost.gg", name: "RaidKing_77" },
      { email: "ghost@proboost.gg", name: "GhostScout" },
      { email: "voidwalker@proboost.gg", name: "Voidwalker" },
    ].map((p) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: { role: "PRO" },
        create: { ...p, role: "PRO" },
      }),
    ),
  );

  console.log(`  • Admin:     ${admin.email}`);
  console.log(`  • Customer:  ${customer.email}`);
  pros.forEach((p) => console.log(`  • Pro:       ${p.email}`));

  // Sample order with bids
  const opts = {
    service: "boosting" as const,
    region: "na-east" as const,
    platform: "pc" as const,
    currentRank: "veteran",
    targetRank: "apex",
    addons: ["express"],
    notes: "Account share. Need it before the weekend.",
  };
  const basePrice = computeBasePrice(opts);

  const existing = await prisma.order.findFirst({
    where: { customerId: customer.id, title: defaultTitle(opts) },
  });

  let order = existing;
  if (!order) {
    order = await prisma.order.create({
      data: {
        customerId: customer.id,
        service: opts.service,
        title: defaultTitle(opts),
        description: opts.notes,
        options: opts,
        basePrice,
        status: "OPEN",
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
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
