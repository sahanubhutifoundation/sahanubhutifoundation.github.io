import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { fundPrivacyService } from '../../services/fundPrivacyService';

interface FundPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const FundPasswordModal: React.FC<FundPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
}) => {
  const { language } = useLanguage();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال كلمة المرور'
          : language === 'en'
          ? 'Please enter the access PIN'
          : 'অনুগ্রহ করে পাসওয়ার্ড বা পিন নম্বর লিখুন'
      );
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fundPrivacyService.verifyAndUnlock(pin);
      if (res.success) {
        setPin('');
        setError(null);
        onSuccess();
      } else {
        setError(
          language === 'ar'
            ? 'كلمة المرور غير صحيحة. حاول مرة أخرى.'
            : language === 'en'
            ? 'Incorrect PIN or password. Please try again.'
            : 'ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।'
        );
      }
    } catch {
      setError(
        language === 'ar'
          ? 'حدث خطأ أثناء التحقق'
          : language === 'en'
          ? 'Error verifying password'
          : 'যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const defaultTitle =
    language === 'ar'
      ? 'سجل المساهمات الشهرية محمي'
      : language === 'en'
      ? 'Monthly Contribution Record Protected'
      : 'মাসিক অবদানের হিসাব সংরক্ষিত';

  const defaultDescription =
    language === 'ar'
      ? 'يرجى إدخال رمز الحماية المعتمد لعرض سجل المساهمات الشهرية لهذا العضو.'
      : language === 'en'
      ? 'Please enter the fund access PIN to view this member’s verified monthly contributions.'
      : 'এই সদস্যের মাসিক অবদানের বিস্তারিত হিসাব দেখতে তহবিলের গোপনীয়তা পিন বা পাসওয়ার্ড লিখুন।';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E0DBCF] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE8E0] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5 text-[#1E3A2F]">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0EC] text-[#2D5A41] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#1E3A2F] text-base">
              {title || defaultTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            {description || defaultDescription}
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {language === 'ar'
                ? 'رمز المرور أو رقم PIN'
                : language === 'en'
                ? 'PIN / Password'
                : 'তহবিল পাসওয়ার্ড বা পিন'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  language === 'ar'
                    ? 'أدخل الرمز'
                    : language === 'en'
                    ? 'Enter PIN'
                    : 'পিন বা পাসওয়ার্ড দিন'
                }
                autoFocus
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A41] focus:border-transparent outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {language === 'ar' ? 'إلغاء' : language === 'en' ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              type="submit"
              disabled={isVerifying || !pin.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs"
            >
              {isVerifying
                ? language === 'ar'
                  ? 'جارٍ التحقق...'
                  : language === 'en'
                  ? 'Verifying...'
                  : 'যাচাই করা হচ্ছে...'
                : language === 'ar'
                ? 'فتح السجل'
                : language === 'en'
                ? 'Unlock Record'
                : 'হিসাব দেখুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
