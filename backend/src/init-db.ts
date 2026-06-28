import { PrismaClient } from '@prisma/client';

async function ensureDatabaseExists() {
  const url = process.env.DATABASE_URL!;
  // Extract DB name from URL: everything after the last /
  const lastSlash = url.lastIndexOf('/');
  const dbName = url.substring(lastSlash + 1).split('?')[0];

  // Build postgres URL (connect to default postgres DB)
  const postgresUrl = url.substring(0, lastSlash);

  try {
    const prisma = new PrismaClient({ datasources: { db: { url: postgresUrl } } });

    const result = await prisma.$queryRawUnsafe(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '${dbName}')`
    ) as [{ exists: boolean }];

    if (!result[0].exists) {
      console.log(`Database "${dbName}" not found. Creating...`);
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created.`);
    } else {
      console.log(`Database "${dbName}" exists.`);
    }

    await prisma.$disconnect();
  } catch (err: any) {
    console.warn(`DB init warning: ${err.message}`);
  }
}

ensureDatabaseExists().catch(console.error);
