import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { storageService } from '../../services/storageService';
import { Designation, Member } from '../../types';
import { DesignationBadge } from '../../components/DesignationBadge';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  ShieldCheck,
  Palette,
  Layers,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface AdminDesignationsManagerProps {
  members: Member[];
  designations: Designation[];
  onDesignationsUpdated: (list: Designation[]) => void;
  showToast: (msg: string) => void;
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const AdminDesignationsManager: React.FC<AdminDesignationsManagerProps> = ({
  members,
  designations,
  onDesignationsUpdated,
  showToast,
  requestConfirm,
}) => {
  const { language } = useLanguage();
  const [editingItem, setEditingItem] = useState<Partial<Designation> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const emptyDesignation: Partial<Designation> = {
    name: { bn: '', en: '', ar: '' },
    textColor: '#1E3E2B',
    bgColor: '#E8EFEA',
    borderColor: '#B8D5C2',
    accentColor: '#2D5A41',
    badgeStyle: 'soft',
    fontWeight: 'semibold',
    isEnabled: true,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name?.bn?.trim()) {
      setErrorMessage('অনুগ্রহ করে অন্তত বাংলা পদবীর নাম প্রদান করুন।');
      return;
    }

    const newDesignation: Designation = {
      id: editingItem.id || `des-${Date.now()}`,
      name: {
        bn: editingItem.name.bn.trim(),
        en: (editingItem.name.en || editingItem.name.bn).trim(),
        ar: (editingItem.name.ar || editingItem.name.bn).trim(),
      },
      textColor: editingItem.textColor || '#2D3630',
      bgColor: editingItem.bgColor || '#F7F5F0',
      borderColor: editingItem.borderColor || '#EBE8E0',
      accentColor: editingItem.accentColor || '#2D5A41',
      badgeStyle: editingItem.badgeStyle || 'soft',
      fontWeight: editingItem.fontWeight || 'semibold',
      sortOrder: editingItem.sortOrder || designations.length + 1,
      isEnabled: editingItem.isEnabled !== false,
      isPredefined: editingItem.isPredefined || false,
    };

    const updated = storageService.saveDesignation(newDesignation);
    onDesignationsUpdated(updated);
    setEditingItem(null);
    setErrorMessage('');
    showToast('পদবী সফলভাবে সংরক্ষিত হয়েছে!');
  };

  const handleDelete = (id: string, nameBn: string) => {
    requestConfirm(
      'পদবী মুছে ফেলুন',
      `আপনি কি নিশ্চিতভাবে "${nameBn}" পদবীটি মুছে ফেলতে চান?`,
      () => {
        const res = storageService.deleteDesignation(id);
        if (!res.success) {
          alert(res.error || 'এই পদবীটি মোছা যাচ্ছে না।');
          return;
        }
        onDesignationsUpdated(res.list);
        showToast('পদবী মুছে ফেলা হয়েছে।');
      }
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= designations.length) return;

    const newOrder = [...designations];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((d) => d.id);
    const updated = storageService.reorderDesignations(orderedIds);
    onDesignationsUpdated(updated);
  };

  // Count how many members use each designation
  const getUsageCount = (d: Designation) => {
    return members.filter(
      (m) =>
        m.designationId === d.id ||
        (m.role && (m.role === d.name.bn || m.role === d.name.en || m.role === d.name.ar))
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#2D5A41]" />
            <h3 className="text-base font-bold text-[#2D3630]">
              পদবী ব্যবস্থাপনা ({designations.length} টি পদবী)
            </h3>
          </div>
          <p className="text-xs text-[#5C665F] mt-1">
            ফাউন্ডেশনের সদস্যদের পদবী, প্রিভিউ স্টাইল ও বহুভাষিক নাম (বাংলা, ইংরেজি, আরবি) কাস্টমাইজ করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem({
              ...emptyDesignation,
              sortOrder: designations.length + 1,
            });
            setErrorMessage('');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold self-start sm:self-center shrink-0 shadow-2xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন পদবী যোগ করুন</span>
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {editingItem && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#2D5A41]/40 shadow-xs space-y-4 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBE8E0]">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#2D5A41]" />
              <h4 className="text-sm font-bold text-[#2D3630]">
                {editingItem.id ? 'পদবী সম্পাদনা' : 'নতুন পদবী তৈরি'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setErrorMessage('');
              }}
              className="p-1 text-[#7A877E] hover:text-[#2D3630] rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#5C665F]">
              <span className="font-semibold text-[#2D3630]">লাইভ প্রিভিউ (Live Preview):</span>{' '}
              ওয়েবসাইটে ব্যাজটি যেভাবে প্রদর্শিত হবে
            </div>
            <div className="flex items-center gap-2">
              <DesignationBadge
                designation={{
                  id: editingItem.id || 'preview',
                  name: {
                    bn: editingItem.name?.bn || 'বাংলা পদবী',
                    en: editingItem.name?.en || 'English Designation',
                    ar: editingItem.name?.ar || 'اللقب بالعربية',
                  },
                  textColor: editingItem.textColor,
                  bgColor: editingItem.bgColor,
                  borderColor: editingItem.borderColor,
                  accentColor: editingItem.accentColor,
                  badgeStyle: editingItem.badgeStyle,
                  fontWeight: editingItem.fontWeight,
                  sortOrder: 1,
                  isEnabled: true,
                }}
                size="md"
              />
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Multilingual Names */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  পদবীর নাম (বাংলা) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: সাধারণ সম্পাদক"
                  value={editingItem.name?.bn || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      name: { ...editingItem.name, bn: e.target.value } as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  Designation (English)
                </label>
                <input
                  type="text"
                  placeholder="e.g. General Secretary"
                  value={editingItem.name?.en || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      name: { ...editingItem.name, en: e.target.value } as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  اللقب (العربية)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: الأمين العام"
                  value={editingItem.name?.ar || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      name: { ...editingItem.name, ar: e.target.value } as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41]"
                />
              </div>
            </div>

            {/* Colors & Appearance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">ব্যাকগ্রাউন্ড রঙ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingItem.bgColor || '#E8EFEA'}
                    onChange={(e) => setEditingItem({ ...editingItem, bgColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[#EBE8E0] cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={editingItem.bgColor || '#E8EFEA'}
                    onChange={(e) => setEditingItem({ ...editingItem, bgColor: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-[#EBE8E0] bg-[#FDFCF9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">টেক্সট রঙ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingItem.textColor || '#1E3E2B'}
                    onChange={(e) => setEditingItem({ ...editingItem, textColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[#EBE8E0] cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={editingItem.textColor || '#1E3E2B'}
                    onChange={(e) => setEditingItem({ ...editingItem, textColor: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-[#EBE8E0] bg-[#FDFCF9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">বর্ডার রঙ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingItem.borderColor || '#B8D5C2'}
                    onChange={(e) => setEditingItem({ ...editingItem, borderColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[#EBE8E0] cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={editingItem.borderColor || '#B8D5C2'}
                    onChange={(e) => setEditingItem({ ...editingItem, borderColor: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-[#EBE8E0] bg-[#FDFCF9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">অ্যাকসেন্ট ডট রঙ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingItem.accentColor || '#2D5A41'}
                    onChange={(e) => setEditingItem({ ...editingItem, accentColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[#EBE8E0] cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={editingItem.accentColor || '#2D5A41'}
                    onChange={(e) => setEditingItem({ ...editingItem, accentColor: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-[#EBE8E0] bg-[#FDFCF9]"
                  />
                </div>
              </div>
            </div>

            {/* Style and Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">ব্যাজ ধরন (Style)</label>
                <select
                  value={editingItem.badgeStyle || 'soft'}
                  onChange={(e) => setEditingItem({ ...editingItem, badgeStyle: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                >
                  <option value="soft">সফট ব্যাকগ্রাউন্ড (Soft Fill)</option>
                  <option value="accent">অ্যাকসেন্ট বর্ডার (Side Accent)</option>
                  <option value="outline">শুধুমাত্র আউটলাইন (Outline Only)</option>
                  <option value="classic">ক্লাসিক নিউট্রাল (Classic Neutral)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2D3630] mb-1">ফন্ট ওয়েট (Font Weight)</label>
                <select
                  value={editingItem.fontWeight || 'semibold'}
                  onChange={(e) => setEditingItem({ ...editingItem, fontWeight: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                >
                  <option value="normal">সাধারণ (Normal - 400)</option>
                  <option value="medium">মিডিয়াম (Medium - 500)</option>
                  <option value="semibold">সেমি-বোল্ড (Semibold - 600)</option>
                  <option value="bold">বোল্ড (Bold - 700)</option>
                </select>
              </div>
            </div>

            {/* Active Toggle & Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#EBE8E0]">
              <label className="flex items-center gap-2 cursor-pointer self-start sm:self-center">
                <input
                  type="checkbox"
                  checked={editingItem.isEnabled !== false}
                  onChange={(e) => setEditingItem({ ...editingItem, isEnabled: e.target.checked })}
                  className="rounded accent-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630]">
                  নতুন সদস্য তৈরির ফর্মে সক্রিয় রাখুন
                </span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 rounded-lg border border-[#EBE8E0] text-[#5C665F] font-semibold hover:bg-[#F7F5F0]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2D5A41] text-white font-semibold hover:bg-[#234733] shadow-2xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Designations Table */}
      <div className="bg-white rounded-2xl border border-[#EBE8E0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-[#F7F5F0] text-[#5C665F] font-semibold border-b border-[#EBE8E0]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ক্রম</th>
                <th className="py-2.5 px-3">পদবীর নাম (বাংলা / EN / AR)</th>
                <th className="py-2.5 px-3">প্রিভিউ ব্যাজ</th>
                <th className="py-2.5 px-3 text-center">সদস্য ব্যবহার</th>
                <th className="py-2.5 px-3 text-center">অবস্থা</th>
                <th className="py-2.5 px-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE8E0]">
              {designations.map((d, index) => {
                const count = getUsageCount(d);
                return (
                  <tr key={d.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#2D5A41]">
                      {d.sortOrder}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#2D3630]">{d.name.bn}</div>
                      <div className="text-[11px] text-[#7A877E] flex items-center gap-2 mt-0.5">
                        <span>{d.name.en}</span>
                        {d.name.ar && (
                          <>
                            <span>•</span>
                            <span dir="rtl">{d.name.ar}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <DesignationBadge designation={d} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7F5F0] text-[#5C665F] border border-[#EBE8E0]">
                        {count} জন
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.isEnabled !== false
                            ? 'bg-[#E8EFEA] text-[#2D5A41]'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {d.isEnabled !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1 rounded text-[#7A877E] hover:text-[#2D3630] disabled:opacity-30 disabled:cursor-not-allowed"
                          title="উপরে নিন"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === designations.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1 rounded text-[#7A877E] hover:text-[#2D3630] disabled:opacity-30 disabled:cursor-not-allowed"
                          title="নিচে নিন"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(d);
                            setErrorMessage('');
                          }}
                          className="p-1 rounded text-[#5C665F] hover:text-[#2D5A41] hover:bg-[#F7F5F0]"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id, d.name.bn)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
