import { FundData, FundMemberRecord, FundTransaction, ExpenseRecord, Language, OtherMonthlyContribution } from '../types';
import { storageService } from './storageService';
import { parseRecordYear } from '../utils/foundationHelpers';

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
export function normalizeFundSourceUrl(rawUrl: string, explicitGid?: string): { exportUrl: string; gvizUrl: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { exportUrl: '', gvizUrl: '' };
  }
  const trimmed = rawUrl.trim();

  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) {
    const sheetId = sheetMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = explicitGid?.trim() || (gidMatch ? gidMatch[1] : '0');

    return {
      exportUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
      gvizUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    };
  }

  return { exportUrl: trimmed, gvizUrl: trimmed };
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

  // Detect header row containing member columns
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].map((c) => (c || '').trim().toLowerCase());
    const hasName = row.some((c) => c === 'name' || c.includes('name') || c.includes('নাম') || c.includes('সদস্য'));
    const hasMonth = row.some((c) => {
      return MONTH_KEYS.some((m) => {
        const bnMonth = MONTH_NAMES_BN[m]?.toLowerCase();
        const enMonth = m.toLowerCase();
        return (
          c === enMonth ||
          c.startsWith(enMonth) ||
          c.endsWith(enMonth) ||
          (bnMonth && (c === bnMonth || c.includes(bnMonth)))
        );
      });
    });
    const hasCommitment = row.some((c) => c.includes('commitment') || c.includes('অঙ্গীকার') || c.includes('প্রতিশ্রুতি') || c.includes('চাঁদা') || c.includes('rate'));
    const hasTotal = row.some((c) => (c === 'total' || c.includes('মোট') || c.includes('সর্বমোট')) && !c.includes('year') && !c.includes('monthly') && !c.includes('বছর') && !c.includes('মাসিক'));

    if (hasName && (hasMonth || hasCommitment || hasTotal)) {
      headerRowIndex = r;
      rows[r].forEach((rawCol, cIdx) => {
        const col = (rawCol || '').trim().toLowerCase();
        if (col === 'no' || col === 'sl' || col === 'ক্রমিক' || col === '#' || col === 'আইডি' || col === 'id' || col === 'নং') {
          colMap.no = cIdx;
        } else if (col.includes('name') || col.includes('নাম') || col.includes('সদস্য')) {
          colMap.name = cIdx;
        } else if (col.includes('commitment') || col.includes('অঙ্গীকার') || col.includes('প্রতিশ্রুতি') || col.includes('চাঁদা') || col.includes('rate')) {
          colMap.commitment = cIdx;
        } else if ((col.includes('total') || col.includes('মোট') || col.includes('সর্বমোট')) && !col.includes('year') && !col.includes('monthly') && !col.includes('বছর') && !col.includes('মাসিক')) {
          colMap.total = cIdx;
        }

        MONTH_KEYS.forEach((m) => {
          const bnMonth = MONTH_NAMES_BN[m]?.toLowerCase();
          const enMonth = m.toLowerCase();
          if (
            col === enMonth ||
            col.startsWith(enMonth) ||
            col.endsWith(enMonth) ||
            col.endsWith(' ' + enMonth) ||
            (bnMonth && (col === bnMonth || col.includes(bnMonth)))
          ) {
            colMap[m] = cIdx;
          }
        });
      });
      break;
    }
  }

  // If no matrix header is found, check if it's a generic ledger or report failure
  if (headerRowIndex === -1) {
    const genericRes = parseGenericTransactions(rows, rawSourceUrl, selectedYear);
    if (genericRes) {
      return genericRes;
    }

    return {
      totalFund: 0,
      amountReceived: 0,
      amountSpent: 0,
      currentBalance: 0,
      contributorCount: 0,
      yearlyReceived: {},
      monthlyTotals: {},
      transactions: [],
      expenses: storageService.getExpenses(targetYearKey),
      otherMonthlyContributions: storageService.getOtherMonthlyContributions(targetYearKey),
      otherMonthlyTotal: 0,
      specialFunds: storageService.getSpecialFunds(targetYearKey),
      lastUpdated: new Date().toISOString(),
      sourceUrl: rawSourceUrl,
      sourceType: 'google_sheet',
      status: 'error',
      year: selectedYear,
      errorMessage: `${targetYearKey} আর্থিক বছরের স্প্রেডশিটের ফরম্যাট শনাক্ত করা যায়নি। কলামের শিরোনাম (নাম/তারিখ/টাকা) পরীক্ষা করুন।`,
      diagnostics: {
        selectedYear: targetYearKey,
        sourceUrl: rawSourceUrl,
        requestSucceeded: true,
        rowCount: rows.length,
        headerRowIndex: -1,
        identifiedHeaders: rows[0] || [],
        missingFields: ['সদস্যের নাম (Name/নাম)', 'মাস বা চাঁদার কলাম (Month/Commitment)'],
        detectedType: 'unrecognized',
        rawSnippet: rows.slice(0, 3).map((r) => r.join(' | ')),
      },
    };
  }

  const members: FundMemberRecord[] = [];
  const yearlyReceived: Record<string, number> = {};
  const monthlyTotals: Record<string, number> = {};
  let totalReceived = 0;
  let totalCost = 0;
  let availableBalance = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const rawRow = rows[r];
    const nonEmp = rawRow.filter((c) => c && c.trim().length > 0);
    if (nonEmp.length === 0) continue;

    const rowText = rawRow.join(' ').toLowerCase();

    // 1. Total Received (Grand multi-year total)
    if (
      rowText.includes('total received') ||
      rowText.includes('সর্বমোট জমা') ||
      rowText.includes('মোট প্রাপ্তি') ||
      (rowText.includes('মোট জমা') && !rowText.includes('মাসিক'))
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) totalReceived = parseNumber(numCell);
      continue;
    }

    // 2. Total Cost / Humanitarian expenses
    if (
      rowText.includes('total cost') ||
      rowText.includes('total expense') ||
      rowText.includes('মোট ব্যয়') ||
      rowText.includes('মোট খরচ') ||
      rowText.includes('সর্বমোট ব্যয়')
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) totalCost = parseNumber(numCell);
      continue;
    }

    // 3. Available Net Balance
    if (
      rowText.includes('balance') ||
      rowText.includes('abailable balance') ||
      rowText.includes('স্থিতি') ||
      rowText.includes('অবশিষ্ট') ||
      rowText.includes('মওজুদ')
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) availableBalance = parseNumber(numCell);
      continue;
    }

    // 4. Individual Yearly Received (e.g. Received 2024 = 1,210, Received 2025 = 10,120)
    if (
      (rowText.includes('received') || rowText.includes('জমা')) &&
      !rowText.includes('total received') &&
      !rowText.includes('monthly total')
    ) {
      for (let c = 0; c < rawRow.length; c++) {
        const cell = rawRow[c].trim();
        const yearMatch = cell.match(/received\s*([0-9]{4})/i) || cell.match(/([0-9]{4})\s*এর?\s*জমা/);
        if (yearMatch) {
          const yr = yearMatch[1];
          for (let valC = c + 1; valC < rawRow.length; valC++) {
            const valCell = rawRow[valC].trim();
            if (valCell.length > 0 && parseNumber(valCell) > 0) {
              yearlyReceived[yr] = parseNumber(valCell);
              break;
            }
          }
        }
      }
      continue;
    }

    // 5. Monthly Total Breakdown (Jan..Dec & Total Year)
    if (rowText.includes('monthly total') || rowText.includes('মাসিক মোট')) {
      let valRow = rawRow;
      const hasNumbers = rawRow.some((c) => parseNumber(c) > 0);
      if (!hasNumbers && r + 1 < rows.length) {
        valRow = rows[r + 1];
      }

      const valCells = valRow.map((c) => c.trim()).filter((c) => c.length > 0);
      const nums = valCells.map((c) => parseNumber(c)).filter((n) => n > 0);

      if (nums.length >= 12) {
        MONTH_KEYS.forEach((m, idx) => {
          monthlyTotals[m] = nums[idx];
        });
        if (nums.length > 12) {
          yearlyReceived[String(activeYearNum)] = nums[12];
        }
      } else {
        MONTH_KEYS.forEach((m) => {
          const colIdx = colMap[m];
          if (colIdx !== undefined && valRow[colIdx]) {
            monthlyTotals[m] = parseNumber(valRow[colIdx]);
          }
        });
        const totalYearIdx = rawRow.findIndex((c) => c.toLowerCase().includes('total year') || c.includes('বছরের মোট'));
        if (totalYearIdx !== -1 && valRow[totalYearIdx]) {
          yearlyReceived[String(activeYearNum)] = parseNumber(valRow[totalYearIdx]);
        }
      }
      continue;
    }

    // 6. Member Row Detection
    const nameCell = colMap.name !== undefined ? (rawRow[colMap.name] || '').trim() : '';
    const noCell = colMap.no !== undefined ? (rawRow[colMap.no] || '').trim() : '';
    const lowerName = nameCell.toLowerCase();

    const isSummaryRow =
      lowerName.includes('total') ||
      lowerName.includes('সর্বমোট') ||
      lowerName.includes('মোট') ||
      lowerName.includes('খরচ') ||
      lowerName.includes('ব্যয়') ||
      lowerName.includes('মওজুদ') ||
      lowerName.includes('অবশিষ্ট') ||
      lowerName.includes('স্থিতি') ||
      lowerName.includes('balance') ||
      lowerName.includes('received') ||
      lowerName.includes('গ্র্যান্ড') ||
      rowText.includes('monthly total') ||
      rowText.includes('total received') ||
      rowText.includes('total cost');

    const isMemberRow =
      nameCell &&
      !isSummaryRow &&
      (parseNumber(noCell) > 0 ||
        (colMap.commitment !== undefined && rawRow[colMap.commitment] && parseNumber(rawRow[colMap.commitment]) > 0) ||
        (colMap.total !== undefined && rawRow[colMap.total] && parseNumber(rawRow[colMap.total]) > 0));

    if (isMemberRow) {
      const commitment = colMap.commitment !== undefined ? parseNumber(rawRow[colMap.commitment]) : 0;
      const months: Record<string, 'paid' | 'unpaid'> = {};
      let paidMonthsCount = 0;

      MONTH_KEYS.forEach((m) => {
        const cIdx = colMap[m];
        const val = cIdx !== undefined ? (rawRow[cIdx] || '').trim() : '';
        const lowerVal = val.toLowerCase();

        let status: 'paid' | 'unpaid' = 'unpaid';
        if (
          lowerVal === 'true' ||
          lowerVal === '1' ||
          lowerVal === 'yes' ||
          val === '✓' ||
          val === '✔' ||
          lowerVal === 'paid'
        ) {
          status = 'paid';
          paidMonthsCount++;
        } else if (
          lowerVal === 'false' ||
          lowerVal === '0' ||
          lowerVal === 'no' ||
          val === '✗' ||
          val === '✘' ||
          lowerVal === 'unpaid'
        ) {
          status = 'unpaid';
        } else if (val.length === 0) {
          status = 'unpaid';
        } else {
          status = parseNumber(val) > 0 ? 'paid' : 'unpaid';
          if (status === 'paid') paidMonthsCount++;
        }
        months[m] = status;
      });

      const totalVal =
        colMap.total !== undefined && rawRow[colMap.total]
          ? parseNumber(rawRow[colMap.total])
          : commitment * paidMonthsCount;

      members.push({
        serial: parseNumber(noCell) || members.length + 1,
        name: nameCell,
        commitment,
        months,
        totalContributed: totalVal,
        paidCount: paidMonthsCount,
      });
    }
  }

  // Derive active matrix yearly collection from member total if not set
  if (!yearlyReceived[String(activeYearNum)] && Object.keys(monthlyTotals).length > 0) {
    yearlyReceived[String(activeYearNum)] = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
  }
  if (!yearlyReceived[String(activeYearNum)] && members.length > 0) {
    yearlyReceived[String(activeYearNum)] = members.reduce((sum, m) => sum + (Number(m.totalContributed) || 0), 0);
  }

  // Derive multi-year grand total if not set
  if (totalReceived === 0) {
    totalReceived = Object.values(yearlyReceived).reduce((a, b) => a + b, 0);
  }

  // Determine year-specific sheet collection for the selected year
  // If viewing 2024, use yearlyReceived['2024'] (e.g. 1,210)
  // If viewing 2025, use yearlyReceived['2025'] (e.g. 10,120)
  // If viewing 2026, use yearlyReceived['2026'] (e.g. 16,590)
  let yearSheetReceived = 0;
  if (yearlyReceived[targetYearKey] !== undefined) {
    yearSheetReceived = yearlyReceived[targetYearKey];
  } else if (members.length > 0 && String(activeYearNum) === targetYearKey) {
    yearSheetReceived = members.reduce((sum, m) => sum + (Number(m.totalContributed) || 0), 0);
  } else if (totalReceived > 0 && Object.keys(yearlyReceived).length === 0) {
    yearSheetReceived = totalReceived;
  }

  // Expenses strictly for targetYearKey
  const dbExpenses = storageService.getExpenses(targetYearKey);
  const fundDeductedExpenses = dbExpenses.filter(
    (e) => e.deductionMode !== 'separate' && e.deductionMode !== 'display_only'
  );
  const dbDeductedExpenseTotal = fundDeductedExpenses.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );

  let effectiveTotalCost = dbDeductedExpenseTotal;
  if (totalCost > 0 && dbDeductedExpenseTotal === 0 && targetYearKey === '2026') {
    effectiveTotalCost = totalCost;
  }

  // Other Monthly Contributions strictly for targetYearKey (Feature 1)
  const otherContributions = storageService.getOtherMonthlyContributions(targetYearKey);
  const { eligibleTotalToAdd } = calculateEligibleAdditionalContributionsTotal(
    otherContributions,
    yearSheetReceived
  );
  const otherMonthlyTotal = eligibleTotalToAdd;

  // Purpose-Specific Separate Funds strictly for targetYearKey
  const allSpecialFunds = storageService.getSpecialFunds(targetYearKey);
  const integratedFunds = allSpecialFunds.filter((f) => f.integrationMode === 'integrated');
  const integratedDonationsTotal = integratedFunds.reduce((acc, f) => {
    const cash = (f.donations || [])
      .filter((d) => !d.isInKind || d.isCashEquivalent)
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    return acc + cash;
  }, 0);
  const integratedExpensesTotal = integratedFunds.reduce((acc, f) => {
    const exp = (f.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return acc + exp;
  }, 0);

  const grandTotalReceived = yearSheetReceived + otherMonthlyTotal + integratedDonationsTotal;
  const grandTotalCost = effectiveTotalCost + integratedExpensesTotal;
  const grandBalance = grandTotalReceived > 0 ? Math.max(0, grandTotalReceived - grandTotalCost) : 0;

  const balanceDiscrepancy =
    totalCost > 0 && targetYearKey === '2026' && Math.abs(dbDeductedExpenseTotal - totalCost) > 0.01;
  const discrepancyDiff = dbDeductedExpenseTotal - totalCost;

  const expenseRatio =
    grandTotalReceived > 0 ? (grandTotalCost / grandTotalReceived) * 100 : 0;
  const safetyRatio = Math.max(0, 100 - expenseRatio);

  // If the sheet's matrix belongs to activeYearNum (e.g. 2026) and user is looking at another year (e.g. 2024),
  // don't show 2026 monthly breakdown as 2024 monthly breakdown
  const isSelectedYearMatrix = String(activeYearNum) === targetYearKey;
  const effectiveMonthlyTotals = isSelectedYearMatrix ? monthlyTotals : {};
  const effectiveMemberRecords = isSelectedYearMatrix ? members : [];

  return {
    totalFund: grandTotalReceived,
    amountReceived: grandTotalReceived,
    amountSpent: grandTotalCost,
    currentBalance: grandBalance,
    sheetSummaryCost: totalCost,
    sheetSummaryBalance: availableBalance,
    balanceDiscrepancy,
    discrepancyDiff,
    expenseRatio,
    safetyRatio,
    contributorCount: effectiveMemberRecords.length > 0 ? effectiveMemberRecords.length : (yearSheetReceived > 0 ? 1 : 0),
    yearlyReceived,
    monthlyTotals: effectiveMonthlyTotals,
    memberRecords: effectiveMemberRecords,
    transactions: [],
    expenses: dbExpenses,
    otherMonthlyContributions: otherContributions,
    otherMonthlyTotal,
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

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
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

  const dbExpenses = storageService.getExpenses(targetYearKey);
  const otherContributions = storageService.getOtherMonthlyContributions(targetYearKey);
  const { eligibleTotalToAdd } = calculateEligibleAdditionalContributionsTotal(
    otherContributions,
    totalIncome
  );
  const otherMonthlyTotal = eligibleTotalToAdd;
  const allSpecialFunds = storageService.getSpecialFunds(targetYearKey);

  const finalIncome = totalIncome + otherMonthlyTotal;
  const finalExpense = totalExpense > 0 ? totalExpense : dbExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = Math.max(0, finalIncome - finalExpense);

  return {
    totalFund: finalIncome,
    amountReceived: finalIncome,
    amountSpent: finalExpense,
    currentBalance: balance,
    contributorCount: contributors.size,
    yearlyReceived: { [targetYearKey]: totalIncome },
    monthlyTotals: {},
    memberRecords: [],
    transactions: txs.reverse(),
    expenses: dbExpenses,
    otherMonthlyContributions: otherContributions,
    otherMonthlyTotal,
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
      const dbExpenses = storageService.getExpenses(year);
      const fundDeductedExpenses = dbExpenses.filter(
        (e) => e.deductionMode !== 'separate' && e.deductionMode !== 'display_only'
      );
      const dbExpenseTotal = fundDeductedExpenses.reduce(
        (acc, item) => acc + (Number(item.amount) || 0),
        0
      );
      const effectiveSpent = dbExpenseTotal;
      data.expenses = dbExpenses;
      data.otherMonthlyContributions = storageService.getOtherMonthlyContributions(year);
      const { eligibleTotalToAdd } = calculateEligibleAdditionalContributionsTotal(
        data.otherMonthlyContributions || [],
        data.amountReceived || 0
      );
      data.otherMonthlyTotal = eligibleTotalToAdd;
      data.specialFunds = storageService.getSpecialFunds(year);
      data.amountSpent = effectiveSpent;
      const opBal = typeof data.openingBalance === 'number' ? data.openingBalance : 0;
      data.currentBalance = opBal + (data.amountReceived || 0) - effectiveSpent;
      data.expenseRatio =
        data.amountReceived > 0 ? (effectiveSpent / data.amountReceived) * 100 : 0;
      data.safetyRatio = Math.max(0, 100 - (data.expenseRatio || 0));
      return {
        ...data,
        year: year || data.year,
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

  // If no year-specific URL is configured, fallback to the foundation's master fundSourceUrl
  if (!effectiveSourceUrl && config.fundSourceUrl && config.fundSourceUrl.trim()) {
    effectiveSourceUrl = config.fundSourceUrl.trim();
  }

  // If the sheet source URL is still empty, return clean 'not_found' status with diagnostics
  if (!effectiveSourceUrl) {
    const otherContributions = storageService.getOtherMonthlyContributions(selectedYear);
    const { eligibleTotalToAdd } = calculateEligibleAdditionalContributionsTotal(
      otherContributions,
      0
    );
    const otherMonthlyTotal = eligibleTotalToAdd;
    const allSpecialFunds = storageService.getSpecialFunds(selectedYear);
    const dbExpenses = storageService.getExpenses(selectedYear);

    return {
      totalFund: otherMonthlyTotal,
      amountReceived: otherMonthlyTotal,
      amountSpent: 0,
      currentBalance: otherMonthlyTotal,
      contributorCount: 0,
      yearlyReceived: {},
      monthlyTotals: {},
      transactions: [],
      expenses: dbExpenses,
      otherMonthlyContributions: otherContributions,
      otherMonthlyTotal,
      specialFunds: allSpecialFunds,
      lastUpdated: new Date().toISOString(),
      sourceUrl: '',
      sourceType: 'google_sheet',
      status: 'not_found',
      year: selectedYear,
      errorMessage: selectedYear
        ? `${selectedYear} আর্থিক বছরের জন্য গুগল স্প্রেডশিট বা ডাটা সোর্স লিংক কনফিগার করা হয়নি।`
        : 'তহবিলের জন্য কোনো গুগল স্প্রেডশিট লিংক কনফিগার করা হয়নি।',
      diagnostics: {
        selectedYear: selectedYear || '',
        sourceUrl: '',
        requestSucceeded: false,
        rowCount: 0,
        headerRowIndex: -1,
        identifiedHeaders: [],
        missingFields: ['Google Sheet URL (কনফিগার করা হয়নি)'],
        detectedType: 'unrecognized',
        note: 'অ্যাডমিন প্যানেল থেকে এই আর্থিক বছরের জন্য গুগল স্প্রেডশিট লিঙ্ক কনফিগার করুন।',
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
    return {
      totalFund: 0,
      amountReceived: 0,
      amountSpent: 0,
      currentBalance: 0,
      contributorCount: 0,
      yearlyReceived: {},
      monthlyTotals: {},
      transactions: [],
      expenses: dbExpenses,
      lastUpdated: new Date().toISOString(),
      sourceUrl: effectiveSourceUrl,
      sourceType: 'google_sheet',
      status: 'error',
      year: selectedYear,
      errorMessage: selectedYear
        ? `${selectedYear} আর্থিক বছরের গুগল স্প্রেডশিট লিংকটি সঠিক নয়।`
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

  // Clear source-unavailable state (NEVER substitute another year's data or fake static numbers!)
  return {
    totalFund: 0,
    amountReceived: 0,
    amountSpent: 0,
    currentBalance: 0,
    contributorCount: 0,
    yearlyReceived: {},
    monthlyTotals: {},
    transactions: [],
    expenses: dbExpenses,
    lastUpdated: new Date().toISOString(),
    sourceUrl: effectiveSourceUrl,
    sourceType: 'google_sheet',
    status: 'error',
    year: selectedYear,
    errorMessage: selectedYear
      ? `${selectedYear} আর্থিক বছরের গুগল স্প্রেডশিট থেকে তথ্য সংগ্রহ করা যায়নি। অনুগ্রহ করে স্প্রেডশিটের শেয়ারিং পারমিশন (Anyone with the link can view) এবং নেটওয়ার্ক সংযোগ যাচাই করুন।`
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
