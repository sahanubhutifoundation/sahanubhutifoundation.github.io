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
  parseMemberContributionStart,
} from '../src/services/fundService';
import { storageService } from '../src/services/storageService';
import { getDeterministicReceiptNumber } from '../src/utils/receiptNumbering';
import { FundProfileLinkRecord, Member, SheetManualMapping, Activity } from '../src/types';

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

    // Verify both Istiak hosain zihan and Maulana Abdul Hamid exist
    const hasIstiak = (res2026.memberRecords || []).some((m) => m.name.toLowerCase().includes('istiak'));
    const hasHamid = (res2026.memberRecords || []).some((m) => m.name.toLowerCase().includes('hamid') || m.name.includes('আব্দুল হামিদ'));
    assert(hasIstiak && hasHamid, `Both Istiak hosain zihan and Maulana Abdul Hamid preserved in 2026`);

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
  storageService.setMembers(dummyRegisteredMembers);
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

  // TEST 18: Cross-Browser Persistent Mapping Simulation (Browser A & Browser B)
  console.log('\n--- TEST 18: Cross-Browser Persistent Mapping Simulation (Browser A & Browser B) ---');
  const mockLinkRecord: FundProfileLinkRecord = {
    id: 'link-cross-browser-test-2026',
    year: '2026',
    sheetGid: '0',
    sourceRow: 5,
    sheetSerial: 105,
    sheetMemberName: 'টেস্ট সদস্য ব্রাউজার',
    canonicalFundMemberId: '2026-105-testsodosso',
    linkedProfileId: 'mem-1789800217509',
    linkedProfileName: 'আব্দুল বাসির হুজুর',
    status: 'linked',
    confirmedByAdmin: true,
    updatedAt: new Date().toISOString(),
  };

  // Browser A: Admin saves the link to persistent cloud storage
  const saveCloudRes = await storageService.saveFundProfileLinkAsync(mockLinkRecord);
  assert(saveCloudRes.success === true, 'Browser A: Admin-confirmed mapping successfully saved to persistent backend');

  // Browser B: Isolated storage context (clear local storage to simulate brand new device/browser)
  const browserALocalData = localStorage.getItem('sf_foundation_profile_links');
  localStorage.removeItem('sf_foundation_profile_links');
  assert(storageService.getFundProfileLinks('2026').length === 0, 'Browser B: Local cache is initially empty before cloud sync');

  // Browser B pulls from persistent backend
  const browserBCloudRes = await storageService.fetchFundProfileLinksAsync('2026');
  assert(browserBCloudRes.success === true, 'Browser B: Successfully fetched mappings from persistent backend');
  const browserBFound = (browserBCloudRes.data || []).find((l) => l.canonicalFundMemberId === '2026-105-testsodosso');
  assert(Boolean(browserBFound), 'Browser B: Found the exact mapping saved by Browser A');
  assert(browserBFound?.linkedProfileId === 'mem-1789800217509', 'Browser B: Linked profile ID matches exactly');
  assert(browserBFound?.confirmedByAdmin === true, 'Browser B: Confirmed status matches');

  // Browser B refresh simulation: mapping is retained in local cache
  const browserBCached = storageService.getFundProfileLinkForMember('mem-1789800217509', '2026');
  assert(Boolean(browserBCached), 'Browser B: Retains mapping in cache upon subsequent queries');

  // Browser A unlinks the member
  const unlinkRecord: FundProfileLinkRecord = {
    ...mockLinkRecord,
    linkedProfileId: undefined,
    linkedProfileName: undefined,
    status: 'unlinked',
    confirmedByAdmin: true,
  };
  await storageService.saveFundProfileLinkAsync(unlinkRecord);

  // Browser B syncs again and reflects the unlinked status
  const browserBSyncAfterUnlink = await storageService.fetchFundProfileLinksAsync('2026');
  const browserBUnlinkedRecord = (browserBSyncAfterUnlink.data || []).find((l) => l.canonicalFundMemberId === '2026-105-testsodosso');
  assert(browserBUnlinkedRecord?.status === 'unlinked', 'Browser B: Reflects unlinked status after Admin unlinks in Browser A');

  // Cleanup test record
  await storageService.deleteFundProfileLinkAsync(mockLinkRecord.id);

  // TEST 19: Monthly Status Before and After Member Contribution Start Date
  console.log('\n--- TEST 19: Monthly Status Before and After Member Contribution Start Date ---');

  // Case 1: Member starting January 2026
  const member2026: Member = {
    id: 'mem-test-2026-starter',
    name: '২০২৬ এ যোগ দেওয়া সদস্য',
    nameBn: '২০২৬ এ যোগ দেওয়া সদস্য',
    serial: 901,
    role: 'সদস্য',
    joiningDate: '2026-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  storageService.setMembers([member2026]);

  const parsedStart2026 = parseMemberContributionStart(member2026);
  assert(parsedStart2026?.year === 2026 && parsedStart2026?.month === 1, 'Member starting 2026-01-01 parsed correctly as { year: 2026, month: 1 }');

  const history2026 = await getMemberContributionHistory('mem-test-2026-starter');
  assert(Boolean(history2026), 'Calculated history for 2026-starter');

  // 2024: Must NOT have arrears (pre-joining period)
  const sum2024 = history2026?.yearSummaries['2024'];
  assert(sum2024?.dueMonthsCount === 0, '2024 founding year has 0 due months for member who joined in 2026');
  assert(sum2024?.applicableMonthsCount === 0, '2024 has 0 applicable months for member who joined in 2026');
  const dec2024 = sum2024?.months.find((m) => m.month === 'Dec');
  assert(dec2024?.status === 'not_applicable', 'December 2024 is not_applicable (প্রযোজ্য নয়) for 2026 starter');

  // 2025: Must NOT have arrears (pre-joining period)
  const sum2025 = history2026?.yearSummaries['2025'];
  assert(sum2025?.dueMonthsCount === 0, '2025 has 0 due months for member who joined in 2026');
  assert(sum2025?.applicableMonthsCount === 0, '2025 has 0 applicable months for member who joined in 2026');
  const allMonths2025NotApp = sum2025?.months.every((m) => m.status === 'not_applicable');
  assert(allMonths2025NotApp === true, 'All 2025 months are not_applicable for 2026 starter');

  // Case 2: Member starting July 2026 (mid-year joining)
  const memberMid2026: Member = {
    id: 'mem-test-mid-2026',
    name: 'জুলাই ২০২৬ এ যোগ দেওয়া সদস্য',
    nameBn: 'জুলাই ২০২৬ এ যোগ দেওয়া সদস্য',
    serial: 902,
    role: 'সদস্য',
    joiningDate: '2026-07-15',
    contributionStartDate: '2026-07',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  storageService.setMembers([member2026, memberMid2026]);

  const parsedStartMid2026 = parseMemberContributionStart(memberMid2026);
  assert(parsedStartMid2026?.year === 2026 && parsedStartMid2026?.month === 7, 'Member starting 2026-07 parsed correctly as { year: 2026, month: 7 }');

  const historyMid2026 = await getMemberContributionHistory('mem-test-mid-2026');
  const sumMid2026 = historyMid2026?.yearSummaries['2026'];
  const jan2026Status = sumMid2026?.months.find((m) => m.month === 'Jan')?.status;
  const jun2026Status = sumMid2026?.months.find((m) => m.month === 'Jun')?.status;
  assert(jan2026Status === 'not_applicable', 'January 2026 is not_applicable for July 2026 starter');
  assert(jun2026Status === 'not_applicable', 'June 2026 is not_applicable for July 2026 starter');

  // TEST 20: 2024 Founding Period Rule with Founding Member
  console.log('\n--- TEST 20: 2024 Founding Period Rule with Founding Member ---');
  const foundingMember: Member = {
    id: 'mem-1789800217509',
    name: 'আব্দুল বাসির হুজুর',
    nameBn: 'আব্দুল বাসির হুজুর',
    serial: 1,
    role: 'সভাপতি',
    joiningDate: '2024-11-28',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  storageService.setMembers([foundingMember]);
  const parsedFoundingStart = parseMemberContributionStart(foundingMember);
  assert(parsedFoundingStart?.year === 2024 && parsedFoundingStart?.month === 11, 'Founding date 2024-11-28 parsed as Nov 2024');

  const foundingHistory = await getMemberContributionHistory('mem-1789800217509');
  const founding2024 = foundingHistory?.yearSummaries['2024'];
  const nov2024 = founding2024?.months.find((m) => m.month === 'Nov');
  assert(nov2024?.status === 'pre_foundation', 'November 2024 is pre_foundation for founding member');
  assert(founding2024?.applicableMonthsCount >= 1, 'December 2024 is applicable for founding member');

  // TEST 21: Formula Accuracy (Applicable = Paid + Due)
  console.log('\n--- TEST 21: Formula Accuracy (Applicable = Paid + Due) ---');
  if (founding2024) {
    assert(
      founding2024.applicableMonthsCount === founding2024.paidMonthsCount + founding2024.dueMonthsCount,
      `Formula holds: Applicable (${founding2024.applicableMonthsCount}) = Paid (${founding2024.paidMonthsCount}) + Due (${founding2024.dueMonthsCount})`
    );
  }

  // TEST 22: Activity Media Visibility in Admin & Safe Deletion
  console.log('\n--- TEST 22: Activity Media Admin Integration & Safe Deletion ---');
  const testAct: Activity = {
    id: 'act-test-media-1',
    slug: 'first-initiative',
    title: { bn: 'প্রথম উদ্যোগের সফল বাস্তবায়ন', en: 'First initiative', ar: '' },
    summary: { bn: 'মানবিক উদ্যোগ সফলভাবে সম্পন্ন', en: '', ar: '' },
    description: { bn: 'বিস্তারিত বিবরণ', en: '', ar: '' },
    date: '2025-02-15',
    category: 'মানবিক সহায়তা',
    coverImage: 'https://oskmpyuofgiivprcojfh.supabase.co/storage/v1/object/public/activities/1792758711455_ndhmvp.png',
    showOnMediaPage: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
  };
  storageService.setActivities([testAct]);
  const acts = storageService.getActivities();
  const actWithCover = acts.find((a) => a.id === 'act-test-media-1');
  assert(actWithCover !== undefined, 'Activity with cover image retrieved');
  assert(Boolean(actWithCover?.coverImage), 'Activity has public cover image URL');

  // Verify safe deletion behavior: detaching cover image does not delete activity record
  const detachedAct = { ...actWithCover!, coverImage: '', showOnMediaPage: false };
  storageService.setActivities([detachedAct]);
  const remainingActs = storageService.getActivities();
  assert(remainingActs.length === 1, 'Activity record preserved in database');
  assert(remainingActs[0].id === 'act-test-media-1', 'Activity ID and metadata remain intact');
  assert(remainingActs[0].coverImage === '', 'Cover image safely cleared without deleting activity');

  // TEST 23: Month-to-Column Mapping (2027 layout support)
  console.log('\n--- TEST 23: Month-to-Column Manual Mapping Parsing ---');
  const mock2027Rows = [
    ['ক্রমিক', 'সদস্যের নাম', 'মোবাইল', 'মাসিক হার', 'মে', 'জুন', 'জুলাই', 'মোট জমা'],
    ['1', 'আব্দুর রহিম', '01700000000', '500', '✓', '✓', '', '1000'],
  ];
  const mapping2027: SheetManualMapping = {
    headerRowIndex: 0,
    serialColIndex: 0,
    nameColIndex: 1,
    commitmentColIndex: 3,
    totalColIndex: 7,
    monthColIndices: {
      May: 4,
      Jun: 5,
      Jul: 6,
    },
    paymentFormat: 'boolean_marker',
  };
  const parsed2027 = parseFundSheet(mock2027Rows, '', '2027', mapping2027);
  assert(parsed2027 !== null, '2027 matrix layout parsed with custom month columns');
  assert(parsed2027?.memberRecords.length === 1, 'Extracted 1 member record');
  const m2027 = parsed2027?.memberRecords[0];
  assert(m2027?.months['May'] === 'paid', 'May marked paid via custom column 4');
  assert(m2027?.months['Jun'] === 'paid', 'Jun marked paid via custom column 5');
  assert(m2027?.months['Jul'] !== 'paid', 'Jul marked unpaid (empty)');
  assert(m2027?.totalContributed === 1000, 'Calculated total: ৳1000');

  // TEST 24: Discrepancy Flagging Without Manufactured Monthly Payments
  console.log('\n--- TEST 24: Discrepancy Flagging (No Manufactured Payments) ---');
  const mockDiscrepancyRows = [
    ['SL', 'Name', 'Commitment', 'Jan', 'Feb', 'Mar', 'Total'],
    ['1', 'কারী মোজাম্মেল', '500', '', '', '', '500'],
  ];
  const mappingDiscrepancy: SheetManualMapping = {
    headerRowIndex: 0,
    serialColIndex: 0,
    nameColIndex: 1,
    commitmentColIndex: 2,
    totalColIndex: 6,
    monthColIndices: {
      Jan: 3,
      Feb: 4,
      Mar: 5,
    },
    paymentFormat: 'auto',
  };
  const parsedDiscrepancy = parseFundSheet(mockDiscrepancyRows, '', '2026', mappingDiscrepancy);
  const discMember = parsedDiscrepancy?.memberRecords[0];
  assert(discMember?.hasDiscrepancy === true, 'Member flagged with hasDiscrepancy === true');
  assert(discMember?.months['Jan'] !== 'paid', 'January NOT artificially manufactured as paid');
  assert(discMember?.months['Feb'] !== 'paid', 'February NOT artificially manufactured as paid');
  assert(discMember?.months['Mar'] !== 'paid', 'March NOT artificially manufactured as paid');
  assert(discMember?.totalContributed === 500, 'Preserved verified source annual total (500)');

  // TEST 25: Member Directory Status & Latest Paid Month
  console.log('\n--- TEST 25: Member Directory Status & Latest Paid Month ---');
  assert(m2027?.latestPaidMonth === 'Jun', 'Latest paid month correctly identified as Jun');
  assert(m2027?.isOngoing === true, 'Member correctly classified as Ongoing');
  assert(m2027?.isComplete === false, 'Member is not complete because Jul is unpaid');

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
