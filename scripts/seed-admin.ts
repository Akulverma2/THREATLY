import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "ndagranth@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "threatly@#$123";
  const name = process.env.ADMIN_NAME || "System Admin";

  console.log(`Seeding admin user: ${email}...`);
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash, status: "ACTIVE" },
    create: { name, email, passwordHash, role: "ADMIN", status: "ACTIVE" },
  });

  console.log(`✅ Admin user ready: ID=${admin.id}, Email=${admin.email}, Role=${admin.role}`);
}

main()
  .catch((e) => {
    console.error("❌ Admin seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
