import Link from "next/link";
import { redirect } from "next/navigation";
import { isGoogleAuthConfigured } from "@/lib/auth-flags";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  const googleEnabled = isGoogleAuthConfigured();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-20">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-2 text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Autenticacao</div>
        <h1 className="text-3xl font-bold">Entrar no Sextou Viral Studio</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Login por email/senha pronto para desenvolvimento. Google OAuth aparece apenas quando as credenciais estiverem configuradas.
        </p>
        <form
          action={async (formData) => {
            "use server";
            await signIn("credentials", {
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
              redirectTo: "/dashboard",
            });
          }}
          className="mt-8 space-y-4"
        >
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            name="email"
            placeholder="email@empresa.com"
            type="email"
          />
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            name="password"
            placeholder="Senha"
            type="password"
          />
          <button className="w-full rounded-2xl bg-[var(--accent)] px-5 py-3 font-semibold text-white" type="submit">
            Entrar com email
          </button>
        </form>
        {googleEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="mt-3"
          >
            <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold" type="submit">
              Entrar com Google
            </button>
          </form>
        ) : (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--muted)]">
            Google OAuth indisponivel ate configurar `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`.
          </div>
        )}
        <div className="mt-6 text-sm text-[var(--muted)]">
          Usuario seed de dev: <b>dev@sextou.local</b>
        </div>
        <Link className="mt-6 inline-block text-sm text-[var(--muted)] underline" href="/">
          Voltar para home
        </Link>
      </div>
    </main>
  );
}
