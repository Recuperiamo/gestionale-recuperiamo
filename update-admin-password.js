// update-admin-password.js
// Usage:
//  node update-admin-password.js "<password>"
//  or set env NEW_ADMIN_PASSWORD and run: node update-admin-password.js
// Requires: npm install @prisma/client bcryptjs

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  const newPassword = process.env.NEW_ADMIN_PASSWORD || arg;
  if (!newPassword) {
    console.error('ERROR: provide a password as argument or set NEW_ADMIN_PASSWORD env var.');
    console.error('Usage: node update-admin-password.js "<password>"');
    process.exit(1);
  }

  const email = 'r3cuperiamo@gmail.com';

  console.log('Generating hash for password: (hidden)');
  const hash = bcrypt.hashSync(newPassword, 10);
  console.log('Generated hash length:', hash.length);

  console.log('Verifying local compare (should be true):', bcrypt.compareSync(newPassword, hash));

  console.log('Updating user in DB with email:', email);
  try {
    const updated = await prisma.user.update({
      where: { email },
      data: { password: hash }
    });
    console.log('Update result: OK for user id', updated.id);
  } catch (err) {
    console.log('Update single failed, trying updateMany:', err.message);
    const updatedMany = await prisma.user.updateMany({
      where: { email },
      data: { password: hash }
    });
    console.log('updateMany result:', updatedMany);
    if (updatedMany.count === 0) {
      console.error('No user updated. Check that the email exists in the DB.');
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  console.log('Reading back hash from DB to verify');
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true }
  });

  if (!user) {
    console.error('User not found after update!');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Hash from DB length:', user.password.length);
  console.log('Hash hex (first 24 chars):', Buffer.from(user.password, 'utf8').toString('hex').slice(0, 24) + '...');
  console.log('Compare DB hash with password (sync):', bcrypt.compareSync(newPassword, user.password));
  const asyncRes = await bcrypt.compare(newPassword, user.password);
  console.log('Compare DB hash with password (async):', asyncRes);

  await prisma.$disconnect();

  if (asyncRes) {
    console.log('SUCCESS: password updated and verified in DB. Ora prova a fare login (copia/incolla la password).');
  } else {
    console.error("ERRORE: la compare con l'hash salvato in DB fallisce ancora. Incolla qui i log prodotti.");
    process.exit(1);
  }
}

main().catch(e => {
  console.error('ERROR', e);
  prisma.$disconnect();
  process.exit(1);
});