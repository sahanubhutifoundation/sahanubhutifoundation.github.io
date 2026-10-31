import React, { useState } from 'react';
import { OtherMonthlyContribution, MainFundAccountingStatus } from '../../types';
import { storageService } from '../../services/storageService';
import { parseRecordYear } from '../../utils/foundationHelpers';
import {
  Heart,
  Plus,
  Save,
  Trash2,
  Edit2,
  X,
  ShieldCheck,
  UserCheck,
  Calendar,
  AlertCircle,
  Coins,
  CheckCircle2,
  HelpCircle,
  Check,
  FileSpreadsheet
} from 'lucide-react';

interface AdminOtherContributionsManagerProps {
  onDataChanged?: () => void;
  selectedYear?: string;
}

export const AdminOtherContributionsManager: React.FC<AdminOtherContributionsManagerProps> = ({
  onDataChanged,
  selectedYear,
}) => {
  const [activeYearFilter, setActiveYearFilter] = useState<string>(selectedYear || 'all');
  const [contributions, setContributions] = useState<OtherMonthlyContribution[]>(() =>
    storageService.getOtherMonthlyContributions(selectedYear || 'all')
  );

  React.useEffect(() => {
    if (selectedYear && selectedYear !== activeYearFilter) {
      setActiveYearFilter(selectedYear);
    }
  }, [selectedYear]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [month, setMonth] = useState<string>('মার্চ');
  const [year, setYear] = useState<string>(selectedYear || '2026');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [contributorName, setContributorName] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');

  // Main Fund Accounting Status Form Choice (Required)
  // A: 'already_included' ("হ্যাঁ, মূল ফান্ডে আগে থেকেই যোগ করা আছে")
  // B: 'not_included' ("না, মূল ফান্ডে এখনো যোগ করা হয়নি")
  const [accountingChoice, setAccountingChoice] = useState<'already_included' | 'not_included' | ''>('');

  // Modals state
  const [inclusionModalItem, setInclusionModalItem] = useState<OtherMonthlyContribution | null>(null);
  const [reconcileModalItem, setReconcileModalItem] = useState<OtherMonthlyContribution | null>(null);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const refreshList = (targetFilter: string = activeYearFilter) => {
    const list = storageService.getOtherMonthlyContributions(targetFilter);
    setContributions(list);
    if (onDataChanged) onDataChanged();
  };

  React.useEffect(() => {
    refreshList(activeYearFilter);
  }, [activeYearFilter]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const yr = parseRecordYear(newDate);
    if (yr) {
      setYear(yr);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setAmount('');
    setContributorName('');
    setIsAnonymous(false);
    setNote('');
    setAccountingChoice('');
    setErrorMsg('');
  };

  const handleStartCreate = () => {
    resetForm();
    setIsEditing(true);
    setEditingId(null);
    setAccountingChoice('');
    const defaultYear = (activeYearFilter !== 'all' && activeYearFilter !== 'unverified') ? activeYearFilter : '2026';
    setYear(defaultYear);
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleStartEdit = (item: OtherMonthlyContribution) => {
    setIsEditing(true);
    setEditingId(item.id);
    setMonth(item.month || 'মার্চ');
    setYear(parseRecordYear(item.date, item.year) || '2026');
    setDate(item.date || '');
    setAmount(String(item.amount || ''));
    setContributorName(item.contributorName || '');
    setIsAnonymous(Boolean(item.isAnonymous));
    setNote(item.note || '');
    if (item.accountingStatus === 'already_included') {
      setAccountingChoice('already_included');
    } else if (item.accountingStatus === 'not_included') {
      setAccountingChoice('not_included');
    } else {
      setAccountingChoice('');
    }
    setErrorMsg('');
  };

  const handleSave = () => {
    setErrorMsg('');
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('অনুগ্রহ করে সঠিক অনুদানের পরিমাণ উল্লেখ করুন (০ এর বেশি হতে হবে)।');
      return;
    }

    if (!date || !date.trim()) {
      setErrorMsg('অনুগ্রহ করে অনুদানের লেনদেনের তারিখ প্রদান করুন।');
      return;
    }
    if (!accountingChoice) {
      setErrorMsg('অনুগ্রহ করে নির্বাচন করুন: "মূল ফান্ডে এই টাকা কি আগে থেকেই যোগ করা আছে?"');
      return;
    }

    // Check duplicate if creating new
    if (!editingId) {
      const isDuplicate = contributions.some(
        (c) =>
          c.amount === parsedAmount &&
          c.date === date &&
          c.contributorName?.trim().toLowerCase() === contributorName.trim().toLowerCase() &&
          c.isAnonymous === isAnonymous
      );
      if (isDuplicate) {
        setErrorMsg('সতর্কতা: একই তারিখ, ব্যক্তি ও পরিমাণের অনুদান ইতিমধ্যে সংরক্ষিত আছে।');
        return;
      }
    }

    const isAlreadyIncluded = accountingChoice === 'already_included';
    const existingItem = editingId ? contributions.find((c) => c.id === editingId) : null;
    const finalYear = parseRecordYear(date, year) || '2026';

    const itemToSave: OtherMonthlyContribution = {
      id: editingId || `other-contrib-${Date.now()}`,
      date,
      month,
      year: finalYear,
      amount: parsedAmount,
      contributorName: isAnonymous ? '' : contributorName.trim(),
      isAnonymous,
      note: note.trim(),
      source: existingItem?.source || 'admin',
      sheetRowIndex: existingItem?.sheetRowIndex,
      accountingStatus: isAlreadyIncluded ? 'already_included' : 'not_included',
      includedInMainFund: isAlreadyIncluded ? true : (existingItem?.includedInMainFund ?? false),
      isExplicitlyAdded: isAlreadyIncluded ? false : (existingItem?.isExplicitlyAdded ?? false),
      createdAt: existingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveOtherMonthlyContribution(itemToSave);
    setSuccessMsg(
      editingId
        ? 'অনুদান সফলভাবে হালনাগাদ করা হয়েছে।'
        : isAlreadyIncluded
        ? 'নতুন অনুদান সংরক্ষিত হয়েছে (মূল ফান্ডে আগে থেকেই যোগ করা হিসেবে চিহ্নিত, ডাবল কাউন্টিং প্রতিরোধ)।'
        : 'নতুন অনুদান সংরক্ষিত হয়েছে (প্রয়োজনে মূল ফান্ডে যোগ করতে পারবেন)।'
    );
    setTimeout(() => setSuccessMsg(''), 4500);

    resetForm();
    refreshList();
  };

  const handleDelete = (id: string) => {
    const target = contributions.find((c) => c.id === id);
    if (!target) return;

    if (window.confirm('আপনি কি নিশ্চিতভাবে এই অনুদান রেকর্ডটি মুছে ফেলতে চান? এতে কেবল এই নির্দিষ্ট রেকর্ডটি অপসারিত হবে, গুগল শিট বা অন্য কোনো রেকর্ড প্রভাবিত হবে না।')) {
      storageService.deleteOtherMonthlyContribution(id);
      refreshList();
      setSuccessMsg('অনুদান রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Action: Add not_included contribution to Main Fund
  const handleConfirmInclusion = () => {
    if (!inclusionModalItem) return;

    // Strict Double-counting check
    if (inclusionModalItem.includedInMainFund) {
      setErrorMsg('এই অনুদানটি ইতিমধ্যে মূল ফান্ডে অন্তর্ভুক্ত রয়েছে। ডাবল কাউন্টিং রোধে পুনরায় যোগ করা যাবে না।');
      setInclusionModalItem(null);
      return;
    }

    const updated: OtherMonthlyContribution = {
      ...inclusionModalItem,
      accountingStatus: 'not_included',
      includedInMainFund: true,
      isExplicitlyAdded: true,
      includedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveOtherMonthlyContribution(updated);
    setInclusionModalItem(null);
    setSuccessMsg(`অনুদানের ৳${Number(updated.amount).toLocaleString()} সফলভাবে মূল ফান্ডে যোগ করা হয়েছে! ডুপ্লিকেশন সুরক্ষা সক্রিয়।`);
    setTimeout(() => setSuccessMsg(''), 4500);
    refreshList();
  };

  // Action: Reconcile unverified record
  const handleReconcileStatus = (status: 'already_included' | 'not_included_and_add' | 'not_included_pending') => {
    if (!reconcileModalItem) return;

    let updated: OtherMonthlyContribution;

    if (status === 'already_included') {
      updated = {
        ...reconcileModalItem,
        accountingStatus: 'already_included',
        includedInMainFund: true,
        isExplicitlyAdded: false,
        reconciliationNote: 'অ্যাডমিন দ্বারা যাচাইকৃত: শিট বা মূল ফান্ডে পূর্বে অন্তর্ভুক্ত',
        updatedAt: new Date().toISOString(),
      };
    } else if (status === 'not_included_and_add') {
      updated = {
        ...reconcileModalItem,
        accountingStatus: 'not_included',
        includedInMainFund: true,
        isExplicitlyAdded: true,
        includedAt: new Date().toISOString(),
        reconciliationNote: 'অ্যাডমিন দ্বারা যাচাইকৃত ও মূল ফান্ডে সমন্বিত',
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = {
        ...reconcileModalItem,
        accountingStatus: 'not_included',
        includedInMainFund: false,
        isExplicitlyAdded: false,
        reconciliationNote: 'অ্যাডমিন দ্বারা যাচাইকৃত: মূল ফান্ডে এখনো যুক্ত হয়নি',
        updatedAt: new Date().toISOString(),
      };
    }

    storageService.saveOtherMonthlyContribution(updated);
    setReconcileModalItem(null);
    setSuccessMsg('অনুদানের হিসাব অবস্থা সফলভাবে হালনাগাদ করা হয়েছে।');
    setTimeout(() => setSuccessMsg(''), 4000);
    refreshList();
  };

  const totalAmount = contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const includedCount = contributions.filter((c) => c.includedInMainFund || c.accountingStatus === 'already_included').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold mb-1 border border-emerald-200">
            <Heart className="w-3.5 h-3.5 text-emerald-600" />
            <span>অন্যান্য মাসিক অনুদান পরিচালনা</span>
          </div>
          <h3 className="text-xl font-bold font-serif text-slate-900">
            অন্যান্য মাসিক অনুদান পরিচালনা
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            সদস্যদের নিয়মিত অবদানের বাইরে মূল সাধারণ তহবিলে যুক্ত হওয়া অন্যান্য অনুদানসমূহ এখানে সংরক্ষণ ও পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[10px] text-emerald-700 block uppercase font-bold">মোট অনুদান</span>
            <span className="font-mono font-bold text-emerald-800 text-lg">৳ {totalAmount.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 block">
              {includedCount} টি মূল ফান্ডে হিসাবভুক্ত
            </span>
          </div>

          {!isEditing && (
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন অনুদান যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Year Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>বছর ফিল্টার:</span>
          </span>
          {[
            { id: 'all', label: 'সকল বছর (All)' },
            { id: '2026', label: '২০২৬ (চলতি)' },
            { id: '2025', label: '২০২৫' },
            { id: '2024', label: '২০২৪' },
            { id: 'unverified', label: 'যাচাইযোগ্য / তারিখহীন' },
          ].map((tab) => {
            const isActive = activeYearFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveYearFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 shrink-0">
          প্রদর্শিত রেকর্ড: <span className="font-bold text-slate-800">{contributions.length}</span> টি
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Form Modal or Panel */}
      {isEditing && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>{editingId ? 'অনুদান সম্পাদনা করুন' : 'নতুন অনুদান যুক্ত করুন'}</span>
            </h4>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Month & Year */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">১. মাস ও বছর *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="যেমন: মার্চ / রমজান"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="বছর (2026)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* 2. Date */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">২. তারিখ *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* 3. Amount */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">৩. অনুদানের পরিমাণ (৳) *</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="যেমন: ৫০০ বা ১০০০"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            {/* 4. Contributor Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ৪. অনুদানকারীর নাম (ঐচ্ছিক)
              </label>
              <input
                type="text"
                disabled={isAnonymous}
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder={isAnonymous ? 'নাম প্রকাশে অনিচ্ছুক' : 'অনুদানকারীর পূর্ণ নাম'}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* 5. Privacy / Anonymous */}
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => {
                    setIsAnonymous(e.target.checked);
                    if (e.target.checked) setContributorName('');
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>নাম প্রকাশ করবেন না (নাম প্রকাশে অনিচ্ছুক)</span>
                </span>
              </label>
            </div>

            {/* 6. Note */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">৬. সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="যেমন: রমজান উপলক্ষে অতিরিক্ত অনুদান"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* 7. REQUIRED FIELD: Main-Fund Accounting Status Choice */}
            <div className="sm:col-span-2 md:col-span-3 p-4 bg-white border border-emerald-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-900 text-xs">
                  মূল ফান্ডে এই টাকা কি আগে থেকেই যোগ করা আছে? *
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  (ডাবল কাউন্টিং সুরক্ষা বাধ্যতামূলক)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Option A */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    accountingChoice === 'already_included'
                      ? 'bg-emerald-50/80 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountingChoice"
                    value="already_included"
                    checked={accountingChoice === 'already_included'}
                    onChange={() => setAccountingChoice('already_included')}
                    className="mt-0.5 accent-emerald-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      A. হ্যাঁ, মূল ফান্ডে আগে থেকেই যোগ করা আছে
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1 leading-relaxed">
                      টাকাটি ইতোমধ্যেই গুগল স্প্রেডশিট বা মূল তহবিলের মোট প্রাপ্তির মধ্যে অন্তর্ভুক্ত। মূল ফান্ড মোট হিসেবে এটি <strong>দ্বিতীয়বার যোগ হবে না</strong>।
                    </span>
                  </div>
                </label>

                {/* Option B */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    accountingChoice === 'not_included'
                      ? 'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-600 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="accountingChoice"
                    value="not_included"
                    checked={accountingChoice === 'not_included'}
                    onChange={() => setAccountingChoice('not_included')}
                    className="mt-0.5 accent-amber-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      B. না, মূল ফান্ডে এখনো যোগ করা হয়নি
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1 leading-relaxed">
                      টাকাটি স্প্রেডশিটের বাইরে স্বতন্ত্রভাবে সংগৃহীত। সংরক্ষণের পর তালিকা থেকে <strong>&apos;মূল ফান্ডে যোগ করুন&apos;</strong> অ্যাকশন বাটনে ক্লিক করে মূল তহবিলে যোগ করা যাবে।
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
            >
              বাতিল করুন
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>সংরক্ষণ করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Contributions Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-4">তারিখ ও মাস</th>
              <th className="py-3 px-4">অনুদানকারী</th>
              <th className="py-3 px-4">উৎস</th>
              <th className="py-3 px-4">মূল ফান্ডের অবস্থা</th>
              <th className="py-3 px-4">সংক্ষিপ্ত বিবরণ</th>
              <th className="py-3 px-4 text-right">পরিমাণ</th>
              <th className="py-3 px-4 text-center">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contributions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  এখনো কোনো অতিরিক্ত মাসিক অনুদান যোগ করা হয়নি।
                </td>
              </tr>
            ) : (
              contributions.map((item, idx) => {
                const isAlreadyIn = item.accountingStatus === 'already_included';
                const isExplicitlyIn = item.accountingStatus === 'not_included' && item.includedInMainFund;
                const isNotIn = item.accountingStatus === 'not_included' && !item.includedInMainFund;
                const isUnverified = !item.accountingStatus || item.accountingStatus === 'unverified';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      <span>{item.date || `${item.month} ${item.year}`}</span>
                      {item.month && (
                        <span className="block text-[11px] text-slate-500">
                          ({item.month} {item.year})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.isAnonymous || !item.contributorName ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>নাম প্রকাশে অনিচ্ছুক</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-semibold text-slate-900">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.contributorName}</span>
                        </span>
                      )}
                    </td>

                    {/* Source badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.source === 'google_sheet' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Google Sheet</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          <span>অ্যাডমিন রেকর্ড</span>
                        </span>
                      )}
                    </td>

                    {/* NEW COLUMN: মূল ফান্ডের অবস্থা */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isAlreadyIn && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>মূল ফান্ডে যোগ করা আছে</span>
                          <span className="text-[10px] text-emerald-600 ml-0.5">(শিটে অন্তর্ভুক্ত)</span>
                        </div>
                      )}

                      {isExplicitlyIn && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>মূল ফান্ডে যোগ করা আছে</span>
                          <span className="text-[10px] text-emerald-600 ml-0.5">(সমন্বিত)</span>
                        </div>
                      )}

                      {isNotIn && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px] font-semibold border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>মূল ফান্ডে যোগ করা হয়নি</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setInclusionModalItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                            title="মূল ফান্ডে যোগ করুন"
                          >
                            <Plus className="w-3 h-3" />
                            <span>মূল ফান্ডে যোগ করুন</span>
                          </button>
                        </div>
                      )}

                      {isUnverified && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium border border-slate-300">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            <span>যাচাই করা হয়নি</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setReconcileModalItem(item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-semibold transition-colors"
                          >
                            <span>যাচাই করুন</span>
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {item.note || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ৳ {Number(item.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Inclusion Confirmation Dialog */}
      {inclusionModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>মূল ফান্ডে অনুদান অন্তর্ভুক্তি নিশ্চিতকরণ</span>
              </h4>
              <button
                onClick={() => setInclusionModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contribution Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>তারিখ ও মাস:</span>
                <span className="font-semibold text-slate-900">
                  {inclusionModalItem.date || ''} ({inclusionModalItem.month || ''} {inclusionModalItem.year || ''})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>অনুদানকারী:</span>
                <span className="font-semibold text-slate-900">
                  {inclusionModalItem.isAnonymous || !inclusionModalItem.contributorName
                    ? 'নাম প্রকাশে অনিচ্ছুক'
                    : inclusionModalItem.contributorName}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1.5 font-bold">
                <span>অনুদানের পরিমাণ:</span>
                <span className="font-mono text-emerald-700 text-sm">
                  ৳ {Number(inclusionModalItem.amount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warning & Statement */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ডুপ্লিকেশন সুরক্ষা সতর্কতা:</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                এই অনুদানের ৳{Number(inclusionModalItem.amount).toLocaleString()} কি মূল ফান্ডে যোগ করতে চান? অনুদানটি আগে থেকেই মূল ফান্ডের হিসাবে অন্তর্ভুক্ত থাকলে পুনরায় যোগ করা হবে না।
              </p>
              <p className="text-[11px] text-emerald-800 font-medium pt-0.5">
                ✓ ডুপ্লিকেট অন্তর্ভুক্তি স্বয়ংক্রিয়ভাবে প্রতিরোধ করা হবে।
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInclusionModalItem(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmInclusion}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>যাচাই করে যোগ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reconcile Unverified Status */}
      {reconcileModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-slate-600" />
                <span>হিসাব স্থিতি যাচাই ও সমন্বয়</span>
              </h4>
              <button
                onClick={() => setReconcileModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>তারিখ ও বিবরণ:</span>
                <span className="font-semibold text-slate-900">
                  {reconcileModalItem.date || `${reconcileModalItem.month} ${reconcileModalItem.year}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>পরিমাণ:</span>
                <span className="font-mono text-emerald-700">
                  ৳ {Number(reconcileModalItem.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700">
              এই অনুদানের ৳{Number(reconcileModalItem.amount).toLocaleString()} কি মূল ফান্ডে আগে থেকেই যোগ করা আছে?
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleReconcileStatus('already_included')}
                className="w-full text-left p-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-900 font-medium transition-colors"
              >
                <div className="font-bold text-emerald-950">A. হ্যাঁ, মূল ফান্ডে আগে থেকেই যোগ করা আছে</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  টাকাটি পূর্বে অন্তর্ভুক্ত। মূল তহবিলে অতিরিক্ত যোগ করা হবে না (ডাবল কাউন্টিং প্রতিরোধ)।
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleReconcileStatus('not_included_and_add')}
                className="w-full text-left p-3 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-xs text-teal-900 font-medium transition-colors"
              >
                <div className="font-bold text-teal-950">B. না, মূল ফান্ডে এখনই যোগ করুন</div>
                <div className="text-[11px] text-teal-800 mt-0.5">
                  টাকাটি নতুন করে মূল তহবিলের মোট আদায় ও ব্যালেন্সে একবার যোগ হবে।
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleReconcileStatus('not_included_pending')}
                className="w-full text-left p-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs text-amber-900 font-medium transition-colors"
              >
                <div className="font-bold text-amber-950">C. না, কিন্তু এখনো যোগ করবেন না (তালিকায় সংরক্ষিত থাকবে)</div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  মূল ফান্ডে এখনই যোগ হবে না। পরে প্রয়োজন অনুযায়ী যোগ করতে পারবেন।
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReconcileModalItem(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
