import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Root & Health Check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'MedHub Final Project API is running on Vercel',
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'MedHub Final Project API is running' });
});

// Authentication (พร้อม Role: USER / ADMIN)
app.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: String(email).trim() } });
    if (existingUser) {
      res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: String(email).trim(),
        name: name ? String(name).trim() : String(email).split('@')[0],
        password: String(password),
        role: 'USER',
      },
      select: { id: true, email: true, name: true, role: true },
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim() },
    });

    if (!user || user.password !== String(password)) {
      res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Medications Full CRUD (Public Read + Admin C/U/D)
app.get('/api/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, sort } = req.query;

    const where: Record<string, unknown> = {};
    if (category && typeof category === 'string') {
      where.category = category;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { specialTag: { contains: search, mode: 'insensitive' } },
      ];
    }

    const medications = await prisma.medication.findMany({
      where,
      orderBy: {
        name: sort === 'Z-A' ? 'desc' : 'asc',
      },
    });

    res.json({
      count: medications.length,
      results: medications,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/medications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medication = await prisma.medication.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!medication) {
      res.status(404).json({ message: `ไม่พบข้อมูลยารหัส ${req.params.id}` });
      return;
    }

    res.json(medication);
  } catch (err) {
    next(err);
  }
});

// CREATE: เพิ่มยาใหม่เข้าระบบ
app.post('/api/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      genericName,
      brandName,
      strength,
      dosageForm,
      category,
      prescriptionType,
      specialTag,
      dosageInstruction,
      appearance,
      indications,
      sideEffects,
      warnings,
      interactions,
      pregnancyCategory,
      imageUrl,
    } = req.body;

    if (!name || !genericName || !category) {
      res.status(400).json({ message: 'กรุณากรอกชื่อยา ชื่อสามัญ และหมวดหมู่ให้ครบถ้วน' });
      return;
    }

    const generatedId = `med_${Date.now().toString().slice(-5)}`;

    const created = await prisma.medication.create({
      data: {
        id: generatedId,
        name: String(name).trim(),
        genericName: String(genericName).trim(),
        brandName: brandName || 'Generic',
        strength: strength || '',
        dosageForm: dosageForm || 'Tablet',
        category: String(category).trim(),
        prescriptionType: prescriptionType || 'Rx',
        specialTag: specialTag || '',
        dosageInstruction: dosageInstruction || '',
        appearance: appearance || '',
        indications: Array.isArray(indications) ? indications : [],
        sideEffects: Array.isArray(sideEffects) ? sideEffects : [],
        warnings: Array.isArray(warnings) ? warnings : [],
        interactions: Array.isArray(interactions) ? interactions : [],
        pregnancyCategory: pregnancyCategory || 'C',
        imageUrl: imageUrl || '/icon.png',
      },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// UPDATE: แก้ไขข้อมูลยา
app.put('/api/medications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      genericName,
      brandName,
      strength,
      dosageForm,
      category,
      prescriptionType,
      specialTag,
      dosageInstruction,
      appearance,
      indications,
      sideEffects,
      warnings,
      interactions,
      pregnancyCategory,
      imageUrl,
    } = req.body;

    const updated = await prisma.medication.update({
      where: { id },
      data: {
        name,
        genericName,
        brandName,
        strength,
        dosageForm,
        category,
        prescriptionType,
        specialTag,
        dosageInstruction,
        appearance,
        indications: Array.isArray(indications) ? indications : undefined,
        sideEffects: Array.isArray(sideEffects) ? sideEffects : undefined,
        warnings: Array.isArray(warnings) ? warnings : undefined,
        interactions: Array.isArray(interactions) ? interactions : undefined,
        pregnancyCategory,
        imageUrl,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE: ลบยาออกจากฐานข้อมูล
app.delete('/api/medications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.medication.delete({ where: { id } });
    res.json({ message: 'ลบข้อมูลยาเรียบร้อยแล้ว', id });
  } catch (err) {
    next(err);
  }
});

// Drug Interaction Rules CRUD (ดึงและจัดการกฎปฏิกิริยาระหว่างยาจาก Supabase)
app.get('/api/interaction-rules', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.drugInteractionRule.findMany({
      orderBy: [{ severity: 'asc' }, { id: 'asc' }],
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

app.post('/api/interaction-rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ruleName, drugAGroup, drugBGroup, excludeA, excludeB, severity, message } = req.body;
    if (!ruleName || !Array.isArray(drugAGroup) || !Array.isArray(drugBGroup) || !severity || !message) {
      res.status(400).json({ message: 'กรุณากรอกข้อมูลกฎปฏิกิริยาระหว่างยาให้ครบถ้วน' });
      return;
    }

    const created = await prisma.drugInteractionRule.create({
      data: {
        ruleName: String(ruleName).trim(),
        drugAGroup,
        drugBGroup,
        excludeA: Array.isArray(excludeA) ? excludeA : [],
        excludeB: Array.isArray(excludeB) ? excludeB : [],
        severity: String(severity).toUpperCase(),
        message: String(message).trim(),
      },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/interaction-rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await prisma.drugInteractionRule.delete({ where: { id } });
    res.json({ message: 'ลบกฎปฏิกิริยาระหว่างยาเรียบร้อยแล้ว', id });
  } catch (err) {
    next(err);
  }
});


// Drug Interaction Checker (ประมวลผลจากตาราง DrugInteractionRule ใน Supabase)

app.post('/api/interactions/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { med1Id, med2Id } = req.body;
    if (!med1Id || !med2Id) {
      res.status(400).json({ message: 'กรุณาระบุยาทั้ง 2 ชนิด' });
      return;
    }
    if (med1Id === med2Id) {
      res.json({
        status: 'warning',
        message: 'คุณเลือกยาทั้งสองชนิดซ้ำกัน กรุณาเลือกยาที่แตกต่างกันเพื่อตรวจสอบ',
      });
      return;
    }

    const [med1, med2, rules] = await Promise.all([
      prisma.medication.findUnique({ where: { id: String(med1Id) } }),
      prisma.medication.findUnique({ where: { id: String(med2Id) } }),
      prisma.drugInteractionRule.findMany({
        orderBy: [{ severity: 'asc' }, { id: 'asc' }], // เรียง "DANGER" ขึ้นก่อน "WARNING" เสมอ
      }),
    ]);

    if (!med1 || !med2) {
      res.status(404).json({ message: 'ไม่พบข้อมูลยาในระบบ' });
      return;
    }

    type MedRecord = NonNullable<typeof med1>;

    // ฟังก์ชันตรวจสอบว่ายาตรงกับกลุ่มคำค้นหา (ชื่อยา / ชื่อสามัญ / ชื่อการค้า / หมวดหมู่) และไม่อยู่ในข้อยกเว้น
    const matchesGroup = (med: MedRecord, groupTerms: string[], excludeTerms: string[]) => {
      const searchableFields = [med.name, med.genericName, med.brandName, med.category]
        .filter((val): val is string => Boolean(val && val.trim().length > 0))
        .map((val) => val.toLowerCase().trim());

      const isExcluded = excludeTerms.some((ex) => {
        const kw = ex.toLowerCase().trim();
        return kw.length > 0 && searchableFields.some((field) => field.includes(kw));
      });

      if (isExcluded) return false;

      return groupTerms.some((term) => {
        const kw = term.toLowerCase().trim();
        return kw.length > 0 && searchableFields.some((field) => field.includes(kw));
      });
    };

    // 1. วนเช็กกฎทั้งหมดจากตาราง DrugInteractionRule ใน Supabase (DANGER -> WARNING)
    for (const rule of rules) {
      const forwardMatch =
        matchesGroup(med1, rule.drugAGroup, rule.excludeA) &&
        matchesGroup(med2, rule.drugBGroup, rule.excludeB);

      const reverseMatch =
        matchesGroup(med2, rule.drugAGroup, rule.excludeA) &&
        matchesGroup(med1, rule.drugBGroup, rule.excludeB);

      if (forwardMatch || reverseMatch) {
        res.json({
          status: rule.severity.toLowerCase() === 'danger' ? 'danger' : 'warning',
          ruleName: rule.ruleName,
          message: rule.message,
        });
        return;
      }
    }

    // 2. เช็กหมวดหมู่ซ้ำซ้อนที่ควรระวังการเสริมฤทธิ์
    if (
      med1.category &&
      med2.category &&
      med1.category === med2.category &&
      ['Cardiovascular', 'Psychiatric', 'Antidiabetic', 'Antihistamine'].includes(med1.category)
    ) {
      res.json({
        status: 'warning',
        message: `เฝ้าระวัง: ยาทั้งสองชนิดอยู่ในหมวดหมู่ ${med1.category} เหมือนกัน อาจเกิดการเสริมฤทธิ์หรือผลข้างเคียงซ้ำซ้อน (เช่น ความดันต่ำเกินไป หรือน้ำตาลในเลือดต่ำ) ควรใช้ภายใต้คำสั่งแพทย์`,
      });
      return;
    }

    // 3. เช็กข้อมูลปฏิกิริยารายตัวที่บันทึกไว้ในคอลัมน์ interactions ของตาราง Medication
    const findDatabaseInteractionDetails = (sourceMed: MedRecord, targetMed: MedRecord): string[] => {
      if (!Array.isArray(sourceMed.interactions) || sourceMed.interactions.length === 0) {
        return [];
      }

      const targetKeywords = [targetMed.name, targetMed.genericName, targetMed.brandName]
        .filter((val): val is string => Boolean(val && val.trim().length > 2))
        .map((val) => val.toLowerCase().trim());

      return sourceMed.interactions.filter((item) =>
        targetKeywords.some((kw) => item.toLowerCase().includes(kw))
      );
    };

    const dbMatchesFromMed1 = findDatabaseInteractionDetails(med1, med2);
    const dbMatchesFromMed2 = findDatabaseInteractionDetails(med2, med1);
    const allDbDetails = Array.from(new Set([...dbMatchesFromMed1, ...dbMatchesFromMed2]));

    if (allDbDetails.length > 0) {
      res.json({
        status: 'warning',
        message: `เฝ้าระวัง: พบข้อมูลปฏิกิริยาระหว่างยา ${med1.name} และ ${med2.name} ในฐานข้อมูล (${allDbDetails.join(' | ')}) โปรดปรึกษาแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน`,
      });
      return;
    }

    // 4. ไม่พบปฏิกิริยาระหว่างยา
    res.json({
      status: 'safe',
      message: `ปลอดภัย: ไม่พบปฏิกิริยารุนแรงระหว่าง ${med1.name} และ ${med2.name} ในระบบเบื้องต้น (ควรรับประทานตามขนาดและวิธีใช้ที่ระบุบนฉลากยา)`,
    });
  } catch (err) {
    next(err);
  }
});

// Personal Collection (My Kit CRUD)
app.get('/api/my-kit/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    const items = await prisma.myKitItem.findMany({
      where: { userId },
      include: { medication: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

app.post('/api/my-kit/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, medicationId, note } = req.body;
    const uid = Number(userId);

    const existing = await prisma.myKitItem.findUnique({
      where: { userId_medicationId: { userId: uid, medicationId: String(medicationId) } },
    });

    if (existing) {
      await prisma.myKitItem.delete({ where: { id: existing.id } });
      res.json({ action: 'removed', medicationId });
      return;
    }

    const created = await prisma.myKitItem.create({
      data: { userId: uid, medicationId: String(medicationId), note: note || '' },
      include: { medication: true },
    });
    res.status(201).json({ action: 'added', item: created });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/my-kit/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = Number(req.params.itemId);
    const { note } = req.body;
    const updated = await prisma.myKitItem.update({
      where: { id: itemId },
      data: { note: String(note ?? '') },
      include: { medication: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/my-kit/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    await prisma.myKitItem.deleteMany({ where: { userId } });
    res.json({ message: 'ล้างกระเป๋ายาเรียบร้อยแล้ว' });
  } catch (err) {
    next(err);
  }
});

// Adverse Symptom Reports Full CRUD (User & Admin)
app.get('/api/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.query;
    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = Number(userId);
    }

    const reports = await prisma.symptomReport.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        medication: { select: { id: true, name: true, genericName: true, category: true, imageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (err) {
    next(err);
  }
});

app.post('/api/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, medicationId, symptom, severity, description } = req.body;

    if (!userId || !medicationId || !symptom) {
      res.status(400).json({ message: 'กรุณาเลือกตัวยาและระบุอาการที่พบ' });
      return;
    }

    const created = await prisma.symptomReport.create({
      data: {
        userId: Number(userId),
        medicationId: String(medicationId),
        symptom: String(symptom).trim(),
        severity: severity || 'MILD',
        description: description ? String(description).trim() : '',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        medication: { select: { id: true, name: true, genericName: true, category: true, imageUrl: true } },
      },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

app.put('/api/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { medicationId, symptom, severity, description, status, adminNote } = req.body;

    const data: Record<string, unknown> = {};
    if (medicationId !== undefined) data.medicationId = String(medicationId);
    if (symptom !== undefined) data.symptom = String(symptom).trim();
    if (severity !== undefined) data.severity = severity;
    if (description !== undefined) data.description = String(description).trim();
    if (status !== undefined) data.status = status;
    if (adminNote !== undefined) data.adminNote = String(adminNote).trim();

    const updated = await prisma.symptomReport.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        medication: { select: { id: true, name: true, genericName: true, category: true, imageUrl: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await prisma.symptomReport.delete({ where: { id } });
    res.json({ message: 'ลบรายงานอาการเรียบร้อยแล้ว', id });
  } catch (err) {
    next(err);
  }
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({
    message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  });
});

// รัน Listen เฉพาะตอนพัฒนาบนเครื่อง Local
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`MedHub Server running on http://localhost:${PORT}`);
  });
}

// Export Express App สำหรับ Vercel
export default app;