import React, { useState, useEffect } from 'react';
import { ActivityCategoryItem } from '../../types';
import { storageService } from '../../services/storageService';
import { Plus, Check, X, Tag } from 'lucide-react';

interface ActivityCategoryInlineSelectorProps {
  value: string;
  onChange: (categoryName: string) => void;
  className?: string;
  showToast?: (msg: string) => void;
}

export const ActivityCategoryInlineSelector: React.FC<ActivityCategoryInlineSelectorProps> = ({
  value,
  onChange,
  className = '',
  showToast = () => {},
}) => {
  const [categories, setCategories] = useState<ActivityCategoryItem[]>([]);
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [newCatBn, setNewCatBn] = useState('');
  const [newCatEn, setNewCatEn] = useState('');

  const loadCategories = () => {
    const list = storageService.getActivityCategories();
    setCategories(list);
  };

  useEffect(() => {
    loadCategories();
    const handleUpdated = () => loadCategories();
    window.addEventListener('sf_categories_updated', handleUpdated);
    return () => window.removeEventListener('sf_categories_updated', handleUpdated);
  }, []);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatBn.trim()) return;

    const trimmedBn = newCatBn.trim();
    const trimmedEn = newCatEn.trim() || trimmedBn;

    const newCategory: ActivityCategoryItem = {
      id: `act-cat-${Date.now()}`,
      name: {
        bn: trimmedBn,
        en: trimmedEn,
        ar: trimmedBn,
      },
      slug: trimmedEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: categories.length + 1,
      isEnabled: true,
      color: '#2D5A41',
    };

    const updated = storageService.saveActivityCategory(newCategory);
    setCategories(updated);
    onChange(trimmedBn);
    setNewCatBn('');
    setNewCatEn('');
    setIsInlineAdding(false);
    showToast(`"${trimmedBn}" নতুন বিভাগ যুক্ত ও নির্বাচন করা হয়েছে`);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] font-medium text-xs focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
        >
          <option value="">-- বিভাগ নির্বাচন করুন --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name.bn}>
              {cat.name.bn} {cat.isEnabled === false ? '(নিষ্ক্রিয়)' : ''}
            </option>
          ))}
          {/* If the current activity has a custom string that isn't in categories, show it */}
          {value && !categories.some((c) => c.name.bn === value || c.id === value || c.name.en === value) && (
            <option value={value}>{value} (কাস্টম)</option>
          )}
        </select>

        <button
          type="button"
          onClick={() => setIsInlineAdding(!isInlineAdding)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#2D5A41] bg-[#E8EFEA] hover:bg-[#d8e5dc] text-[#2D5A41] text-xs font-bold transition-colors shrink-0"
          title="নতুন বিভাগ তৈরি করুন"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ নতুন বিভাগ</span>
        </button>
      </div>

      {/* Inline Quick Add Form */}
      {isInlineAdding && (
        <div className="p-3 rounded-xl border border-[#2D5A41]/40 bg-[#F7F5F0] space-y-2.5 text-xs animate-fade-in shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#2D3630] flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#2D5A41]" />
              <span>নতুন বিভাগ তৈরি করুন (তাত্ক্ষণিক)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsInlineAdding(false)}
              className="p-0.5 text-[#7A877E] hover:text-[#2D3630]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#5C665F] mb-0.5">
                বিভাগের নাম (বাংলা) *
              </label>
              <input
                type="text"
                required
                value={newCatBn}
                onChange={(e) => setNewCatBn(e.target.value)}
                placeholder="যেমন: চিকিৎসা সহায়তা"
                className="w-full px-2.5 py-1.5 rounded-md border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5C665F] mb-0.5">
                নাম (English - ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={newCatEn}
                onChange={(e) => setNewCatEn(e.target.value)}
                placeholder="e.g., Medical Aid"
                className="w-full px-2.5 py-1.5 rounded-md border border-[#EBE8E0] bg-white text-xs text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsInlineAdding(false)}
              className="px-2.5 py-1 rounded-md border border-[#EBE8E0] text-[11px] text-[#5C665F] hover:bg-white"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!newCatBn.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#2D5A41] hover:bg-[#234733] text-white text-[11px] font-bold disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              <span>যোগ ও নির্বাচন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
