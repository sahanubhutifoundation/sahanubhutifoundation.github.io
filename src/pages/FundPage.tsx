import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { storageService } from '../services/storageService';
import { fetchFundData, MONTH_KEYS, MONTH_NAMES_BN } from '../services/fundService';
import { FundData, FundMemberRecord, FundVisibilitySettings } from '../types';
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
  Filter,
  Receipt,
  X,
  MapPin,
} from 'lucide-react';

export const FundPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [config] = useState(storageService.getConfig());
  const [visibility, setVisibility] = useState<FundVisibilitySettings>(storageService.getFundVisibility());
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'complete' | 'ongoing'>('all');
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const currentConfig = storageService.getConfig();
      setVisibility(storageService.getFundVisibility());
      const res = await fetchFundData(currentConfig.fundSourceUrl);
      setFundData(res);
    } catch (e) {
      console.warn('Fund load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto-refresh periodically every 3 minutes
    const interval = setInterval(() => {
      loadData(false);
    }, 180000);

    return () => clearInterval(interval);
  }, [loadData]);

  const totalIn = fundData?.amountReceived || 0;
  const totalOut = fundData?.amountSpent || 0;
  const currentBalance = fundData?.currentBalance || (totalIn - totalOut);
  const contributorCount = fundData?.contributorCount || fundData?.memberRecords?.length || 0;
  const utilizationRate = totalIn > 0 ? Math.min(100, Math.round((totalOut / totalIn) * 100)) : 0;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // Filtered members list (with strict privacy - no phone numbers)
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
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={t('fundDashboardTitle')}
        subtitle={t('fundSubtitle')}
        breadcrumb={[{ label: t('navFund') }]}
        tag="স্বচ্ছ বাইতুল মাল তহবিল"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Controls Bar: Source indicator, last updated, refresh button */}
        <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-[#5C665F]">
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  fundData?.status === 'live'
                    ? 'bg-[#2D5A41]'
                    : fundData?.status === 'fallback'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span>
                {fundData?.status === 'live'
                  ? 'লাইভ গুগল শিট সংযুক্ত'
                  : fundData?.status === 'fallback'
                  ? 'সংরক্ষিত ক্যাশ তথ্য'
                  : 'সংযোগ যাচাই করা হচ্ছে'}
              </span>
            </span>

            {fundData?.lastUpdated && (
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

            {config.fundSourceUrl && (
              <a
                href={config.fundSourceUrl}
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

        {/* Temporary unavailable notice if error */}
        {fundData?.status === 'error' && (
          <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#9E3628] flex items-start gap-3 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-[#C25442] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {language === 'bn' ? 'সংযোগ সংক্রান্ত তথ্য:' : 'Connection note:'}
              </span>
              <span>{t('fundDataUnavailable')}</span>
            </div>
          </div>
        )}

        {/* Core Metric Cards (Based on Google Sheet Real Totals and Visibility Settings) */}
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
                ২০২৪, ২০২৫ ও ২০২৬ সর্বমোট আদায়
              </p>
            </div>
          )}

          {/* Card 2: Total Spent */}
          {visibility.showTotalCost !== false && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-[#7A877E] mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A877E]">
                  {t('totalSpentCard')}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] text-[#C25442] flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#C25442] font-mono tracking-tight">
                {loading ? '...' : `৳ ${totalOut.toLocaleString()}`}
              </div>
              <p className="text-xs text-[#7A877E] mt-2">
                ওষুধ ও জরুরি মানবিক সহায়তা ব্যয়
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
                বাইতুল মালে বর্তমান কার্যকর স্থিতি
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

        {/* Yearly Growth Overview (2024, 2025, 2026) */}
        {fundData?.yearlyReceived && Object.keys(fundData.yearlyReceived).length > 0 && (
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
                <span>সর্বমোট: ৳ {totalIn.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['2024', '2025', '2026'].map((year) => {
                const amount = fundData.yearlyReceived?.[year] || 0;
                const pct = totalIn > 0 ? Math.round((amount / totalIn) * 100) : 0;
                return (
                  <div
                    key={year}
                    className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5C665F]">
                        {year === '2026' ? '২০২৬ (চলতি বছর)' : year === '2025' ? '২০২৫ সাল' : '২০২৪ সাল'}
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

        {/* 2026 Monthly Breakdown Grid */}
        {visibility.showMonthlyFundDetails !== false && fundData?.monthlyTotals && Object.keys(fundData.monthlyTotals).length > 0 && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#2D5A41]" />
                  <span>{t('monthlyBreakdownTitle')} (২০২৬)</span>
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5">
                  প্রতি মাসের আদায়কৃত নিয়মিত মাসিক কিস্তির পরিসংখ্যান
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-[#2D3630] bg-[#F7F5F0] px-3 py-1.5 rounded-lg self-start sm:self-center">
                ২০২৬ সর্বমোট: ৳ {(fundData.yearlyReceived?.['2026'] || 0).toLocaleString()}
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
        {visibility.showMemberContributionDetails !== false && fundData?.memberRecords && fundData.memberRecords.length > 0 && (
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
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7A877E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="সদস্যের নাম খুঁজুন..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] w-40 sm:w-48"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="inline-flex rounded-lg border border-[#EBE8E0] bg-[#F7F5F0] p-0.5 text-xs font-semibold text-[#5C665F]">
                  <button
                    onClick={() => setMemberFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      memberFilter === 'all' ? 'bg-white text-[#2D3630] shadow-2xs' : 'hover:text-[#2D3630]'
                    }`}
                  >
                    সকল ({fundData.memberRecords.length})
                  </button>
                  <button
                    onClick={() => setMemberFilter('complete')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      memberFilter === 'complete' ? 'bg-white text-[#2D3630] shadow-2xs' : 'hover:text-[#2D3630]'
                    }`}
                  >
                    সম্পূর্ণ
                  </button>
                  <button
                    onClick={() => setMemberFilter('ongoing')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      memberFilter === 'ongoing' ? 'bg-white text-[#2D3630] shadow-2xs' : 'hover:text-[#2D3630]'
                    }`}
                  >
                    চলমান
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] text-[#5C665F] text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2D5A41] shrink-0" />
              <span>
                <strong>গোপনীয়তা নিশ্চিতকরণ:</strong> সদস্যদের ব্যক্তিগত ফোন বা যোগাযোগের তথ্য সর্বজনীনভাবে উন্মুক্ত নয়। শুধুমাত্র অঙ্গীকার ও জমাকৃত হিসাব প্রদর্শিত হচ্ছে।
              </span>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-[#2D3630] border-collapse">
                <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">সদস্যের নাম</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">অঙ্গীকার</th>
                    {MONTH_KEYS.map((m) => (
                      <th key={m} className="py-2.5 px-1.5 text-center text-[11px] w-8">
                        {m}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">মোট জমা</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE8E0]">
                  {filteredMembers.map((member: FundMemberRecord) => {
                    const isFullyPaid = member.paidCount >= 12;

                    return (
                      <tr key={member.serial} className="hover:bg-[#FDFCF9] transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-xs text-[#7A877E]">
                          {member.serial}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#2D3630] whitespace-nowrap">
                          {member.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-[#5C665F] whitespace-nowrap">
                          ৳ {member.commitment.toLocaleString()}
                        </td>

                        {/* 12 Months Indicators */}
                        {MONTH_KEYS.map((m) => {
                          const isPaid = member.months[m] === 'paid';
                          return (
                            <td key={m} className="py-2 px-1 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                                  isPaid
                                    ? 'bg-[#E8EFEA] text-[#2D5A41] font-bold'
                                    : 'text-[#C5BFB0] font-normal'
                                }`}
                                title={`${member.name} - ${MONTH_NAMES_BN[m]}: ${isPaid ? 'পরিশোধিত' : 'বকেয়া'}`}
                              >
                                {isPaid ? '✓' : '—'}
                              </span>
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2D5A41] whitespace-nowrap">
                          ৳ {member.totalContributed.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
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

        {/* Humanitarian Aid & Expense Ledger Section (Controlled by Admin Visibility) */}
        {visibility.showExpenseDetails !== false && fundData?.expenses && fundData.expenses.length > 0 && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBE8E0]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#2D3630] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#2D5A41]" />
                  <span>মানবিক সহায়তা ও ব্যয় বিবরণী ({fundData.expenses.length})</span>
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5">
                  তহবিল হতে অনুমোদিত মানবিক সাহায্য, চিকিৎসা অনুদান ও ত্রাণ ব্যয়ের হিসাব
                </p>
              </div>

              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-center font-mono">
                <span>সর্বমোট ব্যয়: -৳ {totalOut.toLocaleString()}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
                  <tr>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">সহায়তা / ব্যয়ের বিবরণ</th>
                    <th className="py-3 px-4">খাত</th>
                    <th className="py-3 px-4">এলাকা</th>
                    <th className="py-3 px-4 text-center">ভাউচার</th>
                    <th className="py-3 px-4 text-right">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE8E0]">
                  {fundData.expenses.map((exp) => (
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
                        {exp.recipient && exp.isRecipientPublic && (
                          <span className="text-[10px] text-[#2D5A41] font-medium block mt-0.5">
                            গ্রহীতা: {exp.recipient}
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
                            : exp.customCategory || 'অন্যান্য ব্যয়'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#5C665F]">
                        {exp.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#7A877E] shrink-0" />
                            <span>{exp.location}</span>
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
              <span className="text-2xl font-bold font-mono text-[#82CCA3]">{utilizationRate}%</span>
              <span className="block text-[11px] text-[#8A9B8F]">ব্যয় অনুপাত</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-[#202C23] rounded-full overflow-hidden p-0.5 border border-[#28382C]">
            <div
              className="h-full bg-gradient-to-r from-[#2D5A41] to-[#65B78A] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, utilizationRate)}%` }}
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
                ৳ {currentBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
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
  );
};
