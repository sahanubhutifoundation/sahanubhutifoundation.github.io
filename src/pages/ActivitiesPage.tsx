import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { ActivityFallbackCover } from '../components/ActivityFallbackCover';
import { storageService } from '../services/storageService';
import { Activity, ActivityCategoryItem } from '../types';
import { Calendar, ArrowRight, Tag, Heart } from 'lucide-react';
import { toBengaliDigits } from '../utils/foundationHelpers';

export const ActivitiesPage: React.FC = () => {
  const { t, tMulti, isRTL, language } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<ActivityCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadData = () => {
    const pubActivities = storageService.getActivities().filter((a) => a.isPublished);
    setActivities(pubActivities);

    // Get all categories defined in system
    const allCategories = storageService.getActivityCategories();

    // Auto-hide empty categories: Filter ONLY categories that have at least 1 published activity
    const activeCategoriesWithItems = allCategories.filter((cat) => {
      if (cat.isEnabled === false) return false;
      const count = pubActivities.filter(
        (a) => a.category === cat.name.bn || a.category === cat.id || a.category === cat.name.en
      ).length;
      return count > 0;
    });

    // Also include any ad-hoc categories present in activities but not in category system
    pubActivities.forEach((act) => {
      if (
        act.category &&
        !activeCategoriesWithItems.some(
          (c) => c.name.bn === act.category || c.id === act.category || c.name.en === act.category
        )
      ) {
        activeCategoriesWithItems.push({
          id: `adhoc-${act.category}`,
          name: { bn: act.category, en: act.category, ar: act.category },
          slug: act.category.toLowerCase().replace(/\s+/g, '-'),
          order: 99,
          isEnabled: true,
          color: '#2D5A41',
        });
      }
    });

    setCategories(activeCategoriesWithItems);
  };

  useEffect(() => {
    loadData();
    const handleUpdated = () => loadData();
    window.addEventListener('sf_data_updated', handleUpdated);
    window.addEventListener('sf_categories_updated', handleUpdated);
    return () => {
      window.removeEventListener('sf_data_updated', handleUpdated);
      window.removeEventListener('sf_categories_updated', handleUpdated);
    };
  }, []);

  const filtered = selectedCategory === 'all'
    ? activities
    : activities.filter((a) => {
        const catObj = categories.find((c) => c.id === selectedCategory || c.name.bn === selectedCategory);
        if (catObj) {
          return (
            a.category === catObj.name.bn ||
            a.category === catObj.id ||
            a.category === catObj.name.en
          );
        }
        return a.category === selectedCategory;
      });

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={t('activitiesTitle')}
        subtitle={t('activitiesSubtitle')}
        breadcrumb={[{ label: t('navActivities') }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Filters - Only categories with > 0 published items are visible */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#2D5A41] text-white shadow-2xs'
                  : 'bg-white text-[#5C665F] border border-[#EBE8E0] hover:bg-[#F7F5F0]'
              }`}
            >
              {t('allCategories')} ({activities.length})
            </button>

            {categories.map((cat) => {
              const count = activities.filter(
                (a) => a.category === cat.name.bn || a.category === cat.id || a.category === cat.name.en
              ).length;
              const isSelected = selectedCategory === cat.name.bn || selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name.bn)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#2D5A41] text-white shadow-2xs'
                      : 'bg-white text-[#5C665F] border border-[#EBE8E0] hover:bg-[#F7F5F0]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color || '#2D5A41' }}
                  />
                  <span>{tMulti(cat.name)}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#7A877E]'}`}>
                    ({language === 'bn' ? toBengaliDigits(count) : count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Activities Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((act) => {
              const formattedDate = language === 'bn' ? toBengaliDigits(act.date) : act.date;
              const summaryText = tMulti(act.shortSummary || act.summary);

              return (
                <article
                  key={act.id}
                  className="bg-white rounded-xl border border-[#EBE8E0] hover:border-[#D4CEBF] shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    <Link
                      to={`/activities/${act.slug || act.id}`}
                      className="block h-48 w-full overflow-hidden bg-[#F7F5F0] relative"
                    >
                      {act.coverImage ? (
                        <img
                          src={act.coverImage}
                          alt={tMulti(act.title)}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <ActivityFallbackCover category={act.category} />
                      )}
                    </Link>

                    <div className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#7A877E]">
                        {act.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8EFEA] text-[#2D5A41] font-medium text-[11px]">
                            <Tag className="w-3 h-3" />
                            <span>{act.category}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-[#A4B3A8]" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>

                      <h2 className="text-base sm:text-lg font-bold text-[#2D3630] leading-snug">
                        <Link
                          to={`/activities/${act.slug || act.id}`}
                          className="hover:text-[#2D5A41] transition-colors line-clamp-2"
                        >
                          {tMulti(act.title)}
                        </Link>
                      </h2>

                      {summaryText && (
                        <p className="text-xs sm:text-sm text-[#5C665F] line-clamp-3 leading-relaxed">
                          {summaryText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-0">
                    <Link
                      to={`/activities/${act.slug || act.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2D5A41] hover:text-[#234733] transition-colors pt-3 border-t border-[#EBE8E0] w-full justify-between"
                    >
                      <span>{t('viewDetails')}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            message={t('emptyActivities')}
            subMessage="নতুন মানবিক উদ্যোগ বা ত্রাণ কার্যক্রম অনুমোদিত হলে এখানে বিস্তারিত প্রকাশিত হবে।"
            icon={<Heart className="w-6 h-6 text-[#2D5A41]" />}
          />
        )}
      </div>
    </div>
  );
};
