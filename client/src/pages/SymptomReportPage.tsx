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
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-base-100 rounded-2xl shadow-md border border-base-300 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl">
          🩺
        </div>
        <h2 className="text-2xl font-bold mb-2">เข้าสู่ระบบเพื่อแจ้งอาการไม่พึงประสงค์จากการใช้ยา</h2>
        <p className="text-base-content/70 mb-6">
          กรุณาเข้าสู่ระบบเพื่อบันทึกอาการข้างเคียงหลังทานยา และติดตามคำแนะนำจากเภสัชกรประจำระบบ
        </p>
        <button onClick={openAuthModal} className="btn btn-primary px-8">
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
    setFeedbackMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationId || !symptom.trim()) return;
    setFeedbackMsg(null);

    try {
      if (editingReport) {
        await updateMutation.mutateAsync({
          id: editingReport.id,
          payload: {
            medicationId,
            symptom: symptom.trim(),
            severity,
            description: description.trim(),
          },
        });
        setFeedbackMsg({ type: 'success', text: 'อัปเดตข้อมูลรายงานอาการเรียบร้อยแล้ว' });
      } else {
        await createMutation.mutateAsync({
          userId: user.id,
          medicationId,
          symptom: symptom.trim(),
          severity,
          description: description.trim(),
        });
        setFeedbackMsg({ type: 'success', text: 'ส่งรายงานอาการไม่พึงประสงค์เรียบร้อยแล้ว' });
      }
      resetForm();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ยืนยันการลบรายงานอาการรายการนี้ใช่หรือไม่?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      if (editingReport?.id === id) resetForm();
      setFeedbackMsg({ type: 'success', text: 'ลบรายงานอาการเรียบร้อยแล้ว' });
    } catch {
      setFeedbackMsg({ type: 'error', text: 'ไม่สามารถลบรายงานอาการได้' });
    }
  };

const getSeverityBadge = (level: SeverityLevel) => {
    switch (level) {
      case 'SEVERE':
        return (
          <span className="badge badge-error px-3 py-2.5 text-white font-semibold">
            รุนแรง
          </span>
        );
      case 'MODERATE':
        return (
          <span className="badge badge-warning px-3 py-2.5 font-semibold">
            ปานกลาง
          </span>
        );
      default:
        return (
          <span className="badge badge-info px-3 py-2.5 text-white font-semibold">
            เล็กน้อย
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="badge badge-success px-3 py-2.5 text-white font-semibold">
            แก้ไข / ให้คำแนะนำแล้ว
          </span>
        );
      case 'REVIEWED':
        return (
          <span className="badge badge-primary px-3 py-2.5 font-semibold">
            เภสัชกรตรวจสอบแล้ว
          </span>
        );
      default:
        return (
          <span className="badge badge-ghost px-3 py-2.5 font-semibold">
            รอการตรวจสอบ
          </span>
        );
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary/15 via-base-200 to-secondary/15 p-6 md:p-8 rounded-2xl border border-base-300 text-left">
        <div className="badge badge-primary badge-outline px-3 py-2.5 mb-2 font-semibold">
          Community Pharmacovigilance
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-base-content text-left">
          รายงานอาการไม่พึงประสงค์จากการใช้ยา
        </h1>
        <p className="text-base-content/75 mt-2 max-w-2xl text-left mx-0">
          บันทึกอาการข้างเคียงที่พบหลังการใช้ยา เพื่อให้เภสัชกรและผู้ดูแลระบบช่วยประเมินความเสี่ยงและให้คำแนะนำเบื้องต้น
        </p>
      </div>

      {/* Form Section */}
      <div className="card bg-base-100 shadow-md border border-base-300">
        <div className="card-body">
          <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-4">
            <h2 className="card-title text-xl">
              {editingReport ? `แก้ไขรายงานอาการ (#${editingReport.id})` : 'แบบฟอร์มแจ้งอาการข้างเคียงใหม่'}
            </h2>
            {editingReport && (
              <button type="button" onClick={resetForm} className="btn btn-sm btn-ghost text-error">
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>

          {feedbackMsg && (
            <div
              className={`alert ${
                feedbackMsg.type === 'success' ? 'alert-success text-white' : 'alert-error text-white'
              } text-sm py-2.5 mb-4`}
            >
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">เลือกตัวยาที่รับประทาน *</span>
                </label>
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
                <label className="label">
                  <span className="label-text font-semibold">ระดับความรุนแรงของอาการ *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                >
                  <option value="MILD">เล็กน้อย (Mild) - เช่น ง่วงซึม ปากแห้งเล็กน้อย</option>
                  <option value="MODERATE">ปานกลาง (Moderate) - เช่น คลื่นไส้ เวียนศีรษะ แสบท้อง</option>
                  <option value="SEVERE">รุนแรง (Severe) - เช่น ผื่นลมพิษ หายใจลำบาก บวม</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">อาการผิดปกติที่พบ *</span>
              </label>
              <input
                type="text"
                placeholder="เช่น มีผื่นแดงขึ้นตามแขน, แสบท้องหลังทานยา 30 นาที, ใจสั่น..."
                className="input input-bordered w-full"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">รายละเอียดเพิ่มเติม (ช่วงเวลาที่ทาน / อาหารที่ทานร่วมด้วย)</span>
              </label>
              <textarea
                rows={3}
                placeholder="ระบุรายละเอียดเพิ่มเติมเพื่อช่วยให้เภสัชกรประเมินอาการได้แม่นยำขึ้น..."
                className="textarea textarea-bordered w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingReport && (
                <button type="button" onClick={resetForm} className="btn btn-outline">
                  ยกเลิก
                </button>
              )}
              <button type="submit" className="btn btn-primary px-6" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : editingReport ? (
                  'บันทึกการแก้ไข'
                ) : (
                  'ส่งรายงานอาการ'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* User's Reports History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">ประวัติการรายงานอาการของคุณ ({reports.length} รายการ)</h2>
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {isError && (
          <div className="alert alert-error text-white">
            <span>ไม่สามารถโหลดข้อมูลรายงานได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์</span>
          </div>
        )}

        {!isLoading && !isError && reports.length === 0 && (
          <div className="bg-base-100 p-8 rounded-2xl border border-base-300 text-center text-base-content/60">
            คุณยังไม่มีประวัติการรายงานอาการไม่พึงประสงค์
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-primary">{report.medication.name}</span>
                      <span className="text-xs opacity-60">({report.medication.genericName})</span>
                      {getSeverityBadge(report.severity)}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="font-semibold text-base text-base-content mt-1">
                      อาการที่พบ: {report.symptom}
                    </p>
                    {report.description && (
                      <p className="text-sm text-base-content/75 mt-1">{report.description}</p>
                    )}
                    <p className="text-xs text-base-content/50 mt-2">
                      วันที่แจ้ง: {new Date(report.createdAt).toLocaleString('th-TH')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(report)}
                      className="btn btn-xs btn-outline btn-info"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      className="btn btn-xs btn-outline btn-error"
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                {/* Admin / Pharmacist Feedback Box */}
                {report.adminNote && (
                  <div className="mt-3 p-3.5 rounded-xl bg-success/10 border border-success/30 text-sm">
                    <div className="font-bold text-success flex items-center gap-1.5 mb-1">
                      <span>คำแนะนำจากเภสัชกร :</span>
                    </div>
                    <p className="text-base-content/90">{report.adminNote}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}