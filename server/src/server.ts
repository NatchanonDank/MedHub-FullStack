import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. Health Check
// ==========================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'MedHub Backend API is running' });
});

// ==========================================
// 2. Simple Authentication (Register / Login)
// ==========================================
app.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: String(email).trim(),
        name: name ? String(name).trim() : String(email).split('@')[0],
        password: String(password),
      },
      select: { id: true, email: true, name: true },
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
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. Medications RESTful Endpoints (Read & Admin CRUD)
// ==========================================
app.get('/api/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, sort } = req.query;

    const where: any = {};
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
    const { id } = req.params;
    const medication = await prisma.medication.findUnique({
      where: { id },
    });

    if (!medication) {
      res.status(404).json({ message: `ไม่พบข้อมูลยารหัส ${id}` });
      return;
    }

    res.json(medication);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. Drug Interaction Checker Endpoint
// ==========================================
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

    const matchName = (med: typeof med1, ...names: string[]) =>
      names.some(
        (n) =>
          med.name.includes(n) ||
          med.genericName?.includes(n) ||
          (med.brandName && med.brandName.includes(n))
      );

    const isNSAID = (med: typeof med1) => med.category === 'NSAID';
    const isBloodThinner = (med: typeof med1) =>
      matchName(med, 'Warfarin', 'Apixaban', 'Clopidogrel', 'Enoxaparin', 'Aspirin') ||
      med.category === 'Anticoagulant';
    const isSSRI = (med: typeof med1) => matchName(med, 'Sertraline', 'Escitalopram', 'Fluoxetine');
    const isTramadol = (med: typeof med1) => matchName(med, 'Tramadol');
    const isStatin = (med: typeof med1) => matchName(med, 'Atorvastatin', 'Rosuvastatin', 'Simvastatin');
    const isFluconazole = (med: typeof med1) => matchName(med, 'Fluconazole');
    const isWarfarin = (med: typeof med1) => matchName(med, 'Warfarin');
    const isDigoxin = (med: typeof med1) => matchName(med, 'Digoxin');
    const isDiuretic = (med: typeof med1) =>
      med.category === 'Cardiovascular' && matchName(med, 'Furosemide', 'Hydrochlorothiazide');
    const isPotassiumSparing = (med: typeof med1) => matchName(med, 'Spironolactone');
    const isAceArb = (med: typeof med1) => matchName(med, 'Lisinopril', 'Valsartan', 'Losartan');
    const isPPI = (med: typeof med1) => matchName(med, 'Omeprazole', 'Pantoprazole');
    const isClopidogrel = (med: typeof med1) => matchName(med, 'Clopidogrel');
    const isMethotrexate = (med: typeof med1) => matchName(med, 'Methotrexate');
    const cnsList = ['Alprazolam', 'Amitriptyline', 'Gabapentin', 'Tramadol', 'Diazepam'];
    const isCNS = (med: typeof med1) =>
      cnsList.some((d) => med.genericName?.includes(d) || med.name.includes(d));

    const matchPair = (
      checkA: (m: typeof med1) => boolean,
      checkB: (m: typeof med1) => boolean
    ) => (checkA(med1) && checkB(med2)) || (checkA(med2) && checkB(med1));

    if (matchPair(isNSAID, isBloodThinner)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ยาแก้ปวดกลุ่ม NSAID ร่วมกับยาละลายลิ่มเลือด/ต้านเกล็ดเลือด เพิ่มความเสี่ยงเลือดออกในทางเดินอาหารขั้นรุนแรง',
      });
      return;
    }
    if (matchPair(isSSRI, isTramadol)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ยาทั้งสองตัวนี้ร่วมกัน เพิ่มความเสี่ยงให้เกิดภาวะ Serotonin Syndrome (ไข้สูง, กล้ามเนื้อกระตุก, สับสน) ซึ่งเป็นอันตรายถึงชีวิต',
      });
      return;
    }
    if (matchPair(isStatin, isFluconazole)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาฆ่าเชื้อรา Fluconazole จะเพิ่มระดับยาลดไขมัน Statin ในเลือด ทำให้เสี่ยงต่อภาวะกล้ามเนื้อลายสลายตัว (Rhabdomyolysis)',
      });
      return;
    }
    if (matchPair(isWarfarin, isFluconazole)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! Fluconazole เพิ่มระดับยา Warfarin ในเลือดอย่างมาก ทำให้เสี่ยงต่อภาวะเลือดออกรุนแรง ต้องปรึกษาแพทย์ทันที',
      });
      return;
    }
    if (matchPair(isAceArb, isPotassiumSparing)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ยาลดความดัน (ACEi/ARB) ร่วมกับ Spironolactone อาจทำให้ระดับโพแทสเซียมในเลือดสูงเกินไป (Hyperkalemia) ซึ่งมีผลต่อจังหวะหัวใจ',
      });
      return;
    }
    if (
      (isDigoxin(med1) && isDiuretic(med2) && !isPotassiumSparing(med2)) ||
      (isDigoxin(med2) && isDiuretic(med1) && !isPotassiumSparing(med1))
    ) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาขับปัสสาวะอาจทำให้โพแทสเซียมต่ำ ซึ่งจะเพิ่มความเป็นพิษของ Digoxin (คลื่นไส้, ตาพร่า, หัวใจเต้นผิดจังหวะ)',
      });
      return;
    }
    if (matchPair(isPPI, isClopidogrel)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาลดกรด (โดยเฉพาะ Omeprazole) อาจลดประสิทธิภาพของยา Clopidogrel ในการป้องกันลิ่มเลือด ควรปรึกษาแพทย์',
      });
      return;
    }
    if (matchPair(isMethotrexate, isNSAID)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาแก้ปวด NSAID สามารถลดการขับออกของ Methotrexate ทำให้ระดับยาในร่างกายสูงขึ้นและเกิดความเป็นพิษได้',
      });
      return;
    }
    if (isCNS(med1) && isCNS(med2)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: การใช้ยากดประสาท/คลายกังวล/แก้ปวด ร่วมกัน จะเสริมฤทธิ์ทำให้ง่วงซึมรุนแรง กดการหายใจ และเสี่ยงต่ออุบัติเหตุ',
      });
      return;
    }
    if (matchPair(isSSRI, isNSAID)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: การทานยาต้านเศร้ากลุ่ม SSRI ร่วมกับยาแก้ปวด NSAID เพิ่มความเสี่ยงให้เกิดแผลและเลือดออกในกระเพาะอาหาร',
      });
      return;
    }
    if (matchPair(isNSAID, (m) => isAceArb(m) || isDiuretic(m))) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาแก้ปวด NSAID สามารถลดประสิทธิภาพของยาลดความดันโลหิตและยาขับปัสสาวะ และอาจทำให้การทำงานของไตแย่ลง',
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
        message:
          'เฝ้าระวัง: ยาทั้งสองชนิดอยู่ในกลุ่มการรักษาเดียวกัน อาจเกิดการเสริมฤทธิ์กัน (เช่น ความดันตกมากเกินไป หรือง่วงซึมมาก) ควรใช้ภายใต้คำสั่งแพทย์',
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
      message: `ปลอดภัย: ไม่พบปฏิกิริยารุนแรงระหว่าง ${med1.name} และ ${med2.name} ในระบบเบื้องต้น อย่างไรก็ตามหากมีอาการผิดปกติควรปรึกษาเภสัชกร`,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. Personal Collection (My Kit CRUD)
