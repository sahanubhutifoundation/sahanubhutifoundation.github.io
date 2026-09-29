import { Language, FoundationConfig, ExpenseRecord, MultilingualText } from '../types';

const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toBengaliDigits(val: string | number): string {
  return String(val).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

export function toArabicDigits(val: string | number): string {
  return String(val).replace(/[0-9]/g, (d) => arDigits[Number(d)]);
}

/**
 * Parses date string supporting both YYYY-MM-DD and DD/MM/YYYY
 */
export function parseDateComponents(dateStr?: string): { day: string; month: string; year: string } | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (ymd) {
    return {
      year: ymd[1],
      month: ymd[2].padStart(2, '0'),
      day: ymd[3].padStart(2, '0'),
    };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    return {
      day: dmy[1].padStart(2, '0'),
      month: dmy[2].padStart(2, '0'),
      year: dmy[3],
    };
  }

  return null;
}

/**
 * Returns canonical format YYYY-MM-DD for <input type="date">
 */
export function toCanonicalDateInput(dateStr?: string): string {
  const comp = parseDateComponents(dateStr);
  if (comp) {
    return `${comp.year}-${comp.month}-${comp.day}`;
  }
  return dateStr || '';
}

/**
 * Centralized formatting for foundation founding date across all views
 * Bangla: প্রতিষ্ঠা: ২৮/১১/২০২৪
 * English: Founded: 28/11/2024
 * Arabic: التأسيس: ٢٨/١١/٢٠٢٤
 */
export function formatFoundingDate(dateStr?: string, language: Language = 'bn'): string {
  if (!dateStr || !dateStr.trim()) return '';
  const comp = parseDateComponents(dateStr);

  if (comp) {
    const { day, month, year } = comp;
    if (language === 'bn') {
      return `প্রতিষ্ঠা: ${toBengaliDigits(day)}/${toBengaliDigits(month)}/${toBengaliDigits(year)}`;
    }
    if (language === 'ar') {
      return `التأسيس: ${toArabicDigits(day)}/${toArabicDigits(month)}/${toArabicDigits(year)}`;
    }
    return `Founded: ${day}/${month}/${year}`;
  }

  // Fallback for non-standard custom string
  const clean = dateStr.trim();
  if (language === 'bn') {
    return `প্রতিষ্ঠা: ${toBengaliDigits(clean)}`;
  }
  if (language === 'ar') {
    return `التأسيس: ${toArabicDigits(clean)}`;
  }
  return `Founded: ${clean}`;
}

/**
 * Resolves the localized foundation location from centralized config
 */
export function getFoundationLocation(
  config?: Partial<FoundationConfig> | null,
  language: Language = 'bn'
): string {
  if (!config) return '';

  if (config.foundationLocation) {
    const localized =
      config.foundationLocation[language] ||
      config.foundationLocation.bn ||
      config.foundationLocation.en;
    if (localized && localized.trim().length > 0) {
      return localized.trim();
    }
  }

  if (config.originLocation && config.originLocation.trim().length > 0) {
    return config.originLocation.trim();
  }

  // Default fallback
  if (language === 'en') {
    return 'Moulovi Bari, near Mohammad Ali Bazar, Sharshadi, Feni Sadar, Feni, Bangladesh';
  }
  if (language === 'ar') {
    return 'مولفي باري، بالقرب من سوق محمد علي، شارشادي، فيني سادار، فيني، بنغلاديش';
  }
  return 'মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের নিকটে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ';
}

/**
 * Validates whether map URL is a valid web link
 */
export function isMapUrlValid(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('maps.app.goo.gl')
  );
}

/**
 * Universal safe localization helper that guarantees a string output.
 * Never throws "Objects are not valid as a React child".
 * Safely extracts localized text from {bn, en, ar} objects, strings, numbers, or stringified JSON.
 */
export function getLocalizedValue(value: any, lang: Language = 'bn'): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    // Check if it is stringified JSON
    if (value.startsWith('{') && value.endsWith('}')) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          return getLocalizedValue(parsed, lang);
        }
      } catch {
        // Not valid JSON, return as string
      }
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    // Multilingual record with language keys
    const preferred = value[lang] ?? value.bn ?? value.en ?? value.ar;
    if (preferred != null && typeof preferred !== 'object') {
      return String(preferred);
    }
    if (preferred && typeof preferred === 'object') {
      return getLocalizedValue(preferred, lang);
    }
    // Fallback: check any common text key
    for (const k of ['bn', 'en', 'ar', 'text', 'title', 'value', 'name', 'label', 'description']) {
      if (typeof value[k] === 'string' && value[k].trim()) {
        return value[k];
      }
    }
    return '';
  }
  return String(value);
}

