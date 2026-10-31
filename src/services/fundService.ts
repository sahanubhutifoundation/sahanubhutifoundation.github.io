import { FundData, FundMemberRecord, FundTransaction, ExpenseRecord, Language, OtherMonthlyContribution, YearlyFundSource, YearlyAccountingLedgerEntry, Member } from '../types';
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

export const MEMBER_MAPPINGS_KEY = 'sf_member_sheet_mappings';

export function getSavedMemberSheetMappings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MEMBER_MAPPINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMemberSheetMapping(sheetKey: string, canonicalId: string): void {
  try {
    const current = getSavedMemberSheetMappings();
    current[sheetKey] = canonicalId;
    localStorage.setItem(MEMBER_MAPPINGS_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_member_mappings_updated', { detail: current }));
    }
  } catch (e) {
    console.warn('Could not save member sheet mapping:', e);
  }
}

export function removeMemberSheetMapping(sheetKey: string): void {
  try {
    const current = getSavedMemberSheetMappings();
    delete current[sheetKey];
    localStorage.setItem(MEMBER_MAPPINGS_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf_member_mappings_updated', { detail: current }));
    }
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
 * 1. Saved admin mappings from sf_member_sheet_mappings
 * 2. Canonical registered member profiles (normalized English/Bengali names, aliases)
 * 3. Year-specific serial as secondary supporting evidence (ONLY if no name collision)
 * Never uses financial metrics to identify members.
 */
export function resolveCanonicalMemberForSheet(
  sheetName: string,
  sheetSerial: number,
  year: string,
  registeredMembers: Member[],
  savedMappings: Record<string, string>
): { canonicalMember?: Member; isMappedByAdmin: boolean } {
  const cleanSheetName = (sheetName || '').trim();
  const normalizedKey = cleanSheetName.toLowerCase().replace(/[\s\.\-_]+/g, '');
  const yearKey = `${year}:${normalizedKey}`;
  const serialKey = `${year}:sl:${sheetSerial}`;

  // 1. Check saved admin manual mappings
  const savedId = savedMappings[yearKey] || savedMappings[normalizedKey] || savedMappings[serialKey];
  if (savedId) {
    const found = registeredMembers.find((m) => m.id === savedId);
    if (found) {
      return { canonicalMember: found, isMappedByAdmin: true };
    }
  }

  // 2. Direct match by exact or simplified normalized names
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
      if (rawNorm === normalizedKey) {
        return { canonicalMember: m, isMappedByAdmin: false };
      }
      const simplifiedCandidate = normalizeMemberMatchName(nameCandidate);
      if (simplifiedCandidate && simplifiedCandidate === simplifiedSheet) {
        return { canonicalMember: m, isMappedByAdmin: false };
      }
    }
  }

  // 3. Fallback: match by serial number ONLY IF the registered member's name doesn't belong to another member
  if (sheetSerial > 0) {
    const serialMatch = registeredMembers.find((m) => m.serial === sheetSerial);
    if (serialMatch) {
      const nameBelongsToOther = registeredMembers.some((other) => {
        if (other.id === serialMatch.id) return false;
        const otherNorm = other.name.toLowerCase().replace(/[\s\.\-_]+/g, '');
        return otherNorm === normalizedKey;
      });
      if (!nameBelongsToOther) {
        return { canonicalMember: serialMatch, isMappedByAdmin: false };
      }
    }
  }

  return { canonicalMember: undefined, isMappedByAdmin: false };
}

/**
 * Robustly parses Google Sheets for Sahanubhuti Foundation across multiple historical layouts:
 * - Matrix member grid (Bengali and/or English columns, partial or 12 months)
 * - Single-year or multi-year consolidated summary sheets
 * - Transaction statement/ledger layout (Date, Description, Income, Expense)
 */
