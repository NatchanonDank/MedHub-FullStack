import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SeedMedication {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  category: string;
  prescriptionType?: string;
  specialTag?: string;
  dosageInstruction?: string;
  appearance?: string;
  indications: string[];
  sideEffects: string[];
  warnings: string[];
  interactions: string[];
  pregnancyCategory?: string;
  imageUrl?: string;
}

async function main() {
  console.log('Starting Final Project database seed...');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@medhub.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@medhub.com',
      name: 'Admin Pharmacist',
      password: 'admin1234',
      role: 'ADMIN',
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: { role: 'USER' },
    create: {
      email: 'test@test.com',
      name: 'Natchanon (User)',
      password: '1234',
      role: 'USER',
    },
  });

  console.log(`Seeded users: ${adminUser.email} (ADMIN) & ${demoUser.email} (USER)`);

  const jsonPath = path.resolve(__dirname, './data/medications.json');
  const extraJsonPath = path.resolve(__dirname, './data/medications_extra.json');

  const baseMedications: SeedMedication[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const extraMedications: SeedMedication[] = fs.existsSync(extraJsonPath)
    ? JSON.parse(fs.readFileSync(extraJsonPath, 'utf-8'))
    : [];

  const medications: SeedMedication[] = [...baseMedications, ...extraMedications];

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

  const rulesJsonPath = path.resolve(__dirname, './data/interaction_rules.json');
  if (fs.existsSync(rulesJsonPath)) {
    const rawData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
    const rulesList = Array.isArray(rawData) ? rawData : rawData.rules || rawData.data || [];

    let seededRuleCount = 0;
    for (const item of rulesList) {
      const ruleName = item.ruleName || item.rule_name || item.name;
      const drugAGroup = item.drugAGroup || item.drug_a_group || item.drugA;
      const drugBGroup = item.drugBGroup || item.drug_b_group || item.drugB;
      const excludeA = item.excludeA || item.exclude_a || [];
      const excludeB = item.excludeB || item.exclude_b || [];
      const severity = item.severity;
      const message = item.message;

      if (!ruleName || !Array.isArray(drugAGroup) || !Array.isArray(drugBGroup) || !severity || !message) {
        continue;
      }

      await prisma.drugInteractionRule.upsert({
        where: { ruleName: String(ruleName).trim() },
        update: {
          drugAGroup,
          drugBGroup,
          excludeA: Array.isArray(excludeA) ? excludeA : [],
          excludeB: Array.isArray(excludeB) ? excludeB : [],
          severity: String(severity).toUpperCase().trim(),
          message: String(message).trim(),
        },
        create: {
          ruleName: String(ruleName).trim(),
          drugAGroup,
          drugBGroup,
          excludeA: Array.isArray(excludeA) ? excludeA : [],
          excludeB: Array.isArray(excludeB) ? excludeB : [],
          severity: String(severity).toUpperCase().trim(),
          message: String(message).trim(),
        },
      });
      seededRuleCount++;
    }
    console.log(`Seeded ${seededRuleCount} drug interaction rules successfully.`);
  }

  const existingReports = await prisma.symptomReport.count();
  if (existingReports === 0) {
    await prisma.symptomReport.createMany({
      data: [
        {
          userId: demoUser.id,
          medicationId: 'med_027',
          symptom: 'แสบท้องและคลื่นไส้หลังรับประทาน',
          severity: 'MODERATE',
          description: 'ทานยาหลังอาหารเช้าประมาณ 30 นาที มีอาการปวดแสบลิ้นปี่',
          status: 'REVIEWED',
          adminNote: 'แนะนำให้ทานยาพร้อมอาหารคำสุดท้ายและดื่มน้ำตามมากๆ หากไม่ดีขึ้นควรพบแพทย์เพื่อปรับยา',
        },
        {
          userId: demoUser.id,
          medicationId: 'med_013',
          symptom: 'ง่วงซึมและปากแห้งเล็กน้อย',
          severity: 'MILD',
          description: 'ทานแก้แพ้อากาศช่วงเช้าแล้วมีอาการง่วงระหว่างทำงาน',
          status: 'PENDING',
          adminNote: '',
        },
      ],
    });
    console.log('Seeded initial community symptom reports.');
  }
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