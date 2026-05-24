import React, { useState } from 'react';
import { Lock, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasscodeModal({ isOpen, onClose, onSuccess }: PasscodeModalProps) {
  const [pin, setPin] = useState('');
  const [errorAndAlert, setErrorAndAlert] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      onSuccess();
      setPin('');
      setErrorAndAlert('');
    } else {
      setErrorAndAlert('رمز المرور غير صحيح! يرجى إدخال (1234) للوصول التجاري.');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorAndAlert('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email === 'essam77142@gmail.com') {
        onSuccess();
        setPin('');
        setErrorAndAlert('');
        onClose();
      } else {
        setErrorAndAlert(
          `عذراً، الحساب (${result.user ? result.user.email : ''}) غير مصرح له كمسؤول في نظام سما المملكة. المسموح به فقط هو: essam77142@gmail.com`
        );
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorAndAlert('فشل تسجيل الدخول عبر Google. يرجى التحقق والتجربة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
      <div className="w-full max-w-md bg-[#fafafa] border-2 border-slate-900 rounded-lg p-6 shadow-2xl relative translate-y-0 transition-all">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-amber-600" />
            <span className="font-bold text-lg text-slate-900">تسجيل دخول الإدارة والعمليات</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 text-amber-800 text-sm mb-5 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">منطقة آمنة ومحمية</span>
            هذا القسم مخصص لإدارة الحسابات، مراجعة العمليات المالية، والتحصيل الضريبي. يرجى إدخال الرمز السري الخاص بالعمليات.
            <div className="mt-2 text-xs font-mono text-slate-600">
              الرمز التجريبي لمكتب سما المملكة هو: <span className="font-bold text-amber-700 underline text-sm">1234</span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">رمز المرور السري (PIN):</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorAndAlert('');
              }}
              placeholder="••••"
              maxLength={8}
              required
              className="w-full p-3 text-center tracking-widest text-xl font-bold border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-slate-800 bg-white shadow-inner"
              autoFocus
            />
          </div>

          {errorAndAlert && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorAndAlert}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-slate-900 text-white py-2.5 rounded hover:bg-slate-800 transition font-bold"
            >
              تحقق وتأكيد الدخول
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition font-bold"
            >
              إلغاء لغرفة العميل
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-300"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#fafafa] px-2 text-slate-500 font-bold">أو الدخول الآمن</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-slate-305 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-md shadow-xs text-sm font-bold text-slate-705 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path d="M21.35,11.1H12v2.7h5.38C16.88,15.13,15,16.5,12,16.5c-3.03,0-5.62-2.08-6.53-4.88c-0.23-0.69-0.35-1.41-0.35-2.12c0-0.71,0.12-1.43,0.35-2.12C6.38,4.58,8.97,2.5,12,2.5c1.94,0,3.58,0.71,4.82,1.88l2.03-2.03C17.07,0.73,14.73,0,12,0C7.31,0,3.31,2.69,1.39,6.61C0.5,8.43,0,10.45,0,12.5s0.5,4.07,1.39,5.89c1.92,3.92,5.92,6.61,10.61,6.61c4.96,0,8.96-3.62,9.91-8.5C21.95,15.2,22,13.85,22,12.5C22,12.02,21.96,11.56,21.35,11.1z" fill="#4285F4" />
                <path d="M1.39,6.61C3.31,2.69,7.31,0,12,0c2.73,0,5.07,0.73,6.85,2.35l-2.03,2.03C15.58,3.21,13.94,2.5,12,2.5c-3.03,0-5.62,2.08-6.53,4.88c-0.23,0.69-0.35,1.41-0.35,2.12c0,0.71,0.12,1.43,0.35,2.12L1.39,6.61z" fill="#EA4335" />
                <path d="M12,24c-1.92,0-3.72-0.45-5.32-1.24L4.85,18.5L1.39,18.39C3.31,21.31,7.31,24,12,24c4.96,0,8.96-3.62,9.91-8.5l-2.61-2.02l-1.92,0.48C16.88,15.13,15,16.5,12,16.5c-3.03,0-5.62-2.08-6.53-4.88c-0.23-0.69-0.35-1.41-0.35-2.12c0-0.71,0.12-1.43,0.35-2.12L1.39,6.61c0.89,1.82,1.39,3.84,1.39,5.89S2.28,16.57,1.39,18.39L12,24z" fill="#34A853" />
                <path d="M21.35,11.1H12v2.7h5.38c-0.5,1.33-2.38,2.7-5.38,2.7c-3.03,0-5.62-2.08-6.53-4.88c-0.23-0.69-0.35-1.41-0.35-2.12c0-0.71,0.12-1.43,0.35-2.12L1.39,6.61C0.5,8.43,0,10.45,0,12.5s0.5,4.07,1.39,5.89l3.46-3.11c0.23-0.69,0.35-1.41,0.35-2.12c0-0.71-0.12-1.43-0.35-2.12L21.35,11.1z" fill="#FBBC05" />
              </g>
            </svg>
            <span>{loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بحساب Google مسبق'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
