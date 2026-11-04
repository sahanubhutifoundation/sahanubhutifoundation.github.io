import React, { useState, useEffect } from 'react';
import { Sliders, X, Save, RotateCcw, AlertCircle, Check, Eye, RefreshCw, HelpCircle } from 'lucide-react';
import { SheetManualMapping, YearlyFundSource, FundData } from '../../types';
import { MONTH_KEYS, fetchFundData, getLocalizedMonthName } from '../../services/fundService';

interface AdminSheetMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearlySource: YearlyFundSource;
  onSaveMapping: (source: YearlyFundSource, mapping?: SheetManualMapping) => void;
}

// Helper to convert column letter (A, B, C... Z, AA...) or 1-based number into 0-based index
export function parseColInput(val: string): number | undefined {
  const trimmed = val.trim().toUpperCase();
  if (!trimmed) return undefined;

  // Numeric check (e.g. "5" -> 4)
  if (/^[0-9]+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return n >= 1 ? n - 1 : undefined;
  }

  // Column letter check (e.g. "A" -> 0, "B" -> 1, "Z" -> 25, "AA" -> 26)
  if (/^[A-Z]+$/.test(trimmed)) {
    let index = 0;
    for (let i = 0; i < trimmed.length; i++) {
      index = index * 26 + (trimmed.charCodeAt(i) - 64);
    }
    return index >= 1 ? index - 1 : undefined;
  }

  return undefined;
}

