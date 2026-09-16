import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  UploadCloud,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Info,
  Server,
  HardDrive,
  Download,
  Clock,
  Sparkles,
  Layers,
  Code,
  Terminal,
} from 'lucide-react';
import { supabaseService, MigrationResult } from '../../services/supabaseService';
import { storageService } from '../../services/storageService';
import { backupService } from '../../services/backupService';
import { BackupRestoreModal } from '../../components/admin/BackupRestoreModal';
import { SUPABASE_SCHEMA_SQL } from '../../data/supabaseSchemaSql';

interface CloudSyncCardProps {
  onRefreshLocalState: () => void;
  onShowToast: (msg: string) => void;
}

interface CloudStatus {
  connected: boolean;
  latencyMs: number;
  tables: Record<string, boolean>;
  allTablesExist: boolean;
  buckets: string[];
  error?: string;
  timestamp: string;
}

export const CloudSyncCard: React.FC<CloudSyncCardProps> = ({
  onRefreshLocalState,
  onShowToast,
}) => {
  const [isCloudConfigured, setIsCloudConfigured] = useState(() => supabaseService.isAvailable());
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Local data detection
  const [localCounts, setLocalCounts] = useState(() => supabaseService.getLocalDataCounts());

  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const runHealthCheck = useCallback(async () => {
    if (!supabaseService.isAvailable()) {
      setIsCloudConfigured(false);
      return;
    }
    setIsCheckingStatus(true);
    try {
      const status = await supabaseService.checkCloudStatus();
      setCloudStatus(status);
      setLastCheckTime(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setCloudStatus({
        connected: false,
        latencyMs: 0,
        tables: {},
        allTablesExist: false,
        buckets: [],
        error: 'ক্লাউড সংযোগ পরীক্ষায় ব্যর্থ হয়েছে।',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    setIsCloudConfigured(supabaseService.isAvailable());
    setLocalCounts(supabaseService.getLocalDataCounts());
    runHealthCheck();
  }, [runHealthCheck]);

  const handleSyncFromCloud = async () => {
    if (!supabaseService.isAvailable()) {
      onShowToast('ডাটাবেজ সংযোগ কনফিগার করা নেই।');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await storageService.syncFromCloud();
      if (res.success) {
        onRefreshLocalState();
        setLocalCounts(supabaseService.getLocalDataCounts());
        runHealthCheck();
        onShowToast(`ক্লাউড থেকে সফলভাবে ডাটা সিঙ্ক হয়েছে (${res.synced.length} টি মডিউল)!`);
      } else {
        onShowToast('ক্লাউড ডাটা সিঙ্ক সম্পন্ন হয়েছে। নতুন কোনো রিমোট পরিবর্তন নেই।');
      }
    } catch (e) {
      console.error(e);
      onShowToast('সিঙ্ক করার সময় সমস্যা দেখা দিয়েছে।');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMigrateToCloud = async () => {
    if (!supabaseService.isAvailable()) {
      onShowToast('মাইগ্রেশনের পূর্বে ডাটাবেজ ক্রেডেনশিয়াল যুক্ত করুন।');
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await supabaseService.migrateLocalData({
        config: storageService.getConfig(),
        designations: storageService.getDesignations(),
        members: storageService.getMembers(),
        activities: storageService.getActivities(),
        notices: storageService.getNotices(),
        gallery: storageService.getGalleryItems(),
        expenses: storageService.getExpenses(),
        messages: storageService.getContactMessages(),
        social: storageService.getSocialLinks(),
      });
      setMigrationResult(res);
      if (res.success) {
        onRefreshLocalState();
        runHealthCheck();
        setLocalCounts(supabaseService.getLocalDataCounts());
        onShowToast('লোকাল ডাটা সফলভাবে ক্লাউডে মাইগ্রেট ও ভেরিফাই হয়েছে!');
      } else {
        if (res.schemaNotInstalled) {
          onShowToast('Database schema is not installed yet. দয়া করে SQL স্ক্রিপ্ট রান করুন।');
        } else {
          onShowToast('মাইগ্রেশনের সময় কিছু ত্রুটি ঘটেছে। বিস্তারিত রিপোর্ট নিচে দেখুন।');
        }
      }
    } catch (e: any) {
      console.error(e);
      setMigrationResult({
        success: false,
        message: 'মাইগ্রেশন সম্পন্ন করা যায়নি।',
        errors: [e?.message || 'অপ্রত্যাশিত ত্রুটি'],
        debugDetails: [e?.stack || String(e)],
        counts: {
          config: 0,
          designations: 0,
          members: 0,
          activities: 0,
          notices: 0,
          gallery: 0,
          expenses: 0,
          messages: 0,
          social: 0,
        },
        summary: { successful: 0, failed: 1, skipped: 0, total: 1 },
        itemizedSummary: [],
        verifiedCounts: {},
      });
      onShowToast('মাইগ্রেশন সম্পন্ন করা যায়নি।');
    } finally {
      setIsMigrating(false);
    }
  };

  const copySqlSchemaCode = () => {
    navigator.clipboard?.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
    onShowToast('সম্পূর্ণ SQL কোড ক্লিপবোর্ডে কপি হয়েছে! ডাটাবেজ SQL Editor-এ পেস্ট করে রান করুন।');
  };

  const handleExportBackupJson = () => {
    backupService.exportFullBackup(true);
    onShowToast('সম্পূর্ণ ডাটাবেজ ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে।');
  };

  const isConnected = isCloudConfigured && (cloudStatus?.connected ?? false);

  return (
    <div className="space-y-4">
      {/* 1. ADMIN CLOUD STATUS PANEL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isCloudConfigured
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isConnected ? (
                <CloudCheck className="w-5 h-5 text-emerald-600" />
              ) : isCloudConfigured ? (
                <Cloud className="w-5 h-5 text-amber-600 animate-pulse" />
              ) : (
                <CloudOff className="w-5 h-5 text-rose-600" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#2D3630]">System Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isCheckingStatus
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : isConnected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isCloudConfigured
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {isCheckingStatus ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                      <span>Checking...</span>
                    </>
                  ) : isConnected ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Connected</span>
                    </>
                  ) : isCloudConfigured ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      <span>Connection Issue</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C665F] mt-1">
                <span className="flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>
                    Data Connection:{' '}
                    <strong className="text-[#2D3630]">
                      {isCloudConfigured ? 'সেন্ট্রাল ডাটাবেজ (Live Sync)' : 'লোকাল ক্যাশ'}
                    </strong>
                  </span>
                </span>

                {cloudStatus?.latencyMs !== undefined && cloudStatus.latencyMs > 0 && (
                  <span className="text-[11px] font-mono text-[#7A877E]">
                    ({cloudStatus.latencyMs}ms)
                  </span>
                )}

                {lastCheckTime && (
                  <span className="flex items-center gap-1 text-[11px] text-[#7A877E]">
                    <Clock className="w-3 h-3" />
                    <span>সর্বশেষ চেক: {lastCheckTime}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={isCheckingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EBE8E0] bg-[#F7F5F0] hover:bg-[#EBE8E0] text-xs font-semibold text-[#2D3630] transition-colors disabled:opacity-50"
              title="ক্লাউড সংযোগ পুনরায় টেস্ট করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin text-[#2D5A41]' : 'text-[#7A877E]'}`} />
              <span>{isCheckingStatus ? 'টেস্ট হচ্ছে...' : 'কানেকশন চেক'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EBE8E0] bg-white hover:bg-[#F7F5F0] text-xs font-semibold text-[#5C665F] transition-colors"
            >
              <span>{showDetails ? 'লুকান' : 'বিস্তারিত'}</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Detailed diagnostic dropdown */}
        {showDetails && (
          <div className="pt-3 border-t border-[#EBE8E0] text-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tables status */}
              <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-1.5">
                <div className="font-bold text-[#2D3630] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#2D5A41]" />
                    ডাটাবেজ টেবিল অবস্থা:
                  </span>
                  <span className="text-[10px] text-[#7A877E] font-mono">
                    {cloudStatus?.allTablesExist ? 'সকল টেবিল প্রস্তুত' : 'কিছু টেবিল অনুপস্থিত'}
                  </span>
                </div>
                {cloudStatus?.tables ? (
                  <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                    {Object.entries(cloudStatus.tables).map(([tbl, exists]) => (
                      <div key={tbl} className="flex items-center gap-1 text-[#2D3630]">
                        <span className={exists ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {exists ? '✓' : '✗'}
                        </span>
                        <span className="truncate">{tbl}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#7A877E]">কানেকশন টেস্ট সম্পন্ন করুন।</div>
                )}
              </div>

              {/* Storage Buckets status */}
              <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-1.5">
                <div className="font-bold text-[#2D3630] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#2D5A41]" />
                    স্টোরেজ বাকেট (Media Storage):
                  </span>
                  <span className="text-[10px] text-[#7A877E] font-mono">
                    {cloudStatus?.buckets?.length || 0} টি সক্রিয় বাকেট
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['branding', 'members', 'gallery', 'activities', 'notices', 'receipts'].map((b) => {
                    const isAvail = cloudStatus?.buckets?.includes(b);
                    return (
                      <span
                        key={b}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          isAvail
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-200/80 text-stone-700'
                        }`}
                      >
                        {b}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#5C665F] mt-1">
                  স্বয়ংক্রিয় ইমেজ কম্প্রেসন এবং সাইজ সুরক্ষা সক্রিয় (সর্বোচ্চ ৫-১০ মেগাবাইট)।
                </p>
              </div>
            </div>

            {/* If tables are missing, show quick schema copy guide */}
            {cloudStatus && !cloudStatus.allTablesExist && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-amber-950">
                        ক্লাউড ডাটাবেজে প্রয়োজনীয় টেবিল পাওয়া যায়নি:
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        ডাটাবেজ কনসোল SQL Editor-এ গিয়ে সম্পূর্ণ স্কিমা কোডটি রান করুন।
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowSqlGuide(!showSqlGuide)}
                      className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-100/60 hover:bg-amber-100 text-amber-900 font-medium text-[11px] transition-colors flex items-center gap-1"
                    >
                      <Code className="w-3 h-3" />
                      <span>{showSqlGuide ? 'SQL লুকান' : 'SQL কোড দেখুন'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={copySqlSchemaCode}
                      className="px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700 transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedSql ? '✓ সম্পূর্ণ SQL কপি হয়েছে!' : 'সম্পূর্ণ SQL কোড কপি'}</span>
                    </button>
                  </div>
                </div>

                {showSqlGuide && (
                  <div className="mt-2 pt-2 border-t border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-amber-900">
                      <span className="flex items-center gap-1 font-bold">
                        <Terminal className="w-3.5 h-3.5 text-amber-700" />
                        database_schema.sql (13 Tables + Storage + RLS)
                      </span>
                      <button
                        type="button"
                        onClick={copySqlSchemaCode}
                        className="text-amber-800 hover:text-amber-950 underline font-sans"
                      >
                        কপি করুন
                      </button>
                    </div>
                    <pre className="p-3 bg-stone-900 text-stone-100 rounded-lg text-[10px] font-mono max-h-52 overflow-y-auto whitespace-pre leading-relaxed select-all">
                      {SUPABASE_SCHEMA_SQL}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. DATA MANAGEMENT & BACKUP SYSTEM */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2D5A41]" />
              <h3 className="text-sm font-bold text-[#2D3630]">
                ডাটা ব্যাকআপ ও সিঙ্ক ব্যবস্থাপনা (Data Sync & Backup)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-[11px] font-bold">
                মোট {localCounts.total} টি রেকর্ড
              </span>
            </div>
            <p className="text-xs text-[#5C665F] mt-1">
              স্বাভাবিকভাবে সকল পরিবর্তন সেভ করার সাথে সাথে সরাসরি সেন্ট্রাল ডাটাবেজে স্থায়ীভাবে সংরক্ষিত হয়। যেকোনো সময় ব্যাকআপ ডাউনলোড বা রিস্টোর করতে পারেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-cloudsync-data-sync"
              type="button"
              onClick={handleSyncFromCloud}
              disabled={isSyncing || !isCloudConfigured}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2D5A41]/30 bg-white hover:bg-[#F7F5F0] text-xs font-semibold text-[#2D5A41] transition-colors disabled:opacity-50"
              title="সেন্ট্রাল ডাটাবেজ থেকে সর্বশেষ ডাটা রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2D5A41] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'Data Sync'}</span>
            </button>

            <button
              id="btn-cloudsync-export-backup"
              type="button"
              onClick={handleExportBackupJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#EBE8E0] bg-[#F7F5F0] hover:bg-[#EBE8E0] text-xs font-semibold text-[#2D3630] transition-colors"
              title="সম্পূর্ণ ব্যাকআপ JSON ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 text-[#2D5A41]" />
              <span>ব্যাকআপ ডাউনলোড</span>
            </button>

            <button
              id="btn-cloudsync-restore-backup"
              type="button"
              onClick={() => setShowRestoreModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-bold shadow-2xs transition-colors"
              title="JSON ফাইল থেকে ডাটাবেজ ব্যাকআপ রিস্টোর করুন"
            >
              <UploadCloud className="w-3.5 h-3.5 text-white" />
              <span>রিস্টোর ব্যাকআপ</span>
            </button>
          </div>
        </div>

        {/* Local Data Categories & Pre-migration Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Members (সদস্যবৃন্দ)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.members}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Activities (কার্যক্রম)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.activities}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Notices (বিজ্ঞপ্তি)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.notices}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Gallery (গ্যালারি)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.gallery}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Expenses (ব্যয় হিসাব)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.expenses}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">CMS (ওয়েব কন্টেন্ট)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.cms}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Inbox (বার্তা)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.inbox}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Designations (পদবী)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.designations}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Settings (সেটিংস)</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.settings}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col">
            <span className="text-[11px] font-semibold text-[#7A877E]">Social Links</span>
            <span className="text-base font-bold font-mono text-[#2D3630] mt-0.5">{localCounts.social}</span>
          </div>
        </div>

        {/* Post-Migration Report / Verified Status */}
        {migrationResult && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-4 ${
              migrationResult.success
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/70 border-rose-300 text-rose-950'
            }`}
          >
            {/* 1. Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                {migrationResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>
                  {migrationResult.success
                    ? 'Cloud migration completed.'
                    : migrationResult.schemaNotInstalled
                    ? 'Database schema is not installed yet.'
                    : 'মাইগ্রেশনে কিছু অসংগতি দেখা গেছে'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {migrationResult.success && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-bold">
                    Verified & Synced
                  </span>
                )}
                {migrationResult.schemaNotInstalled && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                    Schema Missing
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#4A554E]">
              {migrationResult.message ||
                (migrationResult.success
                  ? 'সকল ডাটা সফলভাবে ক্লাউডে আপলোড ও ভেরিফাই হয়েছে। ব্রাউজারের লোকাল ব্যাকআপ কোনোভাবেই মুছে ফেলা হয়নি।'
                  : 'কিছু টেবিল বা আরএলএস পলিসির কারণে সমস্যা হয়েছে।')}
            </p>

            {/* 2. Missing Schema Warning & Quick SQL Helper */}
            {migrationResult.schemaNotInstalled && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 space-y-2.5">
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-amber-900 block">
                      Database schema is not installed yet.
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      ডাটাবেজে প্রয়োজনীয় টেবিলগুলো (site_settings, members ইত্যাদি) পাওয়া যায়নি। দয়া করে নিচের SQL কোডটি কপি করে ডাটাবেজ SQL Editor-এ চালান।
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copySqlSchemaCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSql ? 'কপি হয়েছে!' : 'SQL কোড কপি করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSqlGuide((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-xs font-semibold text-amber-900 transition-colors"
                  >
                    <Code className="w-3.5 h-3.5 text-amber-700" />
                    <span>{showSqlGuide ? 'SQL লুকান' : 'SQL প্রিভিউ দেখুন'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-amber-900 hover:underline ml-auto font-medium"
                  >
                    <span>Database Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {showSqlGuide && (
                  <pre className="p-3 bg-stone-900 text-stone-100 rounded-lg text-[10px] font-mono max-h-48 overflow-y-auto whitespace-pre leading-relaxed select-all">
                    {SUPABASE_SCHEMA_SQL}
                  </pre>
                )}
              </div>
            )}

            {/* 3. Final Migration Summary Counters (Successful / Failed / Skipped) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex flex-col">
                <span className="text-[11px] font-semibold text-emerald-700">সফল (Successful)</span>
                <span className="text-lg font-bold font-mono text-emerald-800 mt-0.5">
                  {migrationResult.summary?.successful ?? 0}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl bg-white border flex flex-col ${
                  (migrationResult.summary?.failed ?? 0) > 0 ? 'border-rose-300' : 'border-stone-200'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold ${
                    (migrationResult.summary?.failed ?? 0) > 0 ? 'text-rose-700' : 'text-stone-500'
                  }`}
                >
                  ব্যর্থ (Failed)
                </span>
                <span
                  className={`text-lg font-bold font-mono mt-0.5 ${
                    (migrationResult.summary?.failed ?? 0) > 0 ? 'text-rose-800' : 'text-stone-700'
                  }`}
                >
                  {migrationResult.summary?.failed ?? 0}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex flex-col">
                <span className="text-[11px] font-semibold text-stone-600">স্কিপড (Skipped)</span>
                <span className="text-lg font-bold font-mono text-stone-700 mt-0.5">
                  {migrationResult.summary?.skipped ?? 0}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-[#EBE8E0] flex flex-col">
                <span className="text-[11px] font-semibold text-[#5C665F]">মোট (Total)</span>
                <span className="text-lg font-bold font-mono text-[#2D3630] mt-0.5">
                  {migrationResult.summary?.total ?? 0}
                </span>
              </div>
            </div>

            {/* 4. Itemized Breakdown Per Entity */}
            {migrationResult.itemizedSummary && migrationResult.itemizedSummary.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-stone-200/80">
                <span className="text-[11px] font-semibold text-[#4A554E] block mb-1">
                  মডিউলভিত্তিক মাইগ্রেশন ফলাফল (Itemized Breakdown):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {migrationResult.itemizedSummary.map((item) => (
                    <div
                      key={item.entity}
                      className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                        item.failed > 0
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : item.successful > 0
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <span className="truncate pr-2 font-medium">{item.label}</span>
                      <span className="font-mono font-bold shrink-0">
                        {item.successful}/{item.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Cloud Database Verified Counts */}
            {migrationResult.verifiedCounts && Object.keys(migrationResult.verifiedCounts).length > 0 && (
              <div className="pt-2 border-t border-emerald-300/60">
                <span className="text-[11px] font-semibold text-emerald-800 block mb-1">
                  ক্লাউড ডাটাবেজে সরাসরি ভেরিফাইড মোট রেকর্ড সংখ্যা:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px] text-emerald-900">
                  <div>কনফিগ: {migrationResult.verifiedCounts.config ?? '-'}</div>
                  <div>পদবী: {migrationResult.verifiedCounts.designations ?? '-'}</div>
                  <div>সদস্য: {migrationResult.verifiedCounts.members ?? '-'}</div>
                  <div>কার্যক্রম: {migrationResult.verifiedCounts.activities ?? '-'}</div>
                  <div>বিজ্ঞপ্তি: {migrationResult.verifiedCounts.notices ?? '-'}</div>
                  <div>গ্যালারি: {migrationResult.verifiedCounts.gallery ?? '-'}</div>
                  <div>ব্যয়: {migrationResult.verifiedCounts.expenses ?? '-'}</div>
                  <div>ইনবক্স: {migrationResult.verifiedCounts.messages ?? '-'}</div>
                  <div>সোশ্যাল: {migrationResult.verifiedCounts.social ?? '-'}</div>
                </div>
              </div>
            )}

            {/* 6. Developer & Debug Details (Actual Supabase Errors) */}
            {((migrationResult.errors && migrationResult.errors.length > 0) ||
              (migrationResult.debugDetails && migrationResult.debugDetails.length > 0)) && (
              <div className="pt-2 border-t border-stone-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800">
                    ত্রুটি ও ডেভেলপার ডিবাগ তথ্য ({migrationResult.errors?.length || 0} টি সমস্যা)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDebugDetails((v) => !v)}
                    className="text-[11px] font-semibold text-stone-700 hover:text-stone-900 underline flex items-center gap-1"
                  >
                    <span>{showDebugDetails ? 'লুকান' : 'সিস্টেম এরর লগ দেখুন'}</span>
                    {showDebugDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Primary Error Bullet Points */}
                <div className="text-[11px] text-rose-700 space-y-1">
                  {migrationResult.errors?.map((err, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>

                {/* Detailed Collapsible Log */}
                {showDebugDetails && (
                  <div className="mt-2 p-3 bg-stone-900 text-stone-100 rounded-lg text-[10px] font-mono max-h-60 overflow-y-auto space-y-1 select-all">
                    <div className="text-amber-400 font-bold mb-1">// System / Database Debug Trace:</div>
                    {migrationResult.debugDetails?.map((detail, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed text-stone-300">
                        {detail}
                      </div>
                    ))}
                    {migrationResult.errors?.map((err, idx) => (
                      <div key={`err-${idx}`} className="text-rose-300 whitespace-pre-wrap leading-relaxed">
                        [Database Error] {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restore Backup Modal */}
      <BackupRestoreModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onRestoreComplete={(report) => {
          onRefreshLocalState();
          runHealthCheck();
          setLocalCounts(supabaseService.getLocalDataCounts());
          onShowToast('ব্যাকআপ রিস্টোর সফলভাবে সম্পন্ন হয়েছে!');
        }}
      />
    </div>
  );
};
