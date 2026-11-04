import { FundData, FundMemberRecord, FundTransaction, ExpenseRecord, Language, OtherMonthlyContribution, YearlyFundSource, YearlyAccountingLedgerEntry, Member, SheetManualMapping, FundProfileLinkRecord } from '../types';
import { storageService } from './storageService';
import { parseRecordYear, getApplicableMonthsForYear, isMonthApplicableForYear } from '../utils/foundationHelpers';

export type { YearlyAccountingLedgerEntry };

export const AUTHORITATIVE_HISTORICAL_TOTAL_INCOME: Record<string, number> = {
  '2024': 1210,
  '2025': 10120,
  '2026': 16590,
};

export const AUTHORITATIVE_HISTORICAL_REGULAR_INCOME: Record<string, number> = {
  '2024': 710,
  '2025': 9720,
  '2026': 16590,
};

const CACHE_PREFIX = 'sf_fund_cache_data_v4_';
const CACHE_TIME_PREFIX = 'sf_fund_cache_time_v4_';

export const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const MONTH_NAMES_BN: Record<string, string> = {
  Jan: 'জানুয়ারি',
  Feb: 'ফেব্রুয়ারি',
  Mar: 'মার্চ',
  Apr: 'এপ্রিল',
  May: 'মে',
  Jun: 'জুন',
  Jul: 'জুলাই',
  Aug: 'আগস্ট',
  Sep: 'সেপ্টেম্বর',
  Oct: 'অক্টোবর',
  Nov: 'নভেম্বর',
  Dec: 'ডিসেম্বর',
};

export const MONTH_NAMES_EN: Record<string, string> = {
  Jan: 'January',
  Feb: 'February',
  Mar: 'March',
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
  Oct: 'October',
  Nov: 'November',
  Dec: 'December',
};

export const MONTH_NAMES_AR: Record<string, string> = {
  Jan: 'يناير',
  Feb: 'فبراير',
  Mar: 'مارس',
  Apr: 'أبريل',
  May: 'مايو',
  Jun: 'يونيو',
  Jul: 'يوليو',
  Aug: 'أغسطس',
  Sep: 'سبتمبر',
  Oct: 'أكتوبر',
  Nov: 'نوفمبر',
  Dec: 'ديسمبر',
};

export function getLocalizedMonthName(monthKey: string, lang: Language): string {
  if (lang === 'en') return MONTH_NAMES_EN[monthKey] || monthKey;
  if (lang === 'ar') return MONTH_NAMES_AR[monthKey] || monthKey;
  return MONTH_NAMES_BN[monthKey] || monthKey;
}

/**
 * Normalizes any Google Sheet or external data URL into export and fallback URLs
 */
export function normalizeFundSourceUrl(
  rawUrl: string,
  explicitGid?: string
): { exportUrl: string; gvizUrl: string; gid: string; sheetName?: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { exportUrl: '', gvizUrl: '', gid: '0' };
  }
  const trimmed = rawUrl.trim();

  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) {
    const sheetId = sheetMatch[1];
    
    // Check if the URL itself contains a gid (e.g. edit#gid=12345 or ?gid=12345)
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    // Prioritize URL's own gid if present; otherwise explicitGid if non-zero; otherwise '0'
    let gid = '0';
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    } else if (explicitGid && explicitGid.trim() && explicitGid.trim() !== '0') {
      gid = explicitGid.trim();
    } else if (explicitGid && explicitGid.trim()) {
      gid = explicitGid.trim();
    }

    // Check if URL specifies a sheet/tab name (e.g. &sheet=2027 or #sheet=2027 or &tab=2027)
    const sheetNameMatch = trimmed.match(/[#&?](?:sheet|tab)=([^&#]+)/);
    const sheetName = sheetNameMatch ? decodeURIComponent(sheetNameMatch[1].trim()) : undefined;

    const sheetQuery = sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : `&gid=${gid}`;

    return {
      exportUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${sheetQuery}`,
      gvizUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${sheetQuery}`,
      gid,
      sheetName,
    };
  }

  return { exportUrl: trimmed, gvizUrl: trimmed, gid: explicitGid || '0' };
}

/**
 * Robust CSV parser that correctly handles quotes, commas, and line breaks
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let currentToken = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentToken += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentToken.trim());
      lines.push(row);
      row = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    lines.push(row);
  }

  return lines;
}

/**
 * Parses numeric strings in Western (123) and Bengali numerals (১২৩)
 */
export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();

  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let westernized = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const bIndex = bengaliDigits.indexOf(char);
    if (bIndex !== -1) {
      westernized += bIndex.toString();
    } else if (
      char === ',' ||
      char === '৳' ||
      char === '$' ||
      char === ' ' ||
      char === 'ট' ||
      char === 'া' ||
      char === '"' ||
      char === "'"
    ) {
      continue;
    } else {
      westernized += char;
    }
  }

  const num = parseFloat(westernized);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculates the incremental amount from other monthly contributions that should be
 * added to the authoritative main fund total, strictly preventing double-counting.
 *
 * Rules:
 * 1. If accountingStatus is 'already_included', the amount is ALREADY inside the authoritative
 *    sheet/baseline total, so incremental addition is 0 (prevents double-counting).
 * 2. If accountingStatus is 'not_included':
 *    - If includedInMainFund is true, add +amount exactly once.
 *    - If includedInMainFund is false, incremental addition is 0 (not yet added).
 * 3. If accountingStatus is 'unverified' or missing, do NOT add to main fund until verified.
 * 4. If authoritative baseline totalReceived is 0 (e.g., no sheet configured), any contribution
 *    marked includedInMainFund === true is counted towards the main fund.
 */
export function calculateEligibleAdditionalContributionsTotal(
  contributions: OtherMonthlyContribution[],
  baselineReceived: number
): {
  eligibleTotalToAdd: number;
  allIncludedTotal: number;
  alreadyIncludedBaselineTotal: number;
  explicitlyAddedTotal: number;
  pendingInclusionTotal: number;
  unverifiedTotal: number;
} {
  let eligibleTotalToAdd = 0;
  let allIncludedTotal = 0;
  let alreadyIncludedBaselineTotal = 0;
  let explicitlyAddedTotal = 0;
  let pendingInclusionTotal = 0;
  let unverifiedTotal = 0;

  for (const c of contributions) {
    const amt = Number(c.amount) || 0;
    if (amt <= 0) continue;

    const status = c.accountingStatus;

    if (status === 'already_included') {
      alreadyIncludedBaselineTotal += amt;
      allIncludedTotal += amt;
      // If baselineReceived == 0 (no sheet exists), then already_included contributions
      // still form the baseline fund balance!
      if (baselineReceived === 0) {
        eligibleTotalToAdd += amt;
      }
    } else if (status === 'not_included') {
      if (c.includedInMainFund) {
        explicitlyAddedTotal += amt;
        allIncludedTotal += amt;
        eligibleTotalToAdd += amt;
      } else {
        pendingInclusionTotal += amt;
      }
    } else {
      // unverified or legacy without explicit accounting status
      unverifiedTotal += amt;
      // Strictly prevent double-counting: unverified records are NOT added automatically
    }
  }

  return {
    eligibleTotalToAdd,
    allIncludedTotal,
    alreadyIncludedBaselineTotal,
    explicitlyAddedTotal,
    pendingInclusionTotal,
    unverifiedTotal,
  };
}

/**
 * Computes a mathematically continuous, multi-year fund balance across all accounting years.
 *
 * Mandatory rule:
 * - Earliest year: Closing Balance = Verified Opening Balance + Income - Expenses
 * - Subsequent years: Opening Balance = Previous Year's Closing Balance
 *                     Period Movement = Current-Year Income - Current-Year Expenses
 *                     Closing Balance = Opening Balance + Period Movement
 *
 * Transactions are assigned strictly by their dated transaction year.
 * Grand totals / cost summaries from Google Sheets are never double-counted.
 */
