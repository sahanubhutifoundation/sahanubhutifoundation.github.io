import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { ActivityFallbackCover } from '../components/ActivityFallbackCover';
import { storageService } from '../services/storageService';
import { Activity, ExpenseRecord, ActivityCategoryItem } from '../types';
import { 
  Calendar, 
  Tag, 
  ArrowLeft, 
  ArrowRight, 
  Share2, 
  Check, 
  MapPin, 
  Users, 
  Target, 
  CheckCircle, 
  Wallet,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toBengaliDigits, resolveCategoryLabel, getActivityUuid, resolveBadgeLabel, getLocalizedValue } from '../utils/foundationHelpers';
import { syncBrowserIdentity } from '../utils/browserIdentity';

export const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, tMulti, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [prevActivity, setPrevActivity] = useState<Activity | null>(null);
  const [nextActivity, setNextActivity] = useState<Activity | null>(null);
  const [categories, setCategories] = useState<ActivityCategoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  const linkedMainExpenses = useMemo(() => {
    if (!activity) return [];
    const actUuid = getActivityUuid(activity);
    const mainIds = activity.linkedExpenseIds || [];
    return storageService.getExpenses().filter(
      (e) =>
        e.activityId === actUuid ||
        e.linkedActivityId === actUuid ||
        e.activityId === activity.id ||
        e.linkedActivityId === activity.id ||
        mainIds.includes(e.id) ||
        (activity.linkedExpenseId && e.id === activity.linkedExpenseId)
    );
  }, [activity]);

  const linkedSpecialExpenses = useMemo(() => {
    if (!activity) return [];
    const actUuid = getActivityUuid(activity);
    const spLinks = activity.linkedSpecialExpenses || [];
    const allFunds = storageService.getSpecialFunds();
    const result: Array<{ fund: any; expense: any }> = [];

    allFunds.forEach((f) => {
      (f.expenses || []).forEach((e) => {
        const matchesLink = spLinks.some((l) => l.fundId === f.id && l.expenseId === e.id);
        const matchesActId = e.linkedActivityId === activity.id || e.linkedActivityId === actUuid;
        if (matchesLink || matchesActId) {
          result.push({ fund: f, expense: e });
        }
      });
    });

    return result;
  }, [activity]);

  const linkedSpecialFunds = useMemo(() => {
    if (!activity) return [];
    const allFunds = storageService.getSpecialFunds();
    const targetIds = [
      ...(activity.linkedSpecialFundIds || []),
      ...(activity.linkedSpecialFundId ? [activity.linkedSpecialFundId] : []),
    ];
    const uniqueIds = Array.from(new Set(targetIds.filter(Boolean)));
    return allFunds.filter((f) => uniqueIds.includes(f.id));
  }, [activity]);

  const totalExpenseAmount = useMemo(() => {
    const mainTotal = linkedMainExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const spTotal = linkedSpecialExpenses.reduce((sum, item) => sum + (Number(item.expense.amount) || 0), 0);
    return mainTotal + spTotal;
  }, [linkedMainExpenses, linkedSpecialExpenses]);

  useEffect(() => {
    setCategories(storageService.getActivityCategories());
    const list = storageService.getActivities().filter((a) => a.isPublished);
    const index = list.findIndex((a) => a.id === id || a.slug === id || getActivityUuid(a) === id);
    
    if (index !== -1) {
      const current = list[index];
      setActivity(current);
      setPrevActivity(index > 0 ? list[index - 1] : null);
      setNextActivity(index < list.length - 1 ? list[index + 1] : null);
      
      const actTitle = getLocalizedValue(current.title, language) || current.title.bn || current.title.en;
      const actDesc = getLocalizedValue(current.shortSummary || current.summary, language) || current.summary?.bn || current.summary?.en || '';
      syncBrowserIdentity({
        title: actTitle,
        description: actDesc,
        image: current.coverImage || undefined,
        type: 'article',
      });
    } else {
      // Fallback search including drafts for direct preview
      const fallbackList = storageService.getActivities();
      const item = fallbackList.find((a) => a.id === id || a.slug === id || getActivityUuid(a) === id);
      setActivity(item || null);
      setPrevActivity(null);
      setNextActivity(null);
      if (item) {
        const actTitle = getLocalizedValue(item.title, language) || item.title.bn || item.title.en;
        const actDesc = getLocalizedValue(item.shortSummary || item.summary, language) || item.summary?.bn || item.summary?.en || '';
        syncBrowserIdentity({
          title: actTitle,
          description: actDesc,
          image: item.coverImage || undefined,
          type: 'article',
        });
      }
    }
  }, [id, language]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!activity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#2D3630]">{t('activityNotFound')}</h2>
        <p className="text-[#7A877E] text-sm">
          {t('activityNotFoundHint')}
        </p>
        <Link
          to="/activities"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('backToActivities')}</span>
        </Link>
      </div>
    );
  }

  const formattedDate = language === 'bn' ? toBengaliDigits(activity.date) : activity.date;
  const detailedStory = tMulti(activity.fullDescription || activity.description);
  const leadSummary = tMulti(activity.shortSummary || activity.summary);
  const purposeText = activity.purpose ? tMulti(activity.purpose) : '';
  const locationText = activity.location ? tMulti(activity.location) : '';
  const beneficiariesText = activity.beneficiaries ? tMulti(activity.beneficiaries) : '';
  const outcomesText = activity.outcomes ? tMulti(activity.outcomes) : '';
  const resolvedCategoryName = resolveCategoryLabel(activity.category, categories, language);

  const galleryList = Array.isArray(activity.galleryImages) && activity.galleryImages.length > 0
    ? activity.galleryImages
    : Array.isArray(activity.images) && activity.images.length > 0
    ? activity.images
    : [];

  return (
    <div className="space-y-8 sm:space-y-10 pb-20">
      <PageHero
        title={tMulti(activity.title)}
        breadcrumb={[
          { label: t('navActivities'), path: '/activities' },
          { label: tMulti(activity.title) },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
          {location.state?.fromFund ? (
            <Link
              to={location.state?.selectedYear ? `/fund?year=${location.state.selectedYear}` : '/fund'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A41] hover:text-[#234733] transition-colors group self-start px-3 py-1.5 rounded-lg bg-[#E8EFEA] hover:bg-[#D9E5DC] border border-[#2D5A41]/20 shadow-3xs"
            >
              <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
              <span>{t('backToFundStatement')} ({location.state?.selectedYear ? (language === 'bn' ? toBengaliDigits(location.state.selectedYear) : location.state.selectedYear) : t('navFund')})</span>
            </Link>
          ) : (
            <Link
              to="/activities"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C665F] hover:text-[#2D5A41] transition-colors group self-start"
            >
              <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
              <span>{t('backToActivities')}</span>
            </Link>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            {resolvedCategoryName && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-xs font-bold shadow-3xs">
                <Tag className="w-3 h-3" />
                <span>{resolvedCategoryName}</span>
              </span>
            )}

            {/* Optional Editorial Badge */}
            {(activity.badgeEmoji || activity.badge) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F7F5F0] text-[#5C665F] border border-[#EBE8E0] text-xs font-semibold shadow-3xs">
                {activity.badgeEmoji && <span>{activity.badgeEmoji}</span>}
                {activity.badge && <span>{resolveBadgeLabel(activity.badge, language)}</span>}
              </span>
            )}

            {/* Price / Verified Amount Badge - ONLY shown when real canonical linked expense exists */}
            {(linkedMainExpenses.length > 0 || linkedSpecialExpenses.length > 0) && totalExpenseAmount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70 text-xs font-bold shadow-3xs">
                <span>{t('expenseAmountLabel') || (language === 'ar' ? 'المبلغ المنفق:' : language === 'en' ? 'Amount Spent:' : 'ব্যয়িত অর্থ:')}</span>
                <span className="font-mono">
                  {language === 'bn'
                    ? `৳ ${toBengaliDigits(totalExpenseAmount)}`
                    : `৳ ${totalExpenseAmount.toLocaleString()}`}
                </span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs text-[#7A877E] px-2.5 py-1 rounded-full bg-[#F7F5F0] border border-[#EBE8E0]">
              <Calendar className="w-3.5 h-3.5 text-[#A4B3A8]" />
              <span>{formattedDate}</span>
            </span>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#EBE8E0] bg-white text-[#5C665F] hover:bg-[#F7F5F0] text-xs font-semibold shadow-3xs transition-colors cursor-pointer"
              title={t('copyLink')}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span className="text-[#2D5A41] font-bold">{t('copiedToast')}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('shareBtn')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cover Image - Preserves Complete Original Aspect Ratio Without Cropping */}
        {(() => {
          const coverImg = activity.coverImage || (activity as any).image || (activity.images && activity.images.length > 0 ? activity.images[0] : undefined);
          return (
            <div className="w-full rounded-2xl overflow-hidden border border-[#EBE8E0] bg-[#1E2621]/3 shadow-2xs flex items-center justify-center p-1 sm:p-2">
              {coverImg ? (
                <img
                  src={coverImg}
                  alt={tMulti(activity.title)}
                  className="w-full h-auto max-w-full max-h-[85vh] object-contain mx-auto block rounded-xl"
                  loading="eager"
                />
              ) : (
                <div className="h-64 sm:h-80 w-full">
                  <ActivityFallbackCover category={activity.category} />
                </div>
              )}
            </div>
          );
        })()}

        {/* Highlight Metadata Grid (Location, Beneficiaries, Purpose) */}
        {(locationText || beneficiariesText || purposeText) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {purposeText && (
              <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] shadow-3xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A41]">
                  <Target className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>{t('activityPurposeContext')}</span>
                </div>
                <p className="text-xs text-[#5C665F] leading-relaxed">{purposeText}</p>
              </div>
            )}

            {locationText && (
              <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] shadow-3xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A41]">
                  <MapPin className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>{t('activityLocationLabel')}</span>
                </div>
                <p className="text-xs text-[#5C665F] leading-relaxed">{locationText}</p>
              </div>
            )}

            {beneficiariesText && (
              <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] shadow-3xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A41]">
                  <Users className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>{t('activityBeneficiariesLabel')}</span>
                </div>
                <p className="text-xs text-[#5C665F] leading-relaxed">{beneficiariesText}</p>
              </div>
            )}
          </div>
        )}

        {/* Detailed Editorial Content */}
        <article className="bg-white p-6 sm:p-10 rounded-2xl border border-[#EBE8E0] shadow-2xs space-y-6 text-[#2D3630]">
          {/* Optional Short Summary / Lead Quote if toggled on */}
          {activity.showShortSummaryInDetail && leadSummary && (
            <div className="p-4 rounded-xl bg-[#F7F5F0] border-l-4 border-[#2D5A41] text-xs sm:text-sm italic font-medium text-[#2D3630] leading-relaxed">
              "{leadSummary}"
            </div>
          )}

          <div className="text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
            {detailedStory}
          </div>

          {/* Key Outcomes / Results Block */}
          {outcomesText && (
            <div className="p-4 sm:p-5 rounded-xl bg-[#E8EFEA]/60 border border-[#2D5A41]/20 space-y-2 mt-6">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#2D5A41]">
                <CheckCircle className="w-4 h-4 text-[#2D5A41]" />
                <span>{t('activityOutcomesLabel')}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#2D3630] leading-relaxed">
                {outcomesText}
              </p>
            </div>
          )}
        </article>

        {/* Financial Transparency Link / Record if linked */}
        {(linkedMainExpenses.length > 0 || linkedSpecialExpenses.length > 0 || linkedSpecialFunds.length > 0 || activity.financialRecord || activity.linkedExpenseId) && (
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-3xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E8EFEA] text-[#2D5A41] shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#2D3630]">
                    {t('financialTransparency')}
                  </h4>
                  <p className="text-[11px] text-[#7A877E] mt-0.5">
                    {t('financialTransparencyDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {totalExpenseAmount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold font-mono">
                    মোট খরচ: ৳{language === 'bn' ? toBengaliDigits(totalExpenseAmount) : totalExpenseAmount.toLocaleString()}
                  </div>
                )}
                {linkedMainExpenses.length > 0 ? (
                  <Link
                    to={`/fund?expenseId=${linkedMainExpenses[0].id}#expense-${linkedMainExpenses[0].id}`}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-bold shadow-xs transition-all shrink-0 group"
                  >
                    <span>{language === 'ar' ? 'عرض تفاصيل المصروفات' : language === 'en' ? 'View Expense Ledger' : 'খরচের হিসাব দেখুন'}</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ) : (
                  <Link
                    to="/fund"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2D5A41] text-[#2D5A41] hover:bg-[#E8EFEA] text-xs font-bold transition-colors shrink-0"
                  >
                    <span>{t('viewFundStatement')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Linked Whole Special Funds Card */}
            {linkedSpecialFunds.length > 0 && (
              <div className="space-y-4 pt-1">
                {linkedSpecialFunds.map((fund) => {
                  const totalCol = (fund.donations || []).reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
                  const totalExp = (fund.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                  const bal = totalCol - totalExp;
                  const isPositive = bal >= 0;

                  return (
                    <div
                      key={fund.id}
                      className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md overflow-hidden relative"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                            {language === 'bn' ? 'সম্পূর্ণ বিশেষ তহবিল সংযুক্ত' : 'Linked Special Fund'}
                          </span>
                          {(fund.year || fund.eventDate) && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/80 border border-white/15">
                              {fund.year || fund.eventDate}
                            </span>
                          )}
                        </div>

                        {fund.status && (
                          <span className="text-[11px] font-semibold text-emerald-400">
                            {fund.status === 'completed'
                              ? (language === 'bn' ? '✓ সম্পন্ন' : 'Completed')
                              : (language === 'bn' ? '● চলমান' : 'Active')}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold font-serif text-white mb-1.5">
                        {fund.name}
                      </h3>

                      {fund.description && (
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 line-clamp-2">
                          {fund.description}
                        </p>
                      )}

                      {/* Stat Counters */}
                      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 mb-4 text-center">
                        <div>
                          <span className="block text-[10px] text-teal-200 font-medium">মোট সংগ্রহ</span>
                          <span className="text-xs sm:text-sm font-bold font-mono text-white">
                            ৳ {language === 'bn' ? toBengaliDigits(totalCol) : totalCol.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-rose-200 font-medium">মোট ব্যয়</span>
                          <span className="text-xs sm:text-sm font-bold font-mono text-rose-200">
                            ৳ {language === 'bn' ? toBengaliDigits(totalExp) : totalExp.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-emerald-200 font-medium">বর্তমান স্থিতি</span>
                          <span className={`text-xs sm:text-sm font-bold font-mono ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                            ৳ {language === 'bn' ? toBengaliDigits(bal) : bal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Action Button */}
                      <div className="flex justify-end">
                        <Link
                          to={`/fund?tab=special&fundId=${fund.id}#special-fund-${fund.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow group"
                        >
                          <span>{language === 'bn' ? 'এই বিশেষ ফান্ডের সম্পূর্ণ হিসাব দেখুন' : 'View Full Special Fund Accounts'}</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Group 1: Main Foundation Fund Expenses */}
            {linkedMainExpenses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#2D5A41] flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    <span>মূল সাধারণ ফান্ডের ব্যয়সমূহ ({linkedMainExpenses.length}টি)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {linkedMainExpenses.map((exp) => (
                    <Link
                      key={exp.id}
                      to={`/fund?expenseId=${exp.id}#expense-${exp.id}`}
                      className="p-3 rounded-xl bg-[#F7F5F0] hover:bg-[#E8EFEA] border border-[#EBE8E0] hover:border-[#2D5A41]/40 flex items-center justify-between text-xs transition-colors group"
                      title="ফান্ডে বিস্তারিত দেখুন"
                    >
                      <div className="overflow-hidden">
                        <span className="font-bold text-[#2D3630] group-hover:text-[#2D5A41] block truncate">
                          {getLocalizedValue(exp.title, language)}
                        </span>
                        <span className="text-[10px] text-[#7A877E]">
                          {language === 'bn' ? toBengaliDigits(exp.date) : exp.date} {exp.category ? `• ${exp.category}` : ''}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-rose-600 bg-white px-2 py-0.5 rounded-md border border-[#EBE8E0] block">
                          -৳ {language === 'bn' ? toBengaliDigits(Number(exp.amount)) : Number(exp.amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#2D5A41] font-semibold flex items-center justify-end gap-0.5 mt-1">
                          <span>ফান্ডে দেখুন</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Group 2: Special Purpose Funds Expenses */}
            {linkedSpecialExpenses.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    <span>আলাদা / বিশেষ ফান্ডের ব্যয়সমূহ ({linkedSpecialExpenses.length}টি)</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {linkedSpecialExpenses.map((item, idx) => {
                    const attCount = (item.expense.attachments || []).length;
                    return (
                      <Link
                        key={`${item.fund.id}-${item.expense.id}-${idx}`}
                        to={`/fund?tab=special&fundId=${item.fund.id}`}
                        className="p-3 rounded-xl bg-teal-50/40 hover:bg-teal-50/80 border border-teal-200/80 hover:border-teal-400 flex items-center justify-between text-xs transition-colors group"
                        title="বিশেষ তহবিলে দেখুন"
                      >
                        <div className="overflow-hidden">
                          <span className="font-bold text-teal-950 group-hover:text-teal-800 block truncate">
                            {item.expense.title}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-teal-700 bg-teal-100/70 px-1.5 py-0.2 rounded font-medium">
                              {item.fund.name}
                            </span>
                            {item.expense.date && (
                              <span className="text-[10px] text-gray-500">
                                {language === 'bn' ? toBengaliDigits(item.expense.date) : item.expense.date}
                              </span>
                            )}
                            {attCount > 0 && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                📎 {attCount}টি রসিদ
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-teal-900 bg-white px-2 py-0.5 rounded-md border border-teal-200 block">
                            -৳ {language === 'bn' ? toBengaliDigits(Number(item.expense.amount)) : Number(item.expense.amount).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-teal-700 font-semibold flex items-center justify-end gap-0.5 mt-1">
                            <span>তহবিলে দেখুন</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photo Gallery if attached */}
        {galleryList.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm sm:text-base font-bold text-[#2D3630]">
              {t('activityGalleryTitle')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleryList.map((imgUrl, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-[#EBE8E0] bg-[#F7F5F0] h-48 shadow-3xs">
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous & Next Activity Navigation Links */}
        <div className="pt-6 border-t border-[#EBE8E0]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevActivity ? (
              <Link
                to={`/activities/${prevActivity.slug || prevActivity.id}`}
                className="p-4 rounded-xl bg-white border border-[#EBE8E0] hover:border-[#2D5A41] shadow-3xs hover:shadow-2xs transition-all flex items-center gap-3 group text-start"
              >
                <div className="p-2 rounded-lg bg-[#F7F5F0] group-hover:bg-[#E8EFEA] text-[#5C665F] group-hover:text-[#2D5A41] transition-colors shrink-0">
                  <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-[#7A877E] block">
                    {t('prevActivity')}
                  </span>
                  <strong className="text-xs text-[#2D3630] group-hover:text-[#2D5A41] transition-colors block truncate">
                    {tMulti(prevActivity.title)}
                  </strong>
                </div>
              </Link>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#EBE8E0] text-center text-xs text-[#A4B3A8]">
                {t('noPrevActivity')}
              </div>
            )}

            {nextActivity ? (
              <Link
                to={`/activities/${nextActivity.slug || nextActivity.id}`}
                className="p-4 rounded-xl bg-white border border-[#EBE8E0] hover:border-[#2D5A41] shadow-3xs hover:shadow-2xs transition-all flex items-center justify-between gap-3 group text-end"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-[#7A877E] block">
                    {t('nextActivity')}
                  </span>
                  <strong className="text-xs text-[#2D3630] group-hover:text-[#2D5A41] transition-colors block truncate">
                    {tMulti(nextActivity.title)}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-[#F7F5F0] group-hover:bg-[#E8EFEA] text-[#5C665F] group-hover:text-[#2D5A41] transition-colors shrink-0">
                  <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </Link>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#EBE8E0] text-center text-xs text-[#A4B3A8]">
                {t('noNextActivity')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
