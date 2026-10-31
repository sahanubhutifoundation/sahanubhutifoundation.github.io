import { OtherMonthlyContribution } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../data/translations';
import { parseRecordYear } from '../../utils/foundationHelpers';
import { Heart, ShieldCheck, UserCheck, Calendar, Info, Sparkles } from 'lucide-react';

interface OtherMonthlyContributionsSectionProps {
  contributions: OtherMonthlyContribution[];
  selectedYear?: string;
}

export const OtherMonthlyContributionsSection: React.FC<OtherMonthlyContributionsSectionProps> = ({
  contributions,
  selectedYear,
}) => {
  const { language } = useLanguage();
  const t = translations;

  // Filter for selected year strictly based on actual transaction date
  const filtered = selectedYear
    ? contributions.filter((c) => parseRecordYear(c.date, c.year) === String(selectedYear).trim())
    : contributions;

  const totalAmount = filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Format currency according to language
  const formatTaka = (amount: number) => {
    if (language === 'bn') {
      const bDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return amount
        .toLocaleString('en-US')
        .replace(/\d/g, (d) => bDigits[parseInt(d, 10)]);
    }
    return amount.toLocaleString();
  };

  if (!filtered || filtered.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/60 rounded-full text-xs font-medium text-emerald-100 mb-2 border border-emerald-500/30">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>{t.otherMonthlyContributionsTitle[language]}</span>
            {selectedYear && <span className="text-emerald-200">({selectedYear})</span>}
          </div>
          <h3 className="text-xl md:text-2xl font-bold font-serif">
            {t.otherMonthlyContributionsTitle[language]}
          </h3>
          <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl">
            {t.otherMonthlyContributionsSubtitle[language]}
          </p>
        </div>

        {/* Total Badge */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3 text-right shrink-0">
          <p className="text-xs text-emerald-200 uppercase tracking-wider font-medium">
            {language === 'bn' ? 'মোট অন্যান্য অনুদান' : language === 'ar' ? 'إجمالي التبرعات الأخرى' : 'Total Other Contributions'}
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-50">
            ৳ {formatTaka(totalAmount)}
          </p>
          <p className="text-[11px] text-emerald-200/80 mt-0.5">
            {language === 'bn' ? `${filtered.length} টি অনুদান অন্তর্ভুক্ত` : `${filtered.length} contributions recorded`}
          </p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3 flex items-center gap-3 text-xs text-emerald-800">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          {language === 'bn'
            ? 'এই অনুদানসমূহ নিয়মিত সদস্য অবদানের বাইরে মূল সাধারণ তহবিলে সরাসরি যুক্ত হয়েছে এবং মূল তহবিল গণনায় অন্তর্ভুক্ত।'
            : language === 'ar'
            ? 'هذه التبرعات مضافة مباشرة إلى الصندوق العام الرئيسي وتدخل في حسابات الرصيد الكلي.'
            : 'These contributions are deposited directly into the main general fund and included in the total fund balance.'}
        </span>
      </div>

      {/* Desktop / Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-6">{language === 'bn' ? 'তারিখ ও মাস' : 'Date & Month'}</th>
              <th className="py-3.5 px-6">{language === 'bn' ? 'অনুদানকারীর নাম' : 'Contributor'}</th>
              <th className="py-3.5 px-6">{language === 'bn' ? 'বিবরণ / খাত' : 'Note / Note'}</th>
              <th className="py-3.5 px-6 text-right">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item, idx) => {
              const isAnon = item.isAnonymous || !item.contributorName;
              return (
                <tr
                  key={item.id || idx}
                  className="hover:bg-emerald-50/40 transition-colors"
                >
                  <td className="py-4 px-6 whitespace-nowrap text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="font-medium text-slate-900">
                          {item.month || ''} {item.year ? `'${item.year.slice(-2)}` : ''}
                        </span>
                        {item.date && (
                          <span className="block text-xs text-slate-500">
                            {item.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-slate-800">
                    {isAnon ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t.anonymousContributor[language]}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-slate-900">
                          {item.contributorName}
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6 text-slate-600 text-xs max-w-xs">
                    {item.note ? (
                      <span className="line-clamp-2">{item.note}</span>
                    ) : (
                      <span className="text-slate-400 italic">
                        {language === 'bn' ? 'সাধারণ সহায়তা' : 'General support'}
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <span className="font-mono font-bold text-base text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                      ৳ {formatTaka(item.amount)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-slate-100 p-4 space-y-3">
        {filtered.map((item, idx) => {
          const isAnon = item.isAnonymous || !item.contributorName;
          return (
            <div
              key={item.id || idx}
              className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                {isAnon ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.anonymousContributor[language]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>{item.contributorName}</span>
                  </div>
                )}
                <span className="font-mono font-bold text-base text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                  ৳ {formatTaka(item.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {item.date || `${item.month || ''} ${item.year || ''}`}
                </span>
                {item.note && (
                  <span className="text-slate-600 max-w-[200px] truncate text-right">
                    {item.note}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
