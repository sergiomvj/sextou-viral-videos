"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { composeStudioVideo } from "@/lib/browser-video-composer";
import type {
  AudioData,
  BriefData,
  OverlayConfig,
  ProductionPayload,
  SceneConfig,
  ScriptData,
  VideoData,
  VoicesData,
} from "@/lib/studio-types";
import {
  buildNarrationOrder,
  hasRenderableMediaUrl,
  heygenAvatars,
  heygenVoices,
  suggestVoiceAssignments,
  videoModels,
} from "@/lib/studio-utils";

const goalOptions = [
  { value: "awareness", label: "Awareness" },
  { value: "conversao", label: "Conversao" },
  { value: "engajamento", label: "Engajamento" },
  { value: "educacao", label: "Educacao" },
  { value: "depoimento", label: "Depoimento" },
  { value: "lancamento", label: "Lancamento" },
];

type WizardState = {
  brief: BriefData;
  script: ScriptData;
  voices: VoicesData;
  audio: AudioData;
  video: VideoData;
};

type AssetOption = {
  id: string;
  name: string;
  url: string;
};

type CompositionState = {
  pending: boolean;
  progress: number;
  label: string;
  error: string | null;
  url: string | null;
};

export function StudioWizard({
  production,
  userPlan,
}: {
  production: ProductionPayload;
  userPlan: "FREE" | "PRO";
}) {
  const [phase, setPhase] = useState(production.phase);
  const [state, setState] = useState<WizardState>({
    brief: production.brief,
    script: production.script,
    voices: production.voices,
    audio: production.audio,
    video: production.video,
  });
  const [statusMessage, setStatusMessage] = useState("Pronto");
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [composition, setComposition] = useState<CompositionState>({
    pending: false,
    progress: 0,
    label: "Montagem final ainda nao executada",
    error: null,
    url: null,
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      const response = await fetch("/api/assets");
      if (!response.ok) return;
      const payload = await response.json();
      if (cancelled) return;
      setAssets(
        (payload.assets ?? []).map((asset: { id: string; name: string; url: string }) => ({
          id: asset.id,
          name: asset.name,
          url: asset.url,
        })),
      );
    }

    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (composition.url?.startsWith("blob:")) {
        URL.revokeObjectURL(composition.url);
      }
    };
  }, [composition.url]);

  const persistDraft = useCallback(async () => {
    setStatusMessage("Salvando...");
    const response = await fetch(`/api/productions/${production.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase,
        title: state.brief.product ? `Video - ${state.brief.product}` : production.title,
        mode: state.video.config.mode,
        briefJson: state.brief,
        scriptJson: state.script,
        voicesJson: state.voices,
        audioJson: state.audio,
        scenesJson: state.video,
      }),
    });

    if (response.ok) {
      setStatusMessage(
        `Salvo as ${new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    } else {
      setStatusMessage("Falha ao salvar");
    }
  }, [phase, production.id, production.title, state]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (phase < 1) return;
      void persistDraft();
    }, 800);

    return () => clearTimeout(timeout);
  }, [persistDraft, phase]);

  const estimatedSeconds = useMemo(() => state.script.estimatedSeconds || 0, [state.script.estimatedSeconds]);
  const overlayAssetUrl = useMemo(
    () => assets.find((asset) => asset.id === state.video.config.overlay.assetId)?.url ?? null,
    [assets, state.video.config.overlay.assetId],
  );
  const previewUrl = composition.url ?? state.video.finalVideoUrl;
  const canPreviewVideo = hasRenderableMediaUrl(previewUrl);

  async function generateScript() {
    setStatusMessage("Gerando roteiro...");
    startTransition(async () => {
      try {
        const response = await fetch("/api/generate/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: state.brief, productionId: production.id }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Erro ao gerar roteiro");
        setState((current) => ({
          ...current,
          script: payload.script,
          brief: payload.brief,
          voices: {
            ...current.voices,
            assignments: suggestVoiceAssignments(payload.script, current.voices),
          },
        }));
        setPhase(2);
        setStatusMessage("Roteiro gerado");
      } catch (error) {
        setStatusMessage(`Falha: ${getErrorMessage(error)}`);
      }
    });
  }

  async function generateAudio() {
    setStatusMessage("Gerando vozes...");
    startTransition(async () => {
      try {
        const response = await fetch("/api/generate/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productionId: production.id,
            script: state.script,
            voices: state.voices,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Erro ao gerar audios");
        setState((current) => ({
          ...current,
          audio: payload.audio,
          voices: payload.voices,
        }));
        setPhase(3);
        setStatusMessage("Audios prontos");
      } catch (error) {
        setStatusMessage(`Falha: ${getErrorMessage(error)}`);
      }
    });
  }

  async function generateVideo() {
    setStatusMessage("Gerando video...");
    startTransition(async () => {
      try {
        const endpoint = state.video.config.mode === "HEYGEN" ? "/api/heygen/video" : "/api/generate/video";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productionId: production.id,
            brief: state.brief,
            script: state.script,
            voices: state.voices,
            audio: state.audio,
            video: state.video,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Erro ao gerar videos");
        setState((current) => ({
          ...current,
          video: payload.video,
        }));
        setPhase(4);
        setStatusMessage(payload.video.finalVideoUrl ? "Video final pronto" : "Cenas geradas, montagem pendente");
        setComposition((current) => ({
          ...current,
          error: null,
          progress: 0,
          label: payload.video.finalVideoUrl ? "Video final recebido do provider" : "Pronto para montar video final",
          url: current.url,
        }));
      } catch (error) {
        setStatusMessage(`Falha: ${getErrorMessage(error)}`);
      }
    });
  }

  async function composeFinalVideo() {
    if (!state.video.jobs.length || composition.pending) {
      return;
    }

    setComposition((current) => ({
      ...current,
      pending: true,
      progress: 2,
      label: "Inicializando montagem final",
      error: null,
    }));
    setStatusMessage("Montando video final...");

    try {
      const result = await composeStudioVideo(
        {
          scenes: state.video.jobs,
          audioJobs: buildNarrationOrder(state.script, state.audio),
          overlay: state.video.config.overlay,
          overlayUrl: overlayAssetUrl,
          config: state.video.config,
        },
        (progress) => {
          setComposition((current) => ({
            ...current,
            progress: progress.progress,
            label: progress.label,
          }));
        },
      );

      setComposition({
        pending: false,
        progress: 100,
        label: "Composicao final concluida",
        error: null,
        url: result.url,
      });
      setStatusMessage("Video final composto localmente");
    } catch (error) {
      setComposition((current) => ({
        ...current,
        pending: false,
        error: getErrorMessage(error),
        label: "Falha na composicao final",
      }));
      setStatusMessage(`Falha: ${getErrorMessage(error)}`);
    }
  }

  async function duplicateProduction() {
    const response = await fetch(`/api/productions/${production.id}/duplicate`, {
      method: "POST",
    });
    if (!response.ok) return;
    const payload = await response.json();
    window.location.href = `/studio/${payload.id}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Workflow principal</div>
            <h1 className="mt-2 text-3xl font-bold">{state.brief.product || "Nova producao"}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Status: {statusMessage} · Plano {userPlan} · Fase atual {phase}/4
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={duplicateProduction} type="button">
              Duplicar
            </button>
            <a className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" href="/jobs">
              Ver jobs
            </a>
          </div>
        </div>
      </div>

      <WizardPhases phase={phase} />

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <Card title="Fase 1 · Briefing">
            <BriefingStep brief={state.brief} onChange={(brief) => setState((current) => ({ ...current, brief }))} />
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
                disabled={!canGenerateScript(state.brief) || isPending}
                onClick={generateScript}
                type="button"
              >
                Gerar roteiro
              </button>
            </div>
          </Card>

          <Card title="Fase 2 · Roteiro">
            <ScriptStep
              estimatedSeconds={estimatedSeconds}
              targetDuration={state.brief.targetDuration}
              script={state.script}
              onApprove={() =>
                setState((current) => ({
                  ...current,
                  script: { ...current.script, approved: true },
                }))
              }
              onChange={(script) => setState((current) => ({ ...current, script }))}
            />
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
                disabled={!state.script.raw || estimatedSeconds > state.brief.targetDuration || isPending}
                onClick={generateAudio}
                type="button"
              >
                Aprovar vozes e gerar audios
              </button>
            </div>
          </Card>

          <Card title="Fase 3 · Vozes e audios">
            <VoicesStep
              audio={state.audio}
              script={state.script}
              voices={state.voices}
              onChange={(voices) => setState((current) => ({ ...current, voices }))}
            />
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
                disabled={!state.audio.jobs.length || isPending}
                onClick={generateVideo}
                type="button"
              >
                Gerar video final
              </button>
            </div>
          </Card>

          <Card title="Fase 4 · Video e distribuicao">
            <VideoStep
              assets={assets}
              plan={userPlan}
              video={state.video}
              onChange={(video) => setState((current) => ({ ...current, video }))}
            />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Resumo do projeto">
            <SummaryPanel phase={phase} state={state} />
          </Card>

          <Card title="Montagem final">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-[var(--muted)]">
                {composition.label}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
                  <span>Progresso de composicao</span>
                  <span>{composition.progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${composition.progress}%` }} />
                </div>
              </div>

              {composition.error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{composition.error}</div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={!state.video.jobs.length || composition.pending}
                  onClick={composeFinalVideo}
                  type="button"
                >
                  {composition.pending ? "Compondo..." : "Montar video final"}
                </button>

                {previewUrl && canPreviewVideo ? (
                  <a className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" download href={previewUrl}>
                    Baixar arquivo atual
                  </a>
                ) : null}
              </div>

              {state.video.config.overlay.enabled ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
                  Overlay: {overlayAssetUrl ? "asset carregado para composicao" : "ativo sem asset selecionado"}
                </div>
              ) : null}
            </div>
          </Card>

          <Card title="Video final">
            {previewUrl && canPreviewVideo ? (
              <div className="space-y-3">
                <video className="w-full rounded-2xl border border-white/10 bg-black/60" controls src={previewUrl} />
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  Producao pronta para preview e download.
                </div>
              </div>
            ) : state.video.finalVideoUrl ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-[var(--muted)]">
                Resultado atual recebido: {state.video.finalVideoUrl}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-[var(--muted)]">
                Gere cenas e rode a montagem final para produzir um arquivo local de preview.
              </div>
            )}
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">{title}</div>
      {children}
    </div>
  );
}

