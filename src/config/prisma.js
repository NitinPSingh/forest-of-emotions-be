const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});


prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});


process.on('beforeExit', async () => {R
  await prisma.$disconnect();
});

module.exports = prisma; 