/**
 * Normalizes any ExpenseRecord or raw database row so that all text fields
 * are guaranteed to be clean primitive strings, preventing React child object crashes.
 */
export function normalizeExpense(exp: any, lang: Language = 'bn'): ExpenseRecord {
  if (!exp || typeof exp !== 'object') {
    return {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      title: 'সহায়তা ব্যয়',
      category: 'other',
      createdAt: new Date().toISOString(),
    };
  }

  const rawTitle = exp.title ?? exp.purpose;
  const cleanTitle = getLocalizedValue(rawTitle, lang) || 'সহায়তা ব্যয়';
  const cleanDescription = exp.description ? getLocalizedValue(exp.description, lang) : undefined;
  const cleanLocation = exp.location ? getLocalizedValue(exp.location, lang) : undefined;
  const cleanRecipient = exp.recipient ? getLocalizedValue(exp.recipient, lang) : undefined;
  const cleanCustomCategory = exp.customCategory || exp.custom_category
    ? getLocalizedValue(exp.customCategory || exp.custom_category, lang)
    : undefined;

  const rawAmount = exp.amount;
  const numAmount =
    typeof rawAmount === 'number'
      ? rawAmount
      : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0;

  return {
    id: String(exp.id || `exp-${Date.now()}`),
    date: typeof exp.date === 'string' ? exp.date : (exp.date ? String(exp.date) : new Date().toISOString().split('T')[0]),
    amount: isNaN(numAmount) ? 0 : numAmount,
    title: cleanTitle,
    category: typeof exp.category === 'string' ? exp.category : 'other',
    customCategory: cleanCustomCategory,
    description: cleanDescription,
    recipient: cleanRecipient,
    isRecipientPublic: Boolean(exp.isRecipientPublic ?? exp.is_recipient_public),
    location: cleanLocation,
    receiptUrl: exp.receiptUrl || exp.receipt_url || undefined,
    isVerified: Boolean(exp.isVerified ?? exp.is_verified ?? exp.verified_by),
    year: exp.year != null ? String(exp.year) : undefined,
    isPublic: exp.isPublic !== false && exp.is_public !== false,
    activityId: exp.activityId || exp.activity_id || exp.linkedActivityId || exp.linked_activity_id || undefined,
    linkedActivityId: exp.activityId || exp.activity_id || exp.linkedActivityId || exp.linked_activity_id || undefined,
    fundingSource: exp.fundingSource || exp.funding_source || 'foundation_fund',
    deductionMode: exp.deductionMode || exp.deduction_mode || 'deduct',
    createdAt: exp.createdAt || exp.created_at || new Date().toISOString(),
    updatedAt: exp.updatedAt || exp.updated_at || undefined,
  };
}

/**
 * Public multilingual resolver for Members:
 * Selected language -> English fallback if available -> Bangla fallback if available
 */
export function resolveMemberField(
  val?: string | MultilingualText,
  bnVal?: string,
  enVal?: string,
  arVal?: string,
  lang: string = 'bn'
): string {
  const objBn = typeof val === 'object' && val !== null ? val.bn : undefined;
  const objEn = typeof val === 'object' && val !== null ? val.en : undefined;
  const objAr = typeof val === 'object' && val !== null ? val.ar : undefined;

  const actualBn = (bnVal && bnVal.trim()) || (objBn && objBn.trim()) || (typeof val === 'string' ? val.trim() : '');
  const actualEn = (enVal && enVal.trim()) || (objEn && objEn.trim()) || '';
  const actualAr = (arVal && arVal.trim()) || (objAr && objAr.trim()) || '';

  if (lang === 'ar') {
    return actualAr || actualEn || actualBn;
  }
  if (lang === 'en') {
    return actualEn || actualBn;
  }
  return actualBn || actualEn || actualAr;
}

/**
 * Public multilingual resolver for Activity Categories:
 * Selected language -> English fallback if available -> Bangla fallback if available
 */
