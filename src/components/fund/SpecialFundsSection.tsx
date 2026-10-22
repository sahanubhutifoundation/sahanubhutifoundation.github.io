import React, { useState } from 'react';
import { SpecialFundRecord, SpecialFundDonation, SpecialFundExpense } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../data/translations';
import {
  Sparkles,
  ShieldCheck,
  UserCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Gift,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Coins,
  TrendingDown,
  Scale,
  Info,
} from 'lucide-react';

interface SpecialFundsSectionProps {
  specialFunds: SpecialFundRecord[];
  selectedYear?: string;
}

export const SpecialFundsSection: React.FC<SpecialFundsSectionProps> = ({
  specialFunds,
  selectedYear,
}) => {
  const { language } = useLanguage();
  const t = translations;

  const [expandedFundId, setExpandedFundId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'donations' | 'expenses' | 'summary'>>({});
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  // Filter for selected year if specified
  const filtered = selectedYear
    ? specialFunds.filter((f) => !f.year || f.year === selectedYear)
    : specialFunds;

  const formatTaka = (amount: number) => {
    if (language === 'bn') {
      const bDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return Math.abs(amount)
        .toLocaleString('en-US')
        .replace(/\d/g, (d) => bDigits[parseInt(d, 10)]);
    }
    return Math.abs(amount).toLocaleString();
  };

  const toggleExpand = (id: string) => {
    setExpandedFundId((prev) => (prev === id ? null : id));
  };

  const setFundTab = (fundId: string, tab: 'donations' | 'expenses' | 'summary') => {
    setActiveTab((prev) => ({ ...prev, [fundId]: tab }));
  };

  if (!filtered || filtered.length === 0) {
    return null;
  }

  return (
    <div className="mt-14 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-emerald-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-800 mb-2">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>{t.specialFundsTitle[language]}</span>
            {selectedYear && <span>({selectedYear})</span>}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-slate-900">
            {t.specialFundsTitle[language]}
          </h2>
          <p className="text-slate-600 text-sm mt-1 max-w-3xl">
            {t.specialFundsSubtitle[language]}
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-800">
            {filtered.length} {language === 'bn' ? 'টি আলাদা তহবিল তালিকাভুক্ত' : 'Special Funds Listed'}
          </span>
        </div>
      </div>

      {/* Funds Cards */}
      <div className="space-y-6">
        {filtered.map((fund) => {
          // Calculations
          const cashDonations = (fund.donations || []).filter((d) => !d.isInKind);
          const inKindDonations = (fund.donations || []).filter((d) => d.isInKind);

          const totalCashCollected = cashDonations.reduce(
            (sum, d) => sum + (Number(d.amount) || 0),
            0
          );
          const totalInKindValue = inKindDonations.reduce(
            (sum, d) => sum + (Number(d.inKindEstimatedValue) || Number(d.amount) || 0),
            0
          );

          const totalExpenses = (fund.expenses || []).reduce(
            (sum, e) => sum + (Number(e.amount) || 0),
            0
          );

          const balance = totalCashCollected - totalExpenses;
          const isSurplus = balance >= 0;
          const isExpanded = expandedFundId === fund.id;
          const currentTab = activeTab[fund.id] || 'summary';

          return (
            <div
              key={fund.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Fund Header Banner */}
              <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs font-medium text-emerald-300">
                      {fund.eventDate || fund.year || 'বিশেষ কর্মসূচি'}
                    </span>

                    {fund.status && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          fund.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : fund.status === 'active'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-400/30'
                        }`}
                      >
                        {fund.status === 'completed'
                          ? (language === 'bn' ? 'সম্পন্ন' : 'Completed')
                          : fund.status === 'active'
                          ? (language === 'bn' ? 'চলমান' : 'Active')
                          : (language === 'bn' ? 'সংরক্ষিত' : 'Archived')}
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        fund.integrationMode === 'integrated'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                      }`}
                    >
                      {fund.integrationMode === 'integrated'
                        ? t.integrationModeMain[language]
                        : t.integrationModeSeparate[language]}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleExpand(fund.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
                  >
                    <span>{isExpanded ? (language === 'bn' ? 'সংক্ষেপ করুন' : 'Collapse') : (language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Breakdown')}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <h3 className="text-xl md:text-2xl font-bold font-serif tracking-tight text-white">
                  {fund.name}
                </h3>
                {fund.purpose && (
                  <p className="text-slate-300 text-sm mt-1.5 leading-relaxed max-w-3xl">
                    {fund.purpose}
                  </p>
                )}
              </div>

              {/* High-Level Financial Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50/70 border-b border-slate-200">
                {/* 1. Cash Collected */}
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'bn' ? 'সংগৃহীত নগদ অর্থ' : 'Cash Collected'}</span>
                  </div>
                  <div className="font-mono text-xl md:text-2xl font-bold text-slate-900">
                    ৳ {formatTaka(totalCashCollected)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {cashDonations.length} {language === 'bn' ? 'জন নগদ অনুদানকারী' : 'cash donors'}
                  </div>
                </div>

                {/* 2. Cash Expenses */}
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>{language === 'bn' ? 'মোট কর্মসূচি ব্যয়' : 'Total Expenses'}</span>
                  </div>
                  <div className="font-mono text-xl md:text-2xl font-bold text-slate-900">
                    ৳ {formatTaka(totalExpenses)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {(fund.expenses || []).length} {language === 'bn' ? 'টি ব্যয়ের খাত' : 'expense entries'}
                  </div>
                </div>

                {/* 3. Surplus / Balance */}
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                    <Scale className="w-4 h-4 text-teal-600" />
                    <span>{isSurplus ? t.specialFundSurplus[language] : t.specialFundDeficit[language]}</span>
                  </div>
                  <div
                    className={`font-mono text-xl md:text-2xl font-bold ${
                      isSurplus ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isSurplus ? '+' : '-'} ৳ {formatTaka(balance)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {isSurplus
                      ? (language === 'bn' ? 'তহবিলে উদ্বৃত্ত রয়েছে' : 'Surplus remaining')
                      : (language === 'bn' ? 'ঘাটতি সমন্বয় আবশ্যক' : 'Fund deficit')}
                  </div>
                </div>

                {/* 4. In-Kind Support */}
                <div className="p-4 md:p-5 bg-teal-50/50">
                  <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold mb-1">
                    <Gift className="w-4 h-4 text-teal-600" />
                    <span>{t.inKindSupportBadge[language]}</span>
                  </div>
                  <div className="font-mono text-xl md:text-2xl font-bold text-teal-900">
                    {inKindDonations.length > 0 ? `৳ ${formatTaka(totalInKindValue)}*` : '—'}
                  </div>
                  <div className="text-[11px] text-teal-700/80 mt-0.5">
                    {inKindDonations.length > 0
                      ? `${inKindDonations.length} ${language === 'bn' ? 'টি পণ্য/সামগ্রী অনুদান' : 'in-kind items'}`
                      : (language === 'bn' ? 'কোনো পণ্য অনুদান নেই' : 'No in-kind items')}
                  </div>
                </div>
              </div>

              {/* Reconciled Summary Banner */}
              <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between text-xs text-emerald-900 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    {language === 'bn'
                      ? `আয়-ব্যয় হিসাব: সংগৃহীত নগদ ৳${formatTaka(totalCashCollected)} − মোট ব্যয় ৳${formatTaka(totalExpenses)} = অবশিষ্ট স্থিতি ৳${formatTaka(balance)}`
                      : `Financial Balance: Cash Collected ৳${formatTaka(totalCashCollected)} − Total Spent ৳${formatTaka(totalExpenses)} = Net Surplus ৳${formatTaka(balance)}`}
                  </span>
                </div>
                {inKindDonations.length > 0 && (
                  <span className="text-[11px] text-teal-800 italic">
                    {language === 'bn'
                      ? '*পণ্য/সামগ্রী অনুদান আলাদা প্রদর্শিত, নগদ হিসাবে মিশ্রিত করা হয়নি।'
                      : '*In-kind supplies listed separately; not conflated with cash balance.'}
                  </span>
                )}
              </div>

              {/* Expandable Tabs Detail Section */}
              {isExpanded && (
                <div className="p-6 bg-white space-y-5 animate-in fade-in duration-200">
                  {/* Tab Navigation */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                      onClick={() => setFundTab(fund.id, 'summary')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        currentTab === 'summary'
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {language === 'bn' ? 'হিসাব পুনর্মিলন ও সারসংক্ষেপ' : 'Reconciliation & Summary'}
                    </button>
                    <button
                      onClick={() => setFundTab(fund.id, 'donations')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        currentTab === 'donations'
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{language === 'bn' ? 'অনুদানকারী তালিকা' : 'Donors Ledger'}</span>
                      <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
                        {(fund.donations || []).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setFundTab(fund.id, 'expenses')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        currentTab === 'expenses'
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{language === 'bn' ? 'ব্যয় বিবরণী' : 'Expense Ledger'}</span>
                      <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px]">
                        {(fund.expenses || []).length}
                      </span>
                    </button>
                  </div>

                  {/* Tab 1: Summary / Reconciliation */}
                  {currentTab === 'summary' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Scale className="w-4 h-4 text-emerald-600" />
                          <span>{language === 'bn' ? 'আলাদা তহবিলের সম্পূর্ণ হিসাব সারসংক্ষেপ' : 'Complete Special Fund Reconciliation'}</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                            <p className="font-semibold text-slate-900 border-b pb-1">
                              {language === 'bn' ? 'নগদ অর্থের হিসাব' : 'Cash Account Reconciliation'}
                            </p>
                            <div className="flex justify-between text-slate-600">
                              <span>{language === 'bn' ? '১. মোট সংগৃহীত নগদ:' : '1. Total Cash Collected:'}</span>
                              <span className="font-mono font-bold text-slate-900">৳ {formatTaka(totalCashCollected)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>{language === 'bn' ? '২. মোট অনুমোদিত ব্যয়:' : '2. Total Authorized Expenses:'}</span>
                              <span className="font-mono font-bold text-rose-600">৳ {formatTaka(totalExpenses)}</span>
                            </div>
                            <div className="flex justify-between text-slate-900 font-bold border-t pt-1.5">
                              <span>{language === 'bn' ? '৩. অবশিষ্ট নিট স্থিতি:' : '3. Net Cash Balance:'}</span>
                              <span className="font-mono text-emerald-700">৳ {formatTaka(balance)}</span>
                            </div>
                          </div>

                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                            <p className="font-semibold text-slate-900 border-b pb-1">
                              {language === 'bn' ? 'পণ্য ও সামগ্রী অনুদান (ইন-কাইন্ড)' : 'In-Kind Supplies Summary'}
                            </p>
                            {inKindDonations.length === 0 ? (
                              <p className="text-slate-400 italic py-2">
                                {language === 'bn' ? 'এই কর্মসূচিতে কোনো পণ্য অনুদান নেই।' : 'No in-kind supplies recorded for this event.'}
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {inKindDonations.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-slate-700">
                                    <span>
                                      {item.isAnonymous ? t.anonymousContributor[language] : item.donorName}
                                      {item.inKindItem ? ` (${item.inKindItem})` : ''}
                                    </span>
                                    <span className="font-mono text-teal-700 font-medium">
                                      ৳ {formatTaka(item.inKindEstimatedValue || item.amount)}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-slate-900 font-bold border-t pt-1.5">
                                  <span>{language === 'bn' ? 'মোট আনুমানিক পণ্য মূল্য:' : 'Total Estimated Goods:'}</span>
                                  <span className="font-mono text-teal-800">৳ {formatTaka(totalInKindValue)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">
                              {language === 'bn' ? 'হিসাবের স্বচ্ছতা নীতি:' : 'Accounting Transparency Principle:'}
                            </span>{' '}
                            {fund.integrationMode === 'integrated'
                              ? (language === 'bn'
                                  ? 'এই তহবিলের অর্থ মূল সাধারণ ফান্ডে অন্তর্ভুক্ত এবং সাধারণ ব্যয় বিবরণীর সাথে সমন্বিত।'
                                  : 'This special fund is integrated with the main fund ledger.')
                              : (language === 'bn'
                                  ? 'এই তহবিলের সমস্ত আয় ও ব্যয় মূল সাধারণ তহবিল থেকে সম্পূর্ণ আলাদা ও স্বাধীনভাবে সংরক্ষণ করা হচ্ছে। এটি মূল ফান্ডে দ্বৈত গণনা হয় না।'
                                  : 'All revenue and expenditures for this special purpose fund are tracked completely independently and not double-counted into the main fund.')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Donations List */}
                  {currentTab === 'donations' && (
                    <div className="space-y-3">
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">{language === 'bn' ? 'অনুদানকারী' : 'Contributor'}</th>
                              <th className="py-3 px-4">{language === 'bn' ? 'ধরণ' : 'Type'}</th>
                              <th className="py-3 px-4">{language === 'bn' ? 'বিবরণ' : 'Details'}</th>
                              <th className="py-3 px-4 text-right">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(fund.donations || []).map((item, idx) => {
                              const isAnon = item.isAnonymous || !item.donorName;
                              return (
                                <tr key={item.id || idx} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="py-2.5 px-4 font-medium text-slate-900">
                                    {isAnon ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        {t.anonymousContributor[language]}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        {item.donorName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    {item.isInKind ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 rounded font-medium text-[11px] border border-teal-200">
                                        <Gift className="w-3 h-3 text-teal-600" />
                                        {t.inKindSupportBadge[language]}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium text-[11px] border border-emerald-200">
                                        <Coins className="w-3 h-3 text-emerald-600" />
                                        {t.cashDonationBadge[language]}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600">
                                    {item.isInKind ? (
                                      <span>{item.inKindItem || (language === 'bn' ? 'মালামাল/পণ্য' : 'Supplies')}</span>
                                    ) : (
                                      <span>{item.notes || '—'}</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                    ৳ {formatTaka(item.isInKind ? (item.inKindEstimatedValue || item.amount) : item.amount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Expenses List */}
                  {currentTab === 'expenses' && (
                    <div className="space-y-3">
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">{language === 'bn' ? 'ব্যয়ের খাত / বিবরণ' : 'Expense Item / Purpose'}</th>
                              <th className="py-3 px-4">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                              <th className="py-3 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                              <th className="py-3 px-4 text-center">{language === 'bn' ? 'ভাউচার' : 'Receipt'}</th>
                              <th className="py-3 px-4 text-right">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(fund.expenses || []).map((exp, idx) => (
                              <tr key={exp.id || idx} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-4 font-semibold text-slate-900">
                                  {exp.title}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500">
                                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                                    {exp.category || (language === 'bn' ? 'ইফতার সামগ্রী' : 'Event Items')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                                  {exp.date || '—'}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {exp.receiptUrl ? (
                                    <button
                                      onClick={() => setReceiptModalUrl(exp.receiptUrl!)}
                                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 transition-colors"
                                    >
                                      <Receipt className="w-3 h-3" />
                                      <span>{language === 'bn' ? 'ভাউচার' : 'View'}</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">
                                      {language === 'bn' ? 'ক্যাশ মেমো' : 'Cash memo'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                  ৳ {formatTaka(exp.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Receipt Image Modal */}
      {receiptModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>{language === 'bn' ? 'ব্যয়ের ভাউচার / ক্যাশ মেমো' : 'Receipt / Cash Memo Voucher'}</span>
              </h3>
              <button
                onClick={() => setReceiptModalUrl(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="my-4 max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 p-2 rounded-xl">
              <img
                src={receiptModalUrl}
                alt="Receipt Voucher"
                className="max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceiptModalUrl(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