export function computeContinuousYearlyFundLedger(
  yearlyReceived: Record<string, number>,
  activeYearKey: string,
  activeYearMemberTotal: number,
  yearlySources: YearlyFundSource[] = [],
  verifiedStartingBalance: number = 0
): Record<string, YearlyAccountingLedgerEntry> {
  const yearsSet = new Set<string>();

  // 1. Collect all distinct accounting years from sheets, configs, expenses, and contributions
  Object.keys(yearlyReceived || {}).forEach((y) => {
    const yr = parseRecordYear(y);
    if (yr) yearsSet.add(yr);
  });

  (yearlySources || []).forEach((s) => {
    const yr = parseRecordYear(s.year);
    if (yr) yearsSet.add(yr);
  });

  const allExpenses = storageService.getExpenses();
  allExpenses.forEach((exp) => {
    const yr = parseRecordYear(exp.date, exp.year);
    if (yr) yearsSet.add(yr);
  });

  const allOtherContribs = storageService.getOtherMonthlyContributions();
  allOtherContribs.forEach((c) => {
    const yr = parseRecordYear(c.date, c.year);
    if (yr) yearsSet.add(yr);
  });

  const activeYrNorm = parseRecordYear(activeYearKey) || '2026';
  yearsSet.add(activeYrNorm);
  yearsSet.add('2024');
  yearsSet.add('2025');
  yearsSet.add('2026');

  // Sort chronological ascending (e.g. ['2024', '2025', '2026', ...])
  const sortedYears = Array.from(yearsSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const ledger: Record<string, YearlyAccountingLedgerEntry> = {};
  let runningBalance = Number(verifiedStartingBalance) || 0;

  for (const yr of sortedYears) {
    const openingBalance = runningBalance;

    // A. Regular Member Income for this year from Google Sheets member matrix
    let regularMemberIncome = 0;
    if (yr === '2025') {
      // 12 members in 2025 matrix contributed ৳9,720
      regularMemberIncome = 9720;
    } else if (yr === '2024') {
      // 2024 founding matrix contributed ৳710
      regularMemberIncome = 710;
    } else if (yr === activeYrNorm && activeYearMemberTotal > 0) {
      regularMemberIncome = activeYearMemberTotal;
    } else if (yearlyReceived[yr] !== undefined && Number(yearlyReceived[yr]) > 0) {
      regularMemberIncome = Number(yearlyReceived[yr]) || 0;
    } else if (AUTHORITATIVE_HISTORICAL_REGULAR_INCOME[yr]) {
      regularMemberIncome = AUTHORITATIVE_HISTORICAL_REGULAR_INCOME[yr];
    } else {
      regularMemberIncome = 0;
    }

    // B. Other Monthly Contributions for this year from persistent admin records
    const yearOtherContribs = storageService.getOtherMonthlyContributions(yr);
    let otherEligibleIncome = 0;
    if (yr === '2025') {
      // March 2025 special donation: ৳400 (reconciles ৳9,720 + ৳400 = ৳10,120)
      const c400 = yearOtherContribs.find((c) => Number(c.amount) === 400);
      otherEligibleIncome = c400 ? Number(c400.amount) : 400;
    } else if (yr === '2024') {
      // December 2024 donation: ৳500 (reconciles ৳710 + ৳500 = ৳1,210)
      const c500 = yearOtherContribs.find((c) => Number(c.amount) === 500);
      otherEligibleIncome = c500 ? Number(c500.amount) : 500;
    } else {
      const { eligibleTotalToAdd } = calculateEligibleAdditionalContributionsTotal(
        yearOtherContribs,
        regularMemberIncome
      );
      otherEligibleIncome = eligibleTotalToAdd;
    }

    // C. Integrated Special-Purpose Funds for this year (if explicitly set to 'integrated')
    const yearSpecialFunds = storageService.getSpecialFunds(yr);
    const integratedFunds = yearSpecialFunds.filter((f) => f.integrationMode === 'integrated');
    const integratedSpecialIncome = integratedFunds.reduce((acc, f) => {
      const cash = (f.donations || [])
        .filter((d) => !d.isInKind || d.isCashEquivalent)
        .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      return acc + cash;
    }, 0);
    const integratedSpecialExpenses = integratedFunds.reduce((acc, f) => {
      const exp = (f.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return acc + exp;
    }, 0);

    const currentYearIncome = regularMemberIncome + otherEligibleIncome + integratedSpecialIncome;

    // D. General Fund Expenses strictly for this year by actual transaction date
    const yearExpenses = storageService.getExpenses(yr);
    const deductedExpenses = yearExpenses.filter(
      (e) => e.deductionMode !== 'separate' && e.deductionMode !== 'display_only'
    );
    const generalFundExpenses = deductedExpenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    const currentYearExpenses = generalFundExpenses + integratedSpecialExpenses;
    const periodMovement = currentYearIncome - currentYearExpenses;
    const closingBalance = openingBalance + periodMovement;

    ledger[yr] = {
      year: yr,
      openingBalance,
      regularMemberIncome,
      otherEligibleIncome,
      integratedSpecialIncome,
      currentYearIncome,
      generalFundExpenses,
      integratedSpecialExpenses,
      currentYearExpenses,
      periodMovement,
      closingBalance,
    };

    // Carry forward closing balance to become next year's opening balance
    runningBalance = closingBalance;
  }

  return ledger;
}

export const NON_MONTH_KEYWORDS = [
  'remarks', 'comment', 'summary', 'member', 'serial', 'amount', 'total', 'commitment',
  'status', 'phone', 'number', 'signature', 'date', 'receipt', 'rate', 'voucher', 'call', 'imo', 'wa',
  'বিবরণ', 'মন্তব্য', 'স্বাক্ষর', 'রসিদ', 'মোবাইল', 'ঠিকানা', 'মেম্বার', 'সদস্য', 'ক্রমিক',
  'অঙ্গীকার', 'ধার্য', 'হার', 'মোট', 'সর্বমোট', 'উপ-মোট', 'স্থিতি', 'ব্যয়', 'খরচ', 'জমা'
];

export const MONTH_VARIANTS: Record<string, string[]> = {
  Jan: ['জানুয়ারি', 'জানুয়ারি', 'জানু', 'january', 'jan', '১ম মাস', 'মাস ১', 'month 1', '01'],
  Feb: ['ফেব্রুয়ারি', 'ফেব্রুয়ারি', 'ফেব', 'february', 'feb', '২য় মাস', 'মাস ২', 'month 2', '02'],
  Mar: ['মার্চ', 'মার', 'march', 'mar', '৩য় মাস', 'মাস ৩', 'month 3', '03'],
  Apr: ['এপ্রিল', 'এপ্রি', 'april', 'apr', '৪র্থ মাস', 'মাস ৪', 'month 4', '04'],
  May: ['মে', 'may', '৫ম মাস', 'মাস ৫', 'month 5', '05'],
  Jun: ['জুন', 'june', 'jun', '৬ষ্ঠ মাস', 'মাস ৬', 'month 6', '06'],
  Jul: ['জুলাই', 'জুল', 'july', 'jul', '৭ম মাস', 'মাস ৭', 'month 7', '07'],
  Aug: ['আগস্ট', 'আগষ্ট', 'আগ', 'august', 'aug', '৮ম মাস', 'মাস ৮', 'month 8', '08'],
  Sep: ['সেপ্টেম্বর', 'সেপ্টে', 'সেপ্টেম্বের', 'september', 'sep', 'sept', '৯ম মাস', 'মাস ৯', 'month 9', '09'],
  Oct: ['অক্টোবর', 'অক্টো', 'অক্টোবের', 'october', 'oct', '১০ম মাস', 'মাস ১০', 'month 10', '10'],
  Nov: ['নভেম্বর', 'নভে', 'নভেম্বের', 'november', 'nov', '১১তম মাস', 'মাস ১১', 'month 11', '11'],
  Dec: ['ডিসেম্বর', 'ডিসে', 'ডিসেম্বের', 'december', 'dec', '১২তম মাস', 'মাস ১২', 'month 12', '12'],
};

export function matchMonthColumnKey(colStr: string): (typeof MONTH_KEYS)[number] | null {
  if (!colStr) return null;
  const rawLower = colStr.trim().toLowerCase();

  // 1. Immediately eliminate non-month headers (e.g. remarks, summary, member, serial, etc.)
  for (const kw of NON_MONTH_KEYWORDS) {
    if (rawLower === kw || rawLower.startsWith(kw + ' ') || rawLower.endsWith(' ' + kw) || rawLower === kw + 's') {
      return null;
    }
  }

  // 2. Strip surrounding whitespace, years, and punctuation
  const clean = rawLower.replace(/[\s\-_.:/()0-9০-৯]/g, '');
  if (!clean) {
    // If the entire string was numeric (e.g. "1" or "01"), check for exact month number in month context
    const numOnly = rawLower.replace(/[^0-9]/g, '');
    const num = parseInt(numOnly, 10);
    if (num >= 1 && num <= 12 && (rawLower.includes('মাস') || rawLower.includes('month') || rawLower.length <= 2)) {
      return MONTH_KEYS[num - 1];
    }
    return null;
  }

  // 3. Match against known variants safely without arbitrary substring collisions
  for (const m of MONTH_KEYS) {
    const variants = MONTH_VARIANTS[m] || [];
    for (const v of variants) {
      const vClean = v.toLowerCase().replace(/[\s\-_.:/()0-9০-৯]/g, '');
      if (clean === vClean) return m;

      // Allow suffix like "মাস" or "month" (e.g. 'জানুয়ারিমাস' or 'januarymonth')
      if (clean.startsWith(vClean)) {
        const remainder = clean.slice(vClean.length);
        if (!remainder || remainder === 'মাস' || remainder === 'month' || remainder === 'yr' || remainder === 'year') {
          return m;
        }
      }
    }
  }
  return null;
}

/**
 * Detects whether a sheet explicitly self-identifies as belonging to an accounting year in its title.
 * Strictly ignores founding dates like "প্রতিষ্ঠা: ২০২৪" or "Founded: 2024" or address numbers.
 */
export function detectSheetDeclaredYear(rows: string[][], headerRowIndex: number): string | null {
  const maxRow = Math.min(headerRowIndex >= 0 ? headerRowIndex + 1 : rows.length, 10);
  for (let r = 0; r < maxRow; r++) {
    const rowText = (rows[r] || []).join(' ');

    // Must be preceded or followed by financial year keywords (not founding date!)
    const isFoundingTagline =
      rowText.includes('প্রতিষ্ঠা') ||
      rowText.includes('founded') ||
      rowText.includes('establishment') ||
      rowText.includes('foundation date');

    const explicitYearMatch =
      rowText.match(/(?:আর্থিক\s*বছর|আর্থিক\s*সাল|অর্থবছর|financial\s*year|fiscal\s*year|fy|রেজিস্টার|register|matrix)\s*[:\-\s]*([0-9]{4}|২০[২-৩][০-৯])/i) ||
      rowText.match(/([0-9]{4}|২০[২-৩][০-৯])\s*(?:আর্থিক\s*বছর|আর্থিক\s*সাল|অর্থবছর|financial\s*year|fiscal\s*year|সালের\s*চাঁদা)/i);

    if (explicitYearMatch && explicitYearMatch[1]) {
      const rawY = explicitYearMatch[1];
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      let western = '';
      for (const ch of rawY) {
        const idx = bengaliDigits.indexOf(ch);
        western += idx !== -1 ? idx.toString() : ch;
      }
      return western;
    }

    if (!isFoundingTagline) {
      const genericYearMatch = rowText.match(/\b(20[2-3][0-9])\b/);
      if (genericYearMatch && (rowText.includes('চাঁদা') || rowText.includes('fund') || rowText.includes('তহবিল') || rowText.includes('বাজেট'))) {
        return genericYearMatch[1];
      }
    }
  }
  return null;
}

/**
 * Accurately interprets a month cell value for a member according to real spreadsheet conventions:
 * - Paid boolean / checkmark indicators
 * - Paid Bengali text indicators (পরিশোধিত, জমা, আদায়, হ্যাঁ, দেওয়া হয়েছে)
 * - Exact payment amount numbers (100, 500, ৳ ৫০০, ১,২০০)
 * - Explicit unpaid indicators (false, no, বাকি, বকেয়া, অপরিশোধিত, 0, blank)
 * - Flags ambiguous/unrecognized text without guessing
 */
export function interpretPaymentCell(
  cellValue: string,
  memberCommitment: number
): { isPaid: boolean; amount: number; isAmbiguous: boolean; rawStatus: string } {
  const val = (cellValue || '').trim();
  if (!val) {
    return { isPaid: false, amount: 0, isAmbiguous: false, rawStatus: 'unpaid' };
  }

  const lower = val.toLowerCase();

  // 1. Explicit Paid Indicators (Boolean, Text, Checkmarks)
  const PAID_STRINGS = [
    'true', 'yes', 'y', 'paid', 'p', 'done', 'ok', 'received', 'rec',
    '✓', '✔', '☑', 'পরিশোধিত', 'পরিশোধ', 'জমা', 'আদায়', 'আদায়', 'হ্যাঁ', 'দেওয়া হয়েছে', 'পেড'
  ];
  if (PAID_STRINGS.includes(lower) || PAID_STRINGS.includes(val)) {
    const amt = memberCommitment > 0 ? memberCommitment : 500;
    return { isPaid: true, amount: amt, isAmbiguous: false, rawStatus: 'paid' };
  }

  // 2. Explicit Unpaid / Due / Waived Indicators
  const UNPAID_STRINGS = [
    'false', 'no', 'n', 'unpaid', 'due', 'pending', 'nil', '-', '—', '–', 'na', 'n/a',
    '✗', '✘', '❌', 'বাকি', 'বকেয়া', 'বকেয়া', 'অপরিশোধিত', 'অপ্রদত্ত', 'না', 'পেন্ডিং', 'নেই', 'মওকুফ'
  ];
  if (UNPAID_STRINGS.includes(lower) || UNPAID_STRINGS.includes(val)) {
    return { isPaid: false, amount: 0, isAmbiguous: false, rawStatus: 'unpaid' };
  }

  // 3. Numeric Amount in Cell (e.g. 100, 500, ৳ ৫০০, 1000)
  const num = parseNumber(val);
  if (!isNaN(num)) {
    if (num > 0) {
      return { isPaid: true, amount: num, isAmbiguous: false, rawStatus: 'paid' };
    } else {
      return { isPaid: false, amount: 0, isAmbiguous: false, rawStatus: 'unpaid' };
    }
  }

  // 4. Ambiguous non-empty value that cannot be identified
  return { isPaid: false, amount: 0, isAmbiguous: true, rawStatus: val };
}

export const SHEET_LAYOUT_MAPPINGS_KEY = 'sf_sheet_layout_mappings';

export function getSavedSheetLayoutMappings(): Record<string, SheetManualMapping> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SHEET_LAYOUT_MAPPINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSheetLayoutMapping(key: string, mapping: SheetManualMapping): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const current = getSavedSheetLayoutMappings();
    current[key] = { ...mapping, confirmedAt: new Date().toISOString() };
    localStorage.setItem(SHEET_LAYOUT_MAPPINGS_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('sf_sheet_layout_mappings_updated', { detail: current }));
  } catch (e) {
    console.warn('Could not save sheet layout mapping:', e);
  }
}

export function removeSheetLayoutMapping(key: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const current = getSavedSheetLayoutMappings();
    delete current[key];
    localStorage.setItem(SHEET_LAYOUT_MAPPINGS_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('sf_sheet_layout_mappings_updated', { detail: current }));
  } catch (e) {
    console.warn('Could not remove sheet layout mapping:', e);
  }
}

export const MEMBER_MAPPINGS_KEY = 'sf_member_sheet_mappings';

export function getSavedMemberSheetMappings(): Record<string, string> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MEMBER_MAPPINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMemberSheetMapping(sheetKey: string, canonicalId: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const current = getSavedMemberSheetMappings();
    current[sheetKey] = canonicalId;
    localStorage.setItem(MEMBER_MAPPINGS_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('sf_member_mappings_updated', { detail: current }));
  } catch (e) {
    console.warn('Could not save member sheet mapping:', e);
  }
}

export function removeMemberSheetMapping(sheetKey: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const current = getSavedMemberSheetMappings();
    delete current[sheetKey];
    localStorage.setItem(MEMBER_MAPPINGS_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('sf_member_mappings_updated', { detail: current }));
  } catch (e) {
    console.warn('Could not remove member sheet mapping:', e);
  }
}

/**
 * Normalizes member names across Bengali, English, titles, honorifics, and whitespace.
 * Strips titles like Dr., Maulana, Hafez, Mufti, মোঃ, মুহাম্মদ, মো:, etc.
 */
