import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ChevronRight, Home } from 'lucide-react';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; path?: string }[];
  tag?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  breadcrumb,
  tag,
}) => {
  const { isRTL } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F7F5F0] via-[#FDFCF9] to-[#FDFCF9] pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-[#EBE8E0]">
      {/* Subtle humanitarian background pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage: 'url(/assets/humanitarian-pattern.svg)',
          backgroundRepeat: 'repeat',
          backgroundSize: '160px 160px',
        }}
        aria-hidden="true"
      />

      {/* Soft warm gradient glow in the corner */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#E8EFEA]/60 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#F1EDE4]/70 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-1.5 text-xs text-[#7A877E] font-medium flex-wrap">
              <li>
                <Link
                  to="/"
                  className="hover:text-[#2D3630] transition-colors inline-flex items-center gap-1"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>হোম</span>
                </Link>
              </li>
              {breadcrumb.map((item, idx) => (
                <li key={idx} className="inline-flex items-center gap-1.5">
                  <ChevronRight
                    className={`w-3 h-3 text-[#A8B3AA] ${isRTL ? 'rotate-180' : ''}`}
                  />
                  {item.path ? (
                    <Link
                      to={item.path}
                      className="hover:text-[#2D3630] transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-[#2D3630] font-semibold">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Optional Tag badge */}
        {tag && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/25 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A41]" />
            {tag}
          </div>
        )}

        {/* Hero Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#2D3630] leading-tight">
          {title}
        </h1>

        {/* Thin decorative line with subtle brand dots */}
        <div className="flex items-center gap-2 my-3.5 max-w-xs">
          <div className="h-[2px] w-12 bg-[#2D5A41] rounded-full" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#65B78A]" />
          <div className="h-[1px] flex-1 bg-[#EBE8E0] rounded-full" />
        </div>

        {/* Hero Subtitle */}
        {subtitle && (
          <p className="text-base sm:text-lg text-[#5C665F] max-w-3xl leading-relaxed mt-2">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
};
