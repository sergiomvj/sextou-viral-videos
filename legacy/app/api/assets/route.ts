import { NextRequest, NextResponse } from "next/server";
import { listAssets, upsertAsset } from "@/lib/production";
import { requireUserId } from "@/lib/request-auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const assets = await listAssets(userId);
    return NextResponse.json({ assets });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const asset = await upsertAsset(userId, {
      name: payload.name ?? "logo-demo.png",
      url: payload.url ?? "mock://assets/logo-demo.png",
      sizeBytes: payload.sizeBytes ?? 1024,
    });
    return NextResponse.json({ asset }, { status: 201 });
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
