"use client";

import { useActionState } from "react";
import { saveSecretsAction, type SecretActionState } from "@/server/actions/save-secrets";

const initialState: SecretActionState = {
  message: "",
};

export function SecretForm({
  hasOpenRouter,
  hasHeygen,
}: {
  hasOpenRouter: boolean;
  hasHeygen: boolean;
}) {
  const [state, action, pending] = useActionState(saveSecretsAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">OpenRouter</label>
        <input
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          name="openRouterKey"
          placeholder={hasOpenRouter ? "Chave cadastrada no servidor" : "sk-or-v1-..."}
          type="password"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">HeyGen</label>
        <input
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
          name="heygenKey"
          placeholder={hasHeygen ? "Chave cadastrada no servidor" : "heygen_..."}
          type="password"
        />
      </div>
      <button
        className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : "Salvar credenciais"}
      </button>
      <div className="text-sm text-[var(--muted)]">{state.message}</div>
    </form>
  );
}
