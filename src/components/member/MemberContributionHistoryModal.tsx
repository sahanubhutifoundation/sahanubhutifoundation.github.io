import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Member } from '../../types';
import {
  getMemberContributionHistory,
  MemberContributionHistoryResult,
  MemberYearContributionSummary,
  MONTH_KEYS,
  getLocalizedMonthName
} from '../../services/fundService';
import { formatLocalizedAmount, formatLocalizedNumber } from '../../utils/foundationHelpers';
import { storageService } from '../../services/storageService';

interface MemberContributionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  onOpenReceiptModal: (memberId: string, year: string, paidMonths: string[]) => void;
}

export const MemberContributionHistoryModal: React.FC<MemberContributionHistoryModalProps> = ({
  isOpen,
  onClose,
  member,
  onOpenReceiptModal,
}) => {
  const { language } = useLanguage();
  const [data, setData] = useState<MemberContributionHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [isReceiptDownloadEnabled, setIsReceiptDownloadEnabled] = useState(() =>
    storageService.isReceiptDownloadEnabled()
  );
  const [receiptDisabledNotice, setReceiptDisabledNotice] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      setIsReceiptDownloadEnabled(storageService.isReceiptDownloadEnabled());
    };
    window.addEventListener('sf_fund_visibility_updated', handleSync);
    window.addEventListener('sf_config_updated', handleSync);
    return () => {
      window.removeEventListener('sf_fund_visibility_updated', handleSync);
      window.removeEventListener('sf_config_updated', handleSync);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !member.id) return;
    let isMounted = true;
    setLoading(true);

    getMemberContributionHistory(member.id, selectedYear)
      .then((res) => {
        if (isMounted) {
          setData(res);
          if (res && res.availableYears.length > 0 && !res.availableYears.includes(selectedYear)) {
            setSelectedYear(res.activeYear);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading member contribution history:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, member.id, selectedYear]);

  if (!isOpen) return null;

  const activeSummary: MemberYearContributionSummary | undefined = data?.yearSummaries[selectedYear];
  const is2024 = selectedYear === '2024';

  const paidMonthsForActiveYear = (activeSummary?.months || [])
    .filter((m) => m.status === 'paid')
    .map((m) => m.month);

  const memberDisplayName =
    (language === 'bn' ? member.nameBn : language === 'en' ? member.nameEn : member.nameAr) ||
    member.nameBn ||
    member.name;

  const startRecord = useMemo(() => {
    return storageService.getFundContributionStartForMember(member.id);
  }, [member.id]);

  const memberStartPeriodText = useMemo(() => {
    let sYear = startRecord?.startYear;
    let sMonth = startRecord?.startMonth;

    if (!sYear && (member.contributionStartDate || member.joiningDate)) {
      const candidate = (member.contributionStartDate || member.joiningDate || '').trim();
      const match = candidate.match(/^(\d{4})[-/.](\d{1,2})/);
      if (match) {
        sYear = parseInt(match[1], 10);
        sMonth = parseInt(match[2], 10);
      }
    }

    if (!sYear) return '';
    const mKey = sMonth && sMonth >= 1 && sMonth <= 12 ? MONTH_KEYS[sMonth - 1] : undefined;
    const monthName = mKey ? getLocalizedMonthName(mKey, language) : '';
    const yearStr = formatLocalizedNumber(sYear, language);
    return monthName ? `${monthName} ${yearStr}` : yearStr;
  }, [startRecord, member, language]);

  const isNotYetMember = activeSummary?.yearState === 'not_started';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E0DBCF] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0EC] text-[#2D5A41] flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#1E3A2F] text-base sm:text-lg">
                  {memberDisplayName}
                </h3>
                {member.serial && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#E8F0EC] text-[#2D5A41]">
                    #{formatLocalizedNumber(member.serial, language)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5C665F]">
                {language === 'ar'
                  ? 'سجل المساهمات المالية الشهرية المعتمدة'
                  : language === 'en'
                  ? 'Verified Monthly Financial Contribution Record'
                  : 'যাচাইকৃত ব্যক্তিগত মাসিক অবদানের হিসাব'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Year Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {language === 'ar' ? 'السنة:' : language === 'en' ? 'Year:' : 'আর্থিক সাল:'}
            </span>
            {(data?.availableYears || ['2024', '2025', '2026']).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedYear === yr
                    ? 'bg-[#2D5A41] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatLocalizedNumber(yr, language)}
                {yr === '2024' && (
                  <span className="ml-1 text-[10px] opacity-80">
                    ({language === 'ar' ? 'التأسيس' : language === 'en' ? 'Founding' : 'প্রতিষ্ঠা'})
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              {language === 'ar' ? 'جارٍ تحميل السجل...' : language === 'en' ? 'Loading record...' : 'হিসাব লোড করা হচ্ছে...'}
            </div>
          ) : (
            <>
              {/* If Selected Financial Year is Entirely Before Membership Started: Clean Not-A-Member View */}
              {isNotYetMember ? (
                <div className="p-6 sm:p-8 rounded-2xl border border-dashed border-[#DCD6C8] bg-[#FAF8F5] text-center space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="font-bold text-base text-[#1E3A2F]">
                        {formatLocalizedNumber(selectedYear, language)} {language === 'ar' ? 'مساهمات عام' : language === 'en' ? 'Annual Overview' : 'সালের সারসংক্ষেপ'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {language === 'ar'
                            ? 'لم يكن عضواً / غير منطبق'
                            : language === 'en'
                            ? 'Not a Member / Not Applicable'
                            : 'সদস্য ছিলেন না / প্রযোজ্য নয়'}
                        </span>
                      </span>
                    </div>

                    <div className="max-w-md w-full mx-auto p-4 rounded-xl bg-white border border-[#E8E4DA] text-xs text-[#2D3630] space-y-2 shadow-2xs mt-1">
                      <p className="font-medium text-[#5C665F]">
                        {language === 'ar'
                          ? `لم تبدأ مساهمة هذا العضو في هذه السنة المالية (${formatLocalizedNumber(selectedYear, language)}).`
                          : language === 'en'
                          ? `This member's contribution had not started in this fiscal year (${formatLocalizedNumber(selectedYear, language)}).`
                          : `এই আর্থিক বছরে (${formatLocalizedNumber(selectedYear, language)}) সদস্যটির অবদান শুরু হয়নি।`}
                      </p>
                      {memberStartPeriodText && (
                        <p className="font-bold text-[#1E3A2F] text-sm pt-1 border-t border-[#F0ECE1]">
                          {language === 'ar'
                            ? `فترة بدء المساهمة: ${memberStartPeriodText}`
                            : language === 'en'
                            ? `Contribution start period: ${memberStartPeriodText}`
                            : `সদস্যের অবদান শুরুর সময়: ${memberStartPeriodText}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Year Summary Card */}
                  {activeSummary && (
                    <div className="p-4 rounded-xl border bg-[#FDFCF9] border-[#E8E4DA] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1E3A2F]">
                        {formatLocalizedNumber(selectedYear, language)} {language === 'ar' ? 'مساهمات عام' : language === 'en' ? 'Annual Overview' : 'সালের সারসংক্ষেপ'}
                      </span>
                      {activeSummary.linkStatus === 'linked' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="w-3 h-3" />
                          <span>
                            {language === 'ar'
                              ? 'مرتبط ومعتمد'
                              : language === 'en'
                              ? 'Verified Linked'
                              : 'ভেরিফাইড লিংকড'}
                          </span>
                        </span>
                      ) : activeSummary.linkStatus === 'not_a_member' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {language === 'ar'
                              ? 'لم تبدأ المساهمة بعد'
                              : language === 'en'
                              ? 'Not Started Yet'
                              : 'সদস্য ছিলেন না / প্রযোজ্য নয়'}
                          </span>
                        </span>
                      ) : activeSummary.linkStatus === 'backend_error' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            {language === 'ar'
                              ? 'خطأ في الاتصال'
                              : language === 'en'
                              ? 'Connection Issue'
                              : 'কানেকশন সমস্যা'}
                          </span>
                        </span>
                      ) : activeSummary.linkStatus === 'needs_review' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            {language === 'ar'
                              ? 'قيد المراجعة'
                              : language === 'en'
                              ? 'Needs Review'
                              : 'পর্যালোচনা প্রয়োজন'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            {language === 'ar'
                              ? 'غير مرتبط بالسجل'
                              : language === 'en'
                              ? 'Unlinked in Sheet'
                              : 'শিটে লিঙ্ক করা হয়নি'}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {language === 'ar' ? 'إجمالي المدফوع:' : language === 'en' ? 'Total Contributed:' : 'মোট জমা:'}
                      </div>
                      <div className="text-base font-bold font-mono text-[#2D5A41]">
                        ৳ {formatLocalizedAmount(activeSummary.totalContributed, language)}
                      </div>
                    </div>
                  </div>

                  {activeSummary.yearState === 'not_started' && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        {activeSummary.notStartedMessage?.[language] ||
                          (language === 'ar'
                            ? `لم تبدأ المساهمة في هذه السنة (${selectedYear})`
                            : language === 'en'
                            ? `Contribution not started in this fiscal year (${selectedYear})`
                            : `এই আর্থিক বছরে (${selectedYear}) সদস্যটির অবদান শুরু হয়নি।`)}
                      </div>
                    </div>
                  )}

                  {activeSummary.linkStatus === 'backend_error' && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? 'تعذر تحميل بيانات الربط بسبب مشكلة في الاتصال أو الخادم. يرجى التحقق من الاتصال والمحاولة لاحقاً.'
                          : language === 'en'
                          ? 'Could not load member mapping due to a network or server issue. Please check your connection and try again.'
                          : 'সার্ভার বা নেটওয়ার্ক সমস্যার কারণে সদস্য ম্যাপিং তথ্য লোড করা যায়নি। অনুগ্রহ করে সংযোগ চেক করে পুনরায় চেষ্টা করুন।'}
                      </span>
                    </div>
                  )}

                  {/* Badges row with accurate monthly counts and due amount */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#EBE8E0] text-xs">
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EBE8E0]">
                      <span className="text-gray-500 block text-[11px]">
                        {language === 'ar' ? 'الشهور المسددة' : language === 'en' ? 'Paid Months' : 'পরিশোধিত মাস'}
                      </span>
                      <span className="font-semibold text-emerald-800 text-sm">
                        {formatLocalizedNumber(activeSummary.paidMonthsCount, language)} {language === 'ar' ? 'شهر' : language === 'en' ? 'mo' : 'মাস'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EBE8E0]">
                      <span className="text-gray-500 block text-[11px]">
                        {language === 'ar' ? 'الشهور المستحقة' : language === 'en' ? 'Applicable Months' : 'প্রযোজ্য মাস'}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm">
                        {formatLocalizedNumber(activeSummary.applicableMonthsCount, language)} {language === 'ar' ? 'شهر' : language === 'en' ? 'mo' : 'মাস'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EBE8E0]">
                      <span className="text-gray-500 block text-[11px]">
                        {language === 'ar' ? 'الشهور المتأخرة' : language === 'en' ? 'Due Months' : 'বকেয়া মাস'}
                      </span>
                      <span className={`font-semibold text-sm ${activeSummary.dueMonthsCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                        {formatLocalizedNumber(activeSummary.dueMonthsCount, language)} {language === 'ar' ? 'شهر' : language === 'en' ? 'mo' : 'মাস'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EBE8E0]">
                      <span className="text-gray-500 block text-[11px]">
                        {language === 'ar' ? 'المبلغ المتأخر' : language === 'en' ? 'Outstanding' : 'বকেয়া টাকার পরিমাণ'}
                      </span>
                      <span className={`font-semibold text-sm font-mono ${activeSummary.dueAmount > 0 ? 'text-red-700 font-bold' : 'text-gray-700'}`}>
                        ৳ {formatLocalizedAmount(activeSummary.dueAmount || 0, language)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#EBE8E0]">
                      <span className="text-gray-500 block text-[11px]">
                        {language === 'ar' ? 'المساهمة المحددة' : language === 'en' ? 'Monthly Rate' : 'মাসিক নির্ধারিত হার'}
                      </span>
                      <span className="font-semibold text-gray-800 font-mono text-sm">
                        ৳ {formatLocalizedAmount(activeSummary.commitment, language)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 flex items-center justify-between pt-1">
                    <span className="text-gray-500">
                      {language === 'ar' ? 'اسم السجل:' : language === 'en' ? 'Registered Name:' : 'রেজিস্টারের নাম:'}
                    </span>
                    <span className="font-semibold text-gray-800 truncate" title={activeSummary.sheetMemberName || memberDisplayName}>
                      {activeSummary.sheetMemberName || memberDisplayName}
                    </span>
                  </div>

                  {is2024 && (
                    <div className="p-2.5 rounded-lg bg-[#F5F2EB] border border-[#E2DDD2] text-[11px] text-[#5C665F]">
                      ℹ️ {language === 'ar'
                        ? 'تأسست مؤسسة ساهانوبهوتي في ۲۸ نوفمبر ۲۰۲۴، لذا يعتبر شهر ديسمبر ۲۰۲۴ الشهر الوحيد الخاضع للمساهمة لهذا العام.'
                        : language === 'en'
                        ? 'Sahanubhuti Foundation was founded on 28 November 2024; December 2024 is the sole applicable contribution month for this year.'
                        : 'সহানুভূতি ফাউন্ডেশন ২৮ নভেম্বর ২০২৪ তারিখে প্রতিষ্ঠিত হয়। ফলে ২০২৪ সালের জন্য কেবল ডিসেম্বর মাস প্রযোজ্য হিসাব হিসেবে গণ্য।'}
                    </div>
                  )}
                </div>
              )}

              {/* Month by Month Grid */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5 flex items-center justify-between">
                  <span>
                    {language === 'ar'
                      ? 'تفاصيل الشهور'
                      : language === 'en'
                      ? 'Monthly Breakdown'
                      : 'মাসভিত্তিক অবদানের অবস্থা'}
                  </span>
                  <span className="text-[11px] font-normal text-gray-500">
                    {formatLocalizedNumber(selectedYear, language)}
                  </span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(activeSummary?.months || MONTH_KEYS.map((m) => ({ month: m, status: 'unpaid' as const, amount: 0 }))).map((mItem) => {
                    const monthLabel = getLocalizedMonthName(mItem.month, language);

                    if (mItem.status === 'pre_foundation') {
                      return (
                        <div
                          key={mItem.month}
                          className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 text-gray-400 text-center select-none"
                          title={
                            language === 'ar'
                              ? 'قبل تأسيس المؤسسة (تأسست في ۲۸ نوفمبر ۲۰۲৪)'
                              : language === 'en'
                              ? 'Pre-foundation period (established 28 Nov 2024)'
                              : 'প্রতিষ্ঠার পূর্ববর্তী (২৮ নভেম্বর ২০২৪ এ প্রতিষ্ঠিত)'
                          }
                        >
                          <div className="text-[11px] font-medium text-gray-400">{monthLabel}</div>
                          <div className="text-xs font-bold my-0.5">—</div>
                          <div className="text-[9px] text-gray-400">
                            {language === 'ar' ? 'قبل التأسيس' : language === 'en' ? 'Pre-founding' : 'প্রতিষ্ঠা-পূর্ব'}
                          </div>
                        </div>
                      );
                    }

                    if (mItem.status === 'not_applicable') {
                      return (
                        <div
                          key={mItem.month}
                          className="p-2.5 rounded-xl border border-gray-200/80 bg-gray-50/80 text-gray-400 text-center select-none"
                          title={
                            language === 'ar'
                              ? 'غير قابل للتطبيق (قبل بدء مساهمة العضو)'
                              : language === 'en'
                              ? 'Not Applicable (Before contribution start date)'
                              : 'প্রযোজ্য নয় (সদস্যের অবদান শুরুর পূর্ববর্তী)'
                          }
                        >
                          <div className="text-[11px] font-medium text-gray-400">{monthLabel}</div>
                          <div className="text-xs font-bold my-0.5">—</div>
                          <div className="text-[9px] text-gray-500 font-medium">
                            {language === 'ar' ? 'غير قابل للتطبيق' : language === 'en' ? 'Not Applicable' : 'প্রযোজ্য নয়'}
                          </div>
                        </div>
                      );
                    }

                    if (mItem.status === 'future') {
                      return (
                        <div
                          key={mItem.month}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-500 text-center select-none"
                          title={
                            language === 'ar'
                              ? 'شهر قادم'
                              : language === 'en'
                              ? 'Upcoming Month'
                              : 'আসন্ন মাস'
                          }
                        >
                          <div className="text-[11px] font-medium text-slate-600">{monthLabel}</div>
                          <div className="text-xs font-bold my-0.5">—</div>
                          <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{language === 'ar' ? 'قادم' : language === 'en' ? 'Upcoming' : 'আসন্ন'}</span>
                          </div>
                        </div>
                      );
                    }

                    const isPaid = mItem.status === 'paid';

                    return (
                      <div
                        key={mItem.month}
                        className={`p-2.5 rounded-xl border transition-all text-center ${
                          isPaid
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs'
                            : 'bg-red-50/40 border-red-200/70 text-red-900'
                        }`}
                      >
                        <div className="text-[11px] font-medium text-gray-700">{monthLabel}</div>
                        <div className="text-xs font-bold font-mono my-0.5">
                          {isPaid ? `৳ ${formatLocalizedAmount(mItem.amount, language)}` : '৳ 0'}
                        </div>
                        <div className="flex items-center justify-center gap-1 text-[10px] font-semibold">
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">
                                {language === 'ar' ? 'مدفوع' : language === 'en' ? 'Paid' : 'পরিশোধিত'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-red-400" />
                              <span className="text-red-600">
                                {language === 'ar' ? 'مستحق' : language === 'en' ? 'Due' : 'বকেয়া'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cumulative Multi-year Total & Receipt Action */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#1E3A2F] to-[#2D5A41] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-emerald-200">
                    {language === 'ar'
                      ? 'إجمالي المساهمات التراكمية (جميع السنوات المعتمدة):'
                      : language === 'en'
                      ? 'Cumulative Contributions (All Verified Years):'
                      : 'সর্বমোট জমা (সকল অনুমোদিত বছর মিলিয়ে):'}
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    ৳ {formatLocalizedAmount(data?.cumulativeTotal || 0, language)}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
                  {paidMonthsForActiveYear.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isReceiptDownloadEnabled) {
                            setReceiptDisabledNotice(true);
                            return;
                          }
                          onOpenReceiptModal(member.id, selectedYear, paidMonthsForActiveYear);
                        }}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                          isReceiptDownloadEnabled
                            ? 'bg-white text-[#1E3A2F] hover:bg-emerald-50 cursor-pointer'
                            : 'bg-white/90 text-amber-900 border border-amber-300 hover:bg-white cursor-pointer'
                        }`}
                      >
                        <FileText className={`w-4 h-4 ${isReceiptDownloadEnabled ? 'text-[#2D5A41]' : 'text-amber-700'}`} />
                        <span>
                          {language === 'ar'
                            ? 'تحميل إيصال المساهمة'
                            : language === 'en'
                            ? 'Download Contribution Receipt'
                            : 'রসিদ ডাউনলোড করুন'}
                        </span>
                      </button>

                      {!isReceiptDownloadEnabled && (
                        <span className="text-[11px] text-amber-200 font-medium">
                          {language === 'ar'
                            ? 'خدمة تنزيل الإيصالات غير متاحة حالياً'
                            : language === 'en'
                            ? 'Receipt downloads currently unavailable'
                            : 'রসিদ ডাউনলোড সুবিধাটি আপাতত বন্ধ'}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-emerald-100 text-xs text-center">
                      {language === 'ar'
                        ? 'لا توجد مساهمات معتمدة لهذا العام لإصدار إيصال'
                        : language === 'en'
                        ? 'No verified contributions found for this fiscal year'
                        : 'এই বছরে কোনো যাচাইকৃত অবদান পাওয়া যায়নি।'}
                    </div>
                  )}
                </div>
              </div>

              {receiptDisabledNotice && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {language === 'ar'
                        ? 'عذراً، خدمة تنزيل الإيصالات غير متاحة حالياً. يرجى المحاولة لاحقاً.'
                        : language === 'en'
                        ? 'Sorry, receipt downloads are temporarily unavailable. Please try again later.'
                        : 'দুঃখিত, রসিদ ডাউনলোড সুবিধাটি আপাতত বন্ধ রয়েছে। অনুগ্রহ করে পরে চেষ্টা করুন।'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptDisabledNotice(false)}
                    className="text-amber-700 hover:text-amber-900 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : language === 'en' ? 'Close' : 'বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
