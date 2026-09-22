import React, { useState, useEffect } from 'react';
import { ActivityCategoryItem, Activity } from '../../types';
import { storageService } from '../../services/storageService';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  Tag, 
  Layers, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface ActivityCategoryManagerProps {
  activities: Activity[];
  onCategoriesUpdated?: (categories: ActivityCategoryItem[]) => void;
  showToast?: (msg: string) => void;
}

const PRESET_COLORS = [
  '#2D5A41', // Foundation Forest Green
  '#3B7A57', // Sage / Emerald
  '#B45309', // Amber / Warm Ochre
  '#2563EB', // Royal Blue
  '#7C3AED', // Violet
  '#DC2626', // Crimson Red
  '#4B5563', // Slate Neutral
];

export const ActivityCategoryManager: React.FC<ActivityCategoryManagerProps> = ({
  activities,
  onCategoriesUpdated,
  showToast = () => {},
}) => {
  const [categories, setCategories] = useState<ActivityCategoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCat, setEditingCat] = useState<ActivityCategoryItem | null>(null);

  // Form states for add/edit
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [color, setColor] = useState('#2D5A41');
  const [isEnabled, setIsEnabled] = useState(true);

  // Deletion modal state for safe reassignment
  const [deleteModalCat, setDeleteModalCat] = useState<ActivityCategoryItem | null>(null);
  const [reassignTargetCat, setReassignTargetCat] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refreshCategories = () => {
    const list = storageService.getActivityCategories();
    setCategories(list);
    if (onCategoriesUpdated) {
      onCategoriesUpdated(list);
    }
  };

  useEffect(() => {
    refreshCategories();
    const handleUpdated = () => refreshCategories();
    window.addEventListener('sf_categories_updated', handleUpdated);
    window.addEventListener('sf_data_updated', handleUpdated);
    return () => {
      window.removeEventListener('sf_categories_updated', handleUpdated);
      window.removeEventListener('sf_data_updated', handleUpdated);
    };
  }, []);

  const openAddForm = () => {
    setEditingCat(null);
    setNameBn('');
    setNameEn('');
    setNameAr('');
    setColor('#2D5A41');
    setIsEnabled(true);
    setIsAdding(true);
  };

  const openEditForm = (cat: ActivityCategoryItem) => {
    setEditingCat(cat);
    setNameBn(cat.name?.bn || '');
    setNameEn(cat.name?.en || '');
    setNameAr(cat.name?.ar || '');
    setColor(cat.color || '#2D5A41');
    setIsEnabled(cat.isEnabled !== false);
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingCat(null);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim()) {
      showToast('বিভাগের বাংলা নাম প্রদান করা আবশ্যক।');
      return;
    }

    const catId = editingCat?.id || `act-cat-${Date.now()}`;
    const slug = nameEn.trim()
      ? nameEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : nameBn.trim().toLowerCase().replace(/\s+/g, '-');

    const newCategory: ActivityCategoryItem = {
      id: catId,
      name: {
        bn: nameBn.trim(),
        en: nameEn.trim() || nameBn.trim(),
        ar: nameAr.trim() || nameBn.trim(),
      },
      slug,
      order: editingCat?.order || categories.length + 1,
      isEnabled,
      color,
    };

    const updated = storageService.saveActivityCategory(newCategory);
    setCategories(updated);
    if (onCategoriesUpdated) onCategoriesUpdated(updated);
    setIsAdding(false);
    setEditingCat(null);
    showToast(editingCat ? 'বিভাগ সফলভাবে হালনাগাদ করা হয়েছে।' : 'নতুন বিভাগ সফলভাবে যুক্ত হয়েছে।');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newOrder = [...categories];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((c) => c.id);
    const updated = storageService.reorderActivityCategories(orderedIds);
    setCategories(updated);
    if (onCategoriesUpdated) onCategoriesUpdated(updated);
    showToast('বিভাগের ক্রম পরিবর্তন করা হয়েছে।');
  };

  const handleToggleEnabled = (cat: ActivityCategoryItem) => {
    const updatedCat: ActivityCategoryItem = {
      ...cat,
      isEnabled: !cat.isEnabled,
    };
    const updated = storageService.saveActivityCategory(updatedCat);
    setCategories(updated);
    if (onCategoriesUpdated) onCategoriesUpdated(updated);
    showToast(updatedCat.isEnabled ? 'বিভাগটি সক্রিয় করা হয়েছে।' : 'বিভাগটি নিষ্ক্রিয় করা হয়েছে।');
  };

  const getLinkedActivitiesCount = (cat: ActivityCategoryItem) => {
    return activities.filter(
      (a) => a.category === cat.name.bn || a.category === cat.id || a.category === cat.name.en
    ).length;
  };

  const initiateDelete = (cat: ActivityCategoryItem) => {
    const count = getLinkedActivitiesCount(cat);
    setDeleteError(null);
    setDeleteModalCat(cat);

    if (count > 0) {
      // Find another available category as default reassign target
      const otherCat = categories.find((c) => c.id !== cat.id && c.name.bn !== cat.name.bn);
      setReassignTargetCat(otherCat ? otherCat.name.bn : '');
    } else {
      setReassignTargetCat('');
    }
  };

  const confirmDelete = () => {
    if (!deleteModalCat) return;
    const count = getLinkedActivitiesCount(deleteModalCat);

    if (count > 0 && !reassignTargetCat) {
      setDeleteError('অনুগ্রহ করে এই বিভাগের কার্যক্রমগুলোর জন্য একটি বিকল্প বিভাগ নির্বাচন করুন।');
      return;
    }

    const res = storageService.deleteActivityCategory(
      deleteModalCat.id,
      count > 0 ? reassignTargetCat : undefined
    );

    if (!res.success) {
      setDeleteError(res.error || 'বিভাগটি মুছে ফেলা সম্ভব হয়নি।');
      return;
    }

    setCategories(res.updatedCategories);
    if (onCategoriesUpdated) onCategoriesUpdated(res.updatedCategories);
    setDeleteModalCat(null);
    showToast('বিভাগটি সফলভাবে অপসারণ করা হয়েছে।');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
        <div>
          <h3 className="text-base font-bold text-[#2D3630] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2D5A41]" />
            <span>কার্যক্রম বিভাগ ব্যবস্থাপনা (Activity Categories)</span>
          </h3>
          <p className="text-xs text-[#7A877E] mt-0.5">
            কার্যক্রমসমূহের বিভাগ তৈরি, পুনঃবিন্যাস ও পরিচালনা করুন। শূন্য কার্যক্রম থাকা বিভাগ স্বয়ংক্রিয়ভাবে পাবলিক ফিল্টারে লুকানো থাকে।
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs transition-all shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ নতুন বিভাগ যুক্ত করুন</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form Modal / Panel */}
      {isAdding && (
        <div className="p-4 sm:p-5 rounded-xl border border-[#2D5A41]/30 bg-[#F7F5F0]/60 space-y-4 shadow-3xs animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-[#2D3630] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#2D5A41]" />
              <span>{editingCat ? 'বিভাগ সম্পাদনা করুন' : 'নতুন কার্যক্রম বিভাগ তৈরি করুন'}</span>
            </h4>
            <button
              type="button"
              onClick={cancelForm}
              className="p-1 text-[#7A877E] hover:text-[#2D3630] rounded-md hover:bg-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  বিভাগের নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="যেমন: ওষুধ ও চিকিৎসা"
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  নাম (English - ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g., Medicine & Healthcare"
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  নাম (العربية - ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: الأدوية والرعاية الصحية"
                  dir="rtl"
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            {/* Color Accent Picker */}
            <div>
              <label className="block font-bold text-[#2D3630] mb-1.5">
                কালার থিম / অ্যাকসেন্ট ব্যাজ
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-115 border-[#2D3630]' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <span className="text-[11px] text-[#7A877E] ml-2">নির্বাচিত রঙ:</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: color }}
                >
                  {nameBn || 'বিভাগ'}
                </span>
              </div>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="catEnabled"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="rounded accent-[#2D5A41]"
              />
              <label htmlFor="catEnabled" className="font-semibold text-[#2D3630] cursor-pointer">
                এই বিভাগটি সক্রিয় রাখুন (সক্রিয় ও কার্যক্রম থাকলে পাবলিক ফিল্টারে দৃশ্যমান হবে)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
              <button
                type="button"
                onClick={cancelForm}
                className="px-3.5 py-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-white transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733] transition-colors shadow-2xs"
              >
                {editingCat ? 'হালনাগাদ সংরক্ষণ' : 'বিভাগ তৈরি করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table / List */}
      <div className="bg-white rounded-xl border border-[#EBE8E0] overflow-hidden shadow-3xs">
        <div className="p-3 bg-[#F7F5F0] border-b border-[#EBE8E0] flex items-center justify-between text-xs font-bold text-[#5C665F]">
          <span>বিদ্যমান বিভাগসমূহ ({categories.length})</span>
          <span className="text-[11px] font-normal text-[#7A877E]">ক্রম ও কার্যক্রমের সংখ্যা</span>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center text-[#7A877E] text-xs">
            কোনো বিভাগ তৈরি করা হয়নি। উপরে "+ নতুন বিভাগ যুক্ত করুন" বাটনে ক্লিক করুন।
          </div>
        ) : (
          <div className="divide-y divide-[#EBE8E0]">
            {categories.map((cat, index) => {
              const actCount = getLinkedActivitiesCount(cat);
              return (
                <div
                  key={cat.id}
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FDFCF9] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Reordering handles */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        className="p-1 rounded text-[#7A877E] hover:text-[#2D3630] disabled:opacity-30 hover:bg-[#F7F5F0]"
                        title="উপরে নিন"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === categories.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        className="p-1 rounded text-[#7A877E] hover:text-[#2D3630] disabled:opacity-30 hover:bg-[#F7F5F0]"
                        title="নিচে নিন"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Category Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#2D5A41' }}
                        />
                        <strong className="text-xs sm:text-sm font-bold text-[#2D3630]">
                          {cat.name.bn}
                        </strong>
                        {cat.name.en && cat.name.en !== cat.name.bn && (
                          <span className="text-[11px] text-[#7A877E] hidden md:inline">
                            ({cat.name.en})
                          </span>
                        )}

                        {/* Linked activities count badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                            actCount > 0
                              ? 'bg-[#E8EFEA] text-[#2D5A41]'
                              : 'bg-[#F7F5F0] text-[#7A877E]'
                          }`}
                        >
                          <FolderOpen className="w-2.5 h-2.5" />
                          <span>{actCount} টি কার্যক্রম</span>
                        </span>

                        {/* Status badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            cat.isEnabled !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {cat.isEnabled !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(cat)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                        cat.isEnabled !== false
                          ? 'border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0]'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title="সক্রিয়/নিষ্ক্রিয় টগল"
                    >
                      {cat.isEnabled !== false ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(cat)}
                      className="p-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:text-[#2D3630] hover:bg-[#F7F5F0] transition-colors"
                      title="সম্পাদনা করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => initiateDelete(cat)}
                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safe Delete & Reassignment Modal */}
      {deleteModalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-[#EBE8E0] space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#2D3630]">
                  বিভাগ অপসারণ নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-[#5C665F] mt-1">
                  আপনি <strong className="text-[#2D3630]">"{deleteModalCat.name.bn}"</strong> বিভাগটি মুছে ফেলতে চান?
                </p>
              </div>
            </div>

            {/* If activities exist in this category, enforce safe reassignment */}
            {getLinkedActivitiesCount(deleteModalCat) > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-2.5">
                <div className="font-semibold text-amber-900">
                  ⚠️ এই বিভাগে {getLinkedActivitiesCount(deleteModalCat)} টি কার্যক্রম বিদ্যমান রয়েছে।
                </div>
                <p className="text-[#5C665F] text-[11px] leading-relaxed">
                  ফাউন্ডেশন নীতি অনুযায়ী কার্যক্রমগুলো মুছে যাবে না। বিভাগটি অপসারণের পূর্বে এই কার্যক্রমগুলোকে অন্য একটি বিভাগে স্থানান্তর করুন:
                </p>

                <div>
                  <label className="block font-bold text-[#2D3630] mb-1">
                    বিকল্প বিভাগ নির্বাচন করুন *
                  </label>
                  <select
                    value={reassignTargetCat}
                    onChange={(e) => setReassignTargetCat(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs font-semibold text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                  >
                    <option value="">-- বিভাগ নির্বাচন করুন --</option>
                    {categories
                      .filter((c) => c.id !== deleteModalCat.id && c.name.bn !== deleteModalCat.name.bn)
                      .map((c) => (
                        <option key={c.id} value={c.name.bn}>
                          {c.name.bn}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#7A877E]">
                এই বিভাগে কোনো কার্যক্রম যুক্ত নেই, তাই এটি নিরাপদে মুছে ফেলা যাবে।
              </p>
            )}

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBE8E0]">
              <button
                type="button"
                onClick={() => setDeleteModalCat(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#EBE8E0] text-xs font-semibold text-[#5C665F] hover:bg-[#F7F5F0]"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
              >
                {getLinkedActivitiesCount(deleteModalCat) > 0 ? 'স্থানান্তর ও অপসারণ' : 'মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
