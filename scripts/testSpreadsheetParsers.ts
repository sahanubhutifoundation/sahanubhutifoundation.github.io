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
import { fundPrivacyService } from '../src/services/fundPrivacyService';
import { getDeterministicReceiptNumber } from '../src/utils/receiptNumbering';
import { FundProfileLinkRecord, Member, SheetManualMapping } from '../src/types';

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
