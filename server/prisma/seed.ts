import 'dotenv/config';
import fs from 'fs';
import path from 'path';
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
    where: { email: 'natchanon@medhub.com' },
    update: {},
    create: {
      email: 'natchanon@medhub.com',
      name: 'Natchanon',
      password: '1234',
    },
  });
  console.log(`Seeded user: ${demoUser.email} (password: 1234)`);

  // 2. อ่านข้อมูลยาจากไฟล์ JSON เดิมของฝั่ง client
  const jsonPath = path.resolve(__dirname, '../../client/public/api/mock-medications.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const medications = JSON.parse(rawData);

  for (const med of medications) {
    await prisma.medication.upsert({
      where: { id: med.id },
      update: {
        name: med.name,
        genericName: med.genericName || med.name,
        brandName: med.brandName || null,
        strength: med.strength || null,
        dosageForm: med.dosageForm || null,
        category: med.category || 'General',
        prescriptionType: med.prescriptionType || null,
        specialTag: med.specialTag || null,
        dosageInstruction: med.dosageInstruction || null,
        appearance: med.appearance || null,
        indications: Array.isArray(med.indications) ? med.indications : [],
        sideEffects: Array.isArray(med.sideEffects) ? med.sideEffects : [],
        warnings: Array.isArray(med.warnings) ? med.warnings : [],
        interactions: Array.isArray(med.interactions) ? med.interactions : [],
        pregnancyCategory: med.pregnancyCategory || null,
        imageUrl: med.imageUrl || null,
      },
      create: {
        id: med.id,
        name: med.name,
        genericName: med.genericName || med.name,
        brandName: med.brandName || null,
        strength: med.strength || null,
        dosageForm: med.dosageForm || null,
        category: med.category || 'General',
        prescriptionType: med.prescriptionType || null,
        specialTag: med.specialTag || null,
        dosageInstruction: med.dosageInstruction || null,
        appearance: med.appearance || null,
        indications: Array.isArray(med.indications) ? med.indications : [],
        sideEffects: Array.isArray(med.sideEffects) ? med.sideEffects : [],
        warnings: Array.isArray(med.warnings) ? med.warnings : [],
        interactions: Array.isArray(med.interactions) ? med.interactions : [],
        pregnancyCategory: med.pregnancyCategory || null,
        imageUrl: med.imageUrl || null,
      },
    });
  }

  console.log(`Seeded ${medications.length} medications successfully.`);

  // 3. เพิ่มยาตัวอย่าง 2 รายการลงกระเป๋ายาของ Demo User
  await prisma.myKitItem.upsert({
    where: {
      userId_medicationId: {
        userId: demoUser.id,
        medicationId: 'med_013', // Cetirizine
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      medicationId: 'med_013',
      note: 'ทาน 1 เม็ดเวลาแพ้อากาศ',
    },
  });

  await prisma.myKitItem.upsert({
    where: {
      userId_medicationId: {
        userId: demoUser.id,
        medicationId: 'med_027', // Ibuprofen
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      medicationId: 'med_027',
      note: 'ทานหลังอาหารทันทีเวลาปวดกล้ามเนื้อ',
    },
  });

  console.log('Seeded initial MyKit items for demo user.');
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