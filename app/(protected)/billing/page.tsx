import { downgradeToFreeAction, upgradeToProAction } from "@/app/(protected)/billing/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function BillingPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      plan: true,
      planExpiresAt: true,
    },
  });

  return (
    <section className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Billing e gating</div>
        <h1 className="mt-2 text-3xl font-bold">Plano atual: {user?.plan ?? "FREE"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Tela operacional para demonstracao de gating no MVP. O scaffold de Stripe permanece previsto, mas o
          checkout real nao e exigido nesta fase.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xl font-semibold">Free</div>
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
            <li>Ate 3 videos por mes</li>
            <li>Modo Cenas</li>
            <li>Sem avatar HeyGen</li>
          </ul>
          <form action={downgradeToFreeAction} className="mt-6">
            <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm" type="submit">
              Ativar Free
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-[var(--accent)] bg-[var(--accent-soft)] p-6">
          <div className="text-xl font-semibold">Pro</div>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>Videos ilimitados em modo demo</li>
            <li>Overlay de logo</li>
            <li>Modo Avatar PRO</li>
          </ul>
          <form action={upgradeToProAction} className="mt-6">
            <button className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white" type="submit">
              Ativar Pro demo
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-[var(--muted)]">
        Expira em: {user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleString("pt-BR") : "N/A"}
      </div>

      <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-[var(--muted)]">
        Integracao futura: checkout Stripe, webhook de confirmacao e reconciliacao automatica de plano continuam
        previstos, mas foram adiados do MVP para reduzir dependencia de secrets e operacao financeira nesta entrega.
      </div>
    </section>
  );
}
