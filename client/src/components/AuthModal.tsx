import React, { useState } from 'react';
import { useMedStore } from '../stores/useMedStore';
import { loginApi, registerApi } from '../api/medicationApi';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, setUser } = useMedStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setError('');
  };

  const handleSwitchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError('');
  };

  const fillUserAccount = () => {
    setMode('login');
    setEmail('test@test.com');
    setPassword('1234');
    setError('');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginApi(email, password);
        setUser(res.user);
      } else {
        const res = await registerApi(email, name, password);
        setUser(res.user);
      }
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog className="modal modal-open bg-black/50">
      <div className="modal-box max-w-md border border-base-200 shadow-2xl">
        <button
          type="button"
          onClick={closeAuthModal}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
            <img src="/icon.png" alt="MedHub" className="w-7 h-7 object-contain" />
          </div>
          <h3 className="font-bold text-2xl text-primary">
            {mode === 'login' ? 'เข้าสู่ระบบ MedHub' : 'สมัครสมาชิกใหม่'}
          </h3>
          <p className="text-sm text-base-content/60 mt-1">
            เข้าสู่ระบบเพื่อจัดการกระเป๋ายาและรายงานอาการไม่พึงประสงค์
          </p>
        </div>

        <div role="tablist" className="tabs tabs-boxed mb-5 font-bold">
          <button
            type="button"
            role="tab"
            className={`tab font-semibold transition-colors${mode === 'login' ? 'tab-active text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => handleSwitchMode('login')}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            role="tab"
            className={`tab font-semibold transition-colors ${mode === 'register' ? 'tab-active text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => handleSwitchMode('register')}
          >
            สมัครสมาชิก
          </button>
        </div>

        {error && (
          <div className="alert alert-error text-white text-sm py-2.5 mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-medium">ชื่อผู้ใช้งาน</span>
              </label>
              <input
                type="text"
                placeholder="เช่น Natchanon"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">อีเมล</span>
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">รหัสผ่าน</span>
            </label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่าน"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : mode === 'login' ? (
              'เข้าสู่ระบบ'
            ) : (
              'สมัครสมาชิก'
            )}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 pt-4 border-t border-base-200 flex flex-col gap-1 items-center">
            <button
              type="button"
              onClick={fillUserAccount}
              className="btn btn-ghost btn-xs text-primary"
            >
              ใช้บัญชีผู้ใช้ทั่วไป (test@test.com / 1234)
            </button>
            
          </div>
        )}
      </div>
    </dialog>
  );
};