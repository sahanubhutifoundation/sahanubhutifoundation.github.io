import { Language, FoundationConfig, ExpenseRecord } from '../types';

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
    activityId: exp.activityId || exp.activity_id || undefined,
    linkedActivityId: exp.linkedActivityId || exp.linked_activity_id || undefined,
    fundingSource: exp.fundingSource || exp.funding_source || 'foundation_fund',
    deductionMode: exp.deductionMode || exp.deduction_mode || 'deduct',
    createdAt: exp.createdAt || exp.created_at || new Date().toISOString(),
    updatedAt: exp.updatedAt || exp.updated_at || undefined,
  };
}

