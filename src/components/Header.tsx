import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { Language } from '../types';
import { storageService } from '../services/storageService';
import { Menu, X, Globe, HeartHandshake } from 'lucide-react';

export const Header: React.FC = () => {
  const { language, setLanguage, t, tMulti, isRTL } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const location = useLocation();
  const config = storageService.getConfig();

  // Scroll detection: hide on scroll down, show on scroll up, show full at top
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 20) {
        setIsVisible(true);
        setIsScrolled(false);
      } else {
        setIsScrolled(true);
        if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
          // Scrolling down - hide if mobile menu is not open
          if (!mobileMenuOpen) {
            setIsVisible(false);
            setLangDropdownOpen(false);
          }
        } else if (currentScrollY < lastScrollY.current) {
          // Scrolling up - show
          setIsVisible(true);
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  // Keep header visible when mobile menu is toggled
  useEffect(() => {
    if (mobileMenuOpen) {
      setIsVisible(true);
    }
  }, [mobileMenuOpen]);

  const navItems = [
    { to: '/', label: t('navHome') },
    { to: '/about', label: t('navAbout') },
    { to: '/activities', label: t('navActivities') },
    { to: '/members', label: t('navMembers') },
    { to: '/fund', label: t('navFund') },
    { to: '/gallery', label: t('navGallery') },
    { to: '/notice', label: t('navNotice') },
    { to: '/contact', label: t('navContact') },
  ];

  const languages: { code: Language; label: string; sub: string }[] = [
    { code: 'bn', label: 'বাংলা', sub: 'Bengali' },
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'ar', label: 'العربية', sub: 'Arabic' },
  ];

  const currentLangLabel = languages.find((l) => l.code === language)?.label || 'বাংলা';

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-[115%]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-1 sm:pt-2.5 sm:pb-1.5">
        <div
          className={`flex items-center justify-between h-14 sm:h-16 px-3.5 sm:px-5 lg:px-6 rounded-2xl transition-all duration-200 ${
            isScrolled
              ? 'bg-[#FDFCF9]/85 backdrop-blur-md shadow-xs border border-[#EBE8E0]/90'
              : 'bg-[#FDFCF9]/75 backdrop-blur-md shadow-2xs border border-[#EBE8E0]/70'
          }`}
        >
          {/* Logo on Left */}
          <Link
            to="/"
            className="flex items-center group py-1 shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Logo size="sm" location="header" className="sm:hidden" />
            <Logo size="md" location="header" className="hidden sm:flex" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'text-[#2D5A41] font-semibold bg-[#E8EFEA] shadow-2xs'
                      : 'text-[#5C665F] hover:text-[#2D3630] hover:bg-[#F1EDE4]/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#2D5A41] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Area: Language Switcher & Quick CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Selector Dropdown */}
            {config.showLanguageSelector !== false && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] hover:border-[#D4CEBF] bg-[#F7F5F0] text-xs font-semibold text-[#2D3630] transition-all hover:bg-[#F1EDE4] active:scale-98"
                  aria-expanded={langDropdownOpen}
                  aria-label="Change Language"
                >
                  <Globe className="w-3.5 h-3.5 text-[#5C665F]" />
                  <span>{currentLangLabel}</span>
                </button>

                {langDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setLangDropdownOpen(false)}
                    />
                    <div
                      className={`absolute mt-1.5 w-36 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] shadow-md py-1.5 z-50 ${
                        isRTL ? 'left-0' : 'right-0'
                      }`}
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full text-start px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                            language === lang.code
                              ? 'bg-[#E8EFEA] text-[#2D5A41] font-bold'
                              : 'text-[#2D3630] hover:bg-[#F7F5F0]'
                          }`}
                        >
                          <span>{lang.label}</span>
                          <span className="text-[10px] text-[#7A877E] font-normal">
                            {lang.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick Action Button for Desktop */}
            {config.showHeaderCta !== false && (
              <Link
                to={config.headerCtaLink || '/contact'}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] shadow-xs hover:shadow-sm transition-all active:scale-98"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>{tMulti(config.headerCtaText) || t('heroCtaContact')}</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-[#EBE8E0] text-[#2D3630] hover:bg-[#F1EDE4] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden max-w-7xl mx-auto px-3 sm:px-6 mt-1 animate-in slide-in-from-top-2 duration-150">
          <div className="rounded-2xl border border-[#EBE8E0]/90 bg-[#FDFCF9]/95 backdrop-blur-xl shadow-lg p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E8EFEA] text-[#2D5A41] font-bold border border-[#2D5A41]/20'
                      : 'text-[#2D3630] hover:bg-[#F7F5F0]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile Language Switcher bar */}
            <div className="pt-4 mt-3 border-t border-[#EBE8E0]">
              <div className="text-xs font-medium text-[#5C665F] mb-2 px-1">
                ভাষা নির্বাচন করুন / Choose Language:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2 px-2 text-center text-xs rounded-lg font-semibold border transition-all ${
                      language === l.code
                        ? 'bg-[#2D5A41] text-white border-[#2D5A41]'
                        : 'bg-[#F7F5F0] text-[#2D3630] border-[#EBE8E0] hover:bg-[#F1EDE4]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile CTA button */}
            {config.showHeaderCta !== false && (
              <div className="pt-3">
                <Link
                  to={config.headerCtaLink || '/contact'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2D5A41] hover:bg-[#234733]"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>{tMulti(config.headerCtaText) || t('heroCtaContact')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
