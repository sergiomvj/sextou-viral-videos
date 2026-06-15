import { NextRequest, NextResponse } from "next/server";
import { getProduction, updateProduction } from "@/lib/production";
import { suggestVoiceAssignments } from "@/lib/studio-utils";
import type { ScriptData, VoicesData, AudioData, AudioJob } from "@/lib/studio-types";
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
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    let audio: AudioData;

    const assignments = voices.assignments.length ? voices.assignments : suggestVoiceAssignments(script, voices);

    if (!apiKey) {
      const { generateMockAudio } = await import("@/lib/studio-utils");
      audio = generateMockAudio(script, voices);
    } else {
      const characterText: Record<string, string> = {};
      script.lines.forEach(line => {
        if (line.type === "speech" || line.type === "narrator") {
          const char = line.speaker || "NARRADOR";
          characterText[char] = (characterText[char] || "") + line.text + " ";
        }
      });

      const jobs: AudioJob[] = [];
      let index = 1;

      for (const char of Object.keys(characterText)) {
        const text = characterText[char].trim();
        const assignment = assignments.find(a => a.character === char);
        // Fallback to alloy if not found (OpenAI voice)
        const voiceId = assignment?.voiceId ? assignment.voiceId.toLowerCase() : "alloy";
        
        const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': "http://localhost:3000",
            'X-Title': "Sextou Viral Studio",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-tts-preview",
            input: text,
            voice: voiceId
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter TTS error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64}`;

        jobs.push({
          id: `audio-${index++}`,
          character: char,
          voiceId: assignment?.voiceId || "alloy",
          state: "completed",
          audioUrl,
          durationSeconds: Math.max(2, Math.round(text.split(/\s+/).length / 3))
        });
      }

      audio = {
        jobs,
        generatedAt: new Date().toISOString()
      };
    }

    const approvedVoices = { ...voices, assignments, approved: true };

    await updateProduction(userId, production.id, {
      phase: 3,
      status: "PROCESSING",
      voicesJson: approvedVoices as unknown as Record<string, unknown>,
      audioJson: audio as unknown as Record<string, unknown>,
      errorMessage: null,
    });

    return NextResponse.json({ audio, voices: approvedVoices });
  } catch (error) {
    console.error("TTS generation error:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "internal_error" }, { status: 500 });
  }
}
