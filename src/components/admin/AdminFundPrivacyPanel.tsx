import React, { useState, useEffect } from 'react';
import { fundPrivacyService } from '../../services/fundPrivacyService';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  KeyRound,
  Info,
} from 'lucide-react';

interface AdminFundPrivacyPanelProps {
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AdminFundPrivacyPanel: React.FC<AdminFundPrivacyPanelProps> = ({ onShowToast }) => {
  const currentSettings = fundPrivacyService.getSettings();

  const [isEnabled, setIsEnabled] = useState<boolean>(currentSettings.isEnabled);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pinChangeRequested, setPinChangeRequested] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | undefined>(currentSettings.updatedAt);

  useEffect(() => {
    const s = fundPrivacyService.getSettings();
    setIsEnabled(s.isEnabled);
    setLastSavedTime(s.updatedAt);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pinChangeRequested) {
      if (!newPin.trim()) {
        onShowToast?.('অনুগ্রহ করে নতুন পিন নম্বর লিখুন।', 'error');
        return;
      }
      if (newPin.trim().length < 4) {
        onShowToast?.('পিন নম্বর কমপক্ষে ৪ সংখ্যার বা অক্ষরের হতে হবে।', 'error');
        return;
      }
      if (newPin.trim() !== confirmPin.trim()) {
        onShowToast?.('নতুন পিন এবং নিশ্চিতকরণ পিন মিলছে না!', 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fundPrivacyService.updatePrivacySettings({
        isEnabled,
        newPin: pinChangeRequested ? newPin.trim() : undefined,
        confirmPin: pinChangeRequested ? confirmPin.trim() : undefined,
      });

      if (res.success) {
        onShowToast?.(res.message, 'success');
        setNewPin('');
        setConfirmPin('');
        setPinChangeRequested(false);
        const fresh = fundPrivacyService.getSettings();
        setLastSavedTime(fresh.updatedAt);
      } else {
        onShowToast?.(res.message, 'error');
      }
    } catch {
      onShowToast?.('সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#E8EFEA] border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D3630]">
                  Fund Privacy Protection (তহবিল তথ্যের গোপনীয়তা সুরক্ষা)
                </h3>
                <p className="text-xs text-[#7A877E]">
                  পাবলিক ফান্ড পেজে ব্যক্তিগত অনুদান, সদস্য তালিকা ও ব্যয়ের হিসাব পিন কোড দিয়ে সুরক্ষিত রাখুন
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Pill */}
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>সুরক্ষা সক্রিয় (PIN Protected)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>সুরক্ষা নিষ্ক্রিয় (Public Access)</span>
              </span>
            )}
          </div>
        </div>

        {/* Protection Enable/Disable Toggle */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-4 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#2D3630] block">
                  তহবিল পেজে পিন সুরক্ষা কার্যকর করুন (Enable PIN Protection)
                </span>
                <span className="text-xs text-[#7A877E] block mt-0.5">
                  সক্রিয় থাকলে ভিজিটরদের আর্থিক তথ্য দেখতে নির্ধারিত পিন নম্বর দিতে হবে।
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2D5A41]"></div>
              </label>
            </div>

            {/* Warning when disabled */}
            {!isEnabled && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">সতর্কবার্তা: আর্থিক তথ্য সার্বজনীন হয়ে যাবে</p>
                  <p className="leading-relaxed text-[#785412]">
                    সুরক্ষা নিষ্ক্রিয় করলে পরিবারের সদস্যদের মাসিক অনুদানের হিসাব, সদস্য নাম, বার্ষিক মোট
                    এবং ব্যয়ের যাবতীয় তথ্য যেকোনো সাধারণ ভিজিটর কোনো পিন কোড ছাড়া সরাসরি দেখতে পাবেন।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* PIN Configuration Section */}
          <div className="p-5 rounded-xl border border-[#EBE8E0] bg-[#FAF9F6] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EBE8E0]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#2D5A41]" />
                <h4 className="text-xs font-bold text-[#2D3630] uppercase tracking-wider">
                  অ্যাক্সেস পিন কোড ব্যবস্থাপনা (Access PIN Configuration)
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>পিন সংরক্ষিত ও নিরাপদ (Salted SHA-256)</span>
                </span>
              </div>
            </div>

            <div className="text-xs text-[#5C665F] space-y-1">
              <p>
                নিরাপত্তার স্বার্থে পিন নম্বর কোনো সাধারণ লেখায় (Plaintext) ব্রাউজারে বা ডাটাবেজে রাখা হয় না।
                শুধুমাত্র একটি ক্রিপ্টোগ্রাফিক হ্যাশ যাচাইয়ের জন্য ব্যবহৃত হয়।
              </p>
              {lastSavedTime && (
                <p className="text-[11px] text-[#7A877E]">
                  সর্বশেষ পিন বা সেটিংস আপডেট: {new Date(lastSavedTime).toLocaleString('bn-BD')}
                </p>
              )}
            </div>

            {!pinChangeRequested ? (
              <div>
                <button
                  type="button"
                  onClick={() => setPinChangeRequested(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#2D5A41] bg-[#E8EFEA] hover:bg-[#D9E5DC] border border-[#2D5A41]/20 transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>নতুন পিন সেট বা পরিবর্তন করুন (Change PIN)</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white border border-[#2D5A41]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2D3630]">
                    নতুন পিন নির্ধারণ করুন:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPinChangeRequested(false);
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className="text-xs text-[#7A877E] hover:text-rose-600 transition-colors"
                  >
                    বাতিল
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New PIN input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3630] mb-1">
                      নতুন পিন নম্বর (কমপক্ষে ৪ সংখ্যা বা অক্ষর) *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="নতুন পিন লিখুন"
                        className="w-full px-3 py-2 rounded-xl border border-[#D9D6CC] bg-[#FDFCF9] text-xs focus:ring-2 focus:ring-[#2D5A41]/30 focus:border-[#2D5A41] pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A877E] hover:text-[#2D3630] p-1"
                      >
                        {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm PIN input */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3630] mb-1">
                      নতুন পিন নিশ্চিত করুন (Confirm PIN) *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPin ? 'text' : 'password'}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="আবার লিখুন"
                        className="w-full px-3 py-2 rounded-xl border border-[#D9D6CC] bg-[#FDFCF9] text-xs focus:ring-2 focus:ring-[#2D5A41]/30 focus:border-[#2D5A41] pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A877E] hover:text-[#2D3630] p-1"
                      >
                        {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-bold shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>গোপনীয়তা সুরক্ষা সেটিংস সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
