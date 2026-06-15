import type { AudioJob, OverlayConfig, SceneConfig, SceneJob } from "@/lib/studio-types";

type ComposeInput = {
  scenes: SceneJob[];
  audioJobs: AudioJob[];
  overlay: OverlayConfig;
  overlayUrl?: string | null;
  config: SceneConfig;
};

type ComposeProgress = {
  label: string;
  progress: number;
};

export async function composeStudioVideo(
  input: ComposeInput,
  onProgress?: (progress: ComposeProgress) => void,
) {
  if (!input.scenes.length) {
    throw new Error("Nenhuma cena disponivel para composicao");
  }

  if (typeof window === "undefined") {
    throw new Error("Compositor disponivel apenas no navegador");
  }

  const { width, height } = resolveCanvasSize(input.config.aspect, input.config.resolution);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Falha ao inicializar canvas de composicao");
  }

  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const videoStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);

  const mimeType = resolveRecorderMimeType();
  const recorder = mimeType ? new MediaRecorder(combinedStream, { mimeType }) : new MediaRecorder(combinedStream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  let animationFrame = 0;
  const stopAll = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    recorder.stream.getTracks().forEach((track) => track.stop());
    void audioContext.close();
  };

  try {
    drawScenePlaceholder(ctx, width, height, "Preparando composicao final...", "Sincronizando cenas e narracao", 0);

    const overlayImage = input.overlay.enabled && input.overlayUrl ? await tryLoadImage(input.overlayUrl) : null;
    const orderedAudio = input.audioJobs.filter((job) => Boolean(job.audioUrl));
    const scheduledDuration = await scheduleAudioTracks(audioContext, destination, orderedAudio);
    const totalSceneDuration = input.scenes.reduce((sum, scene) => sum + normalizeDuration(scene.durationSeconds), 0);
    const totalDuration = Math.max(totalSceneDuration, scheduledDuration, 1);

    recorder.start(250);
    const compositionStart = performance.now();
    let sceneElapsedBase = 0;

    for (let index = 0; index < input.scenes.length; index++) {
      const scene = input.scenes[index];
      const sceneDuration = normalizeDuration(scene.durationSeconds);
      const percentBase = Math.round((sceneElapsedBase / totalDuration) * 100);
      onProgress?.({
        label: `Compondo cena ${index + 1} de ${input.scenes.length}`,
        progress: Math.max(1, Math.min(95, percentBase)),
      });

      const sceneProgressStart = sceneElapsedBase;
      const drawOverlay = () => {
        if (overlayImage) {
          renderOverlay(ctx, overlayImage, width, height, input.overlay);
        }
        renderWatermark(ctx, width, height, index + 1, input.scenes.length);
      };

      if (isRenderableVideoUrl(scene.videoUrl)) {
        try {
          const video = await loadVideo(scene.videoUrl);
          await video.play();
          await animateScene(sceneDuration, (elapsed) => {
            drawVideoFrame(ctx, video, width, height);
            drawOverlay();
            drawSceneFooter(ctx, width, height, scene.prompt, elapsed / sceneDuration);
            const progress = Math.round(((sceneProgressStart + elapsed) / totalDuration) * 100);
            onProgress?.({
              label: `Renderizando cena ${index + 1}`,
              progress: Math.max(1, Math.min(95, progress)),
            });
          });
          video.pause();
          video.src = "";
        } catch {
          await animateScene(sceneDuration, (elapsed) => {
            drawScenePlaceholder(ctx, width, height, `Cena ${index + 1}`, scene.prompt, elapsed / sceneDuration);
            drawOverlay();
            const progress = Math.round(((sceneProgressStart + elapsed) / totalDuration) * 100);
            onProgress?.({
              label: `Compondo cena ${index + 1}`,
              progress: Math.max(1, Math.min(95, progress)),
            });
          });
        }
      } else {
        await animateScene(sceneDuration, (elapsed) => {
          drawScenePlaceholder(ctx, width, height, `Cena ${index + 1}`, scene.prompt, elapsed / sceneDuration);
          drawOverlay();
          const progress = Math.round(((sceneProgressStart + elapsed) / totalDuration) * 100);
          onProgress?.({
            label: `Compondo cena ${index + 1}`,
            progress: Math.max(1, Math.min(95, progress)),
          });
        });
      }

      sceneElapsedBase += sceneDuration;
    }

    const elapsedSeconds = (performance.now() - compositionStart) / 1000;
    if (elapsedSeconds < totalDuration) {
      const tailDuration = totalDuration - elapsedSeconds;
      await animateScene(tailDuration, (elapsed) => {
        drawScenePlaceholder(ctx, width, height, "Finalizando", "Segurando frame final para a narracao terminar", elapsed / tailDuration);
        if (overlayImage) {
          renderOverlay(ctx, overlayImage, width, height, input.overlay);
        }
        renderWatermark(ctx, width, height, input.scenes.length, input.scenes.length);
      });
    }

    onProgress?.({ label: "Fechando arquivo final", progress: 98 });

    const output = await finalizeRecorder(recorder, chunks);
    stopAll();
    onProgress?.({ label: "Composicao concluida", progress: 100 });
    return output;
  } catch (error) {
    stopAll();
    throw error;
  }

  async function animateScene(durationSeconds: number, drawFrame: (elapsedSeconds: number) => void) {
    const start = performance.now();
    return new Promise<void>((resolve) => {
      const loop = () => {
        const elapsedSeconds = Math.min(durationSeconds, (performance.now() - start) / 1000);
        drawFrame(elapsedSeconds);
        if (elapsedSeconds >= durationSeconds) {
          resolve();
          return;
        }
        animationFrame = requestAnimationFrame(loop);
      };
      loop();
    });
  }
}