// ==========================================
// READ: ดึงรายการยาในกระเป๋าของผู้ใช้
app.get('/api/my-kit/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      res.status(400).json({ message: 'Invalid userId' });
      return;
    }

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

// CREATE / TOGGLE: เพิ่มยาลงกระเป๋า (หรือถ้ามีอยู่แล้วให้ลบออก)
app.post('/api/my-kit/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, medicationId, note } = req.body;
    const uid = Number(userId);

    if (!uid || !medicationId) {
      res.status(400).json({ message: 'กรุณาระบุ userId และ medicationId' });
      return;
    }

    const existing = await prisma.myKitItem.findUnique({
      where: {
        userId_medicationId: {
          userId: uid,
          medicationId: String(medicationId),
        },
      },
    });

    if (existing) {
      await prisma.myKitItem.delete({ where: { id: existing.id } });
      res.json({ action: 'removed', medicationId });
      return;
    }

    const created = await prisma.myKitItem.create({
      data: {
        userId: uid,
        medicationId: String(medicationId),
        note: note || '',
      },
      include: { medication: true },
    });

    res.status(201).json({ action: 'added', item: created });
  } catch (err) {
    next(err);
  }
});

// UPDATE: แก้ไขโน้ตส่วนตัวของยาในกระเป๋า
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

// DELETE: ลบยาออกจากกระเป๋าทั้งชุดของผู้ใช้
app.delete('/api/my-kit/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    await prisma.myKitItem.deleteMany({
      where: { userId },
    });

    res.json({ message: 'ล้างกระเป๋ายาเรียบร้อยแล้ว' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Global Error Handler
// ==========================================
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({
    message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
  });
});

app.listen(PORT, () => {
  console.log(`MedHub Server running on http://localhost:${PORT}`);
});