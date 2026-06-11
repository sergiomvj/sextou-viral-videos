import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProduction } from "@/lib/production";
import { StudioWizard } from "@/components/studio-wizard";

export default async function StudioProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const production = await getProduction(session!.user.id, id);

  if (!production) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { plan: true },
  });

  return <StudioWizard production={production} userPlan={user?.plan ?? "FREE"} />;
}