function WizardPhases({ phase }: { phase: number }) {
  const phases = ["Briefing", "Roteiro", "Vozes", "Video"];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {phases.map((label, index) => {
        const current = index + 1;
        const isActive = current === phase;
        const isDone = current < phase;
        return (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                : isDone
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-[var(--muted)]"
            }`}
            key={label}
          >
            {current}. {label}
          </div>
        );
      })}
    </div>
  );
}

function BriefingStep({
  brief,
  onChange,
}: {
  brief: BriefData;
  onChange: (brief: BriefData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Produto">
          <input className="field" value={brief.product} onChange={(event) => onChange({ ...brief, product: event.target.value })} />
        </Field>
        <Field label="Objetivo">
          <select className="field" value={brief.goal} onChange={(event) => onChange({ ...brief, goal: event.target.value as BriefData["goal"] })}>
            <option value="">Selecione</option>
            {goalOptions.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Ideia do video">
        <textarea className="field min-h-28" value={brief.idea} onChange={(event) => onChange({ ...brief, idea: event.target.value })} />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tom de voz">
          <input className="field" value={brief.tone} onChange={(event) => onChange({ ...brief, tone: event.target.value })} />
        </Field>
        <Field label="Publico">
          <input className="field" value={brief.audience} onChange={(event) => onChange({ ...brief, audience: event.target.value })} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {brief.characters.map((character, index) => (
          <Field key={index} label={`Personagem ${index + 1}`}>
            <input
              className="field"
              value={character}
              onChange={(event) => {
                const characters = [...brief.characters];
                characters[index] = event.target.value;
                onChange({ ...brief, characters });
              }}
            />
          </Field>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Duracao alvo">
          <select
            className="field"
            value={String(brief.targetDuration)}
            onChange={(event) => onChange({ ...brief, targetDuration: Number(event.target.value) as BriefData["targetDuration"] })}
          >
            <option value="15">15s</option>
            <option value="20">20s</option>
            <option value="30">30s</option>
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
          <input checked={brief.hasNarrator} onChange={(event) => onChange({ ...brief, hasNarrator: event.target.checked })} type="checkbox" />
          Incluir narrador
        </label>
      </div>
    </div>
  );
}

function ScriptStep({
  script,
  estimatedSeconds,
  targetDuration,
  onChange,
  onApprove,
}: {
  script: ScriptData;
  estimatedSeconds: number;
  targetDuration: number;
  onChange: (script: ScriptData) => void;
  onApprove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-[var(--muted)]">
        Duracao estimada: {estimatedSeconds}s · Limite atual: {targetDuration}s · Legenda sugerida incluida.
      </div>
      <textarea className="field min-h-64" value={script.raw} onChange={(event) => onChange({ ...script, raw: event.target.value })} />
      <div className="flex gap-3">
        <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" onClick={onApprove} type="button">
          Marcar roteiro aprovado
        </button>
        {estimatedSeconds > targetDuration ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            Ajuste o roteiro antes de continuar.
          </div>
        ) : null}
      </div>
      {script.caption ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
          <div className="mb-2 text-white">Legenda sugerida</div>
          {script.caption}
        </div>
      ) : null}
    </div>
  );
}

function VoicesStep({
  script,
  voices,
  audio,
  onChange,
}: {
  script: ScriptData;
  voices: VoicesData;
  audio: AudioData;
  onChange: (voices: VoicesData) => void;
}) {
  const characters = Array.from(
    new Set(
      script.lines
        .filter((line) => line.type === "speech" || line.type === "narrator")
        .map((line) => line.speaker || "NARRADOR"),
    ),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Idioma">
          <select className="field" value={voices.language} onChange={(event) => onChange({ ...voices, language: event.target.value })}>
            <option value="pt-BR">Portugues BR</option>
            <option value="en-US">English US</option>
            <option value="es-ES">Espanol</option>
          </select>
        </Field>
        <Field label="Provider TTS">
          <select
            className="field"
            value={voices.provider}
            onChange={(event) => onChange({ ...voices, provider: event.target.value as VoicesData["provider"] })}
          >
            <option value="gemini">Gemini</option>
            <option value="grok">Grok</option>
          </select>
        </Field>
      </div>
      <div className="space-y-3">
        {characters.map((character, index) => {
          const assignment = voices.assignments[index] ?? {
            character,
            voiceId: voices.provider === "gemini" ? "Achernar" : "Eve",
          };
          const voiceOptions = voices.provider === "gemini" ? ["Achernar", "Kore", "Puck", "Sulafat"] : ["Eve", "Ara", "Rex", "Sal"];
          const audioJob = audio.jobs.find((job) => job.character === character);
          return (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-[1fr_1fr_auto]" key={character}>
              <div className="text-sm font-medium">{character}</div>
              <select
                className="field"
                value={assignment.voiceId}
                onChange={(event) => {
                  const assignments = [...voices.assignments];
                  assignments[index] = { character, voiceId: event.target.value };
                  onChange({ ...voices, assignments });
                }}
              >
                {voiceOptions.map((voice) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </select>
              {audioJob?.audioUrl ? (
                <audio className="max-w-40" controls src={audioJob.audioUrl} />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--muted)]">Sample mock</div>
              )}
            </div>
          );
        })}
      </div>
      {audio.jobs.length ? (
        <div className="space-y-2">
          {audio.jobs.map((job) => (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300" key={job.id}>
              <div>
                {job.character} · {job.voiceId} · {job.durationSeconds}s
              </div>
              {job.audioUrl ? <audio className="mt-2 w-full" controls src={job.audioUrl} /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VideoStep({
  video,
  plan,
  assets,
  onChange,
}: {
  video: VideoData;
  plan: "FREE" | "PRO";
  assets: AssetOption[];
  onChange: (video: VideoData) => void;
}) {
  const config = video.config;
  const isProLocked = plan !== "PRO" && config.mode === "HEYGEN";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Modo">
          <select
            className="field"
            value={config.mode}
            onChange={(event) =>
              onChange({
                ...video,
                config: {
                  ...config,
                  mode: event.target.value as VideoData["config"]["mode"],
                },
              })
            }
          >
            <option value="OPENROUTER">Modo Cenas</option>
            <option value="HEYGEN">Modo Avatar PRO</option>
          </select>
        </Field>
        <Field label="Modelo">
          <select
            className="field"
            value={config.videoModelId}
            onChange={(event) => onChange({ ...video, config: { ...config, videoModelId: event.target.value } })}
          >
            {videoModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Aspecto">
          <select
            className="field"
            value={config.aspect}
            onChange={(event) => onChange({ ...video, config: { ...config, aspect: event.target.value as SceneConfig["aspect"] } })}
          >
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
          </select>
        </Field>
        <Field label="Resolucao">
          <select
            className="field"
            value={config.resolution}
            onChange={(event) =>
              onChange({ ...video, config: { ...config, resolution: event.target.value as SceneConfig["resolution"] } })
            }
          >
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </Field>
        <Field label="Duracao cena">
          <input
            className="field"
            type="number"
            value={config.sceneDuration}
            onChange={(event) => onChange({ ...video, config: { ...config, sceneDuration: Number(event.target.value) } })}
          />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
          <input
            checked={config.sceneAudio}
            onChange={(event) => onChange({ ...video, config: { ...config, sceneAudio: event.target.checked } })}
            type="checkbox"
          />
          Sons de cena
        </label>
      </div>

      {config.mode === "HEYGEN" ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          {plan !== "PRO" ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
              Modo Avatar PRO bloqueado no plano Free. Use a pagina de billing para upgrade.
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Avatar">
              <select
                className="field"
                disabled={plan !== "PRO"}
                value={config.avatarId ?? ""}
                onChange={(event) => onChange({ ...video, config: { ...config, avatarId: event.target.value } })}
              >
                <option value="">Selecione</option>
                {heygenAvatars.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.name} · {avatar.style}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Voz avatar">
              <select
                className="field"
                disabled={plan !== "PRO"}
                value={config.avatarVoiceId ?? ""}
                onChange={(event) => onChange({ ...video, config: { ...config, avatarVoiceId: event.target.value } })}
              >
                <option value="">Selecione</option>
                {heygenVoices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Background">
            <input
              className="field"
              disabled={plan !== "PRO"}
              value={config.background}
              onChange={(event) => onChange({ ...video, config: { ...config, background: event.target.value } })}
            />
          </Field>
          {isProLocked ? null : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--muted)]">
              Fluxo HeyGen mockado com limite operacional de 15 segundos.
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Logo overlay">
          <select
            className="field"
            value={config.overlay.enabled ? "on" : "off"}
            onChange={(event) => onChange({ ...video, config: { ...config, overlay: { ...config.overlay, enabled: event.target.value === "on" } } })}
          >
            <option value="off">Desligado</option>
            <option value="on">Ligado</option>
          </select>
        </Field>
        <Field label="Posicao overlay">
          <select
            className="field"
            value={config.overlay.position}
            onChange={(event) => onChange({ ...video, config: { ...config, overlay: { ...config.overlay, position: event.target.value } } })}
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
            <option value="center">Center</option>
          </select>
        </Field>
        <Field label="Asset do overlay">
          <select
            className="field"
            disabled={!config.overlay.enabled}
            value={config.overlay.assetId ?? ""}
            onChange={(event) =>
              onChange({
                ...video,
                config: {
                  ...config,
                  overlay: {
                    ...config.overlay,
                    assetId: event.target.value || null,
                  },
                },
              })
            }
          >
            <option value="">Sem asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <OverlayControls overlay={config.overlay} onChange={(overlay) => onChange({ ...video, config: { ...config, overlay } })} />

      {video.jobs.length ? (
        <div className="space-y-2">
          {video.jobs.map((job) => (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm" key={job.id}>
              <div className="font-medium text-white">{job.id}</div>
              <div className="mt-1 text-[var(--muted)]">{job.prompt}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-300">{job.videoUrl}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OverlayControls({
  overlay,
  onChange,
}: {
  overlay: OverlayConfig;
  onChange: (overlay: OverlayConfig) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Tamanho %">
        <input
          className="field"
          disabled={!overlay.enabled}
          max={40}
          min={8}
          type="number"
          value={overlay.sizePercent}
          onChange={(event) => onChange({ ...overlay, sizePercent: Number(event.target.value) })}
        />
      </Field>
      <Field label="Opacidade %">
        <input
          className="field"
          disabled={!overlay.enabled}
          max={100}
          min={10}
          type="number"
          value={overlay.opacity}
          onChange={(event) => onChange({ ...overlay, opacity: Number(event.target.value) })}
        />
      </Field>
      <Field label="Inicio do overlay">
        <select className="field" disabled={!overlay.enabled} value={overlay.startMode} onChange={(event) => onChange({ ...overlay, startMode: event.target.value })}>
          <option value="from-start">From Start</option>
          <option value="after-intro">After Intro</option>
        </select>
      </Field>
    </div>
  );
}

function SummaryPanel({
  state,
  phase,
}: {
  state: WizardState;
  phase: number;
}) {
  return (
    <div className="space-y-4 text-sm text-[var(--muted)]">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-2 text-white">Briefing</div>
        <div>Produto: {state.brief.product || "-"}</div>
        <div>Objetivo: {state.brief.goal || "-"}</div>
        <div>Duracao alvo: {state.brief.targetDuration}s</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-2 text-white">Roteiro</div>
        <div>Linhas: {state.script.lines.length}</div>
        <div>Duracao estimada: {state.script.estimatedSeconds}s</div>
        <div>Aprovado: {state.script.approved ? "Sim" : "Nao"}</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-2 text-white">Producao</div>
        <div>Fase atual: {phase}</div>
        <div>Audios: {state.audio.jobs.length}</div>
        <div>Cenas/jobs: {state.video.jobs.length}</div>
        <div>Modo: {state.video.config.mode}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-[var(--muted)]">{label}</div>
      {children}
    </label>
  );
}

function canGenerateScript(brief: BriefData) {
  return Boolean(brief.product && brief.goal && brief.idea);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido";
}
