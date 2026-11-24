# MedHub — Full-Stack Medication Database & Community Pharmacovigilance

เว็บแอปพลิเคชันฐานข้อมูลยา ระบบตรวจสอบปฏิกิริยาระหว่างยา (Drug Interaction Checker) กระเป๋ายาส่วนตัว (My Kit) และระบบรายงานอาการไม่พึงประสงค์จากการใช้ยาในชุมชน (Community Pharmacovigilance) พัฒนาด้วยสถาปัตยกรรม Full-Stack

---

## 🛠️ Tech Stack
- **Frontend (`client/`):** React 19, TypeScript, Vite, React Router v7, TanStack Query, Zustand, Tailwind CSS, DaisyUI
- **Backend (`server/`):** Node.js, Express, TypeScript, Prisma ORM v7
- **Database:** PostgreSQL (Supabase)

---

## ✨ ฟีเจอร์หลัก (Core Features)
1. **ฐานข้อมูลยา (Medication Database):** ค้นหาชื่อยา ชื่อสามัญ กรองตามหมวดหมู่ และดูรายละเอียดสรรพคุณ วิธีใช้ คำเตือน และผลข้างเคียง (ครบ 49 รายการ)
2. **ตรวจสอบปฏิกิริยาระหว่างยา (Drug Interaction Checker):** ตรวจสอบความเสี่ยงเมื่อใช้ยาร่วมกัน พร้อมระดับการแจ้งเตือน (ปลอดภัย / เฝ้าระวัง / อันตราย)
3. **กระเป๋ายาส่วนตัว (My Kit):** บันทึกรายการยาประจำตัวและจัดการโน้ตส่วนตัวสำหรับผู้ใช้งานที่เข้าสู่ระบบ
4. **รายงานอาการไม่พึงประสงค์ (Community Symptom Reporting):** ผู้ใช้ทั่วไปสามารถรายงานอาการข้างเคียงที่พบจากการใช้ยา แก้ไข และลบรายงานของตนเองได้
5. **ระบบจัดการสำหรับผู้ดูแลระบบ / เภสัชกร (Admin Console):**
   - จัดการข้อมูลยาในระบบแบบ Full CRUD (เพิ่ม / แก้ไข / ลบรายการยา)
   - ตรวจสอบรายงานอาการไม่พึงประสงค์ของชุมชน อัปเดตสถานะ (`PENDING`, `REVIEWED`, `RESOLVED`) และเพิ่มคำแนะนำจากเภสัชกร

---

## 📂 โครงสร้างโปรเจกต์
```text
MedHub-FullStack/
├── client/                 # Frontend SPA (Vite + React + TypeScript)
│   ├── public/images/      # รูปภาพประกอบรายการยา
│   └── src/
│       ├── api/            # API Client & TypeScript Interfaces
│       ├── components/     # Navbar, MedicationCard, AuthModal
│       ├── hooks/          # TanStack Query Hooks (Queries & Mutations)
│       ├── pages/          # MedList, MedDetail, InteractionChecker, MyKit, SymptomReport, AdminDashboard, About
│       └── stores/         # Zustand Global State & Auth Persistence
├── server/                 # Backend RESTful API (Express + Prisma)
│   ├── prisma/             # schema.prisma, migrations, seed.ts & data/medications.json
│   └── src/                # server.ts & Prisma Client Adapter
└── README.md
```

---

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Local Setup)

### 1. ตั้งค่าและรัน Backend (`server/`)
```bash
cd server
npm install
```
สร้างไฟล์ `.env` ภายในโฟลเดอร์ `server/` (อ้างอิงจาก `.env.example`):
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
PORT=4000
```
รันคำสั่งสร้าง Prisma Client, Migrate และ Seed ข้อมูลเริ่มต้นลงฐานข้อมูล จากนั้นเปิดเซิร์ฟเวอร์:
```bash
npm run prisma:generate
npm run prisma:seed
npm run dev
```
> Backend API จะทำงานที่ `http://localhost:4000`

### 2. ตั้งค่าและรัน Frontend (`client/`)
เปิด Terminal หน้าต่างใหม่ แล้วรันคำสั่ง:
```bash
cd client
npm install
```
สร้างไฟล์ `.env` ภายในโฟลเดอร์ `client/` (อ้างอิงจาก `.env.example`):
```env
VITE_API_URL="http://localhost:4000/api"
```
รันเซิร์ฟเวอร์พัฒนาหน้าเว็บ:
```bash
npm run dev
```
> Frontend จะทำงานที่ `http://localhost:5173`

---

## 🔑 บัญชีทดสอบระบบ (Demo Accounts)

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | สิทธิ์การใช้งาน |
| :--- | :--- | :--- | :--- |
| **ผู้ใช้งานทั่วไป (User)** | `test@test.com` | `1234` | จัดการกระเป๋ายาส่วนตัว (My Kit) และสร้าง/แก้ไข/ลบรายงานอาการของตนเอง |
| **ผู้ดูแลระบบ (Admin)** | `admin@medhub.com` | `admin1234` | เข้าถึงเมนู **จัดการระบบ (Admin)** เพื่อจัดการข้อมูลยาและตรวจสอบรายงานอาการทั้งหมด |

---

## 📚 แหล่งอ้างอิงข้อมูล (Data Attribution)
- ข้อมูลรายการยาและรายละเอียดทางเภสัชวิทยาเบื้องต้นอ้างอิงเพื่อการศึกษาจาก **@pharmacology.studies**

---

## 👨‍💻 ผู้พัฒนา
- **ณัฐชนน ด่านกิจยิ่งยง (Natchanon Dankijyingyong)** — รหัสนักศึกษา 1650701343