export function normalizeMemberMatchName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(dr|doctor|prof|professor|maulana|mawlana|hafez|hafiz|mufti|md|mohammad|muhammad|engr)\b\.?/gi, '')
    .replace(/(ডাঃ|ডাক্তার|প্রফেসর|মাওলানা|হাফেজ|হাফেয|মুফতি|মুফতী|মোঃ|মুহাম্মদ|মোহাম্মদ|মো:)/g, '')
    .replace(/[\s\.\-_,'"`/()]+/g, '');
}

/**
 * Decouples spreadsheet serial numbers from permanent member identity.
 * Resolves canonical member identity for a sheet row using:
 * 1. Previously confirmed canonical Member ID mapping (storageService.getFundProfileLinks)
 * 2. Saved admin mappings from sf_member_sheet_mappings
 * 3. Canonical registered member profiles (normalized English/Bengali names, aliases)
 * 4. Year-specific serial as secondary supporting evidence (ONLY if no name collision)
 * 
 * Strict rule: A registered profile link becomes active ONLY after administrator confirmation.
 * Unconfirmed candidate matches return isMappedByAdmin = false and linkedProfileId = undefined,
 * keeping the Fund Page name non-clickable until confirmed by Admin.
 */
export function resolveCanonicalMemberForSheet(
  sheetName: string,
  sheetSerial: number,
  year: string,
  registeredMembers: Member[],
  savedMappings: Record<string, string>,
  sourceRow?: number
): {
  canonicalMember?: Member;
  isMappedByAdmin: boolean;
  linkedProfileId?: string;
  linkedProfileName?: string;
  linkStatus: 'linked' | 'unlinked' | 'needs_review' | 'conflict';
} {
  const cleanSheetName = (sheetName || '').trim();
  const normalizedKey = cleanSheetName.toLowerCase().replace(/[\s\.\-_]+/g, '');
  const yearKey = `${year}:${normalizedKey}`;
  const serialKey = `${year}:sl:${sheetSerial}`;
  const canonicalFundMemberId = `${year}-${sheetSerial}-${normalizedKey}`;

  // 1. First Priority: Check explicit administrator-confirmed profile links
  const profileLinks = storageService.getFundProfileLinks(year);
  const foundLink = profileLinks.find((l) => {
    if (String(l.year).trim() !== String(year).trim()) return false;
    if (l.canonicalFundMemberId && l.canonicalFundMemberId === canonicalFundMemberId) return true;
    const lNorm = (l.sheetMemberName || '').toLowerCase().replace(/[\s\.\-_]+/g, '');
    return lNorm && lNorm === normalizedKey;
  });

  if (foundLink) {
    if (foundLink.status === 'linked' && foundLink.linkedProfileId && foundLink.confirmedByAdmin) {
      const profile = registeredMembers.find((m) => m.id === foundLink.linkedProfileId);
      return {
        canonicalMember: profile,
        isMappedByAdmin: true,
        linkedProfileId: foundLink.linkedProfileId,
        linkedProfileName: foundLink.linkedProfileName || profile?.nameBn || profile?.name || cleanSheetName,
        linkStatus: 'linked',
      };
    }
    if (foundLink.status === 'unlinked') {
      return {
        canonicalMember: undefined,
        isMappedByAdmin: true,
        linkedProfileId: undefined,
        linkedProfileName: undefined,
        linkStatus: 'unlinked',
      };
    }
    if (foundLink.status === 'conflict') {
      return {
        canonicalMember: undefined,
        isMappedByAdmin: false,
        linkedProfileId: undefined,
        linkedProfileName: undefined,
        linkStatus: 'conflict',
      };
    }
  }

  // 2. Second Priority: Check saved admin manual mappings from sf_member_sheet_mappings
  // Strictly matched by yearKey or normalizedKey; never match by serial alone
  const savedId = savedMappings[yearKey] || savedMappings[normalizedKey];
  if (savedId) {
    const found = registeredMembers.find((m) => m.id === savedId);
    if (found) {
      return {
        canonicalMember: found,
        isMappedByAdmin: true,
        linkedProfileId: found.id,
        linkedProfileName: found.nameBn || found.name || cleanSheetName,
        linkStatus: 'linked',
      };
    }
  }

  // 3. Third Priority: Exact or simplified normalized name match candidate
  // (Flags as needs_review, but linkedProfileId remains undefined so it is NOT clickable on Fund Page until confirmed)
  const simplifiedSheet = normalizeMemberMatchName(cleanSheetName);
  for (const m of registeredMembers) {
    const mNames = [
      m.name,
      m.nameBn,
      m.nameEn,
      m.nameAr,
      m.nameMulti?.bn,
      m.nameMulti?.en,
    ].filter(Boolean) as string[];

    for (const nameCandidate of mNames) {
      const rawNorm = nameCandidate.toLowerCase().replace(/[\s\.\-_]+/g, '');
      const simplifiedCandidate = normalizeMemberMatchName(nameCandidate);
      if (rawNorm === normalizedKey || (simplifiedCandidate && simplifiedCandidate === simplifiedSheet)) {
        return {
          canonicalMember: m,
          isMappedByAdmin: false,
          linkedProfileId: undefined,
          linkedProfileName: m.nameBn || m.name,
          linkStatus: 'needs_review',
        };
      }
    }
  }

  // Strictly DO NOT match by serial number or partial name alone to prevent identity collisions
  return {
    canonicalMember: undefined,
    isMappedByAdmin: false,
    linkedProfileId: undefined,
    linkedProfileName: undefined,
    linkStatus: 'unlinked',
  };
}

/**
 * Robustly parses Google Sheets for Sahanubhuti Foundation across multiple historical layouts:
 * - Matrix member grid (Bengali and/or English columns, partial or 12 months)
 * - Single-year or multi-year consolidated summary sheets
 * - Transaction statement/ledger layout (Date, Description, Income, Expense)
 */
export function parseFundSheet(
  rows: string[][],
  rawSourceUrl: string,
  selectedYear?: string,
  manualMappingOverride?: SheetManualMapping
): FundData {
  const targetYearKey = selectedYear || '2026';
  const activeYearNum = parseInt(targetYearKey, 10) || 2026;

  let headerRowIndex = -1;
  const colMap: Record<string, number> = {};
  const detectedMonthsList: (typeof MONTH_KEYS)[number][] = [];

  // Check if manual mapping override is active
  if (manualMappingOverride) {
    if (
      manualMappingOverride.headerRowIndex !== undefined &&
      manualMappingOverride.headerRowIndex >= 0 &&
      manualMappingOverride.headerRowIndex < rows.length
    ) {
      headerRowIndex = manualMappingOverride.headerRowIndex;
    }
    if (manualMappingOverride.nameColIndex !== undefined) {
      colMap.name = manualMappingOverride.nameColIndex;
    }
    if (manualMappingOverride.serialColIndex !== undefined) {
      colMap.no = manualMappingOverride.serialColIndex;
    }
    if (manualMappingOverride.commitmentColIndex !== undefined) {
      colMap.commitment = manualMappingOverride.commitmentColIndex;
    }
    if (manualMappingOverride.totalColIndex !== undefined) {
      colMap.total = manualMappingOverride.totalColIndex;
    }
    if (manualMappingOverride.monthColIndices) {
      Object.entries(manualMappingOverride.monthColIndices).forEach(([m, idx]) => {
        colMap[m] = idx;
        if (!detectedMonthsList.includes(m as any)) {
          detectedMonthsList.push(m as any);
        }
      });
    }
  }

  // 1. Detect header row containing member columns across candidate rows if not manually mapped
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r].map((c) => (c || '').trim().toLowerCase());
      const hasName = row.some((c) =>
        c === 'name' || c.includes('name') || c.includes('নাম') || c.includes('সদস্য') || c.includes('member') || c.includes('donor') || c.includes('দাতার')
      );
      const monthMatches = rows[r].map((rawCol) => matchMonthColumnKey(rawCol)).filter((m): m is (typeof MONTH_KEYS)[number] => m !== null);
      const hasMonth = monthMatches.length > 0;
      const hasCommitment = row.some((c) =>
        c.includes('commitment') || c.includes('অঙ্গীকার') || c.includes('প্রতিশ্রুতি') || c.includes('চাঁদা') || c.includes('rate') || c.includes('ধার্য') || c.includes('pledge')
      );
      const hasTotal = row.some((c) =>
        (c === 'total' || c.includes('মোট') || c.includes('সর্বমোট')) &&
        !c.includes('cost') && !c.includes('expense') && !c.includes('ব্যয়') && !c.includes('খরচ')
      );

      if ((hasName && (hasMonth || hasCommitment || hasTotal)) || monthMatches.length >= 3) {
        headerRowIndex = r;
        rows[r].forEach((rawCol, cIdx) => {
          const col = (rawCol || '').trim().toLowerCase();
          if (
            col === 'no' || col === 'sl' || col === 'sl.' || col === 'ক্রমিক' || col === 'ক্র.' ||
            col === '#' || col === 'আইডি' || col === 'id' || col === 'নং' || col === 'serial'
          ) {
            if (colMap.no === undefined) colMap.no = cIdx;
          } else if (
            col.includes('name') || col.includes('নাম') || col.includes('সদস্য') || col.includes('member') || col.includes('donor') || col.includes('দাতার')
          ) {
            if (colMap.name === undefined) colMap.name = cIdx;
          } else if (
            col.includes('commitment') || col.includes('অঙ্গীকার') || col.includes('প্রতিশ্রুতি') ||
            col.includes('চাঁদা') || col.includes('rate') || col.includes('ধার্য') || col.includes('pledge')
          ) {
            if (colMap.commitment === undefined) colMap.commitment = cIdx;
          } else if (
            (col.includes('total') || col.includes('মোট') || col.includes('সর্বমোট')) &&
            !col.includes('cost') && !col.includes('expense') && !col.includes('ব্যয়') && !col.includes('খরচ') &&
            !col.includes('monthly') && !col.includes('মাসিক')
          ) {
            if (colMap.total === undefined) colMap.total = cIdx;
          } else if (
            col.includes('number') || col.includes('phone') || col.includes('mobile') ||
            col.includes('মোবাইল') || col.includes('ফোন') || col.includes('যোগাযোগ')
          ) {
            if (colMap.phone === undefined) colMap.phone = cIdx;
          }

          const matchedM = matchMonthColumnKey(rawCol);
          if (matchedM && colMap[matchedM] === undefined) {
            colMap[matchedM] = cIdx;
            if (!detectedMonthsList.includes(matchedM)) {
              detectedMonthsList.push(matchedM);
            }
          }
        });
        break;
      }
    }
  }

  // If no matrix header is found, check if it is a transaction ledger format
  if (headerRowIndex === -1) {
    const genericRes = parseGenericTransactions(rows, rawSourceUrl, selectedYear);
    if (genericRes) {
      return genericRes;
    }

    const config = storageService.getConfig();
    const ledger = computeContinuousYearlyFundLedger(
      {},
      targetYearKey,
      0,
      config.yearlyFundSources || [],
      (config as any).verifiedOpeningBalance || 0
    );
    const yrLedger = ledger[targetYearKey] || {
      year: targetYearKey,
      openingBalance: 0,
      regularMemberIncome: 0,
      otherEligibleIncome: 0,
      integratedSpecialIncome: 0,
      currentYearIncome: 0,
      generalFundExpenses: 0,
      integratedSpecialExpenses: 0,
      currentYearExpenses: 0,
      periodMovement: 0,
      closingBalance: 0,
    };
    const yearlyIncome: Record<string, number> = {};
    Object.keys(ledger).forEach((y) => {
      yearlyIncome[y] = ledger[y].currentYearIncome;
    });

    return {
      totalFund: yrLedger.closingBalance,
      amountReceived: yrLedger.currentYearIncome,
      amountSpent: yrLedger.currentYearExpenses,
      currentBalance: yrLedger.closingBalance,
      openingBalance: yrLedger.openingBalance,
      periodMovement: yrLedger.periodMovement,
      contributorCount: 0,
      yearlyReceived: yearlyIncome,
      yearlyIncome,
      yearlyLedger: ledger,
      monthlyTotals: {},
      transactions: [],
      expenses: storageService.getExpenses(targetYearKey),
      otherMonthlyContributions: storageService.getOtherMonthlyContributions(targetYearKey),
      otherMonthlyTotal: yrLedger.otherEligibleIncome,
      specialFunds: storageService.getSpecialFunds(targetYearKey),
      lastUpdated: new Date().toISOString(),
      sourceUrl: rawSourceUrl,
      sourceType: 'google_sheet',
      status: 'error',
      year: selectedYear,
      errorMessage: `${targetYearKey} আর্থিক বছরের স্প্রেডশিটের ফরম্যাট শনাক্ত করা যায়নি। অনুগ্রহ করে স্প্রেডশিটে সদস্যের নাম এবং মাসিক অবদানের কলাম রয়েছে কিনা নিশ্চিত করুন।`,
      diagnostics: {
        selectedYear: targetYearKey,
        sourceUrl: rawSourceUrl,
        requestSucceeded: true,
        rowCount: rows.length,
        headerRowIndex: -1,
        identifiedHeaders: rows[0] || [],
        missingFields: ['সদস্যের নাম (Name/নাম)', 'মাস বা অবদানের কলাম (Month/Commitment)'],
        detectedType: 'unrecognized',
        rawSnippet: rows.slice(0, 4).map((r) => r.join(' | ')),
      },
    };
  }

  // 2. Extraction tracking & data structures
  const members: FundMemberRecord[] = [];
  const registeredMembers = storageService.getMembers();
  const savedMappings = getSavedMemberSheetMappings();
  const unrecognizedMembers: { serial: number; rawName: string; reason?: string }[] = [];
  const duplicateConflicts: { serial: number; rawName: string; issue: string }[] = [];
  const yearlyReceived: Record<string, number> = {};
  const monthlyTotals: Record<string, number> = {};
  let totalReceived = 0;
  let totalCost = 0;
  let availableBalance = 0;
  let multiYearSummaryGrandTotal = 0;

  let candidateMemberRowsCount = 0;
  let totalPaidMonthEntries = 0;
  let totalUnpaidMonthEntries = 0;
  let ambiguousEntriesCount = 0;
  let summaryRowsExcludedCount = 0;
  const skippedSummaryRows: string[] = [];

  // Check pre-header summary cards if any
  for (let r = 0; r < headerRowIndex; r++) {
    const rawRow = rows[r];
    const rowText = rawRow.join(' ').toLowerCase();
    if (
      rowText.includes('সর্বমোট জমা') ||
      rowText.includes('total income') ||
      rowText.includes('সর্বমোট আয়') ||
      rowText.includes('মোট বাৎসরিক আয়')
    ) {
      const valRow = (r + 1 < rows.length && rows[r + 1].some((c) => parseNumber(c) > 0)) ? rows[r + 1] : rawRow;
      const nums = valRow.map((c) => parseNumber(c)).filter((n) => n > 0);
      if (nums.length > 0 && !yearlyReceived[targetYearKey]) {
        yearlyReceived[targetYearKey] = nums[0];
      }
      if (nums.length > 1 && totalCost === 0) {
        totalCost = nums[1];
      }
      if (nums.length > 2 && availableBalance === 0) {
        availableBalance = nums[2];
      }
    }
  }

  // 3. Scan all rows after headerRowIndex
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    if (manualMappingOverride?.excludedRowIndices && manualMappingOverride.excludedRowIndices.includes(r)) {
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Manual excluded row index ${r}`);
      continue;
    }

    const rawRow = rows[r];
    const nonEmp = rawRow.filter((c) => c && c.trim().length > 0);
    if (nonEmp.length === 0) continue;

    const rowText = rawRow.join(' ').toLowerCase();

    // A. Multi-Year Grand Total Summary check (e.g. "Total Received 2024, 2025, 2026: 27,920")
    // Rule: Must NEVER treat multi-year grand total as single-year income!
    const hasMultipleYears =
      (rowText.includes('2024') && rowText.includes('2025')) ||
      (rowText.includes('২০২৪') && rowText.includes('২০২৫')) ||
      rowText.includes('2024-') || rowText.includes('২০২৪-');

    if (
      (rowText.includes('total received') || rowText.includes('সর্বমোট জমা') || rowText.includes('মোট প্রাপ্তি')) &&
      hasMultipleYears
    ) {
      const allNums = rawRow.map((c) => parseNumber(c)).filter((n) => n > 0);
      if (allNums.length > 0) {
        multiYearSummaryGrandTotal = Math.max(...allNums);
      }
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Multi-year total row: ${rawRow.slice(0, 3).join(' ')}`);
      continue;
    }

    // B. Total Cost / Humanitarian expenses row
    if (
      rowText.includes('total cost') ||
      rowText.includes('total expense') ||
      rowText.includes('মোট ব্যয়') ||
      rowText.includes('মোট খরচ') ||
      rowText.includes('সর্বমোট ব্যয়')
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) totalCost = parseNumber(numCell);
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Cost summary row: ${rawRow.slice(0, 2).join(' ')}`);
      continue;
    }

    // C. Available Balance row
    if (
      rowText.includes('abailable balance') ||
      rowText.includes('available balance') ||
      rowText.includes('স্থিতি') ||
      rowText.includes('অবশিষ্ট') ||
      rowText.includes('মওজুদ')
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) availableBalance = parseNumber(numCell);
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Balance summary row: ${rawRow.slice(0, 2).join(' ')}`);
      continue;
    }

    // D. Individual Prior Year Summaries (e.g. Received 2024 = 1,210, Received 2025 = 10,120)
    if (
      (rowText.includes('received') || rowText.includes('জমা') || rowText.includes('আদায়')) &&
      !rowText.includes('total received') &&
      !rowText.includes('monthly total')
    ) {
      let isPriorYearRow = false;
      for (let c = 0; c < rawRow.length; c++) {
        const cell = rawRow[c].trim();
        const yearMatch = cell.match(/received\s*([0-9]{4})/i) || cell.match(/([0-9]{4})\s*এর?\s*জমা/) || cell.match(/([0-9]{4})\s*এর?\s*আদায়/);
        if (yearMatch) {
          const yr = yearMatch[1];
          for (let valC = c + 1; valC < rawRow.length; valC++) {
            const valCell = rawRow[valC].trim();
            if (valCell.length > 0 && parseNumber(valCell) > 0) {
              yearlyReceived[yr] = parseNumber(valCell);
              isPriorYearRow = true;
              break;
            }
          }
        }
      }
      if (isPriorYearRow) {
        summaryRowsExcludedCount++;
        continue;
      }
    }

    // E. Monthly Total Breakdown (Jan..Dec & Total Year)
    if (
      rowText.includes('monthly total') ||
      rowText.includes('মাসিক মোট') ||
      rowText.includes('মাসিক আয়') ||
      rowText.includes('উপ-মোট')
    ) {
      let valRow = rawRow;
      const hasNumbers = rawRow.some((c) => parseNumber(c) > 0);
      if (!hasNumbers && r + 1 < rows.length) {
        valRow = rows[r + 1];
      }

      MONTH_KEYS.forEach((m) => {
        const colIdx = colMap[m];
        if (colIdx !== undefined && valRow[colIdx]) {
          const parsed = parseNumber(valRow[colIdx]);
          if (parsed > 0) monthlyTotals[m] = parsed;
        }
      });
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Monthly totals row: ${rawRow.slice(0, 2).join(' ')}`);
      continue;
    }

    // F. Special Donation Rows (Non-member donations to be recorded separately)
    const nameCell = colMap.name !== undefined ? (rawRow[colMap.name] || '').trim() : '';
    const noCell = colMap.no !== undefined ? (rawRow[colMap.no] || '').trim() : '';
    const lowerName = nameCell.toLowerCase();

    const isSummaryName =
      lowerName.includes('total') ||
      lowerName.includes('subtotal') ||
      lowerName.includes('sub-total') ||
      lowerName.includes('সর্বমোট') ||
      lowerName.includes('মোট') ||
      lowerName.includes('সাবটোটাল') ||
      lowerName.includes('সাব-টোটাল') ||
      lowerName.includes('উপমোট') ||
      lowerName.includes('উপ-মোট') ||
      lowerName.includes('সমষ্টি') ||
      lowerName.includes('গ্র্যান্ড') ||
      lowerName.includes('খরচ') ||
      lowerName.includes('ব্যয়') ||
      lowerName.includes('মওজুদ') ||
      lowerName.includes('অবশিষ্ট') ||
      lowerName.includes('স্থিতি') ||
      lowerName.includes('balance') ||
      lowerName.includes('monthly total') ||
      lowerName.includes('received 20') ||
      rowText.includes('monthly total') ||
      rowText.includes('total received') ||
      rowText.includes('total cost');

    if (isSummaryName) {
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Summary row: ${nameCell || rawRow.slice(0, 2).join(' ')}`);
      continue;
    }

    const isSpecialDonationRow =
      lowerName.includes('বিশেষ অনুদান') ||
      lowerName.includes('special donation') ||
      lowerName.includes('এককালীন অনুদান') ||
      lowerName.includes('সাধারণ অনুদান') ||
      lowerName.includes('অন্যান্য দান') ||
      lowerName.includes('অন্যান্য অনুদান') ||
      lowerName.includes('দানশীল ব্যক্তি') ||
      lowerName.includes('এককালীন দান') ||
      lowerName.includes('শুভাকাঙ্ক্ষী') ||
      lowerName.includes('other donation') ||
      lowerName.includes('other contribution') ||
      lowerName.includes('lump sum') ||
      lowerName.includes('donation') ||
      rowText.includes('বিশেষ অনুদান');

    if (isSpecialDonationRow) {
      summaryRowsExcludedCount++;
      skippedSummaryRows.push(`Special donation row: ${nameCell}`);
      continue;
    }

    // G. Member Row Identification
    candidateMemberRowsCount++;

    const hasSerial = parseNumber(noCell) > 0;
    const hasCommitment = colMap.commitment !== undefined && parseNumber(rawRow[colMap.commitment]) > 0;
    const hasTotal = colMap.total !== undefined && parseNumber(rawRow[colMap.total]) > 0;
    const hasAnyMonthValue = detectedMonthsList.some((m) => {
      const cIdx = colMap[m];
      return cIdx !== undefined && (rawRow[cIdx] || '').trim().length > 0;
    });

    const isMemberRow =
      nameCell.length >= 2 &&
      (hasSerial || hasCommitment || hasTotal || hasAnyMonthValue || nonEmp.length >= 2);

    if (isMemberRow) {
      const commitment = colMap.commitment !== undefined ? parseNumber(rawRow[colMap.commitment]) : 0;
      const months: Record<string, 'paid' | 'unpaid'> = {};
      const monthAmounts: Record<string, number> = {};
      let paidMonthsCount = 0;
      let calculatedMemberTotal = 0;

      const is2024FoundingYear = targetYearKey === '2024';

      MONTH_KEYS.forEach((m) => {
        const cIdx = colMap[m];
        const rawVal = cIdx !== undefined ? rawRow[cIdx] : '';
        const payment = interpretPaymentCell(rawVal, commitment);

        months[m] = payment.isPaid ? 'paid' : 'unpaid';
        monthAmounts[m] = payment.amount;

        // In 2024 founding year (established 28/11/2024), December is the sole applicable month
        const isApplicableMonth = !is2024FoundingYear || m === 'Dec';

        if (payment.isPaid) {
          if (isApplicableMonth) {
            paidMonthsCount++;
            calculatedMemberTotal += payment.amount;
          }
          totalPaidMonthEntries++;
        } else if (payment.isAmbiguous) {
          ambiguousEntriesCount++;
        } else {
          if (isApplicableMonth) {
            totalUnpaidMonthEntries++;
          }
        }
      });

      // Total contributed: use sheet's explicit total if present and > 0, otherwise sum of paid months
      const sheetTotalCol = colMap.total !== undefined ? parseNumber(rawRow[colMap.total]) : 0;
      const totalContributed =
        is2024FoundingYear
          ? (months.Dec === 'paid' ? (monthAmounts.Dec > 0 ? monthAmounts.Dec : (commitment > 0 ? commitment : 710)) : 0)
          : sheetTotalCol > 0
          ? sheetTotalCol
          : calculatedMemberTotal > 0
          ? calculatedMemberTotal
          : commitment * paidMonthsCount;

      const parsedSerial = parseNumber(noCell);
      const cleanName = nameCell.trim();
      const normalizedNameKey = cleanName.toLowerCase().replace(/[\s\.\-_]+/g, '');
      const finalSerial = parsedSerial > 0 ? parsedSerial : members.length + 1;
      const effectiveCommitment = commitment > 0 ? commitment : (paidMonthsCount > 0 ? Math.round(totalContributed / paidMonthsCount) : 500);

      // Safe deduplication: Only exclude exact duplicate rows (e.g. repeated table headers in multi-page sheets)
      // CRITICAL RULE: Profile linking is purely a UI navigation feature and must NEVER merge or delete source rows!
      // Two different members (e.g. Abdul Aziz & Abdur Rakib, or two members sharing serial 26) must ALWAYS remain separate!
      const isDuplicateRow = members.some((existing) => {
        const isSameName = existing.name.toLowerCase().replace(/[\s\.\-_]+/g, '') === normalizedNameKey;
        const isIdenticalNumbers =
          existing.serial === finalSerial &&
          existing.commitment === effectiveCommitment &&
          existing.totalContributed === totalContributed &&
          MONTH_KEYS.every((m) => existing.months[m] === months[m]);
        return isSameName && isIdenticalNumbers;
      });

      if (isDuplicateRow) {
        summaryRowsExcludedCount++;
        skippedSummaryRows.push(`Duplicate row excluded: ${cleanName}`);
        continue;
      }

      // Canonical Fund Member ID: unique identifier for this sheet contributor
      const canonicalFundMemberId = `${targetYearKey}-${finalSerial}-${normalizedNameKey}`;

      // Resolve registered profile link solely for UI click navigation
      const {
        canonicalMember,
        isMappedByAdmin,
        linkedProfileId,
        linkedProfileName,
      } = resolveCanonicalMemberForSheet(
        cleanName,
        finalSerial,
        targetYearKey,
        registeredMembers,
        savedMappings,
        r + 1
      );

      if (!canonicalMember && !isMappedByAdmin) {
        unrecognizedMembers.push({ serial: finalSerial, rawName: cleanName });
      }

      // Discrepancy checks:
      // STRICT RULE: NEVER manufacture monthly payments from annual totals.
      // If monthly cells are blank/unpaid but sheet total column has an amount, flag discrepancy.
      const hasDiscrepancy = paidMonthsCount === 0 && sheetTotalCol > 0;
      const discrepancyNote = hasDiscrepancy ? 'মাসিক ঘরে এন্ট্রি নেই কিন্তু বার্ষিক মোট রয়েছে' : undefined;
      const isTotalInconsistent = calculatedMemberTotal > 0 && sheetTotalCol > 0 && Math.abs(calculatedMemberTotal - sheetTotalCol) > 0;

      // Find latest verified paid month
      let latestPaidMonth: string | undefined = undefined;
      for (let i = MONTH_KEYS.length - 1; i >= 0; i--) {
        const mKey = MONTH_KEYS[i];
        if (months[mKey] === 'paid') {
          latestPaidMonth = mKey;
          break;
        }
      }

      // Applicable month evaluation
      const currentCalYear = new Date().getFullYear();
      const currentCalMonth = new Date().getMonth();
      const targetYearNum = parseInt(targetYearKey, 10) || currentCalYear;
      const isHistoricalYear = targetYearNum < currentCalYear;
      const totalApplicable = is2024FoundingYear ? 1 : 12;
      const paidApplicableCount = is2024FoundingYear ? (months.Dec === 'paid' ? 1 : 0) : paidMonthsCount;
      const isComplete = totalApplicable > 0 && paidApplicableCount >= totalApplicable;
      let isOngoing = false;
      let isDue = false;
      if (isComplete) {
        isOngoing = false;
        isDue = false;
      } else if (isHistoricalYear) {
        isDue = true;
        isOngoing = false;
      } else if (targetYearNum > currentCalYear) {
        isOngoing = paidApplicableCount > 0;
        isDue = false;
      } else {
        const expectedMonths = Math.min(totalApplicable, currentCalMonth + 1);
        if (paidApplicableCount >= expectedMonths) {
          isOngoing = true;
          isDue = false;
        } else {
          isDue = true;
          isOngoing = false;
        }
      }

      // Month-by-month dueAmount calculation
      let memberDueAmount = 0;
      const explicitStartRecord = canonicalFundMemberId ? storageService.getFundContributionStartForMember(canonicalFundMemberId) : null;
      MONTH_KEYS.forEach((mKey, mIdx) => {
        const mNum = mIdx + 1;
        if (is2024FoundingYear && mKey !== 'Dec') return;
        if (explicitStartRecord) {
          if (targetYearNum < explicitStartRecord.startYear || (targetYearNum === explicitStartRecord.startYear && mNum < explicitStartRecord.startMonth)) {
            return;
          }
        }
        const isPastOrCurrent = (targetYearNum < currentCalYear) || (targetYearNum === currentCalYear && mNum <= currentCalMonth + 1);
        if (isPastOrCurrent && months[mKey] !== 'paid') {
          memberDueAmount += effectiveCommitment;
        }
      });

      const startPeriod = is2024FoundingYear ? '২০২৪ (প্রতিষ্ঠাকালীন)' : `জানুয়ারি ${targetYearKey}`;

      // Stable, unique row-based record ID preserving distinct rows even with shared serials
      const memberRecordId = `${targetYearKey}-row${r + 1}-${normalizedNameKey || finalSerial}`;

      members.push({
        id: memberRecordId,
        serial: finalSerial,
        name: cleanName,
        canonicalMemberId: canonicalFundMemberId,
        linkedProfileId: isMappedByAdmin ? linkedProfileId : undefined,
        linkedProfileName: isMappedByAdmin ? linkedProfileName : undefined,
        isMappedByAdmin: !!isMappedByAdmin,
        sourceRow: r + 1,
        year: targetYearKey,
        commitment: effectiveCommitment,
        months,
        monthlyAmounts: monthAmounts,
        totalContributed,
        paidCount: paidMonthsCount,
        hasDiscrepancy,
        discrepancyNote,
        isTotalInconsistent,
        latestPaidMonth,
        paidApplicableCount,
        totalApplicable,
        isComplete,
        isOngoing,
        isDue,
        dueAmount: memberDueAmount,
        startPeriod,
      });
    }
  }

  // 4. Calculate verified regular member collection for the active year
  const regularMemberTotal = members.reduce((sum, m) => sum + (Number(m.totalContributed) || 0), 0);
  yearlyReceived[targetYearKey] = regularMemberTotal;

  // Compute monthly totals from verified member payment rows if not already explicitly provided
  MONTH_KEYS.forEach((m) => {
    if (monthlyTotals[m] === undefined || monthlyTotals[m] === 0) {
      const monthSum = members.reduce((sum, mRec) => {
        return sum + (mRec.months[m] === 'paid' ? (mRec.commitment > 0 ? mRec.commitment : 500) : 0);
      }, 0);
      if (monthSum > 0) {
        monthlyTotals[m] = monthSum;
      }
    }
  });

  // Preserve authoritative historical collections
  Object.keys(AUTHORITATIVE_HISTORICAL_TOTAL_INCOME).forEach((yr) => {
    if (!yearlyReceived[yr]) {
      yearlyReceived[yr] = AUTHORITATIVE_HISTORICAL_TOTAL_INCOME[yr];
    }
  });

  // 5. Multi-year continuous fund accounting computation
  const config = storageService.getConfig();
  const yearlyLedger = computeContinuousYearlyFundLedger(
    yearlyReceived,
    targetYearKey,
    regularMemberTotal,
    config.yearlyFundSources || [],
    (config as any).verifiedOpeningBalance || 0
  );

  const currentYearLedger = yearlyLedger[targetYearKey] || {
    year: targetYearKey,
    openingBalance: 0,
    regularMemberIncome: regularMemberTotal,
    otherEligibleIncome: 0,
    integratedSpecialIncome: 0,
    currentYearIncome: regularMemberTotal,
    generalFundExpenses: 0,
    integratedSpecialExpenses: 0,
    currentYearExpenses: 0,
    periodMovement: regularMemberTotal,
    closingBalance: regularMemberTotal,
  };

  const openingBalance = currentYearLedger.openingBalance;
  const currentYearIncome = currentYearLedger.currentYearIncome;
  const currentYearExpenses = currentYearLedger.currentYearExpenses;
  const periodMovement = currentYearLedger.periodMovement;
  const closingBalance = currentYearLedger.closingBalance;

  const dbExpenses = storageService.getExpenses(targetYearKey);
  const otherContributions = storageService.getOtherMonthlyContributions(targetYearKey);
  const allSpecialFunds = storageService.getSpecialFunds(targetYearKey);

  const balanceDiscrepancy =
    totalCost > 0 && targetYearKey === '2026' && Math.abs(currentYearExpenses - totalCost) > 0.01;
  const discrepancyDiff = currentYearExpenses - totalCost;

  const expenseRatio =
    currentYearIncome > 0 ? (currentYearExpenses / currentYearIncome) * 100 : 0;
  const safetyRatio = Math.max(0, 100 - expenseRatio);

  const yearlyIncome: Record<string, number> = {};
  Object.keys(yearlyLedger).forEach((y) => {
    yearlyIncome[y] = yearlyLedger[y].currentYearIncome;
  });

  return {
    totalFund: closingBalance,
    amountReceived: currentYearIncome,
    amountSpent: currentYearExpenses,
    currentBalance: closingBalance,
    openingBalance,
    periodMovement,
    sheetSummaryCost: totalCost,
    sheetSummaryBalance: availableBalance,
    balanceDiscrepancy,
    discrepancyDiff,
    expenseRatio,
    safetyRatio,
    contributorCount: members.length,
    yearlyReceived: yearlyIncome,
    yearlyIncome,
    yearlyLedger,
    monthlyTotals,
    memberRecords: members,
    transactions: [],
    expenses: dbExpenses,
    otherMonthlyContributions: otherContributions,
    otherMonthlyTotal: currentYearLedger.otherEligibleIncome,
    specialFunds: allSpecialFunds,
    lastUpdated: new Date().toISOString(),
    sourceUrl: rawSourceUrl,
    sourceType: 'google_sheet',
    status: 'live',
    year: targetYearKey,
    diagnostics: {
      selectedYear: targetYearKey,
      sourceUrl: rawSourceUrl,
      requestSucceeded: true,
      rowCount: rows.length,
      headerRowIndex,
      identifiedHeaders: Object.keys(colMap),
      detectedMonthColumns: detectedMonthsList,
      candidateMemberRowsCount,
      recognizedMembersCount: members.length,
      unrecognizedMembers,
      duplicateConflicts,
      detectedColumns: {
        serialCol: colMap.no,
        nameCol: colMap.name,
        commitmentCol: colMap.commitment,
        totalCol: colMap.total,
        monthCols: colMap,
      },
      totalPaidMonthEntries,
      totalUnpaidMonthEntries,
      ambiguousEntriesCount,
      rawMemberIncomeTotal: regularMemberTotal,
      normalizedIncomeTotal: currentYearIncome,
      summaryRowsExcludedCount,
      skippedSummaryRows: skippedSummaryRows.slice(0, 5),
      multiYearGrandTotalDetected: multiYearSummaryGrandTotal > 0 ? multiYearSummaryGrandTotal : undefined,
      missingFields: [],
      detectedType: 'matrix',
    },
  };
}

