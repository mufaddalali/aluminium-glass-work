import "dotenv/config";
import { prisma } from "../src/server/db/prisma";
import { hashPassword } from "../src/server/auth/password";
import { ensureSettings } from "../src/server/services/settings.service";

const categories = [
  "Glass",
  "Aluminum profiles",
  "Hardware and accessories",
  "Mirrors",
  "Other materials",
  "Services",
];

async function main() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? "";
  const name = process.env.SEED_OWNER_NAME?.trim() || "Shop Owner";
  if (!email || !password) {
    throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD before seeding.");
  }
  if (password.length < 10) {
    throw new Error("SEED_OWNER_PASSWORD must be at least 10 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "OWNER",
        isActive: true,
      },
    });
  }

  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: { name: category },
      update: { isActive: true },
      create: { name: category },
    });
  }

  await ensureSettings();
  console.log("Seed completed.");
}

main()
  .catch(() => {
    console.error("Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
