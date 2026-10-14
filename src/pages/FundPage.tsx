import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { 
  getLocalizedValue, 
  normalizeExpense, 
  getActivityUuid, 
  getExpenseCategoryLabel,
  formatLocalizedNumber,
  formatLocalizedAmount,
  formatMonthProgress 
} from '../utils/foundationHelpers';
import { storageService } from '../services/storageService';
import { fetchFundData, MONTH_KEYS, MONTH_NAMES_BN, getLocalizedMonthName } from '../services/fundService';
import {
  FundData,
  FundMemberRecord,
  FundVisibilitySettings,
  YearlyFundSource,
  Member,
  ExpenseRecord,
} from '../types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Users,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Search,
  CheckCircle2,
  Calendar,
  HeartHandshake,
  BarChart3,
  Receipt,
  X,
  MapPin,
  CalendarDays,
  UserCheck,
  Info,
  Layers,
} from 'lucide-react';

export const FundPage: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [config, setConfig] = useState(storageService.getConfig());
  const [visibility, setVisibility] = useState<FundVisibilitySettings>(
    storageService.getFundVisibility()
  );
  const [membersList, setMembersList] = useState<Member[]>(storageService.getMembers());
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'complete' | 'ongoing'>('all');
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  // Available yearly sources from config (only enabled and public on public page)
  const yearlySources: YearlyFundSource[] = useMemo(() => {
    const list =
      config.yearlyFundSources && config.yearlyFundSources.length > 0
        ? config.yearlyFundSources
        : [
            {
              year: '2026',
              url: config.fundSourceUrl,
              label: language === 'ar' ? 'السنة المالية ٢٠٢٦ (الحالية)' : language === 'en' ? '2026 Financial Year (Current)' : '২০২৬ আর্থিক বছর (চলতি)',
              enabled: true,
              isPublic: true,
              isDefault: true,
            },
            {
              year: '2025',
              url: '',
              label: language === 'ar' ? 'السنة المالية ٢٠٢٥' : language === 'en' ? '2025 Financial Year' : '২০২৫ আর্থিক বছর',
              enabled: true,
              isPublic: true,
            },
            {
              year: '2024',
              url: '',
              label: language === 'ar' ? 'السنة المالية ٢٠٢٤' : language === 'en' ? '2024 Financial Year' : '২০২৪ আর্থিক বছর',
              enabled: true,
              isPublic: true,
            },
          ];
    return list.filter((s) => s.enabled !== false && s.isPublic !== false);
  }, [config.yearlyFundSources, config.fundSourceUrl, language]);

  // Default year determination
  const defaultYear = useMemo(() => {
    const defaultSrc = yearlySources.find((s) => s.isDefault);
    if (defaultSrc) return defaultSrc.year;
    const active = yearlySources[0];
    return active ? active.year : '2026';
  }, [yearlySources]);

  // Selected year state (defaults to defaultYear, URL param, or localStorage)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlYear = urlParams.get('year');
      if (urlYear && yearlySources.some((s) => s.year === urlYear)) return urlYear;
      const cachedYear = localStorage.getItem('sf_fund_last_selected_year');
      if (cachedYear && yearlySources.some((s) => s.year === cachedYear)) return cachedYear;
    } catch {}
    return defaultYear;
  });

  const handleSelectYear = (yr: string) => {
    setSelectedYear(yr);
    try {
      localStorage.setItem('sf_fund_last_selected_year', yr);
      const url = new URL(window.location.href);
      url.searchParams.set('year', yr);
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  // Sync if selected year is no longer available in configured sources
  useEffect(() => {
    if (yearlySources.length > 0 && !yearlySources.some((s) => s.year === selectedYear)) {
      setSelectedYear(defaultYear);
    }
  }, [yearlySources, defaultYear, selectedYear]);

  // Synchronize when navigating back or when URL query / location state changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const yrFromUrl = urlParams.get('year');
    const yrFromState = (location.state as any)?.selectedYear;
    const targetYr = yrFromUrl || yrFromState;
    if (targetYr && yearlySources.some((s) => s.year === targetYr) && targetYr !== selectedYear) {
      setSelectedYear(targetYr);
    }
  }, [location.search, location.state, yearlySources, selectedYear]);

  // Current year source configuration
  const currentSource = useMemo(() => {
    return yearlySources.find((s) => s.year === selectedYear);
  }, [yearlySources, selectedYear]);

  // Load fund data dynamically for current year
  const loadData = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        const freshConfig = storageService.getConfig();
        setConfig(freshConfig);
        setVisibility(storageService.getFundVisibility());
        setMembersList(storageService.getMembers());

        const sources = freshConfig.yearlyFundSources || [];
        const activeYearSource = sources.find((s) => s.year === selectedYear);
        
        // Exact target URL & GID configured specifically for this year
        const targetUrl = activeYearSource?.url?.trim() || '';
        const explicitGid = activeYearSource?.gid?.trim();

        // If this year has no configured URL, return clean not_found state
        if (!targetUrl) {
          const res = await fetchFundData('', isManual, selectedYear);
          setFundData(res);
          return;
        }

        const res = await fetchFundData(targetUrl, isManual, selectedYear, explicitGid);
        setFundData(res);
      } catch (e) {
        console.warn('Fund load error:', e);
        setFundData({
          totalFund: 0,
          amountReceived: 0,
          amountSpent: 0,
          currentBalance: 0,
          contributorCount: 0,
          yearlyReceived: {},
          monthlyTotals: {},
          transactions: [],
          expenses: [],
          lastUpdated: new Date().toISOString(),
          sourceUrl: '',
          sourceType: 'google_sheet',
          status: 'error',
          year: selectedYear,
          errorMessage:
            language === 'ar'
              ? `تعذر تحميل بيانات عام ${formatLocalizedNumber(selectedYear, language)}.`
              : language === 'en'
              ? `Failed to load records for financial year ${formatLocalizedNumber(selectedYear, language)}.`
              : `${formatLocalizedNumber(selectedYear, language)} আর্থিক বছরের তথ্য লোড করতে সমস্যা হয়েছে।`,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedYear, language]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Real-time revalidation: visibilitychange, window focus, storage events, interval polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    };

    const handleWindowFocus = () => {
      loadData(false);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'sahanubhuti_config' ||
        e.key === 'sahanubhuti_expenses' ||
        e.key === 'sahanubhuti_members'
      ) {
        loadData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorageChange);

    // Light periodic polling every 2 minutes
    const interval = setInterval(() => {
      loadData(false);
    }, 120000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [loadData]);

  // Headings config with safe localization string extraction
  const rawHeadings = config.fundExpenseHeadings || {};
  const headings = useMemo(() => ({
    title: getLocalizedValue(rawHeadings.title, language) || t('expenseLedgerDefaultTitle'),
    subtitle: getLocalizedValue(rawHeadings.subtitle, language) || t('expenseLedgerDefaultSubtitle'),
    totalSpentLabel: getLocalizedValue(rawHeadings.totalSpentLabel, language) || t('expenseLedgerDefaultTotalSpent'),
    columnDate: getLocalizedValue(rawHeadings.columnDate, language) || t('expenseColDate'),
    columnTitle: getLocalizedValue(rawHeadings.columnTitle, language) || t('expenseColTitle'),
    columnCategory: getLocalizedValue(rawHeadings.columnCategory, language) || t('expenseColCategory'),
    columnLocation: getLocalizedValue(rawHeadings.columnLocation, language) || t('expenseColLocation'),
    columnReceipt: getLocalizedValue(rawHeadings.columnReceipt, language) || t('expenseColReceipt'),
    columnAmount: getLocalizedValue(rawHeadings.columnAmount, language) || t('expenseColAmount'),
    emptyState: getLocalizedValue(rawHeadings.emptyState, language) || t('expenseEmptyState'),
    sourceLabel: getLocalizedValue(rawHeadings.sourceLabel, language) || (language === 'ar' ? 'مصدر التمويل' : language === 'en' ? 'Fund Source' : 'তহবিল সূত্র'),
    verifiedLabel: getLocalizedValue(rawHeadings.verifiedLabel, language) || (language === 'ar' ? 'معتمد وموثق' : language === 'en' ? 'Approved & Verified' : 'অনুমোদিত ও ভেরিফাইড'),
  }), [rawHeadings, language, t]);

  const memberLinkSettings = config.fundMemberLinkSettings || {
    showMemberName: true,
    makeProfileLink: true,
    showContributionDetail: true,
  };

  // Map member names (Bangla, English, Arabic) to the full Member object for reliable localized display and linking
  const memberNameMap = useMemo(() => {
    const map = new Map<string, Member>();
    membersList.forEach((m) => {
      if (m.isActive !== false) {
        if (m.name) map.set(m.name.trim().toLowerCase(), m);
        if (m.nameBn) map.set(m.nameBn.trim().toLowerCase(), m);
        if (m.nameEn) map.set(m.nameEn.trim().toLowerCase(), m);
        if (m.nameAr) map.set(m.nameAr.trim().toLowerCase(), m);
      }
    });
    return map;
  }, [membersList]);

  // Helper to resolve localized member name without guessing
  const resolveContributionMemberName = useCallback((sheetName: string): { displayName: string; memberId?: string } => {
    if (!sheetName || !sheetName.trim()) return { displayName: '' };
    const trimmed = sheetName.trim();
    const matched = memberNameMap.get(trimmed.toLowerCase());
    if (!matched) {
      // No verified relationship/localized name found -> preserve source Sheet value as instructed
      return { displayName: trimmed };
    }
    let localized = trimmed;
    if (language === 'bn') {
      localized = matched.nameBn || matched.name || trimmed;
    } else if (language === 'en') {
      localized = matched.nameEn || matched.name || trimmed;
    } else if (language === 'ar') {
      localized = matched.nameAr || matched.nameEn || matched.name || trimmed;
    }
    return { displayName: localized, memberId: matched.id };
  }, [memberNameMap, language]);

  // Filtered expense ledger for the public display (normalized to guarantee safe strings)
  const displayExpenses: ExpenseRecord[] = useMemo(() => {
    const list = fundData?.expenses || storageService.getExpenses();
    return list
      .filter((exp) => exp.isPublic !== false)
      .map((exp) => normalizeExpense(exp, language));
  }, [fundData?.expenses, language]);

  const totalIn = fundData?.amountReceived || 0;
  const totalOut = fundData?.amountSpent || 0;
  const currentBalance =
    fundData?.currentBalance !== undefined ? fundData.currentBalance : totalIn - totalOut;
  const contributorCount = fundData?.contributorCount || fundData?.memberRecords?.length || 0;

  // Exact floating ratio (e.g. 4950 / 23320 * 100 = 21.226... -> 21.23%)
  const rawRatio = totalIn > 0 ? (totalOut / totalIn) * 100 : 0;
  const expenseRatioFormatted =
    rawRatio % 1 === 0 ? rawRatio.toString() : rawRatio.toFixed(2);
  const safetyRatioFormatted =
    (Math.max(0, 100 - rawRatio) % 1 === 0
      ? Math.max(0, 100 - rawRatio).toString()
      : Math.max(0, 100 - rawRatio).toFixed(2));

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!fundData?.memberRecords) return [];
    let list = fundData.memberRecords;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (memberFilter === 'complete') {
      list = list.filter((m) => m.paidCount >= 12);
    } else if (memberFilter === 'ongoing') {
      list = list.filter((m) => m.paidCount < 12);
    }

    return list;
  }, [fundData?.memberRecords, searchTerm, memberFilter]);

  // Max monthly total for relative bar sizing
  const maxMonthlyVal = useMemo(() => {
    if (!fundData?.monthlyTotals) return 1;
    const vals = Object.values(fundData.monthlyTotals).map((v) => Number(v) || 0);
    return Math.max(...vals, 1);
  }, [fundData?.monthlyTotals]);

  return (
    <ErrorBoundary
      fallbackTitle={
        language === 'ar'
          ? 'حدث خطأ مؤقت في عرض بيانات الصندوق'
          : language === 'en'
          ? 'Temporary issue loading fund records'
          : 'তহবিল তথ্য প্রদর্শনে সাময়িক সমস্যা হয়েছে'
      }
      fallbackMessage={
        language === 'ar'
          ? 'حدث خطأ أثناء عرض بيان الصندوق. يرجى النقر على الزر أدناه لإعادة التحميل.'
          : language === 'en'
          ? 'An issue occurred while rendering the fund statement. Click the button below to reload.'
          : 'তহবিল বিবরণী রেন্ডার করতে সাময়িক সমস্যা হয়েছে। নিচের বাটনে ক্লিক করে পুনরায় লোড করুন।'
      }
      onReset={loadData}
    >
      <div className="space-y-10 sm:space-y-12 pb-16">
        <PageHero
          title={t('fundDashboardTitle')}
          subtitle={t('fundSubtitle')}
          breadcrumb={[{ label: t('navFund') }]}
          tag={t('fundTag')}
        />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Controls Bar: Year selector, Source status, last updated, refresh button */}
        <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#5C665F]">
            {/* Year Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F7F5F0] rounded-xl border border-[#EBE8E0]">
              <CalendarDays className="w-3.5 h-3.5 text-[#2D5A41] mx-1.5 shrink-0" />
              {yearlySources.map((source) => (
                <button
                  key={source.year}
                  type="button"
                  onClick={() => handleSelectYear(source.year)}
                  className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedYear === source.year
                      ? 'bg-white text-[#2D5A41] shadow-2xs font-bold'
                      : 'text-[#5C665F] hover:text-[#2D3630]'
                  }`}
                >
                  {formatLocalizedNumber(source.year, language)}
                </button>
              ))}
            </div>

            {/* Connection Status Indicator */}
            <span className="flex items-center gap-1.5 font-medium ml-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  fundData?.status === 'live'
                    ? 'bg-[#2D5A41]'
                    : fundData?.status === 'fallback'
                    ? 'bg-amber-500'
                    : fundData?.status === 'not_found'
                    ? 'bg-zinc-400'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {fundData?.status === 'live'
                  ? t('statusLiveSheet')
                  : fundData?.status === 'fallback'
                  ? t('statusCachedData')
                  : fundData?.status === 'not_found'
                  ? t('statusDataUnavailable')
                  : t('statusCheckingConnection')}
              </span>
            </span>

            {fundData?.lastUpdated && fundData.status !== 'not_found' && (
              <>
                <span className="text-[#C5BFB0]">•</span>
                <span className="flex items-center gap-1 text-[#7A877E]">
                  <Clock className="w-3.5 h-3.5 text-[#A4B3A8]" />
                  <span>
                    {t('lastUpdatedLabel')}: {formatDate(fundData.lastUpdated)}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2D3630] bg-[#F7F5F0] hover:bg-[#EBE8E0] active:scale-98 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? t('refreshing') : t('refreshButton')}</span>
            </button>

            {visibility.showSourceLinks !== false && currentSource?.url && (
              <a
                href={currentSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#2D5A41] bg-[#E8EFEA] hover:bg-[#D9E5DC] border border-[#2D5A41]/20 transition-colors"
                title={t('sourceSheetGoogle')}
              >
                <span>{t('sourceSheetBtn')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Selected Year Not Configured Notification */}
        {fundData?.status === 'not_found' && (
          <div className="p-8 rounded-2xl bg-[#FDFCF9] border border-[#EBE8E0] text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F5F0] text-[#7A877E] mx-auto flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#2D3630]">
              {language === 'ar'
                ? `لم يتم ربط بيانات عام ${formatLocalizedNumber(selectedYear, language)} بعد`
                : language === 'en'
                ? `Financial records for ${formatLocalizedNumber(selectedYear, language)} are not connected yet`
                : `${formatLocalizedNumber(selectedYear, language)} ${t('yearNotConfiguredTitle')}`}
            </h3>
            <p className="text-xs sm:text-sm text-[#7A877E] max-w-md mx-auto">
              {t('yearNotConfiguredDesc')}
            </p>
            {defaultYear && defaultYear !== selectedYear && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedYear(defaultYear)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733] transition-colors shadow-2xs"
                >
                  <span>
                    {language === 'ar'
                      ? `عرض سجلات صندوق عام ${formatLocalizedNumber(defaultYear, language)}`
                      : language === 'en'
                      ? `View active ${formatLocalizedNumber(defaultYear, language)} records`
                      : `সক্রিয় ${formatLocalizedNumber(defaultYear, language)} সালের হিসাব দেখুন`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Selected Year Connection Error / Source Unavailable Notification */}
        {fundData?.status === 'error' && (
          <div className="p-8 sm:p-10 rounded-2xl bg-[#FDFCF9] border border-amber-200 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D3630]">
                {language === 'ar'
                  ? `مصدر بيانات عام ${formatLocalizedNumber(selectedYear, language)} غير متاح حاليًا`
                  : language === 'en'
                  ? `Data source for ${formatLocalizedNumber(selectedYear, language)} is currently unavailable`
                  : `${formatLocalizedNumber(selectedYear, language)} ${t('sourceUnavailableTitle')}`}
              </h3>
              <p className="text-xs sm:text-sm text-[#7A877E] max-w-lg mx-auto mt-1 leading-relaxed">
                {fundData.errorMessage || t('sourceUnavailableDefaultErr')}
              </p>
            </div>
            {currentSource?.url && (
              <div className="text-[11px] text-[#5C665F] font-mono bg-[#F7F5F0] p-2.5 rounded-xl max-w-md mx-auto truncate border border-[#EBE8E0]">
                {t('configuredSourceLabel')} {currentSource.url}
              </div>
            )}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => loadData(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733] transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{t('reloadButton')}</span>
              </button>
              {defaultYear && defaultYear !== selectedYear && (
                <button
                  type="button"
                  onClick={() => setSelectedYear(defaultYear)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#EBE8E0] text-[#2D3630] text-xs font-semibold hover:bg-[#F7F5F0] transition-colors"
                >
                  <span>
                    {language === 'ar'
                      ? `العودة إلى صندوق عام ${formatLocalizedNumber(defaultYear, language)}`
                      : language === 'en'
                      ? `Return to active ${formatLocalizedNumber(defaultYear, language)} fund`
                      : `সক্রিয় ${formatLocalizedNumber(defaultYear, language)} সালের তহবিলে ফিরে যান`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Core Metric Cards (Rendered ONLY when source is live or verified cached, preventing fake zero values) */}
        {fundData && (fundData.status === 'live' || fundData.status === 'fallback') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Total Received */}
            {visibility.showTotalReceived !== false && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-[#7A877E] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A877E]">
                    {t('totalFundCard')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] text-[#2D5A41] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[#2D3630] font-mono tracking-tight">
                  {loading ? '...' : `৳ ${formatLocalizedAmount(totalIn, language)}`}
                </div>
                <p className="text-xs text-[#7A877E] mt-2">
                  {formatLocalizedNumber(selectedYear, language)} {t('totalFundSubtitle')}
                </p>
              </div>
            )}

            {/* Card 2: Total Spent */}
            {visibility.showTotalCost !== false && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-[#7A877E] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A877E]">
                    {headings.totalSpentLabel || t('totalSpentCard')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] text-[#C25442] flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[#C25442] font-mono tracking-tight">
                  {loading ? '...' : `৳ ${formatLocalizedAmount(totalOut, language)}`}
                </div>
                <p className="text-xs text-[#7A877E] mt-2">
                  {t('totalSpentSubtitle')}
                </p>
              </div>
            )}

            {/* Card 3: Net Available Balance */}
            {visibility.showAvailableBalance !== false && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-[#7A877E] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7A877E]">
                    {t('currentBalanceCard')}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[#2D5A41] font-mono tracking-tight">
                  {loading ? '...' : `৳ ${formatLocalizedAmount(currentBalance, language)}`}
                </div>
                <p className="text-xs text-[#2D5A41] font-medium mt-2">
                  {t('balanceCardSubtitle')}
                </p>
              </div>
            )}

            {/* Card 4: Committed Contributors */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-[#7A877E] mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A877E]">
                  {t('contributorCountCard')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] text-[#2D5A41] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#2D3630] font-mono tracking-tight">
                {loading ? '...' : `${formatLocalizedNumber(contributorCount, language)} ${t('contributorUnit')}`.trim()}
              </div>
              <p className="text-xs text-[#7A877E] mt-2">
                {t('contributorCountSubtitle')}
              </p>
            </div>
          </div>
        )}

        {/* Yearly Growth Overview */}
        {visibility.showYearlyOverview !== false &&
          fundData &&
          (fundData.status === 'live' || fundData.status === 'fallback') &&
          fundData?.yearlyReceived &&
          Object.keys(fundData.yearlyReceived).length > 0 && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#2D5A41]" />
                    <span>{t('yearlyReceivedTitle')}</span>
                  </h3>
                  <p className="text-xs text-[#7A877E] mt-0.5">
                    {t('yearlyOverviewSubtitle')}
                  </p>
                </div>
                <div className="text-xs font-semibold text-[#2D5A41] bg-[#E8EFEA] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t('totalCollection')}: ৳ {formatLocalizedAmount(totalIn, language)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.keys(fundData.yearlyReceived)
                  .sort()
                  .map((year) => {
                    const amount = fundData.yearlyReceived?.[year] || 0;
                    const pct = totalIn > 0 ? Math.round((amount / totalIn) * 100) : 0;
                    const yearLabel = year === '2026'
                      ? `${formatLocalizedNumber(year, language)} (${t('currentYear')})`
                      : (language === 'bn' ? `${formatLocalizedNumber(year, language)} ${t('yearSuffix')}`.trim() : formatLocalizedNumber(year, language));
                    return (
                      <div
                        key={year}
                        className={`p-4 rounded-xl border space-y-3 cursor-pointer transition-all ${
                          selectedYear === year
                            ? 'bg-[#E8EFEA]/40 border-[#2D5A41]'
                            : 'bg-[#FDFCF9] border-[#EBE8E0] hover:border-[#2D5A41]/40'
                        }`}
                        onClick={() => setSelectedYear(year)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#5C665F]">
                            {yearLabel}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#2D5A41] shrink-0">
                            {formatLocalizedNumber(pct, language)}%
                          </span>
                        </div>

                        <div className="text-xl font-bold font-mono text-[#2D3630]">
                          ৳ {formatLocalizedAmount(amount, language)}
                        </div>

                        <div className="w-full h-2 bg-[#EBE8E0] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2D5A41] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        {/* Monthly Breakdown Grid */}
        {visibility.showMonthlyFundDetails !== false &&
          fundData &&
          (fundData.status === 'live' || fundData.status === 'fallback') &&
          fundData?.monthlyTotals &&
          Object.keys(fundData.monthlyTotals).length > 0 && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2D5A41]" />
                    <span>{t('monthlyBreakdownTitle')} ({formatLocalizedNumber(selectedYear, language)})</span>
                  </h3>
                  <p className="text-xs text-[#7A877E] mt-0.5">
                    {t('monthlyBreakdownSubtitle')}
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-[#2D3630] bg-[#F7F5F0] px-3 py-1.5 rounded-lg self-start sm:self-center">
                  {formatLocalizedNumber(selectedYear, language)} {t('totalForYear')}: ৳ {formatLocalizedAmount(fundData.yearlyReceived?.[selectedYear] || totalIn, language)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MONTH_KEYS.map((m) => {
                  const amount = fundData.monthlyTotals?.[m] || 0;
                  const barHeightPct = maxMonthlyVal > 0 ? Math.round((amount / maxMonthlyVal) * 100) : 0;

                  return (
                    <div
                      key={m}
                      className="p-3.5 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] flex flex-col justify-between hover:border-[#2D5A41]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs text-[#5C665F]">
                        <span className="font-semibold">{getLocalizedMonthName(m, language)}</span>
                        {language === 'en' && <span className="text-[10px] text-[#A4B3A8] uppercase">{m}</span>}
                      </div>

                      <div className="my-2.5">
                        <div className="text-sm sm:text-base font-bold font-mono text-[#2D3630]">
                          ৳ {formatLocalizedAmount(amount, language)}
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-[#EBE8E0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2D5A41] rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(5, barHeightPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Member Monthly Contribution Status Table (REAL SHEET STRUCTURE) */}
        {visibility.showMemberContributionDetails !== false &&
          fundData &&
          (fundData.status === 'live' || fundData.status === 'fallback') &&
          fundData?.memberRecords &&
          fundData.memberRecords.length > 0 && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2D5A41]" />
                    <span>{t('memberContributionsTitle')}</span>
                  </h3>
                  <p className="text-xs text-[#7A877E] mt-0.5">
                    {t('memberContributionSubtitle') || (language === 'ar' ? 'بيان شفاف بالتزام واشتراكات الأعضاء الشهرية المنتظمة' : language === 'en' ? 'Transparent statement of members monthly commitments and installments' : 'সদস্যদের নিয়মিত মাসিক অঙ্গীকার ও জমাকৃত কিস্তির স্বচ্ছ বিবরণী')}
                  </p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#7A877E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('searchMemberPlaceholder')}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630] placeholder-[#A4B3A8] focus:outline-hidden focus:border-[#2D5A41] transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-lg border border-[#EBE8E0] text-xs">
                    <button
                      type="button"
                      onClick={() => setMemberFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        memberFilter === 'all'
                          ? 'bg-white text-[#2D3630] shadow-2xs font-semibold'
                          : 'text-[#5C665F] hover:text-[#2D3630]'
                      }`}
                    >
                      {t('filterAll')} ({formatLocalizedNumber(fundData.memberRecords.length, language)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberFilter('complete')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        memberFilter === 'complete'
                          ? 'bg-white text-[#2D5A41] shadow-2xs font-semibold'
                          : 'text-[#5C665F] hover:text-[#2D3630]'
                      }`}
                    >
                      {t('filterComplete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberFilter('ongoing')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        memberFilter === 'ongoing'
                          ? 'bg-white text-[#5C665F] shadow-2xs font-semibold'
                          : 'text-[#5C665F] hover:text-[#2D3630]'
                      }`}
                    >
                      {t('filterOngoing')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-4">{t('colMemberName')}</th>
                      <th className="py-3 px-3 text-right">{t('colMonthlyRate')}</th>
                      {MONTH_KEYS.map((m) => (
                        <th key={m} className="py-3 px-2 text-center text-[11px]">
                          {getLocalizedMonthName(m, language)}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-right">{t('colTotalDeposit')}</th>
                      <th className="py-3 px-3 text-center">{t('colProgress')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE8E0]">
                    {filteredMembers.map((member) => {
                      const isFullyPaid = member.paidCount >= 12;
                      const resolved = resolveContributionMemberName(member.name);
                      const matchedMemberId = resolved.memberId || memberNameMap.get(member.name.trim().toLowerCase())?.id;
                      const displayName = resolved.displayName || member.name;

                      return (
                        <tr key={member.serial} className="hover:bg-[#FDFCF9] transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-[#7A877E]">
                            {formatLocalizedNumber(member.serial, language)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#2D3630] whitespace-nowrap">
                            {memberLinkSettings.makeProfileLink && matchedMemberId ? (
                              <Link
                                to={`/members/${matchedMemberId}`}
                                className="text-[#2D5A41] hover:underline inline-flex items-center gap-1 group"
                                title={t('viewMemberProfileTitle')}
                              >
                                <span>{displayName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span>{displayName}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5C665F] whitespace-nowrap">
                            ৳ {formatLocalizedAmount(member.commitment, language)}
                          </td>
                          {MONTH_KEYS.map((m) => {
                            const isPaid = member.months[m] === 'paid';
                            const mName = getLocalizedMonthName(m, language);
                            return (
                              <td key={m} className="py-3 px-2 text-center">
                                {isPaid ? (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-[10px] font-bold"
                                    title={`${mName} ${t('statusPaid')}`}
                                  >
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    className="inline-block w-2 h-2 rounded-full bg-[#EBE8E0]"
                                    title={`${mName} ${t('statusDue')}`}
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#2D5A41] whitespace-nowrap">
                            ৳ {formatLocalizedAmount(member.totalContributed, language)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isFullyPaid
                                    ? 'bg-[#E8EFEA] text-[#2D5A41]'
                                  : 'bg-[#F7F5F0] text-[#5C665F]'
                              }`}
                            >
                              {isFullyPaid && <CheckCircle2 className="w-3 h-3 text-[#2D5A41]" />}
                              <span>{formatMonthProgress(member.paidCount, 12, language)}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#7A877E]">
                    {t('noMemberFound')}
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Humanitarian Aid & Expense Ledger Section */}
        {visibility.showExpenseDetails !== false && displayExpenses.length > 0 && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#2D5A41]" />
                  <span>
                    {headings.title} ({formatLocalizedNumber(displayExpenses.length, language)})
                  </span>
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5">
                  {headings.subtitle}
                </p>
              </div>

              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-center font-mono">
                <span>
                  {headings.totalSpentLabel}: -৳ {formatLocalizedAmount(totalOut, language)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
                  <tr>
                    <th className="py-3 px-4">{headings.columnDate}</th>
                    <th className="py-3 px-4">{headings.columnTitle}</th>
                    <th className="py-3 px-4">{headings.columnCategory}</th>
                    <th className="py-3 px-4">{headings.columnLocation}</th>
                    <th className="py-3 px-4 text-center">{headings.columnReceipt}</th>
                    <th className="py-3 px-4 text-right">{headings.columnAmount} (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE8E0]">
                  {displayExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FDFCF9] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#5C665F] whitespace-nowrap">
                        {formatLocalizedNumber(exp.date, language)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2D3630] flex items-center gap-2">
                          <span>{getLocalizedValue(exp.title, language)}</span>
                          {exp.deductionMode === 'separate' && (
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                              {language === 'ar' ? 'صندوق منفصل' : language === 'en' ? 'Separate Fund' : 'পৃথক তহবিল'}
                            </span>
                          )}
                          {exp.deductionMode === 'display_only' && (
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                              {language === 'ar' ? 'للعرض فقط' : language === 'en' ? 'Display Only' : 'প্রদর্শনী'}
                            </span>
                          )}
                        </div>
                        {exp.description && (
                          <p className="text-[11px] text-[#7A877E] line-clamp-1 mt-0.5">
                            {getLocalizedValue(exp.description, language)}
                          </p>
                        )}
                        {exp.recipient && exp.isRecipientPublic && (
                          <span className="text-[10px] text-[#2D5A41] font-medium block mt-0.5">
                            {t('recipientLabel') || (language === 'ar' ? 'المستلم:' : language === 'en' ? 'Recipient:' : 'গ্রহীতা:')}: {getLocalizedValue(exp.recipient, language)}
                          </span>
                        )}
                        {(exp.activityId || exp.linkedActivityId) && (
                          <div className="mt-1.5">
                            <Link
                              to={`/activities/${getActivityUuid(exp.activityId || exp.linkedActivityId)}`}
                              state={{ fromFund: true, selectedYear }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8EFEA] hover:bg-[#D9E5DC] text-[#2D5A41] hover:text-[#234733] text-[11px] font-semibold border border-[#2D5A41]/20 transition-colors group shadow-3xs"
                            >
                              <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              <span>{t('viewLinkedActivity')}</span>
                            </Link>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#E8EFEA] text-[#2D5A41]">
                          {getExpenseCategoryLabel(exp.category, exp.customCategory, language)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#5C665F]">
                        {exp.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#7A877E] shrink-0" />
                            <span>{getLocalizedValue(exp.location, language)}</span>
                          </span>
                        ) : (
                          <span className="text-[#A4B3A8]">{language === 'ar' ? 'فيني سادار' : language === 'en' ? 'Feni Sadar' : 'ফেনী সদর'}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {exp.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setActiveReceiptUrl(exp.receiptUrl || null)}
                            className="px-2.5 py-1 rounded-lg border border-[#2D5A41]/20 bg-[#E8EFEA] text-[#2D5A41] hover:bg-[#2D5A41] hover:text-white transition-all text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>{headings.columnReceipt || (language === 'ar' ? 'إيصال' : language === 'en' ? 'Receipt' : 'ভাউচার')}</span>
                          </button>
                        ) : (
                          <span className="text-[#C5BFB0]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        -৳ {formatLocalizedAmount(exp.amount, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fund Utilization & Purpose Section */}
        {visibility.showExpenseRatio !== false &&
          fundData &&
          (fundData.status === 'live' || fundData.status === 'fallback') && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#18231B] text-[#D3DDD5] border border-[#28382C] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#223026] text-[#82CCA3] border border-[#2D3E32] mb-2">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>{t('fundUtilizationBadge')}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#FDFCF9]">
                  {t('fundUtilizationTitle')}
                </h3>
                <p className="text-xs text-[#8A9B8F] mt-1">
                  {t('fundUtilizationSubtitle')}
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#82CCA3]">
                  {formatLocalizedNumber(expenseRatioFormatted, language)}%
                </span>
                <span className="block text-[11px] text-[#8A9B8F]">{t('expenseRatioLabel')}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-[#202C23] rounded-full overflow-hidden p-0.5 border border-[#28382C]">
              <div
                className="h-full bg-gradient-to-r from-[#2D5A41] to-[#65B78A] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, rawRatio))}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div className="p-3 rounded-xl bg-[#202C23] border border-[#28382C] space-y-1">
                <span className="text-[#8A9B8F] block">{t('totalHumanitarianExpenseLabel')}:</span>
                <span className="text-base font-bold font-mono text-[#E0A899]">
                  ৳ {formatLocalizedAmount(totalOut, language)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#202C23] border border-[#28382C] space-y-1">
                <span className="text-[#8A9B8F] block">{t('netCashReserveLabel')}:</span>
                <span className="text-base font-bold font-mono text-[#82CCA3]">
                  ৳ {formatLocalizedAmount(currentBalance, language)} ({formatLocalizedNumber(safetyRatioFormatted, language)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Receipt / Voucher Lightbox Modal */}
      {activeReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActiveReceiptUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-[#EBE8E0]">
              <span className="text-xs font-bold text-[#2D3630] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#2D5A41]" />
                <span>{t('voucherModalTitle')}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveReceiptUrl(null)}
                className="p-1 rounded-lg text-[#5C665F] hover:bg-[#F7F5F0] hover:text-[#2D3630]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 max-h-[80vh] overflow-auto flex items-center justify-center bg-[#FDFCF9]">
              <img
                src={activeReceiptUrl}
                alt={t('voucherModalTitle')}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};
