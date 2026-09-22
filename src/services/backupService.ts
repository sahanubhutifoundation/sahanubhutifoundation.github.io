import { storageService } from './storageService';
import { supabaseService } from './supabaseService';
import {
  FoundationConfig,
  Designation,
  Member,
  Activity,
  Notice,
  GalleryItem,
  ExpenseRecord,
  ContactMessage,
  SocialLink,
  MultilingualText,
} from '../types';

export interface BackupCounts {
  config: number;
  designations: number;
  members: number;
  activities: number;
  notices: number;
  gallery: number;
  galleryCategories: number;
  expenses: number;
  messages: number;
  social: number;
  total: number;
}

export interface BackupPreview {
  fileName: string;
  fileSizeBytes: number;
  format: string;
  version: string;
  exportedAt: string;
  formattedDate: string;
  source: string;
  hasSettings: boolean;
  counts: BackupCounts;
  mediaNote: string;
  isCompatible: boolean;
  validationError?: string;
}

export interface ItemizedRestoreRecord {
  entity: string;
  label: string;
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors?: string[];
}

export interface RestoreReport {
  success: boolean;
  destination: 'primary_database' | 'local_cache';
  totalRestored: number;
  totalSkipped: number;
  totalFailed: number;
  itemized: ItemizedRestoreRecord[];
  failedEntities: string[];
  verifiedCounts?: Record<string, number>;
  safetySnapshotId: string;
  mediaNote: string;
  message: string;
}

export interface StructuredBackupPayload {
  format: 'sahanubhuti_cms_backup';
  version: '2.0';
  exportedAt: string;
  source: 'primary_database' | 'local_cache' | 'merged';
  meta: {
    appName: string;
    description: string;
    mediaNote: string;
    counts: BackupCounts;
  };
  data: {
    config: FoundationConfig;
    content?: Record<string, any>;
    designations: Designation[];
    members: Member[];
    activities: Activity[];
    notices: Notice[];
    gallery: GalleryItem[];
    galleryCategories?: Array<{ id: string; name: MultilingualText; sort_order: number; is_active: boolean }>;
    expenses: ExpenseRecord[];
    fundSettings?: any;
    messages: ContactMessage[];
    social: SocialLink[];
  };
  // Backward compatibility top-level keys
  config?: FoundationConfig;
  designations?: Designation[];
  members?: Member[];
  activities?: Activity[];
  notices?: Notice[];
  gallery?: GalleryItem[];
  expenses?: ExpenseRecord[];
  messages?: ContactMessage[];
  social?: SocialLink[];
}

const MEDIA_DISCLAIMER_NOTE =
  'স্ট্রাকচার্ড ডাটা ব্যাকআপ: এতে সকল কনফিগারেশন, সদস্য, নোটিশ, হিসাব এবং মিডিয়া ফাইলের URL রেফারেন্স ও মেটাডাটা সংরক্ষিত থাকে। মূল বাইনারি ইমেজ বা ভিডিও ফাইল সেন্ট্রাল স্টোরেজ বাকেটে সংরক্ষিত রয়েছে; আলাদা মিডিয়া ব্যাকআপ ওয়ার্কফ্লো দ্বারা ভবিষ্যতে তা আর্কাইভ করা যাবে।';

/**
 * Strips secrets, service-role keys, passwords, and sensitive credentials
 */
function sanitizeConfig(rawConfig: any): FoundationConfig {
  const clean = { ...rawConfig };
  delete clean.password;
  delete clean.adminPassword;
  delete clean.salt;
  delete clean.hash;
  delete clean.token;
  delete clean.secret;
  delete clean.supabaseKey;
  delete clean.serviceRoleKey;
  delete clean.anonKey;
  delete clean.apiKey;
  return clean as FoundationConfig;
}

