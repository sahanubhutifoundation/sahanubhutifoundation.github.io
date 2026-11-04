import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  ShieldCheck,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Save,
  Check,
  Calendar,
  Clock
} from 'lucide-react';
import { Member, FundMemberRecord, FundProfileLinkRecord, YearlyFundSource, FundContributionStartRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { fetchFundData, MONTH_KEYS, getLocalizedMonthName } from '../../services/fundService';
import { formatLocalizedNumber } from '../../utils/foundationHelpers';

interface AdminFundProfileLinkingManagerProps {
  members: Member[];
  yearlySources: YearlyFundSource[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminFundProfileLinkingManager: React.FC<AdminFundProfileLinkingManagerProps> = ({
  members,
  yearlySources,
  showToast,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [sheetRecords, setSheetRecords] = useState<FundMemberRecord[]>([]);
  const [links, setLinks] = useState<FundProfileLinkRecord[]>([]);
  const [contributionStarts, setContributionStarts] = useState<FundContributionStartRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'needs_review' | 'unlinked' | 'conflict'>('all');

  // Modal State for Linking a Record
  const [linkingRecord, setLinkingRecord] = useState<FundMemberRecord | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileSearchQuery, setProfileSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for Setting Contribution Start Period
  const [settingStartRecord, setSettingStartRecord] = useState<{
    record: FundMemberRecord;
    canonicalId: string;
    existing?: FundContributionStartRecord;
  } | null>(null);
  const [startYear, setStartYear] = useState<number>(2026);
  const [startMonth, setStartMonth] = useState<number>(1);
  const [startDateExact, setStartDateExact] = useState<string>('');
  const [startNotes, setStartNotes] = useState<string>('');

  const loadLinksAndSheetData = async (forceFresh = false) => {
    setLoading(true);
    try {
      // 1. Fetch persistent cross-browser links from backend/cloud
      const cloudRes = await storageService.fetchFundProfileLinksAsync(selectedYear);
      const savedLinks = cloudRes.data || storageService.getFundProfileLinks(selectedYear);
      setLinks(savedLinks);

      // 2. Fetch persistent contribution starts from backend/cloud
      await storageService.fetchFundContributionStartsAsync();
      setContributionStarts(storageService.getFundContributionStarts());

      const src = yearlySources.find((s) => s.year === selectedYear);
      const url = src?.url || '';
      const gid = src?.gid || '';

      const fundData = await fetchFundData(url, forceFresh, selectedYear, gid);
      setSheetRecords(fundData.memberRecords || []);
    } catch (err) {
      console.warn('Error loading linking records:', err);
      showToast('শিট রেকর্ড লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinksAndSheetData(false);
  }, [selectedYear]);

  // Combine Sheet Record with Active Profile Link and Contribution Start
  const consolidatedRows = useMemo(() => {
    return sheetRecords.map((rec) => {
      const cleanName = (rec.name || '').trim();
      const norm = cleanName.toLowerCase().replace(/[\s\.\-_]+/g, '');
      const canonicalId = rec.canonicalMemberId || `${selectedYear}-${rec.serial}-${norm}`;

      const explicitLink = links.find((l) => {
        if (l.canonicalFundMemberId && l.canonicalFundMemberId === canonicalId) return true;
        if (l.sheetSerial && l.sheetSerial === rec.serial) return true;
        const lNorm = (l.sheetMemberName || '').toLowerCase().replace(/[\s\.\-_]+/g, '');
        return lNorm && lNorm === norm;
      });

      let status: 'linked' | 'needs_review' | 'unlinked' | 'conflict' = 'unlinked';
      let linkedProfile: Member | undefined;

      if (explicitLink && explicitLink.status === 'linked' && explicitLink.linkedProfileId) {
        linkedProfile = members.find((m) => m.id === explicitLink.linkedProfileId);
        status = explicitLink.confirmedByAdmin ? 'linked' : 'needs_review';
      } else if (rec.linkedProfileId && rec.isMappedByAdmin) {
        linkedProfile = members.find((m) => m.id === rec.linkedProfileId);
        status = 'linked';
      } else if (rec.canonicalMemberId) {
        linkedProfile = members.find((m) => m.id === rec.canonicalMemberId);
        status = 'needs_review';
      } else {
        // Check if there is an unconfirmed name match candidate
        const candidate = members.find((m) => {
          const mNorm = (m.name || '').toLowerCase().replace(/[\s\.\-_]+/g, '');
          const mBnNorm = (m.nameBn || '').toLowerCase().replace(/[\s\.\-_]+/g, '');
          const mEnNorm = (m.nameEn || '').toLowerCase().replace(/[\s\.\-_]+/g, '');
          return norm === mNorm || norm === mBnNorm || norm === mEnNorm;
        });
        if (candidate) {
          linkedProfile = candidate;
          status = 'needs_review';
        }
      }

      const contributionStart = contributionStarts.find((cs) => {
        if (cs.canonicalFundMemberId && cs.canonicalFundMemberId === canonicalId) return true;
        if (linkedProfile && cs.canonicalFundMemberId === linkedProfile.id) return true;
        if (explicitLink?.linkedProfileId && cs.canonicalFundMemberId === explicitLink.linkedProfileId) return true;
        const csNorm = (cs.canonicalFundMemberId || '').toLowerCase().replace(/[\s\.\-_]+/g, '');
        return csNorm && csNorm === norm;
      });

      return {
        sheetRecord: rec,
        canonicalId,
        explicitLink,
        linkedProfile,
        status,
        contributionStart,
      };
    });
  }, [sheetRecords, links, members, selectedYear, contributionStarts]);

  // Detect Conflicts: If multiple sheet records link to the same registered member profile
  const conflictsMap = useMemo(() => {
    const profileCounts: Record<string, string[]> = {};
    consolidatedRows.forEach((row) => {
      if (row.linkedProfile && row.status === 'linked') {
        const pId = row.linkedProfile.id;
        if (!profileCounts[pId]) profileCounts[pId] = [];
        profileCounts[pId].push(row.sheetRecord.name);
      }
    });

    const conflicts: Record<string, string[]> = {};
    Object.entries(profileCounts).forEach(([pId, names]) => {
      if (names.length > 1) {
        conflicts[pId] = names;
      }
    });
    return conflicts;
  }, [consolidatedRows]);

  // Update Status to conflict if present in conflictsMap
  const finalizedRows = useMemo(() => {
    return consolidatedRows.map((row) => {
      if (row.linkedProfile && conflictsMap[row.linkedProfile.id]) {
        return {
          ...row,
          status: 'conflict' as const,
        };
      }
      return row;
    });
  }, [consolidatedRows, conflictsMap]);

  // Filtered rows based on search query and status filter
  const filteredRows = useMemo(() => {
    return finalizedRows.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        row.sheetRecord.name.toLowerCase().includes(q) ||
        row.sheetRecord.serial.toString().includes(q) ||
        (row.linkedProfile && (
          row.linkedProfile.name.toLowerCase().includes(q) ||
          (row.linkedProfile.nameBn && row.linkedProfile.nameBn.includes(q)) ||
          (row.linkedProfile.nameEn && row.linkedProfile.nameEn.toLowerCase().includes(q)) ||
          row.linkedProfile.id.toLowerCase().includes(q)
        ));

      if (!matchSearch) return false;

      if (filterStatus === 'all') return true;
      return row.status === filterStatus;
    });
  }, [finalizedRows, searchQuery, filterStatus]);

  // Handle Link / Change Confirmation
  const handleSaveLink = async (record: FundMemberRecord, profileId: string, confirmed: boolean) => {
    const targetMember = members.find((m) => m.id === profileId);
    if (!targetMember) {
      showToast('নিবন্ধিত সদস্য নির্বাচন করুন', 'error');
      return;
    }

    const cleanName = (record.name || '').trim();
    const norm = cleanName.toLowerCase().replace(/[\s\.\-_]+/g, '');
    const canonicalId = record.canonicalMemberId || `${selectedYear}-${record.serial}-${norm}`;

    const linkRecord: FundProfileLinkRecord = {
      id: `link-${selectedYear}-${record.serial}-${norm}`,
      year: selectedYear,
      sheetGid: record.sheetGid,
      sourceRow: record.sourceRow,
      sheetSerial: record.serial,
      sheetMemberName: cleanName,
      canonicalFundMemberId: canonicalId,
      linkedProfileId: targetMember.id,
      linkedProfileName: targetMember.nameBn || targetMember.name,
      status: confirmed ? 'linked' : 'needs_review',
      confirmedByAdmin: confirmed,
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const res = await storageService.saveFundProfileLinkAsync(linkRecord);
      if (!res.success) {
        showToast(res.error || 'সদস্য ম্যাপিং ক্লাউড ডাটাবেজে সংরক্ষণ করা যায়নি।', 'error');
        return;
      }
      setLinks(storageService.getFundProfileLinks(selectedYear));
      setLinkingRecord(null);
      showToast(`${cleanName} ↔ ${targetMember.nameBn || targetMember.name} লিঙ্ক সফলভাবে ক্লাউড ডাটাবেজে সংরক্ষিত হয়েছে`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'সদস্য ম্যাপিং সংরক্ষণে ত্রুটি দেখা দিয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Unlink
  const handleUnlink = async (record: FundMemberRecord) => {
    const cleanName = (record.name || '').trim();
    const norm = cleanName.toLowerCase().replace(/[\s\.\-_]+/g, '');
    const canonicalId = record.canonicalMemberId || `${selectedYear}-${record.serial}-${norm}`;

    const linkRecord: FundProfileLinkRecord = {
      id: `link-${selectedYear}-${record.serial}-${norm}`,
      year: selectedYear,
      sheetGid: record.sheetGid,
      sourceRow: record.sourceRow,
      sheetSerial: record.serial,
      sheetMemberName: cleanName,
      canonicalFundMemberId: canonicalId,
      linkedProfileId: undefined,
      linkedProfileName: undefined,
      status: 'unlinked',
      confirmedByAdmin: true,
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const res = await storageService.saveFundProfileLinkAsync(linkRecord);
      if (!res.success) {
        showToast(res.error || 'আনলিঙ্ক ক্লাউড ডাটাবেজে আপডেট করা যায়নি।', 'error');
        return;
      }
      setLinks(storageService.getFundProfileLinks(selectedYear));
      showToast(`${cleanName} আনলিঙ্ক সফলভাবে সম্পন্ন হয়েছে`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'আনলিঙ্ক প্রক্রিয়ায় ত্রুটি ঘটেছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Approve Candidate
  const handleQuickApprove = (row: typeof consolidatedRows[0]) => {
    if (!row.linkedProfile) return;
    handleSaveLink(row.sheetRecord, row.linkedProfile.id, true);
  };

  // Handle Save Contribution Start Period
  const handleSaveContributionStart = async () => {
    if (!settingStartRecord) return;
    setIsSaving(true);
    try {
      const record = settingStartRecord.record;
      const canonicalId = settingStartRecord.canonicalId;
      const startRecord: FundContributionStartRecord = {
        id: `start-${canonicalId}`,
        canonicalFundMemberId: canonicalId,
        memberProfileId: settingStartRecord.existing?.memberProfileId || record.linkedProfileId,
        startYear: Number(startYear),
        startMonth: Number(startMonth),
        startDate: startDateExact || undefined,
        notes: startNotes || undefined,
        configuredBy: 'admin',
        updatedAt: new Date().toISOString(),
      };

      const res = await storageService.saveFundContributionStartAsync(startRecord);
      if (!res.success) {
        showToast(res.error || 'অবদান শুরু ক্লাউড ডাটাবেজে সংরক্ষণ করা যায়নি।', 'error');
        return;
      }
      setContributionStarts(storageService.getFundContributionStarts());
      setSettingStartRecord(null);
      showToast(`${record.name}-এর অবদান শুরুর সময় (${startMonth}/${startYear}) সফলভাবে সংরক্ষিত হয়েছে`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'অবদান শুরুর সময় সংরক্ষণে সমস্যা হয়েছে', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered members for modal search
  const modalFilteredMembers = useMemo(() => {
    const q = profileSearchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => {
      return (
        m.name.toLowerCase().includes(q) ||
        (m.nameBn && m.nameBn.includes(q)) ||
        (m.nameEn && m.nameEn.toLowerCase().includes(q)) ||
        m.id.toLowerCase().includes(q) ||
        m.serial.toString().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q))
      );
    });
  }, [members, profileSearchQuery]);

  const stats = useMemo(() => {
    let linked = 0;
    let needsReview = 0;
    let unlinked = 0;
    let conflict = 0;

    finalizedRows.forEach((r) => {
      if (r.status === 'linked') linked++;
      else if (r.status === 'needs_review') needsReview++;
      else if (r.status === 'unlinked') unlinked++;
      else if (r.status === 'conflict') conflict++;
    });

    return { total: finalizedRows.length, linked, needsReview, unlinked, conflict };
  }, [finalizedRows]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#EBE8E0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#2D3630] flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#2D5A41]" />
              <span>তহবিল সদস্য ↔ নিবন্ধিত প্রোফাইল লিঙ্কিং (Fund Member ↔ Registered Profile Linking)</span>
            </h2>
            <p className="text-xs text-[#5C665F] mt-1 leading-relaxed">
              স্প্রেডশিটের বছরভিত্তিক সদস্য রেকর্ডগুলোকে ওয়েবসাইটের নিবন্ধিত প্রোফাইলের সাথে লিঙ্ক বা আনলিঙ্ক করুন।
              <br />
              <strong className="text-[#2D3630]">নিরাপত্তা নিয়ম:</strong> অ্যাডমিন কর্তৃক স্পষ্টভাবে নিশ্চিত (Confirmed) না হওয়া পর্যন্ত পাবলিক ফান্ড পেজে সদস্যের নাম ক্লিকেবল লিংক হবে না।
            </p>
          </div>

          {/* Year Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gray-700">আর্থিক বছর:</span>
            <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-[#EBE8E0]">
              {(yearlySources.length > 0 ? yearlySources : [{ year: '2026' } as YearlyFundSource]).map((s) => (
                <button
                  key={s.year}
                  type="button"
                  onClick={() => setSelectedYear(s.year)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedYear === s.year
                      ? 'bg-[#2D5A41] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {s.year}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => loadLinksAndSheetData(true)}
              disabled={loading}
              title="শিট থেকে পুনরায় রিফ্রেশ করুন"
              className="p-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-[#EBE8E0] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2D5A41]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Conflict Warning Banner if any profile has multiple sheet rows mapped to it */}
      {Object.keys(conflictsMap).length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>সতর্কতা: একই নিবন্ধিত প্রোফাইলে একাধিক শিট রেকর্ড লিঙ্ক করা হয়েছে (Conflict Detected)</span>
          </div>
          <div className="text-xs space-y-1 pl-7">
            {Object.entries(conflictsMap).map(([pId, names]) => {
              const prof = members.find((m) => m.id === pId);
              return (
                <div key={pId} className="flex items-center gap-2">
                  <span className="font-semibold text-red-950">
                    {prof?.nameBn || prof?.name || pId} (#{prof?.serial})
                  </span>
                  <span>← লিঙ্ককৃত শিট রেকর্ডসমূহ:</span>
                  <span className="font-mono bg-red-100 px-2 py-0.5 rounded text-[11px] font-bold">
                    {names.join(' + ')}
                  </span>
                </div>
              );
            })}
            <p className="text-[11px] text-red-700 mt-1">
              অনুগ্রহ করে নিচের তালিকা থেকে ভুল রেকর্ডটি আনলিংক বা সঠিক প্রোফাইলে পরিবর্তন করে দ্বন্দ্ব নিরসন করুন।
            </p>
          </div>
        </div>
      )}

      {/* Stats and Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`p-3 rounded-xl border text-center transition-all ${
            filterStatus === 'all'
              ? 'bg-[#2D5A41] text-white border-[#2D5A41] shadow-2xs'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs opacity-80">মোট রেকর্ড</div>
          <div className="text-lg font-bold">{stats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('linked')}
          className={`p-3 rounded-xl border text-center transition-all ${
            filterStatus === 'linked'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
              : 'bg-white text-emerald-800 border-gray-200 hover:bg-emerald-50'
          }`}
        >
          <div className="text-xs opacity-80">অনুমোদিত লিঙ্কড</div>
          <div className="text-lg font-bold">{stats.linked}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('needs_review')}
          className={`p-3 rounded-xl border text-center transition-all ${
            filterStatus === 'needs_review'
              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
              : 'bg-white text-amber-800 border-gray-200 hover:bg-amber-50'
          }`}
        >
          <div className="text-xs opacity-80">পর্যালোচনা আবশ্যক</div>
          <div className="text-lg font-bold">{stats.needsReview}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('unlinked')}
          className={`p-3 rounded-xl border text-center transition-all ${
            filterStatus === 'unlinked'
              ? 'bg-gray-700 text-white border-gray-700 shadow-2xs'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs opacity-80">আনলিংকড</div>
          <div className="text-lg font-bold">{stats.unlinked}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('conflict')}
          className={`p-3 rounded-xl border text-center transition-all ${
            filterStatus === 'conflict'
              ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
              : 'bg-white text-rose-800 border-gray-200 hover:bg-rose-50'
          }`}
        >
          <div className="text-xs opacity-80">সাংঘর্ষিক</div>
          <div className="text-lg font-bold">{stats.conflict}</div>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="শিট সদস্যের নাম, ক্রমিক নম্বর বা নিবন্ধিত প্রোফাইলের নাম দিয়ে খুঁজুন..."
          className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#EBE8E0] rounded-xl focus:ring-2 focus:ring-[#2D5A41] outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table of Year-Specific Sheet Records */}
      <div className="overflow-x-auto rounded-2xl border border-[#EBE8E0] bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#FAF8F5] border-b border-[#EBE8E0] text-[#5C665F] uppercase font-bold text-[11px] tracking-wider">
            <tr>
              <th className="py-3 px-3 text-center">ক্রমিক</th>
              <th className="py-3 px-3">শিটের নাম (Sheet Name)</th>
              <th className="py-3 px-3">স্ট্যাটাস (Status)</th>
              <th className="py-3 px-3">লিঙ্ককৃত নিবন্ধিত প্রোফাইল</th>
              <th className="py-3 px-3">অবদান শুরুর সময়</th>
              <th className="py-3 px-3">মোট জমা</th>
              <th className="py-3 px-3 text-right">কার্যক্রম (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBE8E0]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 text-xs">
                  {loading ? 'শিট রেকর্ড লোড করা হচ্ছে...' : 'কোনো সদস্য রেকর্ড পাওয়া যায়নি।'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const rec = row.sheetRecord;
                const status = row.status;

                return (
                  <tr key={row.canonicalId} className="hover:bg-[#FDFCF9] transition-colors">
                    {/* Serial & Row */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="font-bold text-[#2D3630]">#{rec.serial}</span>
                      {rec.sourceRow && (
                        <span className="block text-[10px] text-gray-400">রো {rec.sourceRow}</span>
                      )}
                    </td>

                    {/* Sheet Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#2D3630] text-sm">{rec.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">
                        ID: {row.canonicalId}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {status === 'linked' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>অনুমোদিত লিঙ্কড</span>
                        </span>
                      )}
                      {status === 'needs_review' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>পর্যালোচনা আবশ্যক</span>
                        </span>
                      )}
                      {status === 'unlinked' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          <Unlink className="w-3.5 h-3.5 text-gray-400" />
                          <span>আনলিংকড</span>
                        </span>
                      )}
                      {status === 'conflict' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span>সাংঘর্ষিক</span>
                        </span>
                      )}
                    </td>

                    {/* Linked Profile */}
                    <td className="py-3 px-3">
                      {row.linkedProfile ? (
                        <div className="flex items-center gap-2.5">
                          {row.linkedProfile.photoUrl ? (
                            <img
                              src={row.linkedProfile.photoUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-[#EBE8E0]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#E8F0EC] text-[#2D5A41] flex items-center justify-center font-bold text-xs">
                              {row.linkedProfile.name[0] || 'M'}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <span>{row.linkedProfile.nameBn || row.linkedProfile.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                (#{row.linkedProfile.serial})
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {row.linkedProfile.nameEn && `En: ${row.linkedProfile.nameEn} • `}
                              {row.linkedProfile.role || 'সদস্য'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">কোনো প্রোফাইল সংযুক্ত নেই</span>
                      )}
                    </td>

                    {/* Contribution Start */}
                    <td className="py-3 px-3">
                      {row.contributionStart ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                          <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="font-semibold text-[11px]">
                            {getLocalizedMonthName(MONTH_KEYS[row.contributionStart.startMonth - 1], 'bn')}{' '}
                            {row.contributionStart.startYear}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">নির্ধারিত নয়</span>
                      )}
                    </td>

                    {/* Total Contributed */}
                    <td className="py-3 px-3 font-mono font-semibold text-gray-700">
                      ৳ {rec.totalContributed.toLocaleString()}
                      <span className="block text-[10px] text-gray-400 font-normal">
                        {rec.paidCount} মাস
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {status === 'needs_review' && row.linkedProfile && (
                          <button
                            type="button"
                            onClick={() => handleQuickApprove(row)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 shadow-2xs"
                            title="প্রস্তাবিত লিঙ্ক অনুমোদন করুন"
                          >
                            <Check className="w-3 h-3" />
                            <span>অনুমোদন</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setLinkingRecord(rec);
                            setSelectedProfileId(row.linkedProfile?.id || '');
                            setProfileSearchQuery('');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-gray-100 text-[#2D5A41] border border-[#2D5A41]/40 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>{row.linkedProfile ? 'পরিবর্তন' : 'লিংক করুন'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const existing = row.contributionStart;
                            setSettingStartRecord({ record: rec, canonicalId: row.canonicalId, existing });
                            setStartYear(existing?.startYear || parseInt(selectedYear, 10) || 2026);
                            setStartMonth(existing?.startMonth || 1);
                            setStartDateExact(existing?.startDate || '');
                            setStartNotes(existing?.notes || '');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg flex items-center gap-1 transition-colors"
                          title="সদস্যের অবদান শুরুর বছর ও মাস নির্ধারণ করুন"
                        >
                          <Calendar className="w-3 h-3 text-amber-700" />
                          <span>অবদান শুরু</span>
                        </button>

                        {row.linkedProfile && (
                          <button
                            type="button"
                            onClick={() => handleUnlink(rec)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="আনলিংক করুন"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Link / Change Modal */}
      {linkingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E0DBCF] overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1E3A2F] text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#2D5A41]" />
                  <span>সদস্য প্রোফাইল লিঙ্ক করুন</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  শিট রেকর্ড: <strong className="text-gray-800">#{linkingRecord.serial} {linkingRecord.name}</strong> ({selectedYear} সাল)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingRecord(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  নিবন্ধিত সদস্য খুঁজুন (নাম, ক্রমিক বা ভূমিকা দিয়ে):
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profileSearchQuery}
                    onChange={(e) => setProfileSearchQuery(e.target.value)}
                    placeholder="সদস্যের নাম বা সিরিয়াল লিখুন..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A41] outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Members Selection List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-[#FDFCF9]">
                {modalFilteredMembers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    কোনো নিবন্ধিত সদস্য পাওয়া যায়নি
                  </div>
                ) : (
                  modalFilteredMembers.map((m) => {
                    const isSelected = selectedProfileId === m.id;
                    const isConflict = conflictsMap[m.id] && conflictsMap[m.id].length > 0;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedProfileId(m.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#E8F0EC] border-[#2D5A41] text-[#1E3A2F]'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover border" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs">
                              {m.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span>{m.nameBn || m.name}</span>
                              <span className="font-mono text-[10px] text-gray-500">#{m.serial}</span>
                              {isConflict && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-red-100 text-red-700 rounded font-normal">
                                  অন্য রেকর্ডেও আছে
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {m.nameEn && `En: ${m.nameEn} • `}
                              {m.role || 'সদস্য'} • ID: {m.id}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#2D5A41] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinkingRecord(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  if (linkingRecord && selectedProfileId) {
                    handleSaveLink(linkingRecord, selectedProfileId, true);
                  }
                }}
                disabled={!selectedProfileId}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>নিশ্চিত ও সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Contribution Start Modal */}
      {settingStartRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E0DBCF] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1E3A2F] text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>অবদান শুরুর সময় নির্ধারণ</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  সদস্য: <strong className="text-gray-800">#{settingStartRecord.record.serial} {settingStartRecord.record.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingStartRecord(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong>স্বাধীন কনফিগারেশন:</strong> এই সময়কাল প্রোফাইল লিঙ্কিংয়ের উপর নির্ভরশীল নয়। শুরুর পূর্ববর্তী আর্থিক বছর বা মাসের জন্য কোনো কৃত্রিম বকেয়া ধার্য করা হবে না।
              </div>

              {/* Warning if payments exist before selected start */}
              {(settingStartRecord.record.paidCount || 0) > 0 && (
                Number(selectedYear) < startYear ||
                (Number(selectedYear) === startYear && MONTH_KEYS.slice(0, startMonth - 1).some(m => settingStartRecord.record.months[m] === 'paid'))
              ) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>সতর্কতা:</strong> নির্বাচিত শুরুর সময়ের পূর্বে এই সদস্যের যাচাইকৃত জমা রয়েছে। এতে পূর্ববর্তী জমা বাতিল হবে না, তবে সমন্বয় পর্যালোচনার প্রয়োজন হতে পারে।
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    শুরুর বছর (Start Year) *
                  </label>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A41] outline-none bg-white font-mono"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    শুরুর মাস (Start Month) *
                  </label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A41] outline-none bg-white"
                  >
                    {MONTH_KEYS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {getLocalizedMonthName(m, 'bn')} ({idx + 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  নির্দিষ্ট যোগদানের তারিখ (ঐচ্ছিক):
                </label>
                <input
                  type="date"
                  value={startDateExact}
                  onChange={(e) => setStartDateExact(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A41] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  মন্তব্য / নোট (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  placeholder="যেমন: প্রতিষ্ঠাকালীন সদস্য বা নতুন যোগদান..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2D5A41] outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#EBE8E0] bg-[#FAF8F5] flex items-center justify-between">
              <div>
                {settingStartRecord.existing && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('আপনি কি নিশ্চিত যে অবদান শুরুর রেকর্ডটি মুছে ফেলতে চান?')) return;
                      setIsSaving(true);
                      try {
                        const emptyRec: FundContributionStartRecord = {
                          ...settingStartRecord.existing!,
                          startYear: 0,
                          startMonth: 0,
                          updatedAt: new Date().toISOString(),
                        };
                        await storageService.saveFundContributionStartAsync(emptyRec);
                        setContributionStarts(storageService.getFundContributionStarts());
                        setSettingStartRecord(null);
                        showToast('অবদান শুরুর কনফিগারেশন রিসেট করা হয়েছে', 'success');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    রিসেট / মুছুন
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettingStartRecord(null)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSaveContributionStart}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-40 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
