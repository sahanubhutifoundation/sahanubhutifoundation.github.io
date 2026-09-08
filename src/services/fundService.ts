import { FundData, FundMemberRecord, FundTransaction, ExpenseRecord } from '../types';
import { storageService } from './storageService';

const CACHE_KEY = 'sf_fund_cache_data_v3';
const CACHE_TIME_KEY = 'sf_fund_cache_time_v3';

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

/**
 * Normalizes any Google Sheet or external data URL into export and fallback URLs
 */
export function normalizeFundSourceUrl(rawUrl: string): { exportUrl: string; gvizUrl: string } {
  if (!rawUrl || !rawUrl.trim()) {
    return { exportUrl: '', gvizUrl: '' };
  }
  const trimmed = rawUrl.trim();

  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) {
    const sheetId = sheetMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

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
 * Parses the actual Google Sheet structure of Sahanubhuti Foundation
 */
function parseFundSheet(rows: string[][], rawSourceUrl: string): FundData {
  let headerRowIndex = -1;
  const colMap: Record<string, number> = {};

  // Detect header row containing member columns
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].map((c) => c.trim().toLowerCase());
    const hasName = row.some((c) => c === 'name' || c.includes('name') || c.includes('নাম'));
    const hasJan = row.some((c) => c === 'jan' || c.includes('jan') || c.includes('জানু'));

    if (hasName && hasJan) {
      headerRowIndex = r;
      rows[r].forEach((rawCol, cIdx) => {
        const col = rawCol.trim().toLowerCase();
        if (col === 'no' || col === 'sl' || col === 'ক্রমিক' || col === '#') colMap.no = cIdx;
        else if (col.includes('name') || col.includes('নাম')) colMap.name = cIdx;
        else if (col.includes('commitment') || col.includes('অঙ্গীকার') || col.includes('প্রতিশ্রুতি')) colMap.commitment = cIdx;
        else if (col.includes('total') && !col.includes('year') && !col.includes('monthly')) colMap.total = cIdx;

        MONTH_KEYS.forEach((m) => {
          if (col === m.toLowerCase() || col.endsWith(' ' + m.toLowerCase())) {
            colMap[m] = cIdx;
          }
        });
      });
      break;
    }
  }

  // If no matrix header is found, fall back to generic transaction rows
  if (headerRowIndex === -1) {
    return parseGenericTransactions(rows, rawSourceUrl);
  }

  const members: FundMemberRecord[] = [];
  const yearlyReceived: Record<string, number> = {};
  const monthlyTotals: Record<string, number> = {};
  let totalReceived = 0;
  let totalCost = 0;
  let availableBalance = 0;
  const activeYear = 2026;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const rawRow = rows[r];
    const nonEmp = rawRow.filter((c) => c && c.trim().length > 0);
    if (nonEmp.length === 0) continue;

    const rowText = rawRow.join(' ').toLowerCase();

    // 1. Total Received (Grand total over all active years)
    if (rowText.includes('total received') || rowText.includes('সর্বমোট জমা') || rowText.includes('মোট প্রাপ্তি')) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) totalReceived = parseNumber(numCell);
      continue;
    }

    // 2. Total Cost / Humanitarian expenses
    if (
      rowText.includes('total cost') ||
      rowText.includes('total expense') ||
      rowText.includes('মোট ব্যয়') ||
      rowText.includes('মোট খরচ')
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) totalCost = parseNumber(numCell);
      continue;
    }

    // 3. Available Net Balance
    if (
      rowText.includes('balance') ||
      rowText.includes('স্থিতি') ||
      rowText.includes('অবশিষ্ট') ||
      rowText.includes('মওজুদ')
    ) {
      const numCell = rawRow.find((c, i) => i > 0 && parseNumber(c) > 0);
      if (numCell) availableBalance = parseNumber(numCell);
      continue;
    }

    // 4. Individual Yearly Received (e.g. Received 2024 = 1,210, Received 2025 = 10,120)
    if ((rowText.includes('received') || rowText.includes('জমা')) && !rowText.includes('total received')) {
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
          yearlyReceived[String(activeYear)] = nums[12];
        }
      } else {
        MONTH_KEYS.forEach((m) => {
          const colIdx = colMap[m];
          if (colIdx !== undefined && valRow[colIdx]) {
            monthlyTotals[m] = parseNumber(valRow[colIdx]);
          }
        });
        const totalYearIdx = rawRow.findIndex((c) => c.toLowerCase().includes('total year'));
        if (totalYearIdx !== -1 && valRow[totalYearIdx]) {
          yearlyReceived[String(activeYear)] = parseNumber(valRow[totalYearIdx]);
        }
      }
      continue;
    }

    // 6. Member Row
    const nameCell = colMap.name !== undefined ? rawRow[colMap.name]?.trim() : '';
    const noCell = colMap.no !== undefined ? rawRow[colMap.no]?.trim() : '';
    const isMemberRow =
      nameCell &&
      (parseNumber(noCell) > 0 || (rawRow[colMap.commitment] && parseNumber(rawRow[colMap.commitment]) > 0));

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

      // Note: Phone numbers and private contacts (Number, Call, Imo, Wa) are STRICTLY OMITTED!
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

  // Calculate 2026 total if not explicit
  if (!yearlyReceived['2026'] && Object.keys(monthlyTotals).length > 0) {
    yearlyReceived['2026'] = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
  }

  // Calculate grand total received if not explicit
  if (totalReceived === 0) {
    totalReceived = Object.values(yearlyReceived).reduce((a, b) => a + b, 0);
  }

  // Authoritative Expense Ledger Reconciliation
  // 1. Google Sheet summary cost (e.g. 4,950) is retained as sheetSummaryCost
  // 2. Database expenses ledger provides audited granular expenses
  const dbExpenses = storageService.getExpenses();
  const dbExpenseTotal = dbExpenses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // If database expenses exist, their sum is the authoritative total cost.
  // Otherwise fall back to the sheet summary cost (or opening balance).
  const effectiveTotalCost = dbExpenseTotal > 0 ? dbExpenseTotal : totalCost;

  // Reconciled Available Net Balance = Total Received - Total Cost
  const effectiveBalance = totalReceived > 0 ? totalReceived - effectiveTotalCost : 0;

  // Discrepancy audit check against Google Sheet's static summary cell
  const balanceDiscrepancy = availableBalance > 0 && Math.abs(effectiveBalance - availableBalance) > 0.01;
  const discrepancyDiff = effectiveBalance - availableBalance;

  return {
    totalFund: totalReceived,
    amountReceived: totalReceived,
    amountSpent: effectiveTotalCost,
    currentBalance: effectiveBalance,
    sheetSummaryCost: totalCost,
    sheetSummaryBalance: availableBalance,
    balanceDiscrepancy,
    discrepancyDiff,
    contributorCount: members.length,
    yearlyReceived,
    monthlyTotals,
    memberRecords: members,
    transactions: [],
    expenses: dbExpenses,
    lastUpdated: new Date().toISOString(),
    sourceUrl: rawSourceUrl,
    sourceType: 'google_sheet',
    status: 'live',
  };
}

