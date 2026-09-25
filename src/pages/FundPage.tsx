import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getLocalizedValue, normalizeExpense } from '../utils/foundationHelpers';
import { storageService } from '../services/storageService';
import { fetchFundData, MONTH_KEYS, MONTH_NAMES_BN } from '../services/fundService';
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
              label: '২০২৬ আর্থিক বছর (চলতি)',
              enabled: true,
              isPublic: true,
              isDefault: true,
            },
            {
              year: '2025',
              url: '',
              label: '২০২৫ আর্থিক বছর',
              enabled: true,
              isPublic: true,
            },
            {
              year: '2024',
              url: '',
              label: '২০২৪ আর্থিক বছর',
              enabled: true,
              isPublic: true,
            },
          ];
    return list.filter((s) => s.enabled !== false && s.isPublic !== false);
  }, [config.yearlyFundSources, config.fundSourceUrl]);

  // Default year determination
  const defaultYear = useMemo(() => {
    const defaultSrc = yearlySources.find((s) => s.isDefault);
    if (defaultSrc) return defaultSrc.year;
    const active = yearlySources[0];
    return active ? active.year : '2026';
  }, [yearlySources]);

  // Selected year state (defaults to defaultYear)
  const [selectedYear, setSelectedYear] = useState<string>(() => defaultYear);

  // Sync if selected year is no longer available in configured sources
  useEffect(() => {
    if (yearlySources.length > 0 && !yearlySources.some((s) => s.year === selectedYear)) {
      setSelectedYear(defaultYear);
    }
  }, [yearlySources, defaultYear, selectedYear]);

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
          errorMessage: `${selectedYear} আর্থিক বছরের তথ্য লোড করতে সমস্যা হয়েছে।`,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedYear]
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
    title: getLocalizedValue(rawHeadings.title, language) || 'মানবিক সহায়তা ও ব্যয় বিবরণী',
    subtitle:
      getLocalizedValue(rawHeadings.subtitle, language) ||
      'তহবিল হতে অনুমোদিত মানবিক সাহায্য, চিকিৎসা অনুদান ও ত্রাণ ব্যয়ের হিসাব',
    totalSpentLabel: getLocalizedValue(rawHeadings.totalSpentLabel, language) || 'সর্বমোট ব্যয়',
    columnDate: getLocalizedValue(rawHeadings.columnDate, language) || 'তারিখ',
    columnTitle: getLocalizedValue(rawHeadings.columnTitle, language) || 'ব্যয়ের খাত ও বিবরণ',
    columnCategory: getLocalizedValue(rawHeadings.columnCategory, language) || 'বিভাগ',
    columnLocation: getLocalizedValue(rawHeadings.columnLocation, language) || 'এলাকা',
    columnReceipt: getLocalizedValue(rawHeadings.columnReceipt, language) || 'ভাউচার',
    columnAmount: getLocalizedValue(rawHeadings.columnAmount, language) || 'পরিমাণ',
    emptyState: getLocalizedValue(rawHeadings.emptyState, language) || 'কোনো ব্যয়ের হিসাব পাওয়া যায়নি',
    sourceLabel: getLocalizedValue(rawHeadings.sourceLabel, language) || 'তহবিল সূত্র',
    verifiedLabel: getLocalizedValue(rawHeadings.verifiedLabel, language) || 'অনুমোদিত ও ভেরিফাইড',
  }), [rawHeadings, language]);

  const memberLinkSettings = config.fundMemberLinkSettings || {
    showMemberName: true,
    makeProfileLink: true,
    showContributionDetail: true,
  };

  // Map member names to IDs for fast profile linking
  const memberNameToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    membersList.forEach((m) => {
      if (m.isActive !== false) {
        map.set(m.name.trim().toLowerCase(), m.id);
      }
    });
    return map;
  }, [membersList]);

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
      fallbackTitle="তহবিল তথ্য প্রদর্শনে সাময়িক সমস্যা হয়েছে"
      fallbackMessage="তহবিল বিবরণী রেন্ডার করতে সাময়িক সমস্যা হয়েছে। নিচের বাটনে ক্লিক করে পুনরায় লোড করুন।"
      onReset={loadData}
    >
      <div className="space-y-10 sm:space-y-12 pb-16">
        <PageHero
          title={t('fundDashboardTitle')}
          subtitle={t('fundSubtitle')}
          breadcrumb={[{ label: t('navFund') }]}
          tag="স্বচ্ছ বাইতুল মাল তহবিল"
        />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Controls Bar: Year selector, Source status, last updated, refresh button */}
        <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#5C665F]">
            {/* Year Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F7F5F0] rounded-xl border border-[#EBE8E0]">
              <CalendarDays className="w-3.5 h-3.5 text-[#2D5A41] ml-2 shrink-0" />
              {yearlySources.map((source) => (
                <button
                  key={source.year}
                  type="button"
                  onClick={() => setSelectedYear(source.year)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedYear === source.year
                      ? 'bg-white text-[#2D5A41] shadow-2xs font-bold'
                      : 'text-[#5C665F] hover:text-[#2D3630]'
                  }`}
                >
                  {source.year}
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
                  ? 'লাইভ গুগল শিট সংযুক্ত'
                  : fundData?.status === 'fallback'
                  ? 'সংরক্ষিত ক্যাশ তথ্য'
                  : fundData?.status === 'not_found'
                  ? 'তথ্য অনুপলব্ধ'
                  : 'সংযোগ যাচাই করা হচ্ছে'}
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
                title="গুগল শিট দেখুন"
              >
                <span>মূল উৎস শিট</span>
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
              {selectedYear} আর্থিক বছরের তথ্য এখনো সংযুক্ত করা হয়নি
            </h3>
            <p className="text-xs sm:text-sm text-[#7A877E] max-w-md mx-auto">
              এই আর্থিক বছরের জন্য কোনো গুগল স্প্রেডশিট বা ডাটাবেজ লিংক যুক্ত করা হয়নি। প্রশাসনিক
              প্যানেল থেকে লিংক কনফিগার করার পর তথ্য স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
            </p>
            {defaultYear && defaultYear !== selectedYear && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedYear(defaultYear)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733] transition-colors shadow-2xs"
                >
                  <span>সক্রিয় {defaultYear} সালের হিসাব দেখুন</span>
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
                {selectedYear} আর্থিক বছরের ডাটা সোর্স বর্তমানে অনুপলব্ধ
              </h3>
              <p className="text-xs sm:text-sm text-[#7A877E] max-w-lg mx-auto mt-1 leading-relaxed">
                {fundData.errorMessage || 'গুগল স্প্রেডশিট থেকে তথ্য সংগ্রহ করা সম্ভব হয়নি। স্প্রেডশিটের শেয়ারিং পারমিশন বা নেটওয়ার্ক সংযোগ যাচাই করুন।'}
              </p>
            </div>
            {currentSource?.url && (
              <div className="text-[11px] text-[#5C665F] font-mono bg-[#F7F5F0] p-2.5 rounded-xl max-w-md mx-auto truncate border border-[#EBE8E0]">
                কনফিগার করা সোর্স: {currentSource.url}
              </div>
            )}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => loadData(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733] transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>পুনরায় লোড করুন</span>
              </button>
              {defaultYear && defaultYear !== selectedYear && (
                <button
                  type="button"
                  onClick={() => setSelectedYear(defaultYear)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#EBE8E0] text-[#2D3630] text-xs font-semibold hover:bg-[#F7F5F0] transition-colors"
                >
                  <span>সক্রিয় {defaultYear} সালের তহবিলে ফিরে যান</span>
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
                  {loading ? '...' : `৳ ${totalIn.toLocaleString()}`}
                </div>
                <p className="text-xs text-[#7A877E] mt-2">
                  {selectedYear} সর্বমোট সংগৃহীত বাইতুল মাল আদায়
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
                  {loading ? '...' : `৳ ${totalOut.toLocaleString()}`}
                </div>
                <p className="text-xs text-[#7A877E] mt-2">
                  অনুমোদিত ওষুধ ও মানবিক সহায়তা ব্যয়
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
                  {loading ? '...' : `৳ ${currentBalance.toLocaleString()}`}
                </div>
                <p className="text-xs text-[#2D5A41] font-medium mt-2">
                  বাইতুল মালে বর্তমান কার্যকর নগদ স্থিতি
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
                {loading ? '...' : `${contributorCount} জন`}
              </div>
              <p className="text-xs text-[#7A877E] mt-2">
                মাসিক অঙ্গীকারাবদ্ধ অংশীদার সদস্য
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
                    প্রতি বছরের সংগৃহীত মোট তহবিলের তুলনামূলক চিত্র
                  </p>
                </div>
                <div className="text-xs font-semibold text-[#2D5A41] bg-[#E8EFEA] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>সর্বমোট আদায়: ৳ {totalIn.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.keys(fundData.yearlyReceived)
                  .sort()
                  .map((year) => {
                    const amount = fundData.yearlyReceived?.[year] || 0;
                    const pct = totalIn > 0 ? Math.round((amount / totalIn) * 100) : 0;
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
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#5C665F]">
                            {year === '2026'
                              ? '২০২৬ (চলতি বছর)'
                              : year === '2025'
                              ? '২০২৫ সাল'
                              : `${year} সাল`}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#2D5A41]">{pct}%</span>
                        </div>

                        <div className="text-xl font-bold font-mono text-[#2D3630]">
                          ৳ {amount.toLocaleString()}
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
                    <span>{t('monthlyBreakdownTitle')} ({selectedYear})</span>
                  </h3>
                  <p className="text-xs text-[#7A877E] mt-0.5">
                    প্রতি মাসের আদায়কৃত নিয়মিত মাসিক কিস্তির পরিসংখ্যান
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-[#2D3630] bg-[#F7F5F0] px-3 py-1.5 rounded-lg self-start sm:self-center">
                  {selectedYear} সর্বমোট: ৳ {(fundData.yearlyReceived?.[selectedYear] || totalIn).toLocaleString()}
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
                        <span className="font-semibold">{MONTH_NAMES_BN[m]}</span>
                        <span className="text-[10px] text-[#A4B3A8] uppercase">{m}</span>
                      </div>

                      <div className="my-2.5">
                        <div className="text-sm sm:text-base font-bold font-mono text-[#2D3630]">
                          ৳ {amount.toLocaleString()}
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
                    সদস্যদের নিয়মিত মাসিক অঙ্গীকার ও জমাকৃত কিস্তির স্বচ্ছ বিবরণী
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
                      placeholder="সদস্যের নাম খুঁজুন..."
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
                      সকল ({fundData.memberRecords.length})
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
                      পরিপূর্ণ
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
                      চলমান
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
                      <th className="py-3 px-4">সদস্যের নাম</th>
                      <th className="py-3 px-3 text-right">মাসিক হার</th>
                      {MONTH_KEYS.map((m) => (
                        <th key={m} className="py-3 px-2 text-center text-[11px]">
                          {MONTH_NAMES_BN[m]}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-right">মোট জমা</th>
                      <th className="py-3 px-3 text-center">অগ্রগতি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE8E0]">
                    {filteredMembers.map((member) => {
                      const isFullyPaid = member.paidCount >= 12;
                      const matchedMemberId = memberNameToIdMap.get(member.name.trim().toLowerCase());

                      return (
                        <tr key={member.serial} className="hover:bg-[#FDFCF9] transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-[#7A877E]">
                            {member.serial}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#2D3630] whitespace-nowrap">
                            {memberLinkSettings.makeProfileLink && matchedMemberId ? (
                              <Link
                                to={`/members/${matchedMemberId}`}
                                className="text-[#2D5A41] hover:underline inline-flex items-center gap-1 group"
                                title="সদস্যের বিস্তারিত প্রোফাইল দেখুন"
                              >
                                <span>{member.name}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span>{member.name}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5C665F] whitespace-nowrap">
                            ৳ {member.commitment.toLocaleString()}
                          </td>
                          {MONTH_KEYS.map((m) => {
                            const isPaid = member.months[m] === 'paid';
                            return (
                              <td key={m} className="py-3 px-2 text-center">
                                {isPaid ? (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-[10px] font-bold"
                                    title={`${MONTH_NAMES_BN[m]} পরিশোধিত`}
                                  >
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    className="inline-block w-2 h-2 rounded-full bg-[#EBE8E0]"
                                    title={`${MONTH_NAMES_BN[m]} বাকি`}
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#2D5A41] whitespace-nowrap">
                            ৳ {member.totalContributed.toLocaleString()}
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
                              <span>{member.paidCount}/১২ মাস</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredMembers.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#7A877E]">
                    কোনো সদস্যের তথ্য পাওয়া যায়নি।
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
                    {headings.title || 'মানবিক সহায়তা ও ব্যয় বিবরণী'} ({displayExpenses.length})
                  </span>
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5">
                  {headings.subtitle ||
                    'তহবিল হতে অনুমোদিত মানবিক সাহায্য, চিকিৎসা অনুদান ও ত্রাণ ব্যয়ের হিসাব'}
                </p>
              </div>

              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-center font-mono">
                <span>
                  {headings.totalSpentLabel || 'সর্বমোট ব্যয়'}: -৳ {totalOut.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
                  <tr>
                    <th className="py-3 px-4">{headings.columnDate || 'তারিখ'}</th>
                    <th className="py-3 px-4">{headings.columnTitle || 'সহায়তা / ব্যয়ের বিবরণ'}</th>
                    <th className="py-3 px-4">{headings.columnCategory || 'খাত'}</th>
                    <th className="py-3 px-4">{headings.columnLocation || 'এলাকা'}</th>
                    <th className="py-3 px-4 text-center">{headings.columnReceipt || 'ভাউচার'}</th>
                    <th className="py-3 px-4 text-right">{headings.columnAmount || 'পরিমাণ'} (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE8E0]">
                  {displayExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FDFCF9] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#5C665F] whitespace-nowrap">
                        {exp.date}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2D3630] flex items-center gap-2">
                          <span>{getLocalizedValue(exp.title, language)}</span>
                          {exp.deductionMode === 'separate' && (
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                              পৃথক তহবিল
                            </span>
                          )}
                          {exp.deductionMode === 'display_only' && (
                            <span className="text-[10px] font-normal px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                              প্রদর্শনী
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
                            গ্রহীতা: {getLocalizedValue(exp.recipient, language)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#E8EFEA] text-[#2D5A41]">
                          {exp.category === 'emergency_aid'
                            ? 'জরুরি ত্রাণ'
                            : exp.category === 'medical_aid'
                            ? 'চিকিৎসা সহায়তা'
                            : exp.category === 'education_aid'
                            ? 'শিক্ষা সহায়তা'
                            : exp.category === 'orphan_widow'
                            ? 'এতিম/বিধবা সহায়তা'
                            : (exp.customCategory ? getLocalizedValue(exp.customCategory, language) : 'অন্যান্য ব্যয়')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#5C665F]">
                        {exp.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#7A877E] shrink-0" />
                            <span>{getLocalizedValue(exp.location, language)}</span>
                          </span>
                        ) : (
                          <span className="text-[#A4B3A8]">ফেনী সদর</span>
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
                            <span>ভাউচার</span>
                          </button>
                        ) : (
                          <span className="text-[#C5BFB0]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        -৳ {exp.amount.toLocaleString()}
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
                  <span>তহবিল ব্যবহার ও নিরাপত্তা অনুপাত</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#FDFCF9]">
                  মানবিক সহায়তা ও চিকিৎসায় ব্যয়িত হার
                </h3>
                <p className="text-xs text-[#8A9B8F] mt-1">
                  সর্বমোট সংগৃহীত তহবিলের বিপরীতে মানবিক কাজে ব্যয় এবং বাইতুল মালের অবশিষ্ট মওজুদ
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#82CCA3]">
                  {expenseRatioFormatted}%
                </span>
                <span className="block text-[11px] text-[#8A9B8F]">ব্যয় অনুপাত</span>
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
                <span className="text-[#8A9B8F] block">মোট মানবিক সহায়তা ব্যয়:</span>
                <span className="text-base font-bold font-mono text-[#E0A899]">
                  ৳ {totalOut.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#202C23] border border-[#28382C] space-y-1">
                <span className="text-[#8A9B8F] block">বাইতুল মালে কার্যকর নগদ স্থিতি:</span>
                <span className="text-base font-bold font-mono text-[#82CCA3]">
                  ৳ {currentBalance.toLocaleString()} ({safetyRatioFormatted}%)
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
                <span>ব্যয়ের প্রমাণপত্র / ভাউচার কপি</span>
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
                alt="ভাউচার কপি"
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
