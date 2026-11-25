import 'dotenv/config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { evaluateDrugInteraction } from './services/interactionService';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toStringArray = (val: unknown, fallback: string[] | undefined) => (Array.isArray(val) ? val : fallback);

const formatMedData = (body: Record<string, unknown>, isCreate: boolean) => ({
  name: body.name !== undefined ? String(body.name).trim() : undefined,
  genericName: body.genericName !== undefined ? String(body.genericName).trim() : undefined,
  brandName: body.brandName ?? (isCreate ? 'Generic' : undefined),
  strength: body.strength ?? (isCreate ? '' : undefined),
  dosageForm: body.dosageForm ?? (isCreate ? 'Tablet' : undefined),
  category: body.category !== undefined ? String(body.category).trim() : undefined,
  prescriptionType: body.prescriptionType ?? (isCreate ? 'Rx' : undefined),
  specialTag: body.specialTag ?? (isCreate ? '' : undefined),
  dosageInstruction: body.dosageInstruction ?? (isCreate ? '' : undefined),
  appearance: body.appearance ?? (isCreate ? '' : undefined),
  indications: toStringArray(body.indications, isCreate ? [] : undefined),
  sideEffects: toStringArray(body.sideEffects, isCreate ? [] : undefined),
  warnings: toStringArray(body.warnings, isCreate ? [] : undefined),
  interactions: toStringArray(body.interactions, isCreate ? [] : undefined),
  pregnancyCategory: body.pregnancyCategory ?? (isCreate ? 'C' : undefined),
  imageUrl: body.imageUrl ?? (isCreate ? '/icon.png' : undefined),
});

const reportInclude = {
  user: { select: { id: true, name: true, email: true } },
  medication: { select: { id: true, name: true, genericName: true, category: true, imageUrl: true } },
};

app.get('/', (_req, res) => res.json({ status: 'ok', message: 'MedHub Final Project API is running on Vercel' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: 'MedHub Final Project API is running' }));

app.post('/api/auth/register', wrap(async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });

  const cleanEmail = String(email).trim();
  if (await prisma.user.findUnique({ where: { email: cleanEmail } })) {
    return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ' });
  }

  const user = await prisma.user.create({
    data: { email: cleanEmail, name: name ? String(name).trim() : cleanEmail.split('@')[0], password: String(password), role: 'USER' },
    select: { id: true, email: true, name: true, role: true },
  });
  res.status(201).json({ user });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });

  const user = await prisma.user.findUnique({ where: { email: String(email).trim() } });
  if (!user || user.password !== String(password)) {
    return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  }
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}));

app.get('/api/medications', wrap(async (req, res) => {
  const { search, category, sort } = req.query;
  const where: Record<string, unknown> = {};
  if (typeof category === 'string' && category) where.category = category;
  if (typeof search === 'string' && search) {
    where.OR = ['name', 'genericName', 'brandName', 'specialTag'].map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    }));
  }

  const results = await prisma.medication.findMany({ where, orderBy: { name: sort === 'Z-A' ? 'desc' : 'asc' } });
  res.json({ count: results.length, results });
}));

app.get('/api/medications/:id', wrap(async (req, res) => {
  const medication = await prisma.medication.findUnique({ where: { id: String(req.params.id) } });
  if (!medication) return res.status(404).json({ message: `ไม่พบข้อมูลยารหัส ${req.params.id}` });
  res.json(medication);
}));

app.post('/api/medications', wrap(async (req, res) => {
  if (!req.body.name || !req.body.genericName || !req.body.category) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อยา ชื่อสามัญ และหมวดหมู่ให้ครบถ้วน' });
  }
  const created = await prisma.medication.create({
    data: { id: `med_${Date.now().toString().slice(-5)}`, ...formatMedData(req.body, true) } as never,
  });
  res.status(201).json(created);
}));

app.put('/api/medications/:id', wrap(async (req, res) => {
  const updated = await prisma.medication.update({
    where: { id: String(req.params.id) },
    data: formatMedData(req.body, false) as never,
  });
  res.json(updated);
}));

app.delete('/api/medications/:id', wrap(async (req, res) => {
  const id = String(req.params.id);
  await prisma.medication.delete({ where: { id } });
  res.json({ message: 'ลบข้อมูลยาเรียบร้อยแล้ว', id });
}));

app.get('/api/interaction-rules', wrap(async (_req, res) => {
  res.json(await prisma.drugInteractionRule.findMany({ orderBy: [{ severity: 'asc' }, { id: 'asc' }] }));
}));

