import React, { useState } from 'react';
import { useMedStore } from '../stores/useMedStore';
import {
  useMedications,
  useSymptomReports,
  useCreateSymptomReport,
  useUpdateSymptomReport,
  useDeleteSymptomReport,
} from '../hooks/useMedications';
import { type SeverityLevel, type SymptomReport } from '../api/medicationApi';

export function SymptomReportPage() {
  const { user, openAuthModal } = useMedStore();
  const { data: medData } = useMedications('', '', 'A-Z');
  const medications = medData?.results || [];

  const { data: reports = [], isLoading, isError } = useSymptomReports(user?.id);
  const createMutation = useCreateSymptomReport();
  const updateMutation = useUpdateSymptomReport();
  const deleteMutation = useDeleteSymptomReport();

  const [medicationId, setMedicationId] = useState('');
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('MILD');
  const [description, setDescription] = useState('');
  const [editingReport, setEditingReport] = useState<SymptomReport | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-base-100 rounded-2xl shadow-sm border border-base-300 text-center">
        <h2 className="text-2xl font-bold mb-2">ระบบรายงานอาการไม่พึงประสงค์จากการใช้ยา</h2>
        <p className="text-base-content/70 mb-6">
          กรุณาเข้าสู่ระบบเพื่อบันทึกอาการผิดปกติที่พบหลังใช้ยา และติดตามคำแนะนำจากเภสัชกรชุมชน
        </p>
        <button onClick={openAuthModal} className="btn btn-primary">
          เข้าสู่ระบบ / สมัครสมาชิก
        </button>
      </div>
    );
  }

  const resetForm = () => {
    setMedicationId('');
    setSymptom('');
    setSeverity('MILD');
    setDescription('');
    setEditingReport(null);
  };

  const handleEditClick = (report: SymptomReport) => {
    setEditingReport(report);
    setMedicationId(report.medicationId);
    setSymptom(report.symptom);
    setSeverity(report.severity);
    setDescription(report.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationId || !symptom.trim()) return;

    try {
      if (editingReport) {
        await updateMutation.mutateAsync({
          id: editingReport.id,
          payload: { medicationId, symptom, severity, description },
        });
        setFeedbackMsg('แก้ไขข้อมูลรายงานอาการเรียบร้อยแล้ว');
      } else {
        await createMutation.mutateAsync({
          userId: user.id,
          medicationId,
          symptom,
          severity,
          description,
        });
        setFeedbackMsg('ส่งรายงานอาการเข้าสู่ระบบเฝ้าระวังชุมชนเรียบร้อยแล้ว');
      }
      resetForm();
      setTimeout(() => setFeedbackMsg(''), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบรายงานอาการนี้ใช่หรือไม่?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const severityBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'SEVERE':
        return <span className="badge badge-error text-white">รุนแรง (Severe)</span>;
      case 'MODERATE':
        return <span className="badge badge-warning">ปานกลาง (Moderate)</span>;
      default:
        return <span className="badge badge-info text-white">เล็กน้อย (Mild)</span>;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="badge badge-success text-white">ดำเนินการเสร็จสิ้น</span>;
      case 'REVIEWED':
        return <span className="badge badge-primary">เภสัชกรตรวจสอบแล้ว</span>;
      default:
        return <span className="badge badge-ghost">รอการตรวจสอบ</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-2xl border border-primary/20">
        <h1 className="text-2xl md:text-3xl font-bold text-base-content">
          รายงานอาการไม่พึงประสงค์จากการใช้ยา (Community Pharmacovigilance)
        </h1>
        <p className="text-base-content/75 mt-2">
          ร่วมสร้างความปลอดภัยในการใช้ยาให้แก่ชุมชน หากพบอาการข้างเคียงผิดปกติหลังทานยา สามารถบันทึกข้อมูลเพื่อให้เภสัชกรตรวจสอบและให้คำแนะนำเบื้องต้นได้ทันที
        </p>
      </div>

      {feedbackMsg && (
        <div className="alert alert-success shadow-sm">
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Form สร้าง / แก้ไขรายงาน */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300">
        <h2 className="text-xl font-bold mb-4">
          {editingReport ? `แก้ไขรายงานอาการ #${editingReport.id}` : 'แบบฟอร์มแจ้งอาการข้างเคียงใหม่'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label font-medium">เลือกตัวยาที่รับประทาน *</label>
            <select
              className="select select-bordered w-full"
              value={medicationId}
              onChange={(e) => setMedicationId(e.target.value)}
              required
            >
              <option value="">-- เลือกยาจากฐานข้อมูล --</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} ({med.genericName})
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label font-medium">ระดับความรุนแรงของอาการ *</label>
            <select
              className="select select-bordered w-full"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
            >
              <option value="MILD">เล็กน้อย (Mild) - เช่น ง่วงซึม ปากแห้งเล็กน้อย</option>
              <option value="MODERATE">ปานกลาง (Moderate) - เช่น แสบท้อง คลื่นไส้ ผื่นขึ้น</option>
              <option value="SEVERE">รุนแรง (Severe) - เช่น หายใจลำบาก ใจสั่นรุนแรง บวมตามใบหน้า</option>
            </select>
          </div>

          <div className="form-control md:col-span-2">
            <label className="label font-medium">อาการผิดปกติที่พบ *</label>
            <input
              type="text"
              placeholder="เช่น มีผื่นแดงขึ้นตามแขน, แสบท้องหลังทานยา 30 นาที, ใจสั่น..."
              className="input input-bordered w-full"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              required
            />
          </div>

          <div className="form-control md:col-span-2">
            <label className="label font-medium">รายละเอียดเพิ่มเติม (ช่วงเวลาที่ทาน / อาหารที่ทานร่วมด้วย)</label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="ระบุรายละเอียดเพิ่มเติมเพื่อช่วยให้เภสัชกรประเมินอาการได้แม่นยำขึ้น..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex gap-3 justify-end">
            {editingReport && (
              <button type="button" onClick={resetForm} className="btn btn-ghost">
                ยกเลิกการแก้ไข
              </button>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn btn-primary"
            >
              {editingReport ? 'บันทึกการแก้ไข' : 'ส่งรายงานอาการ'}
            </button>
          </div>
        </form>
      </div>

      {/* รายการประวัติการรายงานของผู้ใช้ */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">ประวัติการรายงานอาการของคุณ ({reports.length} รายการ)</h2>

        {isLoading && <div className="skeleton h-32 w-full rounded-xl" />}
        {isError && <div className="alert alert-error">ไม่สามารถโหลดข้อมูลรายงานได้</div>}

        {!isLoading && reports.length === 0 && (
          <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-300 text-base-content/60">
            คุณยังไม่มีประวัติการรายงานอาการไม่พึงประสงค์
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg text-primary">{report.medication.name}</span>
                  <span className="text-sm text-base-content/60">({report.medication.genericName})</span>
                  {severityBadge(report.severity)}
                  {statusBadge(report.status)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(report)}
                    className="btn btn-xs btn-outline btn-info"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="btn btn-xs btn-outline btn-error"
                  >
                    ลบ
                  </button>
                </div>
              </div>

              <div>
                <p className="font-semibold text-base-content">อาการที่พบ: {report.symptom}</p>
                {report.description && (
                  <p className="text-sm text-base-content/75 mt-1">{report.description}</p>
                )}
              </div>

              {report.adminNote && (
                <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-xl text-sm">
                  <span className="font-bold text-primary block mb-1">คำแนะนำจากเภสัชกร / ผู้ดูแลระบบ:</span>
                  <span>{report.adminNote}</span>
                </div>
              )}

              <div className="text-xs text-base-content/50">
                วันที่แจ้ง: {new Date(report.createdAt).toLocaleString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}