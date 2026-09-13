import { PrismaClient } from '@prisma/client';

const candidateUrls: string[] = [];
const ports = [5432, 5433];
const users = ['postgres', 'Atharva'];
const passwords = [
  '',
  'postgres',
  'admin',
  'root',
  'password',
  'password123',
  '123456',
  '12345678',
  'admin123',
  'postgres123',
  'root123',
  '1234',
  'Postgres',
  'Postgres123',
  'Atharva',
];

for (const port of ports) {
  for (const user of users) {
    for (const pw of passwords) {
      if (pw === '') {
        candidateUrls.push(`postgresql://${user}@localhost:${port}/postgres`);
      } else {
        candidateUrls.push(`postgresql://${user}:${pw}@localhost:${port}/postgres`);
      }
    }
  }
}

async function testConnection(url: string): Promise<boolean> {
  const cleanUrl = url.replace(/:[^:@]+@/, ':****@');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
  try {
    await prisma.$connect();
    await prisma.$executeRawUnsafe('SELECT 1');
    await prisma.$disconnect();
    console.log(`SUCCESS: ${cleanUrl}`);
    return true;
  } catch (err: any) {
    // console.log(`Failed: ${cleanUrl} -> ${err.message.substring(0, 50)}...`);
    await prisma.$disconnect();
    return false;
  }
}

async function run() {
  console.log(`Testing ${candidateUrls.length} connection combinations...`);
  for (const url of candidateUrls) {
    const success = await testConnection(url);
    if (success) {
      console.log(`\nFound working database URL: ${url}`);
      console.log(`Please update DATABASE_URL in .env to match this pattern.`);
      return;
    }
  }
  console.log('\nCould not connect to PostgreSQL with any candidate URL.');
}

run();
