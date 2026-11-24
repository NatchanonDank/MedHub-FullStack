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

// Drug Interaction Checker
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

    const matchName = (med: MedRecord, ...names: string[]) =>
      names.some(
        (n) =>
          med.name.includes(n) ||
          med.genericName?.includes(n) ||
          (med.brandName && med.brandName.includes(n))
      );

    const isNSAID = (med: MedRecord) => med.category === 'NSAID';
    const isBloodThinner = (med: MedRecord) =>
      matchName(med, 'Warfarin', 'Apixaban', 'Clopidogrel', 'Enoxaparin', 'Aspirin') ||
      med.category === 'Anticoagulant';
    const isSSRI = (med: MedRecord) => matchName(med, 'Sertraline', 'Escitalopram', 'Fluoxetine');
    const isTramadol = (med: MedRecord) => matchName(med, 'Tramadol');
    const isStatin = (med: MedRecord) => matchName(med, 'Atorvastatin', 'Rosuvastatin', 'Simvastatin');
    const isFluconazole = (med: MedRecord) => matchName(med, 'Fluconazole');
    const isWarfarin = (med: MedRecord) => matchName(med, 'Warfarin');
    const isDigoxin = (med: MedRecord) => matchName(med, 'Digoxin');
    const isDiuretic = (med: MedRecord) =>
      med.category === 'Cardiovascular' && matchName(med, 'Furosemide', 'Hydrochlorothiazide');
    const isPotassiumSparing = (med: MedRecord) => matchName(med, 'Spironolactone');
    const isAceArb = (med: MedRecord) => matchName(med, 'Lisinopril', 'Valsartan', 'Losartan', 'Enalapril');
    const isPPI = (med: MedRecord) => matchName(med, 'Omeprazole', 'Pantoprazole');
    const isClopidogrel = (med: MedRecord) => matchName(med, 'Clopidogrel');
    const isMethotrexate = (med: MedRecord) => matchName(med, 'Methotrexate');
    const cnsList = ['Alprazolam', 'Amitriptyline', 'Gabapentin', 'Tramadol', 'Diazepam'];
    const isCNS = (med: MedRecord) =>
      cnsList.some((d) => med.genericName?.includes(d) || med.name.includes(d));

    const matchPair = (
      checkA: (m: MedRecord) => boolean,
      checkB: (m: MedRecord) => boolean
    ) => (checkA(med1) && checkB(med2)) || (checkA(med2) && checkB(med1));

    if (matchPair(isNSAID, isBloodThinner)) {
      res.json({
        status: 'danger',
        message: 'อันตราย! การใช้ยาแก้ปวดกลุ่ม NSAID ร่วมกับยาละลายลิ่มเลือด/ต้านเกล็ดเลือด เพิ่มความเสี่ยงเลือดออกในทางเดินอาหารขั้นรุนแรง',
      });
      return;
    }
    if (matchPair(isSSRI, isTramadol)) {
      res.json({
        status: 'danger',
        message: 'อันตราย! การใช้ยาทั้งสองตัวนี้ร่วมกัน เพิ่มความเสี่ยงให้เกิดภาวะ Serotonin Syndrome (ไข้สูง, กล้ามเนื้อกระตุก, สับสน) ซึ่งเป็นอันตรายถึงชีวิต',
      });
      return;
    }
    if (matchPair(isStatin, isFluconazole)) {
      res.json({
        status: 'danger',
        message: 'อันตราย! ยาฆ่าเชื้อรา Fluconazole จะเพิ่มระดับยาลดไขมัน Statin ในเลือด ทำให้เสี่ยงต่อภาวะกล้ามเนื้อลายสลายตัว (Rhabdomyolysis)',
      });
      return;
    }
    if (matchPair(isWarfarin, isFluconazole)) {
      res.json({
        status: 'danger',
        message: 'อันตราย! Fluconazole เพิ่มระดับยา Warfarin ในเลือดอย่างมาก ทำให้เสี่ยงต่อภาวะเลือดออกรุนแรง ต้องปรึกษาแพทย์ทันที',
      });
      return;
    }
    if (matchPair(isAceArb, isPotassiumSparing)) {
      res.json({
        status: 'danger',
        message: 'อันตราย! การใช้ยาลดความดัน (ACEi/ARB) ร่วมกับ Spironolactone อาจทำให้ระดับโพแทสเซียมในเลือดสูงเกินไป (Hyperkalemia)',
      });
      return;
    }
    if (
      (isDigoxin(med1) && isDiuretic(med2) && !isPotassiumSparing(med2)) ||
      (isDigoxin(med2) && isDiuretic(med1) && !isPotassiumSparing(med1))
    ) {
      res.json({
        status: 'danger',
        message: 'อันตราย! ยาขับปัสสาวะอาจทำให้โพแทสเซียมต่ำ ซึ่งจะเพิ่มความเป็นพิษของ Digoxin',
      });
      return;
    }
    if (matchPair(isPPI, isClopidogrel)) {
      res.json({
        status: 'warning',
        message: 'เฝ้าระวัง: ยาลดกรด (โดยเฉพาะ Omeprazole) อาจลดประสิทธิภาพของยา Clopidogrel ในการป้องกันลิ่มเลือด',
      });
      return;
    }
    if (matchPair(isMethotrexate, isNSAID)) {
      res.json({
        status: 'warning',
        message: 'เฝ้าระวัง: ยาแก้ปวด NSAID สามารถลดการขับออกของ Methotrexate ทำให้เกิดความเป็นพิษได้',
      });
      return;
    }
    if (isCNS(med1) && isCNS(med2)) {
      res.json({
        status: 'warning',
        message: 'เฝ้าระวัง: การใช้ยากดประสาท/คลายกังวล/แก้ปวด ร่วมกัน จะเสริมฤทธิ์ทำให้ง่วงซึมรุนแรง',
      });
      return;
    }
    if (matchPair(isSSRI, isNSAID)) {
      res.json({
        status: 'warning',
        message: 'เฝ้าระวัง: การทานยาต้านเศร้ากลุ่ม SSRI ร่วมกับยาแก้ปวด NSAID เพิ่มความเสี่ยงเลือดออกในกระเพาะอาหาร',
      });
      return;
    }
    if (matchPair(isNSAID, (m) => isAceArb(m) || isDiuretic(m))) {
      res.json({
        status: 'warning',
        message: 'เฝ้าระวัง: ยาแก้ปวด NSAID สามารถลดประสิทธิภาพของยาลดความดันโลหิตและยาขับปัสสาวะ',
      });
      return;
    }
    if (
      med1.category &&
      med2.category &&
      med1.category === med2.category &&
      ['Cardiovascular', 'Psychiatric'].includes(med1.category)
    ) {
      res.json({
        status: 'warning',
        message: 'เฝ้าระวัง: ยาทั้งสองชนิดอยู่ในกลุ่มการรักษาเดียวกัน อาจเกิดการเสริมฤทธิ์กัน ควรใช้ภายใต้คำสั่งแพทย์',
      });
      return;
    }

    const hasInteraction1 = med1.interactions.some(
      (i) =>
        i.toLowerCase().includes(med2.genericName?.toLowerCase() || '') ||
        i.toLowerCase().includes(med2.brandName?.toLowerCase() || '')
    );
    const hasInteraction2 = med2.interactions.some(
      (i) =>
        i.toLowerCase().includes(med1.genericName?.toLowerCase() || '') ||
        i.toLowerCase().includes(med1.brandName?.toLowerCase() || '')
    );

    if (hasInteraction1 || hasInteraction2) {
      res.json({
        status: 'warning',
        message: `เฝ้าระวัง: พบข้อมูลการเกิดปฏิกิริยาระหว่างยา ${med1.name} และ ${med2.name} ในฐานข้อมูล โปรดปรึกษาแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน`,
      });
      return;
    }

    res.json({
      status: 'safe',
      message: `ปลอดภัย: ไม่พบปฏิกิริยารุนแรงระหว่าง ${med1.name} และ ${med2.name} ในระบบเบื้องต้น`,
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