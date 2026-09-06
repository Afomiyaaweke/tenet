const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const total = await db.user.count();
  const users = await db.user.findMany({ select: { id:true, email:true, role:true, accountType:true } });
  console.log('TOTAL USERS:', total);
  console.log(JSON.stringify(users, null, 2));
  await db.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