export function resolveCategoryLabel(
  catName?: string | MultilingualText,
  categories?: any[],
  lang: string = 'bn'
): string {
  if (!catName) return '';
  const l = (lang || 'bn') as 'bn' | 'en' | 'ar';
  if (typeof catName === 'object') {
    if (l === 'ar') return catName.ar || catName.en || catName.bn || '';
    if (l === 'en') return catName.en || catName.bn || '';
    return catName.bn || catName.en || '';
  }
  if (Array.isArray(categories)) {
    const found = categories.find(
      (c) => c.name?.bn === catName || c.id === catName || c.name?.en === catName || c.name?.ar === catName
    );
    if (found?.name) {
      if (l === 'ar') return found.name.ar || found.name.en || found.name.bn || catName;
      if (l === 'en') return found.name.en || found.name.bn || catName;
      return found.name.bn || found.name.en || catName;
    }
  }

  // Built-in canonical category translations fallback
  const standardCategories: Record<string, { bn: string; en: string; ar: string }> = {
    'ওষুধ ও চিকিৎসা': { bn: 'ওষুধ ও চিকিৎসা', en: 'Medicine & Healthcare', ar: 'الأدوية والرعاية الصحية' },
    'বাইতুল মাল': { bn: 'বাইতুল মাল', en: 'Baitul Mal', ar: 'بيت المال' },
    'জরুরি মানবিক সহায়তা': { bn: 'জরুরি মানবিক সহায়তা', en: 'Emergency Relief', ar: 'الإغاثة الإنسانية العاجلة' },
    'পারিবারিক সমাবেশ': { bn: 'পারিবারিক সমাবেশ', en: 'Family Gathering', ar: 'التجمع العائلي' },
    'চিকিৎসা সহায়তা': { bn: 'চিকিৎসা সহায়তা', en: 'Medical Assistance', ar: 'المساعدات الطبية' },
    'ত্রাণ ও পুনর্বাসন': { bn: 'ত্রাণ ও পুনর্বাসন', en: 'Relief & Rehabilitation', ar: 'الإغاثة وإعادة التأهيل' },
    'শিক্ষা সহায়তা': { bn: 'শিক্ষা সহায়তা', en: 'Education Support', ar: 'دعم التعليم' },
    'সাধারণ কার্যক্রম': { bn: 'সাধারণ কার্যক্রম', en: 'General Activities', ar: 'أنشطة عامة' },
  };

  if (standardCategories[catName]) {
    const mapped = standardCategories[catName];
    if (l === 'ar') return mapped.ar || mapped.en || mapped.bn;
    if (l === 'en') return mapped.en || mapped.bn;
    return mapped.bn;
  }

  return catName;
}

/**
 * Public multilingual resolver for Activity Badges (e.g. editorial badges):
 * Supports 'খরচ সংক্রান্ত অবগতি' -> 'إشعار بالمصروفات والإفصاح المالي' (AR) / 'Expense Notice & Disclosure' (EN)
 */
export function resolveBadgeLabel(
  badge?: string | MultilingualText,
  lang: string = 'bn'
): string {
  if (!badge) return '';
  const l = (lang || 'bn') as 'bn' | 'en' | 'ar';
  if (typeof badge === 'object') {
    if (l === 'ar') return badge.ar || badge.en || badge.bn || '';
    if (l === 'en') return badge.en || badge.bn || '';
    return badge.bn || badge.en || '';
  }

  const trimmed = badge.trim();
  if (trimmed === 'খরচ সংক্রান্ত অবগতি') {
    if (l === 'ar') return 'إشعار بالمصروفات والإفصاح المالي';
    if (l === 'en') return 'Expense Notice & Disclosure';
    return 'খরচ সংক্রান্ত অবগতি';
  }

  return trimmed;
}

/**
 * Multilingual resolver for Member fields:
 * Selected language -> English fallback -> Bangla fallback
 */
