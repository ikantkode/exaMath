import prisma from '../prisma/client';

async function main() {
  console.log('Database ready. No seed data — create your admin account on first launch.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
