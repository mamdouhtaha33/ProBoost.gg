import { ProRank } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RankThreshold = {
  rank: ProRank;
  minJobs: number;
  minRating: number;
  label: string;
  color: string;
};

export const RANK_THRESHOLDS: RankThreshold[] = [
  { rank: "DIAMOND", minJobs: 200, minRating: 4.9, label: "Diamond", color: "#22d3ee" },
  { rank: "PLATINUM", minJobs: 100, minRating: 4.8, label: "Platinum", color: "#a78bfa" },
  { rank: "GOLD", minJobs: 40, minRating: 4.7, label: "Gold", color: "#facc15" },
  { rank: "SILVER", minJobs: 15, minRating: 4.5, label: "Silver", color: "#94a3b8" },
  { rank: "BRONZE", minJobs: 3, minRating: 4.0, label: "Bronze", color: "#cd7f32" },
];

export function computeRank(jobs: number, rating: number | null): ProRank {
  if (rating == null) return "UNRANKED";
  for (const t of RANK_THRESHOLDS) {
    if (jobs >= t.minJobs && rating >= t.minRating) return t.rank;
  }
  return "UNRANKED";
}

export function rankMeta(rank: ProRank): { label: string; color: string } {
  const t = RANK_THRESHOLDS.find((x) => x.rank === rank);
  return t ? { label: t.label, color: t.color } : { label: "Unranked", color: "#475569" };
}

export async function recomputeProStats(proId: string): Promise<void> {
  const completed = await prisma.order.count({
    where: { proId, status: "COMPLETED" },
  });
  const reviews = await prisma.review.findMany({
    where: { recipientId: proId },
    select: { rating: true },
  });
  const avg =
    reviews.length === 0
      ? null
      : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const rank = computeRank(completed, avg);
  await prisma.user.update({
    where: { id: proId },
    data: {
      proCompletedJobs: completed,
      proAverageRating: avg,
      proRank: rank,
    },
  });
}
