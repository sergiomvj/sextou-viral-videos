import { NextRequest, NextResponse } from "next/server";
import { getProduction, mergeBrief, updateProduction } from "@/lib/production";
import { defaultBrief, makeTitle, parseScript, estimateSpeechSeconds, slugify } from "@/lib/studio-utils";
import type { BriefData, ScriptData } from "@/lib/studio-types";
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
      : [`#${slugify(brief.product || "produto")}`, "#viral", "#studio"];

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_TEXT || "anthropic/claude-3-haiku";

    let rawScript = "";

    if (!apiKey) {
      // Fallback to mock se nao houver chave configurada
      const { generateMockScript } = await import("@/lib/studio-utils");
      rawScript = generateMockScript(brief).raw;
    } else {
      const prompt = `Atue como um roteirista especializado em vídeos virais curtos para TikTok/Reels.
Produto/Oferta: ${brief.product}
Objetivo: ${brief.goal}
Ideia central: ${brief.idea || 'Criar curiosidade e mostrar o benefício principal.'}
Tom de voz: ${brief.tone || 'Casual e enérgico'}
Público alvo: ${brief.audience || 'Geral'}

Crie um roteiro de no máximo ${brief.targetDuration} segundos.
Use frases curtas e diretas.
Siga EXATAMENTE este formato para cada linha:
Se for fala do personagem, use o formato "NOME: Fala". Ex: "NARRADOR: Você não vai acreditar."
Se for instrução visual ou ação, coloque entre parênteses. Ex: "(Mostra o produto de perto)"

Exemplo de saída:
(Cena rápida de alguém segurando o celular)
NARRADOR: Pare de perder tempo com métodos antigos.
(Transição rápida para a tela do produto)
CLIENTE: Isso mudou minha vida!
(Produto sendo usado, resultado visível, música energética, fade out com logo)

Responda SOMENTE com o roteiro no formato acima, sem explicações, sem título, sem numeração.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Sextou Viral Studio",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      rawScript = data.choices?.[0]?.message?.content || "";
    }

    const lines = parseScript(rawScript);
    const script: ScriptData = {
      raw: rawScript,
      lines,
      versions: [rawScript],
      approved: false,
      estimatedSeconds: estimateSpeechSeconds(lines),
      caption: `${brief.product || "Produto"}: ${brief.goal || "Veja"}. ${brief.hashtags.join(" ")}`,
    };

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
    console.error("Script generation error:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "internal_error" }, { status: 500 });
  }
}
