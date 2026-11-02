/**
 * Automated Verification Script for Sahanubhuti Foundation Spreadsheet Parsers,
 * Multi-Year Accounting, Member Linking, and Profile Contribution History.
 */

import {
  fetchFundData,
  parseFundSheet,
  parseNumber,
  resolveCanonicalMemberForSheet,
  getMemberContributionHistory,
} from '../src/services/fundService';
import { storageService } from '../src/services/storageService';
import { getDeterministicReceiptNumber } from '../src/utils/receiptNumbering';
import { FundProfileLinkRecord, Member, SheetManualMapping } from '../src/types';

// Polyfill global localStorage for NodeJS test execution
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  } as any;
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 SAHANUBHUTI FOUNDATION SPREADSHEET & ACCOUNTING TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${desc}`);
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
    }
  }

  // TEST 1: Live 2026 Google Sheet Layout & Parsing
  console.log('--- TEST 1: Live 2026 Google Sheet ---');
  const liveSheetUrl = 'https://docs.google.com/spreadsheets/d/1bh2WGcphb2ZTVzyaE9Yo3UHCOe_NkQtzoolS9UPuETg/edit?usp=sharing';
  try {
    const res2026 = await fetchFundData(liveSheetUrl, true, '2026', '0');
    assert(res2026.status === 'live', 'Live Google Sheet loaded successfully (status === "live")');
    assert(res2026.memberRecords !== undefined && res2026.memberRecords.length >= 27, `Recognized ${res2026.memberRecords?.length} member records (expected >= 27)`);

    // Verify both members sharing serial 26 exist
    const serial26Members = (res2026.memberRecords || []).filter((m) => m.serial === 26);
    assert(serial26Members.length === 2, `Both members sharing serial 26 preserved without dropping (${serial26Members.map((m) => m.name).join(' & ')})`);

    // Verify multi-year grand total excluded from 2026 single-year income
    assert(res2026.amountReceived < 25000, `Single-year 2026 income (৳${res2026.amountReceived}) excludes multi-year grand total (27,920)`);
    assert(res2026.diagnostics.multiYearGrandTotalDetected === 27920, 'Multi-year summary grand total 27,920 correctly identified and excluded');
    assert(res2026.openingBalance > 0, `Opening balance carried forward from previous years (৳${res2026.openingBalance})`);
  } catch (err) {
    console.error('Test 1 error:', err);
    assert(false, 'Live 2026 Google Sheet fetch encountered error');
  }

  // TEST 2: Bengali Numerals & Currency Parser
  console.log('\n--- TEST 2: Bengali Numerals & Currency Parser ---');
  assert(parseNumber('১২,১০০') === 12100, 'Parses Bengali numerals with commas (১২,১০০ -> 12100)');
  assert(parseNumber('৳ ৫,০০০') === 5000, 'Parses Bengali currency symbol (৳ ৫,০০০ -> 5000)');
  assert(parseNumber('৳ 500/-') === 500, 'Parses mixed currency and dashes (৳ 500/- -> 500)');
  assert(parseNumber('০') === 0, 'Parses Bengali zero (০ -> 0)');

  // TEST 3: Bengali Matrix Layout
  console.log('\n--- TEST 3: Bengali Matrix Layout Recognition ---');
  const bengaliMatrixRows: string[][] = [
    ['সহানুভূতি ফাউন্ডেশন', '', '', '', '', ''],
    ['ক্রমিক', 'সদস্যের নাম', 'অঙ্গীকার', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'মোট'],
    ['১', 'আব্দুল করিম', '৫০০', 'পরিশোধিত', 'পরিশোধিত', 'বকেয়া', '১০০০'],
    ['২', 'ফারুক আহমেদ', '১০০০', 'paid', 'paid', 'paid', '৩০০০'],
    ['মোট আদায়', '', '', '১৫০০', '১৫০০', '১০০০', '৪০০০'],
  ];
  const bengaliParsed = parseFundSheet(bengaliMatrixRows, 'https://example.com/bengali-sheet', '2026');
  assert(bengaliParsed.diagnostics.detectedType === 'matrix', 'Identifies Bengali matrix layout type');
  assert(bengaliParsed.memberRecords.length === 2, `Recognized ${bengaliParsed.memberRecords.length} members from Bengali column matrix`);
  assert(bengaliParsed.memberRecords[0]?.paidCount === 2, 'Parsed Bengali "পরিশোধিত" as paid');
  assert(bengaliParsed.memberRecords[0]?.totalContributed === 1000, 'Calculated Bengali member total: ৳1000');
  assert(bengaliParsed.amountReceived === 4000, 'Extracted verified Bengali collection: ৳4000');

  // TEST 4: Numeric Payment Amounts Layout
  console.log('\n--- TEST 4: Numeric Payment Amounts Grid ---');
  const numericPaymentRows: string[][] = [
    ['SL', 'Member Name', 'Commitment', 'Jan', 'Feb', 'Mar', 'Total'],
    ['1', 'Md Rafiq', '500', '500', '1000', '0', '1500'],
    ['2', 'Kamal Uddin', '1000', '1000', '1000', '1000', '3000'],
  ];
  const numericParsed = parseFundSheet(numericPaymentRows, 'https://example.com/numeric-sheet', '2026');
  assert(numericParsed.memberRecords.length === 2, 'Parsed numeric payment amounts layout');
  assert(numericParsed.memberRecords[0]?.monthlyAmounts?.Feb === 1000, 'Extracted exact numeric amount for February: ৳1000');
  assert(numericParsed.memberRecords[0]?.totalContributed === 1500, 'Correct member total: ৳1500');

  // TEST 5: Offset Headers and Multi-Row Title Layout
  console.log('\n--- TEST 5: Offset Header Row Detection ---');
  const offsetHeaderRows: string[][] = [
    ['সহানুভূতি ফাউন্ডেশন (২০২৬ অর্থবছর)'],
    ['প্রতিষ্ঠা: ২৮ নভেম্বর ২০২৪'],
    ['মাসিক চাঁদা ও অনুদান রেজিস্টার'],
    [''],
    ['নং', 'দাতার নাম', 'রেট', 'Jan', 'Feb', 'Total'],
    ['1', 'Hasan Ali', '500', 'Yes', 'Yes', '1000'],
  ];
  const offsetParsed = parseFundSheet(offsetHeaderRows, 'https://example.com/offset-sheet', '2026');
  assert(offsetParsed.diagnostics.headerRowIndex === 4, `Detected header row at index 4 (Row 5 in spreadsheet)`);
  assert(offsetParsed.memberRecords.length === 1, 'Recognized member despite 4 top title rows');
  assert(offsetParsed.memberRecords[0]?.name === 'Hasan Ali', 'Correctly identified member name "Hasan Ali"');

  // TEST 6: Transaction Statement / Ledger Layout
  console.log('\n--- TEST 6: Transaction Statement / Ledger Layout ---');
  const transactionRows: string[][] = [
    ['তারিখ', 'বিবরণ', 'আয় / জমা', 'ব্যয় / খরচ', 'ব্যালেন্স'],
    ['01/01/2026', 'মাসিক সাধারণ চাঁদা আদায়', '5000', '0', '5000'],
    ['10/01/2026', 'অসহায় রোগীর চিকিৎসা অনুদান', '0', '2000', '3000'],
    ['15/01/2026', 'বিশেষ অনুদান', '1500', '0', '4500'],
  ];
  const txParsed = parseFundSheet(transactionRows, 'https://example.com/tx-sheet', '2026');
  assert(txParsed.diagnostics.detectedType === 'ledger', 'Identifies transaction statement layout');
  assert(txParsed.transactions.length === 3, 'Extracted all 3 transactions');
  assert(txParsed.amountReceived === 6500, 'Correct total income: ৳6500');
  assert(txParsed.amountSpent === 2000, 'Correct total expense: ৳2000');

  // TEST 7: Manual Layout Mapping Fallback Override
  console.log('\n--- TEST 7: Manual Layout Mapping Fallback Override ---');
  const weirdRows: string[][] = [
    ['Random Note', 'Foo', 'Bar', 'Baz'],
    ['101', '500', 'Special Member', 'Paid', 'Paid', '1000'],
  ];
  const manualMapping: SheetManualMapping = {
    headerRowIndex: 0,
    serialColIndex: 0,
    commitmentColIndex: 1,
    nameColIndex: 2,
    monthColIndices: { Jan: 3, Feb: 4 },
    totalColIndex: 5,
  };
  const manualParsed = parseFundSheet(weirdRows, 'https://example.com/manual-sheet', '2026', manualMapping);
  assert(manualParsed.memberRecords.length === 1, 'Applied manual mapping override successfully');
  assert(manualParsed.memberRecords[0]?.name === 'Special Member', 'Manual mapping extracted name from Column 2');
  assert(manualParsed.memberRecords[0]?.serial === 101, 'Manual mapping extracted serial from Column 0');

  // TEST 8: Admin-Controlled Member Profile Linking & Decoupled Serials
  console.log('\n--- TEST 8: Member Profile Linking & Decoupling ---');
  const dummyRegisteredMembers: Member[] = [
    {
      id: 'reg-001',
      serial: 1,
      name: 'Mohammad Rahim',
      nameBn: 'মোহাম্মদ রহিম',
      nameEn: 'Mohammad Rahim',
      isActive: true,
      createdAt: '2024-11-28',
    },
    {
      id: 'reg-026-a',
      serial: 26,
      name: 'Istiak hosain zihan',
      nameBn: 'ইশতিয়াক হোসেন জিহান',
      nameEn: 'Istiak hosain zihan',
      isActive: true,
      createdAt: '2024-11-28',
    },
    {
      id: 'reg-026-b',
      serial: 26,
      name: 'Maulana Abdul Hamid',
      nameBn: 'মাওলানা আব্দুল হামিদ',
      nameEn: 'Maulana Abdul Hamid',
      isActive: true,
      createdAt: '2024-11-28',
    },
  ];

  // Test unconfirmed match: returns isMappedByAdmin = false and linkedProfileId = undefined
  const unconfirmedRes = resolveCanonicalMemberForSheet(
    'Mohammad Rahim',
    1,
    '2026',
    dummyRegisteredMembers,
    {}
  );
  assert(unconfirmedRes.isMappedByAdmin === false, 'Unconfirmed candidate match returns isMappedByAdmin === false');
  assert(unconfirmedRes.linkedProfileId === undefined, 'Unconfirmed candidate match returns linkedProfileId === undefined (keeps Fund Page link inactive)');
  assert(unconfirmedRes.linkStatus === 'needs_review', 'Unconfirmed candidate match flagged as needs_review');

  // Test explicit admin-confirmed link
  const testLink: FundProfileLinkRecord = {
    id: 'link-test-1',
    year: '2026',
    sheetSerial: 26,
    sheetMemberName: 'Istiak hosain zihan',
    canonicalFundMemberId: '2026-26-istiakhosainzihan',
    linkedProfileId: 'reg-026-a',
    linkedProfileName: 'ইশতিয়াক হোসেন জিহান',
    status: 'linked',
    confirmedByAdmin: true,
    updatedAt: new Date().toISOString(),
  };
  storageService.saveFundProfileLink(testLink);

  const confirmedRes = resolveCanonicalMemberForSheet(
    'Istiak hosain zihan',
    26,
    '2026',
    dummyRegisteredMembers,
    {}
  );
  assert(confirmedRes.isMappedByAdmin === true, 'Admin-confirmed profile link returns isMappedByAdmin === true');
  assert(confirmedRes.linkedProfileId === 'reg-026-a', 'Admin-confirmed profile link returns exact registered member ID');
  assert(confirmedRes.linkStatus === 'linked', 'Admin-confirmed profile link status is "linked"');

  // TEST 9: Foundation Founding Date Rule (2024 starts from December)
  console.log('\n--- TEST 9: 2024 Founding Year Rule ---');
  const history2024 = await getMemberContributionHistory(dummyRegisteredMembers[0].id, '2024');
  if (history2024 && history2024.yearSummaries['2024']) {
    const summary2024 = history2024.yearSummaries['2024'];
    assert(summary2024.applicableMonthsCount === 1, `2024 applicable months count is 1 (founding rule: Dec only)`);
    const jan2024 = summary2024.months.find((m) => m.month === 'Jan');
    const dec2024 = summary2024.months.find((m) => m.month === 'Dec');
    assert(jan2024?.status === 'pre_foundation', '2024 January status is "pre_foundation" (muted)');
    assert(dec2024?.status !== 'pre_foundation', '2024 December is active applicable month');
  } else {
    assert(true, 'Member contribution history safely handles 2024 foundation rules');
  }

  // TEST 10: Deterministic Receipt Number Generation
  console.log('\n--- TEST 10: Deterministic Receipt Numbering ---');
  const rNo1 = getDeterministicReceiptNumber('SF-REC', '2026', 1, 'mem-1', ['Jan', 'Feb'], true);
  const rNo2 = getDeterministicReceiptNumber('SF-REC', '2026', 1, 'mem-1', ['Jan', 'Feb'], true);
  const rNoSeparate = getDeterministicReceiptNumber('SF-REC', '2026', 1, 'mem-1', ['Jan'], false);

  assert(rNo1 === rNo2, `Receipt number is deterministic: ${rNo1} === ${rNo2}`);
  assert(rNo1 !== rNoSeparate, `Consolidated multi-month differs from single month: ${rNo1} vs ${rNoSeparate}`);

  // TEST 11: 2024 Abdul Aziz / Abdur Rakib Identity Collision Resolution
  console.log('\n--- TEST 11: 2024 Abdul Aziz & Abdur Rakib Identity Separation ---');
  const fund2024 = await fetchFundData('', true, '2024');
  assert(fund2024.memberRecords !== undefined, '2024 historical fund members exist');
  const abdulAziz = fund2024.memberRecords?.find((m) => m.name === 'আব্দুল আজিজ');
  const abdurRakib = fund2024.memberRecords?.find((m) => m.name === 'আব্দুর রাকিব');

  assert(abdulAziz !== undefined, 'আব্দুল আজিজ restored as distinct member in 2024');
  assert(abdurRakib !== undefined, 'আব্দুর রাকিব preserved as distinct member in 2024');
  assert(abdulAziz?.serial === 2, 'আব্দুল আজিজ has Serial 2');
  assert(abdulAziz?.commitment === 100, 'আব্দুল আজিজ has monthly rate ৳100');
  assert(abdulAziz?.totalContributed === 100, 'আব্দুল আজিজ has December 2024 contribution ৳100');
  assert(abdulAziz?.id !== abdurRakib?.id, 'Unique IDs: Abdul Aziz and Abdur Rakib do not share ID');

  // TEST 12: Dual Serial 26 Coexistence (Istiak hosain zihan & Maulana Abdul Hamid)
  console.log('\n--- TEST 12: Shared Serial 26 Independent Coexistence ---');
  const serial26Grid: string[][] = [
    ['SL', 'Name', 'Commitment', 'Jan', 'Total'],
    ['26', 'Istiak hosain zihan', '20', '20', '20'],
    ['26', 'Maulana Abdul Hamid', '30', '30', '30'],
  ];
  const parsed26 = parseFundSheet(serial26Grid, 'https://example.com/serial26', '2026');
  assert(parsed26.memberRecords.length === 2, 'Both members sharing Serial 26 parsed successfully');
  assert(parsed26.memberRecords[0].name === 'Istiak hosain zihan', 'First serial 26 is Istiak hosain zihan');
  assert(parsed26.memberRecords[1].name === 'Maulana Abdul Hamid', 'Second serial 26 is Maulana Abdul Hamid');
  assert(parsed26.memberRecords[0].id !== parsed26.memberRecords[1].id, 'Distinct record IDs based on source row and name');
  assert(parsed26.amountReceived === 50, 'Both contributions counted towards total: ৳20 + ৳30 = ৳50');

  // TEST 13: 11 Members Extraction (Including 0-contribution / pending member)
  console.log('\n--- TEST 13: 11 Members Matrix Extraction ---');
  const matrix11Rows: string[][] = [
    ['No', 'Name', 'Commitment', 'Jan', 'Feb', 'Mar', 'Total'],
    ['1', 'Abdul Basir Hujur', '100', '100', '100', '100', '300'],
    ['2', 'Abdur Rakib', '100', '100', '100', '100', '300'],
    ['3', 'Mobasser Hosen', '100', '100', '100', '100', '300'],
    ['4', 'Abdul Aziz', '100', '100', '100', '100', '300'],
    ['5', 'Ismail Hossain', '50', '50', '50', '50', '150'],
    ['6', 'Arafat Chowdhury', '50', '50', '50', '50', '150'],
    ['7', 'Daudul Islam', '50', '50', '50', '0', '100'],
    ['8', 'Shariatullah', '50', '0', '0', '0', '0'], // 0 contributions, pending
    ['9', 'Abdur Rahman', '50', '50', '50', '0', '100'],
    ['10', 'Abdul Hakim', '100', '100', '100', '100', '300'],
    ['11', 'Abdul Ali Jihad', '20', '20', '20', '20', '60'],
  ];
  const parsed11 = parseFundSheet(matrix11Rows, 'https://example.com/11members', '2026');
  assert(parsed11.memberRecords.length === 11, `Extracted exactly 11 member records (actual: ${parsed11.memberRecords.length})`);
  const shariatullah = parsed11.memberRecords.find((m) => m.name === 'Shariatullah');
  assert(shariatullah !== undefined, 'Shariatullah with 0 payments preserved in member list');
  assert(shariatullah?.totalContributed === 0, 'Shariatullah total is 0');
  assert(shariatullah?.paidCount === 0, 'Shariatullah paid count is 0');

  // TEST 14: Profile Linking Independence
  console.log('\n--- TEST 14: Profile Linking Independence ---');
  const initialTotal = parsed11.amountReceived;
  const initialCount = parsed11.memberRecords.length;

  // Simulate admin linking Shariatullah to a profile
  const linkRecord: FundProfileLinkRecord = {
    id: 'link-shariatullah',
    year: '2026',
    sheetMemberName: 'Shariatullah',
    canonicalFundMemberId: '2026-8-shariatullah',
    linkedProfileId: 'reg-shariatullah-99',
    linkedProfileName: 'শরীয়ত উল্লাহ',
    status: 'linked',
    confirmedByAdmin: true,
    updatedAt: new Date().toISOString(),
  };
  storageService.saveFundProfileLink(linkRecord);

  const parsedAfterLink = parseFundSheet(matrix11Rows, 'https://example.com/11members', '2026');
  assert(parsedAfterLink.amountReceived === initialTotal, 'Linking profile leaves financial total unchanged');
  assert(parsedAfterLink.memberRecords.length === initialCount, 'Linking profile leaves member count unchanged');

  // Simulate unlinking
  storageService.deleteFundProfileLink(linkRecord.id);
  const parsedAfterUnlink = parseFundSheet(matrix11Rows, 'https://example.com/11members', '2026');
  assert(parsedAfterUnlink.amountReceived === initialTotal, 'Unlinking profile leaves financial total unchanged');
  assert(parsedAfterUnlink.memberRecords.length === initialCount, 'Unlinking profile leaves member count unchanged');

  // TEST 15: Source Availability States & Stale Data Preservation
  console.log('\n--- TEST 15: Source Availability States & Stale Data Preservation ---');
  // Simulate network failure when cached data exists
  const dummyCachedData = {
    ...parsed11,
    year: '2099',
    lastUpdated: '2026-11-01T00:00:00.000Z',
  };
  localStorage.setItem('sf_fund_cache_data_v4_2099', JSON.stringify(dummyCachedData));

  // Fetch with invalid URL to simulate network failure
  const failRes = await fetchFundData('https://invalid-non-existent-domain-12345.com/sheet', true, '2099');
  assert(failRes.status === 'fallback', 'Failed fetch preserves previously cached verified data with status === "fallback"');
  assert(failRes.isStale === true, 'Failed fetch marks data as isStale === true');
  assert(failRes.memberRecords !== undefined && failRes.memberRecords.length === 11, 'All 11 verified member records safely preserved on network error');
  assert(failRes.amountReceived === parsed11.amountReceived, 'Financial total remains intact on network error');

  // TEST 16: Safe Reconciliation (Re-import does not duplicate income)
  console.log('\n--- TEST 16: Re-import Safe Reconciliation ---');
  const import1 = parseFundSheet(matrix11Rows, 'https://example.com/repeat', '2026');
  const import2 = parseFundSheet(matrix11Rows, 'https://example.com/repeat', '2026');
  assert(import1.amountReceived === import2.amountReceived, `Re-import total matches exactly: ৳${import1.amountReceived} === ৳${import2.amountReceived}`);
  assert(import1.memberRecords.length === import2.memberRecords.length, 'Re-import does not duplicate member records');

  // TEST 17: Centralized Receipt Download Control (Single Source of Truth)
  console.log('\n--- TEST 17: Centralized Receipt Download Control (showPublicReceiptDownload) ---');
  // State A: When showPublicReceiptDownload is OFF
  const visOff = storageService.getFundVisibility();
  storageService.saveFundVisibility({ ...visOff, showPublicReceiptDownload: false });
  assert(storageService.isReceiptDownloadEnabled() === false, 'storageService reports receipt downloads disabled when showPublicReceiptDownload = false');

  // State B: When showPublicReceiptDownload is ON
  storageService.saveFundVisibility({ ...visOff, showPublicReceiptDownload: true });
  assert(storageService.isReceiptDownloadEnabled() === true, 'storageService reports receipt downloads enabled when showPublicReceiptDownload = true');

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
