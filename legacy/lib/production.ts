import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { defaultAudio, defaultBrief, defaultScript, defaultVideo, defaultVoices, hydrateProductionPayload, makeTitle } from "@/lib/studio-utils";
import type { BriefData, ProductionPayload } from "@/lib/studio-types";

export async function createDraftProduction(userId: string) {
  const brief = defaultBrief();
  const production = await prisma.production.create({
    data: {
      userId,
      title: makeTitle(brief),
      briefJson: brief,
      scriptJson: defaultScript(),
      voicesJson: defaultVoices(),
      audioJson: defaultAudio(),
      scenesJson: defaultVideo(),
      status: "DRAFT",
      mode: "OPENROUTER",
      phase: 1,
    },
  });

  return production.id;
}

export async function getProduction(userId: string, id: string): Promise<ProductionPayload | null> {
  const production = await prisma.production.findFirst({
    where: { id, userId },
  });

  if (!production) return null;
  return hydrateProductionPayload(production);
}

export async function listProductions(userId: string) {
  const productions = await prisma.production.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return productions.map(hydrateProductionPayload);
}

export async function updateProduction(
  userId: string,
  id: string,
  patch: Partial<{
    title: string;
    status: string;
    mode: string;
    phase: number;
    briefJson: Record<string, unknown>;
    scriptJson: Record<string, unknown>;
    voicesJson: Record<string, unknown>;
    audioJson: Record<string, unknown>;
    scenesJson: Record<string, unknown>;
    errorMessage: string | null;
    finalVideoUrl: string | null;
    thumbnailUrl: string | null;
  }>,
) {
  const existing = await prisma.production.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const production = await prisma.production.update({
    where: { id },
    data: patch as Parameters<typeof prisma.production.update>[0]["data"],
  });

  return hydrateProductionPayload(production);
}

export async function duplicateProduction(userId: string, id: string) {
  const existing = await prisma.production.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const copy = await prisma.production.create({
    data: {
      userId,
      title: `${existing.title} (copia)`,
      status: "DRAFT",
      mode: existing.mode,
      phase: existing.phase,
      briefJson: safeJson(existing.briefJson),
      scriptJson: safeJson(existing.scriptJson),
      voicesJson: safeJson(existing.voicesJson),
      audioJson: safeJson(existing.audioJson),
      scenesJson: safeJson(existing.scenesJson),
    },
  });

  return hydrateProductionPayload(copy);
}

function safeJson(value: unknown) {
  return value === null ? undefined : (value as Prisma.InputJsonValue);
}

export async function upsertAsset(userId: string, payload: { name: string; url: string; sizeBytes: number }) {
  return prisma.asset.create({
    data: {
      userId,
      name: payload.name,
      url: payload.url,
      sizeBytes: payload.sizeBytes,
      type: "LOGO",
    },
  });
}

export async function listAssets(userId: string) {
  return prisma.asset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function mergeBrief(existing: BriefData, patch: Partial<BriefData>) {
  return {
    ...existing,
    ...patch,
    characters: patch.characters ?? existing.characters,
    hashtags: patch.hashtags ?? existing.hashtags,
  };
}
