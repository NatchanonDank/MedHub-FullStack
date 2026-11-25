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

    // =========================================================================
    // แยกกลุ่มกลไกของยาให้ละเอียด (แยก Anticoagulant ออกจาก Antiplatelet ชัดเจน)
    // =========================================================================

    const isAnticoagulant = (med: MedRecord) =>
      matchCategory(med, 'Anticoagulant') ||
      matchName(
        med,
        'Warfarin',
        'Apixaban',
        'Rivaroxaban',
        'Dabigatran',
        'Edoxaban',
        'Enoxaparin',
        'Heparin',
        'Fondaparinux'
      );

    const isAntiplatelet = (med: MedRecord) =>
      matchCategory(med, 'Antiplatelet') ||
      matchName(med, 'Clopidogrel', 'Ticagrelor', 'Prasugrel', 'Aspirin', 'Cilostazol', 'Dipyridamole');

    const isBloodThinner = (med: MedRecord) => isAnticoagulant(med) || isAntiplatelet(med);

    const isNSAID = (med: MedRecord) =>
      (matchCategory(med, 'NSAID') ||
        matchName(
          med,
          'Ibuprofen',
          'Diclofenac',
          'Naproxen',
          'Celecoxib',
          'Etoricoxib',
          'Meloxicam',
          'Mefenamic',
          'Indomethacin',
          'Piroxicam',
          'Ketorolac'
        )) &&
      !matchName(med, 'Aspirin');

    const isCorticosteroid = (med: MedRecord) =>
      matchName(
        med,
        'Prednisolone',
        'Prednisone',
        'Dexamethasone',
        'Methylprednisolone',
        'Hydrocortisone',
        'Betamethasone'
      );

    const isWarfarin = (med: MedRecord) => matchName(med, 'Warfarin');

    const isSSRIorSNRI = (med: MedRecord) =>
      matchName(
        med,
        'Sertraline',
        'Escitalopram',
        'Citalopram',
        'Fluoxetine',
        'Paroxetine',
        'Fluvoxamine',
        'Venlafaxine',
        'Duloxetine',
        'Amitriptyline'
      );

    const isSerotonergic = (med: MedRecord) =>
      matchName(med, 'Tramadol', 'Dextromethorphan', 'Linezolid', 'Sumatriptan');

    const isStatin = (med: MedRecord) =>
      matchName(med, 'Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Pravastatin', 'Pitavastatin');

    const isStrongCYP3A4Inhibitor = (med: MedRecord) =>
      matchName(
        med,
        'Fluconazole',
        'Itraconazole',
        'Ketoconazole',
        'Voriconazole',
        'Clarithromycin',
        'Erythromycin',
        'Ritonavir'
      );

    const isWarfarinBooster = (med: MedRecord) =>
      matchName(
        med,
        'Fluconazole',
        'Metronidazole',
        'Sulfamethoxazole',
        'Trimethoprim',
        'Co-trimoxazole',
        'Ciprofloxacin',
        'Clarithromycin',
        'Amiodarone'
      );

    const isNitrate = (med: MedRecord) =>
      matchName(med, 'Isosorbide', 'Nitroglycerin', 'Glyceryl trinitrate');

    const isPDE5Inhibitor = (med: MedRecord) =>
      matchName(med, 'Sildenafil', 'Tadalafil', 'Vardenafil');

    const isAceArb = (med: MedRecord) =>
      matchName(
        med,
        'Lisinopril',
        'Enalapril',
        'Ramipril',
        'Perindopril',
        'Captopril',
        'Valsartan',
        'Losartan',
        'Irbesartan',
        'Telmisartan',
        'Candesartan'
      );

    const isPotassiumSparingOrSupplement = (med: MedRecord) =>
      matchName(med, 'Spironolactone', 'Eplerenone', 'Amiloride', 'Potassium');

    const isPotassiumDepletingDiuretic = (med: MedRecord) =>
      matchName(med, 'Furosemide', 'Hydrochlorothiazide', 'Indapamide', 'Chlorthalidone', 'Torsemide');

    const isDigoxin = (med: MedRecord) => matchName(med, 'Digoxin');
    const isLithium = (med: MedRecord) => matchName(med, 'Lithium');
    const isMethotrexate = (med: MedRecord) => matchName(med, 'Methotrexate');
    const isParacetamol = (med: MedRecord) => matchName(med, 'Paracetamol', 'Acetaminophen');

    const isEnzymeInducer = (med: MedRecord) =>
      matchName(med, 'Carbamazepine', 'Phenytoin', 'Phenobarbital', 'Rifampicin', 'Rifampin');

    const isOralContraceptive = (med: MedRecord) =>
      matchName(med, 'Ethinylestradiol', 'Levonorgestrel', 'Desogestrel', 'Drospirenone', 'Norethisterone');

    const isPPI = (med: MedRecord) =>
      matchName(med, 'Omeprazole', 'Esomeprazole', 'Lansoprazole', 'Pantoprazole', 'Rabeprazole');

    const isClopidogrel = (med: MedRecord) => matchName(med, 'Clopidogrel');

    const isChelatedAntibiotic = (med: MedRecord) =>
      matchName(
        med,
        'Ciprofloxacin',
        'Levofloxacin',
        'Ofloxacin',
        'Moxifloxacin',
        'Norfloxacin',
        'Doxycycline',
        'Tetracycline',
        'Minocycline'
      );

    const isDivalentCationOrAntacid = (med: MedRecord) =>
      matchName(
        med,
        'Calcium',
        'Ferrous',
        'Iron',
        'Magnesium',
        'Aluminium',
        'Aluminum',
        'Antacid',
        'Zinc',
        'Sucralfate'
      );

    const isOpioid = (med: MedRecord) =>
      matchName(med, 'Tramadol', 'Morphine', 'Codeine', 'Fentanyl', 'Oxycodone');

    const isBenzo = (med: MedRecord) =>
      matchName(med, 'Alprazolam', 'Diazepam', 'Lorazepam', 'Clonazepam', 'Midazolam');

    const isCNSDepressant = (med: MedRecord) =>
      isOpioid(med) ||
      isBenzo(med) ||
      matchName(
        med,
        'Amitriptyline',
        'Gabapentin',
        'Pregabalin',
        'Zolpidem',
        'Chlorpheniramine',
        'Hydroxyzine',
        'Dimenhydrinate'
      );

    const isQTProlonging = (med: MedRecord) =>
      matchName(
        med,
        'Amiodarone',
        'Azithromycin',
        'Clarithromycin',
        'Ciprofloxacin',
        'Levofloxacin',
        'Domperidone',
        'Ondansetron',
        'Haloperidol',
        'Quetiapine',
        'Escitalopram'
      );

    const isBetaBlocker = (med: MedRecord) =>
      matchName(med, 'Propranolol', 'Metoprolol', 'Atenolol', 'Bisoprolol', 'Carvedilol', 'Nebivolol');

    const isAntidiabetic = (med: MedRecord) =>
      matchCategory(med, 'Antidiabetic') ||
      matchName(
        med,
        'Insulin',
        'Metformin',
        'Glipizide',
        'Glibenclamide',
        'Gliclazide',
        'Glimepiride',
        'Pioglitazone',
        'Sitagliptin',
        'Empagliflozin',
        'Dapagliflozin'
      );

    const matchPair = (
      checkA: (m: MedRecord) => boolean,
      checkB: (m: MedRecord) => boolean
    ) => (checkA(med1) && checkB(med2)) || (checkA(med2) && checkB(med1));

    // =========================================================================
    // ระดับที่ 1: DANGER (ห้ามทานร่วมกัน / อันตรายรุนแรง)
    // =========================================================================

    if (matchPair(isNitrate, isPDE5Inhibitor)) {
      res.json({
        status: 'danger',
        message:
          'อันตรายถึงชีวิต! การใช้ยาขยายหลอดเลือดหัวใจกลุ่ม Nitrate ร่วมกับยา Sildenafil/Tadalafil จะเสริมฤทธิ์ขยายหลอดเลือดอย่างรุนแรง ทำให้ความดันโลหิตตกต่ำเฉียบพลัน ช็อก และหัวใจขาดเลือดได้',
      });
      return;
    }

    if (isAnticoagulant(med1) && isAnticoagulant(med2)) {
      res.json({
        status: 'danger',
        message: `อันตรายรุนแรง! ห้ามใช้ยาต้านการแข็งตัวของเลือด (Anticoagulant) 2 ชนิด (${med1.name} และ ${med2.name}) ร่วมกัน เพราะจะยับยั้งปัจจัยการแข็งตัวของเลือดซ้ำซ้อน ทำให้เกิดภาวะเลือดออกรุนแรงในสมองและอวัยวะภายในถึงชีวิต`,
      });
      return;
    }

    if (matchPair(isNSAID, isBloodThinner)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาแก้ปวดกลุ่ม NSAID ทำลายเยื่อบุกระเพาะอาหารและยับยั้งการทำงานของเกล็ดเลือด เมื่อใช้ร่วมกับยาละลายลิ่มเลือดหรือยาต้านเกล็ดเลือด จะเพิ่มความเสี่ยงภาวะเลือดออกในทางเดินอาหารขั้นรุนแรง',
      });
      return;
    }

    if (isNSAID(med1) && isNSAID(med2)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ห้ามใช้ยาแก้ปวดต้านการอักเสบกลุ่ม NSAID 2 ชนิดร่วมกัน เพราะไม่ช่วยเพิ่มประสิทธิภาพการลดปวด แต่เพิ่มความเสี่ยงแผลทะลุ เลือดออกในกระเพาะอาหาร และไตวายเฉียบพลัน',
      });
      return;
    }

    if (matchPair(isSSRIorSNRI, isSerotonergic)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ยาต้านเศร้ากลุ่ม SSRI/SNRI ร่วมกับ Tramadol หรือ Dextromethorphan ทำให้ระดับสารสื่อประสาท Serotonin สูงเกินไป เกิดภาวะ Serotonin Syndrome (ไข้สูง, กล้ามเนื้อกระตุก, หัวใจเต้นเร็ว, สับสน) ซึ่งเป็นอันตรายถึงชีวิต',
      });
      return;
    }

    if (matchPair(isStatin, isStrongCYP3A4Inhibitor)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาฆ่าเชื้อรา Azole หรือยาฆ่าเชื้อ Clarithromycin/Erythromycin ยับยั้งเอนไซม์ CYP3A4 ทำให้ระดับยาลดไขมัน Statin ในเลือดพุ่งสูงจนเกิดภาวะกล้ามเนื้อลายสลายตัว (Rhabdomyolysis) และไตวายเฉียบพลัน',
      });
      return;
    }

    if (matchPair(isWarfarin, isWarfarinBooster)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาฆ่าเชื้อ/ฆ่าเชื้อรากลุ่มนี้ยับยั้งการทำลายยา Warfarin ที่ตับอย่างรุนแรง ทำให้ค่าการแข็งตัวของเลือด (INR) พุ่งสูงและเสี่ยงเลือดออกรุนแรง ต้องปรึกษาแพทย์ทันที',
      });
      return;
    }

    if (matchPair(isAceArb, isPotassiumSparingOrSupplement)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ยาลดความดันกลุ่ม ACEi/ARB ร่วมกับ Spironolactone หรือโพแทสเซียมเสริม ทำให้ไตขับโพแทสเซียมลดลง เกิดภาวะโพแทสเซียมในเลือดสูงเกิน (Hyperkalemia) เสี่ยงหัวใจเต้นผิดจังหวะและหยุดเต้น',
      });
      return;
    }

    if (matchPair(isDigoxin, isPotassiumDepletingDiuretic)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาขับปัสสาวะกลุ่มนี้ทำให้โพแทสเซียมในเลือดต่ำ (Hypokalemia) ซึ่งจะกระตุ้นให้ยา Digoxin จับกับกล้ามเนื้อหัวใจมากขึ้นจนเกิดพิษและภาวะหัวใจเต้นผิดจังหวะรุนแรง',
      });
      return;
    }

    if (matchPair(isMethotrexate, (m) => isNSAID(m) || matchName(m, 'Co-trimoxazole', 'Sulfamethoxazole'))) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาอีกชนิดจะลดการขับออกของ Methotrexate ทางไต ทำให้ระดับยาคั่งในเลือดและเกิดพิษกดไขกระดูกอย่างรุนแรง (เม็ดเลือดขาวต่ำ เกล็ดเลือดต่ำ)',
      });
      return;
    }

    if (matchPair(isLithium, (m) => isNSAID(m) || isPotassiumDepletingDiuretic(m) || isAceArb(m))) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ร่วมกันจะลดการขับออกของยา Lithium ทางไต ทำให้ระดับยาในเลือดสูงจนเกิดพิษต่อระบบประสาท (มือสั่นรุนแรง ชัก ซึม) และไตวาย',
      });
      return;
    }

    if (isQTProlonging(med1) && isQTProlonging(med2)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! ยาทั้งสองชนิดมีผลยืดช่วงคลื่นไฟฟ้าหัวใจ (QT Prolongation) เมื่อใช้ร่วมกันจะเสริมฤทธิ์เพิ่มความเสี่ยงภาวะหัวใจเต้นผิดจังหวะรุนแรงชนิด Torsades de Pointes',
      });
      return;
    }

    if (matchPair(isOpioid, isBenzo)) {
      res.json({
        status: 'danger',
        message:
          'อันตราย! การใช้ยาแก้ปวดกลุ่ม Opioid ร่วมกับยานอนหลับ/คลายกังวลกลุ่ม Benzodiazepine จะเสริมฤทธิ์กดศูนย์ควบคุมการหายใจในสมองอย่างรุนแรง อาจหมดสติและเสียชีวิตได้',
      });
      return;
    }

    // =========================================================================
    // ระดับที่ 2: WARNING (ควรเฝ้าระวัง / ต้องปรับขนาดหรือปรึกษาแพทย์อย่างใกล้ชิด)
    // =========================================================================

    if (matchPair(isAnticoagulant, isAntiplatelet)) {
      res.json({
        status: 'warning',
        message: `เฝ้าระวังความเสี่ยงเลือดออกสูง! การใช้ยาต้านการแข็งตัวของเลือด (${isAnticoagulant(med1) ? med1.name : med2.name}) ร่วมกับยาต้านเกล็ดเลือด (${isAntiplatelet(med1) ? med1.name : med2.name}) ออกฤทธิ์ยับยั้งกลไกการหยุดเลือด 2 ระบบพร้อมกัน เพิ่มความเสี่ยงเลือดออกในทางเดินอาหารและฟกช้ำง่าย (ใช้ร่วมกันได้เฉพาะกรณีแพทย์สั่งหลังทำหัตถการหัวใจหรือใส่ขดลวด และต้องเฝ้าระวังอาการถ่ายดำหรือเลือดออกผิดปกติอย่างใกล้ชิด)`,
      });
      return;
    }

    if (isAntiplatelet(med1) && isAntiplatelet(med2)) {
      res.json({
        status: 'warning',
        message: `เฝ้าระวัง! การใช้ยาต้านเกล็ดเลือด 2 ชนิด (${med1.name} และ ${med2.name}) ร่วมกัน (Dual Antiplatelet Therapy) เพิ่มความเสี่ยงเลือดออกในกระเพาะอาหารและเลือดหยุดยาก ควรใช้เฉพาะภายใต้การดูแลของแพทย์โรคหัวใจหรือระบบประสาทเท่านั้น`,
      });
      return;
    }

    if (matchPair(isCorticosteroid, isNSAID)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง! การใช้ยาสเตียรอยด์ (เช่น Prednisolone/Dexamethasone) ร่วมกับยาแก้ปวดกลุ่ม NSAID จะทำลายเกราะป้องกันเยื่อบุกระเพาะอาหารพร้อมกัน เพิ่มความเสี่ยงแผลในกระเพาะอาหารและเลือดออกในทางเดินอาหารสูงขึ้นหลายเท่า',
      });
      return;
    }

    if (matchPair(isParacetamol, isEnzymeInducer)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยากันชักหรือยาวัณโรคกลุ่มนี้กระตุ้นเอนไซม์ตับให้เปลี่ยน Paracetamol เป็นสารพิษ (NAPQI) มากขึ้น เพิ่มความเสี่ยงตับอักเสบ ควรจำกัดขนาดยาและปรึกษาแพทย์',
      });
      return;
    }

    if (matchPair(isOralContraceptive, isEnzymeInducer)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยา Carbamazepine, Phenytoin หรือ Rifampicin เร่งการทำลายฮอร์โมนยาคุมกำเนิด ทำให้ประสิทธิภาพการคุมกำเนิดลดลงและเสี่ยงตั้งครรภ์ไม่พึงประสงค์',
      });
      return;
    }

    if (matchPair(isChelatedAntibiotic, isDivalentCationOrAntacid)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: แร่ธาตุ (แคลเซียม ธาตุเหล็ก แมกนีเซียม สังกะสี) และยาลดกรดจะจับตัวกับยาฆ่าเชื้อเป็นสารประกอบที่ไม่ละลายน้ำ ทำให้ยาดูดซึมไม่ได้ผล ควรทานห่างกันอย่างน้อย 2-4 ชั่วโมง',
      });
      return;
    }

    if (matchPair(isPPI, isClopidogrel)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาลดกรดกลุ่ม PPI (โดยเฉพาะ Omeprazole/Esomeprazole) ยับยั้งเอนไซม์ CYP2C19 ที่เปลี่ยนยา Clopidogrel ให้อยู่ในรูปออกฤทธิ์ ทำให้ประสิทธิภาพในการป้องกันลิ่มเลือดลดลง',
      });
      return;
    }

    if (matchPair(isSSRIorSNRI, isNSAID)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาต้านเศร้ากลุ่ม SSRI/SNRI ลดการเก็บกลับ Serotonin ในเกล็ดเลือด ทำให้เกล็ดเลือดเกาะตัวช้าลง เมื่อทานร่วมกับยาแก้ปวด NSAID จะเพิ่มความเสี่ยงเลือดออกในกระเพาะอาหารมากขึ้น',
      });
      return;
    }

    if (matchPair(isNSAID, (m) => isAceArb(m) || isPotassiumDepletingDiuretic(m) || isBetaBlocker(m))) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาแก้ปวดกลุ่ม NSAID ยับยั้ง Prostaglandin ทำให้หลอดเลือดไตหดตัวและเกิดการคั่งของน้ำและเกลือ ส่งผลให้ประสิทธิภาพของยาลดความดันโลหิตและยาขับปัสสาวะลดลง',
      });
      return;
    }

    if (matchPair(isBetaBlocker, isAntidiabetic)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: ยาลดความดันกลุ่ม Beta-blocker สามารถบดบังอาการเตือนของภาวะน้ำตาลในเลือดต่ำ (เช่น ใจสั่น มือสั่น) และทำให้ระดับน้ำตาลฟื้นตัวช้า',
      });
      return;
    }

    if (isCNSDepressant(med1) && isCNSDepressant(med2)) {
      res.json({
        status: 'warning',
        message:
          'เฝ้าระวัง: การใช้ยากดประสาทส่วนกลาง ยาคลายกังวล หรือยาแก้แพ้ที่ทำให้ง่วงร่วมกัน จะเสริมฤทธิ์ทำให้ง่วงซึม มึนงง สมาธิลดลง และเสี่ยงต่อการพลัดตกหกล้ม',
      });
      return;
    }

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