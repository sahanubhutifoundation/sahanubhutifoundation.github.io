import React, { useState } from 'react';
import { Sliders, X, Save, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { SheetManualMapping, YearlyFundSource } from '../../types';
import { MONTH_KEYS } from '../../services/fundService';

interface AdminSheetMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearlySource: YearlyFundSource;
  onSaveMapping: (source: YearlyFundSource, mapping?: SheetManualMapping) => void;
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
    existing.nameColIndex !== undefined ? String(existing.nameColIndex + 1) : ''
  );
  const [serialCol, setSerialCol] = useState<string>(
    existing.serialColIndex !== undefined ? String(existing.serialColIndex + 1) : ''
  );
  const [commitmentCol, setCommitmentCol] = useState<string>(
    existing.commitmentColIndex !== undefined ? String(existing.commitmentColIndex + 1) : ''
  );
  const [totalCol, setTotalCol] = useState<string>(
    existing.totalColIndex !== undefined ? String(existing.totalColIndex + 1) : ''
  );
  const [excludedRows, setExcludedRows] = useState<string>(
    existing.excludedRowIndices ? existing.excludedRowIndices.map((i) => i + 1).join(', ') : ''
  );
  const [paymentFormat, setPaymentFormat] = useState<'auto' | 'boolean_marker' | 'numeric_amount' | 'checkmark'>(
    existing.paymentFormat || 'auto'
  );

  if (!isOpen) return null;

  const handleSave = () => {
    const parseIndex = (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      const n = parseInt(trimmed, 10);
      return !isNaN(n) && n >= 1 ? n - 1 : undefined;
    };

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

    const mapping: SheetManualMapping = {
      headerRowIndex: parseIndex(headerRow),
      nameColIndex: parseIndex(nameCol),
      serialColIndex: parseIndex(serialCol),
      commitmentColIndex: parseIndex(commitmentCol),
      totalColIndex: parseIndex(totalCol),
      paymentFormat,
      excludedRowIndices: parsedExcluded.length > 0 ? Array.from(new Set(parsedExcluded)) : undefined,
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Admin',
    };

    onSaveMapping(yearlySource, mapping);
    onClose();
  };

  const handleResetToAuto = () => {
    onSaveMapping(yearlySource, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E0DBCF] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#2D5A41]" />
            <div>
              <h3 className="font-bold text-[#1E3A2F] text-base">
                ম্যানুয়াল কলাম ও লেআউট ম্যাপিং ({yearlySource.year} সাল)
              </h3>
              <p className="text-[11px] text-gray-500">
                স্বয়ংক্রিয় সনাক্তকরণ ব্যর্থ হলে নির্দিষ্ট কলাম ও রো নম্বর নির্ধারণ করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
            💡 স্প্রেডশিটে রো ও কলাম নম্বর ১ থেকে গণনা শুরু হবে (যেমন: A কলাম = ১, B কলাম = ২, C কলাম = ৩)।
            ফাঁকা রাখলে সিস্টেম স্বয়ংক্রিয়ভাবে হেডার ও কলাম চিহ্নিত করবে।
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                সদস্যের নাম কলাম # (Name Col):
              </label>
              <input
                type="number"
                min="1"
                placeholder="যেমন: ৩ (C কলাম)"
                value={nameCol}
                onChange={(e) => setNameCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                ক্রমিক নম্বর কলাম # (Serial Col):
              </label>
              <input
                type="number"
                min="1"
                placeholder="যেমন: ২ (B কলাম)"
                value={serialCol}
                onChange={(e) => setSerialCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                অঙ্গীকার/রেট কলাম # (Commitment Col):
              </label>
              <input
                type="number"
                min="1"
                placeholder="যেমন: ৪ (D কলাম)"
                value={commitmentCol}
                onChange={(e) => setCommitmentCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                মোট জমা কলাম # (Total Col):
              </label>
              <input
                type="number"
                min="1"
                placeholder="যেমন: ১৭ (Q কলাম)"
                value={totalCol}
                onChange={(e) => setTotalCol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                পেমেন্ট ফরম্যাট মোড:
              </label>
              <select
                value={paymentFormat}
                onChange={(e) => setPaymentFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="auto">স্বয়ংক্রিয় সনাক্তকরণ (Auto)</option>
                <option value="boolean_marker">চিহ্ন/টিকমার্ক (Paid/Yes/✓)</option>
                <option value="numeric_amount">সরাসরি টাকার অঙ্ক (Numeric)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              বাদ দেওয়ার রো নম্বরসমূহ (Excluded Row Numbers):
            </label>
            <input
              type="text"
              placeholder="যেমন: ১, ২, ৩, ৩৩, ৩৫-৪০ (কমা বা রেঞ্জ দিয়ে আলাদা করুন)"
              value={excludedRows}
              onChange={(e) => setExcludedRows(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
            <span className="text-[10px] text-gray-500 mt-0.5 block">
              সামারি, মোট আয়/ব্যয় বা নোট যুক্ত রোগুলো সদস্য তালিকায় অন্তর্ভুক্ত হওয়া প্রতিরোধ করে।
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToAuto}
            className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>অটো-ডিটেকশনে রিসেট</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] rounded-xl flex items-center gap-1.5 shadow-xs"
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
