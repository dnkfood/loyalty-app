/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@loyalty.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'xKyCs2HuPzJ8Fnhz';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin';
const FORCE_RESET = process.env.SEED_ADMIN_RESET === 'true';

async function main() {
  const existing = await prisma.staffUser.findUnique({ where: { email: ADMIN_EMAIL } });
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existing && !FORCE_RESET) {
    console.log(`[seed] Admin ${ADMIN_EMAIL} already exists; leaving untouched.`);
    console.log('[seed] Set SEED_ADMIN_RESET=true to overwrite the password.');
    return;
  }

  if (existing && FORCE_RESET) {
    await prisma.staffUser.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: hash, isActive: true, role: 'SUPER_ADMIN' },
    });
    console.log(`[seed] Reset password for existing admin ${ADMIN_EMAIL}.`);
    return;
  }

  await prisma.staffUser.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: hash,
      name: ADMIN_NAME,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('========================================');
  console.log('  Admin user created');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('  Role:     SUPER_ADMIN');
  console.log('========================================');
  console.log('[seed] Change this password after first login.');
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
