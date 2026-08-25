const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "No SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD provided. Skipping super admin creation."
    );
    return;
  }

  if (password.length < 12) {
    console.warn("SEED_ADMIN_PASSWORD must be at least 12 characters. Skipping.");
    return;
  }

  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Default Agency",
        slug: "default",
        subdomain: "default",
        brandName: "Study Abroad Platform",
      },
    });
    console.log("Created default tenant");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      firstName: "Super",
      lastName: "Admin",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      tenantId: tenant.id,
    },
  });

  console.log("Super admin created:");
  console.log(`  Email:    ${email}`);
  console.log(`  Role:     SUPER_ADMIN`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
