import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { fundPrivacyService } from '../services/fundPrivacyService';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, PhoneCall, AlertCircle, Loader2 } from 'lucide-react';

interface FundPrivacyLockScreenProps {
  onUnlocked: () => void;
}

export const FundPrivacyLockScreen: React.FC<FundPrivacyLockScreenProps> = ({ onUnlocked }) => {
  const { language } = useLanguage();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin.trim()) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال رمز PIN'
          : language === 'en'
          ? 'Please enter the access PIN'
          : 'অনুগ্রহ করে পিন নম্বর প্রদান করুন।'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fundPrivacyService.verifyAndUnlock(pin);
      if (res.success) {
        onUnlocked();
      } else {
        setError(
          res.error ||
            (language === 'ar'
              ? 'رمز PIN غير صحيح. يرجى إدخال الرمز الصحيح.'
              : language === 'en'
              ? 'Incorrect PIN. Please enter the correct PIN code.'
              : 'ভুল পিন নম্বর। অনুগ্রহ করে সঠিক পিন প্রদান করুন।')
        );
      }
    } catch {
      setError(
        language === 'ar'
          ? 'حدث خطأ أثناء التحقق'
          : language === 'en'
          ? 'An error occurred during verification'
          : 'যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      <div className="p-6 sm:p-10 rounded-3xl bg-white border border-[#EBE8E0] shadow-sm text-center space-y-6">
        {/* Foundation Branding */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-20 h-20 rounded-2xl bg-[#E8EFEA] border border-[#2D5A41]/20 p-2.5 flex items-center justify-center shadow-xs">
            <Logo className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
              {language === 'ar'
                ? 'مؤسسة ساهানوبوتي — حماية بيانات الصندوق'
                : language === 'en'
                ? 'Sahanubhuti Foundation — Fund Privacy Protection'
                : 'সহানুভূতি ফাউন্ডেশন — তহবিল গোপনীয়তা সুরক্ষা'}
            </h2>
            <p className="text-xs sm:text-sm text-[#7A877E] mt-1">
              {language === 'ar'
                ? 'البيانات المالية والمساهمات الشهرية مقتصرة على أفراد العائلة والمساهمين المصرح لهم'
                : language === 'en'
                ? 'Detailed contributions, donor records, and expenses are protected for family members & authorized donors'
                : 'পরিবারের সদস্যদের ব্যক্তিগত মাসিক অনুদান, সদস্য তালিকা ও ব্যয়ের বিস্তারিত হিসাব শুধুমাত্র অনুমোদিত স্বজনদের জন্য সংরক্ষিত'}
            </p>
          </div>
        </div>

        {/* Lock Icon Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F7F5] border border-[#2D5A41]/20 text-[#2D5A41] text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-[#2D5A41]" />
          <span>
            {language === 'ar'
              ? 'الصفحة محمية برمز PIN'
              : language === 'en'
              ? 'PIN-Protected Financial Ledger'
              : 'পিন সুরক্ষিত আর্থিক রেজিস্টার'}
          </span>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto text-left">
          <div>
            <label className="block text-xs font-bold text-[#2D3630] mb-1.5">
              {language === 'ar'
                ? 'أدخل رمز PIN للدخول'
                : language === 'en'
                ? 'Enter Access PIN'
                : 'তহবিল দেখার পিন নম্বর প্রদান করুন'}
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                placeholder={
                  language === 'ar'
                    ? '••••••'
                    : language === 'en'
                    ? 'Enter 4+ digit PIN'
                    : '৪+ সংখ্যার পিন নম্বর লিখুন'
                }
                className="w-full px-4 py-3 rounded-xl border border-[#D9D6CC] bg-[#FDFCF9] text-[#2D3630] text-sm tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#2D5A41]/30 focus:border-[#2D5A41] transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A877E] hover:text-[#2D3630] p-1 transition-colors"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-sm font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-98"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {language === 'ar'
                    ? 'جاري التحقق...'
                    : language === 'en'
                    ? 'Verifying...'
                    : 'যাচাই করা হচ্ছে...'}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {language === 'ar'
                    ? 'আনলক করুন / فتح الصندوق'
                    : language === 'en'
                    ? 'Unlock Fund Page'
                    : 'আনলক করুন'}
                </span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Contact info for requesting PIN */}
        <div className="pt-4 border-t border-[#EBE8E0] text-center space-y-2">
          <p className="text-xs text-[#7A877E]">
            {language === 'ar'
              ? 'للحصول على رمز PIN، يرجى التواصل مع منسقي المؤسسة'
              : language === 'en'
              ? 'To request the access PIN, please contact the foundation coordinators'
              : 'পিন নম্বর সংগ্রহের জন্য ফাউন্ডেশনের দায়িত্বপ্রাপ্তদের সাথে যোগাযোগ করুন'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2D5A41] bg-[#E8EFEA] hover:bg-[#D9E5DC] transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>
                {language === 'ar'
                  ? 'اتصل بنا'
                  : language === 'en'
                  ? 'Contact Page'
                  : 'যোগাযোগ পাতা'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