export function getMemberLocalizedField(
  member: any,
  field: 'name' | 'role' | 'location' | 'address' | 'bio' | 'responsibilities',
  lang: string = 'bn'
): string {
  if (!member) return '';
  const l = (lang || 'bn') as 'bn' | 'en' | 'ar';

  if (field === 'name') {
    if (l === 'ar' && member.nameAr?.trim()) return member.nameAr.trim();
    if (l === 'en' && member.nameEn?.trim()) return member.nameEn.trim();
    if (l === 'bn' && member.nameBn?.trim()) return member.nameBn.trim();
    if (member.nameMulti && typeof member.nameMulti === 'object') {
      const val = member.nameMulti[l] || (l === 'ar' ? member.nameMulti.en || member.nameMulti.bn : member.nameMulti.bn || member.nameMulti.en);
      if (val?.trim()) return val.trim();
    }
    if (l === 'ar') return member.nameAr?.trim() || member.nameEn?.trim() || member.nameBn?.trim() || member.name || '';
    if (l === 'en') return member.nameEn?.trim() || member.nameBn?.trim() || member.name || '';
    return member.nameBn?.trim() || member.name || '';
  }

  if (field === 'role') {
    if (l === 'ar' && member.roleAr?.trim()) return member.roleAr.trim();
    if (l === 'en' && member.roleEn?.trim()) return member.roleEn.trim();
    if (l === 'bn' && member.roleBn?.trim()) return member.roleBn.trim();
    if (member.roleMulti && typeof member.roleMulti === 'object') {
      const val = member.roleMulti[l] || (l === 'ar' ? member.roleMulti.en || member.roleMulti.bn : member.roleMulti.bn || member.roleMulti.en);
      if (val?.trim()) return val.trim();
    }
    if (l === 'ar') return member.roleAr?.trim() || member.roleEn?.trim() || member.roleBn?.trim() || member.role || '';
    if (l === 'en') return member.roleEn?.trim() || member.roleBn?.trim() || member.role || '';
    return member.roleBn?.trim() || member.role || '';
  }

  if (field === 'location' || field === 'address') {
    const arVal = member.addressAr || member.locationAr;
    const enVal = member.addressEn || member.locationEn;
    const bnVal = member.addressBn || member.locationBn;
    if (l === 'ar' && arVal?.trim()) return arVal.trim();
    if (l === 'en' && enVal?.trim()) return enVal.trim();
    if (l === 'bn' && bnVal?.trim()) return bnVal.trim();
    if (member.locationMulti && typeof member.locationMulti === 'object') {
      const val = member.locationMulti[l] || (l === 'ar' ? member.locationMulti.en || member.locationMulti.bn : member.locationMulti.bn || member.locationMulti.en);
      if (val?.trim()) return val.trim();
    }
    if (l === 'ar') return arVal?.trim() || enVal?.trim() || bnVal?.trim() || member.address || member.location || '';
    if (l === 'en') return enVal?.trim() || bnVal?.trim() || member.address || member.location || '';
    return bnVal?.trim() || member.address || member.location || '';
  }

  if (field === 'bio') {
    if (l === 'ar' && member.bioAr?.trim()) return member.bioAr.trim();
    if (l === 'en' && member.bioEn?.trim()) return member.bioEn.trim();
    if (l === 'bn' && member.bioBn?.trim()) return member.bioBn.trim();
    if (member.bioMulti && typeof member.bioMulti === 'object') {
      const val = member.bioMulti[l] || (l === 'ar' ? member.bioMulti.en || member.bioMulti.bn : member.bioMulti.bn || member.bioMulti.en);
      if (val?.trim()) return val.trim();
    }
    if (l === 'ar') return member.bioAr?.trim() || member.bioEn?.trim() || member.bioBn?.trim() || member.bio || '';
    if (l === 'en') return member.bioEn?.trim() || member.bioBn?.trim() || member.bio || '';
    return member.bioBn?.trim() || member.bio || '';
  }

  if (field === 'responsibilities') {
    if (l === 'ar' && member.responsibilitiesAr?.trim()) return member.responsibilitiesAr.trim();
    if (l === 'en' && member.responsibilitiesEn?.trim()) return member.responsibilitiesEn.trim();
    if (l === 'bn' && member.responsibilitiesBn?.trim()) return member.responsibilitiesBn.trim();
    if (member.responsibilitiesMulti && typeof member.responsibilitiesMulti === 'object') {
      const val = member.responsibilitiesMulti[l] || (l === 'ar' ? member.responsibilitiesMulti.en || member.responsibilitiesMulti.bn : member.responsibilitiesMulti.bn || member.responsibilitiesMulti.en);
      if (val?.trim()) return val.trim();
    }
    if (l === 'ar') return member.responsibilitiesAr?.trim() || member.responsibilitiesEn?.trim() || member.responsibilitiesBn?.trim() || member.responsibilities || '';
    if (l === 'en') return member.responsibilitiesEn?.trim() || member.responsibilitiesBn?.trim() || member.responsibilities || '';
    return member.responsibilitiesBn?.trim() || member.responsibilities || '';
  }

  return '';
}



