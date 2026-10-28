import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FoundationConfig, Member, FundMemberRecord, YearlyFundSource } from '../../types';
import { DonationReceiptCard, ReceiptData } from './DonationReceiptCard';
import { downloadReceiptElement, downloadReceiptsZip } from '../../utils/receiptDownload';
import { getDeterministicReceiptNumber } from '../../utils/receiptNumbering';
import { toBengaliNumeral, BENGALI_MONTH_NAMES, ORDERED_MONTH_KEYS } from '../../utils/bengaliWords';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Copy,
  Calendar,
  User,
  Archive,
  RefreshCw,
  Printer
} from 'lucide-react';

interface OnlineReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FoundationConfig;
  membersList: Member[];
  yearlySources: YearlyFundSource[];
  currentYear: string;
  memberRecords?: FundMemberRecord[];
  onYearChange?: (year: string) => void;
  isLoadingYearData?: boolean;
}

export const OnlineReceiptModal: React.FC<OnlineReceiptModalProps> = ({
  isOpen,
  onClose,
  config,
  membersList,
  yearlySources,
  currentYear,
  memberRecords = [],
  onYearChange,
  isLoadingYearData = false,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [multiMonthMode, setMultiMonthMode] = useState<'single' | 'separate'>('single');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'preview' | 'controls'>('preview');
  const [zoomMode, setZoomMode] = useState<'fit' | 'actual'>('fit');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [measuredCardHeight, setMeasuredCardHeight] = useState<number>(750);

  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const batchContainerRef = useRef<HTMLDivElement>(null);

  // Sync year prop with state
  useEffect(() => {
    setSelectedYear(currentYear);
  }, [currentYear]);

  // Responsive width observer for mobile preview proportional scaling
  useEffect(() => {
    if (!previewContainerRef.current) return;
    const updateWidth = () => {
      if (previewContainerRef.current) {
        setContainerWidth(previewContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(previewContainerRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [isOpen, mobileTab]);

  // Measure rendered receipt height dynamically to collapse transform blank space
  useEffect(() => {
    if (previewCardRef.current) {
      const h = previewCardRef.current.offsetHeight;
      if (h && h > 300) {
        setMeasuredCardHeight(h);
      }
    }
  }, [selectedMonths, selectedMemberId, selectedYear]);

  const effectiveScale = useMemo(() => {
    if (zoomMode === 'actual') return 1.0;
    if (!containerWidth || containerWidth >= 680) {
      return 1.0;
    }
    const avail = Math.max(260, containerWidth - 16);
    return Math.min(1.0, Math.max(0.40, avail / 680));
  }, [containerWidth, zoomMode]);

  // Combine members list from configuration and sheet records for full coverage
  const availableMembers = useMemo(() => {
    const list: { id: string; nameBn: string; nameEn?: string; serial?: number; memberObj: Member }[] = [];
    const seenNames = new Set<string>();

    // 1. From registered members
    membersList.forEach((m) => {
      const nameBn = m.nameBn || m.name || '';
      if (nameBn.trim() && !seenNames.has(nameBn.trim().toLowerCase())) {
        seenNames.add(nameBn.trim().toLowerCase());
        list.push({
          id: m.id,
          nameBn: nameBn.trim(),
          nameEn: m.nameEn,
          serial: m.serial,
          memberObj: m,
        });
      }
    });

    // 2. From current sheet records if not already present
    memberRecords.forEach((rec) => {
      const recName = (rec.name || '').trim();
      if (recName && !seenNames.has(recName.toLowerCase())) {
        seenNames.add(recName.toLowerCase());
        const synthMember: Member = {
          id: `sheet-${rec.serial}`,
          serial: rec.serial,
          name: recName,
          nameBn: recName,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        list.push({
          id: synthMember.id,
          nameBn: recName,
          serial: rec.serial,
          memberObj: synthMember,
        });
      }
    });

    return list.sort((a, b) => (a.serial || 9999) - (b.serial || 9999));
  }, [membersList, memberRecords]);

  // Auto-select first member if none selected
  useEffect(() => {
    if (!selectedMemberId && availableMembers.length > 0) {
      setSelectedMemberId(availableMembers[0].id);
    }
  }, [availableMembers, selectedMemberId]);

  // Find currently selected member
  const currentMember = useMemo(() => {
    return availableMembers.find((m) => m.id === selectedMemberId)?.memberObj;
  }, [availableMembers, selectedMemberId]);

  // Find member's sheet record for the current year
  const currentMemberSheetRecord = useMemo(() => {
    if (!currentMember) return null;
    const searchBn = (currentMember.nameBn || currentMember.name || '').trim().toLowerCase();
    const searchEn = (currentMember.nameEn || '').trim().toLowerCase();

    return memberRecords.find((rec) => {
      const recName = (rec.name || '').trim().toLowerCase();
      if (recName === searchBn) return true;
      if (searchEn && recName === searchEn) return true;
      if (currentMember.serial && rec.serial === currentMember.serial) return true;
      return false;
    });
  }, [currentMember, memberRecords]);

  // Available paid months for this member in the selected year
  const memberMonthStatus = useMemo(() => {
    const statusMap: Record<string, { isPaid: boolean; rawStatus: string }> = {};
    if (!currentMemberSheetRecord) {
      ORDERED_MONTH_KEYS.forEach((m) => {
        statusMap[m] = { isPaid: false, rawStatus: 'unpaid' };
      });
      return statusMap;
    }

    const recMonths = currentMemberSheetRecord.months || {};
    ORDERED_MONTH_KEYS.forEach((m) => {
      // Check case-insensitively
      const val = recMonths[m] || (recMonths as any)[m.toLowerCase()] || '';
      const isPaid = val === 'paid' || val === 'Paid' || val === 'পরিশোধিত' || val === 'PAID';
      statusMap[m] = { isPaid, rawStatus: val };
    });
    return statusMap;
  }, [currentMemberSheetRecord]);

  // Auto-select latest paid month when member or year changes
  useEffect(() => {
    const paidMonths = ORDERED_MONTH_KEYS.filter((m) => memberMonthStatus[m]?.isPaid);
    if (paidMonths.length > 0) {
      // Retain already selected if valid, otherwise select latest paid
      setSelectedMonths((prev) => {
        const stillValid = prev.filter((m) => memberMonthStatus[m]?.isPaid);
        return stillValid.length > 0 ? stillValid : [paidMonths[paidMonths.length - 1]];
      });
    } else {
      setSelectedMonths([]);
    }
  }, [memberMonthStatus]);

  // Handle year change
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonths([]);
    if (onYearChange) {
      onYearChange(year);
    }
  };

  // Toggle month selection
  const handleToggleMonth = (m: string) => {
    if (!memberMonthStatus[m]?.isPaid) return; // Only allow selecting verified paid months
    setSelectedMonths((prev) => {
      if (prev.includes(m)) {
        return prev.filter((item) => item !== m);
      } else {
        return [...prev, m].sort(
          (a, b) => ORDERED_MONTH_KEYS.indexOf(a) - ORDERED_MONTH_KEYS.indexOf(b)
        );
      }
    });
  };

  const handleSelectAllPaidMonths = () => {
    const paid = ORDERED_MONTH_KEYS.filter((m) => memberMonthStatus[m]?.isPaid);
    setSelectedMonths(paid);
  };

  const handleClearMonths = () => {
    setSelectedMonths([]);
  };

  // Monthly commitment amount
  const monthlyCommitment = currentMemberSheetRecord?.commitment || 500;
  const totalReceiptAmount = selectedMonths.length * monthlyCommitment;

  // Build receipt data object for preview
  const previewReceiptData: ReceiptData | null = useMemo(() => {
    if (!currentMember || selectedMonths.length === 0) return null;

    const firstMonthBn = BENGALI_MONTH_NAMES[selectedMonths[0]] || selectedMonths[0];
    const lastMonthBn = BENGALI_MONTH_NAMES[selectedMonths[selectedMonths.length - 1]] || selectedMonths[selectedMonths.length - 1];

    let periodLabel = `${firstMonthBn} ${toBengaliNumeral(selectedYear)}`;
    if (selectedMonths.length > 1) {
      periodLabel = `${firstMonthBn} – ${lastMonthBn} ${toBengaliNumeral(selectedYear)} (${toBengaliNumeral(selectedMonths.length)} মাস)`;
    }

    const prefix = config.donationReceiptSettings?.receiptPrefix || 'SF-MR';
    const isConsolidated = selectedMonths.length > 1;
    const memberSerialOrCode = currentMember.serial ? currentMember.serial : (currentMember.id || '001').slice(-3);
    const receiptNumber = getDeterministicReceiptNumber(
      prefix,
      selectedYear,
      memberSerialOrCode,
      currentMember.id,
      selectedMonths,
      isConsolidated
    );

    const todayBn = new Intl.DateTimeFormat('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    return {
      receiptNumber,
      issueDate: todayBn,
      year: selectedYear,
      months: selectedMonths,
      periodLabel,
      member: currentMember,
      amount: totalReceiptAmount,
    };
  }, [currentMember, selectedMonths, selectedYear, totalReceiptAmount, config]);

  // Handle PNG / JPG Single Download
  const handleDownloadSingle = async (format: 'png' | 'jpeg') => {
    if (!previewCardRef.current || !previewReceiptData) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(null);
      setDownloadError(null);
      const filename = `Sahanubhuti_Receipt_${previewReceiptData.receiptNumber}`;
      await downloadReceiptElement({
        element: previewCardRef.current,
        filename,
        format,
        quality: 0.98,
      });
      setDownloadSuccess(`রসিদ (${format.toUpperCase()}) সফলভাবে ডাউনলোড হয়েছে!`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      console.error('Receipt download error:', err);
      setDownloadError(err?.message ? `রসিদ তৈরিতে সমস্যা হয়েছে: ${err.message}` : 'রসিদ তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Multi-month Batch Download (ZIP or separate)
  const handleDownloadBatchZip = async (format: 'png' | 'jpeg') => {
    if (!currentMember || selectedMonths.length === 0 || !batchContainerRef.current) return;
    try {
      setIsDownloading(true);
      setDownloadSuccess(null);
      setDownloadError(null);

      const items = Array.from(batchContainerRef.current.children).map((el, idx) => {
        const monthKey = selectedMonths[idx] || `month-${idx + 1}`;
        const prefix = config.donationReceiptSettings?.receiptPrefix || 'SF-MR';
        const memberCode = currentMember.serial ? String(currentMember.serial).padStart(3, '0') : '001';
        const filename = `${prefix}_${selectedYear}_${memberCode}_${monthKey}`;
        const cardEl = (el.querySelector('#printable-donation-receipt') || el.firstElementChild || el) as HTMLElement;
        return {
          element: cardEl,
          filename,
          format,
        };
      });

      const memberNameSafe = (currentMember.nameBn || currentMember.name || 'member').replace(/\s+/g, '_');
      const zipName = `Sahanubhuti_Receipts_${memberNameSafe}_${selectedYear}`;

      await downloadReceiptsZip(items, zipName);
      setDownloadSuccess(`সব মাসের (${selectedMonths.length}টি) রসিদ জিপ ফাইলে ডাউনলোড হয়েছে!`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      console.error('Batch download error:', err);
      setDownloadError(err?.message ? `ব্যাচ রসিদ ডাউনলোডে সমস্যা হয়েছে: ${err.message}` : 'ব্যাচ রসিদ ডাউনলোডে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const paidMonthsCount = ORDERED_MONTH_KEYS.filter((m) => memberMonthStatus[m]?.isPaid).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-emerald-900/10 w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden my-auto sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-emerald-900 text-white border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-lg text-emerald-200">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight">
                অনলাইন চাঁদা ও অনুদান রসিদ
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200/80">
                আপনার জমাকৃত মাসিক চাঁদা ও অনুদানের তথ্য নির্বাচন করে রসিদ সংরক্ষণ করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile View Switcher (Visible on small screens < lg) */}
        <div className="lg:hidden flex items-center p-1.5 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-emerald-800 text-white shadow-xs font-bold'
                : 'text-emerald-900 hover:bg-emerald-100/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>রসিদ প্রিভিউ {previewReceiptData ? `(৳${toBengaliNumeral(previewReceiptData.amount)})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('controls')}
            className={`flex-1 py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'controls'
                ? 'bg-emerald-800 text-white shadow-xs font-bold'
                : 'text-emerald-900 hover:bg-emerald-100/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>মাস ও সদস্য নির্বাচন</span>
          </button>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto p-3 sm:p-6 gap-6">
          {/* Left Column: Selection Controls (5 cols) */}
          <div className={`lg:col-span-5 flex-col gap-5 border-b lg:border-b-0 lg:border-r border-gray-200 lg:pr-6 pb-6 lg:pb-0 ${mobileTab === 'controls' ? 'flex' : 'hidden lg:flex'}`}>
            {/* Year Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>আর্থিক বছর নির্বাচন করুন</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {yearlySources.map((s) => (
                  <button
                    key={s.year}
                    type="button"
                    onClick={() => handleYearChange(s.year)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                      selectedYear === s.year
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {toBengaliNumeral(s.year)}
                  </button>
                ))}
              </div>
            </div>

            {/* Member Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5 uppercase tracking-wide">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>সদস্যের নাম নির্বাচন করুন</span>
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-sm font-medium border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none shadow-sm"
              >
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.serial ? `[#${m.serial}] ` : ''}{m.nameBn} {m.nameEn ? `(${m.nameEn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Verification Status Card */}
            <div className="p-3.5 rounded-xl border bg-emerald-50/50 border-emerald-200/70 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-emerald-950">
                  {currentMember?.nameBn || currentMember?.name || 'সদস্য'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {toBengaliNumeral(paidMonthsCount)} মাস পরিশোধিত
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                মাসিক নিয়মিত হার: <span className="font-bold text-emerald-900">৳{toBengaliNumeral(monthlyCommitment)}</span>
                {(currentMember?.address || currentMember?.location) && ` • এলাকা: ${currentMember.address || currentMember.location}`}
                {currentMember?.phone && ` • মোবা: ${currentMember.phone}`}
              </p>
            </div>

            {/* Month Selection Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>মাস নির্বাচন করুন (ভেরিফাইড জমা)</span>
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllPaidMonths}
                    className="text-emerald-700 hover:text-emerald-900 font-medium underline"
                  >
                    সব জমা নির্বাচন
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearMonths}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    বাতিল
                  </button>
                </div>
              </div>

              {isLoadingYearData ? (
                <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>তথ্য যাচাই করা হচ্ছে...</span>
                </div>
              ) : memberRecords.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">এই বছরের কোনো রেকর্ড পাওয়া যায়নি।</span>
                    <p className="text-[11px] mt-0.5 text-amber-700">
                      গুগল শিটে {toBengaliNumeral(selectedYear)} সালের হিসাব সংরক্ষিত না থাকলে রসিদ তৈরি করা যাবে না।
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ORDERED_MONTH_KEYS.map((m) => {
                    const isPaid = memberMonthStatus[m]?.isPaid;
                    const isSelected = selectedMonths.includes(m);
                    const monthNameBn = BENGALI_MONTH_NAMES[m] || m;

                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={!isPaid}
                        onClick={() => handleToggleMonth(m)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                          !isPaid
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-600/30'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40'
                        }`}
                      >
                        <span className="font-bold">{monthNameBn}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : isPaid ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>
                          {isPaid ? 'পরিশোধিত' : 'রেকর্ড নেই'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Notice when unpaid month is viewed */}
              {paidMonthsCount === 0 && memberRecords.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">এই সদস্যের জন্য জমার রেকর্ড পাওয়া যায়নি।</span>
                    <p className="text-[11px] mt-0.5 text-red-700">
                      অপ্রদত্ত বা ভেরিফাই না করা মাসের জন্য রসিদ ইস্যু করা সম্ভব নয়।
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-month Mode (Only visible if > 1 month selected) */}
            {selectedMonths.length > 1 && (
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs">
                <label className="font-bold text-emerald-950 block mb-2">
                  একাধিক মাসের রসিদ মোড:
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="multiMonthMode"
                      checked={multiMonthMode === 'single'}
                      onChange={() => setMultiMonthMode('single')}
                      className="text-emerald-800 focus:ring-emerald-600"
                    />
                    <span className="font-semibold text-gray-800">
                      সব মাসের জন্য একটি রসিদ (একত্রে {toBengaliNumeral(selectedMonths.length)} মাস)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="multiMonthMode"
                      checked={multiMonthMode === 'separate'}
                      onChange={() => setMultiMonthMode('separate')}
                      className="text-emerald-800 focus:ring-emerald-600"
                    />
                    <span className="font-semibold text-gray-800">
                      প্রতিটি মাসের জন্য আলাদা রসিদ (আলাদা ফাইল বা ZIP)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Download Buttons Section */}
            <div className="pt-2 flex flex-col gap-2">
              {downloadSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{downloadSuccess}</span>
                </div>
              )}

              {downloadError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{downloadError}</span>
                </div>
              )}

              {multiMonthMode === 'separate' && selectedMonths.length > 1 ? (
                /* Multi-month ZIP download */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isDownloading || selectedMonths.length === 0}
                    onClick={() => handleDownloadBatchZip('png')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    <span>সব রসিদ ZIP (PNG)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloading || selectedMonths.length === 0}
                    onClick={() => handleDownloadBatchZip('jpeg')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    <span>সব রসিদ ZIP (JPG)</span>
                  </button>
                </div>
              ) : (
                /* Single or Consolidated Receipt Download */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isDownloading || !previewReceiptData}
                    onClick={() => handleDownloadSingle('png')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>পিএনজি (PNG) ডাউনলোড</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloading || !previewReceiptData}
                    onClick={() => handleDownloadSingle('jpeg')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>জেপিজি (JPG) ডাউনলোড</span>
                  </button>
                </div>
              )}

              {/* View Preview button on mobile */}
              <div className="lg:hidden pt-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('preview')}
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>রসিদ প্রিভিউ দেখুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Receipt Preview (7 cols) */}
          <div
            ref={previewContainerRef}
            className={`lg:col-span-7 flex-col items-center justify-start bg-gray-50/80 p-2 sm:p-5 rounded-2xl border border-gray-200 overflow-y-auto ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}
          >
            <div className="w-full flex items-center justify-between mb-3 px-1 text-xs text-gray-500 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  লাইভ রসিদ প্রিভিউ (স্বয়ংক্রিয়)
                </span>
                {previewReceiptData && (
                  <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    ৳{toBengaliNumeral(previewReceiptData.amount)}
                  </span>
                )}
              </div>

              {/* Mobile Quick Switcher & Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMobileTab('controls')}
                  className="lg:hidden px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors cursor-pointer"
                >
                  মাস পরিবর্তন
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMode((z) => (z === 'fit' ? 'actual' : 'fit'))}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition-colors cursor-pointer"
                  title={zoomMode === 'fit' ? '১০০% আসল সাইজ দেখুন' : 'স্ক্রিন সাইজে ফিট করুন'}
                >
                  {zoomMode === 'fit' ? '🔍 ১০০% সাইজ' : '📱 ফিট স্ক্রিন'}
                </button>
              </div>
            </div>

            {previewReceiptData ? (
              <div
                className={`w-full flex justify-center ${zoomMode === 'actual' ? 'overflow-x-auto' : 'overflow-x-hidden'}`}
                style={{
                  minHeight: effectiveScale < 1 ? `${Math.ceil(measuredCardHeight * effectiveScale)}px` : 'auto',
                }}
              >
                <div
                  style={{
                    width: '680px',
                    minWidth: '680px',
                    maxWidth: '680px',
                    transform: effectiveScale < 1 ? `scale(${effectiveScale})` : 'none',
                    transformOrigin: 'top center',
                    marginBottom: effectiveScale < 1 ? `-${Math.ceil(measuredCardHeight * (1 - effectiveScale))}px` : 0,
                  }}
                >
                  <DonationReceiptCard
                    cardRef={previewCardRef}
                    receipt={previewReceiptData}
                    config={config}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
                <FileText className="w-12 h-12 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">
                  রসিদ দেখতে বাম পাশ থেকে মাস নির্বাচন করুন।
                </p>
                <p className="text-xs text-gray-400 max-w-xs">
                  শুধুমাত্র ভেরিফাইড এবং পরিশোধিত মাসের জন্যই অফিসিয়াল ডিজিটাল রসিদ ইস্যু করা যায়।
                </p>
                <button
                  type="button"
                  onClick={() => setMobileTab('controls')}
                  className="lg:hidden mt-2 px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  মাস নির্বাচন করুন
                </button>
              </div>
            )}

            {/* Mobile Download Action Buttons (conveniently accessible right beneath preview) */}
            {previewReceiptData && (
              <div className="w-full mt-4 flex flex-col gap-2 lg:hidden pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadSingle('png')}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>পিএনজি (PNG)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadSingle('jpeg')}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>জেপিজি (JPG)</span>
                  </button>
                </div>
                {multiMonthMode === 'separate' && selectedMonths.length > 1 && (
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadBatchZip('png')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    <Archive className="w-4 h-4" />
                    <span>সব রসিদ ZIP (PNG) ডাউনলোড</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hidden Container for Batch Mode Rendering (used by JSZip) */}
        {multiMonthMode === 'separate' && currentMember && selectedMonths.length > 1 && (
          <div
            ref={batchContainerRef}
            className="fixed -left-[5000px] top-0 pointer-events-none opacity-0 overflow-hidden"
            style={{ width: '680px' }}
            aria-hidden="true"
          >
            {selectedMonths.map((m) => {
              const monthBn = BENGALI_MONTH_NAMES[m] || m;
              const prefix = config.donationReceiptSettings?.receiptPrefix || 'SF-MR';
              const memberSerialOrCode = currentMember.serial ? currentMember.serial : (currentMember.id || '001').slice(-3);
              const receiptNo = getDeterministicReceiptNumber(
                prefix,
                selectedYear,
                memberSerialOrCode,
                currentMember.id,
                [m],
                false
              );
              const singleData: ReceiptData = {
                receiptNumber: receiptNo,
                issueDate: new Intl.DateTimeFormat('bn-BD', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date()),
                year: selectedYear,
                months: [m],
                periodLabel: `${monthBn} ${toBengaliNumeral(selectedYear)}`,
                member: currentMember,
                amount: monthlyCommitment,
              };

              return (
                <div key={m} className="mb-4">
                  <DonationReceiptCard
                    receipt={singleData}
                    config={config}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
