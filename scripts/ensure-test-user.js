// scripts/ensure-test-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_EMAIL || 'vcopilot@vercel.com';
  const password = process.env.TEST_PASSWORD || 'Iq#7pBggdS-x7J$a8Vnx';

  if (!email || !password) {
    console.error('TEST_EMAIL and TEST_PASSWORD environment variables are required.');
    process.exit(1);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      // Step 1: Ensure the 'cliente' role exists.
      const clienteRole = await tx.role.upsert({
        where: { name: 'cliente' },
        update: {},
        create: { name: 'cliente' },
      });
      console.log("'cliente' role is available.");

      // Step 2: Upsert the User.
      const user = await tx.user.upsert({
        where: { email },
        update: {
          password: hashedPassword,
        },
        create: {
          email,
          password: hashedPassword,
          name: 'VCopilot',
          roleId: clienteRole.id,
        },
      });
      console.log('Test user ensured:', user);

      // Step 3: Find or create the Client profile.
      // 'email' is not a unique field on Client, so we can't upsert directly.
      let client = await tx.client.findFirst({
        where: { email },
      });

      if (client) {
        console.log('Found existing client profile:', client);
      } else {
        client = await tx.client.create({
          data: {
            nomeReferente: 'VCopilot',
            email: email,
          },
        });
        console.log('Created new client profile:', client);
      }
    });

    console.log('Transaction successful. Test user and client profile are ready.');

  } catch (error) {
    console.error('Error ensuring test user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
