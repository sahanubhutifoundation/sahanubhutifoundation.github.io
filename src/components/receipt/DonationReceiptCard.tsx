import React from 'react';
import { FoundationConfig, Member } from '../../types';
import { toBengaliNumeral, numberToBengaliWords, BENGALI_MONTH_NAMES } from '../../utils/bengaliWords';
import { ShieldCheck, HeartHandshake, CheckCircle2 } from 'lucide-react';

export interface ReceiptData {
  receiptNumber: string;
  issueDate: string; // formatted date string
  year: string;
  months: string[]; // e.g. ['Jan', 'Feb']
  periodLabel: string; // e.g. "জানুয়ারি ২০২৬" or "জানুয়ারি - মার্চ ২০২৬"
  member: Member;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}

interface DonationReceiptCardProps {
  receipt: ReceiptData;
  config: FoundationConfig;
  cardRef?: React.RefObject<HTMLDivElement>;
  isWatermarkEnabled?: boolean;
}

export const DonationReceiptCard: React.FC<DonationReceiptCardProps> = ({
  receipt,
  config,
  cardRef,
  isWatermarkEnabled = true,
}) => {
  const settings = config.donationReceiptSettings;
  const labels = settings?.labels || {};
  const visibility = settings?.fieldVisibility || {
    showAddress: true,
    showPhone: true,
    showDonorSerial: true,
    showWordsAmount: true,
    showCollectorSignature: true,
    showWatermark: true,
    showNotes: true,
    showDisclaimer: true,
  };

  const orgNameBn = labels.organizationNameBangla || config.nameBn || 'সহানুভূতি ফাউন্ডেশন';
  const orgNameEn = labels.organizationNameEnglish || config.nameEn || 'Sahanubhuti Foundation';
  const sloganBn = labels.sloganBangla || 'মানবতার সেবায় নিয়োজিত';
  const address = labels.organizationAddress || config.originLocation || 'মৌলভী বাড়ি, শর্শদী, ফেনী সদর, ফেনী';
  const receiptTitle = labels.receiptTitle || 'দান গ্রহণ রসিদ';
  const thankYouMessage = labels.thankYouMessage || 'ধন্যবাদসহ গ্রহণ করা হলো। আপনার অনুদান মানবতার কল্যাণে ব্যবহৃত হবে।';
  const signatureLabel = labels.signatureLabel || 'আদায়কারী / অনুমোদিত স্বাক্ষর';
  const disclaimerText = labels.disclaimerText || 'এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল রসিদ।';

  const logoSrc = config.logoUrl || '/assets/logo.png';

  const monthNamesBn = receipt.months
    .map((m) => BENGALI_MONTH_NAMES[m] || m)
    .join(', ');

  const bengaliAmount = toBengaliNumeral(receipt.amount.toLocaleString('en-IN'));
  const amountInWords = numberToBengaliWords(receipt.amount);

  const signatureImg = settings?.signatureImageUrl;
  const sigWidth = settings?.signatureWidth || 140;

  return (
    <div
      ref={cardRef}
      id="printable-donation-receipt"
      className="relative bg-white text-emerald-950 p-7 rounded-xl shadow-xl border-4 border-double border-emerald-800/40 w-[680px] select-none overflow-visible"
      style={{
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#062817',
        borderColor: '#1e6b4d',
        width: '680px',
        minWidth: '680px',
        maxWidth: '680px',
        fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif",
        lineHeight: 1.6,
      }}
    >
      {/* Background Watermark */}
      {visibility.showWatermark && isWatermarkEnabled && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none z-0"
          aria-hidden="true"
        >
          <img
            src={logoSrc}
            alt=""
            className="w-72 h-72 object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )}

      {/* Decorative inner frame */}
      <div
        className="relative z-10 border border-emerald-900/20 rounded-lg p-5 bg-gradient-to-b from-emerald-50/20 via-white to-emerald-50/30 overflow-visible"
        style={{
          borderColor: 'rgba(6, 40, 23, 0.2)',
          boxSizing: 'border-box',
        }}
      >
        
        {/* Header Section */}
        <div className="border-b-2 border-emerald-800/30 pb-3.5 mb-3.5">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img
                src={logoSrc}
                alt={orgNameBn}
                className="w-20 h-20 object-contain rounded-lg p-1 bg-white border border-emerald-100 shadow-sm"
                crossOrigin="anonymous"
              />
            </div>

            {/* Foundation Names and Motto */}
            <div className="flex-1 text-center min-w-0 px-2">
              <h1 className="text-3xl font-extrabold text-emerald-900 tracking-tight leading-tight break-words">
                {orgNameBn}
              </h1>
              <h2 className="text-sm font-semibold text-emerald-700/80 tracking-wide uppercase mt-0.5 break-words">
                {orgNameEn}
              </h2>
              <p className="text-xs text-emerald-800 font-medium italic mt-1 bg-emerald-100/60 inline-flex items-center justify-center px-3.5 py-1 rounded-full max-w-full break-words leading-normal">
                {sloganBn}
              </p>
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed break-words">
                {address}
              </p>
            </div>

            {/* Official Seal / Badge - Permanent across all devices */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 text-emerald-800 border border-emerald-700/30 bg-emerald-50/60 rounded-full w-16 h-16 p-1 text-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-emerald-700 mb-0.5" />
              <span className="text-[9px] font-bold uppercase text-emerald-800">অফিসিয়াল</span>
            </div>
          </div>
        </div>

        {/* Title Banner */}
        <div className="flex items-center justify-center my-3">
          <div
            className="relative inline-flex items-center justify-center text-center px-8 py-2.5 min-h-[46px] bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white rounded-md shadow-sm"
            style={{ boxSizing: 'border-box' }}
          >
            <span className="text-lg font-bold px-2 leading-normal flex items-center justify-center">
              {receiptTitle}
            </span>
          </div>
        </div>

        {/* Receipt Meta (No, Date, Period) */}
        <div className="grid grid-cols-3 gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-md p-3 text-xs text-emerald-950 mb-3.5 shadow-sm">
          <div className="min-w-0">
            <span className="text-gray-500 font-medium block text-[11px] leading-normal">রসিদ নম্বর:</span>
            <span className="font-mono font-bold text-emerald-900 text-sm tracking-wide break-words block mt-1 leading-normal">
              {receipt.receiptNumber}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-gray-500 font-medium block text-[11px] leading-normal">ইস্যুর তারিখ:</span>
            <span className="font-semibold text-emerald-900 text-xs block mt-1 break-words leading-normal">
              {receipt.issueDate}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-gray-500 font-medium block text-[11px] leading-normal">আর্থিক বছর ও সময়:</span>
            <span className="font-semibold text-emerald-900 text-xs block mt-1 break-words leading-normal">
              {receipt.periodLabel}
            </span>
          </div>
        </div>

        {/* Member / Donor Information Box */}
        <div className="border border-emerald-200 rounded-md p-3 mb-3.5 bg-white/90 shadow-sm text-sm">
          <div className="grid grid-cols-2 gap-2.5 items-start">
            <div className="min-w-0">
              <span className="text-gray-500 text-xs block leading-normal">সদস্য / দাতার নাম:</span>
              <div className="font-bold text-emerald-950 text-base break-words mt-1 leading-normal">
                <span>{receipt.member.nameBn || (typeof receipt.member.name === 'string' ? receipt.member.name : '') || 'সম্মানিত সদস্য'}</span>
                {receipt.member.nameEn && (
                  <span className="text-xs font-normal text-gray-500 ml-1.5 inline-block">
                    ({receipt.member.nameEn})
                  </span>
                )}
              </div>
            </div>

            {visibility.showDonorSerial && (
              <div className="min-w-0 text-right">
                <span className="text-gray-500 text-xs block leading-normal">সদস্য ক্রমিক নম্বর:</span>
                <div className="font-semibold text-emerald-900 mt-1 font-mono text-sm leading-normal">
                  {receipt.member.serial ? `#${toBengaliNumeral(receipt.member.serial)}` : (receipt.member.id ? `#${receipt.member.id.slice(-4)}` : '—')}
                </div>
              </div>
            )}

            {visibility.showAddress && (receipt.member.addressBn || receipt.member.address || receipt.member.location) && (
              <div className="col-span-2 min-w-0 border-t border-emerald-100 pt-2 mt-1">
                <span className="text-gray-500 text-xs block leading-normal">গ্রাম / ঠিকানা:</span>
                <div className="text-gray-800 text-xs mt-1 break-words leading-normal">
                  {receipt.member.addressBn || receipt.member.address || receipt.member.location}
                </div>
              </div>
            )}

            {visibility.showPhone && receipt.member.phone && (
              <div className="col-span-2 min-w-0 pt-1.5 mt-1 border-t border-emerald-50">
                <span className="text-gray-500 text-xs block leading-normal">মোবাইল:</span>
                <div className="text-gray-800 text-xs mt-1 font-mono leading-normal">
                  {receipt.member.phone}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contribution Details & Particulars Table */}
        <div className="border border-emerald-300/80 rounded-md overflow-visible mb-3.5 shadow-sm bg-white">
          <table className="w-full text-left text-sm table-fixed border-collapse">
            <thead className="bg-emerald-800 text-white font-medium text-xs">
              <tr>
                <th className="py-2.5 px-3 w-[46%] align-middle leading-normal rounded-tl-[4px]">বিবরণ / অনুদানের খাত</th>
                <th className="py-2.5 px-3 w-[30%] text-center align-middle leading-normal">অন্তর্ভুক্ত মাস</th>
                <th className="py-2.5 px-3 w-[24%] text-right align-middle leading-normal rounded-tr-[4px]">পরিমাণ (টাকা)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              <tr>
                <td className="py-2.5 px-3 align-middle min-w-0">
                  <div className="font-semibold text-emerald-950 break-words leading-normal">
                    ফাউন্ডেশন মাসিক কল্যাণ তহবিল চাঁদা
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 break-words leading-normal">
                    নিয়মিত মাসিক সঞ্চয় ও মানবকল্যাণ তহবিল
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center text-xs text-gray-700 font-medium align-middle break-words min-w-0 leading-normal">
                  {monthNamesBn} {toBengaliNumeral(receipt.year)}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-900 text-base align-middle whitespace-nowrap leading-normal">
                  ৳{bengaliAmount}
                </td>
              </tr>

              {/* Total Row */}
              <tr className="bg-emerald-50/80 font-bold border-t-2 border-emerald-300">
                <td colSpan={2} className="py-2.5 px-3 text-right text-emerald-950 text-sm align-middle leading-normal">
                  সর্বমোট গৃহীত পরিমাণ:
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-950 text-lg whitespace-nowrap align-middle leading-normal">
                  ৳{bengaliAmount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Bengali Words Banner */}
        {visibility.showWordsAmount && (
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-md p-2.5 mb-3.5 text-xs flex items-baseline gap-2 shadow-sm min-w-0">
            <span className="font-bold text-emerald-900 flex-shrink-0 leading-normal">কথায়:</span>
            <span className="font-semibold text-emerald-950 italic break-words flex-1 min-w-0 leading-normal">
              {amountInWords}
            </span>
          </div>
        )}

        {/* Verification Status Pill */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3 bg-white py-2.5 px-3 rounded-md border border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold leading-normal">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="leading-normal">জমার স্থিতি: শতভাগ পরিশোধিত ও সংরক্ষিত</span>
          </div>
          <div className="text-[11px] text-gray-500 font-mono leading-normal">
            স্বীকৃতি আইডি: {receipt.receiptNumber}
          </div>
        </div>

        {/* Thank You Note */}
        <div className="text-center text-xs font-medium text-emerald-900 py-2.5 px-3 mb-3.5 border-y border-dashed border-emerald-300 bg-emerald-50/30">
          <p className="flex items-center justify-center gap-1.5 leading-normal">
            <HeartHandshake className="w-4 h-4 text-emerald-600 inline flex-shrink-0" />
            <span className="break-words leading-normal">{thankYouMessage}</span>
          </p>
        </div>

        {/* Footer & Signature Section */}
        <div className="mt-5 pt-2 flex items-end justify-between gap-4">
          {/* Disclaimer & Notice */}
          <div className="text-[10px] text-gray-500 max-w-[340px] text-left leading-normal min-w-0">
            {visibility.showDisclaimer && <p className="break-words leading-normal">{disclaimerText}</p>}
            <p className="mt-1 text-gray-400 break-words leading-normal">
              ফাউন্ডেশনের সকল হিসাব গুগল শিট ও অনলাইনে সার্বক্ষণিক সংরক্ষিত।
            </p>
          </div>

          {/* Signature Box */}
          {visibility.showCollectorSignature && (
            <div className="flex flex-col items-center justify-end text-center flex-shrink-0 min-w-[150px]">
              <div className="h-14 flex items-end justify-center mb-1">
                {signatureImg ? (
                  <img
                    src={signatureImg}
                    alt="অনুমোদিত স্বাক্ষর"
                    style={{ width: `${sigWidth}px`, maxHeight: '52px' }}
                    className="object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-gray-300 italic text-[11px] select-none">
                    [অনুমোদিত স্বাক্ষরকারী]
                  </div>
                )}
              </div>
              <div className="w-40 border-t border-emerald-900/60 pt-1.5 text-center">
                <span className="text-[11px] font-bold text-emerald-900 block leading-normal">
                  {signatureLabel}
                </span>
                <span className="text-[10px] text-gray-500 block leading-normal mt-0.5">
                  {orgNameBn}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