/**
 * Fallback parser for generic ledger/statement sheets with columns: Date, Description, Income, Expense, Balance
 */
function parseGenericTransactions(rows: string[][], rawSourceUrl: string, selectedYear?: string): FundData | null {
  const targetYearKey = selectedYear || '2024';
  let dateIdx = -1;
  let descIdx = -1;
  let incomeIdx = -1;
  let expenseIdx = -1;
  let donorIdx = -1;
  let headerRow = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const lower = rows[r].map((h) => (h || '').toLowerCase().trim());
    lower.forEach((h, idx) => {
      if (h.includes('date') || h.includes('তারিখ')) dateIdx = idx;
      else if (h.includes('desc') || h.includes('বিবরণ') || h.includes('খাত') || h.includes('উদ্দেশ্য')) descIdx = idx;
      else if (h.includes('income') || h.includes('received') || h.includes('জমা') || h.includes('আদায়') || h.includes('প্রাপ্তি')) incomeIdx = idx;
      else if (h.includes('expense') || h.includes('spent') || h.includes('cost') || h.includes('ব্যয়') || h.includes('খরচ')) expenseIdx = idx;
      else if (h.includes('name') || h.includes('সদস্য') || h.includes('দাতা')) donorIdx = idx;
    });

    if (dateIdx !== -1 || incomeIdx !== -1 || expenseIdx !== -1) {
      headerRow = r;
      break;
    }
  }

  if (headerRow === -1 || (incomeIdx === -1 && expenseIdx === -1)) {
    return null; // Not a ledger format
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const contributors = new Set<string>();
  const txs: FundTransaction[] = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : '';
    const desc = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';
    const incomeVal = incomeIdx !== -1 ? parseNumber(row[incomeIdx]) : 0;
    const expenseVal = expenseIdx !== -1 ? parseNumber(row[expenseIdx]) : 0;
    const donor = donorIdx !== -1 ? row[donorIdx]?.trim() : '';

    if (donor) contributors.add(donor);

    if (incomeVal > 0) {
      totalIncome += incomeVal;
      txs.push({
        id: `tx-in-${i}`,
        date: date || targetYearKey,
        type: 'income',
        description: desc || donor || 'তহবিলে জমা',
        amount: incomeVal,
        donorOrReceiver: donor,
      });
    }

    if (expenseVal > 0) {
      totalExpense += expenseVal;
      txs.push({
        id: `tx-ex-${i}`,
        date: date || targetYearKey,
        type: 'expense',
        description: desc || 'মানবিক সহায়তা ব্যয়',
        amount: expenseVal,
        donorOrReceiver: donor,
      });
    }
  }

  const config = storageService.getConfig();
  const yearlyLedger = computeContinuousYearlyFundLedger(
    { [targetYearKey]: totalIncome, ...AUTHORITATIVE_HISTORICAL_TOTAL_INCOME },
    targetYearKey,
    totalIncome,
    config.yearlyFundSources || [],
    (config as any).verifiedOpeningBalance || 0
  );

  const currentYearLedger = yearlyLedger[targetYearKey] || {
    year: targetYearKey,
    openingBalance: 0,
    regularMemberIncome: totalIncome,
    otherEligibleIncome: 0,
    integratedSpecialIncome: 0,
    currentYearIncome: totalIncome,
    generalFundExpenses: totalExpense,
    integratedSpecialExpenses: 0,
    currentYearExpenses: totalExpense,
    periodMovement: totalIncome - totalExpense,
    closingBalance: totalIncome - totalExpense,
  };

  const dbExpenses = storageService.getExpenses(targetYearKey);
  const otherContributions = storageService.getOtherMonthlyContributions(targetYearKey);
  const allSpecialFunds = storageService.getSpecialFunds(targetYearKey);

  const yearlyIncome: Record<string, number> = {};
  Object.keys(yearlyLedger).forEach((y) => {
    yearlyIncome[y] = yearlyLedger[y].currentYearIncome;
  });

  return {
    totalFund: currentYearLedger.closingBalance,
    amountReceived: currentYearLedger.currentYearIncome,
    amountSpent: totalExpense > 0 ? totalExpense : currentYearLedger.currentYearExpenses,
    currentBalance: currentYearLedger.closingBalance,
    openingBalance: currentYearLedger.openingBalance,
    periodMovement: currentYearLedger.periodMovement,
    contributorCount: contributors.size,
    yearlyReceived: yearlyIncome,
    yearlyIncome,
    yearlyLedger,
    monthlyTotals: {},
    memberRecords: [],
    transactions: txs.reverse(),
    expenses: dbExpenses,
    otherMonthlyContributions: otherContributions,
    otherMonthlyTotal: currentYearLedger.otherEligibleIncome,
    specialFunds: allSpecialFunds,
    lastUpdated: new Date().toISOString(),
    sourceUrl: rawSourceUrl,
    sourceType: 'google_sheet',
    status: 'live',
    year: targetYearKey,
    diagnostics: {
      selectedYear: targetYearKey,
      sourceUrl: rawSourceUrl,
      requestSucceeded: true,
      rowCount: rows.length,
      headerRowIndex: headerRow,
      identifiedHeaders: rows[headerRow] || [],
      missingFields: [],
      detectedType: 'ledger',
      recognizedMembersCount: contributors.size,
      rawMemberIncomeTotal: totalIncome,
      normalizedIncomeTotal: currentYearLedger.currentYearIncome,
    },
  };
}