app.post('/api/interaction-rules', wrap(async (req, res) => {
  const { ruleName, drugAGroup, drugBGroup, excludeA, excludeB, severity, message } = req.body;
  if (!ruleName || !Array.isArray(drugAGroup) || !Array.isArray(drugBGroup) || !severity || !message) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลกฎปฏิกิริยาระหว่างยาให้ครบถ้วน' });
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
}));

app.delete('/api/interaction-rules/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.drugInteractionRule.delete({ where: { id } });
  res.json({ message: 'ลบกฎปฏิกิริยาระหว่างยาเรียบร้อยแล้ว', id });
}));

app.post('/api/interactions/check', wrap(async (req, res) => {
  const { med1Id, med2Id } = req.body;
  if (!med1Id || !med2Id) return res.status(400).json({ message: 'กรุณาระบุยาทั้ง 2 ชนิด' });

  const result = await evaluateDrugInteraction(String(med1Id), String(med2Id));
  if (!result) return res.status(404).json({ message: 'ไม่พบข้อมูลยาในระบบ' });
  res.json(result);
}));

app.get('/api/my-kit/:userId', wrap(async (req, res) => {
  res.json(await prisma.myKitItem.findMany({
    where: { userId: Number(req.params.userId) },
    include: { medication: true },
    orderBy: { createdAt: 'desc' },
  }));
}));

app.post('/api/my-kit/toggle', wrap(async (req, res) => {
  const { userId, medicationId, note } = req.body;
  const uid = Number(userId);
  const medId = String(medicationId);

  const existing = await prisma.myKitItem.findUnique({ where: { userId_medicationId: { userId: uid, medicationId: medId } } });
  if (existing) {
    await prisma.myKitItem.delete({ where: { id: existing.id } });
    return res.json({ action: 'removed', medicationId });
  }

  const item = await prisma.myKitItem.create({
    data: { userId: uid, medicationId: medId, note: note || '' },
    include: { medication: true },
  });
  res.status(201).json({ action: 'added', item });
}));

app.patch('/api/my-kit/:itemId', wrap(async (req, res) => {
  res.json(await prisma.myKitItem.update({
    where: { id: Number(req.params.itemId) },
    data: { note: String(req.body.note ?? '') },
    include: { medication: true },
  }));
}));

app.delete('/api/my-kit/:userId', wrap(async (req, res) => {
  await prisma.myKitItem.deleteMany({ where: { userId: Number(req.params.userId) } });
  res.json({ message: 'ล้างกระเป๋ายาเรียบร้อยแล้ว' });
}));

app.get('/api/reports', wrap(async (req, res) => {
  const where = req.query.userId ? { userId: Number(req.query.userId) } : {};
  res.json(await prisma.symptomReport.findMany({ where, include: reportInclude, orderBy: { createdAt: 'desc' } }));
}));

app.post('/api/reports', wrap(async (req, res) => {
  const { userId, medicationId, symptom, severity, description } = req.body;
  if (!userId || !medicationId || !symptom) {
    return res.status(400).json({ message: 'กรุณาเลือกตัวยาและระบุอาการที่พบ' });
  }
  const created = await prisma.symptomReport.create({
    data: {
      userId: Number(userId),
      medicationId: String(medicationId),
      symptom: String(symptom).trim(),
      severity: severity || 'MILD',
      description: description ? String(description).trim() : '',
    },
    include: reportInclude,
  });
  res.status(201).json(created);
}));

app.put('/api/reports/:id', wrap(async (req, res) => {
  const { medicationId, symptom, severity, description, status, adminNote } = req.body;
  const data: Record<string, unknown> = {};
  if (medicationId !== undefined) data.medicationId = String(medicationId);
  if (symptom !== undefined) data.symptom = String(symptom).trim();
  if (severity !== undefined) data.severity = severity;
  if (description !== undefined) data.description = String(description).trim();
  if (status !== undefined) data.status = status;
  if (adminNote !== undefined) data.adminNote = String(adminNote).trim();

  res.json(await prisma.symptomReport.update({ where: { id: Number(req.params.id) }, data, include: reportInclude }));
}));

app.delete('/api/reports/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.symptomReport.delete({ where: { id } });
  res.json({ message: 'ลบรายงานอาการเรียบร้อยแล้ว', id });
}));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`MedHub Server running on http://localhost:${PORT}`));
}

export default app;