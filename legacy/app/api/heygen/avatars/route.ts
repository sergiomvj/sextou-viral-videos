import { NextResponse } from "next/server";
import { heygenAvatars } from "@/lib/studio-utils";
import { requireUserId } from "@/lib/request-auth";

export async function GET() {
  try {
    await requireUserId();
    return NextResponse.json({ avatars: heygenAvatars });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
