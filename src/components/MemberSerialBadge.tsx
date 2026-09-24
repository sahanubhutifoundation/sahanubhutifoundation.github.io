import React from 'react';
import { FoundationConfig } from '../types';
import { toBengaliDigits, toArabicDigits } from '../utils/foundationHelpers';

interface MemberSerialBadgeProps {
  serial: number;
  config?: FoundationConfig;
  language?: string;
  className?: string;
  isAbsolute?: boolean;
}

export const MemberSerialBadge: React.FC<MemberSerialBadgeProps> = ({
  serial,
  config,
  language = 'bn',
  className = '',
  isAbsolute = true,
}) => {
  const position = config?.memberSerialPosition || 'top-left';
  const style = config?.memberSerialStyle || 'minimal';

  const positionClasses = {
    'top-left': 'top-2.5 left-2.5',
    'top-right': 'top-2.5 right-2.5',
    'bottom-left': 'bottom-2.5 left-2.5',
    'bottom-right': 'bottom-2.5 right-2.5',
  };

  // Format serial with two digits (e.g., 01, 02 or ০১, ০২), never plain #1 or #2
  const numStr = String(serial ?? 0).padStart(2, '0');
  const displayDigits = language === 'bn' ? toBengaliDigits(numStr) : language === 'ar' ? toArabicDigits(numStr) : numStr;

  let styleContent = null;

  switch (style) {
    case 'circle':
      styleContent = (
        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 border border-[#2D5A41]/40 text-[#2D5A41] text-[10px] sm:text-xs font-bold font-mono flex items-center justify-center shadow-3xs group-hover:border-[#2D5A41] group-hover:bg-[#E8EFEA] transition-colors">
          {displayDigits}
        </span>
      );
      break;

    case 'pill':
      styleContent = (
        <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#E8EFEA] border border-[#2D5A41]/30 text-[#2D5A41] text-[10px] sm:text-xs font-bold font-mono shadow-3xs group-hover:bg-[#2D5A41] group-hover:text-white transition-colors">
          {displayDigits}
        </span>
      );
      break;

    case 'corner':
      styleContent = (
        <span className="px-2 py-0.5 rounded-md bg-[#2D5A41] text-white text-[10px] sm:text-xs font-bold font-mono shadow-2xs group-hover:bg-[#234733] transition-colors">
          {displayDigits}
        </span>
      );
      break;

    case 'outline':
      styleContent = (
        <span className="px-2 py-0.5 rounded-md border border-[#2D5A41] bg-white/95 text-[#2D5A41] text-[10px] sm:text-xs font-bold font-mono shadow-3xs group-hover:bg-[#E8EFEA] transition-colors">
          {displayDigits}
        </span>
      );
      break;

    case 'minimal':
    default:
      styleContent = (
        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-[#F7F5F0] border border-[#EBE8E0] text-[#5C665F] text-[10px] sm:text-xs font-bold font-mono shadow-3xs group-hover:bg-[#E8EFEA] group-hover:text-[#2D5A41] group-hover:border-[#2D5A41]/30 transition-colors">
          {displayDigits}
        </span>
      );
      break;
  }

  return (
    <div
      className={`${isAbsolute ? `absolute ${positionClasses[position]} z-10 pointer-events-none` : 'inline-block'} ${className}`}
    >
      {styleContent}
    </div>
  );
};
