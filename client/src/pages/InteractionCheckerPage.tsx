import React, { useState, useEffect } from 'react';
import { useMedications } from '../hooks/useMedications';
import { checkInteractionApi, type InteractionResult } from '../api/medicationApi';

export const InteractionCheckerPage: React.FC = () => {
  const { data, isLoading, isError } = useMedications();
  const medications = data?.results || [];

  const [med1Id, setMed1Id] = useState<string>('');
  const [med2Id, setMed2Id] = useState<string>('');
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setResult(null);
  }, [med1Id, med2Id]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        กำลังโหลดฐานข้อมูลยา... <span className="loading loading-spinner text-primary"></span>
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-center py-20 text-error">ไม่สามารถโหลดข้อมูลเพื่อตรวจสอบได้</div>;
  }

  const checkInteraction = async () => {
    if (!med1Id || !med2Id) return;
    setChecking(true);
    try {
      const res = await checkInteractionApi(med1Id, med2Id);
      setResult(res);
    } catch (err: any) {
      setResult({
        status: 'danger',
        message: err.message || 'ไม่สามารถตรวจสอบปฏิกิริยาได้',
      });
    } finally {
      setChecking(false);
    }
  };

  const resetChecker = () => {
    setMed1Id('');
    setMed2Id('');
    setResult(null);
  };

  return (
    <div className="w-full">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-primary">ตรวจสอบปฏิกิริยาระหว่างยา</h1>
        <p className="text-base-content/70">เลือกยา 2 ชนิดเพื่อตรวจสอบความเสี่ยงเมื่อรับประทานร่วมกัน</p>
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200 p-6 sm:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-semibold text-primary">ยาชนิดที่ 1</span></label>
            <select className="select select-bordered w-full" value={med1Id} onChange={(e) => setMed1Id(e.target.value)}>
              <option value="" disabled>เลือกยาชนิดที่ 1</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>{med.name} ({med.category})</option>
              ))}
            </select>
          </div>

          <div className="text-2xl font-bold text-base-content/30 pt-6">+</div>

          <div className="form-control w-full">
            <label className="label"><span className="label-text font-semibold text-primary">ยาชนิดที่ 2</span></label>
            <select className="select select-bordered w-full" value={med2Id} onChange={(e) => setMed2Id(e.target.value)}>
              <option value="" disabled>เลือกยาชนิดที่ 2</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>{med.name} ({med.category})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            className="btn btn-primary px-10 shadow-md"
            onClick={checkInteraction}
            disabled={!med1Id || !med2Id || checking}
          >
            {checking ? <span className="loading loading-spinner loading-sm"></span> : 'ตรวจสอบ'}
          </button>
          <button className="btn btn-ghost" onClick={resetChecker}>ล้างค่า</button>
        </div>

        {result && (
          <div className="mt-8 animate-fade-in">
            <div className={`alert ${result.status === 'safe' ? 'alert-success text-white' : result.status === 'warning' ? 'alert-warning' : 'alert-error text-white'} shadow-md`}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {result.status === 'safe' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {result.status === 'warning' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                  {result.status === 'danger' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {result.status === 'safe' && 'สามารถทานร่วมกันได้'}
                    {result.status === 'warning' && 'ควรระมัดระวัง'}
                    {result.status === 'danger' && 'ห้ามทานร่วมกันเด็ดขาด'}
                  </h3>
                  <p className="mt-1 text-sm sm:text-base leading-relaxed">{result.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};