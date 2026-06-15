import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/request-auth";

export async function POST() {
  try {
    await requireUserId();
    return NextResponse.json({
      uploadUrl: "mock://upload/logo",
      publicUrl: "mock://assets/logo-demo.png",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
