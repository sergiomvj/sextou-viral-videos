import { NextResponse } from "next/server";
import { listProductions } from "@/lib/production";
import { requireUserId } from "@/lib/request-auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const productions = await listProductions(userId);
    const jobs = productions.filter((production) => ["PROCESSING", "FAILED", "DONE"].includes(production.status));
    return NextResponse.json({ jobs });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
