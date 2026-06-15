import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
      <div className="mb-4 text-sm uppercase tracking-[0.3em] text-[var(--muted)]">
        Sprint 1 foundation
      </div>
      <h1 className="max-w-3xl text-5xl font-bold leading-tight">
        Sextou Viral Studio em Next.js com auth, banco e shell protegido.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
        Base pronta para o fluxo de briefing, roteiro, vozes e video nas proximas sprints.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white"
          href={session?.user ? "/dashboard" : "/login"}
        >
          {session?.user ? "Abrir dashboard" : "Entrar"}
        </Link>
        <Link
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold"
          href="/dashboard"
        >
          Testar rota protegida
        </Link>
      </div>
    </main>
  );
}
