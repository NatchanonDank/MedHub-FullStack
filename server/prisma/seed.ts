import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  // 1. สร้าง User ตัวอย่างสำหรับทดสอบ Login
  const demoUser = await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: {
      email: 'test@test.com',
      name: 'Test',
      password: '1234',
    },
  });
  console.log(`Seeded user: ${demoUser.email} (password: 1234)`);

  // 2. ดึงยาตัวอย่าง 2 ตัวแรกที่มีอยู่แล้วใน Supabase มาเพิ่มลงกระเป๋ายา
  const sampleMeds = await prisma.medication.findMany({ take: 2 });

  for (const med of sampleMeds) {
    await prisma.myKitItem.upsert({
      where: {
        userId_medicationId: {
          userId: demoUser.id,
          medicationId: med.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        medicationId: med.id,
        note: `บันทึกช่วยจำสำหรับ ${med.name}`,
      },
    });
  }

  console.log(`Seeded ${sampleMeds.length} MyKit items from existing Supabase data.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });