import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storageService';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  location?: 'header' | 'hero' | 'footer' | 'admin';
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  size = 'md',
  showText = true,
  className = '',
  location,
}) => {
  const { language } = useLanguage();
  const [config, setConfig] = useState(() => storageService.getConfig());
  const [isBrandingReady, setIsBrandingReady] = useState(() => storageService.hasCachedConfig());

  useEffect(() => {
    if (!isBrandingReady) {
      storageService.ensureBrandingLoaded().then((resolved) => {
        setConfig(resolved);
        setIsBrandingReady(true);
      });
    }

    const handleUpdate = () => {
      setConfig(storageService.getConfig());
      setIsBrandingReady(true);
    };
    window.addEventListener('sf_config_updated', handleUpdate);
    window.addEventListener('sf_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sf_config_updated', handleUpdate);
      window.removeEventListener('sf_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [isBrandingReady]);

  const isDark = variant === 'dark';

  const defaultLogo = isDark ? '/assets/logo-white.svg' : '/assets/logo.svg';
  const locationOverride = location ? config.logoOverrides?.[location] : undefined;
  const logoSrc = locationOverride && locationOverride.trim().length > 0
    ? locationOverride
    : config.logoUrl && config.logoUrl.trim().length > 0
    ? config.logoUrl
    : defaultLogo;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const primaryName =
    language === 'ar'
      ? config.nameAr || 'مؤسسة ساهانوبوتي'
      : language === 'en'
      ? config.nameEn || 'Sahanubhuti Foundation'
      : config.nameBn || 'সহানুভূতি ফাউন্ডেশন';

  const secondaryName =
    language === 'bn'
      ? config.nameEn || 'Sahanubhuti Foundation'
      : config.nameBn || 'সহানুভূতি ফাউন্ডেশন';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem Container: Shows neutral same-size placeholder on brand new device until branding resolves, preventing old logo flash */}
      <div className={`relative flex-shrink-0 ${sizeClasses[size]}`}>
        {isBrandingReady ? (
          <img
            src={logoSrc}
            alt={primaryName}
            className="w-full h-full object-contain filter drop-shadow-sm"
            loading="eager"
          />
        ) : (
          <div
            className={`w-full h-full rounded-xl ${
              isDark ? 'bg-white/10' : 'bg-[#2D5A41]/10'
            } animate-pulse flex items-center justify-center`}
          />
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-start">
          <span
            className={`font-bold tracking-tight leading-tight ${textSizes[size]} ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {primaryName}
          </span>
          <span
            className={`text-[11px] font-medium leading-none mt-0.5 tracking-wider uppercase ${
              isDark ? 'text-slate-300' : 'text-slate-500'
            }`}
          >
            {secondaryName}
          </span>
        </div>
      )}
    </div>
  );
};
