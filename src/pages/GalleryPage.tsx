import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { storageService } from '../services/storageService';
import { GalleryItem } from '../types';
import { ImageIcon, X, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import { toBengaliDigits } from '../utils/foundationHelpers';

export const GalleryPage: React.FC = () => {
  const { t, tMulti, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    // Strictly image-only: safely filter out any legacy video records
    const galleryItems = storageService
      .getGalleryItems()
      .filter((g) => g.isPublished && g.type !== 'video' && (g.url || g.mediaUrl));

    // Also include published activities where showOnMediaPage is true
    const activitiesWithMedia = storageService
      .getActivities()
      .filter((a) => a.isPublished && a.showOnMediaPage && a.coverImage)
      .map((a) => ({
        id: `gal-act-${a.id}`,
        title: a.title,
        url: a.coverImage,
        mediaUrl: a.coverImage,
        thumbnailUrl: a.coverImage,
        type: 'photo' as const,
        category: a.category || 'কার্যক্রম',
        date: a.date,
        year: a.date ? a.date.split('-')[0] : '',
        activityId: a.id,
        isPublished: true,
      }));

    const combined = [...galleryItems];
    activitiesWithMedia.forEach((actItem) => {
      const alreadyExists = combined.some((g) => g.activityId === actItem.activityId || g.id === actItem.id);
      if (!alreadyExists) {
        combined.push(actItem as GalleryItem);
      }
    });

    setItems(combined);
  }, []);

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];
  const years = ['all', ...Array.from(new Set(items.map((i) => i.year?.toString()).filter(Boolean)))];

  const filtered = items.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchYear = selectedYear === 'all' || item.year?.toString() === selectedYear;
    return matchCat && matchYear;
  });

  const handleCardClick = (item: GalleryItem) => {
    if (item.activityId) {
      navigate(`/activities/${item.activityId}`);
    } else {
      setActiveItem(item);
    }
  };

  const formatDisplayDate = (item: GalleryItem) => {
    const rawDate = item.date || (item.year ? item.year.toString() : '');
    if (!rawDate) return '';
    return language === 'bn' ? toBengaliDigits(rawDate) : rawDate;
  };

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={t('galleryTitle')}
        subtitle={t('gallerySubtitle')}
        breadcrumb={[{ label: t('navGallery') }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Filter Controls Bar */}
        {(categories.length > 2 || years.length > 2) && (
          <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
            {/* Categories */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[#5C665F] font-semibold mr-1">বিভাগ:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#2D5A41] text-white shadow-2xs'
                      : 'bg-[#F7F5F0] text-[#5C665F] hover:bg-[#EBE8E0]'
                  }`}
                >
                  {cat === 'all' ? t('allCategories') : cat}
                </button>
              ))}
            </div>

            {/* Years */}
            {years.length > 2 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#5C665F] font-semibold">বছর:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-[#EBE8E0] bg-[#F7F5F0] text-[#2D3630] text-xs font-semibold focus:outline-hidden"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y === 'all' ? t('allYears') : language === 'bn' ? toBengaliDigits(y) : y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Image-Only Gallery Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((item) => {
              const titleText = tMulti(item.title) || (typeof item.title === 'string' ? item.title : 'ফটো');
              const displayDate = formatDisplayDate(item);
              const isLinkedToActivity = Boolean(item.activityId);

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="group rounded-2xl overflow-hidden bg-white border border-[#EBE8E0] shadow-2xs hover:shadow-md hover:border-[#2D5A41]/40 cursor-pointer transition-all flex flex-col"
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-[#F7F5F0]">
                    <img
                      src={item.thumbnailUrl || item.url || item.mediaUrl}
                      alt={titleText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {isLinkedToActivity && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#2D5A41]/90 text-white text-[10px] font-semibold shadow-xs backdrop-blur-xs flex items-center gap-1">
                        <span>কার্যক্রমের ছবি</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Clean Title and Date */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#2D3630] group-hover:text-[#2D5A41] transition-colors line-clamp-2 leading-snug">
                        {titleText}
                      </h3>
                      {item.category && item.category !== 'অন্যান্য' && item.category !== 'সাধারণ' && (
                        <span className="text-[10px] text-[#7A877E] block mt-0.5">{item.category}</span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between text-[11px] text-[#7A877E]">
                      {displayDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#A4B3A8]" />
                          <span>{displayDate}</span>
                        </div>
                      ) : (
                        <div />
                      )}

                      {isLinkedToActivity ? (
                        <span className="text-[#2D5A41] font-semibold flex items-center gap-0.5 text-[10px] group-hover:underline">
                          <span>বিস্তারিত</span>
                          <ArrowRight className={`w-2.5 h-2.5 ${isRTL ? 'rotate-180' : ''}`} />
                        </span>
                      ) : (
                        <span className="text-[#A4B3A8] text-[10px]">স্থিরচিত্র</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            message={t('emptyGallery')}
            subMessage="ফাউন্ডেশনের মানবিক ও পারিবারিক কার্যক্রমের নতুন স্থিরচিত্র যুক্ত হলে এখানে প্রদর্শিত হবে।"
            icon={<ImageIcon className="w-6 h-6 text-[#A4B3A8]" />}
          />
        )}
      </div>

      {/* Standalone Image Lightbox Modal */}
      {activeItem && !activeItem.activityId && (
        <div
          onClick={() => setActiveItem(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
        >
          <button
            onClick={() => setActiveItem(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
          >
            <img
              src={activeItem.url || activeItem.mediaUrl}
              alt={tMulti(activeItem.title) || 'Gallery Image'}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />

            {/* Modal Caption */}
            <div className="mt-4 text-center text-white max-w-xl">
              <h3 className="text-base font-bold">
                {tMulti(activeItem.title) || (typeof activeItem.title === 'string' ? activeItem.title : '')}
              </h3>
              {activeItem.caption && (
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  {tMulti(activeItem.caption)}
                </p>
              )}
              <div className="flex items-center justify-center gap-3 text-[11px] text-stone-400 mt-2">
                {activeItem.category && <span>বিভাগ: {activeItem.category}</span>}
                {formatDisplayDate(activeItem) && (
                  <span>• তারিখ: {formatDisplayDate(activeItem)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
