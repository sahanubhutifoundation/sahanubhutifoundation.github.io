import { Language, FoundationConfig } from '../types';

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
