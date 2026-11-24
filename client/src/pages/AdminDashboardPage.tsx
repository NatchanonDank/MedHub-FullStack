import React, { useState } from 'react';
import { Link } from 'react-router';
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
import {
  type Medication,
  type MedicationPayload,
  type ReportStatus,
  type SymptomReport,
} from '../api/medicationApi';

const CATEGORIES = [
  'Analgesic',
  'NSAID',
  'Antibiotic',
  'Antifungal',
  'Anticoagulant',
  'Antiplatelet',
  'Cardiovascular',
  'Antidiabetic',
  'Gastrointestinal',
  'Respiratory',
  'Psychiatric',
  'Antihistamine',
  'Endocrine',
  'Corticosteroid',
  'Immunosuppressant',
  'Antigout',
  'Urological',
  'Antimigraine',
  'Antidote',
];

const emptyForm: MedicationPayload = {
  name: '',
  genericName: '',
  brandName: '',
  strength: '',
  dosageForm: 'Tablet',
  category: 'Analgesic',
  prescriptionType: 'Rx',
  specialTag: '',
  dosageInstruction: '',
  appearance: '',
  indications: [],
  sideEffects: [],
  warnings: [],
  interactions: [],
  pregnancyCategory: 'C',
  imageUrl: '',
};

export function AdminDashboardPage() {
  const { user, openAuthModal } = useMedStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'medications' | 'reports'>('medications');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: medData, isLoading: loadingMeds } = useMedications(searchTerm, '', 'A-Z');
  const rawMedications = medData?.results || [];
  const medications = rawMedications.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      (m.brandName || '').toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  });

  const createMedMutation = useCreateMedication();
  const updateMedMutation = useUpdateMedication();
  const deleteMedMutation = useDeleteMedication();

  const { data: allReports = [], isLoading: loadingReports } = useSymptomReports();
  const updateReportMutation = useUpdateSymptomReport();
  const deleteReportMutation = useDeleteSymptomReport();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MedicationPayload>(emptyForm);
  const [indicationsText, setIndicationsText] = useState('');
  const [sideEffectsText, setSideEffectsText] = useState('');
  const [warningsText, setWarningsText] = useState('');
  const [interactionsText, setInteractionsText] = useState('');

  const [reviewingReport, setReviewingReport] = useState<SymptomReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>('REVIEWED');
  const [adminNoteInput, setAdminNoteInput] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-14 p-8 bg-base-100 rounded-2xl shadow-md border border-base-300 text-center">
        <h2 className="text-2xl font-bold mb-2">สำหรับผู้ดูแลระบบ (Admin Only)</h2>
        <p className="text-base-content/70 mb-6">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบเพื่อจัดการข้อมูล</p>
        <button onClick={openAuthModal} className="btn btn-primary px-8">
          เข้าสู่ระบบ
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-14 p-8 bg-base-100 rounded-2xl shadow-md border border-error/40 text-center">
        <h2 className="text-2xl font-bold text-error mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-base-content/70 mb-6">
          บัญชีของคุณ ({user.email}) มีสิทธิ์เป็นผู้ใช้งานทั่วไป ไม่สามารถเข้าถึงระบบจัดการหลังบ้านได้
        </p>
        <Link to="/" className="btn btn-outline">
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingMedId(null);
    setFormData(emptyForm);
    setIndicationsText('');
    setSideEffectsText('');
    setWarningsText('');
    setInteractionsText('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (med: Medication) => {
    setEditingMedId(med.id);
    setFormData({
      name: med.name,
      genericName: med.genericName,
      brandName: med.brandName || '',
      strength: med.strength || '',
      dosageForm: med.dosageForm || 'Tablet',
      category: med.category,
      prescriptionType: med.prescriptionType || 'Rx',
      specialTag: med.specialTag || '',
      dosageInstruction: med.dosageInstruction || '',
      appearance: med.appearance || '',
      indications: med.indications || [],
      sideEffects: med.sideEffects || [],
      warnings: med.warnings || [],
      interactions: med.interactions || [],
      pregnancyCategory: med.pregnancyCategory || 'C',
      imageUrl: med.imageUrl || '',
    });
    setIndicationsText((med.indications || []).join(', '));
    setSideEffectsText((med.sideEffects || []).join(', '));
    setWarningsText((med.warnings || []).join(', '));
    setInteractionsText((med.interactions || []).join(', '));
    setIsFormOpen(true);
  };

  const splitCommaList = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: MedicationPayload = {
      ...formData,
      indications: splitCommaList(indicationsText),
      sideEffects: splitCommaList(sideEffectsText),
      warnings: splitCommaList(warningsText),
      interactions: splitCommaList(interactionsText),
    };

    try {
      if (editingMedId) {
        await updateMedMutation.mutateAsync({ id: editingMedId, payload });
        showToast('success', `อัปเดตข้อมูลยา "${payload.name}" เรียบร้อยแล้ว`);
      } else {
        await createMedMutation.mutateAsync(payload);
        showToast('success', `เพิ่มยาใหม่ "${payload.name}" เข้าระบบเรียบร้อยแล้ว`);
      }
      setIsFormOpen(false);
      setEditingMedId(null);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลยา');
    }
  };

  const handleDeleteMedication = async (med: Medication) => {
    if (!window.confirm(`ยืนยันการลบยา "${med.name}" (${med.id}) ออกจากฐานข้อมูลถาวรใช่หรือไม่?`)) {
      return;
    }
    try {
      await deleteMedMutation.mutateAsync(med.id);
      showToast('success', `ลบยา "${med.name}" ออกจากระบบแล้ว`);
    } catch {
      showToast('error', 'ไม่สามารถลบข้อมูลยาได้');
    }
  };

  const handleOpenReview = (report: SymptomReport) => {
    setReviewingReport(report);
    setReviewStatus(report.status === 'PENDING' ? 'REVIEWED' : report.status);
    setAdminNoteInput(report.adminNote || '');
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingReport) return;
    try {
      await updateReportMutation.mutateAsync({
        id: reviewingReport.id,
        payload: {
          status: reviewStatus,
          adminNote: adminNoteInput.trim(),
        },
      });
      showToast('success', `บันทึกผลการตรวจสอบรายงาน #${reviewingReport.id} เรียบร้อยแล้ว`);
      setReviewingReport(null);
    } catch {
      showToast('error', 'ไม่สามารถอัปเดตสถานะรายงานได้');
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!window.confirm(`ยืนยันการลบรายงานอาการ #${id} ใช่หรือไม่?`)) return;
    try {
      await deleteReportMutation.mutateAsync(id);
      showToast('success', `ลบรายงาน #${id} เรียบร้อยแล้ว`);
    } catch {
      showToast('error', 'ไม่สามารถลบรายงานได้');
    }
  };

  const filteredReports =
    statusFilter === 'ALL'
      ? allReports
      : allReports.filter((r) => r.status === statusFilter);

  const pendingCount = allReports.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-base-100 p-6 rounded-2xl border border-warning/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="badge badge-warning px-3 py-2.5 font-bold tracking-wide">
              ADMIN CONSOLE
            </span>
            <span className="text-xs text-base-content/60">เข้าสู่ระบบโดย: {user.name}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">ระบบจัดการฐานข้อมูลยาและรายงานชุมชน</h1>
        </div>

        <div className="flex gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <div className="text-xs text-base-content/70">รายการยาทั้งหมด</div>
            <div className="text-xl font-extrabold text-primary">{medications.length}</div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-warning/10 border border-warning/30 text-center">
            <div className="text-xs text-base-content/70">รายงานรอตรวจสอบ</div>
            <div className="text-xl font-extrabold text-warning">{pendingCount}</div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`alert ${
            toast.type === 'success' ? 'alert-success text-white' : 'alert-error text-white'
          } shadow-md`}
        >
          <span>{toast.text}</span>
        </div>
      )}

      <div className="tabs tabs-boxed bg-base-100 p-1.5 border border-base-300 w-fit">
        <button
          type="button"
          className={`tab tab-lg font-semibold ${activeTab === 'medications' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('medications')}
        >
          จัดการฐานข้อมูลยา ({medications.length})
        </button>
        <button
          type="button"
          className={`tab tab-lg font-semibold ${activeTab === 'reports' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          ตรวจสอบรายงานอาการผู้ใช้ ({allReports.length})
          {pendingCount > 0 && (
            <span className="badge badge-error badge-sm px-2 text-white ml-2">{pendingCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'medications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3 bg-base-100 p-4 rounded-2xl border border-base-300">
            <input
              type="text"
              placeholder="ค้นหาชื่อยา, ชื่อสามัญ, ชื่อการค้า..."
              className="input input-bordered w-full sm:max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="button" onClick={handleOpenCreate} className="btn btn-primary">
              + เพิ่มข้อมูลยาใหม่
            </button>
          </div>

          {isFormOpen && (
            <div className="card bg-base-100 border-2 border-primary shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-4">
                  <h2 className="card-title text-xl text-primary">
                    {editingMedId ? `แก้ไขข้อมูลยา (${editingMedId})` : 'เพิ่มรายการยาใหม่เข้าระบบ'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="btn btn-sm btn-circle btn-ghost"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveMedication} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">ชื่อยาแสดงผล (Name) *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น Paracetamol 500mg"
                        className="input input-bordered"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">ชื่อสามัญทางยา (Generic Name) *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น Paracetamol"
                        className="input input-bordered"
                        value={formData.genericName}
                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">ชื่อการค้า (Brand Name)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น Tylenol, Sara"
                        className="input input-bordered"
                        value={formData.brandName || ''}
                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">หมวดหมู่ยา (Category) *</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">ความแรง (Strength)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น 500 mg"
                        className="input input-bordered"
                        value={formData.strength || ''}
                        onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">รูปแบบยา (Dosage Form)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น Tablet, Capsule, Syrup"
                        className="input input-bordered"
                        value={formData.dosageForm || ''}
                        onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">ประเภทยา / Pregnancy</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          className="select select-bordered w-1/2"
                          value={formData.prescriptionType || 'Rx'}
                          onChange={(e) =>
                            setFormData({ ...formData, prescriptionType: e.target.value })
                          }
                        >
                          <option value="OTC">OTC</option>
                          <option value="Rx">Rx</option>
                          <option value="Dangerous Drug">ยาอันตราย</option>
                        </select>
                        <select
                          className="select select-bordered w-1/2"
                          value={formData.pregnancyCategory || 'C'}
                          onChange={(e) =>
                            setFormData({ ...formData, pregnancyCategory: e.target.value })
                          }
                        >
                          <option value="A">Cat A</option>
                          <option value="B">Cat B</option>
                          <option value="C">Cat C</option>
                          <option value="D">Cat D</option>
                          <option value="X">Cat X</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">วิธีรับประทาน / ขนาดยา</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น รับประทานครั้งละ 1 เม็ด ทุก 4-6 ชั่วโมง เมื่อมีอาการ"
                        className="input input-bordered"
                        value={formData.dosageInstruction || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, dosageInstruction: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">พาธรูปภาพ (Image URL)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="/images/paracetamol.png หรือ URL รูปภาพ"
                        className="input input-bordered"
                        value={formData.imageUrl || ''}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          ข้อบ่งใช้ (คั่นแต่ละข้อด้วยเครื่องหมายจุลภาค ,)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="ลดไข้, บรรเทาอาการปวดศีรษะ, ปวดกล้ามเนื้อ"
                        className="input input-bordered"
                        value={indicationsText}
                        onChange={(e) => setIndicationsText(e.target.value)}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          ผลข้างเคียง (คั่นแต่ละข้อด้วยเครื่องหมายจุลภาค ,)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="คลื่นไส้, ผื่นแพ้ยา, พิษต่อตับหากใช้เกินขนาด"
                        className="input input-bordered"
                        value={sideEffectsText}
                        onChange={(e) => setSideEffectsText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          คำเตือนสำคัญ (คั่นแต่ละข้อด้วยเครื่องหมายจุลภาค ,)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="ห้ามใช้เกิน 4,000 มก./วัน, ระวังในผู้ป่วยโรคตับ"
                        className="input input-bordered"
                        value={warningsText}
                        onChange={(e) => setWarningsText(e.target.value)}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">
                          ปฏิกิริยาระหว่างยา (คั่นแต่ละข้อด้วยเครื่องหมายจุลภาค ,)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="Warfarin, แอลกอฮอล์"
                        className="input input-bordered"
                        value={interactionsText}
                        onChange={(e) => setInteractionsText(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-base-200">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="btn btn-outline"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-6"
                      disabled={createMedMutation.isPending || updateMedMutation.isPending}
                    >
                      {editingMedId ? 'บันทึกการแก้ไขข้อมูลยา' : 'เพิ่มยาเข้าระบบ'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-base-100 rounded-2xl border border-base-300 overflow-x-auto shadow-sm">
            {loadingMeds ? (
              <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : (
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-200 text-base-content">
                    <th>รหัส</th>
                    <th>ชื่อยา / ชื่อสามัญ</th>
                    <th>หมวดหมู่</th>
                    <th>ความแรง / รูปแบบ</th>
                    <th>ประเภท</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((med) => (
                    <tr key={med.id} className="hover">
                      <td className="font-mono text-xs opacity-70">{med.id}</td>
                      <td>
                        <div className="font-bold text-base-content">{med.name}</div>
                        <div className="text-xs text-base-content/60">
                          {med.genericName} {med.brandName ? `(${med.brandName})` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-outline badge-sm px-2.5">{med.category}</span>
                      </td>
                      <td className="text-sm">
                        {med.strength || '-'} / {med.dosageForm || '-'}
                      </td>
                      <td>
                        <span className="badge badge-ghost badge-sm px-2.5">
                          {med.prescriptionType}
                        </span>
                      </td>
                      <td className="text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(med)}
                          className="btn btn-xs btn-info text-white"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedication(med)}
                          className="btn btn-xs btn-error text-white"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                  {medications.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-base-content/60">
                        ไม่พบข้อมูลยาที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 bg-base-100 p-4 rounded-2xl border border-base-300">
            <span className="text-sm font-semibold mr-2">กรองตามสถานะ:</span>
            {(['ALL', 'PENDING', 'REVIEWED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`btn btn-sm ${
                  statusFilter === st ? 'btn-primary' : 'btn-outline border-base-300'
                }`}
              >
                {st === 'ALL'
                  ? `ทั้งหมด (${allReports.length})`
                  : st === 'PENDING'
                  ? 'รอตรวจสอบ'
                  : st === 'REVIEWED'
                  ? 'ตรวจสอบแล้ว'
                  : 'ให้คำแนะนำแล้ว'}
              </button>
            ))}
          </div>

          {reviewingReport && (
            <div className="card bg-base-100 border-2 border-warning shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-3">
                  <h3 className="card-title text-lg">
                    ประเมินและตอบกลับรายงานอาการ #{reviewingReport.id} — {reviewingReport.medication.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setReviewingReport(null)}
                    className="btn btn-sm btn-circle btn-ghost"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-base-200/70 p-3.5 rounded-xl text-sm space-y-1 mb-4">
                  <p>
                    <span className="font-semibold">ผู้แจ้ง:</span> {reviewingReport.user.name} (
                    {reviewingReport.user.email})
                  </p>
                  <p>
                    <span className="font-semibold">อาการที่พบ:</span> {reviewingReport.symptom} (ระดับ:{' '}
                    {reviewingReport.severity})
                  </p>
                  {reviewingReport.description && (
                    <p>
                      <span className="font-semibold">รายละเอียด:</span> {reviewingReport.description}
                    </p>
                  )}
                </div>

                <form onSubmit={handleSaveReview} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">ปรับสถานะการตรวจสอบ</span>
                    </label>
                    <select
                      className="select select-bordered w-full max-w-xs"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as ReportStatus)}
                    >
                      <option value="PENDING">PENDING — รอการตรวจสอบ</option>
                      <option value="REVIEWED">REVIEWED — เภสัชกรตรวจสอบแล้ว</option>
                      <option value="RESOLVED">RESOLVED — ให้คำแนะนำเรียบร้อย</option>
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        คำแนะนำจากเภสัชกร / ผู้ดูแลระบบ (จะแสดงให้ผู้ใช้เห็นในการ์ดรายงาน)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="เช่น แนะนำให้รับประทานยาหลังอาหารทันทีเพื่อลดอาการระคายเคืองกระเพาะ หากมีผื่นขึ้นลามให้หยุดยาและพบแพทย์..."
                      className="textarea textarea-bordered w-full"
                      value={adminNoteInput}
                      onChange={(e) => setAdminNoteInput(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewingReport(null)}
                      className="btn btn-outline"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="btn btn-warning font-bold"
                      disabled={updateReportMutation.isPending}
                    >
                      บันทึกผลการตรวจสอบ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loadingReports ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-base-100 p-10 rounded-2xl border border-base-300 text-center text-base-content/60">
              ไม่มีรายการรายงานอาการในหมวดหมู่นี้
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredReports.map((report) => (
                <div key={report.id} className="card bg-base-100 border border-base-300 shadow-sm">
                  <div className="card-body p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs opacity-60">#{report.id}</span>
                          <span className="font-bold text-lg text-primary">
                            {report.medication.name}
                          </span>
                          <span
                            className={`badge px-3 py-2.5 text-white font-semibold tracking-wide ${
                              report.severity === 'SEVERE'
                                ? 'badge-error'
                                : report.severity === 'MODERATE'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                          >
                            {report.severity}
                          </span>
                          <span
                            className={`badge px-3 py-2.5 font-semibold tracking-wide ${
                              report.status === 'RESOLVED'
                                ? 'badge-success text-white'
                                : report.status === 'REVIEWED'
                                ? 'badge-primary'
                                : 'badge-ghost'
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>

                        <p className="font-semibold text-base">อาการ: {report.symptom}</p>
                        {report.description && (
                          <p className="text-sm text-base-content/75">{report.description}</p>
                        )}
                        <p className="text-xs text-base-content/60 pt-1">
                          ผู้รายงาน: <span className="font-semibold">{report.user.name}</span> (
                          {report.user.email}) •{' '}
                          {new Date(report.createdAt).toLocaleString('th-TH')}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(report)}
                          className="btn btn-sm btn-warning font-bold"
                        >
                          ตรวจสอบ / ตอบกลับ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(report.id)}
                          className="btn btn-sm btn-outline btn-error"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>

                    {report.adminNote && (
                      <div className="mt-3 p-3 rounded-xl bg-success/10 border border-success/30 text-sm">
                        <span className="font-bold text-success">คำแนะนำที่บันทึกไว้: </span>
                        <span>{report.adminNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}