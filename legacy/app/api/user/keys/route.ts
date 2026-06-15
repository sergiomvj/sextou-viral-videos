import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      orKeyEnc: true,
      heygenKeyEnc: true,
    },
  });

  return NextResponse.json({
    openRouterConfigured: Boolean(user?.orKeyEnc),
    heygenConfigured: Boolean(user?.heygenKeyEnc),
    serverSideProbe: Boolean(decryptSecret(user?.orKeyEnc) || decryptSecret(user?.heygenKeyEnc)),
  });
}
