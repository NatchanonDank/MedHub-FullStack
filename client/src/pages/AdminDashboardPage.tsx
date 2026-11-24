import React, { useState } from 'react';
import { Navigate } from 'react-router';
import { useMedStore } from '../stores/useMedStore';
import {
  useMedications,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
  useSymptomReports,
  useUpdateSymptomReport,
  useDeleteSymptomReport,
} from '../hooks/useMedications';
import { type Medication, type ReportStatus, type SymptomReport } from '../api/medicationApi';

export function AdminDashboardPage() {
  const { user } = useMedStore();
  const [activeTab, setActiveTab] = useState<'medications' | 'reports'>('medications');

  // Guard: ป้องกันคนที่ไม่ใช่ ADMIN เข้าหน้านี้โดยตรงผ่าน URL
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Header */}
      <div className="bg-neutral text-neutral-content p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="badge badge-warning font-bold mb-2">ADMIN / PHARMACIST CONSOLE</div>
          <h1 className="text-2xl md:text-3xl font-bold">ระบบจัดการฐานข้อมูลยาและเฝ้าระวังอาการชุมชน</h1>
          <p className="text-sm opacity-80 mt-1">
            ผู้ดูแลระบบ: {user.name} ({user.email})
          </p>
        </div>
        <div className="tabs tabs-boxed bg-base-100/10 p-1">
          <button
            className={`tab font-semibold ${activeTab === 'medications' ? 'tab-active bg-primary text-white' : 'text-neutral-content'}`}
            onClick={() => setActiveTab('medications')}
          >
            จัดการคลังยา (Full CRUD)
          </button>
          <button
            className={`tab font-semibold ${activeTab === 'reports' ? 'tab-active bg-primary text-white' : 'text-neutral-content'}`}
            onClick={() => setActiveTab('reports')}
          >
            ตรวจสอบรายงานอาการ
          </button>
        </div>
      </div>

      {activeTab === 'medications' ? <AdminMedicationsManager /> : <AdminReportsManager />}
    </div>
  );
}

