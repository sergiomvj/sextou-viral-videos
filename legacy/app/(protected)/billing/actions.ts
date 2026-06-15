"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// MVP note:
// These actions implement an internal plan toggle so the team can validate
// server-side gating before Stripe checkout and webhook flows are enabled.
// When Stripe is introduced, these actions should be replaced or invoked only
// from trusted post-payment reconciliation paths.
export async function upgradeToProAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      plan: "PRO",
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function downgradeToFreeAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      plan: "FREE",
      planExpiresAt: null,
    },
  });
}
