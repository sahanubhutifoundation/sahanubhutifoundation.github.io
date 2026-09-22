import React from 'react';
import { Heart, HandHeart, Sparkles, ShieldCheck, Tag } from 'lucide-react';

interface ActivityFallbackCoverProps {
  category?: string;
  className?: string;
  compact?: boolean;
}

export const ActivityFallbackCover: React.FC<ActivityFallbackCoverProps> = ({
  category,
  className = '',
  compact = false,
}) => {
  // Select an appropriate icon based on category keywords
  const getCategoryIcon = () => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('চিকিৎসা') || cat.includes('ওষুধ') || cat.includes('মেডিকেল') || cat.includes('health')) {
      return Heart;
    }
    if (cat.includes('শিক্ষা') || cat.includes('স্কুল') || cat.includes('education')) {
      return Sparkles;
    }
    if (cat.includes('ত্রাণ') || cat.includes('সহায়তা') || cat.includes('relief')) {
      return HandHeart;
    }
    return ShieldCheck;
  };

  const IconComponent = getCategoryIcon();

  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-br from-[#E8EFEA] via-[#F4F1EA] to-[#F7F5F0] border-b border-[#EBE8E0] flex flex-col items-center justify-center select-none ${
        compact ? 'h-36 sm:h-40' : 'h-44 sm:h-48'
      } ${className}`}
    >
      {/* Subtle organic curved pattern in background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35 text-[#2D5A41]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-20,180 C80,120 160,220 260,160 C340,110 380,180 420,140"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <path
          d="M-40,90 C60,40 180,130 280,70 C360,20 400,90 440,50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
        <circle cx="80" cy="190" r="45" fill="currentColor" opacity="0.04" />
        <circle cx="330" cy="60" r="55" fill="currentColor" opacity="0.04" />
      </svg>

      {/* Decorative center badge */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-3xs border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41] mb-2 transform transition-transform group-hover:scale-105">
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {category && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[#2D5A41] text-[10px] sm:text-[11px] font-semibold border border-[#2D5A41]/20 shadow-4xs">
            <Tag className="w-2.5 h-2.5 text-[#2D5A41]/70" />
            <span>{category}</span>
          </span>
        )}

        <span className="text-[10px] text-[#7A877E] font-medium mt-1 tracking-wider uppercase">
          সহানুভূতি মানবিক উদ্যোগ
        </span>
      </div>
    </div>
  );
};