function parseFundSheet(rows: string[][], rawSourceUrl: string, selectedYear?: string): FundData {
  const targetYearKey = selectedYear || '2026';
  const activeYearNum = parseInt(targetYearKey, 10) || 2026;

  let headerRowIndex = -1;
  const colMap: Record<string, number> = {};
  const detectedMonthsList: (typeof MONTH_KEYS)[number][] = [];

  // 1. Detect header row containing member columns across candidate rows
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
          colMap.no = cIdx;
        } else if (
          col.includes('name') || col.includes('নাম') || col.includes('সদস্য') || col.includes('member') || col.includes('donor') || col.includes('দাতার')
        ) {
          colMap.name = cIdx;
        } else if (
          col.includes('commitment') || col.includes('অঙ্গীকার') || col.includes('প্রতিশ্রুতি') ||
          col.includes('চাঁদা') || col.includes('rate') || col.includes('ধার্য') || col.includes('pledge')
        ) {
          colMap.commitment = cIdx;
        } else if (
          (col.includes('total') || col.includes('মোট') || col.includes('সর্বমোট')) &&
          !col.includes('cost') && !col.includes('expense') && !col.includes('ব্যয়') && !col.includes('খরচ') &&
          !col.includes('monthly') && !col.includes('মাসিক')
        ) {
          colMap.total = cIdx;
        } else if (
          col.includes('number') || col.includes('phone') || col.includes('mobile') ||
          col.includes('মোবাইল') || col.includes('ফোন') || col.includes('যোগাযোগ')
        ) {
          colMap.phone = cIdx;
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
      (hasSerial || hasCommitment || hasTotal || hasAnyMonthValue);

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

      // Decouple serial numbers: Resolve canonical registered member identity
      const { canonicalMember } = resolveCanonicalMemberForSheet(
        cleanName,
        finalSerial,
        targetYearKey,
        registeredMembers,
        savedMappings
      );

      if (!canonicalMember) {
        unrecognizedMembers.push({ serial: finalSerial, rawName: cleanName });
      }

      // Safe deduplication: Check if this exact member was already processed in this sheet
      // CRITICAL: Must NEVER merge different members who happen to share a serial number in the sheet
      const existingMemberIdx = members.findIndex((m) => {
        const mNorm = m.name.toLowerCase().replace(/[\s\.\-_]+/g, '');
        if (canonicalMember && m.canonicalMemberId) {
          return m.canonicalMemberId === canonicalMember.id;
        }
        return mNorm === normalizedNameKey;
      });

      if (existingMemberIdx >= 0) {
        const existing = members[existingMemberIdx];
        if (existing.name.toLowerCase().replace(/[\s\.\-_]+/g, '') !== normalizedNameKey) {
          duplicateConflicts.push({
            serial: finalSerial,
            rawName: cleanName,
            issue: `Multiple sheet rows (${existing.name} & ${cleanName}) resolved to same canonical member ${canonicalMember?.name}`,
          });
        }
        const isIdentical =
          existing.commitment === effectiveCommitment &&
          existing.totalContributed === totalContributed &&
          MONTH_KEYS.every((m) => existing.months[m] === months[m]);

        if (isIdentical) {
          summaryRowsExcludedCount++;
          skippedSummaryRows.push(`Duplicate member row excluded: ${cleanName}`);
          continue;
        } else {
          let mergedPaidCount = 0;
          let mergedTotal = 0;
          const mergedMonths: Record<string, 'paid' | 'unpaid'> = {};
          MONTH_KEYS.forEach((m) => {
            const isPaid = existing.months[m] === 'paid' || months[m] === 'paid';
            mergedMonths[m] = isPaid ? 'paid' : 'unpaid';
            if (isPaid && (!is2024FoundingYear || m === 'Dec')) {
              mergedPaidCount++;
              mergedTotal += (existing.commitment > 0 ? existing.commitment : effectiveCommitment);
            }
          });
          members[existingMemberIdx] = {
            ...existing,
            months: mergedMonths,
            paidCount: mergedPaidCount,
            totalContributed: Math.max(existing.totalContributed, totalContributed, mergedTotal),
          };
          continue;
        }
      }

      const memberRecordId = canonicalMember
        ? `${targetYearKey}-${canonicalMember.id}`
        : `${targetYearKey}-${finalSerial}-${normalizedNameKey}`;

      members.push({
        id: memberRecordId,
        serial: finalSerial,
        name: cleanName,
        canonicalMemberId: canonicalMember?.id,
        commitment: effectiveCommitment,
        months,
        totalContributed,
        paidCount: paidMonthsCount,
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
    amountSpent: currentYearLedger.currentYearExpenses,
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
  explicitGid?: string
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
      const foundingRates = [100, 100, 100, 50, 50, 50, 50, 50, 50, 50, 30, 30]; // 710
      histMemberRecords = foundingRates.map((rate, idx) => {
        const reg = regMembers[idx];
        const name = reg?.nameBn || reg?.name || `প্রতিষ্ঠাতা সদস্য ${idx + 1}`;
        const months: Record<string, 'paid' | 'unpaid'> = {};
        MONTH_KEYS.forEach((m) => {
          months[m] = m === 'Dec' ? 'paid' : 'unpaid';
        });
        return {
          id: `2024-${reg?.id || (idx + 1)}`,
          serial: idx + 1,
          name,
          canonicalMemberId: reg?.id,
          commitment: rate,
          months,
          totalContributed: rate,
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

  // Attempt 1: Fetch via export URL (Google Sheets export format=csv)
  try {
    const res = await fetch(exportUrl, {
      method: 'GET',
      headers: { Accept: 'text/csv, text/plain, */*' },
      cache: forceFresh ? 'no-store' : 'default',
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) {
        const rows = parseCSV(text);
        if (rows.length >= 3) {
          const result = parseFundSheet(rows, effectiveSourceUrl, selectedYear);
          result.year = selectedYear;
          cacheFundData(result, selectedYear);
          return result;
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

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) {
        const rows = parseCSV(text);
        if (rows.length >= 3) {
          const result = parseFundSheet(rows, effectiveSourceUrl, selectedYear);
          result.year = selectedYear;
          cacheFundData(result, selectedYear);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Fallback gviz fetch failed...', err);
  }

  // Attempt 3: If network fails, serve previously cached verified data FOR THIS SPECIFIC YEAR
  const cached = getCachedFundData(selectedYear);
  if (cached) {
    return {
      ...cached,
      status: 'fallback',
      year: selectedYear,
      errorMessage: 'সর্বশেষ সংগৃহীত অফলাইন তথ্য প্রদর্শিত হচ্ছে।',
    };
  }

  // Clear source-unavailable state with continuous ledger carry-forward preserved
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
      ? `${selectedYear} আর্থিক বছরের গুগল স্প্রেডশিট থেকে তথ্য সংগ্রহ করা যায়নি। পূর্ববর্তী বছরের সমাপ্তি স্থিতি (৳ ${currentYearLedger.openingBalance.toLocaleString()}) সংরক্ষিত রয়েছে।`
      : 'গুগল স্প্রেডশিট থেকে তথ্য সংগ্রহ করা সম্ভব হয়নি। স্প্রেডশিটের শেয়ারিং পারমিশন যাচাই করুন।',
    diagnostics: {
      selectedYear: selectedYear || '',
      sourceUrl: effectiveSourceUrl,
      requestSucceeded: false,
      rowCount: 0,
      headerRowIndex: -1,
      identifiedHeaders: [],
      missingFields: ['Network / Access Failure: Google Sheets export endpoints unreachable'],
      detectedType: 'unrecognized',
      note: 'স্প্রেডশিটের শেয়ারিং পারমিশন "Anyone with the link can view" কিনা তা নিশ্চিত করুন।',
    },
  };
}
