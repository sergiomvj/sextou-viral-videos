import Link from "next/link";
import { auth } from "@/lib/auth";
import { listProductions } from "@/lib/production";

export default async function JobsPage() {
  const session = await auth();
  const productions = await listProductions(session!.user.id);
  const jobs = productions.filter((production) => ["PROCESSING", "FAILED", "DONE"].includes(production.status));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Long running jobs</div>
          <h1 className="mt-2 text-3xl font-bold">Jobs ativos e concluídos</h1>
        </div>
        <Link className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" href="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>
      <div className="grid gap-4">
        {jobs.length ? (
          jobs.map((production) => (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6" key={production.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{production.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {production.status} · {production.mode} · Atualizado em{" "}
                    {new Date(production.updatedAt).toLocaleString("pt-BR")}
                  </div>
                </div>
                <Link className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white" href={`/studio/${production.id}`}>
                  Abrir
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-[var(--muted)]">
            Nenhum job em andamento ainda.
          </div>
        )}
      </div>
    </section>
  );
}
