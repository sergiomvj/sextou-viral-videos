import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const email = "dev@sextou.local";
  const passwordHash = await bcrypt.hash("Dev12345!", 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: "Sextou Dev",
      plan: "FREE",
    },
    create: {
      email,
      name: "Sextou Dev",
      passwordHash,
      plan: "FREE",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
