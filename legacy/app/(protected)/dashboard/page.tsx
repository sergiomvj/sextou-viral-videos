import Link from "next/link";
import { auth } from "@/lib/auth";
import { listProductions } from "@/lib/production";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const productions = await listProductions(session!.user.id);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { plan: true },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="mb-2 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Area protegida
        </div>
        <div className="flex gap-2">
          <Link className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white" href="/studio/new">
            Nova producao
          </Link>
          <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" href="/jobs">
            Jobs
          </Link>
          <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" href="/billing">
            Billing
          </Link>
        </div>
      </div>
      <h1 className="text-4xl font-bold">Sextou Viral Studio</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-[var(--muted)]">Plano</div>
          <div className="mt-2 text-xl font-semibold">{user?.plan ?? "FREE"}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-[var(--muted)]">Producoes</div>
          <div className="mt-2 text-xl font-semibold">{productions.length}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-[var(--muted)]">Modo PRO</div>
          <div className="mt-2 text-xl font-semibold">{user?.plan === "PRO" ? "Avatar liberado" : "Bloqueado"}</div>
        </div>
      </div>
      <div className="grid gap-4">
        {productions.length ? (
          productions.map((production) => (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6" key={production.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold">{production.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {production.status} · {production.mode} · fase {production.phase}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white" href={`/studio/${production.id}`}>
                    Abrir
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-[var(--muted)]">
            Nenhuma producao ainda. Crie a primeira para iniciar o fluxo de 4 fases.
          </div>
        )}
      </div>
    </section>
  );
}
