import { NextRequest, NextResponse } from "next/server";
import { getProduction, updateProduction } from "@/lib/production";
import { generateMockAudio } from "@/lib/studio-utils";
import type { ScriptData, VoicesData } from "@/lib/studio-types";
import { requireUserId } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const production = await getProduction(userId, payload.productionId);
    if (!production) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const script = payload.script as ScriptData;
    const voices = payload.voices as VoicesData;
    const audio = generateMockAudio(script, voices);
    const approvedVoices = { ...voices, approved: true };

    await updateProduction(userId, production.id, {
      phase: 3,
      status: "PROCESSING",
      voicesJson: approvedVoices as unknown as Record<string, unknown>,
      audioJson: audio as unknown as Record<string, unknown>,
      errorMessage: null,
    });

    return NextResponse.json({ audio, voices: approvedVoices });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
