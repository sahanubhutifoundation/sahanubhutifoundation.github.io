import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  Receipt,
  Eye,
  EyeOff,
  Filter,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { ExpenseRecord, FundVisibilitySettings, FundData } from '../../types';
import { storageService } from '../../services/storageService';
import { MediaUploadField } from '../../components/MediaUploadField';

interface AdminExpensesTabProps {
  expenses: ExpenseRecord[];
  onExpensesChange: (updated: ExpenseRecord[]) => void;
  visibilitySettings: FundVisibilitySettings;
  onVisibilityChange: (updated: FundVisibilitySettings) => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onShowToast: (msg: string) => void;
  fundPreview?: FundData | null;
}

const CATEGORIES = [
  { id: 'emergency_aid', label: 'জরুরি খাদ্য ও ত্রাণ' },
  { id: 'medical_aid', label: 'ওষুধ ও চিকিৎসা সহায়তা' },
  { id: 'education_aid', label: 'শিক্ষা সহায়তা ও বই' },
  { id: 'orphan_widow', label: 'এতিম ও বিধবা সহায়তা' },
  { id: 'family_welfare', label: 'পরিবার কল্যাণ' },
  { id: 'other', label: 'অন্যান্য ব্যয়' },
];

export const AdminExpensesTab: React.FC<AdminExpensesTabProps> = ({
  expenses,
  onExpensesChange,
  visibilitySettings,
  onVisibilityChange,
  onRequestConfirm,
  onShowToast,
  fundPreview,
}) => {
  const [editingExpense, setEditingExpense] = useState<Partial<ExpenseRecord> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Financial calculations
  const totalExpenseAmount = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const sheetReceived = fundPreview?.amountReceived || 23320;
  const sheetSummaryCost = fundPreview?.sheetSummaryCost || 4950;
  const sheetSummaryBalance = fundPreview?.sheetSummaryBalance || 18370;

  const currentAvailableBalance = sheetReceived - totalExpenseAmount;
  const hasDiscrepancy = Math.abs(currentAvailableBalance - sheetSummaryBalance) > 0.01;

  // Filtered expenses
  const filteredExpenses = expenses.filter((item) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.recipient && item.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editingExpense.title || !editingExpense.amount) return;

    const newExpense: ExpenseRecord = {
      id: editingExpense.id || `exp-${Date.now()}`,
      title: editingExpense.title.trim(),
      description: editingExpense.description || '',
      amount: Number(editingExpense.amount) || 0,
      date: editingExpense.date || new Date().toISOString().split('T')[0],
      category: (editingExpense.category as any) || 'medical_aid',
      customCategory: editingExpense.customCategory || '',
      recipient: editingExpense.recipient || '',
      isRecipientPublic: Boolean(editingExpense.isRecipientPublic),
      location: editingExpense.location || '',
      receiptUrl: editingExpense.receiptUrl || '',
      isVerified: editingExpense.isVerified !== false,
      year: editingExpense.year || (editingExpense.date ? editingExpense.date.split('-')[0] : '2026'),
      createdAt: editingExpense.createdAt || new Date().toISOString(),
    };

    const updated = storageService.saveExpense(newExpense);
    onExpensesChange(updated);
    setEditingExpense(null);
    onShowToast('ব্যয়ের বিবরণ সফলভাবে সংরক্ষিত হয়েছে!');
  };

  const handleDeleteExpense = (id: string) => {
    onRequestConfirm('ব্যয় মুছে ফেলুন', 'আপনি কি নিশ্চিতভাবে এই ব্যয়ের হিসাবটি মুছে ফেলতে চান?', () => {
      const updated = storageService.deleteExpense(id);
      onExpensesChange(updated);
      onShowToast('ব্যয় মুছে ফেলা হয়েছে।');
    });
  };

  const handleToggleVisibility = (key: keyof FundVisibilitySettings) => {
    const updated = {
      ...visibilitySettings,
      [key]: !visibilitySettings[key],
    };
    storageService.saveFundVisibility(updated);
    onVisibilityChange(updated);
    onShowToast('তহবিল দৃশ্যমানতা সেটিংস আপডেট হয়েছে!');
  };

  const getCategoryBadge = (catId: string, custom?: string) => {
    if (catId === 'other' && custom) return custom;
    const found = CATEGORIES.find((c) => c.id === catId);
    return found ? found.label : 'মানবিক ব্যয়';
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Reconciled Financial Overview */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#2D5A41]" />
              <span>মানবিক সহায়তা ও ব্যয়ের লেজার হিসাব ({expenses.length})</span>
            </h2>
            <p className="text-xs text-[#5C665F] mt-1">
              বাইতুল মাল তহবিলের প্রতিটি খরচ ও মানবিক সহায়তার স্বচ্ছ অডিটযোগ্য হিসাব ব্যবস্থাপনা।
            </p>
          </div>

          <button
            onClick={() =>
              setEditingExpense({
                date: new Date().toISOString().split('T')[0],
                category: 'medical_aid',
                isRecipientPublic: false,
                isVerified: true,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs transition-all active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ব্যয় যুক্ত করুন</span>
          </button>
        </div>

        {/* Financial Reconciliation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#7A877E] mb-1.5">
              <span>গুগল শিট থেকে মোট আদায়</span>
              <TrendingUp className="w-4 h-4 text-[#2D5A41]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#2D3630]">
              ৳ {sheetReceived.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#7A877E] mt-1 block">
              ২০২৪, ২০২৫ ও ২০২৬ মোট সংগৃহীত
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#7A877E] mb-1.5">
              <span>লেজার অনুযায়ী সর্বমোট ব্যয়</span>
              <TrendingDown className="w-4 h-4 text-[#C25442]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#C25442]">
              ৳ {totalExpenseAmount.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#7A877E] mt-1 block">
              {expenses.length} টি খরচের মোট সমষ্টি
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#7A877E] mb-1.5">
              <span>হিসাবকৃত বর্তমান স্থিতি</span>
              <Wallet className="w-4 h-4 text-[#2D5A41]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#2D5A41]">
              ৳ {currentAvailableBalance.toLocaleString()}
            </div>
            <span className="text-[11px] text-[#2D5A41] mt-1 block font-medium">
              আদায় - সর্বমোট ব্যয়
            </span>
          </div>
        </div>

        {/* Discrepancy Note (if Sheet static row differs from active ledger) */}
        {hasDiscrepancy && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">অডিট ও সমন্বয় তথ্য:</span>
              <span>
                গুগল শিটের স্থির সারসংক্ষেপ সেলে মোট ব্যয় ছিল ৳ {sheetSummaryCost.toLocaleString()} এবং ব্যালেন্স ছিল ৳ {sheetSummaryBalance.toLocaleString()}। বর্তমানে আপনার সক্রিয় লেজারে মোট ব্যয় ৳ {totalExpenseAmount.toLocaleString()} হওয়ায় ওয়েবসাইটটি স্বয়ংক্রিয়ভাবে সমন্বিত ব্যালেন্স ৳ {currentAvailableBalance.toLocaleString()} প্রদর্শন করছে।
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Public Fund Page Visibility Controls */}
      <div className="p-5 rounded-2xl bg-[#FDFCF9] border border-[#EBE8E0] shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2D5A41]" />
            <span>পাবলিক ফান্ড পেজ দৃশ্যমানতা সেটিংস (Visibility Controls)</span>
          </h3>
          <p className="text-xs text-[#5C665F] mt-0.5">
            ওয়েবসাইটের পাবলিক &quot;/fund&quot; পেজে কোন কোন আর্থিক তথ্য উন্মুক্ত থাকবে তা অ্যাডমিন এখান থেকে নির্ধারণ করতে পারবেন।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              key: 'showExpenseDetails' as keyof FundVisibilitySettings,
              label: 'মানবিক সহায়তা ও ব্যয়ের হিসাব তালিকা',
              desc: 'পাবলিক পেজে খরচের তালিকা প্রদর্শন করবে',
            },
            {
              key: 'showTotalCost' as keyof FundVisibilitySettings,
              label: 'মোট ব্যয় কার্ড (Total Cost)',
              desc: 'মোট ব্যয়ের কার্ডটি প্রদর্শন করবে',
            },
            {
              key: 'showAvailableBalance' as keyof FundVisibilitySettings,
              label: 'অবশিষ্ট স্থিতি কার্ড (Balance)',
              desc: 'হাতে থাকা ব্যালেন্স প্রদর্শন করবে',
            },
            {
              key: 'showTotalReceived' as keyof FundVisibilitySettings,
              label: 'সর্বমোট আদায় কার্ড (Received)',
              desc: 'মোট সংগৃহীত তহবিলের কার্ড প্রদর্শন করবে',
            },
            {
              key: 'showMonthlyFundDetails' as keyof FundVisibilitySettings,
              label: 'মাসিক জমার বিবরণ ও গ্রাফ',
              desc: 'মাসের ভিত্তিতে জমার বিবরণ প্রদর্শন করবে',
            },
            {
              key: 'showMemberContributionDetails' as keyof FundVisibilitySettings,
              label: 'সদস্যদের জমার তালিকা',
              desc: 'সদস্যদের অনুদান স্ট্যাটাস টেবিল প্রদর্শন করবে',
            },
          ].map((item) => {
            const isEnabled = visibilitySettings[item.key] !== false;
            return (
              <div
                key={item.key}
                onClick={() => handleToggleVisibility(item.key)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isEnabled
                    ? 'bg-white border-[#2D5A41]/30 shadow-2xs'
                    : 'bg-[#F7F5F0] border-[#EBE8E0] opacity-75'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-[#2D3630] block">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[#7A877E] block mt-0.5">
                    {item.desc}
                  </span>
                </div>

                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${
                    isEnabled ? 'bg-[#2D5A41]' : 'bg-[#D9D6CC]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Add / Edit Expense Form Modal */}
      {editingExpense && (
        <div className="p-6 rounded-2xl bg-white border-2 border-[#2D5A41]/30 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBE8E0]">
            <div>
              <h3 className="text-sm font-bold text-[#2D3630]">
                {editingExpense.id ? 'ব্যয়ের তথ্য সম্পাদনা' : 'নতুন ব্যয়ের হিসাব যুক্ত করুন'}
              </h3>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                তারিখ, খাতের বিবরণ, পরিমাণ ও ভাউচারের ছবি প্রদান করুন।
              </p>
            </div>
            <button
              onClick={() => setEditingExpense(null)}
              className="p-1 rounded-lg text-[#7A877E] hover:text-[#2D3630] hover:bg-[#F7F5F0]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#2D3630] mb-1">
                  সহায়তার খাত / ব্যয়ের বিবরণ *
                </label>
                <input
                  type="text"
                  required
                  value={editingExpense.title || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                  placeholder="যেমন: রোগীর জরুরি ওষুধ বাবদ সহায়তা"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  টাকার পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={editingExpense.amount || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })}
                  placeholder="যেমন: 500"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] font-mono text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">তারিখ *</label>
                <input
                  type="date"
                  required
                  value={editingExpense.date || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">ব্যয়ের ক্যাটাগরি</label>
                <select
                  value={editingExpense.category || 'medical_aid'}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {editingExpense.category === 'other' && (
                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">কাস্টম ক্যাটাগরি</label>
                  <input
                    type="text"
                    value={editingExpense.customCategory || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, customCategory: e.target.value })}
                    placeholder="ক্যাটাগরির নাম"
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">এলাকা / অবস্থান (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={editingExpense.location || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, location: e.target.value })}
                  placeholder="যেমন: মৌলভী বাড়ি, মোহাম্মদ আলী বাজার"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  সহায়তা গ্রহীতা / রোগী / পরিবারের তথ্য (অভ্যন্তরীণ)
                </label>
                <input
                  type="text"
                  value={editingExpense.recipient || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, recipient: e.target.value })}
                  placeholder="প্রাপকের নাম বা বিবরণ"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2D3630]">
                  <input
                    type="checkbox"
                    checked={Boolean(editingExpense.isRecipientPublic)}
                    onChange={(e) => setEditingExpense({ ...editingExpense, isRecipientPublic: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#2D5A41]"
                  />
                  <span>প্রাপকের নাম পাবলিক পেজে দেখান</span>
                </label>
                <span className="text-[10px] text-[#7A877E]">
                  (আনচেক থাকলে সুরক্ষার স্বার্থে গোপনীয় থাকবে)
                </span>
              </div>
            </div>

            {/* Media Upload for Voucher / Receipt */}
            <MediaUploadField
              label="রসিদ বা ভাউচারের ছবি / প্রমাণপত্র"
              value={editingExpense.receiptUrl || ''}
              onChange={(url) => setEditingExpense({ ...editingExpense, receiptUrl: url })}
              helperText="জরুরি ক্রয় রসিদ, প্রেসক্রিপশন বা মেমো ছবি (JPG, PNG - সর্বোচ্চ ১০ MB)"
            />

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">বিস্তারিত বিবরণ / নোট (ঐচ্ছিক)</label>
              <textarea
                rows={2}
                value={editingExpense.description || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                placeholder="সহায়তার বিস্তারিত প্রেক্ষাপট ও নিরীক্ষা নোট..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 rounded-xl border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0] font-semibold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white font-semibold shadow-2xs"
              >
                ব্যয় সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#7A877E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="বিবরণ, স্থান বা প্রাপক দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#7A877E]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
          >
            <option value="all">সকল ক্যাটাগরি ({expenses.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Expenses List Table */}
      <div className="bg-white rounded-2xl border border-[#EBE8E0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
              <tr>
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">সহায়তা / ব্যয়ের বিবরণ</th>
                <th className="py-3 px-4">ক্যাটাগরি</th>
                <th className="py-3 px-4">প্রাপক ও এলাকা</th>
                <th className="py-3 px-4 text-center">ভাউচার</th>
                <th className="py-3 px-4 text-right">পরিমাণ (৳)</th>
                <th className="py-3 px-4 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE8E0]">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FDFCF9] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#5C665F] whitespace-nowrap">
                      {exp.date}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#2D3630]">{exp.title}</div>
                      {exp.description && (
                        <p className="text-[11px] text-[#7A877E] line-clamp-1 mt-0.5">
                          {exp.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#E8EFEA] text-[#2D5A41]">
                        {getCategoryBadge(exp.category, exp.customCategory)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#5C665F]">
                      <div className="flex items-center gap-1 font-medium">
                        {exp.recipient ? (
                          <>
                            <span>{exp.recipient}</span>
                            {!exp.isRecipientPublic && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                গোপন
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[#A4B3A8]">উল্লেখ নেই</span>
                        )}
                      </div>
                      {exp.location && (
                        <span className="text-[10px] text-[#7A877E] flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {exp.location}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {exp.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptUrl(exp.receiptUrl || null)}
                          className="px-2 py-1 rounded-lg border border-[#2D5A41]/20 bg-[#E8EFEA] text-[#2D5A41] hover:bg-[#2D5A41] hover:text-white transition-all text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>রসিদ</span>
                        </button>
                      ) : (
                        <span className="text-[#C5BFB0]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                      -৳ {exp.amount.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setEditingExpense(exp)}
                        className="p-1.5 rounded-lg text-[#5C665F] hover:text-[#2D5A41] hover:bg-[#F7F5F0] transition-colors"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#7A877E]">
                    কোনো ব্যয়ের হিসাব পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Image Modal */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 border border-[#EBE8E0] shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#2D5A41]" />
                <span>ভাউচার / রসিদ প্রমাণপত্র</span>
              </h4>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 text-[#7A877E] hover:text-[#2D3630]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-[#EBE8E0] bg-[#F7F5F0] flex items-center justify-center p-2">
              <img
                src={previewReceiptUrl}
                alt="Receipt Voucher"
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-4 py-2 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733]"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
