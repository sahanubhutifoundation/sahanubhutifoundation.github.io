import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, FoundationConfig } from '../types';
import { ActivityFallbackCover } from './ActivityFallbackCover';
import { Calendar, Tag, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toBengaliDigits } from '../utils/foundationHelpers';

interface ActivityRailCardProps {
  activity: Activity;
  config: FoundationConfig;
  cardStyle?: React.CSSProperties;
  className?: string;
}

export const ActivityRailCard: React.FC<ActivityRailCardProps> = ({
  activity,
  config,
  cardStyle,
  className = '',
}) => {
  const { language, isRTL, tMulti } = useLanguage();

  const titleStr = tMulti(activity.title) || (typeof activity.title === 'string' ? activity.title : '');

  // Safe short excerpt: strictly prefers shortSummary or summary
  const getExcerpt = (): string => {
    const summary =
      tMulti(activity.shortSummary || activity.summary) ||
      (typeof activity.shortSummary === 'string' ? activity.shortSummary : typeof activity.summary === 'string' ? activity.summary : '');
    if (summary && summary.trim().length > 0) {
      return summary.trim();
    }
    const desc =
      tMulti(activity.fullDescription || activity.description) ||
      (typeof activity.fullDescription === 'string' ? activity.fullDescription : typeof activity.description === 'string' ? activity.description : '');
    if (desc && desc.trim().length > 0) {
      const clean = desc.replace(/<[^>]*>?/gm, '').trim();
      if (clean.length <= 110) return clean;
      const sub = clean.substring(0, 110);
      const lastSpace = sub.lastIndexOf(' ');
      return (lastSpace > 70 ? sub.substring(0, lastSpace) : sub) + '...';
    }
    return '';
  };

  const excerpt = getExcerpt();
  const detailUrl = `/activities/${activity.slug || activity.id}`;

  const showDate = config.homeActivitiesShowDate !== false;
  const showCategory = config.homeActivitiesShowCategory !== false;
  const showSummary = config.homeActivitiesShowSummary !== false;
  const showCta = config.homeActivitiesShowCta !== false;

  const ctaLabel =
    tMulti(config.homeActivitiesCtaLabel) ||
    (language === 'bn' ? 'বিস্তারিত দেখুন' : language === 'ar' ? 'عرض التفاصيل' : 'View Details');

  const displayDate = activity.date
    ? language === 'bn'
      ? toBengaliDigits(activity.date)
      : activity.date
    : null;

  return (
    <article
      style={cardStyle}
      className={`snap-start shrink-0 flex flex-col justify-between bg-white rounded-2xl border border-[#EBE8E0] hover:border-[#2D5A41]/40 shadow-3xs hover:shadow-xs transition-all duration-200 overflow-hidden group select-none ${className}`}
    >
      <div>
        {/* Visual Cover Area */}
        <Link
          to={detailUrl}
          className="block relative w-full overflow-hidden bg-[#F7F5F0] focus:outline-hidden focus:ring-2 focus:ring-[#2D5A41]"
          tabIndex={-1}
          aria-hidden="true"
        >
          {activity.coverImage && activity.coverImage.trim().length > 0 ? (
            <div className="h-40 sm:h-44 w-full overflow-hidden">
              <img
                src={activity.coverImage}
                alt={titleStr}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              />
            </div>
          ) : (
            <ActivityFallbackCover category={activity.category} compact />
          )}
        </Link>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-2.5">
          {/* Metadata badges (Category / Date) */}
          {(showCategory || showDate) && (
            <div className="flex items-center justify-between text-xs text-[#7A877E] gap-2">
              {showCategory && activity.category ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E8EFEA] text-[#2D5A41] font-semibold text-[10px] sm:text-[11px] truncate max-w-[60%]">
                  <Tag className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{activity.category}</span>
                </span>
              ) : (
                <span />
              )}

              {showDate && displayDate && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium shrink-0">
                  <Calendar className="w-3 h-3 text-[#A4B3A8]" />
                  <span>{displayDate}</span>
                </span>
              )}
            </div>
          )}

          {/* Activity Headline */}
          <h3 className="text-sm sm:text-base font-bold text-[#2D3630] group-hover:text-[#2D5A41] transition-colors line-clamp-2 leading-snug pt-0.5">
            <Link to={detailUrl} className="focus:outline-hidden focus:underline">
              {titleStr}
            </Link>
          </h3>

          {/* Short description/summary */}
          {showSummary && excerpt && (
            <p className="text-xs text-[#5C665F] line-clamp-2 sm:line-clamp-3 leading-relaxed">
              {excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Bottom CTA Area */}
      {showCta && (
        <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-[#EBE8E0]/70 flex items-center justify-between mt-auto">
          <Link
            to={detailUrl}
            className="text-xs font-bold text-[#2D5A41] hover:text-[#234733] inline-flex items-center gap-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#2D5A41] rounded py-0.5"
          >
            <span>{ctaLabel}</span>
            <ArrowRight
              className={`w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ${
                isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''
              }`}
            />
          </Link>
        </div>
      )}
    </article>
  );
};
