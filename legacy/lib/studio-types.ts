export type VideoGoal =
  | "awareness"
  | "conversao"
  | "engajamento"
  | "educacao"
  | "depoimento"
  | "lancamento";

export type PlanType = "FREE" | "PRO";
export type ProductionMode = "OPENROUTER" | "HEYGEN";
export type ScriptLineType = "scene" | "speech" | "narrator" | "ignore";
export type JobState = "queued" | "processing" | "completed" | "failed";

export type BriefData = {
  product: string;
  goal: VideoGoal | "";
  hasNarrator: boolean;
  characters: string[];
  idea: string;
  tone: string;
  audience: string;
  targetDuration: 15 | 20 | 30;
  hashtags: string[];
};

export type ScriptLine = {
  id: string;
  type: ScriptLineType;
  speaker: string | null;
  text: string;
};

export type ScriptData = {
  raw: string;
  lines: ScriptLine[];
  versions: string[];
  approved: boolean;
  estimatedSeconds: number;
  caption: string;
};

export type VoiceAssignment = {
  character: string;
  voiceId: string;
};

export type VoicesData = {
  language: string;
  provider: "gemini" | "grok";
  assignments: VoiceAssignment[];
  approved: boolean;
};

export type AudioJob = {
  id: string;
  character: string;
  voiceId: string;
  state: JobState;
  audioUrl: string;
  durationSeconds: number;
};

export type AudioData = {
  jobs: AudioJob[];
  generatedAt: string | null;
};

export type OverlayConfig = {
  enabled: boolean;
  assetId: string | null;
  position: string;
  sizePercent: number;
  opacity: number;
  enterAnimation: string;
  exitAnimation: string;
  startMode: string;
};

export type SceneJob = {
  id: string;
  prompt: string;
  state: JobState;
  videoUrl: string;
  durationSeconds: number;
};

export type SceneConfig = {
  mode: ProductionMode;
  videoModelId: string;
  aspect: "16:9" | "9:16" | "1:1";
  resolution: "480p" | "720p" | "1080p";
  sceneAudio: boolean;
  sceneDuration: number;
  prompts: string[];
  overlay: OverlayConfig;
  avatarId: string | null;
  avatarVoiceId: string | null;
  background: string;
};

export type VideoData = {
  config: SceneConfig;
  jobs: SceneJob[];
  finalVideoUrl: string | null;
  finalThumbnailUrl: string | null;
  updatedAt: string | null;
};

export type ProductionPayload = {
  id: string;
  title: string;
  status: string;
  mode: ProductionMode;
  phase: number;
  brief: BriefData;
  script: ScriptData;
  voices: VoicesData;
  audio: AudioData;
  video: VideoData;
  errorMessage: string | null;
  updatedAt: string;
  createdAt: string;
};
