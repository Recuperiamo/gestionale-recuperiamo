// Requires: npm install @prisma/client bcryptjs
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'r3cuperiamo@gmail.com';
  console.log('FETCHING USER FOR EMAIL:', email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true }
  });
  console.log('USER FROM DB:', user ? { id: user.id, email: user.email } : null);
  if (!user) {
    console.error('No user found');
    process.exit(1);
  }
  const hash = user.password;
  console.log('HASH RAW:', hash);
  console.log('HASH JSON:', JSON.stringify(hash));
  console.log('HASH LENGTH:', hash.length);
  console.log('HASH HEX:', Buffer.from(hash, 'utf8').toString('hex'));
  const pwd = 'TestCopilot2025!';
  console.log('ATTEMPT PASSWORD:', pwd);
  console.log('ATTEMPT JSON:', JSON.stringify(pwd));
  console.log('ATTEMPT LENGTH:', pwd.length);
  console.log('ATTEMPT HEX:', Buffer.from(pwd, 'utf8').toString('hex'));
  try {
    const sync = bcrypt.compareSync(pwd, hash);
    console.log('COMPARE SYNC:', sync);
  } catch (err) {
    console.error('COMPARE SYNC ERROR', err);
  }
  try {
    const asyncRes = await bcrypt.compare(pwd, hash);
    console.log('COMPARE ASYNC:', asyncRes);
  } catch (err) {
    console.error('COMPARE ASYNC ERROR', err);
  }
  await prisma.$disconnect();
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});