function resolveCanvasSize(aspect: SceneConfig["aspect"], resolution: SceneConfig["resolution"]) {
  const verticalBase = resolution === "480p" ? 480 : resolution === "720p" ? 720 : 1080;

  if (aspect === "9:16") {
    return { width: Math.round((verticalBase * 9) / 16), height: verticalBase };
  }
  if (aspect === "16:9") {
    return { width: verticalBase, height: Math.round((verticalBase * 9) / 16) };
  }
  return { width: verticalBase, height: verticalBase };
}

function resolveRecorderMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

async function scheduleAudioTracks(audioContext: AudioContext, destination: MediaStreamAudioDestinationNode, jobs: AudioJob[]) {
  if (!jobs.length) {
    return 0;
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  let offset = audioContext.currentTime + 0.15;

  for (const job of jobs) {
    try {
      const response = await fetch(job.audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      source.start(offset);
      offset += buffer.duration + 0.06;
    } catch {
      offset += normalizeDuration(job.durationSeconds) + 0.06;
    }
  }

  return offset - audioContext.currentTime;
}

function finalizeRecorder(recorder: MediaRecorder, chunks: BlobPart[]) {
  return new Promise<{ blob: Blob; url: string }>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Falha ao gravar video final"));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };
    recorder.stop();
  });
}

function normalizeDuration(value: number | null | undefined) {
  return Math.max(1, Number.isFinite(value) ? Number(value) : 4);
}

function isRenderableVideoUrl(value: string) {
  return /^(data:video|blob:|https?:)/.test(value);
}

function drawVideoFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);
  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let dx = 0;
  let dy = 0;

  if (videoAspect > canvasAspect) {
    drawHeight = height;
    drawWidth = height * videoAspect;
    dx = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / videoAspect;
    dy = (height - drawHeight) / 2;
  }

  ctx.drawImage(video, dx, dy, drawWidth, drawHeight);
}

function drawScenePlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  prompt: string,
  progress: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111111");
  gradient.addColorStop(0.5, "#4f0a16");
  gradient.addColorStop(1, "#1b1b1b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(32, 32, width - 64, height - 64);

  ctx.fillStyle = "#f5efe6";
  ctx.font = "700 32px sans-serif";
  ctx.fillText(title, 56, 96);

  ctx.fillStyle = "rgba(245,239,230,0.78)";
  ctx.font = "24px sans-serif";
  wrapText(ctx, prompt, 56, 152, width - 112, 34);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(56, height - 92, width - 112, 12);
  ctx.fillStyle = "#ff3d57";
  ctx.fillRect(56, height - 92, (width - 112) * Math.max(0.04, Math.min(1, progress)), 12);
}

function drawSceneFooter(ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string, progress: number) {
  ctx.fillStyle = "rgba(8,8,8,0.72)";
  ctx.fillRect(24, height - 172, width - 48, 132);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 20px sans-serif";
  ctx.fillText("Cena em execucao", 44, height - 134);
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "18px sans-serif";
  wrapText(ctx, prompt, 44, height - 102, width - 88, 26);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(44, height - 56, width - 88, 8);
  ctx.fillStyle = "#ff3d57";
  ctx.fillRect(44, height - 56, (width - 88) * Math.max(0.04, Math.min(1, progress)), 8);
}

function renderWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, sceneIndex: number, total: number) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(width - 176, 24, 152, 42);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 18px sans-serif";
  ctx.fillText(`Cena ${sceneIndex}/${total}`, width - 158, 51);
}

function renderOverlay(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  overlay: OverlayConfig,
) {
  const targetWidth = Math.max(64, Math.round(width * (overlay.sizePercent / 100)));
  const aspect = image.naturalWidth / image.naturalHeight || 1;
  const targetHeight = Math.round(targetWidth / aspect);
  const margin = 32;

  let x = margin;
  let y = margin;

  if (overlay.position === "top-right") {
    x = width - targetWidth - margin;
  } else if (overlay.position === "bottom-left") {
    y = height - targetHeight - margin;
  } else if (overlay.position === "bottom-right") {
    x = width - targetWidth - margin;
    y = height - targetHeight - margin;
  } else if (overlay.position === "center") {
    x = Math.round((width - targetWidth) / 2);
    y = Math.round((height - targetHeight) / 2);
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.1, Math.min(1, overlay.opacity / 100));
  ctx.drawImage(image, x, y, targetWidth, targetHeight);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function loadVideo(src: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Falha ao carregar video da cena"));
  });
}

async function tryLoadImage(src: string) {
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem de overlay"));
    image.src = src;
  });
}