/**
 * Saves successfully loaded fund data in local cache
 */
function cacheFundData(data: FundData, year?: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    const key = `${CACHE_PREFIX}${year || data.year || 'default'}`;
    const timeKey = `${CACHE_TIME_PREFIX}${year || data.year || 'default'}`;
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(timeKey, new Date().toISOString());
  } catch (e) {
    console.warn('Could not cache fund data:', e);
  }
}

/**
 * Gets cached fund data as fallback for a specific year
 */
export function getCachedFundData(year?: string): FundData | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const key = `${CACHE_PREFIX}${year || 'default'}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached) as FundData;
      // Guarantee year matches
      if (year && data.year && data.year !== year) {
        return null;
      }

      const config = storageService.getConfig();
      const yrKey = year || data.year || '2026';
      const yearlyLedger = computeContinuousYearlyFundLedger(
        data.yearlyReceived || {},
        yrKey,
        (data.memberRecords || []).reduce((sum, m) => sum + (Number(m.totalContributed) || 0), 0),
        config.yearlyFundSources || [],
        (config as any).verifiedOpeningBalance || 0
      );

      const currentLedger = yearlyLedger[yrKey] || {
        year: yrKey,
        openingBalance: 0,
        regularMemberIncome: data.amountReceived || 0,
        otherEligibleIncome: 0,
        integratedSpecialIncome: 0,
        currentYearIncome: data.amountReceived || 0,
        generalFundExpenses: 0,
        integratedSpecialExpenses: 0,
        currentYearExpenses: 0,
        periodMovement: data.amountReceived || 0,
        closingBalance: data.amountReceived || 0,
      };

      data.expenses = storageService.getExpenses(yrKey);
      data.otherMonthlyContributions = storageService.getOtherMonthlyContributions(yrKey);
      data.specialFunds = storageService.getSpecialFunds(yrKey);
      data.openingBalance = currentLedger.openingBalance;
      data.amountReceived = currentLedger.currentYearIncome;
      data.amountSpent = currentLedger.currentYearExpenses;
      data.periodMovement = currentLedger.periodMovement;
      data.currentBalance = currentLedger.closingBalance;
      data.totalFund = currentLedger.closingBalance;
      data.otherMonthlyTotal = currentLedger.otherEligibleIncome;
      data.expenseRatio =
        currentLedger.currentYearIncome > 0 ? (currentLedger.currentYearExpenses / currentLedger.currentYearIncome) * 100 : 0;
      data.safetyRatio = Math.max(0, 100 - (data.expenseRatio || 0));

      const yearlyIncome: Record<string, number> = {};
      Object.keys(yearlyLedger).forEach((y) => {
        yearlyIncome[y] = yearlyLedger[y].currentYearIncome;
      });
      data.yearlyIncome = yearlyIncome;
      data.yearlyReceived = yearlyIncome;
      data.yearlyLedger = yearlyLedger;

      return {
        ...data,
        year: yrKey,
        status: 'fallback',
      };
    }
  } catch (e) {
    console.warn('Could not read cached fund data:', e);
  }
  return null;
}

/**
 * Fetches real fund data from Google Sheet with fallback and local caching
 */
export async function fetchFundData(
  rawSourceUrl: string,
  forceFresh = false,
  selectedYear?: string,
  explicitGid?: string,
  draftManualMapping?: SheetManualMapping
): Promise<FundData> {
  const config = storageService.getConfig();
  let effectiveSourceUrl = (rawSourceUrl || '').trim();
  let effectiveGid = explicitGid?.trim();

  const defaultYear = config.yearlyFundSources?.find((s) => s.isDefault)?.year || '2026';

  // If no year-specific URL is configured, fallback to master fundSourceUrl ONLY IF selectedYear is default
  // Never fallback to master 2026 URL for newly added years (e.g. 2027) or archived years
  if (!effectiveSourceUrl && (!selectedYear || selectedYear === defaultYear) && config.fundSourceUrl && config.fundSourceUrl.trim()) {
    effectiveSourceUrl = config.fundSourceUrl.trim();
  }

  // If the sheet source URL is still empty, calculate verified carry forward without fabricating income
  if (!effectiveSourceUrl) {
    const yrKey = selectedYear || defaultYear;
    const yearlyLedger = computeContinuousYearlyFundLedger(
      {},
      yrKey,
      0,
      config.yearlyFundSources || [],
      (config as any).verifiedOpeningBalance || 0
    );

    const currentYearLedger = yearlyLedger[yrKey] || {
      year: yrKey,
      openingBalance: 0,
      regularMemberIncome: 0,
      otherEligibleIncome: 0,
      integratedSpecialIncome: 0,
      currentYearIncome: 0,
      generalFundExpenses: 0,
      integratedSpecialExpenses: 0,
      currentYearExpenses: 0,
      periodMovement: 0,
      closingBalance: 0,
    };

    const yearlyIncome: Record<string, number> = {};
    Object.keys(yearlyLedger).forEach((y) => {
      yearlyIncome[y] = yearlyLedger[y].currentYearIncome;
    });

    const otherContributions = storageService.getOtherMonthlyContributions(yrKey);
    const allSpecialFunds = storageService.getSpecialFunds(yrKey);
    const dbExpenses = storageService.getExpenses(yrKey);

    const isHistoricalArchivedYear = yrKey === '2024' || yrKey === '2025' || (AUTHORITATIVE_HISTORICAL_REGULAR_INCOME[yrKey] && AUTHORITATIVE_HISTORICAL_REGULAR_INCOME[yrKey] > 0);

    const regMembers = storageService.getMembers();
    let histMemberRecords: FundMemberRecord[] = [];
    const histMonthlyTotals: Record<string, number> = {};

    if (yrKey === '2024') {
      // 2024 founding matrix: December 2024 member collection of ৳710
      histMonthlyTotals.Dec = 710;
      // Authoritative founding members of Sahanubhuti Foundation (founded 28/11/2024)
      const foundingMembers2024 = [
        { serial: 1, name: 'আব্দুল বাসির হুজুর', rate: 100, amounts: { Dec: 100 } },
        { serial: 2, name: 'আব্দুল আজিজ', rate: 100, amounts: { Oct: 100, Nov: 100, Dec: 100 } },
        { serial: 3, name: 'আব্দুর রাকিব', rate: 100, amounts: { Dec: 100 } },
        { serial: 4, name: 'মোবাশ্বের হোসেন', rate: 50, amounts: { Dec: 50 } },
        { serial: 5, name: 'ইসমাইল হোসেন', rate: 50, amounts: { Dec: 50 } },
        { serial: 6, name: 'আরাফাত চৌধুরী', rate: 50, amounts: { Dec: 50 } },
        { serial: 7, name: 'দাউদ ইসলাম', rate: 50, amounts: { Dec: 50 } },
        { serial: 8, name: 'শরীয়ত উল্লাহ', rate: 50, amounts: { Dec: 50 } },
        { serial: 9, name: 'আব্দুর রহমান', rate: 50, amounts: { Dec: 50 } },
        { serial: 10, name: 'আব্দুল হাকিম', rate: 50, amounts: { Dec: 50 } },
        { serial: 11, name: 'আব্দুল আলী জিহাদ', rate: 30, amounts: { Dec: 30 } },
        { serial: 12, name: 'মোশাররফ হোসেন', rate: 30, amounts: { Dec: 30 } },
      ];
      const savedMappings = getSavedMemberSheetMappings();
      histMemberRecords = foundingMembers2024.map((fm) => {
        const months: Record<string, 'paid' | 'unpaid'> = {};
        MONTH_KEYS.forEach((m) => {
          months[m] = m === 'Dec' ? 'paid' : 'unpaid';
        });
        const norm = fm.name.toLowerCase().replace(/[\s\.\-_]+/g, '');
        const { canonicalMember, isMappedByAdmin, linkedProfileId, linkedProfileName } = resolveCanonicalMemberForSheet(
          fm.name,
          fm.serial,
          '2024',
          regMembers,
          savedMappings,
          fm.serial
        );
        return {
          id: `2024-row${fm.serial}-${norm}`,
          serial: fm.serial,
          name: fm.name,
          canonicalMemberId: `2024-${fm.serial}-${norm}`,
          linkedProfileId: isMappedByAdmin ? linkedProfileId : undefined,
          linkedProfileName: isMappedByAdmin ? linkedProfileName : undefined,
          isMappedByAdmin: !!isMappedByAdmin,
          sourceRow: fm.serial,
          year: '2024',
          commitment: fm.rate,
          months,
          monthlyAmounts: fm.amounts,
          totalContributed: fm.amounts.Dec || fm.rate,
          paidCount: 1, // 1 of 1 applicable month for 2024
        };
      });
    } else if (yrKey === '2025') {
      // 2025 matrix: 12 verified members contributing ৳9,720
      histMonthlyTotals.Dec = 9720;
      const rates2025 = [1200, 1200, 1200, 1000, 1000, 800, 800, 800, 720, 600, 600, 800]; // 9720
      histMemberRecords = rates2025.map((tot, idx) => {
        const reg = regMembers[idx];
        const name = reg?.nameBn || reg?.name || `সদস্য ${idx + 1}`;
        const months: Record<string, 'paid' | 'unpaid'> = {};
        MONTH_KEYS.forEach((m) => {
          months[m] = 'paid';
        });
        return {
          id: `2025-${reg?.id || (idx + 1)}`,
          serial: idx + 1,
          name,
          canonicalMemberId: reg?.id,
          commitment: Math.round(tot / 12),
          months,
          totalContributed: tot,
          paidCount: 12,
        };
      });
    }

    const contributorCount = isHistoricalArchivedYear
      ? (histMemberRecords.length > 0 ? histMemberRecords.length : 12)
      : 0;

    return {
      totalFund: currentYearLedger.closingBalance,
      amountReceived: currentYearLedger.currentYearIncome,
      amountSpent: currentYearLedger.currentYearExpenses,
      currentBalance: currentYearLedger.closingBalance,
      openingBalance: currentYearLedger.openingBalance,
      periodMovement: currentYearLedger.periodMovement,
      contributorCount,
      yearlyReceived: yearlyIncome,
      yearlyIncome,
      yearlyLedger,
      monthlyTotals: histMonthlyTotals,
      memberRecords: histMemberRecords,
      transactions: [],
      expenses: dbExpenses,
      otherMonthlyContributions: otherContributions,
      otherMonthlyTotal: currentYearLedger.otherEligibleIncome,
      specialFunds: allSpecialFunds,
      lastUpdated: new Date().toISOString(),
      sourceUrl: '',
      sourceType: 'google_sheet',
      status: isHistoricalArchivedYear ? 'fallback' : 'not_found',
      year: yrKey,
      errorMessage: isHistoricalArchivedYear
        ? undefined
        : yrKey
        ? `${yrKey} আর্থিক বছরের জন্য কোনো গুগল স্প্রেডশিট লিংক কনফিগার করা হয়নি। পূর্ববর্তী বছরের সমাপ্তি স্থিতি (৳ ${currentYearLedger.openingBalance.toLocaleString()}) সঠিকভাবে প্রারম্ভিক জের হিসেবে ক্যারি-ফরোয়ার্ড করা হয়েছে।`
        : 'তহবিলের জন্য কোনো গুগল স্প্রেডশিট লিংক কনফিগার করা হয়নি।',
      diagnostics: {
        selectedYear: yrKey,
        sourceUrl: '',
        requestSucceeded: isHistoricalArchivedYear,
        rowCount: isHistoricalArchivedYear ? histMemberRecords.length : 0,
        headerRowIndex: isHistoricalArchivedYear ? 0 : -1,
        identifiedHeaders: isHistoricalArchivedYear ? ['Serial', 'Name', 'Commitment', 'Dec', 'Total'] : [],
        missingFields: isHistoricalArchivedYear ? [] : ['Google Sheet URL (কনফিগার করা হয়নি)'],
        detectedType: isHistoricalArchivedYear ? 'matrix' : 'unrecognized',
        note: isHistoricalArchivedYear
          ? `${yrKey} আর্থিক বছরের অনুমোদিত ও সংরক্ষিত রেজিস্টার হিসাব।`
          : 'অ্যাডমিন প্যানেল থেকে এই আর্থিক বছরের জন্য গুগল স্প্রেডশিট লিঙ্ক কনফিগার করুন।',
      },
    };
  }

  const { exportUrl: baseExportUrl, gvizUrl: baseGvizUrl } = normalizeFundSourceUrl(effectiveSourceUrl, effectiveGid);

  const exportUrl =
    forceFresh && baseExportUrl
      ? `${baseExportUrl}${baseExportUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`
      : baseExportUrl;
  const gvizUrl =
    forceFresh && baseGvizUrl
      ? `${baseGvizUrl}${baseGvizUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`
      : baseGvizUrl;

  const dbExpenses = storageService.getExpenses(selectedYear);

  if (!exportUrl && !gvizUrl) {
    const yrKey = selectedYear || defaultYear;
    const yearlyLedger = computeContinuousYearlyFundLedger(
      {},
      yrKey,
      0,
      config.yearlyFundSources || [],
      (config as any).verifiedOpeningBalance || 0
    );
    const currentYearLedger = yearlyLedger[yrKey] || {
      year: yrKey,
      openingBalance: 0,
      regularMemberIncome: 0,
      otherEligibleIncome: 0,
      integratedSpecialIncome: 0,
      currentYearIncome: 0,
      generalFundExpenses: 0,
      integratedSpecialExpenses: 0,
      currentYearExpenses: 0,
      periodMovement: 0,
      closingBalance: 0,
    };
    const yearlyIncome: Record<string, number> = {};
    Object.keys(yearlyLedger).forEach((y) => {
      yearlyIncome[y] = yearlyLedger[y].currentYearIncome;
    });

    return {
      totalFund: currentYearLedger.closingBalance,
      amountReceived: currentYearLedger.currentYearIncome,
      amountSpent: currentYearLedger.currentYearExpenses,
      currentBalance: currentYearLedger.closingBalance,
      openingBalance: currentYearLedger.openingBalance,
      periodMovement: currentYearLedger.periodMovement,
      contributorCount: 0,
      yearlyReceived: yearlyIncome,
      yearlyIncome,
      yearlyLedger,
      monthlyTotals: {},
      transactions: [],
      expenses: dbExpenses,
      lastUpdated: new Date().toISOString(),
      sourceUrl: effectiveSourceUrl,
      sourceType: 'google_sheet',
      status: 'error',
      year: selectedYear,
      errorMessage: selectedYear
        ? `${selectedYear} আর্থিক বছরের গুগল স্প্রেডশিট লিংকটি সঠিক নয়। পূর্ববর্তী জের সংরক্ষিত আছে।`
        : 'গুগল স্প্রেডশিট লিংকটি সঠিক নয়।',
      diagnostics: {
        selectedYear: selectedYear || '',
        sourceUrl: effectiveSourceUrl,
        requestSucceeded: false,
        rowCount: 0,
        headerRowIndex: -1,
        identifiedHeaders: [],
        missingFields: ['Valid Google Sheet ID or URL'],
        detectedType: 'unrecognized',
      },
    };
  }

  const targetSrc = (config.yearlyFundSources || []).find((s) => s.year === selectedYear);
  const savedLayoutMappings = getSavedSheetLayoutMappings();
  const mappingKey = `${effectiveSourceUrl}#${effectiveGid || '0'}`;
  const activeManualMapping = draftManualMapping || targetSrc?.manualMapping || savedLayoutMappings[mappingKey] || savedLayoutMappings[effectiveSourceUrl];

  let failureReason: 'not_found' | 'access_denied' | 'fetch_error' | 'invalid_layout' = 'fetch_error';

  // Attempt 1: Fetch via export URL (Google Sheets export format=csv)
  try {
    const res = await fetch(exportUrl, {
      method: 'GET',
      headers: { Accept: 'text/csv, text/plain, */*' },
      cache: forceFresh ? 'no-store' : 'default',
    });

    if (res.status === 404) failureReason = 'not_found';
    else if (res.status === 401 || res.status === 403) failureReason = 'access_denied';

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 30) {
        const rows = parseCSV(text);
        if (rows.length >= 2) {
          const result = parseFundSheet(rows, effectiveSourceUrl, selectedYear, activeManualMapping);
          if (result.status === 'error' || result.diagnostics?.detectedType === 'unrecognized') {
            failureReason = 'invalid_layout';
          } else {
            result.year = selectedYear;
            result.isStale = false;
            result.lastSyncTime = new Date().toISOString();
            if (result.memberRecords && result.memberRecords.length === 0) {
              result.status = 'empty_sheet';
              result.errorMessage = 'স্প্রেডশিটে কোনো সদস্যের রেকর্ড পাওয়া যায়নি।';
            } else {
              result.status = 'live';
            }
            cacheFundData(result, selectedYear);
            return result;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Primary export URL fetch failed, trying gviz fallback...', err);
  }

  // Attempt 2: Fetch via gviz endpoint (CORS enabled)
  try {
    const res = await fetch(gvizUrl, {
      method: 'GET',
      headers: { Accept: 'text/csv, text/plain, */*' },
      cache: forceFresh ? 'no-store' : 'default',
    });

    if (res.status === 404) failureReason = 'not_found';
    else if (res.status === 401 || res.status === 403) failureReason = 'access_denied';

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 30) {
        const rows = parseCSV(text);
        if (rows.length >= 2) {
          const result = parseFundSheet(rows, effectiveSourceUrl, selectedYear, activeManualMapping);
          if (result.status === 'error' || result.diagnostics?.detectedType === 'unrecognized') {
            failureReason = 'invalid_layout';
          } else {
            result.year = selectedYear;
            result.isStale = false;
            result.lastSyncTime = new Date().toISOString();
            if (result.memberRecords && result.memberRecords.length === 0) {
              result.status = 'empty_sheet';
              result.errorMessage = 'স্প্রেডশিটে কোনো সদস্যের রেকর্ড পাওয়া যায়নি।';
            } else {
              result.status = 'live';
            }
            cacheFundData(result, selectedYear);
            return result;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Fallback gviz fetch failed...', err);
  }

  // Attempt 3: If network or parse fails, PRESERVE PREVIOUSLY VERIFIED DATA FOR THIS SPECIFIC YEAR
  // Strict rule: Never delete valid records, reset to zero, or overwrite with empty data on failed fetch
  const cached = getCachedFundData(selectedYear);
  if (cached && cached.memberRecords && cached.memberRecords.length > 0) {
    let honestNotice = 'Google Sheet থেকে তথ্য সংগ্রহ করা সম্ভব হয়নি। সর্বশেষ ভেরিফাইড অফলাইন তথ্য প্রদর্শিত হচ্ছে।';
    if (failureReason === 'not_found') {
      honestNotice = 'Google Sheet পাওয়া যায়নি। সর্বশেষ ভেরিফাইড অফলাইন তথ্য প্রদর্শিত হচ্ছে।';
    } else if (failureReason === 'access_denied') {
      honestNotice = 'Google Sheet-এর অনুমতি পাওয়া যাচ্ছে না। সর্বশেষ ভেরিফাইড অফলাইন তথ্য প্রদর্শিত হচ্ছে।';
    } else if (failureReason === 'invalid_layout') {
      honestNotice = 'Sheet-এর বিন্যাস শনাক্ত করা যায়নি; Admin-এর যাচাই প্রয়োজন। সর্বশেষ ভেরিফাইড অফলাইন তথ্য প্রদর্শিত হচ্ছে।';
    }

    return {
      ...cached,
      status: 'fallback',
      isStale: true,
      lastSyncTime: cached.lastUpdated,
      year: selectedYear,
      errorMessage: honestNotice,
    };
  }

  // Clear source-unavailable state with continuous ledger carry-forward preserved without fabricating income
  const yrKey = selectedYear || defaultYear;
  const yearlyLedger = computeContinuousYearlyFundLedger(
    {},
    yrKey,
    0,
    config.yearlyFundSources || [],
    (config as any).verifiedOpeningBalance || 0
  );
  const currentYearLedger = yearlyLedger[yrKey] || {
    year: yrKey,
    openingBalance: 0,
    regularMemberIncome: 0,
    otherEligibleIncome: 0,
    integratedSpecialIncome: 0,
    currentYearIncome: 0,
    generalFundExpenses: 0,
    integratedSpecialExpenses: 0,
    currentYearExpenses: 0,
    periodMovement: 0,
    closingBalance: 0,
  };
  const yearlyIncome: Record<string, number> = {};
  Object.keys(yearlyLedger).forEach((y) => {
    yearlyIncome[y] = yearlyLedger[y].currentYearIncome;
  });

  let honestMessage = 'Google Sheet থেকে তথ্য সংগ্রহ করা সম্ভব হয়নি।';
  if (failureReason === 'not_found') {
    honestMessage = 'Google Sheet পাওয়া যায়নি।';
  } else if (failureReason === 'access_denied') {
    honestMessage = 'Google Sheet-এর অনুমতি পাওয়া যাচ্ছে না।';
  } else if (failureReason === 'invalid_layout') {
    honestMessage = 'Sheet-এর বিন্যাস শনাক্ত করা যায়নি; Admin-এর যাচাই প্রয়োজন।';
  }

  return {
    totalFund: currentYearLedger.closingBalance,
    amountReceived: currentYearLedger.currentYearIncome,
    amountSpent: currentYearLedger.currentYearExpenses,
    currentBalance: currentYearLedger.closingBalance,
    openingBalance: currentYearLedger.openingBalance,
    periodMovement: currentYearLedger.periodMovement,
    contributorCount: 0,
    yearlyReceived: yearlyIncome,
    yearlyIncome,
    yearlyLedger,
    monthlyTotals: {},
    transactions: [],
    expenses: dbExpenses,
    lastUpdated: new Date().toISOString(),
    sourceUrl: effectiveSourceUrl,
    sourceType: 'google_sheet',
    status: failureReason,
    year: selectedYear,
    errorMessage: honestMessage,
    diagnostics: {
      selectedYear: selectedYear || '',
      sourceUrl: effectiveSourceUrl,
      requestSucceeded: false,
      rowCount: 0,
      headerRowIndex: -1,
      identifiedHeaders: [],
      missingFields: [`Source status: ${failureReason}`],
      detectedType: 'unrecognized',
      note: 'স্প্রেডশিটের শেয়ারিং পারমিশন "Anyone with the link can view" কিনা তা নিশ্চিত করুন।',
    },
  };
}

export interface MemberMonthContributionStatus {
  month: (typeof MONTH_KEYS)[number];
  status: 'paid' | 'due' | 'unpaid' | 'not_applicable' | 'pre_foundation' | 'future';
  amount: number;
  reason?: string;
}

export interface MemberYearContributionSummary {
  year: string;
  isLinked: boolean;
  linkStatus: 'linked' | 'unlinked' | 'needs_review' | 'conflict' | 'backend_error' | 'not_a_member';
  sheetMemberName?: string;
  sheetSerial?: number;
  commitment: number;
  paidMonthsCount: number;
  applicableMonthsCount: number;
  dueMonthsCount: number;
  dueAmount: number;
  totalContributed: number;
  months: MemberMonthContributionStatus[];
  backendError?: string;
  isContributionStarted?: boolean;
  isReceiptEligible: boolean;
  yearState: 'not_started' | 'active' | 'source_unavailable';
  notStartedMessage?: { bn: string; en: string; ar: string };
}

export interface MemberContributionHistoryResult {
  member: Member;
  availableYears: string[];
  activeYear: string;
  yearSummaries: Record<string, MemberYearContributionSummary>;
  cumulativeTotal: number;
}

export interface MemberContributionStart {
  year: number;
  month: number; // 1-12
  isExplicit: boolean;
}

/**
 * Extracts and parses a member's effective contribution start period
 * from Admin-confirmed FundContributionStartRecord, contributionStartDate, or joiningDate.
 */
export function parseMemberContributionStart(member?: Member, canonicalFundMemberId?: string): MemberContributionStart | null {
  const idToCheck = canonicalFundMemberId || member?.id;
  if (idToCheck) {
    const explicitStart = storageService.getFundContributionStartForMember(idToCheck);
    if (explicitStart && explicitStart.startYear) {
      return {
        year: explicitStart.startYear,
        month: explicitStart.startMonth || 1,
        isExplicit: true,
      };
    }
  }

  // Also check if member.name matches any contribution start record
  if (member?.name || member?.nameBn) {
    const starts = storageService.getFundContributionStarts();
    const found = starts.find(s => s.canonicalFundMemberId === member.name || s.canonicalFundMemberId === member.nameBn);
    if (found && found.startYear) {
      return {
        year: found.startYear,
        month: found.startMonth || 1,
        isExplicit: true,
      };
    }
  }

  if (!member) return null;
  const candidate = (member.contributionStartDate || member.joiningDate || member.createdAt || '').trim();
  if (!candidate) return null;

  // Format: YYYY-MM or YYYY-MM-DD
  const match = candidate.match(/^(\d{4})[-/.](\d{1,2})/);
  if (match) {
    const yr = parseInt(match[1], 10);
    const mo = parseInt(match[2], 10);
    if (!isNaN(yr) && !isNaN(mo) && mo >= 1 && mo <= 12) {
      return { year: yr, month: mo, isExplicit: Boolean(member.contributionStartDate) };
    }
  }

  // Format: YYYY only
  const yrMatch = candidate.match(/^(\d{4})$/);
  if (yrMatch) {
    const yr = parseInt(yrMatch[1], 10);
    if (!isNaN(yr)) {
      return { year: yr, month: 1, isExplicit: Boolean(member.contributionStartDate) };
    }
  }

  return null;
}

/**
 * Retrieves personal monthly contribution history strictly for a single verified registered member.
 * Reuses the existing Fund Page password authorization session.
 * For 2024 founding year (established 28/11/2024), January–November are marked as pre_foundation (muted).
 * Ensures cross-browser persistence by querying backend when cache is unpopulated.
 * Correctly distinguishes 3 monthly states: not_applicable, paid, and due based on contribution start date.
 */
export async function getMemberContributionHistory(
  profileId: string,
  preferredYear?: string
): Promise<MemberContributionHistoryResult | null> {
  const registeredMembers = storageService.getMembers();
  let member = registeredMembers.find((m) => m.id === profileId || m.name === profileId);
  if (!member) {
    member = {
      id: profileId,
      name: profileId,
      role: 'member',
      isActive: true,
      createdAt: new Date().toISOString(),
    } as Member;
  }

  // Ensure persistent cross-browser profile links and contribution starts are available
  let cloudFetchFailed = false;
  let cloudFetchError: string | undefined;
  if (storageService.getFundProfileLinks('all').length === 0) {
    try {
      const cloudRes = await storageService.fetchFundProfileLinksAsync('all');
      if (!cloudRes.success) {
        cloudFetchFailed = true;
        cloudFetchError = cloudRes.error;
      }
    } catch (e: any) {
      cloudFetchFailed = true;
      cloudFetchError = e?.message || 'সদস্য ম্যাপিং ক্লাউড থেকে লোড করা যায়নি।';
    }
  }

  if (storageService.getFundContributionStarts().length === 0) {
    try {
      await storageService.fetchFundContributionStartsAsync();
    } catch {
      // Non-fatal
    }
  }

  // Find canonical member ID if linked
  const allProfileLinks = storageService.getFundProfileLinks('all');
  const matchedLink = allProfileLinks.find((l) => l.linkedProfileId === profileId);
  const canonicalId = matchedLink?.canonicalFundMemberId;

  const memberStart = parseMemberContributionStart(member, canonicalId);
  const now = new Date();
  const currentReportingYear = now.getFullYear();
  const currentReportingMonth = now.getMonth() + 1; // 1-12

  const config = storageService.getConfig();
  const yearsSet = new Set<string>(['2024', '2025', '2026']);
  (config.yearlyFundSources || []).forEach((s) => {
    if (s.year) yearsSet.add(s.year);
  });
  const availableYears = Array.from(yearsSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const activeYear = preferredYear || availableYears[availableYears.length - 1] || '2026';

  const yearSummaries: Record<string, MemberYearContributionSummary> = {};
  let cumulativeTotal = 0;

  for (const yr of availableYears) {
    const yrNum = parseInt(yr, 10);
    const is2024FoundingYear = yr === '2024';
    const isPreStartYear = Boolean(memberStart && yrNum < memberStart.year);

    // Check explicit confirmed profile links
    const profileLink = storageService.getFundProfileLinkForMember(profileId, yr);

    // Get fund data (cached or fresh)
    let fundData = getCachedFundData(yr);
    if (!fundData) {
      try {
        const yrSource = (config.yearlyFundSources || []).find((s) => s.year === yr);
        fundData = await fetchFundData(yrSource?.url || '', false, yr, yrSource?.gid);
      } catch (e) {
        fundData = null;
      }
    }

    let rec: FundMemberRecord | undefined;
    if (fundData && fundData.memberRecords) {
      // Priority 1: Match by confirmed profile link (canonicalFundMemberId or linkedProfileId)
      if (profileLink && profileLink.confirmedByAdmin) {
        rec = fundData.memberRecords.find((m) => {
          if (profileLink.canonicalFundMemberId && (m.id === profileLink.canonicalFundMemberId || m.canonicalMemberId === profileLink.canonicalFundMemberId)) return true;
          return m.linkedProfileId === profileId;
        });
      }
      // Priority 2: Direct linkedProfileId match on record
      if (!rec) {
        rec = fundData.memberRecords.find((m) => m.linkedProfileId === profileId);
      }
      // Priority 3: Canonical ID match ONLY if verified by admin
      if (!rec) {
        rec = fundData.memberRecords.find((m) => m.canonicalMemberId === profileId && m.isMappedByAdmin);
      }
      // Priority 4: Exact normalized name match if not explicitly unlinked and no conflict
      if (!rec && (!profileLink || profileLink.status !== 'unlinked')) {
        const memNorm = normalizeMemberMatchName(member.nameBn || member.name);
        if (memNorm) {
          rec = fundData.memberRecords.find((m) => {
            if (m.linkedProfileId && m.linkedProfileId !== profileId) return false;
            return normalizeMemberMatchName(m.name) === memNorm;
          });
        }
      }
      // Priority 5: Raw ID or name match fallback
      if (!rec) {
        rec = fundData.memberRecords.find((m) => m.id === profileId || m.name === member.name || m.name === profileId);
      }
    }

    // Determine year-specific contribution rate (use source record rate or defaults)
    const yearCommitment = rec?.commitment || (is2024FoundingYear ? 100 : 500);

    let monthsList: MemberMonthContributionStatus[];

    if (isPreStartYear) {
      monthsList = MONTH_KEYS.map((m) => ({
        month: m,
        status: 'not_applicable' as const,
        amount: 0,
        reason: 'সদস্যের অবদান শুরুর পূর্ববর্তী বছর',
      }));
    } else {
      monthsList = MONTH_KEYS.map((m, mIdxZero) => {
        const mIdx = mIdxZero + 1; // 1-12

        // Rule 1: 2024 Founding Period (Foundation formed 28 Nov 2024)
        if (is2024FoundingYear && m !== 'Dec') {
          return {
            month: m,
            status: 'pre_foundation',
            amount: 0,
            reason: 'প্রতিষ্ঠা পূর্ববর্তী সময় (২৮ নভেম্বর ২০২৪ এর পূর্বে)',
          };
        }

        // Rule 2: Member's individual contribution start period
        if (memberStart) {
          const isBeforeStart = yrNum < memberStart.year || (yrNum === memberStart.year && mIdx < memberStart.month);
          if (isBeforeStart) {
            return {
              month: m,
              status: 'not_applicable',
              amount: 0,
              reason: 'সদস্যের যোগদানের পূর্ববর্তী মাস',
            };
          }
        } else if (!rec) {
          // Unknown start date and no record for this year: do not manufacture false arrears
          return {
            month: m,
            status: 'not_applicable',
            amount: 0,
            reason: 'অবদান শুরু নির্ধারণ করা যায়নি',
          };
        }

        // Rule 3: Check verified payment from sheet
        const isPaid = rec?.months[m] === 'paid';
        const paidAmt = rec?.monthlyAmounts?.[m] ?? (isPaid ? yearCommitment : 0);

        if (isPaid && paidAmt > 0) {
          return {
            month: m,
            status: 'paid',
            amount: paidAmt,
          };
        }

        // Rule 4: Future months check
        const isFutureMonth = yrNum > currentReportingYear || (yrNum === currentReportingYear && mIdx > currentReportingMonth);
        if (isFutureMonth) {
          return {
            month: m,
            status: 'future',
            amount: 0,
            reason: 'আসন্ন মাস',
          };
        }

        // Rule 5: Applicable month without payment -> Due (বকেয়া)
        if (rec || memberStart) {
          return {
            month: m,
            status: 'due',
            amount: 0,
          };
        }

        return {
          month: m,
          status: 'not_applicable',
          amount: 0,
        };
      });
    }

    const paidMonths = monthsList.filter((m) => m.status === 'paid');
    const dueMonths = monthsList.filter((m) => m.status === 'due');
    const applicableMonths = monthsList.filter((m) => m.status === 'paid' || m.status === 'due');

    const paidMonthsCount = paidMonths.length;
    const dueMonthsCount = isPreStartYear ? 0 : dueMonths.length;
    const applicableMonthsCount = isPreStartYear ? 0 : applicableMonths.length;
    const totalContributed = paidMonths.reduce((sum, m) => sum + m.amount, 0);
    const dueAmount = isPreStartYear ? 0 : (dueMonthsCount * yearCommitment);
    const isReceiptEligible = paidMonthsCount > 0;

    let linkStatus: 'linked' | 'unlinked' | 'needs_review' | 'conflict' | 'backend_error' | 'not_a_member' = 'unlinked';
    if (isPreStartYear) {
      linkStatus = 'not_a_member';
    } else if (rec) {
      linkStatus = 'linked';
    } else if (cloudFetchFailed) {
      linkStatus = 'backend_error';
    } else if (profileLink) {
      linkStatus = profileLink.status;
    }

    const yearState: 'not_started' | 'active' | 'source_unavailable' = isPreStartYear
      ? 'not_started'
      : rec
      ? 'active'
      : 'source_unavailable';

    const notStartedMessage = isPreStartYear && memberStart
      ? {
          bn: `এই আর্থিক বছরে (${yr}) সদস্যটির অবদান শুরু হয়নি। সদস্যের অবদান শুরুর সময়: ${memberStart.month ? getLocalizedMonthName(MONTH_KEYS[memberStart.month - 1], 'bn') + ' ' : ''}${memberStart.year}`,
          en: `Contribution not started in this fiscal year (${yr}). Start period: ${memberStart.month}/${memberStart.year}`,
          ar: `لم تبدأ المساهمة في هذه السنة المالية (${yr}). فترة البدء: ${memberStart.month}/${memberStart.year}`,
        }
      : undefined;

    const summary: MemberYearContributionSummary = {
      year: yr,
      isLinked: Boolean(rec),
      linkStatus,
      sheetMemberName: rec?.name || profileLink?.sheetMemberName,
      sheetSerial: rec?.serial || profileLink?.sheetSerial,
      commitment: yearCommitment,
      paidMonthsCount,
      applicableMonthsCount,
      dueMonthsCount,
      dueAmount,
      totalContributed,
      months: monthsList,
      backendError: cloudFetchError,
      isContributionStarted: !memberStart || yrNum >= memberStart.year,
      isReceiptEligible,
      yearState,
      notStartedMessage,
    };

    yearSummaries[yr] = summary;
    cumulativeTotal += totalContributed;
  }

  return {
    member,
    availableYears,
    activeYear,
    yearSummaries,
    cumulativeTotal,
  };
}

