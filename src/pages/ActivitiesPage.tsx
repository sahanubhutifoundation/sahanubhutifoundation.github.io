import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { storageService } from '../services/storageService';
import { Activity } from '../types';
import { Calendar, ArrowRight, Tag, Heart } from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const { t, tMulti, isRTL } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const list = storageService.getActivities().filter((a) => a.isPublished);
    setActivities(list);
  }, []);

  const categories = ['all', ...Array.from(new Set(activities.map((a) => a.category).filter(Boolean)))];

  const filtered = selectedCategory === 'all'
    ? activities
    : activities.filter((a) => a.category === selectedCategory);

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={t('activitiesTitle')}
        subtitle={t('activitiesSubtitle')}
        breadcrumb={[{ label: t('navActivities') }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Filters */}
        {categories.length > 2 && (
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#2D5A41] text-white shadow-2xs'
                    : 'bg-white text-[#5C665F] border border-[#EBE8E0] hover:bg-[#F7F5F0]'
                }`}
              >
                {cat === 'all' ? t('allCategories') : cat}
              </button>
            ))}
          </div>
        )}

        {/* Activities Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((act) => (
              <article
                key={act.id}
                className="bg-white rounded-xl border border-[#EBE8E0] hover:border-[#D4CEBF] shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {act.coverImage && (
                    <div className="h-48 w-full overflow-hidden bg-[#F7F5F0]">
                      <img
                        src={act.coverImage}
                        alt={tMulti(act.title)}
                        className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

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
                        <span>{act.date}</span>
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-[#2D3630] leading-snug">
                      <Link
                        to={`/activities/${act.slug || act.id}`}
                        className="hover:text-[#2D5A41] transition-colors"
                      >
                        {tMulti(act.title)}
                      </Link>
                    </h2>

                    <p className="text-xs sm:text-sm text-[#5C665F] line-clamp-3 leading-relaxed">
                      {tMulti(act.summary)}
                    </p>
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
            ))}
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