// ==========================================
// แท็บที่ 1: จัดการฐานข้อมูลยา (Create / Read / Update / Delete)
// ==========================================
function AdminMedicationsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading } = useMedications(searchTerm, '', 'A-Z');
  const medications = data?.results || [];

  const createMed = useCreateMedication();
  const updateMed = useUpdateMedication();
  const deleteMed = useDeleteMedication();

  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [strength, setStrength] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [category, setCategory] = useState('Analgesic');
  const [prescriptionType, setPrescriptionType] = useState('OTC');
  const [specialTag, setSpecialTag] = useState('');
  const [dosageInstruction, setDosageInstruction] = useState('');
  const [indicationsText, setIndicationsText] = useState('');
  const [sideEffectsText, setSideEffectsText] = useState('');
  const [warningsText, setWarningsText] = useState('');
  const [interactionsText, setInteractionsText] = useState('');
  const [pregnancyCategory, setPregnancyCategory] = useState('B');

  const openCreateForm = () => {
    setEditingMed(null);
    setName('');
    setGenericName('');
    setBrandName('Generic');
    setStrength('');
    setDosageForm('Tablet');
    setCategory('Analgesic');
    setPrescriptionType('OTC');
    setSpecialTag('');
    setDosageInstruction('');
    setIndicationsText('');
    setSideEffectsText('');
    setWarningsText('');
    setInteractionsText('');
    setPregnancyCategory('B');
    setIsFormOpen(true);
  };

  const openEditForm = (med: Medication) => {
    setEditingMed(med);
    setName(med.name);
    setGenericName(med.genericName);
    setBrandName(med.brandName || '');
    setStrength(med.strength || '');
    setDosageForm(med.dosageForm || 'Tablet');
    setCategory(med.category);
    setPrescriptionType(med.prescriptionType || 'Rx');
    setSpecialTag(med.specialTag || '');
    setDosageInstruction(med.dosageInstruction || '');
    setIndicationsText(med.indications.join(', '));
    setSideEffectsText(med.sideEffects.join(', '));
    setWarningsText(med.warnings.join(', '));
    setInteractionsText(med.interactions.join(', '));
    setPregnancyCategory(med.pregnancyCategory || 'C');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const splitCsv = (text: string) =>
    text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      genericName,
      brandName,
      strength,
      dosageForm,
      category,
      prescriptionType,
      specialTag,
      dosageInstruction,
      indications: splitCsv(indicationsText),
      sideEffects: splitCsv(sideEffectsText),
      warnings: splitCsv(warningsText),
      interactions: splitCsv(interactionsText),
      pregnancyCategory,
    };

    try {
      if (editingMed) {
        await updateMed.mutateAsync({ id: editingMed.id, payload });
      } else {
        await createMed.mutateAsync(payload);
      }
      setIsFormOpen(false);
      setEditingMed(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleDelete = async (med: Medication) => {
    if (!window.confirm(`ยืนยันการลบยา "${med.name}" ออกจากฐานข้อมูลใช่หรือไม่?`)) return;
    await deleteMed.mutateAsync(med.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <input
          type="text"
          placeholder="ค้นหาชื่อยาในระบบจัดการ..."
          className="input input-bordered w-full max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={openCreateForm} className="btn btn-primary">
          + เพิ่มรายการยาใหม่
        </button>
      </div>

      {/* Form เพิ่ม / แก้ไขยา */}
      {isFormOpen && (
        <div className="bg-base-100 p-6 rounded-2xl shadow-md border-2 border-primary/30 space-y-4">
          <h2 className="text-xl font-bold">
            {editingMed ? `แก้ไขข้อมูลยา: ${editingMed.name} (${editingMed.id})` : 'เพิ่มข้อมูลยาใหม่เข้าสู่ฐานข้อมูล'}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label font-medium">ชื่อยา (Name) *</label>
              <input className="input input-bordered" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-control">
              <label className="label font-medium">ชื่อสามัญ (Generic Name) *</label>
              <input className="input input-bordered" value={genericName} onChange={(e) => setGenericName(e.target.value)} required />
            </div>
            <div className="form-control">
              <label className="label font-medium">หมวดหมู่ (Category) *</label>
              <input className="input input-bordered" value={category} onChange={(e) => setCategory(e.target.value)} required />
            </div>
            <div className="form-control">
              <label className="label font-medium">ยี่ห้อ (Brand Name)</label>
              <input className="input input-bordered" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label font-medium">ความแรง (Strength)</label>
              <input className="input input-bordered" placeholder="เช่น 500 mg" value={strength} onChange={(e) => setStrength(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label font-medium">รูปแบบยา (Dosage Form)</label>
              <input className="input input-bordered" placeholder="เช่น Tablet, Capsule" value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label font-medium">ประเภทยา (Rx / OTC)</label>
              <select className="select select-bordered" value={prescriptionType} onChange={(e) => setPrescriptionType(e.target.value)}>
                <option value="OTC">OTC (ยาสามัญ/ซื้อได้ทั่วไป)</option>
                <option value="Rx">Rx (ยาควบคุม/ต้องมีใบสั่งแพทย์)</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label font-medium">ป้ายกำกับพิเศษ (Special Tag)</label>
              <input className="input input-bordered" placeholder="เช่น ทานหลังอาหารทันที" value={specialTag} onChange={(e) => setSpecialTag(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label font-medium">ระดับความปลอดภัยหญิงตั้งครรภ์</label>
              <input className="input input-bordered" placeholder="A, B, C, D, X" value={pregnancyCategory} onChange={(e) => setPregnancyCategory(e.target.value)} />
            </div>
            <div className="form-control md:col-span-3">
              <label className="label font-medium">วิธีใช้ยา (Dosage Instruction)</label>
              <input className="input input-bordered" value={dosageInstruction} onChange={(e) => setDosageInstruction(e.target.value)} />
            </div>
            <div className="form-control md:col-span-3">
              <label className="label font-medium">ข้อบ่งใช้ (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input className="input input-bordered" placeholder="ลดไข้, บรรเทาปวด" value={indicationsText} onChange={(e) => setIndicationsText(e.target.value)} />
            </div>
            <div className="form-control md:col-span-3">
              <label className="label font-medium">ผลข้างเคียง (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input className="input input-bordered" placeholder="ง่วงซึม, คลื่นไส้" value={sideEffectsText} onChange={(e) => setSideEffectsText(e.target.value)} />
            </div>
            <div className="form-control md:col-span-3">
              <label className="label font-medium">คำเตือน (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input className="input input-bordered" value={warningsText} onChange={(e) => setWarningsText(e.target.value)} />
            </div>
            <div className="form-control md:col-span-3">
              <label className="label font-medium">ปฏิกิริยาระหว่างยา (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input className="input input-bordered" placeholder="Warfarin, Aspirin" value={interactionsText} onChange={(e) => setInteractionsText(e.target.value)} />
            </div>

            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-ghost">
                ยกเลิก
              </button>
              <button type="submit" disabled={createMed.isPending || updateMed.isPending} className="btn btn-primary">
                บันทึกข้อมูลยา
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ตารางรายการยาทั้งหมด */}
      <div className="overflow-x-auto bg-base-100 rounded-2xl shadow-sm border border-base-300">
        {isLoading ? (
          <div className="p-8 text-center">กำลังโหลดข้อมูลคลังยา...</div>
        ) : (
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อยา</th>
                <th>ชื่อสามัญ</th>
                <th>หมวดหมู่</th>
                <th>ประเภท</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med) => (
                <tr key={med.id}>
                  <td className="font-mono text-xs">{med.id}</td>
                  <td className="font-bold">{med.name}</td>
                  <td>{med.genericName}</td>
                  <td><span className="badge badge-ghost">{med.category}</span></td>
                  <td><span className="badge badge-outline">{med.prescriptionType || 'Rx'}</span></td>
                  <td className="text-right space-x-2">
                    <button onClick={() => openEditForm(med)} className="btn btn-xs btn-info text-white">
                      แก้ไข
                    </button>
                    <button onClick={() => handleDelete(med)} className="btn btn-xs btn-error text-white">
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// แท็บที่ 2: ตรวจสอบและตอบกลับรายงานอาการจากผู้ใช้ทุกคน
// ==========================================
function AdminReportsManager() {
  const { data: reports = [], isLoading } = useSymptomReports();
  const updateReport = useUpdateSymptomReport();
  const deleteReport = useDeleteSymptomReport();

  const [selectedReport, setSelectedReport] = useState<SymptomReport | null>(null);
  const [status, setStatus] = useState<ReportStatus>('REVIEWED');
  const [adminNote, setAdminNote] = useState('');

  const openReviewBox = (report: SymptomReport) => {
    setSelectedReport(report);
    setStatus(report.status);
    setAdminNote(report.adminNote || '');
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    await updateReport.mutateAsync({
      id: selectedReport.id,
      payload: { status, adminNote },
    });
    setSelectedReport(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบรายงานอาการนี้?')) return;
    await deleteReport.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      {selectedReport && (
        <div className="bg-base-100 p-6 rounded-2xl shadow-md border-2 border-primary">
          <h3 className="text-lg font-bold mb-2">
            ประเมินและให้คำแนะนำรายงาน #{selectedReport.id} ({selectedReport.medication.name})
          </h3>
          <p className="text-sm mb-4 text-base-content/80">
            ผู้แจ้ง: <strong>{selectedReport.user.name}</strong> | อาการ: <strong>{selectedReport.symptom}</strong>
          </p>
          <form onSubmit={handleSaveReview} className="space-y-4">
            <div className="form-control max-w-xs">
              <label className="label font-medium">สถานะการตรวจสอบ</label>
              <select
                className="select select-bordered"
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
              >
                <option value="PENDING">รอการตรวจสอบ (PENDING)</option>
                <option value="REVIEWED">เภสัชกรตรวจสอบแล้ว (REVIEWED)</option>
                <option value="RESOLVED">ดำเนินการเสร็จสิ้น (RESOLVED)</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label font-medium">คำแนะนำจากเภสัชกร / ผู้ดูแลระบบ (แสดงให้ผู้ใช้เห็น)</label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="พิมพ์คำแนะนำการปฏิบัติตัวเบื้องต้นหรือคำเตือนให้ผู้ป่วย..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedReport(null)} className="btn btn-ghost">
                ยกเลิก
              </button>
              <button type="submit" disabled={updateReport.isPending} className="btn btn-primary">
                บันทึกผลการตรวจสอบ
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center">กำลังโหลดรายงานอาการทั้งหมด...</div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>ผู้แจ้ง</th>
                <th>ตัวยา</th>
                <th>อาการ & ความรุนแรง</th>
                <th>สถานะ</th>
                <th className="text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>
                    <div className="font-semibold">{r.user.name}</div>
                    <div className="text-xs opacity-60">{r.user.email}</div>
                  </td>
                  <td className="font-bold text-primary">{r.medication.name}</td>
                  <td>
                    <div>{r.symptom}</div>
                    <span
                      className={`badge badge-xs mt-1 ${
                        r.severity === 'SEVERE'
                          ? 'badge-error text-white'
                          : r.severity === 'MODERATE'
                          ? 'badge-warning'
                          : 'badge-info text-white'
                      }`}
                    >
                      {r.severity}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-outline">{r.status}</span>
                  </td>
                  <td className="text-right space-x-2">
                    <button onClick={() => openReviewBox(r)} className="btn btn-xs btn-primary">
                      ตอบกลับ / เปลี่ยนสถานะ
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="btn btn-xs btn-ghost text-error">
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}