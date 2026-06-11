import type {
  AudioData,
  AudioJob,
  BriefData,
  ProductionMode,
  ProductionPayload,
  SceneConfig,
  SceneJob,
  ScriptData,
  ScriptLine,
  VideoData,
  VoicesData,
} from "@/lib/studio-types";

const goalMap = {
  awareness: "apresentar o produto",
  conversao: "vender e converter",
  engajamento: "viralizar e gerar compartilhamentos",
  educacao: "ensinar como usar",
  depoimento: "mostrar prova social",
  lancamento: "revelar uma novidade",
} as const;

const sampleVoices = {
  gemini: ["Achernar", "Kore", "Puck", "Sulafat", "Zephyr"],
  grok: ["Eve", "Ara", "Rex", "Sal", "Leo"],
};

export const videoModels = [
  {
    id: "mock/cinematic-fast",
    name: "Mock Studio: Cinematic Fast",
    provider: "Mock",
    maxDuration: 8,
    resolutions: ["480p", "720p", "1080p"],
  },
  {
    id: "mock/vertical-social",
    name: "Mock Studio: Vertical Social",
    provider: "Mock",
    maxDuration: 12,
    resolutions: ["720p", "1080p"],
  },
];

export const heygenAvatars = [
  { id: "ava-amber", name: "Amber", style: "formal", gender: "Feminino" },
  { id: "ava-lucas", name: "Lucas", style: "casual", gender: "Masculino" },
  { id: "ava-noah", name: "Noah", style: "creator", gender: "Masculino" },
];

export const heygenVoices = [
  { id: "voice-pt-br-1", name: "PT-BR Natural" },
  { id: "voice-en-us-1", name: "EN-US Bright" },
  { id: "voice-es-es-1", name: "ES Warm" },
];

export function defaultBrief(): BriefData {
  return {
    product: "",
    goal: "",
    hasNarrator: true,
    characters: ["", "", "", ""],
    idea: "",
    tone: "Casual",
    audience: "",
    targetDuration: 30,
    hashtags: [],
  };
}

export function defaultScript(): ScriptData {
  return {
    raw: "",
    lines: [],
    versions: [],
    approved: false,
    estimatedSeconds: 0,
    caption: "",
  };
}

export function defaultVoices(): VoicesData {
  return {
    language: "pt-BR",
    provider: "gemini",
    assignments: [],
    approved: false,
  };
}

export function defaultAudio(): AudioData {
  return {
    jobs: [],
    generatedAt: null,
  };
}

export function defaultVideo(): VideoData {
  return {
    config: {
      mode: "OPENROUTER",
      videoModelId: videoModels[0].id,
      aspect: "9:16",
      resolution: "720p",
      sceneAudio: false,
      sceneDuration: 8,
      prompts: [],
      overlay: {
        enabled: false,
        assetId: null,
        position: "bottom-right",
        sizePercent: 18,
        opacity: 80,
        enterAnimation: "fade-in",
        exitAnimation: "none",
        startMode: "from-start",
      },
      avatarId: null,
      avatarVoiceId: null,
      background: "#101010",
    },
    jobs: [],
    finalVideoUrl: null,
    finalThumbnailUrl: null,
    updatedAt: null,
  };
}

export function makeTitle(brief: BriefData) {
  return brief.product ? `Video - ${brief.product}` : "Nova producao";
}

export function estimateSpeechSeconds(lines: ScriptLine[]) {
  const wordCount = lines
    .filter((line) => line.type === "speech" || line.type === "narrator")
    .reduce((acc, line) => acc + countWords(line.text), 0);
  return Math.max(0, Math.round(wordCount / 3));
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function generateMockScript(brief: BriefData): ScriptData {
  const characterPool = brief.characters.filter(Boolean).map((char) => char.trim().toUpperCase());
  const primaryCharacter = characterPool[0] ?? "NARRADOR";
  const secondaryCharacter = characterPool[1] ?? "CLIENTE";
  const goal = brief.goal ? goalMap[brief.goal] : "apresentar valor";
  const product = brief.product || "seu produto";
  const idea = brief.idea || "uma demonstracao rapida de beneficio";
  const raw = [
    `(Close cinematografico no ${product}, luz de contraste e camera em movimento suave)`,
    `${brief.hasNarrator ? "NARRADOR" : primaryCharacter}: Hoje voce vai ver como ${product} pode ${goal}.`,
    `(${primaryCharacter} interage com o produto, ritmo rapido, atmosfera social-first)`,
    `${secondaryCharacter}: Eu nao esperava resultado tao rapido.`,
    `(Tela final com uso do produto, CTA visual e energia de lancamento baseada em ${idea})`,
  ].join("\n");

  const lines = parseScript(raw);
  const hashtags = [`#${slugify(product)}`, "#viral", "#marketing", "#sextoustudio"];

  return {
    raw,
    lines,
    versions: [raw],
    approved: false,
    estimatedSeconds: estimateSpeechSeconds(lines),
    caption: `${product}: ${goal}. ${hashtags.join(" ")}`,
  };
}

export function parseScript(raw: string): ScriptLine[] {
  const lines: ScriptLine[] = [];

  raw.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      lines.push({
        id: `line-${index}`,
        type: "scene",
        speaker: null,
        text: trimmed.slice(1, -1).trim(),
      });
      return;
    }

    const match = trimmed.match(/^([A-ZÀ-Ÿ0-9_\-\s]{2,30}):\s*(.+)$/);
    if (match) {
      const speaker = match[1].trim();
      lines.push({
        id: `line-${index}`,
        type: /^NARRADOR|NARRATOR$/i.test(speaker) ? "narrator" : "speech",
        speaker,
        text: match[2].trim(),
      });
      return;
    }

    lines.push({
      id: `line-${index}`,
      type: "ignore",
      speaker: null,
      text: trimmed,
    });
  });

  return lines;
}

