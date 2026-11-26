import { useState } from 'react';
import { Link } from 'react-router';
import { useMyKit } from '../hooks/useMedications';
import { useMedStore } from '../stores/useMedStore';

export const MyKitPage = () => {
  const { user, openAuthModal } = useMedStore();
  const { kitItems, isLoading, toggleMyKit, updateItemNote, clearKit } = useMyKit();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  if (!user) {
    return (
      <div className="bg-base-100 py-20 text-center rounded-2xl border border-base-200 shadow-sm mt-8 max-w-2xl mx-auto px-6">
        <div className="bg-primary/10 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-base-content">กรุณาเข้าสู่ระบบเพื่อใช้งานกระเป๋ายาส่วนตัว</h2>
        <p className="text-base-content/60 mt-2 mb-6">
          บันทึกข้อมูลยาประจำตัวและจดบันทึกวิธีใช้ส่วนตัวลงในฐานข้อมูลของคุณ
        </p>
        <button onClick={openAuthModal} className="btn btn-primary px-8">
          เข้าสู่ระบบ / สมัครสมาชิก
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const startEdit = (itemId: number, currentNote: string) => {
    setEditingId(itemId);
    setNoteDraft(currentNote || '');
  };

  const saveEdit = (itemId: number) => {
    updateItemNote(itemId, noteDraft);
    setEditingId(null);
  };

  return (
    <div className="w-full mx-auto px-6 sm:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold text-primary truncate">
              กระเป๋ายาของ {user.name}
            </h1>
            <p className="text-sm sm:text-base text-base-content/70 text-left mt-1">
              รายการยาที่บันทึกไว้ในฐานข้อมูล ({kitItems.length} รายการ)
            </p>
          </div>
        </div>

        {kitItems.length > 0 && (
          <button
            onClick={clearKit}
            className="btn btn-outline btn-error btn-sm shrink-0 self-start sm:self-auto px-4"
          >
            ล้างกระเป๋ายาทั้งหมด
          </button>
        )}
      </div>

      {kitItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kitItems.map((item) => {
            const med = item.medication;
            return (
              <div
                key={item.id}
                className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5 flex gap-4 items-center border-b border-base-200">
                  <img
                    src={med.imageUrl || '/icon.png'}
                    alt={med.name}
                    className="w-20 h-20 object-contain bg-base-200/40 rounded-xl p-2 shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icon.png';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-primary uppercase">{med.category}</span>
                    <h2 className="font-bold text-lg text-base-content truncate">{med.name}</h2>
                    <p className="text-xs text-base-content/60 truncate">{med.genericName}</p>
                  </div>
                </div>

                {/* ส่วนบันทึกโน้ตส่วนตัว (Update Operation) */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-base-content/70">บันทึกช่วยจำส่วนตัว:</span>
                      {editingId !== item.id && (
                        <button
                          onClick={() => startEdit(item.id, item.note)}
                          className="btn btn-ghost btn-xs text-primary"
                        >
                          แก้ไขโน้ต
                        </button>
                      )}
                    </div>

                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          className="input input-bordered input-sm w-full"
                          placeholder="ระบุวิธีทานหรือหมายเหตุส่วนตัว..."
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-ghost btn-xs"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={() => saveEdit(item.id)}
                            className="btn btn-primary btn-xs"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm bg-base-200/50 p-3 rounded-lg text-base-content/80 min-h-[44px]">
                        {item.note || <span className="text-base-content/40 italic">ยังไม่มีบันทึกส่วนตัว</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link to={`/med/${med.id}`} className="btn btn-primary btn-sm flex-1">
                      ดูข้อมูลยา
                    </Link>
                    <button
                      onClick={() => toggleMyKit(med)}
                      className="btn btn-outline btn-error btn-sm"
                    >
                      ลบออก
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-base-100 py-20 text-center rounded-2xl border border-base-200 shadow-sm mt-8">
          <h2 className="text-xl font-bold text-base-content/80">กระเป๋ายาว่างเปล่า</h2>
          <p className="text-base-content/50 mt-2 mb-6">คุณยังไม่ได้เพิ่มยาใดๆ ลงในกระเป๋าของคุณ</p>
          <Link to="/" className="btn btn-primary font-medium">ไปค้นหายากันเลย</Link>
        </div>
      )}
    </div>
  );
};