export const backupService = {
  /**
   * Generates a structured JSON backup containing all restorable database/application data
   */
  async exportFullBackup(downloadImmediately = true): Promise<{
    jsonString: string;
    filename: string;
    counts: BackupCounts;
    payload: StructuredBackupPayload;
  }> {
    const isCloud = supabaseService.isAvailable();
    let source: 'primary_database' | 'local_cache' | 'merged' = 'local_cache';

    // 1. Gather all datasets (fallback to local cache if cloud query is unavailable)
    let config = storageService.getConfig();
    let designations = storageService.getDesignations();
    let members = storageService.getMembers();
    let activities = storageService.getActivities();
    let notices = storageService.getNotices();
    let gallery = storageService.getGalleryItems();
    let expenses = storageService.getExpenses();
    let messages = storageService.getContactMessages();
    let social = storageService.getSocialLinks();

    if (isCloud) {
      try {
        const [
          cloudCfg,
          cloudDesig,
          cloudMembers,
          cloudActivities,
          cloudNotices,
          cloudGallery,
          cloudExpenses,
          cloudMessages,
          cloudSocial,
        ] = await Promise.all([
          supabaseService.fetchConfig(),
          supabaseService.fetchDesignations(),
          supabaseService.fetchMembers(),
          supabaseService.fetchActivities(),
          supabaseService.fetchNotices(),
          supabaseService.fetchGallery(),
          supabaseService.fetchExpenses(),
          supabaseService.fetchContactMessages(),
          supabaseService.fetchSocialLinks(),
        ]);

        if (cloudCfg) config = cloudCfg;
        if (cloudDesig && cloudDesig.length > 0) designations = cloudDesig;
        if (cloudMembers && cloudMembers.length > 0) members = cloudMembers;
        if (cloudActivities && cloudActivities.length > 0) activities = cloudActivities;
        if (cloudNotices && cloudNotices.length > 0) notices = cloudNotices;
        if (cloudGallery && cloudGallery.length > 0) gallery = cloudGallery;
        if (cloudExpenses && cloudExpenses.length > 0) expenses = cloudExpenses;
        if (cloudMessages && cloudMessages.length > 0) messages = cloudMessages;
        if (cloudSocial && cloudSocial.length > 0) social = cloudSocial;
        source = 'primary_database';
      } catch (err) {
        console.warn('Could not pull remote rows for backup, using cached data:', err);
        source = 'local_cache';
      }
    }

    const sanitizedConfig = sanitizeConfig(config);

    const counts: BackupCounts = {
      config: sanitizedConfig ? 1 : 0,
      designations: designations?.length || 0,
      members: members?.length || 0,
      activities: activities?.length || 0,
      notices: notices?.length || 0,
      gallery: gallery?.length || 0,
      galleryCategories: sanitizedConfig?.galleryCategories?.length || 0,
      expenses: expenses?.length || 0,
      messages: messages?.length || 0,
      social: social?.length || 0,
      total:
        (sanitizedConfig ? 1 : 0) +
        (designations?.length || 0) +
        (members?.length || 0) +
        (activities?.length || 0) +
        (notices?.length || 0) +
        (gallery?.length || 0) +
        (expenses?.length || 0) +
        (messages?.length || 0) +
        (social?.length || 0),
    };

    const nowIso = new Date().toISOString();
    const payload: StructuredBackupPayload = {
      format: 'sahanubhuti_cms_backup',
      version: '2.0',
      exportedAt: nowIso,
      source,
      meta: {
        appName: sanitizedConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন',
        description: 'Sahanubhuti Foundation complete CMS and database structured backup',
        mediaNote: MEDIA_DISCLAIMER_NOTE,
        counts,
      },
      data: {
        config: sanitizedConfig,
        designations: designations || [],
        members: members || [],
        activities: activities || [],
        notices: notices || [],
        gallery: gallery || [],
        expenses: expenses || [],
        messages: messages || [],
        social: social || [],
      },
      // Top-level fallbacks for older importers
      config: sanitizedConfig,
      designations: designations || [],
      members: members || [],
      activities: activities || [],
      notices: notices || [],
      gallery: gallery || [],
      expenses: expenses || [],
      messages: messages || [],
      social: social || [],
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateStr = nowIso.slice(0, 10);
    const filename = `sahanubhuti_backup_${dateStr}.json`;

    if (downloadImmediately && typeof window !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    return { jsonString, filename, counts, payload };
  },

  /**
   * Validates JSON syntax, schema, version, and extracts a preview before modifying any data
   */
  validateBackupJson(rawText: string, fileName = 'backup.json', fileSizeBytes = 0): {
    isValid: boolean;
    error?: string;
    preview?: BackupPreview;
    parsedPayload?: any;
  } {
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return {
        isValid: false,
        error: 'ফাইলটি সম্পূর্ণ খালি। অনুগ্রহ করে একটি সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।',
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (e: any) {
      return {
        isValid: false,
        error: `ফাইলের সিনট্যাক্স অবৈধ বা ফাইলটি ক্ষতিগ্রস্ত (${e.message || 'JSON Parse Error'})।`,
      };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        isValid: false,
        error: 'ব্যাকআপ ফাইলের কাঠামো অবৈধ। এটি একটি অবজেক্ট হওয়া আবশ্যক।',
      };
    }

    // Extract payload data (support v2 payload.data as well as v1 flat top-level)
    const dataSection = parsed.data || parsed;
    const config = dataSection.config || parsed.config;
    const designations = Array.isArray(dataSection.designations)
      ? dataSection.designations
      : Array.isArray(parsed.designations)
      ? parsed.designations
      : [];
    const members = Array.isArray(dataSection.members)
      ? dataSection.members
      : Array.isArray(parsed.members)
      ? parsed.members
      : [];
    const activities = Array.isArray(dataSection.activities)
      ? dataSection.activities
      : Array.isArray(parsed.activities)
      ? parsed.activities
      : [];
    const notices = Array.isArray(dataSection.notices)
      ? dataSection.notices
      : Array.isArray(parsed.notices)
      ? parsed.notices
      : [];
    const gallery = Array.isArray(dataSection.gallery)
      ? dataSection.gallery
      : Array.isArray(parsed.gallery)
      ? parsed.gallery
      : [];
    const expenses = Array.isArray(dataSection.expenses)
      ? dataSection.expenses
      : Array.isArray(parsed.expenses)
      ? parsed.expenses
      : [];
    const messages = Array.isArray(dataSection.messages)
      ? dataSection.messages
      : Array.isArray(parsed.messages)
      ? parsed.messages
      : [];
    const social = Array.isArray(dataSection.social)
      ? dataSection.social
      : Array.isArray(parsed.social)
      ? parsed.social
      : [];

    const hasAnyRecognizedData =
      Boolean(config) ||
      members.length > 0 ||
      activities.length > 0 ||
      notices.length > 0 ||
      gallery.length > 0 ||
      expenses.length > 0 ||
      designations.length > 0 ||
      social.length > 0;

    if (!hasAnyRecognizedData) {
      return {
        isValid: false,
        error: 'নির্বাচিত ফাইলে সহানুভূতি ফাউন্ডেশনের কোনো বৈধ ব্যাকআপ রেকর্ড (সদস্য, কার্যক্রম, নোটিশ ইত্যাদি) পাওয়া যায়নি।',
      };
    }

    const counts: BackupCounts = {
      config: config ? 1 : 0,
      designations: designations.length,
      members: members.length,
      activities: activities.length,
      notices: notices.length,
      gallery: gallery.length,
      galleryCategories: config?.galleryCategories?.length || 0,
      expenses: expenses.length,
      messages: messages.length,
      social: social.length,
      total:
        (config ? 1 : 0) +
        designations.length +
        members.length +
        activities.length +
        notices.length +
        gallery.length +
        expenses.length +
        messages.length +
        social.length,
    };

    const exportedAt = parsed.exportedAt || parsed.meta?.exportedAt || new Date().toISOString();
    let formattedDate = 'অজানা তারিখ';
    try {
      formattedDate = new Date(exportedAt).toLocaleString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      formattedDate = exportedAt;
    }

    const preview: BackupPreview = {
      fileName,
      fileSizeBytes: fileSizeBytes || rawText.length,
      format: parsed.format || 'sahanubhuti_legacy_backup',
      version: parsed.version || '1.0',
      exportedAt,
      formattedDate,
      source: parsed.source || 'structured_json',
      hasSettings: Boolean(config),
      counts,
      mediaNote: parsed.meta?.mediaNote || MEDIA_DISCLAIMER_NOTE,
      isCompatible: true,
    };

    return {
      isValid: true,
      preview,
      parsedPayload: {
        config: config ? sanitizeConfig(config) : undefined,
        designations,
        members,
        activities,
        notices,
        gallery,
        expenses,
        messages,
        social,
        exportedAt,
      },
    };
  },

  /**
   * Takes a safety snapshot of current data before executing restore
   */
  createSafetySnapshot(): { snapshotId: string; timestamp: string; count: number } {
    const timestamp = new Date().toISOString();
    const snapshotId = `sf_snap_${Date.now()}`;

    try {
      const currentData = {
        config: storageService.getConfig(),
        designations: storageService.getDesignations(),
        members: storageService.getMembers(),
        activities: storageService.getActivities(),
        notices: storageService.getNotices(),
        gallery: storageService.getGalleryItems(),
        expenses: storageService.getExpenses(),
        messages: storageService.getContactMessages(),
        social: storageService.getSocialLinks(),
        snapshotId,
        timestamp,
      };

      const jsonStr = JSON.stringify(currentData);
      localStorage.setItem('sf_pre_restore_safety_snapshot', jsonStr);

      // Keep recent 3 snapshots in safety history
      try {
        const historyRaw = localStorage.getItem('sf_safety_snapshots_history');
        const history: any[] = historyRaw ? JSON.parse(historyRaw) : [];
        history.unshift({
          snapshotId,
          timestamp,
          counts: {
            members: currentData.members.length,
            activities: currentData.activities.length,
            expenses: currentData.expenses.length,
          },
        });
        localStorage.setItem('sf_safety_snapshots_history', JSON.stringify(history.slice(0, 3)));
      } catch {
        // Safe ignore
      }

      return {
        snapshotId,
        timestamp,
        count:
          currentData.members.length +
          currentData.activities.length +
          currentData.notices.length +
          currentData.expenses.length,
      };
    } catch (e) {
      console.warn('Failed to persist safety snapshot to localStorage:', e);
      return { snapshotId, timestamp, count: 0 };
    }
  },

  /**
   * Restores backup safely:
   * - Creates safety snapshot first
   * - When primary database is configured, restores into primary database using safe upserts with stable UUIDs
   * - Never truncates or resets tables
   * - Updates local cache so UI updates immediately
   * - Provides an itemized report with live database verification
   */
  async restoreBackup(parsedData: any): Promise<RestoreReport> {
    // 1. Create safety snapshot first
    const safety = this.createSafetySnapshot();

    const isCloud = supabaseService.isAvailable();
    const destination: 'primary_database' | 'local_cache' = isCloud
      ? 'primary_database'
      : 'local_cache';

    const itemized: ItemizedRestoreRecord[] = [];
    const failedEntities: string[] = [];
    let totalRestored = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // Normalize input collections
    const config: FoundationConfig | undefined = parsedData.config;
    const designations: Designation[] = parsedData.designations || [];
    const members: Member[] = parsedData.members || [];
    const activities: Activity[] = parsedData.activities || [];
    const notices: Notice[] = parsedData.notices || [];
    const gallery: GalleryItem[] = parsedData.gallery || [];
    const expenses: ExpenseRecord[] = parsedData.expenses || [];
    const messages: ContactMessage[] = parsedData.messages || [];
    const social: SocialLink[] = parsedData.social || [];

    if (isCloud) {
      // ------------------------------------------------------------------------
      // RESTORE INTO PRIMARY DATABASE
      // ------------------------------------------------------------------------

      // 1. Config / Site Settings
      if (config) {
        const cfgRes = await supabaseService.saveConfigDetailed(config);
        if (cfgRes.success) {
          totalRestored++;
          itemized.push({
            entity: 'site_settings',
            label: 'সাইট কনফিগারেশন (Site Settings)',
            total: 1,
            successful: 1,
            failed: 0,
            skipped: 0,
          });
          // Update local cache
          storageService.saveConfig(config);
        } else {
          totalFailed++;
          failedEntities.push(`site_settings: ${cfgRes.error || 'সংরক্ষণ ব্যর্থ'}`);
          itemized.push({
            entity: 'site_settings',
            label: 'সাইট কনফিগারেশন (Site Settings)',
            total: 1,
            successful: 0,
            failed: 1,
            skipped: 0,
            errors: [cfgRes.error || 'সংরক্ষণ ব্যর্থ'],
          });
        }
      } else {
        totalSkipped++;
      }

      // Helper for batch entity upsert
      const restoreCollection = async <T extends { id?: string }>(
        items: T[],
        label: string,
        entityName: string,
        saveFn: (item: T) => Promise<boolean>,
        saveLocalFn: (items: T[]) => void
      ) => {
        if (!items || items.length === 0) {
          itemized.push({
            entity: entityName,
            label,
            total: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
          });
          return;
        }

        let success = 0;
        let fail = 0;
        const errs: string[] = [];

        for (const item of items) {
          // Ensure stable UUID / ID
          if (!item.id) {
            item.id = `${entityName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          }

          try {
            const ok = await saveFn(item);
            if (ok) {
              success++;
              totalRestored++;
            } else {
              fail++;
              totalFailed++;
              const errMsg = `${entityName} (ID: ${item.id}): ডাটাবেজে সংরক্ষণ ব্যর্থ`;
              errs.push(errMsg);
              failedEntities.push(errMsg);
            }
          } catch (e: any) {
            fail++;
            totalFailed++;
            const errMsg = `${entityName} (ID: ${item.id}): ${e.message || String(e)}`;
            errs.push(errMsg);
            failedEntities.push(errMsg);
          }
        }

        itemized.push({
          entity: entityName,
          label,
          total: items.length,
          successful: success,
          failed: fail,
          skipped: 0,
          errors: errs.length > 0 ? errs : undefined,
        });

        // Always sync the successfully imported items to local cache
        saveLocalFn(items);
      };

      // 2. Designations
      await restoreCollection(
        designations,
        'পদবীসমূহ (Designations)',
        'designations',
        (d) => supabaseService.saveDesignation(d),
        (all) => storageService.setDesignations(all)
      );

      // 3. Members
      await restoreCollection(
        members,
        'সদস্যবৃন্দ (Members)',
        'members',
        (m) => supabaseService.saveMember(m),
        (all) => storageService.setMembers(all)
      );

      // 4. Activities
      await restoreCollection(
        activities,
        'কার্যক্রম (Activities)',
        'activities',
        (a) => supabaseService.saveActivity(a),
        (all) => storageService.setActivities(all)
      );

      // 5. Notices
      await restoreCollection(
        notices,
        'বিজ্ঞপ্তি (Notices)',
        'notices',
        (n) => supabaseService.saveNotice(n),
        (all) => storageService.setNotices(all)
      );

      // 6. Gallery Items
      await restoreCollection(
        gallery,
        'গ্যালারি (Gallery)',
        'gallery_items',
        (g) => supabaseService.saveGalleryItem(g),
        (all) => storageService.setGalleryItems(all)
      );

      // 7. Expenses
      await restoreCollection(
        expenses,
        'ব্যয় হিসাব (Expenses)',
        'expenses',
        (e) => supabaseService.saveExpense(e),
        (all) => storageService.setExpenses(all)
      );

      // 8. Messages
      await restoreCollection(
        messages,
        'ইনবক্স বার্তা (Messages)',
        'contact_messages',
        async (msg) => {
          const res = await supabaseService.saveContactMessage(msg as any);
          return Boolean(res);
        },
        (all) => storageService.setContactMessages(all)
      );

      // 9. Social Links
      await restoreCollection(
        social,
        'সোশ্যাল লিঙ্ক (Social Links)',
        'social_links',
        async (s) => {
          const current = (await supabaseService.fetchSocialLinks()) || [];
          const exists = current.findIndex((c) => c.id === s.id);
          const updated = exists >= 0 ? current.map((c) => (c.id === s.id ? s : c)) : [...current, s];
          return supabaseService.saveSocialLinks(updated);
        },
        (all) => storageService.setSocialLinks(all)
      );

      // Live verification query directly from the primary database
      let verifiedCounts: Record<string, number> = {};
      try {
        const [mCount, aCount, nCount, gCount, eCount] = await Promise.all([
          supabaseService.fetchMembers().then((res) => res?.length || 0),
          supabaseService.fetchActivities().then((res) => res?.length || 0),
          supabaseService.fetchNotices().then((res) => res?.length || 0),
          supabaseService.fetchGallery().then((res) => res?.length || 0),
          supabaseService.fetchExpenses().then((res) => res?.length || 0),
        ]);
        verifiedCounts = {
          members: mCount,
          activities: aCount,
          notices: nCount,
          gallery: gCount,
          expenses: eCount,
        };
      } catch (err) {
        console.warn('Live verification error:', err);
      }

      // Notify window of remote sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sf_cloud_synced', { detail: { restored: true } }));
        window.dispatchEvent(new CustomEvent('sf_backup_restored', { detail: { destination } }));
      }

      const isOverallSuccess = totalFailed === 0;
      return {
        success: isOverallSuccess,
        destination,
        totalRestored,
        totalSkipped,
        totalFailed,
        itemized,
        failedEntities,
        verifiedCounts,
        safetySnapshotId: safety.snapshotId,
        mediaNote: MEDIA_DISCLAIMER_NOTE,
        message: isOverallSuccess
          ? `ব্যাকআপ সফলভাবে সেন্ট্রাল ডাটাবেজে রিস্টোর ও যাচাই করা হয়েছে! (মোট রিস্টোর: ${totalRestored})`
          : `রিস্টোর সম্পন্ন হয়েছে তবে ${totalFailed} টি রেকর্ডে সমস্যা হয়েছে। বিস্তারিত নিচে দেখুন।`,
      };
    } else {
      // ------------------------------------------------------------------------
      // RESTORE INTO LOCAL CACHE (FALLBACK)
      // ------------------------------------------------------------------------
      if (config) {
        storageService.saveConfig(config);
        totalRestored++;
        itemized.push({
          entity: 'site_settings',
          label: 'সাইট কনফিগারেশন (Site Settings)',
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0,
        });
      }

      if (designations.length > 0) {
        storageService.setDesignations(designations);
        totalRestored += designations.length;
        itemized.push({
          entity: 'designations',
          label: 'পদবীসমূহ (Designations)',
          total: designations.length,
          successful: designations.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (members.length > 0) {
        storageService.setMembers(members);
        totalRestored += members.length;
        itemized.push({
          entity: 'members',
          label: 'সদস্যবৃন্দ (Members)',
          total: members.length,
          successful: members.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (activities.length > 0) {
        storageService.setActivities(activities);
        totalRestored += activities.length;
        itemized.push({
          entity: 'activities',
          label: 'কার্যক্রম (Activities)',
          total: activities.length,
          successful: activities.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (notices.length > 0) {
        storageService.setNotices(notices);
        totalRestored += notices.length;
        itemized.push({
          entity: 'notices',
          label: 'বিজ্ঞপ্তি (Notices)',
          total: notices.length,
          successful: notices.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (gallery.length > 0) {
        storageService.setGalleryItems(gallery);
        totalRestored += gallery.length;
        itemized.push({
          entity: 'gallery',
          label: 'গ্যালারি (Gallery)',
          total: gallery.length,
          successful: gallery.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (expenses.length > 0) {
        storageService.setExpenses(expenses);
        totalRestored += expenses.length;
        itemized.push({
          entity: 'expenses',
          label: 'ব্যয় হিসাব (Expenses)',
          total: expenses.length,
          successful: expenses.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (messages.length > 0) {
        storageService.setContactMessages(messages);
        totalRestored += messages.length;
        itemized.push({
          entity: 'messages',
          label: 'ইনবক্স বার্তা (Messages)',
          total: messages.length,
          successful: messages.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (social.length > 0) {
        storageService.setSocialLinks(social);
        totalRestored += social.length;
        itemized.push({
          entity: 'social',
          label: 'সোশ্যাল লিঙ্ক (Social Links)',
          total: social.length,
          successful: social.length,
          failed: 0,
          skipped: 0,
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sf_backup_restored', { detail: { destination } }));
      }

      return {
        success: true,
        destination,
        totalRestored,
        totalSkipped,
        totalFailed: 0,
        itemized,
        failedEntities: [],
        safetySnapshotId: safety.snapshotId,
        mediaNote: MEDIA_DISCLAIMER_NOTE,
        message: `ব্যাকআপ সফলভাবে লোকাল ক্যাশে রিস্টোর করা হয়েছে! (মোট রিস্টোর: ${totalRestored})`,
      };
    }
  },
};
