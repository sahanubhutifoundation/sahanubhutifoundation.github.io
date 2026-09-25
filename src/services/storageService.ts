import {
  FoundationConfig,
  Activity,
  ActivityCategoryItem,
  Notice,
  Member,
  Designation,
  GalleryItem,
  ContactMessage,
  SocialLink,
  ExpenseRecord,
  FundVisibilitySettings,
} from '../types';
import {
  initialConfig,
  initialActivities,
  initialNotices,
  initialMembers,
  initialDesignations,
  initialGalleryItems,
  initialSocialLinks,
  initialExpenses,
} from '../data/initialData';
import { supabaseService, OperationResult } from './supabaseService';
import { normalizeExpense } from '../utils/foundationHelpers';

const KEYS = {
  CONFIG: 'sf_foundation_config',
  ACTIVITIES: 'sf_foundation_activities',
  ACTIVITY_CATEGORIES: 'sf_foundation_act_categories',
  NOTICES: 'sf_foundation_notices',
  MEMBERS: 'sf_foundation_members',
  DESIGNATIONS: 'sf_foundation_designations',
  GALLERY: 'sf_foundation_gallery',
  MESSAGES: 'sf_foundation_inbox',
  SOCIAL: 'sf_foundation_social',
  EXPENSES: 'sf_foundation_expenses',
};