/**
 * Fallback parser for generic ledger/statement sheets with columns: Date, Description, Income, Expense, Balance
 */
function parseGenericTransactions(rows: string[][], rawSourceUrl: string): FundData {
  const headers = rows[0] || [];
  const lower = headers.map((h) => h.toLowerCase().trim());

  let dateIdx = -1;
  let descIdx = -1;
  let incomeIdx = -1;
  let expenseIdx = -1;
  let donorIdx = -1;

  lower.forEach((h, idx) => {
    if (h.includes('date') || h.includes('তারিখ')) dateIdx = idx;
    else if (h.includes('desc') || h.includes('বিবরণ') || h.includes('খাত')) descIdx = idx;
    else if (h.includes('income') || h.includes('received') || h.includes('জমা') || h.includes('আদায়')) incomeIdx = idx;
    else if (h.includes('expense') || h.includes('spent') || h.includes('cost') || h.includes('ব্যয়')) expenseIdx = idx;
    else if (h.includes('name') || h.includes('সদস্য') || h.includes('দাতা')) donorIdx = idx;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const contributors = new Set<string>();
  const txs: FundTransaction[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : '';
    const desc = descIdx !== -1 && row[descIdx] ? row[descIdx] : '';
    const incomeVal = incomeIdx !== -1 ? parseNumber(row[incomeIdx]) : 0;
    const expenseVal = expenseIdx !== -1 ? parseNumber(row[expenseIdx]) : 0;
    const donor = donorIdx !== -1 ? row[donorIdx] : '';

    if (donor && donor.trim()) contributors.add(donor.trim());

    if (incomeVal > 0) {
      totalIncome += incomeVal;
      txs.push({
        id: `tx-in-${i}`,
        date: date || '২০২৪',
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
        date: date || '২০২৪',
        type: 'expense',
        description: desc || 'মানবিক সহায়তা ব্যয়',
        amount: expenseVal,
        donorOrReceiver: donor,
      });
    }
  }

  const dbExpenses = storageService.getExpenses();

  return {
    totalFund: totalIncome,
    amountReceived: totalIncome,
    amountSpent: totalExpense,
    currentBalance: totalIncome - totalExpense,
    contributorCount: contributors.size,
    transactions: txs.reverse(),
    expenses: dbExpenses,
    lastUpdated: new Date().toISOString(),
    sourceUrl: rawSourceUrl,
    sourceType: 'google_sheet',
    status: 'live',
  };
}

/**
 * Saves successfully loaded fund data in local cache
 */
function cacheFundData(data: FundData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('Could not cache fund data:', e);
  }
}

/**
 * Gets cached fund data as fallback
 */
export function getCachedFundData(): FundData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as FundData;
      const dbExpenses = storageService.getExpenses();
      const dbExpenseTotal = dbExpenses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
      const effectiveSpent = dbExpenseTotal > 0 ? dbExpenseTotal : (data.sheetSummaryCost || 4950);
      data.expenses = dbExpenses;
      data.amountSpent = effectiveSpent;
      data.currentBalance = (data.amountReceived || 0) - effectiveSpent;
      return {
        ...data,
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
export async function fetchFundData(rawSourceUrl: string): Promise<FundData> {
  const { exportUrl, gvizUrl } = normalizeFundSourceUrl(rawSourceUrl);

  const dbExpenses = storageService.getExpenses();
  const dbExpenseTotal = dbExpenses.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const spent = dbExpenseTotal > 0 ? dbExpenseTotal : 4950;
  const received = 23320;

  const emptyFallback: FundData = {
    totalFund: received,
    amountReceived: received,
    amountSpent: spent,
    currentBalance: received - spent,
    sheetSummaryCost: 4950,
    sheetSummaryBalance: 18370,
    contributorCount: 26,
    yearlyReceived: { '2024': 1210, '2025': 10120, '2026': 11990 },
    monthlyTotals: {
      Jan: 2003,
      Feb: 1803,
      Mar: 1653,
      Apr: 1033,
      May: 863,
      Jun: 813,
      Jul: 663,
      Aug: 663,
      Sep: 663,
      Oct: 663,
      Nov: 583,
      Dec: 583,
    },
    transactions: [],
    expenses: dbExpenses,
    lastUpdated: new Date().toISOString(),
    sourceUrl: rawSourceUrl,
    sourceType: 'google_sheet',
    status: 'fallback',
    errorMessage: 'সার্ভার সংযোগ বিচ্ছিন্ন থাকায় অফলাইন হিসাব প্রদর্শিত হচ্ছে।',
  };

  if (!exportUrl && !gvizUrl) {
    return emptyFallback;
  }

  // Attempt 1: Fetch via export URL (Google Sheets export format=csv)
  try {
    const res = await fetch(exportUrl, {
      method: 'GET',
      headers: { Accept: 'text/csv, text/plain, */*' },
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) {
        const rows = parseCSV(text);
        if (rows.length >= 3) {
          const result = parseFundSheet(rows, rawSourceUrl);
          cacheFundData(result);
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
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50) {
        const rows = parseCSV(text);
        if (rows.length >= 3) {
          const result = parseFundSheet(rows, rawSourceUrl);
          cacheFundData(result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Fallback gviz fetch failed...', err);
  }

  // Attempt 3: If network fails, serve previously cached verified data
  const cached = getCachedFundData();
  if (cached) {
    return {
      ...cached,
      status: 'fallback',
      errorMessage: 'সর্বশেষ সংগৃহীত অফলাইন তথ্য প্রদর্শিত হচ্ছে।',
    };
  }

  return emptyFallback;
}
