import { NextRequest, NextResponse } from "next/server";
import { getProduction, mergeBrief, updateProduction } from "@/lib/production";
import { defaultBrief, generateMockScript, makeTitle } from "@/lib/studio-utils";
import type { BriefData } from "@/lib/studio-types";
import { requireUserId } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const payload = await request.json();
    const production = await getProduction(userId, payload.productionId);
    if (!production) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const brief = mergeBrief(production.brief ?? defaultBrief(), payload.brief as Partial<BriefData>);
    brief.hashtags = brief.hashtags.length
      ? brief.hashtags
      : [`#${brief.product.replace(/\s+/g, "").toLowerCase()}`, "#viral", "#studio"];
    const script = generateMockScript(brief);

    await updateProduction(userId, production.id, {
      title: makeTitle(brief),
      phase: 2,
      status: "PROCESSING",
      briefJson: brief as unknown as Record<string, unknown>,
      scriptJson: script as unknown as Record<string, unknown>,
      errorMessage: null,
    });

    return NextResponse.json({ brief, script });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
