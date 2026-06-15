import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createDraftProduction } from "@/lib/production";

export default async function NewStudioProductionPage() {
  const session = await auth();
  const productionId = await createDraftProduction(session!.user.id);
  redirect(`/studio/${productionId}`);
}
