import bcrypt from 'bcrypt';
import prisma from '../prisma/client';

const roles = ['OWNER', 'MANAGER', 'CREW'] as const;

async function main() {
  console.log('Seeding database...');

  const ownerPassword = await bcrypt.hash('owner123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const crewPassword = await bcrypt.hash('crew123', 10);

  await prisma.user.create({
    data: {
      name: 'John Owner',
      email: 'owner@construction.com',
      password: ownerPassword,
      role: 'OWNER',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Sarah Manager',
      email: 'manager@construction.com',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Mike Crew',
      email: 'crew@construction.com',
      password: crewPassword,
      role: 'CREW',
    },
  });

  console.log('Users seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
