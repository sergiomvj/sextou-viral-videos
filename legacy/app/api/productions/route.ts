import { NextResponse } from "next/server";
import { createDraftProduction, listProductions } from "@/lib/production";
import { requireUserId } from "@/lib/request-auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const productions = await listProductions(userId);
    return NextResponse.json({ productions });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST() {
  try {
    const userId = await requireUserId();
    const id = await createDraftProduction(userId);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
