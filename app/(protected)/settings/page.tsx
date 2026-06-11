import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SecretForm } from "@/components/secret-form";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      email: true,
      orKeyEnc: true,
      heygenKeyEnc: true,
    },
  });

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="mb-2 text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Credenciais
        </div>
        <h1 className="text-3xl font-bold">Configurar chaves do usuario</h1>
        <p className="mt-3 text-[var(--muted)]">
          As chaves sao criptografadas no servidor e nunca retornam completas ao client.
        </p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 text-sm text-[var(--muted)]">Usuario: {user?.email}</div>
        <SecretForm
          hasHeygen={Boolean(user?.heygenKeyEnc)}
          hasOpenRouter={Boolean(user?.orKeyEnc)}
        />
      </div>
    </section>
  );
}