// Convert 0-based column index to letter (0 -> "A", 1 -> "B", 4 -> "E", 16 -> "Q")
export function indexToColLetter(index: number | undefined): string {
  if (index === undefined || index < 0) return '';
  let temp = index + 1;
  let letter = '';
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

export const AdminSheetMappingModal: React.FC<AdminSheetMappingModalProps> = ({
  isOpen,
  onClose,
  yearlySource,
  onSaveMapping,
}) => {
  const existing = yearlySource.manualMapping || {};

  const [headerRow, setHeaderRow] = useState<string>(
    existing.headerRowIndex !== undefined ? String(existing.headerRowIndex + 1) : ''
  );
  const [nameCol, setNameCol] = useState<string>(
    existing.nameColIndex !== undefined ? indexToColLetter(existing.nameColIndex) : ''
  );
  const [serialCol, setSerialCol] = useState<string>(
    existing.serialColIndex !== undefined ? indexToColLetter(existing.serialColIndex) : ''
  );
  const [commitmentCol, setCommitmentCol] = useState<string>(
    existing.commitmentColIndex !== undefined ? indexToColLetter(existing.commitmentColIndex) : ''
  );
  const [totalCol, setTotalCol] = useState<string>(
    existing.totalColIndex !== undefined ? indexToColLetter(existing.totalColIndex) : ''
  );
  const [excludedRows, setExcludedRows] = useState<string>(
    existing.excludedRowIndices ? existing.excludedRowIndices.map((i) => i + 1).join(', ') : ''
  );
  const [paymentFormat, setPaymentFormat] = useState<'auto' | 'boolean_marker' | 'numeric_amount' | 'checkmark'>(
    existing.paymentFormat || 'auto'
  );

  // Individual Month-to-Column inputs (Jan through Dec)
  const [monthCols, setMonthCols] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    MONTH_KEYS.forEach((m) => {
      if (existing.monthColIndices && existing.monthColIndices[m] !== undefined) {
        initial[m] = indexToColLetter(existing.monthColIndices[m]);
      } else {
        initial[m] = '';
      }
    });
    return initial;
  });

  // Diagnostics preview state
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    validMembers: number;
    discrepancyCount: number; // Blank monthly cells with annual total > 0
    inconsistentTotals: number;
    zeroContributionMembers: number;
    excludedRowCount: number;
    duplicateSerials: number;
    totalAmountReceived: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  if (!isOpen) return null;

  const buildDraftMapping = (): SheetManualMapping => {
    const parseIndex = (val: string) => parseColInput(val);

    const parsedExcluded: number[] = [];
    if (excludedRows.trim()) {
      excludedRows.split(',').forEach((part) => {
        const clean = part.trim();
        if (clean.includes('-')) {
          const [s, e] = clean.split('-').map((x) => parseInt(x.trim(), 10));
          if (!isNaN(s) && !isNaN(e)) {
            for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
              if (i >= 1) parsedExcluded.push(i - 1);
            }
          }
        } else {
          const n = parseInt(clean, 10);
          if (!isNaN(n) && n >= 1) {
            parsedExcluded.push(n - 1);
          }
        }
      });
    }

    const monthColIndices: Record<string, number> = {};
    MONTH_KEYS.forEach((m) => {
      const colVal = monthCols[m];
      if (colVal && colVal.trim()) {
        const idx = parseColInput(colVal);
        if (idx !== undefined) {
          monthColIndices[m] = idx;
        }
      }
    });

    const headerN = parseInt(headerRow.trim(), 10);
    const parsedHeader = !isNaN(headerN) && headerN >= 1 ? headerN - 1 : undefined;

    return {
      headerRowIndex: parsedHeader,
      nameColIndex: parseIndex(nameCol),
      serialColIndex: parseIndex(serialCol),
      commitmentColIndex: parseIndex(commitmentCol),
      totalColIndex: parseIndex(totalCol),
      monthColIndices: Object.keys(monthColIndices).length > 0 ? monthColIndices : undefined,
      paymentFormat,
      excludedRowIndices: parsedExcluded.length > 0 ? Array.from(new Set(parsedExcluded)) : undefined,
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Admin',
    };
  };

  const handleRunLivePreview = async () => {
    if (!yearlySource.url) {
      setPreviewError('এই বছরের জন্য কোনো স্প্রেডশিট লিংক কনফিগার করা নেই।');
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const draftMapping = buildDraftMapping();
      // Temporarily test fetch with this draft mapping
      const testSource = { ...yearlySource, manualMapping: draftMapping };
      const res = await fetchFundData(
        yearlySource.url,
        true,
        yearlySource.year,
        yearlySource.gid,
        draftMapping
      );

      const members = res.memberRecords || [];
      const discrepancyCount = members.filter((m) => m.hasDiscrepancy || (m.paidCount === 0 && m.totalContributed > 0)).length;
      const inconsistentTotals = members.filter((m) => m.isTotalInconsistent).length;
      const zeroContributionMembers = members.filter((m) => (m.totalContributed || 0) === 0).length;

      // Duplicate serial check
      const seenSerials = new Set<number>();
      let duplicateSerials = 0;
      members.forEach((m) => {
        if (m.serial && seenSerials.has(m.serial)) {
          duplicateSerials++;
        } else if (m.serial) {
          seenSerials.add(m.serial);
        }
      });

      const excludedRowCount = draftMapping.excludedRowIndices ? draftMapping.excludedRowIndices.length : 0;

      setPreviewData({
        validMembers: members.length,
        discrepancyCount,
        inconsistentTotals,
        zeroContributionMembers,
        excludedRowCount,
        duplicateSerials,
        totalAmountReceived: res.amountReceived || 0,
      });
    } catch (err: any) {
      setPreviewError(err?.message || 'লাইভ প্রিভিউ সম্পন্ন করা যায়নি। স্প্রেডশিট পারমিশন চেক করুন।');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSave = () => {
    const mapping = buildDraftMapping();
    onSaveMapping(yearlySource, mapping);
    onClose();
  };

  const handleResetToAuto = () => {
    onSaveMapping(yearlySource, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E0DBCF] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#2D5A41]" />
            <div>
              <h3 className="font-bold text-[#1E3A2F] text-base">
                ম্যানুয়াল কলাম ও লেআউট ম্যাপিং ({yearlySource.year} সাল)
              </h3>
              <p className="text-[11px] text-gray-500">
                স্বয়ংক্রিয় সনাক্তকরণ ব্যর্থ হলে নির্দিষ্ট কলাম ও রো নম্বর/অক্ষর নির্ধারণ করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] text-xs">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
            💡 স্প্রেডশিটে কলামের নাম ইংরেজি অক্ষর (যেমন: <strong>A, B, C, D... Q</strong>) অথবা নম্বর (যেমন: <strong>১, ২, ৩...</strong>) দিয়ে লিখতে পারেন। 
            ফাঁকা রাখলে সিস্টেম স্বয়ংক্রিয়ভাবে হেডার ও কলাম চিহ্নিত করবে।
          </div>

          {/* Core Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                হেডার রো নম্বর (Header Row #):
              </label>
              <input
                type="number"
                min="1"
                placeholder="যেমন: ৪ (ডিফল্ট অটো)"
                value={headerRow}
                onChange={(e) => setHeaderRow(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-[#FDFCF9] focus:outline-hidden focus:border-[#2D5A41]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">যে রো-তে কলামের নামসমূহ রয়েছে</span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                সদস্যের নাম কলাম (Name Col):
              </label>
              <input
                type="text"
                placeholder="যেমন: C বা ৩"
                value={nameCol}
                onChange={(e) => setNameCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-[#FDFCF9] focus:outline-hidden focus:border-[#2D5A41] uppercase"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">সদস্যের পূর্ণ নাম</span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                ক্রমিক নম্বর কলাম (Serial Col):
              </label>
              <input
                type="text"
                placeholder="যেমন: B বা ২"
                value={serialCol}
                onChange={(e) => setSerialCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-[#FDFCF9] focus:outline-hidden focus:border-[#2D5A41] uppercase"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">১, ২, ৩... ক্রমিক নম্বর</span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                অঙ্গীকার/রেট কলাম (Commitment Col):
              </label>
              <input
                type="text"
                placeholder="যেমন: D বা ৪"
                value={commitmentCol}
                onChange={(e) => setCommitmentCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-[#FDFCF9] focus:outline-hidden focus:border-[#2D5A41] uppercase"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">নির্ধারিত মাসিক হার (৳)</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                মোট জমা কলাম (Total Contributed Col):
              </label>
              <input
                type="text"
                placeholder="যেমন: Q বা ১৭"
                value={totalCol}
                onChange={(e) => setTotalCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-[#FDFCF9] focus:outline-hidden focus:border-[#2D5A41] uppercase"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                সদস্যের বাৎসরিক মোট জমার কলাম। উল্লেখ্য, মাসিক ঘরে এন্ট্রি না থাকলে সিস্টেম স্বয়ংক্রিয়ভাবে মাসিক পেমেন্ট বানাবে না।
              </span>
            </div>
          </div>

          {/* Month-to-Column Mapping (Jan - Dec) */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE8E0] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#EBE8E0]">
              <span className="font-bold text-xs text-[#2D5A41]">
                মাস-ভিত্তিক কলাম ম্যাপিং (Month-to-Column Mapping: Jan–Dec)
              </span>
              <span className="text-[10px] text-gray-500">
                কলাম অক্ষর (যেমন: E, F, G...) বা সংখ্যা লিখুন
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {MONTH_KEYS.map((m) => (
                <div key={m} className="p-2 bg-white rounded-lg border border-[#EBE8E0] text-center">
                  <span className="block text-[11px] font-bold text-[#2D3630] mb-1">
                    {getLocalizedMonthName(m, 'bn')}
                  </span>
                  <input
                    type="text"
                    placeholder="অটো"
                    value={monthCols[m] || ''}
                    onChange={(e) =>
                      setMonthCols({
                        ...monthCols,
                        [m]: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full text-center px-1.5 py-1 text-xs border border-gray-200 rounded font-mono font-semibold uppercase focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Format Modes */}
          <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] space-y-3">
            <span className="font-bold text-xs text-[#2D3630] block pb-1 border-b border-[#EBE8E0]">
              পেমেন্ট ইন্টারপ্রিটেশন মোড (Payment Format Mode):
            </span>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  paymentFormat === 'auto'
                    ? 'bg-[#E8EFEA]/40 border-[#2D5A41] text-[#1E3A2F]'
                    : 'bg-[#FDFCF9] border-[#EBE8E0] text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentFormat"
                  value="auto"
                  checked={paymentFormat === 'auto'}
                  onChange={() => setPaymentFormat('auto')}
                  className="mt-0.5 accent-[#2D5A41]"
                />
                <div>
                  <strong className="block text-xs text-[#2D3630]">
                    স্বয়ংক্রিয় সনাক্তকরণ (Auto Mode) — প্রস্তাবিত
                  </strong>
                  <p className="text-[11px] text-[#5C665F] mt-0.5">
                    সংখ্যা থাকলে সরাসরি টাকার অঙ্ক, আর টিকচিহ্ন (✓) বা 'হ্যাঁ' থাকলে সদস্যের মাসিক রেট অনুযায়ী জমা গণ্য হবে।
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  paymentFormat === 'boolean_marker'
                    ? 'bg-[#E8EFEA]/40 border-[#2D5A41] text-[#1E3A2F]'
                    : 'bg-[#FDFCF9] border-[#EBE8E0] text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentFormat"
                  value="boolean_marker"
                  checked={paymentFormat === 'boolean_marker'}
                  onChange={() => setPaymentFormat('boolean_marker')}
                  className="mt-0.5 accent-[#2D5A41]"
                />
                <div>
                  <strong className="block text-xs text-[#2D3630]">
                    চিহ্ন/টিকমার্ক মোড (Paid/Yes/✓ Markers)
                  </strong>
                  <p className="text-[11px] text-[#5C665F] mt-0.5">
                    ঘরে যেকোনো সক্রিয় মার্কার (✓, Paid, Yes, হ্যাঁ) থাকলে সদস্যের নির্ধারিত মাসিক অবদানের হার অনুযায়ী জমা ধরা হবে।
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  paymentFormat === 'numeric_amount'
                    ? 'bg-[#E8EFEA]/40 border-[#2D5A41] text-[#1E3A2F]'
                    : 'bg-[#FDFCF9] border-[#EBE8E0] text-gray-600 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentFormat"
                  value="numeric_amount"
                  checked={paymentFormat === 'numeric_amount'}
                  onChange={() => setPaymentFormat('numeric_amount')}
                  className="mt-0.5 accent-[#2D5A41]"
                />
                <div>
                  <strong className="block text-xs text-[#2D3630]">
                    সরাসরি টাকার অঙ্ক (Numeric Amount)
                  </strong>
                  <p className="text-[11px] text-[#5C665F] mt-0.5">
                    প্রতিটি ঘরে লিখিত প্রকৃত সাংখ্যিক পরিমাণই (যেমন: ৫০০, ১০০০) জমা হিসেবে সংগৃহীত হবে।
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Excluded Rows */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              বাদ দেওয়ার রো নম্বরসমূহ (Excluded Row Numbers):
            </label>
            <input
              type="text"
              placeholder="যেমন: ১, ২, ৩, ৩৩, ৩৫-৪০ (কমা বা রেঞ্জ দিয়ে আলাদা করুন)"
              value={excludedRows}
              onChange={(e) => setExcludedRows(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-[#FDFCF9] focus:outline-hidden focus:border-[#2D5A41]"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">
              সামারি, মোট আয়/ব্যয় বা নোট যুক্ত রোগুলো সদস্য তালিকায় অন্তর্ভুক্ত হওয়া প্রতিরোধ করে।
            </span>
          </div>

          {/* Live Preview Button & Diagnostics Report */}
          <div className="pt-2 border-t border-[#EBE8E0]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-[#2D3630]">
                ম্যাপিং পরীক্ষা ও ডায়াগনস্টিকস প্রিভিউ (Live Preview):
              </span>
              <button
                type="button"
                onClick={handleRunLivePreview}
                disabled={isPreviewLoading}
                className="px-3 py-1.5 rounded-lg bg-[#E8EFEA] hover:bg-[#D5E4D9] text-[#2D5A41] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPreviewLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>{isPreviewLoading ? 'পরীক্ষা করা হচ্ছে...' : 'প্রিভিউ পরীক্ষা চালান'}</span>
              </button>
            </div>

            {previewError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{previewError}</span>
              </div>
            )}

            {previewData && (
              <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-2.5">
                <div className="flex items-center justify-between font-bold text-xs text-[#1E3A2F]">
                  <span>সনাক্তকরণ ফলাফল:</span>
                  <span>মোট প্রাপ্তি: ৳ {previewData.totalAmountReceived.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-500 block">বৈধ সদস্য সংখ্যা</span>
                    <strong className="text-sm font-bold text-[#2D5A41] font-mono">
                      {previewData.validMembers} জন
                    </strong>
                  </div>

                  <div className={`p-2 rounded-lg border ${previewData.discrepancyCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-gray-200'}`}>
                    <span className="block truncate">মাসিকহীন কিন্তু মোট জমা</span>
                    <strong className={`text-sm font-bold font-mono ${previewData.discrepancyCount > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                      {previewData.discrepancyCount} টি অসঙ্গতি
                    </strong>
                  </div>

                  <div className={`p-2 rounded-lg border ${previewData.inconsistentTotals > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-gray-200'}`}>
                    <span className="block truncate">বাৎসরিক মোট অমিল</span>
                    <strong className={`text-sm font-bold font-mono ${previewData.inconsistentTotals > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {previewData.inconsistentTotals} জন
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-500 block">শূন্য জমার সদস্য</span>
                    <strong className="text-sm font-bold text-gray-700 font-mono">
                      {previewData.zeroContributionMembers} জন
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-500 block">বাদ দেওয়া রো</span>
                    <strong className="text-sm font-bold text-gray-700 font-mono">
                      {previewData.excludedRowCount} টি
                    </strong>
                  </div>

                  <div className={`p-2 rounded-lg border ${previewData.duplicateSerials > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-gray-200'}`}>
                    <span className="block truncate">ডুপ্লিকেট ক্রমিক</span>
                    <strong className={`text-sm font-bold font-mono ${previewData.duplicateSerials > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                      {previewData.duplicateSerials} টি
                    </strong>
                  </div>
                </div>

                {previewData.discrepancyCount > 0 && (
                  <p className="text-[10px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 leading-relaxed">
                    ⚠️ সতর্কবার্তা: {previewData.discrepancyCount} জন সদস্যের মাসিক কিস্তির ঘরে কোনো এন্ট্রি নেই কিন্তু বার্ষিক মোটের ঘরে টাকা রয়েছে। নীতিমালা অনুযায়ী সিস্টেম কোনো মাসিক পেমেন্ট কৃত্রিমভাবে তৈরি করবে না।
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToAuto}
            className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>অটো-ডিটেকশনে রিসেট</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>ম্যাপিং সংরক্ষণ করুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
