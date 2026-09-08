import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { FoundationConfig } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getFoundationLocation, isMapUrlValid } from '../utils/foundationHelpers';

interface FoundationLocationDisplayProps {
  config: FoundationConfig;
  variant?: 'inline' | 'card' | 'footer' | 'contact';
  className?: string;
  showIcon?: boolean;
}

export const FoundationLocationDisplay: React.FC<FoundationLocationDisplayProps> = ({
  config,
  variant = 'inline',
  className = '',
  showIcon = true,
}) => {
  const { language } = useLanguage();
  const displayMode = config.locationDisplayMode || 'text';

  // 1. Hidden mode -> Render NOTHING, no empty space
  if (displayMode === 'hidden') {
    return null;
  }

  const locationText = getFoundationLocation(config, language);
  if (!locationText) {
    return null;
  }

  const hasValidMapUrl = displayMode === 'map' && isMapUrlValid(config.locationMapUrl);
  const mapUrl = hasValidMapUrl ? config.locationMapUrl!.trim() : '';

  const mapTooltip =
    language === 'bn'
      ? 'গুগল ম্যাপে অবস্থান দেখুন (নতুন ট্যাবে খুলবে)'
      : language === 'ar'
      ? 'عرض الموقع على خرائط جوجل (يفتح في علامة تبويب جديدة)'
      : 'View location on Google Maps (opens in a new tab)';

  // Variant: FOOTER
  if (variant === 'footer') {
    if (hasValidMapUrl) {
      return (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={mapTooltip}
          className={`flex items-start gap-2.5 text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors group ${className}`}
        >
          {showIcon && (
            <MapPin className="w-4 h-4 text-[#65B78A] group-hover:text-[#FDFCF9] shrink-0 mt-0.5 transition-colors" />
          )}
          <span className="group-hover:underline underline-offset-2 flex items-center gap-1.5 leading-relaxed">
            <span>{locationText}</span>
            <ExternalLink className="w-3 h-3 opacity-60 shrink-0 inline" />
          </span>
        </a>
      );
    }
    return (
      <li className={`flex items-start gap-2.5 ${className}`}>
        {showIcon && <MapPin className="w-4 h-4 text-[#65B78A] shrink-0 mt-0.5" />}
        <span className="leading-relaxed">{locationText}</span>
      </li>
    );
  }

  // Variant: CARD (Used in About Page)
  if (variant === 'card') {
    if (hasValidMapUrl) {
      return (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={mapTooltip}
          className={`flex items-center gap-2 p-2.5 bg-white hover:bg-[#FDFCF9] rounded-lg border border-[#EBE8E0] hover:border-[#2D5A41]/40 text-[#5C665F] hover:text-[#2D3630] transition-all group ${className}`}
        >
          {showIcon && (
            <MapPin className="w-4 h-4 text-[#2D5A41] shrink-0 group-hover:scale-105 transition-transform" />
          )}
          <span className="truncate group-hover:underline underline-offset-2 flex-1">
            {locationText}
          </span>
          <ExternalLink className="w-3 h-3 text-[#7A877E] shrink-0 opacity-70" />
        </a>
      );
    }
    return (
      <div
        className={`flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#EBE8E0] text-[#5C665F] ${className}`}
      >
        {showIcon && <MapPin className="w-4 h-4 text-[#2D5A41] shrink-0" />}
        <span className="leading-relaxed">{locationText}</span>
      </div>
    );
  }

  // Variant: CONTACT (Used in Contact Page)
  if (variant === 'contact') {
    const content = (
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] transition-all">
        <div className="w-8 h-8 rounded-lg bg-[#E8EFEA] text-[#2D5A41] flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#7A877E] block text-[11px] font-semibold">
              {language === 'bn'
                ? 'উৎপত্তি ও কার্যালয়'
                : language === 'ar'
                ? 'المقر والأصل'
                : 'Origin & Headquarters'}
            </span>
            {hasValidMapUrl && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#2D5A41] font-semibold">
                <span>{language === 'bn' ? 'ম্যাপ দেখুন' : language === 'ar' ? 'الخريطة' : 'View Map'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <span className="text-[#2D3630] leading-relaxed block text-xs sm:text-sm mt-0.5">
            {locationText}
          </span>
        </div>
      </div>
    );

    if (hasValidMapUrl) {
      return (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={mapTooltip}
          className={`block hover:opacity-95 transition-opacity ${className}`}
        >
          {content}
        </a>
      );
    }
    return <div className={className}>{content}</div>;
  }

  // Default Variant: INLINE (Used in HomePage Hero, etc.)
  if (hasValidMapUrl) {
    return (
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={mapTooltip}
        className={`inline-flex items-center gap-1.5 hover:text-[#2D5A41] transition-colors group cursor-pointer ${className}`}
      >
        {showIcon && (
          <MapPin className="w-4 h-4 text-[#2D5A41] group-hover:scale-110 transition-transform shrink-0" />
        )}
        <span className="group-hover:underline underline-offset-2">{locationText}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
      </a>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && <MapPin className="w-4 h-4 text-[#2D5A41] shrink-0" />}
      <span>{locationText}</span>
    </span>
  );
};
