"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";

const applicationSchema = z.object({
  headline: z.string().trim().min(5, "Add a short headline.").max(120),
  bio: z.string().trim().min(20, "Tell us a bit more about your experience.").max(4000),
  experience: z.string().trim().max(4000).optional().default(""),
  availability: z.string().trim().max(200).optional().default(""),
  payoutEmail: z.string().trim().email("Enter a valid payout email.").optional().or(z.literal("")),
});

export async function submitProApplication(formData: FormData) {
  const user = await requireUser();

  const parsed = applicationSchema.safeParse({
    headline: formData.get("headline") ?? "",
    bio: formData.get("bio") ?? "",
    experience: formData.get("experience") ?? "",
    availability: formData.get("availability") ?? "",
    payoutEmail: formData.get("payoutEmail") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid application");
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.proApplication.upsert({
      where: { userId: user.id },
      update: {
        status: "PENDING",
        headline: data.headline,
        bio: data.bio,
        experience: data.experience || null,
        availability: data.availability || null,
      },
      create: {
        userId: user.id,
        status: "PENDING",
        headline: data.headline,
        bio: data.bio,
        experience: data.experience || null,
        availability: data.availability || null,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: {
        proApplicationStatus: "PENDING",
        proHeadline: data.headline,
        proBio: data.bio,
        ...(data.payoutEmail ? { payoutEmail: data.payoutEmail } : {}),
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pro/apply");
  revalidatePath("/dashboard/admin/applications");
  redirect("/dashboard?applied=1");
}