export function suggestVoiceAssignments(script: ScriptData, voices: VoicesData) {
  const options = sampleVoices[voices.provider];
  const characters = Array.from(
    new Set(
      script.lines
        .filter((line) => line.type === "speech" || line.type === "narrator")
        .map((line) => line.speaker || "NARRADOR"),
    ),
  );

  return characters.map((character, index) => ({
    character,
    voiceId: options[index % options.length],
  }));
}

export function generateMockAudio(script: ScriptData, voices: VoicesData): AudioData {
  const assignments = voices.assignments.length ? voices.assignments : suggestVoiceAssignments(script, voices);
  const jobs: AudioJob[] = assignments.map((assignment, index) => ({
    id: `audio-${index + 1}`,
    character: assignment.character,
    voiceId: assignment.voiceId,
    state: "completed",
    audioUrl: `mock://audio/${slugify(assignment.character)}.mp3`,
    durationSeconds: Math.max(
      2,
      script.lines
        .filter((line) => line.speaker === assignment.character)
        .reduce((acc, line) => acc + countWords(line.text), 0) / 3,
    ),
  }));

  return {
    jobs,
    generatedAt: new Date().toISOString(),
  };
}

export function buildVideoPrompts(script: ScriptData, brief: BriefData) {
  const explicitScenes = script.lines.filter((line) => line.type === "scene").map((line) => line.text);
  if (explicitScenes.length) {
    return explicitScenes;
  }
  return [
    `Video publicitario para ${brief.product}. Objetivo: ${brief.goal}. Conceito visual: ${brief.idea}. Sem texto na tela.`,
  ];
}

export function generateMockVideoJobs(
  script: ScriptData,
  brief: BriefData,
  videoConfig: SceneConfig,
  mode: ProductionMode,
): VideoData {
  const prompts =
    mode === "HEYGEN"
      ? [`Avatar ${videoConfig.avatarId ?? "default"} apresentando ${brief.product} com fundo ${videoConfig.background}`]
      : buildVideoPrompts(script, brief);

  const jobs: SceneJob[] = prompts.map((prompt, index) => ({
    id: `scene-${index + 1}`,
    prompt,
    state: "completed",
    videoUrl:
      mode === "HEYGEN"
        ? `mock://heygen/${videoConfig.avatarId ?? "avatar-default"}-${index + 1}.mp4`
        : `mock://video/${index + 1}.mp4`,
    durationSeconds: mode === "HEYGEN" ? Math.min(15, videoConfig.sceneDuration) : videoConfig.sceneDuration,
  }));

  return {
    config: {
      ...videoConfig,
      mode,
      prompts,
    },
    jobs,
    finalVideoUrl: mode === "HEYGEN" ? "mock://final/heygen-final.mp4" : "mock://final/openrouter-final.mp4",
    finalThumbnailUrl: "mock://final/thumb.jpg",
    updatedAt: new Date().toISOString(),
  };
}

export function hydrateProductionPayload(raw: {
  id: string;
  title: string;
  status: string;
  mode: ProductionMode;
  phase: number;
  briefJson: unknown;
  scriptJson: unknown;
  voicesJson: unknown;
  audioJson: unknown;
  scenesJson: unknown;
  errorMessage: string | null;
  updatedAt: Date;
  createdAt: Date;
}): ProductionPayload {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    mode: raw.mode,
    phase: raw.phase,
    brief: { ...defaultBrief(), ...(raw.briefJson as Partial<BriefData> | null) },
    script: { ...defaultScript(), ...(raw.scriptJson as Partial<ScriptData> | null) },
    voices: { ...defaultVoices(), ...(raw.voicesJson as Partial<VoicesData> | null) },
    audio: { ...defaultAudio(), ...(raw.audioJson as Partial<AudioData> | null) },
    video: { ...defaultVideo(), ...(raw.scenesJson as Partial<VideoData> | null) },
    errorMessage: raw.errorMessage,
    updatedAt: raw.updatedAt.toISOString(),
    createdAt: raw.createdAt.toISOString(),
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}
