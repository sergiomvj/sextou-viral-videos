import { NextRequest, NextResponse } from "next/server";
import { getProduction, updateProduction } from "@/lib/production";
import { requireUserId } from "@/lib/request-auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const production = await getProduction(userId, id);
    if (!production) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ production });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const payload = await request.json();
    const production = await updateProduction(userId, id, payload);
    return NextResponse.json({ production });
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
