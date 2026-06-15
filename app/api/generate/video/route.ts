import { NextRequest, NextResponse } from "next/server";
import { getProduction, updateProduction } from "@/lib/production";
import { buildVideoPrompts, computeExpectedFinalVideoUrl } from "@/lib/studio-utils";
import type { BriefData, ScriptData, VideoData, VoicesData, SceneJob } from "@/lib/studio-types";
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
    const voices = payload.voices as VoicesData;

    const apiKey = process.env.OPENROUTER_API_KEY;
    let generated: VideoData;

    if (!apiKey) {
      const { generateMockVideoJobs } = await import("@/lib/studio-utils");
      generated = generateMockVideoJobs(script, brief, video.config, "OPENROUTER");
    } else {
      const prompts = buildVideoPrompts(script, brief);
      const model = video.config.videoModelId.startsWith("mock/") ? "google/veo-3.1" : video.config.videoModelId;
      
      const jobs: SceneJob[] = [];
      let index = 1;

      // Lançar os jobs de video em paralelo no OpenRouter
      const jobPromises = prompts.map(async (prompt) => {
        const response = await fetch('https://openrouter.ai/api/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': "http://localhost:3000",
            'X-Title': "Sextou Viral Studio",
          },
          body: JSON.stringify({ model, prompt })
        });
        
        if (!response.ok) {
           throw new Error(`OpenRouter Video Error: ${response.status}`);
        }
        return response.json();
      });

      const orJobs = await Promise.all(jobPromises);
      
      // Polling de todos os jobs (esperar terminar)
      for (let i = 0; i < orJobs.length; i++) {
         const jobData = orJobs[i];
         const pollUrl = jobData.polling_url || `https://openrouter.ai/api/v1/videos/${jobData.id}`;
         let videoUrl = "";
         let attempts = 0;

         while (attempts < 60) { // Max ~5 minutos
            await new Promise(r => setTimeout(r, 5000));
            const pr = await fetch(pollUrl, {
               headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const pd = await pr.json();
            
            if (pd.status === 'completed' || pd.status === 'ready') {
               const contentUrl = `https://openrouter.ai/api/v1/videos/${jobData.id}/content`;
               const cr = await fetch(contentUrl, { headers: { 'Authorization': `Bearer ${apiKey}` } });
               if (cr.ok) {
                 const arrayBuffer = await cr.arrayBuffer();
                 const buffer = Buffer.from(arrayBuffer);
                 videoUrl = `data:video/mp4;base64,${buffer.toString('base64')}`;
               }
               break;
            }
            if (pd.status === 'failed') {
               console.error('Job failed:', jobData.id);
               break;
            }
            attempts++;
         }
         
         jobs.push({
           id: `scene-${index++}`,
           prompt: prompts[i],
           state: "completed",
           videoUrl: videoUrl || `mock://video/${index}.mp4`,
           durationSeconds: video.config.sceneDuration,
         });
      }

      generated = {
        config: { ...video.config, mode: "OPENROUTER", prompts },
        jobs,
        finalVideoUrl: computeExpectedFinalVideoUrl("OPENROUTER", jobs),
        finalThumbnailUrl: "mock://final/thumb.jpg",
        updatedAt: new Date().toISOString(),
      };
    }

    await updateProduction(userId, production.id, {
      phase: 4,
      status: "DONE",
      mode: "OPENROUTER",
      voicesJson: voices as unknown as Record<string, unknown>,
      scenesJson: generated as unknown as Record<string, unknown>,
      finalVideoUrl: generated.finalVideoUrl ?? undefined,
      errorMessage: null,
    } as never);

    return NextResponse.json({ video: generated });
  } catch (error) {
    console.error("Video generation error:", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "internal_error" }, { status: 500 });
  }
}
