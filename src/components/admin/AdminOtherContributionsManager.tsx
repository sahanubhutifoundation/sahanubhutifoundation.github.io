import React, { useState } from 'react';
import { OtherMonthlyContribution } from '../../types';
import { storageService } from '../../services/storageService';
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
  DollarSign
} from 'lucide-react';

interface AdminOtherContributionsManagerProps {
  onDataChanged?: () => void;
  selectedYear?: string;
}

export const AdminOtherContributionsManager: React.FC<AdminOtherContributionsManagerProps> = ({
  onDataChanged,
  selectedYear,
}) => {
  const [contributions, setContributions] = useState<OtherMonthlyContribution[]>(() =>
    storageService.getOtherMonthlyContributions(selectedYear)
  );

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
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const refreshList = () => {
    const list = storageService.getOtherMonthlyContributions(selectedYear);
    setContributions(list);
    if (onDataChanged) onDataChanged();
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setAmount('');
    setContributorName('');
    setIsAnonymous(false);
    setNote('');
    setErrorMsg('');
  };

  const handleStartCreate = () => {
    resetForm();
    setIsEditing(true);
    setEditingId(null);
  };

  const handleStartEdit = (item: OtherMonthlyContribution) => {
    setIsEditing(true);
    setEditingId(item.id);
    setMonth(item.month || 'মার্চ');
    setYear(item.year || selectedYear || '2026');
    setDate(item.date || '');
    setAmount(String(item.amount || ''));
    setContributorName(item.contributorName || '');
    setIsAnonymous(Boolean(item.isAnonymous));
    setNote(item.note || '');
    setErrorMsg('');
  };

  const handleSave = () => {
    setErrorMsg('');
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('অনুগ্রহ করে সঠিক অনুদানের পরিমাণ উল্লেখ করুন (০ এর বেশি হতে হবে)।');
      return;
    }

    if (!date && !month) {
      setErrorMsg('তারিখ অথবা মাস উল্লেখ করা আবশ্যক।');
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

    const itemToSave: OtherMonthlyContribution = {
      id: editingId || `other-contrib-${Date.now()}`,
      date,
      month,
      year: year || selectedYear || '2026',
      amount: parsedAmount,
      contributorName: isAnonymous ? '' : contributorName.trim(),
      isAnonymous,
      note: note.trim(),
      source: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveOtherMonthlyContribution(itemToSave);
    setSuccessMsg(editingId ? 'অনুদান সফলভাবে হালনাগাদ করা হয়েছে।' : 'নতুন অনুদান সফলভাবে সংরক্ষিত হয়েছে।');
    setTimeout(() => setSuccessMsg(''), 4000);

    resetForm();
    refreshList();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিতভাবে এই অনুদান রেকর্ডটি মুছে ফেলতে চান?')) {
      storageService.deleteOtherMonthlyContribution(id);
      refreshList();
      setSuccessMsg('অনুদান রেকর্ড মুছে ফেলা হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const totalAmount = contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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
            সদস্যদের নিয়মিত চাঁদার বাইরে মূল সাধারণ তহবিলে যুক্ত হওয়া অন্যান্য অনুদানসমূহ এখানে সংরক্ষণ ও পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[10px] text-emerald-700 block uppercase font-bold">মোট অনুদান</span>
            <span className="font-mono font-bold text-emerald-800 text-lg">৳ {totalAmount.toLocaleString()}</span>
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
                onChange={(e) => setDate(e.target.value)}
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
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">৬. সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="যেমন: রমজান উপলক্ষে অতিরিক্ত অনুদান / সাধারণ দান"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
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
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">তারিখ ও মাস</th>
              <th className="py-3 px-4">অনুদানকারী</th>
              <th className="py-3 px-4">সংক্ষিপ্ত বিবরণ</th>
              <th className="py-3 px-4 text-right">পরিমাণ</th>
              <th className="py-3 px-4 text-center">কার্যক্রম</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contributions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  এখনো কোনো অতিরিক্ত মাসিক অনুদান যোগ করা হয়নি।
                </td>
              </tr>
            ) : (
              contributions.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
