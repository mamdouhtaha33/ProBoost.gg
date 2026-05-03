import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offer-card";

export const metadata = { title: "Wishlist · ProBoost.gg" };

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id! },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Save offers to come back to. Removing an item is one click.
      </p>

      {items.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-[color:var(--muted)]">
          Your wishlist is empty. <Link href="/offers" className="text-[color:var(--primary)]">Browse offers</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <OfferCard key={it.id} offer={it.offer} />
          ))}
        </div>
      )}
    </div>
  );
}
