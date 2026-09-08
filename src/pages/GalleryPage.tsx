import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { storageService } from '../services/storageService';
import { GalleryItem } from '../types';
import { ImageIcon, X, Play, Calendar, Tag, ChevronLeft, ChevronRight } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const { t, tMulti } = useLanguage();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const list = storageService.getGalleryItems().filter((g) => g.isPublished);
    setItems(list);
  }, []);

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];
  const years = ['all', ...Array.from(new Set(items.map((i) => i.year).filter(Boolean)))];

  const filtered = items.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchYear = selectedYear === 'all' || item.year === selectedYear;
    return matchCat && matchYear;
  });

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
                      {y === 'all' ? t('allYears') : y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Gallery Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="group relative rounded-xl overflow-hidden bg-[#F7F5F0] border border-[#EBE8E0] shadow-2xs hover:shadow-xs cursor-pointer aspect-4/3 transition-all"
              >
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={tMulti(item.title) || 'Gallery Item'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-10 h-10 rounded-full bg-white/90 text-[#2D5A41] flex items-center justify-center shadow-md">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                )}

                {/* Hover Caption Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-white">
                  <div className="text-xs font-semibold line-clamp-1">{tMulti(item.title)}</div>
                  {item.category && (
                    <span className="text-[10px] text-[#82CCA3]">{item.category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            message={t('emptyGallery')}
            subMessage="ফাউন্ডেশনের মানবিক ও পারিবারিক কার্যক্রমের নতুন স্থিরচিত্র যুক্ত হলে এখানে প্রদর্শিত হবে।"
            icon={<ImageIcon className="w-6 h-6 text-[#A4B3A8]" />}
          />
        )}
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <button
            onClick={() => setActiveItem(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            {activeItem.type === 'video' ? (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={activeItem.url}
                  title={tMulti(activeItem.title)}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            ) : (
              <img
                src={activeItem.url}
                alt={tMulti(activeItem.title)}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}

            {/* Modal Caption */}
            <div className="mt-4 text-center text-white max-w-xl">
              <h3 className="text-base font-bold">{tMulti(activeItem.title)}</h3>
              {activeItem.caption && (
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  {tMulti(activeItem.caption)}
                </p>
              )}
              <div className="flex items-center justify-center gap-3 text-[11px] text-stone-400 mt-2">
                {activeItem.category && <span>বিভাগ: {activeItem.category}</span>}
                {activeItem.year && <span>• বছর: {activeItem.year}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
