import { NextRequest, NextResponse } from "next/server";
import { getProduction, updateProduction } from "@/lib/production";
import { generateMockVideoJobs } from "@/lib/studio-utils";
import type { BriefData, ScriptData, VideoData } from "@/lib/studio-types";
import { requireUserId } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const production = await getProduction(userId, payload.productionId);
    if (!production) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const brief = payload.brief as BriefData;
    const script = payload.script as ScriptData;
    const video = payload.video as VideoData;
    if (script.estimatedSeconds > 15) {
      return NextResponse.json({ error: "heygen_duration_limit" }, { status: 400 });
    }

    const generated = generateMockVideoJobs(script, brief, video.config, "HEYGEN");

    await updateProduction(userId, production.id, {
      phase: 4,
      status: "DONE",
      mode: "HEYGEN",
      scenesJson: generated as unknown as Record<string, unknown>,
      errorMessage: null,
    });

    return NextResponse.json({ video: generated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
