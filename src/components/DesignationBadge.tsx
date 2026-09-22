import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Designation } from '../types';
import { ShieldCheck, Award, Star, User } from 'lucide-react';

interface DesignationBadgeProps {
  designation?: Designation;
  roleFallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DesignationBadge: React.FC<DesignationBadgeProps> = ({
  designation,
  roleFallback,
  size = 'md',
  className = '',
}) => {
  const { language, tMulti } = useLanguage();

  const label = designation ? tMulti(designation.name) : roleFallback;
  if (!label || !label.trim()) {
    return null;
  }

  // Size styling
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-xs sm:text-sm px-3.5 py-1 gap-1.5',
  };

  const fontWeightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const weightClass = designation?.fontWeight
    ? fontWeightClasses[designation.fontWeight] || 'font-semibold'
    : 'font-semibold';

  // Default color palette for graceful fallback
  const defaultBg = '#F4F2EB';
  const defaultText = '#2D3630';
  const defaultBorder = '#DED9CE';
  const defaultAccent = '#2D5A41';

  const bgColor = designation?.bgColor || defaultBg;
  const textColor = designation?.textColor || defaultText;
  const borderColor = designation?.borderColor || defaultBorder;
  const accentColor = designation?.accentColor || defaultAccent;
  const badgeStyle = designation?.badgeStyle || 'soft';

  // Render badge with custom style
  let styleObject: React.CSSProperties = {
    color: textColor,
    backgroundColor: bgColor,
    borderColor: borderColor,
  };

  if (badgeStyle === 'outline') {
    styleObject = {
      color: textColor,
      backgroundColor: 'transparent',
      borderColor: borderColor,
    };
  } else if (badgeStyle === 'accent') {
    styleObject = {
      color: textColor,
      backgroundColor: bgColor,
      borderColor: borderColor,
      borderInlineStartWidth: '3px',
      borderInlineStartColor: accentColor,
    };
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border leading-tight transition-all max-w-full truncate ${sizeClasses[size]} ${weightClass} ${className}`}
      style={styleObject}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
};
