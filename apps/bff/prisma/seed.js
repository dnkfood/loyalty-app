const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generatePassword(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

async function main() {
  const existing = await prisma.staffUser.findUnique({
    where: { email: 'admin@loyalty.local' },
  });

  if (existing) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  const password = generatePassword(16);
  const hash = await bcrypt.hash(password, 10);

  await prisma.staffUser.create({
    data: {
      email: 'admin@loyalty.local',
      passwordHash: hash,
      name: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('========================================');
  console.log('  Admin user created');
  console.log('  Email:    admin@loyalty.local');
  console.log('  Password: ' + password);
  console.log('  Role:     SUPER_ADMIN');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
