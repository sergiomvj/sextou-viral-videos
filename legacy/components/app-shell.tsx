import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getPlanLabel(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  return user?.plan ?? "FREE";
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    return children;
  }

  const plan = await getPlanLabel(session.user.id);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link className="text-lg font-semibold tracking-tight" href="/dashboard">
              Sextou <span className="text-[var(--accent)]">Viral Studio</span>
            </Link>
            <nav className="hidden items-center gap-3 md:flex">
              <Link className="text-sm text-[var(--muted)] hover:text-white" href="/dashboard">
                Dashboard
              </Link>
              <Link className="text-sm text-[var(--muted)] hover:text-white" href="/studio/new">
                Studio
              </Link>
              <Link className="text-sm text-[var(--muted)] hover:text-white" href="/jobs">
                Jobs
              </Link>
              <Link className="text-sm text-[var(--muted)] hover:text-white" href="/billing">
                Billing
              </Link>
              <Link className="text-sm text-[var(--muted)] hover:text-white" href="/settings">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Plano {plan}
            </span>
            <div className="text-right">
              <div className="text-sm font-medium">{session.user.name ?? session.user.email}</div>
              <div className="text-xs text-[var(--muted)]">Shell autenticado</div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
