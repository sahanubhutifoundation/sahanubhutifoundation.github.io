/**
 * Converts numeric amounts (in Bangladeshi Taka) into written Bengali words.
 * Example: 500 -> "পাঁচশত টাকা মাত্র"
 *          1500 -> "এক হাজার পাঁচশত টাকা মাত্র"
 */

const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumeral(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d, 10)]);
}

const units = [
  '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
  'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
  'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ', 'ত্রিশ',
  'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ', 'চল্লিশ',
  'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ', 'পঞ্চাশ',
  'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট', 'ষাট',
  'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর', 'সত্তর',
  'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনাশি', 'আশি',
  'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টআশি', 'ঊননব্বই', 'নব্বই',
  'একানব্বই', 'বানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

function convertLessThanThousand(n: number): string {
  let result = '';
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    if (hundreds === 1) {
      result += 'একশত ';
    } else if (hundreds === 2) {
      result += 'দুইশত ';
    } else {
      result += units[hundreds] + 'শত ';
    }
    n %= 100;
  }
  if (n > 0) {
    result += units[n] + ' ';
  }
  return result.trim();
}

/**
 * Converts a positive number to Bengali words with "টাকা মাত্র" suffix.
 */
export function numberToBengaliWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) {
    return 'শূন্য টাকা মাত্র';
  }

  const rounded = Math.floor(amount);
  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  let rest = remainder % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(convertLessThanThousand(crore) + ' কোটি');
  }
  if (lakh > 0) {
    parts.push(convertLessThanThousand(lakh) + ' লাখ');
  }
  if (thousand > 0) {
    parts.push(convertLessThanThousand(thousand) + ' হাজার');
  }
  if (rest > 0) {
    parts.push(convertLessThanThousand(rest));
  }

  const words = parts.join(' ').trim();
  return words ? `${words} টাকা মাত্র` : 'শূন্য টাকা মাত্র';
}

export const BENGALI_MONTH_NAMES: Record<string, string> = {
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
  jan: 'জানুয়ারি',
  feb: 'ফেব্রুয়ারি',
  mar: 'মার্চ',
  apr: 'এপ্রিল',
  may: 'মে',
  jun: 'জুন',
  jul: 'জুলাই',
  aug: 'আগস্ট',
  sep: 'সেপ্টেম্বর',
  oct: 'অক্টোবর',
  nov: 'নভেম্বর',
  dec: 'ডিসেম্বর'
};

export const ORDERED_MONTH_KEYS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
