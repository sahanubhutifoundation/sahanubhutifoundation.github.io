import {
  FoundationConfig,
  Activity,
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

const KEYS = {
  CONFIG: 'sf_foundation_config',
  ACTIVITIES: 'sf_foundation_activities',
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
    };
  },

  saveConfig(config: FoundationConfig): void {
    setLocalItem(KEYS.CONFIG, config);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_config_updated', { detail: config }));
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

  // Activities
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
    let updated: Activity[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = activity;
    } else {
      updated = [activity, ...list];
    }
    setLocalItem(KEYS.ACTIVITIES, updated);
    return updated;
  },

  deleteActivity(id: string): Activity[] {
    const list = this.getActivities().filter((a) => String(a.id).trim() !== String(id).trim());
    setLocalItem(KEYS.ACTIVITIES, list);
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
    return updated;
  },

  deleteNotice(id: string): Notice[] {
    const list = this.getNotices().filter((n) => String(n.id).trim() !== String(id).trim());
    setLocalItem(KEYS.NOTICES, list);
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
    return cleanList;
  },

  deleteMember(id: string): Member[] {
    const members = this.getMembers().filter((m) => String(m.id).trim() !== String(id).trim());
    // Re-index sequence cleanly
    const reindexed = members.map((m, idx) => ({ ...m, serial: idx + 1 }));
    setLocalItem(KEYS.MEMBERS, reindexed);
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
    return updated;
  },

  deleteGalleryItem(id: string): GalleryItem[] {
    const list = this.getGalleryItems().filter((g) => String(g.id).trim() !== String(id).trim());
    setLocalItem(KEYS.GALLERY, list);
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
    return updated;
  },

  deleteContactMessage(id: string): ContactMessage[] {
    const list = this.getContactMessages().filter((m) => String(m.id).trim() !== String(id).trim());
    setLocalItem(KEYS.MESSAGES, list);
    return list;
  },

  // Social Links
  getSocialLinks(): SocialLink[] {
    return getLocalItem<SocialLink[]>(KEYS.SOCIAL, initialSocialLinks);
  },

  saveSocialLinks(links: SocialLink[]): void {
    setLocalItem(KEYS.SOCIAL, links);
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
    return updated;
  },

  deleteSocialLink(id: string): SocialLink[] {
    const list = this.getSocialLinks().filter((s) => String(s.id).trim() !== String(id).trim());
    setLocalItem(KEYS.SOCIAL, list);
    return list;
  },

  // Humanitarian Assistance Expenses Ledger
  getExpenses(): ExpenseRecord[] {
    const list = getLocalItem<ExpenseRecord[]>(KEYS.EXPENSES, initialExpenses);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveExpense(expense: ExpenseRecord): ExpenseRecord[] {
    const list = this.getExpenses();
    const existingIndex = list.findIndex((e) => String(e.id).trim() === String(expense.id).trim());
    let updated: ExpenseRecord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = {
        ...expense,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [
        {
          ...expense,
          id: expense.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: expense.createdAt || new Date().toISOString(),
        },
        ...list,
      ];
    }
    setLocalItem(KEYS.EXPENSES, updated);
    return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  deleteExpense(id: string): ExpenseRecord[] {
    const list = this.getExpenses().filter((e) => String(e.id).trim() !== String(id).trim());
    setLocalItem(KEYS.EXPENSES, list);
    return list;
  },

  // Backup & Restore
  exportAllData(): string {
    const data = {
      config: this.getConfig(),
      activities: this.getActivities(),
      notices: this.getNotices(),
      members: this.getMembers(),
      gallery: this.getGalleryItems(),
      social: this.getSocialLinks(),
      expenses: this.getExpenses(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.config) setLocalItem(KEYS.CONFIG, parsed.config);
      if (parsed.activities) setLocalItem(KEYS.ACTIVITIES, parsed.activities);
      if (parsed.notices) setLocalItem(KEYS.NOTICES, parsed.notices);
      if (parsed.members) setLocalItem(KEYS.MEMBERS, parsed.members);
      if (parsed.gallery) setLocalItem(KEYS.GALLERY, parsed.gallery);
      if (parsed.social) setLocalItem(KEYS.SOCIAL, parsed.social);
      if (parsed.expenses) setLocalItem(KEYS.EXPENSES, parsed.expenses);
      return true;
    } catch (e) {
      console.error('Failed to import backup data:', e);
      return false;
    }
  },
};

