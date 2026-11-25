import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import fs from 'fs';
import path from 'path';

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

// Drug Interaction Checker (เจาะลึกกลไกทางเภสัชวิทยา + ดึงรายละเอียดจริงจากฐานข้อมูล)
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

    const [med1, med2] = await Promise.all([
      prisma.medication.findUnique({ where: { id: String(med1Id) } }),
      prisma.medication.findUnique({ where: { id: String(med2Id) } }),
    ]);

    if (!med1 || !med2) {
      res.status(404).json({ message: 'ไม่พบข้อมูลยาในระบบ' });
      return;
    }

    type MedRecord = NonNullable<typeof med1>;

    type WarningGroup = {
      names?: string[];
      categories?: string[];
      anyOf?: string[];
      excludeNames?: string[];
    };

    type WarningGroupRef = string | WarningGroup;

    type WarningRule =
      | {
          kind: 'pair';
          status: 'danger' | 'warning';
          a: WarningGroupRef;
          b: WarningGroupRef;
          message: string;
        }
      | {
          kind: 'same';
          status: 'danger' | 'warning';
          group: WarningGroupRef;
          message: string;
        }
      | {
          kind: 'sameCategory';
          status: 'warning';
          categories: string[];
          message: string;
        };

    const matchName = (med: MedRecord, ...names: string[]) =>
      names.some((n) => {
        const keyword = n.toLowerCase();
        return (
          med.name.toLowerCase().includes(keyword) ||
          (med.genericName?.toLowerCase().includes(keyword) ?? false) ||
          (med.brandName?.toLowerCase().includes(keyword) ?? false)
        );
      });

    const matchCategory = (med: MedRecord, ...categories: string[]) =>
      categories.some((c) => med.category?.toLowerCase() === c.toLowerCase());

    // กฎปฏิกิริยาระหว่างยาถูกย้ายไปเก็บใน prisma/data/warnings.json เพื่อให้การตรวจสอบ
    // เป็นข้อมูล (data-driven) แก้ไขรายชื่อยา / ข้อความเตือนได้โดยไม่ต้องแตะโค้ดอีก (DRY)
    const warningsPath = path.join(__dirname, '..', '..', 'prisma', 'data', 'warnings.json');
    const warningsData = JSON.parse(
      fs.readFileSync(warningsPath, 'utf8')
    ) as { groups?: Record<string, WarningGroup>; rules: WarningRule[] };
    const groups = warningsData.groups ?? {};
    const rules = warningsData.rules;

    const matchGroupRef = (med: MedRecord, ref: WarningGroupRef): boolean => {
      const group = typeof ref === 'string' ? groups[ref] : ref;
      if (!group) return false;

      let matched = false;
      if (group.names?.length) {
        matched = matched || matchName(med, ...group.names);
      }
      if (group.categories?.length) {
        matched = matched || matchCategory(med, ...group.categories);
      }
      if (group.anyOf?.length) {
        matched =
          matched ||
          group.anyOf.some((name) => {
            const ref = groups[name];
            if (!ref) return false;
            return matchGroupRef(med, ref);
          });
      }
      if (matched && group.excludeNames?.length) {
        matched = !matchName(med, ...group.excludeNames);
      }
      return matched;
    };

    const matchRule = (rule: WarningRule): boolean => {
      switch (rule.kind) {
        case 'pair':
          return (
            (matchGroupRef(med1, rule.a) && matchGroupRef(med2, rule.b)) ||
            (matchGroupRef(med2, rule.a) && matchGroupRef(med1, rule.b))
          );
        case 'same':
          return matchGroupRef(med1, rule.group) && matchGroupRef(med2, rule.group);
        case 'sameCategory':
          if (!med1.category || !med2.category) return false;
          if (med1.category.toLowerCase() !== med2.category.toLowerCase()) return false;
          return rule.categories.some(
            (c) => c.toLowerCase() === med1.category!.toLowerCase()
          );
        default:
          return false;
      }
    };

    const fillMessage = (message: string): string =>
      message.replace('{med1}', med1.name).replace('{med2}', med2.name);

    // ประเมินกฎจาก warnings.json ตามลำดับ (danger ก่อน warning) จนกว่าจะเจอคู่ที่ตรงกัน
    for (const rule of rules) {
      if (matchRule(rule)) {
        let message = fillMessage(rule.message);
        if (rule.kind === 'sameCategory' && med1.category) {
          message = message.replace('{category}', med1.category);
        }
        res.json({ status: rule.status, message });
        return;
      }
    }

    // ตรวจสอบข้อมูลปฏิกิริยาที่บันทึกไว้ในฟิลด์ interactions ของยาทั้ง 100 รายการในฐานข้อมูล พร้อมดึงข้อความจริงมาแสดง
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

    // =========================================================================
    // ระดับที่ 3: SAFE (ไม่พบปฏิกิริยาที่มีนัยสำคัญทางคลินิก)
    // =========================================================================

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