/**
 * Deterministic Receipt Numbering & Registry Utility
 * Sahanubhuti Foundation (সহানুভূতি ফাউন্ডেশন)
 * 
 * Rules:
 * - Deterministic: Same member, year, months produce the same receipt number on re-download
 * - Durable: Stored in localStorage registry for auditability
 * - Distinct: Consolidated multi-month has separate identifier from individual months
 * - Format: SF-MR-YYYY-SER-MONTH(S)-HASH
 */

const STORAGE_KEY = 'sf_receipt_registry_v1';

interface ReceiptRegistryEntry {
  receiptNumber: string;
  memberId: string;
  memberSerial: number | string;
  year: string;
  months: string[];
  isConsolidated: boolean;
  issuedAt: string;
}

/**
 * Fast deterministic 4-character hex hash from string input
 */
function simpleChecksum(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const unsigned = hash >>> 0;
  return unsigned.toString(16).toUpperCase().padStart(4, '0').slice(-4);
}

/**
 * Loads registry from localStorage safely
 */
function getRegistry(): Record<string, ReceiptRegistryEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

/**
 * Saves entry to registry
 */
function saveToRegistry(key: string, entry: ReceiptRegistryEntry): void {
  try {
    const reg = getRegistry();
    reg[key] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reg));
  } catch (e) {
    // quota exceeded or private mode, non-fatal
  }
}

/**
 * Generates or retrieves a unique, deterministic receipt number
 */
export function getDeterministicReceiptNumber(
  prefix = 'SF-MR',
  year: string,
  memberSerial: number | string,
  memberId: string,
  months: string[],
  isConsolidated: boolean
): string {
  const normSerial = String(memberSerial || '001').padStart(3, '0');
  const sortedMonths = [...months].map((m) => m.toUpperCase());
  
  let monthTag: string;
  if (sortedMonths.length === 1) {
    monthTag = sortedMonths[0];
  } else if (isConsolidated) {
    monthTag = `${sortedMonths[0]}-${sortedMonths[sortedMonths.length - 1]}-C`;
  } else {
    monthTag = sortedMonths.join('-');
  }

  // Registry lookup key
  const registryKey = `${year}_${memberId || normSerial}_${monthTag}_${isConsolidated ? 'C' : 'S'}`;
  const reg = getRegistry();
  if (reg[registryKey]) {
    return reg[registryKey].receiptNumber;
  }

  // Generate deterministic checksum
  const rawSeed = `${prefix}:${year}:${normSerial}:${memberId}:${monthTag}`;
  const checksum = simpleChecksum(rawSeed);

  const receiptNumber = `${prefix}-${year}-${normSerial}-${monthTag}-${checksum}`;

  saveToRegistry(registryKey, {
    receiptNumber,
    memberId: memberId || normSerial,
    memberSerial: normSerial,
    year,
    months: sortedMonths,
    isConsolidated,
    issuedAt: new Date().toISOString(),
  });

  return receiptNumber;
}
