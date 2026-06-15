"use server";

import { auth } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export type SecretActionState = {
  message: string;
};

export async function saveSecretsAction(
  _prevState: SecretActionState,
  formData: FormData,
): Promise<SecretActionState> {
  const session = await auth();
  if (!session?.user) {
    return { message: "Sessao invalida." };
  }

  const openRouterKey = String(formData.get("openRouterKey") ?? "").trim();
  const heygenKey = String(formData.get("heygenKey") ?? "").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(openRouterKey ? { orKeyEnc: encryptSecret(openRouterKey) } : {}),
      ...(heygenKey ? { heygenKeyEnc: encryptSecret(heygenKey) } : {}),
    },
  });

  return { message: "Credenciais salvas com criptografia no servidor." };
}