// Helper for local storage access with safe error fallbacks
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    console.warn(`Storage reading error for key ${key}:`, e);
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Storage saving error for key ${key}:`, e);
  }
}

export const storageService = {
  // Configuration
  getConfig(): FoundationConfig {
    const saved = getLocalItem<FoundationConfig>(KEYS.CONFIG, initialConfig);
    // Sanitize any legacy cached text containing 1,200 medical assistance in aboutSpeech
    let cleanSpeech = saved.aboutSpeech || initialConfig.aboutSpeech;
    if (cleanSpeech) {
      cleanSpeech = {
        bn: (cleanSpeech.bn || '').replace(/\n\n?আমরা ইতিমধ্যে একটি উদ্যোগ নিয়ে তা সফলভাবে বাস্তবায়ন করেছি। আমাদের ফান্ড থেকে ১,২০০ টাকা ব্যয় করে একজন ব্যক্তিকে এক মাসের প্রয়োজনীয় ওষুধ কিনে দেওয়া হয়েছে।/g, ''),
        en: (cleanSpeech.en || '').replace(/\n\n?We have already successfully implemented an initiative: purchasing one month's necessary medicines for an individual by spending 1,200 Taka from our fund\./g, ''),
        ar: (cleanSpeech.ar || '').replace(/\n\n?لقد نفذنا بالفعل مبادرة ناجحة؛ حيث أنفقنا من صندوقنا مبلغ 1,200 تاكا لتوفير الأدوية الأساسية لمدة شهر كامل لشخص محتاج\./g, ''),
      };
    }

    return {
      ...initialConfig,
      ...saved,
      showHistoricalAssistanceOnAbout: false,
      aboutSpeech: cleanSpeech,
      heroBadge: {
        bn: saved.heroBadge?.bn || initialConfig.heroBadge?.bn || 'পারিবারিক একতা ও মানবিক দায়বদ্ধতা',
        en: saved.heroBadge?.en || initialConfig.heroBadge?.en || 'Family Unity and Humanitarian Responsibility',
        ar: saved.heroBadge?.ar || initialConfig.heroBadge?.ar || 'الوحدة العائلية والمسؤولية الإنسانية',
      },
      foundationLocation: {
        bn: saved.foundationLocation?.bn || initialConfig.foundationLocation?.bn || initialConfig.originLocation,
        en: saved.foundationLocation?.en || initialConfig.foundationLocation?.en || '',
        ar: saved.foundationLocation?.ar || initialConfig.foundationLocation?.ar || '',
      },
      showFoundingDate: saved.showFoundingDate !== false,
      locationDisplayMode: saved.locationDisplayMode || initialConfig.locationDisplayMode || 'text',
      locationMapUrl: saved.locationMapUrl || '',
      logoOverrides: {
        ...initialConfig.logoOverrides,
        ...(saved.logoOverrides || {}),
      },
      footerVisibility: {
        ...initialConfig.footerVisibility,
        ...(saved.footerVisibility || {}),
      },
      customTranslations: {
        ...(saved.customTranslations || {}),
      },
      fundVisibility: {
        ...initialConfig.fundVisibility,
        ...(saved.fundVisibility || {}),
      },
      expenseCategories: saved.expenseCategories && saved.expenseCategories.length > 0
        ? saved.expenseCategories
        : initialConfig.expenseCategories,
      openingExpenseBalance: typeof saved.openingExpenseBalance === 'number'
        ? saved.openingExpenseBalance
        : initialConfig.openingExpenseBalance,
      yearlyFundSources: Array.isArray(saved.yearlyFundSources) && saved.yearlyFundSources.length > 0
        ? saved.yearlyFundSources
        : initialConfig.yearlyFundSources,
    };
  },

  saveConfig(config: FoundationConfig): void {
    setLocalItem(KEYS.CONFIG, config);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_config_updated', { detail: config }));
    }
    // Asynchronously sync to Supabase Cloud if available
    if (supabaseService.isAvailable()) {
      supabaseService.saveConfig(config).catch((err) => {
        console.warn('Background Supabase config sync notice:', err);
      });
    }
  },

  // Fund Visibility Settings
  getFundVisibility(): FundVisibilitySettings {
    const cfg = this.getConfig();
    return cfg.fundVisibility;
  },

  saveFundVisibility(visibility: FundVisibilitySettings): FundVisibilitySettings {
    const cfg = this.getConfig();
    const updated = { ...cfg, fundVisibility: visibility };
    this.saveConfig(updated);
    return visibility;
  },

  // Activities & Categories
  getActivityCategories(): ActivityCategoryItem[] {
    const defaultCategories: ActivityCategoryItem[] = [
      {
        id: 'act-cat-med',
        name: { bn: 'ওষুধ ও চিকিৎসা', en: 'Medicine & Healthcare', ar: 'الأدوية والرعاية الصحية' },
        slug: 'medicine-healthcare',
        order: 1,
        isEnabled: true,
        color: '#2D5A41',
      },
      {
        id: 'act-cat-baytul-mal',
        name: { bn: 'বাইতুল মাল', en: 'Baytul Mal', ar: 'بيت المال' },
        slug: 'baytul-mal',
        order: 2,
        isEnabled: true,
        color: '#3B7A57',
      },
      {
        id: 'act-cat-relief',
        name: { bn: 'জরুরি মানবিক সহায়তা', en: 'Emergency Relief', ar: 'الإغاثة الإنسانية العاجلة' },
        slug: 'emergency-relief',
        order: 3,
        isEnabled: true,
        color: '#B45309',
      },
      {
        id: 'act-cat-family',
        name: { bn: 'পারিবারিক সমাবেশ ও উদ্যোগ', en: 'Family Welfare & Gathering', ar: 'اللقاءات والمبادرات العائلية' },
        slug: 'family-welfare',
        order: 4,
        isEnabled: true,
        color: '#4B5563',
      },
    ];

    const config = this.getConfig();
    if (config.activityCategoryList && config.activityCategoryList.length > 0) {
      return [...config.activityCategoryList].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    const local = getLocalItem<ActivityCategoryItem[]>(KEYS.ACTIVITY_CATEGORIES, []);
    if (local && local.length > 0) {
      return [...local].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    if (config.activityCategories && config.activityCategories.length > 0) {
      const generated = config.activityCategories.map((name, idx) => {
        const found = defaultCategories.find((d) => d.name.bn === name || d.name.en.toLowerCase() === name.toLowerCase());
        if (found) return { ...found, order: idx + 1 };
        return {
          id: `act-cat-${idx + 1}-${name.toLowerCase().replace(/[^a-z0-9]/gi, '')}`,
          name: { bn: name, en: name, ar: name },
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          order: idx + 1,
          isEnabled: true,
          color: '#2D5A41',
        };
      });
      return generated;
    }
    return defaultCategories;
  },

  saveActivityCategory(category: ActivityCategoryItem): ActivityCategoryItem[] {
    const categories = this.getActivityCategories();
    const existingIndex = categories.findIndex((c) => c.id === category.id || c.name.bn === category.name.bn);
    let updated: ActivityCategoryItem[];
    if (existingIndex >= 0) {
      updated = [...categories];
      updated[existingIndex] = { ...updated[existingIndex], ...category };
    } else {
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.order || 0), 0);
      const newCat = { ...category, order: category.order || maxOrder + 1 };
      updated = [...categories, newCat];
    }
    updated.sort((a, b) => (a.order || 0) - (b.order || 0));
    setLocalItem(KEYS.ACTIVITY_CATEGORIES, updated);

    // Sync to config
    const config = this.getConfig();
    const stringNames = updated.map((c) => c.name.bn);
    this.saveConfig({
      ...config,
      activityCategories: stringNames,
      activityCategoryList: updated,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_categories_updated', { detail: updated }));
    }
    return updated;
  },

  reorderActivityCategories(orderedIds: string[]): ActivityCategoryItem[] {
    const categories = this.getActivityCategories();
    const updated = categories.map((cat) => {
      const idx = orderedIds.indexOf(cat.id);
      return {
        ...cat,
        order: idx >= 0 ? idx + 1 : (cat.order || 99),
      };
    });
    updated.sort((a, b) => (a.order || 0) - (b.order || 0));
    setLocalItem(KEYS.ACTIVITY_CATEGORIES, updated);

    const config = this.getConfig();
    const stringNames = updated.map((c) => c.name.bn);
    this.saveConfig({
      ...config,
      activityCategories: stringNames,
      activityCategoryList: updated,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_categories_updated', { detail: updated }));
    }
    return updated;
  },

  deleteActivityCategory(
    catIdOrName: string,
    reassignToCat?: string
  ): { success: boolean; error?: string; updatedCategories: ActivityCategoryItem[] } {
    const categories = this.getActivityCategories();
    const target = categories.find((c) => c.id === catIdOrName || c.name.bn === catIdOrName);
    if (!target) {
      return { success: true, updatedCategories: categories };
    }

    const activities = this.getActivities();
    const matchedActivities = activities.filter(
      (a) => a.category === target.name.bn || a.category === target.id || a.category === target.name.en
    );

    if (matchedActivities.length > 0) {
      if (!reassignToCat || reassignToCat === target.name.bn || reassignToCat === target.id) {
        return {
          success: false,
          error: `এই বিভাগে ${matchedActivities.length} টি কার্যক্রম রয়েছে। মুছে ফেলার আগে কার্যক্রমগুলোকে অন্য কোনো বিভাগে স্থানান্তর করতে হবে।`,
          updatedCategories: categories,
        };
      }

      // Safe reassignment of affected activities
      const updatedActivities = activities.map((a) => {
        if (a.category === target.name.bn || a.category === target.id || a.category === target.name.en) {
          return { ...a, category: reassignToCat };
        }
        return a;
      });
      setLocalItem(KEYS.ACTIVITIES, updatedActivities);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
    }

    const updated = categories.filter((c) => c.id !== target.id && c.name.bn !== target.name.bn);
    setLocalItem(KEYS.ACTIVITY_CATEGORIES, updated);

    const config = this.getConfig();
    const stringNames = updated.map((c) => c.name.bn);
    this.saveConfig({
      ...config,
      activityCategories: stringNames,
      activityCategoryList: updated,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_categories_updated', { detail: updated }));
    }
    return { success: true, updatedCategories: updated };
  },

  getActivities(): Activity[] {
    const list = getLocalItem<Activity[]>(KEYS.ACTIVITIES, initialActivities);
    return list.map((act) => {
      if (act.description?.bn?.includes('১,২০০ টাকা')) {
        return {
          ...act,
          description: {
            bn: act.description.bn.replace('তহবিল থেকে ১,২০০ টাকা ব্যয় করে একজন অসুস্থ ও প্রয়োজনীয় ব্যক্তির এক মাসের জন্য অত্যাবশ্যকীয় ব্যবস্থাপত্র অনুযায়ী ওষুধ সরবরাহ করা হয়েছে।', 'একজন অসুস্থ ও প্রয়োজনীয় ব্যক্তির এক মাসের জন্য অত্যাবশ্যকীয় ব্যবস্থাপত্র অনুযায়ী জরুরি ওষুধ সহায়তা সফলভাবে সরবরাহ করা হয়েছে।'),
            en: act.description.en?.replace('1,200 BDT was disbursed from the fund to supply a full month of essential prescription medicines for an ailing individual in need.', 'essential prescription medicines were supplied for a full month to an ailing individual in need.') || '',
            ar: act.description.ar?.replace('تم صرف مبلغ 1,200 تاكا من رصيد الصندوق لتوفير الأدوية الأساسية لشخص مريض لمدة شهر كامل.', 'تم توفير الأدوية الأساسية لشخص مريض لمدة شهر كامل.') || '',
          },
        };
      }
      return act;
    });
  },

  saveActivity(activity: Activity): Activity[] {
    const list = this.getActivities();
    const existingIndex = list.findIndex((a) => String(a.id).trim() === String(activity.id).trim());
    
    // Strict separation: never copy fullDescription into shortSummary or vice versa
    const cleanedActivity: Activity = {
      ...activity,
      summary: activity.summary || activity.shortSummary || { bn: '', en: '', ar: '' },
      shortSummary: activity.shortSummary || activity.summary || { bn: '', en: '', ar: '' },
      description: activity.description || activity.fullDescription || { bn: '', en: '', ar: '' },
      fullDescription: activity.fullDescription || activity.description || { bn: '', en: '', ar: '' },
    };

    let updated: Activity[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = cleanedActivity;
    } else {
      updated = [cleanedActivity, ...list];
    }
    setLocalItem(KEYS.ACTIVITIES, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.saveActivity(cleanedActivity).catch(console.warn);
    }
    return updated;
  },

  deleteActivity(id: string): Activity[] {
    const list = this.getActivities().filter((a) => String(a.id).trim() !== String(id).trim());
    setLocalItem(KEYS.ACTIVITIES, list);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteActivity(id).catch(console.warn);
    }
    return list;
  },

  // Notices
  getNotices(): Notice[] {
    return getLocalItem<Notice[]>(KEYS.NOTICES, initialNotices);
  },

  saveNotice(notice: Notice): Notice[] {
    const list = this.getNotices();
    const existingIndex = list.findIndex((n) => String(n.id).trim() === String(notice.id).trim());
    let updated: Notice[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = notice;
    } else {
      updated = [notice, ...list];
    }
    setLocalItem(KEYS.NOTICES, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.saveNotice(notice).catch(console.warn);
    }
    return updated;
  },

  deleteNotice(id: string): Notice[] {
    const list = this.getNotices().filter((n) => String(n.id).trim() !== String(id).trim());
    setLocalItem(KEYS.NOTICES, list);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteNotice(id).catch(console.warn);
    }
    return list;
  },

  // Members & Deterministic Serial Ordering
  getMembers(): Member[] {
    const members = getLocalItem<Member[]>(KEYS.MEMBERS, initialMembers);
    return members.sort((a, b) => a.serial - b.serial);
  },

  saveMember(member: Member): Member[] {
    const members = this.getMembers();
    const existingIndex = members.findIndex((m) => String(m.id).trim() === String(member.id).trim());

    if (existingIndex >= 0) {
      // If updating serial
      const oldSerial = members[existingIndex].serial;
      if (oldSerial !== member.serial) {
        return this.reorderMember(member.id, member.serial, member);
      }
      members[existingIndex] = member;
      members.sort((a, b) => a.serial - b.serial);
      setLocalItem(KEYS.MEMBERS, members);
      if (supabaseService.isAvailable()) {
        supabaseService.saveMember(member).catch(console.warn);
      }
      return members;
    }

    // Adding new member: shift existing members at or above this serial
    const targetSerial = member.serial || members.length + 1;
    const adjustedMembers = members.map((m) => {
      if (m.serial >= targetSerial) {
        return { ...m, serial: m.serial + 1 };
      }
      return m;
    });

    const newMember = { ...member, serial: targetSerial };
    adjustedMembers.push(newMember);
    adjustedMembers.sort((a, b) => a.serial - b.serial);

    // Re-index to guarantee 1..N sequence without gaps
    const reindexed = adjustedMembers.map((m, idx) => ({ ...m, serial: idx + 1 }));
    setLocalItem(KEYS.MEMBERS, reindexed);
    if (supabaseService.isAvailable()) {
      // Persist the new member and re-sequenced items
      supabaseService.saveMember(newMember).catch(console.warn);
    }
    return reindexed;
  },

  reorderMember(memberId: string, newSerial: number, updatedData?: Member): Member[] {
    const members = this.getMembers();
    const targetMember = members.find((m) => String(m.id).trim() === String(memberId).trim());
    if (!targetMember) return members;

    // Filter out target member
    const otherMembers = members.filter((m) => String(m.id).trim() !== String(memberId).trim());
    const memberToInsert = updatedData ? { ...updatedData } : { ...targetMember };

    // Clamped serial index
    const clampedSerial = Math.max(1, Math.min(newSerial, otherMembers.length + 1));
    memberToInsert.serial = clampedSerial;

    // Insert into sorted position
    const result: Member[] = [];
    let inserted = false;

    for (let i = 0; i < otherMembers.length; i++) {
      if (i + 1 === clampedSerial && !inserted) {
        result.push(memberToInsert);
        inserted = true;
      }
      result.push(otherMembers[i]);
    }
    if (!inserted) {
      result.push(memberToInsert);
    }

    // Re-sequence 1..N cleanly
    const cleanList = result.map((m, idx) => ({ ...m, serial: idx + 1 }));
    setLocalItem(KEYS.MEMBERS, cleanList);
    if (supabaseService.isAvailable()) {
      cleanList.forEach((m) => supabaseService.saveMember(m).catch(console.warn));
    }
    return cleanList;
  },

  deleteMember(id: string): Member[] {
    const members = this.getMembers().filter((m) => String(m.id).trim() !== String(id).trim());
    // Re-index sequence cleanly
    const reindexed = members.map((m, idx) => ({ ...m, serial: idx + 1 }));
    setLocalItem(KEYS.MEMBERS, reindexed);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteMember(id).catch(console.warn);
    }
    return reindexed;
  },

  // Designations
  getDesignations(): Designation[] {
    const list = getLocalItem<Designation[]>(KEYS.DESIGNATIONS, initialDesignations);
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  saveDesignation(designation: Designation): Designation[] {
    const list = this.getDesignations();
    const existingIndex = list.findIndex((d) => String(d.id).trim() === String(designation.id).trim());
    let updated: Designation[];

    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = designation;
    } else {
      const targetOrder = designation.sortOrder || list.length + 1;
      const newDes = { ...designation, sortOrder: targetOrder };
      updated = [...list, newDes];
    }

    updated.sort((a, b) => a.sortOrder - b.sortOrder);
    // Ensure clean 1..N order
    const reordered = updated.map((d, idx) => ({ ...d, sortOrder: idx + 1 }));
    setLocalItem(KEYS.DESIGNATIONS, reordered);
    if (supabaseService.isAvailable()) {
      supabaseService.saveDesignation(designation).catch(console.warn);
    }
    return reordered;
  },

  deleteDesignation(id: string): { success: boolean; error?: string; list: Designation[] } {
    // Safety check: is any member currently using this designation?
    const members = this.getMembers();
    const target = this.getDesignations().find((d) => d.id === id);
    const inUse = members.some(
      (m) =>
        m.designationId === id ||
        (target && m.role && (m.role === target.name.bn || m.role === target.name.en || m.role === target.name.ar))
    );

    if (inUse) {
      return {
        success: false,
        error: 'এই পদবীটি বর্তমানে এক বা একাধিক সদস্যের প্রোফাইলে ব্যবহৃত হচ্ছে। পদবীটি মুছে ফেলার পূর্বে সংশ্লিষ্ট সদস্যদের পদবী পরিবর্তন করুন।',
        list: this.getDesignations(),
      };
    }

    const filtered = this.getDesignations().filter((d) => d.id !== id);
    const reordered = filtered.map((d, idx) => ({ ...d, sortOrder: idx + 1 }));
    setLocalItem(KEYS.DESIGNATIONS, reordered);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteDesignation(id).catch(console.warn);
    }
    return { success: true, list: reordered };
  },

  reorderDesignations(orderedIds: string[]): Designation[] {
    const list = this.getDesignations();
    const map = new Map<string, Designation>(list.map((d) => [d.id, d]));
    const result: Designation[] = [];

    orderedIds.forEach((id, idx) => {
      const item = map.get(id);
      if (item && typeof item === 'object') {
        result.push(Object.assign({}, item, { sortOrder: idx + 1 }));
        map.delete(id);
      }
    });

    // Add any remaining
    Array.from(map.values()).forEach((item) => {
      if (item && typeof item === 'object') {
        result.push(Object.assign({}, item, { sortOrder: result.length + 1 }));
      }
    });

    setLocalItem(KEYS.DESIGNATIONS, result);
    if (supabaseService.isAvailable()) {
      result.forEach((d) => supabaseService.saveDesignation(d).catch(console.warn));
    }
    return result;
  },

  // Gallery
  getGalleryItems(): GalleryItem[] {
    return getLocalItem<GalleryItem[]>(KEYS.GALLERY, initialGalleryItems);
  },

  saveGalleryItem(item: GalleryItem): GalleryItem[] {
    const list = this.getGalleryItems();
    const existingIndex = list.findIndex((g) => String(g.id).trim() === String(item.id).trim());
    let updated: GalleryItem[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...list];
    }
    setLocalItem(KEYS.GALLERY, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.saveGalleryItem(item).catch(console.warn);
    }
    return updated;
  },

  deleteGalleryItem(id: string): GalleryItem[] {
    const list = this.getGalleryItems().filter((g) => String(g.id).trim() !== String(id).trim());
    setLocalItem(KEYS.GALLERY, list);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteGalleryItem(id).catch(console.warn);
    }
    return list;
  },

  // Contact Messages & Inbox
  getContactMessages(): ContactMessage[] {
    return getLocalItem<ContactMessage[]>(KEYS.MESSAGES, []);
  },

  saveContactMessage(
    data: Omit<ContactMessage, 'id' | 'submittedAt' | 'isRead' | 'isArchived'>
  ): ContactMessage {
    const list = this.getContactMessages();
    const newMsg: ContactMessage = {
      ...data,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      submittedAt: new Date().toISOString(),
      isRead: false,
      isArchived: false,
    };
    const updated = [newMsg, ...list];
    setLocalItem(KEYS.MESSAGES, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.saveContactMessage(newMsg).catch(console.warn);
    }
    return newMsg;
  },

  updateMessageStatus(id: string, isRead?: boolean, isArchived?: boolean): ContactMessage[] {
    const list = this.getContactMessages();
    const updated = list.map((msg) => {
      if (String(msg.id).trim() === String(id).trim()) {
        return {
          ...msg,
          ...(isRead !== undefined ? { isRead } : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
        };
      }
      return msg;
    });
    setLocalItem(KEYS.MESSAGES, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.updateMessageStatus(id, isRead, isArchived).catch(console.warn);
    }
    return updated;
  },

  deleteContactMessage(id: string): ContactMessage[] {
    const list = this.getContactMessages().filter((m) => String(m.id).trim() !== String(id).trim());
    setLocalItem(KEYS.MESSAGES, list);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteContactMessage(id).catch(console.warn);
    }
    return list;
  },

  // Social Links
  getSocialLinks(): SocialLink[] {
    return getLocalItem<SocialLink[]>(KEYS.SOCIAL, initialSocialLinks);
  },

  saveSocialLinks(links: SocialLink[]): void {
    setLocalItem(KEYS.SOCIAL, links);
    if (supabaseService.isAvailable()) {
      supabaseService.saveSocialLinks(links).catch(console.warn);
    }
  },

  saveSocialLink(link: SocialLink): SocialLink[] {
    const list = this.getSocialLinks();
    const idx = list.findIndex((s) => String(s.id).trim() === String(link.id).trim());
    let updated: SocialLink[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = link;
    } else {
      updated = [...list, link];
    }
    setLocalItem(KEYS.SOCIAL, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.saveSocialLinks(updated).catch(console.warn);
    }
    return updated;
  },

  deleteSocialLink(id: string): SocialLink[] {
    const list = this.getSocialLinks().filter((s) => String(s.id).trim() !== String(id).trim());
    setLocalItem(KEYS.SOCIAL, list);
    if (supabaseService.isAvailable()) {
      supabaseService.saveSocialLinks(list).catch(console.warn);
    }
    return list;
  },

  // Humanitarian Assistance Expenses Ledger
  getExpenses(): ExpenseRecord[] {
    const list = getLocalItem<ExpenseRecord[]>(KEYS.EXPENSES, initialExpenses);
    return list
      .map((e) => normalizeExpense(e))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveExpense(expense: ExpenseRecord): ExpenseRecord[] {
    const normalized = normalizeExpense(expense);
    const list = this.getExpenses();
    const existingIndex = list.findIndex((e) => String(e.id).trim() === String(normalized.id).trim());
    let updated: ExpenseRecord[];
    const itemToSave: ExpenseRecord = existingIndex >= 0
      ? { ...normalized, updatedAt: new Date().toISOString() }
      : {
          ...normalized,
          id: normalized.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: normalized.createdAt || new Date().toISOString(),
        };

    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = itemToSave;
    } else {
      updated = [itemToSave, ...list];
    }
    setLocalItem(KEYS.EXPENSES, updated);
    if (supabaseService.isAvailable()) {
      supabaseService.saveExpense(itemToSave).catch(console.warn);
    }
    return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  deleteExpense(id: string): ExpenseRecord[] {
    const list = this.getExpenses().filter((e) => String(e.id).trim() !== String(id).trim());
    setLocalItem(KEYS.EXPENSES, list);
    if (supabaseService.isAvailable()) {
      supabaseService.deleteExpense(id).catch(console.warn);
    }
    return list;
  },

  // --------------------------------------------------------------------------
  // ASYNCHRONOUS PRIMARY PRODUCTION BACKEND PERSISTENCE (Requirement 1 & 2)
  // Direct save -> verify -> local cache update -> dispatch event
  // --------------------------------------------------------------------------

  async saveConfigAsync(config: FoundationConfig): Promise<OperationResult<FoundationConfig>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveConfigDetailed(config);
      if (res.success && res.data) {
        setLocalItem(KEYS.CONFIG, res.data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sf_config_updated', { detail: res.data }));
          window.dispatchEvent(new Event('sf_data_updated'));
        }
        return res;
      }
      return res;
    }

    setLocalItem(KEYS.CONFIG, config);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_config_updated', { detail: config }));
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: config };
  },

  async saveMemberAsync(member: Member): Promise<OperationResult<Member[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveMemberDetailed(member);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'সদস্য তথ্য সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      // Verified in database, now update local cache
      const updated = this.saveMember(res.data || member);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.saveMember(member);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async deleteMemberAsync(id: string): Promise<OperationResult<Member[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.deleteMemberDetailed(id);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'সদস্য সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.deleteMember(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.deleteMember(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async saveDesignationAsync(d: Designation): Promise<OperationResult<Designation[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveDesignationDetailed(d);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'পদবী সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.saveDesignation(res.data || d);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.saveDesignation(d);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async deleteDesignationAsync(id: string): Promise<OperationResult<Designation[]>> {
    // Safety validation
    const members = this.getMembers();
    const target = this.getDesignations().find((d) => d.id === id);
    const inUse = members.some(
      (m) =>
        m.designationId === id ||
        (target && m.role && (m.role === target.name.bn || m.role === target.name.en || m.role === target.name.ar))
    );

    if (inUse) {
      return {
        success: false,
        error: 'এই পদবীটি বর্তমানে এক বা একাধিক সদস্যের প্রোফাইলে ব্যবহৃত হচ্ছে। পদবীটি মুছে ফেলার পূর্বে সংশ্লিষ্ট সদস্যদের পদবী পরিবর্তন করুন।',
      };
    }

    if (supabaseService.isAvailable()) {
      const res = await supabaseService.deleteDesignationDetailed(id);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'পদবী সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
    }

    const res = this.deleteDesignation(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: res.list };
  },

  async saveActivityAsync(activity: Activity): Promise<OperationResult<Activity[]>> {
    const cleanedActivity: Activity = {
      ...activity,
      summary: activity.summary || activity.shortSummary || { bn: '', en: '', ar: '' },
      shortSummary: activity.shortSummary || activity.summary || { bn: '', en: '', ar: '' },
      description: activity.description || activity.fullDescription || { bn: '', en: '', ar: '' },
      fullDescription: activity.fullDescription || activity.description || { bn: '', en: '', ar: '' },
    };

    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveActivityDetailed(cleanedActivity);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'কার্যক্রম সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.saveActivity(res.data || cleanedActivity);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.saveActivity(cleanedActivity);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async deleteActivityAsync(id: string): Promise<OperationResult<Activity[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.deleteActivityDetailed(id);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'কার্যক্রম সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.deleteActivity(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.deleteActivity(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async saveNoticeAsync(notice: Notice): Promise<OperationResult<Notice[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveNoticeDetailed(notice);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'বিজ্ঞপ্তি সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.saveNotice(res.data || notice);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.saveNotice(notice);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async deleteNoticeAsync(id: string): Promise<OperationResult<Notice[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.deleteNoticeDetailed(id);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'বিজ্ঞপ্তি সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.deleteNotice(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.deleteNotice(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async saveGalleryItemAsync(item: GalleryItem): Promise<OperationResult<GalleryItem[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveGalleryItemDetailed(item);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'গ্যালারি আইটেম সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.saveGalleryItem(res.data || item);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.saveGalleryItem(item);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async deleteGalleryItemAsync(id: string): Promise<OperationResult<GalleryItem[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.deleteGalleryItemDetailed(id);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'গ্যালারি আইটেম সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.deleteGalleryItem(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.deleteGalleryItem(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async saveExpenseAsync(expense: ExpenseRecord): Promise<OperationResult<ExpenseRecord[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveExpenseDetailed(expense);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'ব্যয় হিসাব সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.saveExpense(res.data || expense);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.saveExpense(expense);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async deleteExpenseAsync(id: string): Promise<OperationResult<ExpenseRecord[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.deleteExpenseDetailed(id);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'ব্যয় হিসাব সেন্ট্রাল ডাটাবেজ থেকে মুছে ফেলা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      const updated = this.deleteExpense(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: updated };
    }

    const updated = this.deleteExpense(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: updated };
  },

  async saveSocialLinksAsync(links: SocialLink[]): Promise<OperationResult<SocialLink[]>> {
    if (supabaseService.isAvailable()) {
      const res = await supabaseService.saveSocialLinksDetailed(links);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'সোশ্যাল লিংক সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি।',
          code: res.code,
          details: res.details,
        };
      }
      this.saveSocialLinks(res.data || links);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sf_data_updated'));
      }
      return { success: true, data: res.data || links };
    }

    this.saveSocialLinks(links);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sf_data_updated'));
    }
    return { success: true, data: links };
  },

  // Bulk Local Setters for Restore Operations
  setDesignations(list: Designation[]): void {
    setLocalItem(KEYS.DESIGNATIONS, list);
  },
  setMembers(list: Member[]): void {
    setLocalItem(KEYS.MEMBERS, list);
  },
  setActivities(list: Activity[]): void {
    setLocalItem(KEYS.ACTIVITIES, list);
  },
  setNotices(list: Notice[]): void {
    setLocalItem(KEYS.NOTICES, list);
  },
  setGalleryItems(list: GalleryItem[]): void {
    setLocalItem(KEYS.GALLERY, list);
  },
  setExpenses(list: ExpenseRecord[]): void {
    const normalized = (list || []).map((e) => normalizeExpense(e));
    setLocalItem(KEYS.EXPENSES, normalized);
  },
  setContactMessages(list: ContactMessage[]): void {
    setLocalItem(KEYS.MESSAGES, list);
  },
  setSocialLinks(list: SocialLink[]): void {
    setLocalItem(KEYS.SOCIAL, list);
  },

  // Cloud Synchronization: Pulls authoritative cloud data into local cache
  async syncFromCloud(): Promise<{ success: boolean; synced: string[] }> {
    if (!supabaseService.isAvailable()) {
      return { success: false, synced: [] };
    }

    const synced: string[] = [];
    try {
      // 1. Config
      const cloudConfig = await supabaseService.fetchConfig();
      if (cloudConfig) {
        setLocalItem(KEYS.CONFIG, cloudConfig);
        synced.push('config');
      }

      // 2. Designations
      const cloudDesignations = await supabaseService.fetchDesignations();
      if (cloudDesignations && cloudDesignations.length > 0) {
        setLocalItem(KEYS.DESIGNATIONS, cloudDesignations);
        synced.push('designations');
      }

      // 3. Members
      const cloudMembers = await supabaseService.fetchMembers();
      if (cloudMembers && cloudMembers.length > 0) {
        setLocalItem(KEYS.MEMBERS, cloudMembers);
        synced.push('members');
      }

      // 4. Activities
      const cloudActivities = await supabaseService.fetchActivities();
      if (cloudActivities && cloudActivities.length > 0) {
        setLocalItem(KEYS.ACTIVITIES, cloudActivities);
        synced.push('activities');
      }

      // 5. Notices
      const cloudNotices = await supabaseService.fetchNotices();
      if (cloudNotices && cloudNotices.length > 0) {
        setLocalItem(KEYS.NOTICES, cloudNotices);
        synced.push('notices');
      }

      // 6. Gallery
      const cloudGallery = await supabaseService.fetchGallery();
      if (cloudGallery && cloudGallery.length > 0) {
        setLocalItem(KEYS.GALLERY, cloudGallery);
        synced.push('gallery');
      }

      // 7. Expenses
      const cloudExpenses = await supabaseService.fetchExpenses();
      if (cloudExpenses && cloudExpenses.length > 0) {
        setLocalItem(KEYS.EXPENSES, cloudExpenses.map((e) => normalizeExpense(e)));
        synced.push('expenses');
      }

      // 8. Contact Messages
      const cloudMessages = await supabaseService.fetchContactMessages();
      if (cloudMessages && cloudMessages.length > 0) {
        setLocalItem(KEYS.MESSAGES, cloudMessages);
        synced.push('messages');
      }

      // 9. Social Links
      const cloudSocial = await supabaseService.fetchSocialLinks();
      if (cloudSocial && cloudSocial.length > 0) {
        setLocalItem(KEYS.SOCIAL, cloudSocial);
        synced.push('social');
      }

      if (typeof window !== 'undefined' && synced.length > 0) {
        window.dispatchEvent(new CustomEvent('sf_cloud_synced', { detail: { synced } }));
        window.dispatchEvent(new Event('sf_data_updated'));
        if (cloudConfig) {
          window.dispatchEvent(new CustomEvent('sf_config_updated', { detail: cloudConfig }));
        }
      }

      return { success: synced.length > 0, synced };
    } catch (err) {
      console.warn('Sync from cloud notice:', err);
      return { success: false, synced };
    }
  },

  // Backup & Restore
  exportAllData(): string {
    const rawConfig = this.getConfig();
    const cleanConfig = { ...rawConfig };
    // Sanitize any secrets
    delete (cleanConfig as any).password;
    delete (cleanConfig as any).adminPassword;
    delete (cleanConfig as any).salt;
    delete (cleanConfig as any).hash;
    delete (cleanConfig as any).token;
    delete (cleanConfig as any).secret;
    delete (cleanConfig as any).supabaseKey;
    delete (cleanConfig as any).serviceRoleKey;
    delete (cleanConfig as any).anonKey;
    delete (cleanConfig as any).apiKey;

    const designations = this.getDesignations();
    const activities = this.getActivities();
    const notices = this.getNotices();
    const members = this.getMembers();
    const gallery = this.getGalleryItems();
    const social = this.getSocialLinks();
    const expenses = this.getExpenses();
    const messages = this.getContactMessages();
    const nowIso = new Date().toISOString();

    const counts = {
      config: cleanConfig ? 1 : 0,
      designations: designations.length,
      members: members.length,
      activities: activities.length,
      notices: notices.length,
      gallery: gallery.length,
      expenses: expenses.length,
      messages: messages.length,
      social: social.length,
      total:
        (cleanConfig ? 1 : 0) +
        designations.length +
        members.length +
        activities.length +
        notices.length +
        gallery.length +
        expenses.length +
        messages.length +
        social.length,
    };

    const data = {
      format: 'sahanubhuti_cms_backup',
      version: '2.0',
      exportedAt: nowIso,
      source: 'local_cache',
      meta: {
        appName: cleanConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন',
        description: 'Sahanubhuti Foundation complete CMS and database structured backup',
        mediaNote:
          'স্ট্রাকচার্ড ডাটা ব্যাকআপ: এতে সকল কনফিগারেশন, সদস্য, নোটিশ, হিসাব ও মিডিয়া URL সংরক্ষিত থাকে। মূল বাইনারি ইমেজ ফাইল সেন্ট্রাল স্টোরেজে আলাদা সংরক্ষিত থাকে।',
        counts,
      },
      data: {
        config: cleanConfig,
        designations,
        activities,
        notices,
        members,
        gallery,
        social,
        expenses,
        messages,
      },
      // Backward-compatibility flat keys
      config: cleanConfig,
      designations,
      activities,
      notices,
      members,
      gallery,
      social,
      expenses,
      messages,
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      if (data.config) setLocalItem(KEYS.CONFIG, data.config);
      if (data.designations) setLocalItem(KEYS.DESIGNATIONS, data.designations);
      if (data.activities) setLocalItem(KEYS.ACTIVITIES, data.activities);
      if (data.notices) setLocalItem(KEYS.NOTICES, data.notices);
      if (data.members) setLocalItem(KEYS.MEMBERS, data.members);
      if (data.gallery) setLocalItem(KEYS.GALLERY, data.gallery);
      if (data.social) setLocalItem(KEYS.SOCIAL, data.social);
      if (data.expenses) setLocalItem(KEYS.EXPENSES, data.expenses);
      if (data.messages) setLocalItem(KEYS.MESSAGES, data.messages);
      return true;
    } catch (e) {
      console.error('Failed to import backup data:', e);
      return false;
    }
  },
};

