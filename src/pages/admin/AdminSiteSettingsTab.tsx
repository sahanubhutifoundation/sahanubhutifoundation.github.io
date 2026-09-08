import React, { useState } from 'react';
import {
  Globe,
  Share2,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  Sliders,
  Image as ImageIcon,
  Compass,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { FoundationConfig, MultilingualText, LogoOverrides, FooterVisibilitySettings } from '../../types';
import { storageService } from '../../services/storageService';
import { MediaUploadField } from '../../components/MediaUploadField';
import {
  toCanonicalDateInput,
  formatFoundingDate,
  isMapUrlValid,
} from '../../utils/foundationHelpers';

interface AdminSiteSettingsTabProps {
  config: FoundationConfig;
  onConfigChange: (updated: FoundationConfig) => void;
  onShowToast: (msg: string) => void;
}

export const AdminSiteSettingsTab: React.FC<AdminSiteSettingsTabProps> = ({
  config,
  onConfigChange,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<FoundationConfig>(config);
  const [activeSection, setActiveSection] = useState<
    'general' | 'hero' | 'logo' | 'header' | 'footer' | 'about' | 'social' | 'members'
  >('general');

  const updateMultiText = (
    field: keyof FoundationConfig,
    lang: 'bn' | 'en' | 'ar',
    val: string
  ) => {
    const current = (formData[field] as MultilingualText) || { bn: '', en: '', ar: '' };
    setFormData({
      ...formData,
      [field]: {
        ...current,
        [lang]: val,
      },
    });
  };

  const updateLogoOverride = (location: keyof LogoOverrides, val: string) => {
    const current = formData.logoOverrides || {};
    setFormData({
      ...formData,
      logoOverrides: {
        ...current,
        [location]: val,
      },
    });
  };

  const updateFooterVisibility = (key: keyof FooterVisibilitySettings, val: boolean) => {
    const current = formData.footerVisibility || {};
    setFormData({
      ...formData,
      footerVisibility: {
        ...current,
        [key]: val,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveConfig(formData);
    onConfigChange(formData);
    onShowToast('সাইট সেটিংস ও CMS কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs">
      {/* Sub-tab Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#F7F5F0] rounded-2xl border border-[#EBE8E0]">
        {[
          { id: 'general', label: 'সাধারণ পরিচিতি', icon: Globe },
          { id: 'hero', label: 'হোমপেজ ও হিরো CMS', icon: Sparkles },
          { id: 'logo', label: 'লোগো ও অবস্থান', icon: ImageIcon },
          { id: 'header', label: 'হেডার কন্ট্রোল', icon: Compass },
          { id: 'footer', label: 'ফুটার কন্ট্রোল', icon: Layers },
          { id: 'about', label: 'আমাদের সম্পর্কে CMS', icon: FileText },
          { id: 'social', label: 'যোগাযোগ ও সোশ্যাল', icon: Share2 },
          { id: 'members', label: 'সদস্য প্রদর্শন শৈলী', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-[#2D5A41] shadow-xs border border-[#EBE8E0]'
                  : 'text-[#5C665F] hover:text-[#2D3630]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. GENERAL IDENTITY */}
      {activeSection === 'general' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-5">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#2D5A41]" />
              <span>ফাউন্ডেশন নাম ও অবস্থান পরিচিতি</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              ফাউন্ডেশনের ত্রিভাষিক নাম, প্রতিষ্ঠা তারিখ ও স্থায়ী কার্যালয়ের অবস্থান নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                ফাউন্ডেশনের নাম (বাংলা) *
              </label>
              <input
                type="text"
                required
                value={formData.nameBn}
                onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                ফাউন্ডেশনের নাম (English) *
              </label>
              <input
                type="text"
                required
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                ফাউন্ডেশনের নাম (العربية - Arabic)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          {/* Central Hero Brand Statement / Slogan */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-3">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                হিরো সেন্ট্রাল স্লোগান / ব্র্যান্ড স্টেটমেন্ট (Hero Brand Statement / Badge)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                হোমপেজের মূল ব্যানারে ফাউন্ডেশনের নামের উপরে প্রদর্শিত ব্র্যান্ড স্লোগান। অ্যাডমিন প্যানেলে সংরক্ষিত মানই পাবলিক পেজের উৎস।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">
                  বাংলা (BN)
                </label>
                <input
                  type="text"
                  value={formData.heroBadge?.bn || ''}
                  onChange={(e) => updateMultiText('heroBadge', 'bn', e.target.value)}
                  placeholder="পারিবারিক একতা ও মানবিক দায়বদ্ধতা"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">
                  English (EN)
                </label>
                <input
                  type="text"
                  value={formData.heroBadge?.en || ''}
                  onChange={(e) => updateMultiText('heroBadge', 'en', e.target.value)}
                  placeholder="Family Unity and Humanitarian Responsibility"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">
                  العربية (AR)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.heroBadge?.ar || ''}
                  onChange={(e) => updateMultiText('heroBadge', 'ar', e.target.value)}
                  placeholder="الوحدة العائلية والمسؤولية الإنسانية"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* Founding Date & Visibility */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EBE8E0]">
              <div>
                <label className="block font-bold text-[#2D3630]">
                  ফাউন্ডেশনের প্রতিষ্ঠা তারিখ (Foundation Founding Date)
                </label>
                <p className="text-[11px] text-[#7A877E] mt-0.5">
                  একটিমাত্র কেন্দ্রীয় তারিখ। এটি পরিবর্তন করলে ওয়েবসাইটের সকল স্থানে স্বয়ংক্রিয়ভাবে নতুন তারিখ প্রদর্শিত হবে।
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-[#EBE8E0] hover:border-[#2D5A41] transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={formData.showFoundingDate !== false}
                  onChange={(e) => setFormData({ ...formData, showFoundingDate: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="text-xs font-bold text-[#2D3630]">
                  {formData.showFoundingDate !== false ? (
                    <span className="text-[#2D5A41] flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> প্রতিষ্ঠা তারিখ চালু
                    </span>
                  ) : (
                    <span className="text-[#A34B4B] flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" /> সম্পূর্ণ লুকায়িত
                    </span>
                  )}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">
                  তারিখ নির্বাচন করুন (Date Input)
                </label>
                <input
                  type="date"
                  value={toCanonicalDateInput(formData.foundedDate)}
                  onChange={(e) => setFormData({ ...formData, foundedDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] font-medium focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-[#5C665F] mb-1">
                  লাইভ প্রিভিউ (Live Multilingual Display)
                </span>
                <div className="p-2 bg-white rounded-xl border border-[#EBE8E0] flex flex-wrap gap-2 text-xs font-medium text-[#2D3630]">
                  <span className="px-2 py-0.5 bg-[#E8EFEA] text-[#2D5A41] rounded-md">
                    বাংলা: {formatFoundingDate(formData.foundedDate, 'bn')}
                  </span>
                  <span className="px-2 py-0.5 bg-[#F7F5F0] text-[#5C665F] rounded-md">
                    EN: {formatFoundingDate(formData.foundedDate, 'en')}
                  </span>
                  <span className="px-2 py-0.5 bg-[#F7F5F0] text-[#5C665F] rounded-md" dir="rtl">
                    العربية: {formatFoundingDate(formData.foundedDate, 'ar')}
                  </span>
                </div>
              </div>
            </div>
            {formData.showFoundingDate === false && (
              <p className="text-[11px] text-[#A34B4B] bg-[#FDF3F3] p-2 rounded-lg border border-[#F5D5D5]">
                ⚠️ প্রতিষ্ঠা তারিখ এখন বন্ধ রয়েছে। পাবলিক ওয়েবসাইটে কোনো খালি স্পেস বা প্লেসহোল্ডার ছাড়াই এটি লুকায়িত থাকবে।
              </p>
            )}
          </div>

          {/* Centralized Foundation Location */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-4">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ফাউন্ডেশনের মূল অবস্থান ও ঠিকানা (Centralized Foundation Location)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                একই ঠিকানা সব জায়গা থেকে পরিচালিত হবে। ত্রিভাষিক টেক্সট এবং প্রদর্শন মোড নিয়ন্ত্রণ করুন।
              </p>
            </div>

            {/* Location Display Mode */}
            <div>
              <label className="block text-[11px] font-bold text-[#2D3630] mb-1.5">
                অবস্থান প্রদর্শন মোড (Location Display Mode)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    value: 'text',
                    label: 'সাধারণ টেক্সট (Text Only)',
                    desc: 'শুধুমাত্র ঠিকানা টেক্সট হিসেবে দেখাবে',
                    icon: MapPin,
                  },
                  {
                    value: 'map',
                    label: 'ক্লিকযোগ্য ম্যাপ লিংক (Clickable Map)',
                    desc: 'ক্লিক করলে গুগল ম্যাপে খুলবে',
                    icon: ExternalLink,
                  },
                  {
                    value: 'hidden',
                    label: 'সম্পূর্ণ লুকায়িত (Hidden)',
                    desc: 'ওয়েবসাইটে কোনো খালি স্পেস ছাড়া লুকাবে',
                    icon: EyeOff,
                  },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = (formData.locationDisplayMode || 'text') === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          locationDisplayMode: mode.value as any,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-[#E8EFEA] border-[#2D5A41] text-[#2D5A41] ring-1 ring-[#2D5A41]'
                          : 'bg-white border-[#EBE8E0] text-[#5C665F] hover:border-[#7A877E]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs">{mode.label}</div>
                        <div className="text-[10px] text-[#7A877E] mt-0.5">{mode.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google Maps URL */}
            <div>
              <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                গুগল ম্যাপ লিংক (Google Maps / Location Link)
              </label>
              <input
                type="url"
                value={formData.locationMapUrl || ''}
                onChange={(e) => setFormData({ ...formData, locationMapUrl: e.target.value })}
                placeholder="যেমন: https://maps.google.com/?q=..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
              <p className="text-[11px] text-[#7A877E] mt-1">
                ম্যাপ মোড চালু থাকলে ব্যবহারকারী লোকেশনে ক্লিক করলে নতুন ট্যাবে এই লিংকটি খুলবে। লিংক না থাকলে স্বয়ংক্রিয়ভাবে টেক্সট মোডে চলবে।
              </p>
            </div>

            {/* Multilingual Location Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  অবস্থানের ঠিকানা (বাংলা) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.foundationLocation?.bn ?? formData.originLocation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      originLocation: val,
                      foundationLocation: {
                        ...(formData.foundationLocation || {}),
                        bn: val,
                        en: formData.foundationLocation?.en || '',
                        ar: formData.foundationLocation?.ar || '',
                      },
                    });
                  }}
                  placeholder="মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের নিকটে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  অবস্থানের ঠিকানা (English)
                </label>
                <textarea
                  rows={2}
                  value={formData.foundationLocation?.en ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      foundationLocation: {
                        ...(formData.foundationLocation || {}),
                        bn: formData.foundationLocation?.bn || formData.originLocation,
                        en: val,
                        ar: formData.foundationLocation?.ar || '',
                      },
                    });
                  }}
                  placeholder="Moulovi Bari, near Mohammad Ali Bazar, Sharshadi, Feni Sadar, Feni, Bangladesh"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  অবস্থানের ঠিকানা (العربية - Arabic)
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={formData.foundationLocation?.ar ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      foundationLocation: {
                        ...(formData.foundationLocation || {}),
                        bn: formData.foundationLocation?.bn || formData.originLocation,
                        en: formData.foundationLocation?.en || '',
                        ar: val,
                      },
                    });
                  }}
                  placeholder="مولفي باري، بالقرب من سوق محمد علي، شارشادي، فيني سادار، فيني، بنغلاديش"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* Quick Primary Contact & Brand Assets in Identity */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-4">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                প্রাথমিক যোগাযোগ ও ব্র্যান্ড পরিচিতি (Primary Contact & Global Logo)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                হেডার, ফুটার ও যোগাযোগ পেজের মূল ফোন নম্বর, অফিসিয়াল ইমেইল ও ডিফল্ট লোগো।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  অফিসিয়াল ফোন নম্বর
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="যেমন: +880 1831-121031"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPhoneGeneralToggle"
                    checked={formData.showPhone !== false}
                    onChange={(e) => setFormData({ ...formData, showPhone: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-[#2D5A41]"
                  />
                  <label htmlFor="showPhoneGeneralToggle" className="text-[11px] text-[#5C665F] cursor-pointer">
                    ওয়েবসাইটে ফোন নম্বর সক্রিয়ভাবে প্রদর্শন করুন
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  অফিসিয়াল ইমেইল এড্রেস *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  ফেসবুক পেজ / গ্রুপ লিংক
                </label>
                <input
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  WhatsApp নম্বর
                </label>
                <input
                  type="text"
                  value={formData.whatsappNumber || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+880 1831-121031"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#EBE8E0]">
              <MediaUploadField
                label="মূল ডিফল্ট লোগো (Global Default Logo)"
                value={formData.logoUrl || ''}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                helperText="ফাউন্ডেশনের অফিসিয়াল হ্যান্ডশেক লোগো (স্বচ্ছ SVG অথবা PNG রিকমেন্ডেড)"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. HOMEPAGE & HERO CMS */}
      {activeSection === 'hero' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2D5A41]" />
              <span>হোমপেজ ও সেন্ট্রাল হিরো CMS (Homepage & Hero CMS)</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              হোমপেজের মূল হিরো ব্যানার, ব্র্যান্ড স্লোগান, মানবিক বার্তা, সাবটাইটেল, অ্যাকশন বোতাম এবং বিভিন্ন সেকশনের দৃশ্যমানতা নিয়ন্ত্রণ করুন।
            </p>
          </div>

          {/* 1. Hero Brand Statement / Slogan */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ১. হিরো সেন্ট্রাল স্লোগান / ব্র্যান্ড স্টেটমেন্ট (Hero Brand Statement / Badge)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                হোমপেজে ফাউন্ডেশনের নামের উপরে প্রদর্শিত ব্র্যান্ড স্লোগান।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">বাংলা (BN)</label>
                <input
                  type="text"
                  value={formData.heroBadge?.bn || ''}
                  onChange={(e) => updateMultiText('heroBadge', 'bn', e.target.value)}
                  placeholder="পারিবারিক একতা ও মানবিক দায়বদ্ধতা"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">English (EN)</label>
                <input
                  type="text"
                  value={formData.heroBadge?.en || ''}
                  onChange={(e) => updateMultiText('heroBadge', 'en', e.target.value)}
                  placeholder="Family Unity and Humanitarian Responsibility"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">العربية (AR)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.heroBadge?.ar || ''}
                  onChange={(e) => updateMultiText('heroBadge', 'ar', e.target.value)}
                  placeholder="الوحدة العائلية والمسؤولية الإنسانية"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* 2. Hero Central Humanitarian Message */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ২. হিরো মূল মানবিক বার্তা (Hero Central Humanitarian Message)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                ব্যানারের কেন্দ্রস্থলে বড় অক্ষরে প্রদর্শিত মূল মানবিক অঙ্গীকার।
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">বাংলা (BN)</label>
                <textarea
                  rows={2}
                  value={formData.heroMessage?.bn || ''}
                  onChange={(e) => updateMultiText('heroMessage', 'bn', e.target.value)}
                  placeholder="একতা, সহানুভূতি ও মানবিকতার মাধ্যমে আমরা আমাদের নিজেদের মানুষদের পাশে দাঁড়াতে চাই..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">English (EN)</label>
                <textarea
                  rows={2}
                  value={formData.heroMessage?.en || ''}
                  onChange={(e) => updateMultiText('heroMessage', 'en', e.target.value)}
                  placeholder="Through unity, empathy, and humanity, we stand beside our people..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">العربية (AR)</label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={formData.heroMessage?.ar || ''}
                  onChange={(e) => updateMultiText('heroMessage', 'ar', e.target.value)}
                  placeholder="من خلال الوحدة والتعاطف والإنسانية، نسعى للوقوف إلى جانب أهلنا..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* 3. Hero Subtitle / Description */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ৩. হিরো সংক্ষিপ্ত উপশিরোনাম (Hero Subtitle / Description)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                মানবিক বার্তার ঠিক নিচে প্রদর্শিত সংক্ষিপ্ত পরিচিতিমূলক এক-লাইনার।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">বাংলা (BN)</label>
                <input
                  type="text"
                  value={formData.heroSubtitle?.bn || ''}
                  onChange={(e) => updateMultiText('heroSubtitle', 'bn', e.target.value)}
                  placeholder="ফেনীর শর্শদী ইউনিয়নের মৌলভী বাড়ির তরুণদের উদ্যোগে প্রতিষ্ঠিত..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">English (EN)</label>
                <input
                  type="text"
                  value={formData.heroSubtitle?.en || ''}
                  onChange={(e) => updateMultiText('heroSubtitle', 'en', e.target.value)}
                  placeholder="A sincere humanitarian family platform founded by the youth..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C665F] mb-1">العربية (AR)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.heroSubtitle?.ar || ''}
                  onChange={(e) => updateMultiText('heroSubtitle', 'ar', e.target.value)}
                  placeholder="منصة إنسانية عائلية مخلصة أسسها شباب مولفي باري..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* 4. Hero Action Buttons (CTAs) */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ৪. হিরো অ্যাকশন বোতাম ও লিংকসমূহ (Call-to-Action Buttons & Links)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                ব্যানারে প্রদর্শিত তিনটি অ্যাকশন বোতামের কাস্টম লেখা ও গন্তব্য পেজ লিংক নির্ধারণ করুন।
              </p>
            </div>

            {/* Primary CTA */}
            <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2D5A41]">প্রধান বোতাম (Primary CTA - সাধারণত আমাদের সম্পর্কে পেজ)</span>
                <span className="text-[11px] text-[#7A877E]">ডিফল্ট লিংক: /about</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={formData.heroPrimaryCtaText?.bn || ''}
                  onChange={(e) => updateMultiText('heroPrimaryCtaText', 'bn', e.target.value)}
                  placeholder="আমাদের সম্পর্কে (BN)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  value={formData.heroPrimaryCtaText?.en || ''}
                  onChange={(e) => updateMultiText('heroPrimaryCtaText', 'en', e.target.value)}
                  placeholder="About Us (EN)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  dir="rtl"
                  value={formData.heroPrimaryCtaText?.ar || ''}
                  onChange={(e) => updateMultiText('heroPrimaryCtaText', 'ar', e.target.value)}
                  placeholder="عن المؤسسة (AR)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  value={formData.heroPrimaryCtaLink || ''}
                  onChange={(e) => setFormData({ ...formData, heroPrimaryCtaLink: e.target.value })}
                  placeholder="লিংক (যেমন: /about)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#2D3630]">দ্বিতীয় বোতাম (Secondary CTA - সাধারণত কার্যক্রম পেজ)</span>
                <span className="text-[11px] text-[#7A877E]">ডিফল্ট লিংক: /activities</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={formData.heroSecondaryCtaText?.bn || ''}
                  onChange={(e) => updateMultiText('heroSecondaryCtaText', 'bn', e.target.value)}
                  placeholder="কার্যক্রম দেখুন (BN)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  value={formData.heroSecondaryCtaText?.en || ''}
                  onChange={(e) => updateMultiText('heroSecondaryCtaText', 'en', e.target.value)}
                  placeholder="View Activities (EN)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  dir="rtl"
                  value={formData.heroSecondaryCtaText?.ar || ''}
                  onChange={(e) => updateMultiText('heroSecondaryCtaText', 'ar', e.target.value)}
                  placeholder="عرض الأنشطة (AR)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  value={formData.heroSecondaryCtaLink || ''}
                  onChange={(e) => setFormData({ ...formData, heroSecondaryCtaLink: e.target.value })}
                  placeholder="লিংক (যেমন: /activities)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
              </div>
            </div>

            {/* Contact CTA */}
            <div className="p-3 bg-white rounded-xl border border-[#EBE8E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#5C665F]">যোগাযোগ বোতাম (Contact CTA)</span>
                <span className="text-[11px] text-[#7A877E]">ডিফল্ট লিংক: /contact</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={formData.heroContactCtaText?.bn || ''}
                  onChange={(e) => updateMultiText('heroContactCtaText', 'bn', e.target.value)}
                  placeholder="যোগাযোগ করুন (BN)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  value={formData.heroContactCtaText?.en || ''}
                  onChange={(e) => updateMultiText('heroContactCtaText', 'en', e.target.value)}
                  placeholder="Contact Us (EN)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  dir="rtl"
                  value={formData.heroContactCtaText?.ar || ''}
                  onChange={(e) => updateMultiText('heroContactCtaText', 'ar', e.target.value)}
                  placeholder="اتصل بنا (AR)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
                <input
                  type="text"
                  value={formData.heroContactCtaLink || ''}
                  onChange={(e) => setFormData({ ...formData, heroContactCtaLink: e.target.value })}
                  placeholder="লিংক (যেমন: /contact)"
                  className="px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                />
              </div>
            </div>
          </div>

          {/* 5. Homepage Sections Visibility Toggles */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ৫. হোমপেজের মূল সেকশনসমূহ প্রদর্শন নিয়ন্ত্রণ (Homepage Section Toggles)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                হোমপেজে কোন কোন প্রিভিউ সেকশন দৃশ্যমান থাকবে তা চালু বা বন্ধ করুন।
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EBE8E0] bg-white cursor-pointer hover:border-[#2D5A41] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.showNoticeTicker !== false}
                  onChange={(e) => setFormData({ ...formData, showNoticeTicker: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630] text-xs">জরুরি নোটিশ টিকার</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EBE8E0] bg-white cursor-pointer hover:border-[#2D5A41] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.showHomeFundSummary !== false}
                  onChange={(e) => setFormData({ ...formData, showHomeFundSummary: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630] text-xs">তহবিল ও বাইতুল মাল প্রিভিউ</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EBE8E0] bg-white cursor-pointer hover:border-[#2D5A41] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.showHomeActivities !== false}
                  onChange={(e) => setFormData({ ...formData, showHomeActivities: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630] text-xs">সাম্প্রতিক কার্যক্রম প্রিভিউ</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EBE8E0] bg-white cursor-pointer hover:border-[#2D5A41] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.showHomeMembersPreview !== false}
                  onChange={(e) => setFormData({ ...formData, showHomeMembersPreview: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630] text-xs">সদস্য তালিকা প্রিভিউ</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EBE8E0] bg-white cursor-pointer hover:border-[#2D5A41] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.showHomeGalleryPreview !== false}
                  onChange={(e) => setFormData({ ...formData, showHomeGalleryPreview: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630] text-xs">ছবি গ্যালারি প্রিভিউ</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOGO MANAGEMENT */}
      {activeSection === 'logo' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#2D5A41]" />
              <span>লোগো ও অবস্থানভিত্তিক ওভাররাইড (Logo CMS)</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              ফাউন্ডেশনের মূল হ্যান্ডশেক প্রতীক লোগো নির্ধারণ করুন। চাইলে হেডার, হিরো, ফুটার বা অ্যাডমিন প্যানেলের জন্য আলাদা লোগো যুক্ত করতে পারেন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="মূল ডিফল্ট লোগো (Global Default Logo)"
                value={formData.logoUrl || ''}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                helperText="ফাউন্ডেশনের অফিসিয়াল হ্যান্ডশেক লোগো (স্বচ্ছ SVG অথবা PNG রিকমেন্ডেড)"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="হেডার লোগো ওভাররাইড (Header Logo Override)"
                value={formData.logoOverrides?.header || ''}
                onChange={(url) => updateLogoOverride('header', url)}
                helperText="খালি রাখলে মূল ডিফল্ট লোগো প্রদর্শিত হবে"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="হিরো সেকশন লোগো (Hero Logo Override)"
                value={formData.logoOverrides?.hero || ''}
                onChange={(url) => updateLogoOverride('hero', url)}
                helperText="হোমপেজের মূল ব্যানারে বড় আকারে প্রদর্শিত লোগো"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="ফুটার লোগো (Footer Logo Override - Dark Theme)"
                value={formData.logoOverrides?.footer || ''}
                onChange={(url) => updateLogoOverride('footer', url)}
                helperText="ফুটারের গাঢ় সবুজ ব্যাকগ্রাউন্ডের জন্য উপযুক্ত লোগো"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. HEADER CONTROLS */}
      {activeSection === 'header' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-5">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#2D5A41]" />
              <span>হেডার ও নেভিগেশন সেটিংস</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              ওয়েবসাইটের উপরের হেডারের ট্যাগলাইন, কল-টু-অ্যাকশন (CTA) বোতাম এবং ভাষা নির্বাচক নিয়ন্ত্রণ করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                হেডার ট্যাগলাইন (বাংলা)
              </label>
              <input
                type="text"
                value={formData.headerTagline?.bn || ''}
                onChange={(e) => updateMultiText('headerTagline', 'bn', e.target.value)}
                placeholder="যেমন: সহানুভূতি ফাউন্ডেশন • মৌলভী বাড়ি, শর্শদী"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Header Tagline (English)
              </label>
              <input
                type="text"
                value={formData.headerTagline?.en || ''}
                onChange={(e) => updateMultiText('headerTagline', 'en', e.target.value)}
                placeholder="e.g. Sahanubhuti Foundation • Moulovi Bari"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Header Tagline (العربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.headerTagline?.ar || ''}
                onChange={(e) => updateMultiText('headerTagline', 'ar', e.target.value)}
                placeholder="مؤسسة التعاطف • مولفي باري"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#EBE8E0]">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                হেডার CTA বোতামের নাম (বাংলা)
              </label>
              <input
                type="text"
                value={formData.headerCtaText?.bn || ''}
                onChange={(e) => updateMultiText('headerCtaText', 'bn', e.target.value)}
                placeholder="যেমন: তহবিল হিসাব"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Header CTA Text (English)
              </label>
              <input
                type="text"
                value={formData.headerCtaText?.en || ''}
                onChange={(e) => updateMultiText('headerCtaText', 'en', e.target.value)}
                placeholder="e.g. Fund Ledger"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                CTA গন্তব্য লিঙ্ক
              </label>
              <input
                type="text"
                value={formData.headerCtaLink || '/fund'}
                onChange={(e) => setFormData({ ...formData, headerCtaLink: e.target.value })}
                placeholder="/fund বা /contact"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#EBE8E0]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showHeaderCta !== false}
                onChange={(e) => setFormData({ ...formData, showHeaderCta: e.target.checked })}
                className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
              />
              <span className="font-semibold text-[#2D3630]">হেডারে CTA বোতাম প্রদর্শন করুন</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showHeaderPhone !== false}
                onChange={(e) => setFormData({ ...formData, showHeaderPhone: e.target.checked })}
                className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
              />
              <span className="font-semibold text-[#2D3630]">হেডারে সক্রিয় ফোন নম্বর প্রদর্শন করুন</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showLanguageSelector !== false}
                onChange={(e) => setFormData({ ...formData, showLanguageSelector: e.target.checked })}
                className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
              />
              <span className="font-semibold text-[#2D3630]">ভাষা নির্বাচক (Language Selector) প্রদর্শন করুন</span>
            </label>
          </div>
        </div>
      )}

      {/* 4. FOOTER CONTROLS */}
      {activeSection === 'footer' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-5">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2D5A41]" />
              <span>ফুটার কনটেন্ট ও দৃশ্যমানতা সেটিংস</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              ফুটারের পরিচিতি বক্তব্য, কপিরাইট টেক্সট এবং সেকশনগুলোর দৃশ্যমানতা টগল করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                ফুটার পরিচিতি বক্তব্য (বাংলা)
              </label>
              <textarea
                rows={3}
                value={formData.footerDescription?.bn || ''}
                onChange={(e) => updateMultiText('footerDescription', 'bn', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Footer Description (English)
              </label>
              <textarea
                rows={3}
                value={formData.footerDescription?.en || ''}
                onChange={(e) => updateMultiText('footerDescription', 'en', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#EBE8E0]">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                কপিরাইট টেক্সট (বাংলা)
              </label>
              <input
                type="text"
                value={formData.footerCopyright?.bn || ''}
                onChange={(e) => updateMultiText('footerCopyright', 'bn', e.target.value)}
                placeholder="যেমন: © ২০২৪-২০২৬ সহানুভূতি ফাউন্ডেশন। সর্বস্বত্ব সংরক্ষিত।"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Copyright Text (English)
              </label>
              <input
                type="text"
                value={formData.footerCopyright?.en || ''}
                onChange={(e) => updateMultiText('footerCopyright', 'en', e.target.value)}
                placeholder="e.g. © 2024-2026 Sahanubhuti Foundation. All rights reserved."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#EBE8E0]">
            <span className="block font-bold text-[#2D3630] mb-2">ফুটার সেকশন প্রদর্শন টগল:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'showDescription', label: 'পরিচিতি ও লোগো' },
                { key: 'showNavigation', label: 'দ্রুত লিঙ্কসমূহ' },
                { key: 'showOrigin', label: 'অবস্থান ও হেডকোয়ার্টার' },
                { key: 'showContact', label: 'যোগাযোগ ও ইমেইল' },
                { key: 'showSocial', label: 'সোশ্যাল মিডিয়া আইকন' },
                { key: 'showCopyright', label: 'কপিরাইট বার' },
              ].map(({ key, label }) => {
                const isChecked = (formData.footerVisibility as any)?.[key] !== false;
                return (
                  <label key={key} className="flex items-center gap-2 p-2.5 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] cursor-pointer hover:bg-[#F7F5F0]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => updateFooterVisibility(key as any, e.target.checked)}
                      className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                    />
                    <span className="text-[#2D3630] font-medium">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. ABOUT PAGE NARRATIVE CMS */}
      {activeSection === 'about' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-5">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2D5A41]" />
              <span>আমাদের সম্পর্কে ও ইতিহাস CMS</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              পারিবারিক উদ্যোগের শুরু, বাস্তবায়িত মানবিক উদ্যোগ, বাইতুল মাল দর্শন এবং ভবিষ্যৎ সম্প্রসারণ সংক্রান্ত বক্তব্য সম্পাদনা করুন।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
            <MediaUploadField
              label="আমাদের সম্পর্কে পৃষ্ঠার ব্যানার ছবি (About Page Banner Image)"
              value={formData.aboutImage || ''}
              onChange={(url) => setFormData({ ...formData, aboutImage: url })}
              helperText="ফাউন্ডেশনের সভা বা মানবিক উদ্যোগের বাস্তব ছবি"
            />
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                আমাদের শুরু ও পারিবারিক উদ্যোগ বক্তব্য (বাংলা)
              </label>
              <textarea
                rows={4}
                value={formData.familyInitiativeText?.bn || ''}
                onChange={(e) => updateMultiText('familyInitiativeText', 'bn', e.target.value)}
                placeholder="পারিবারিক তরুণদের উদ্যোগের পেছনের প্রেক্ষাপট..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                বাইতুল মাল দর্শন ও সঞ্চয় গুরুত্ব (বাংলা)
              </label>
              <textarea
                rows={3}
                value={formData.baytulMalText?.bn || ''}
                onChange={(e) => updateMultiText('baytulMalText', 'bn', e.target.value)}
                placeholder="বাইতুল মাল এর গুরুত্ব ও সদস্যদের মাসিক জমার ভূমিকা..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                ভবিষ্যত সম্প্রসারণ ও সমাজ উন্নয়ন রূপরেখা (বাংলা)
              </label>
              <textarea
                rows={3}
                value={formData.expansionStatement?.bn || ''}
                onChange={(e) => updateMultiText('expansionStatement', 'bn', e.target.value)}
                placeholder="ভবিষ্যতে পরিবারের গণ্ডি পেরিয়ে বৃহত্তর সমাজ কল্যাণের রূপরেখা..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. SOCIAL & CONTACT CHANNELS */}
      {activeSection === 'social' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-5">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#2D5A41]" />
              <span>যোগাযোগ ও সোশ্যাল মিডিয়া চ্যানেল</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              অফিসিয়াল যোগাযোগ চ্যানেল ও সোশ্যাল লিংকসমূহ। কোনো ভুয়া নম্বর রাখা হবে না; ফোন নম্বর সক্রিয় না থাকলে খালি রাখা বা হাইড করা যাবে।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                অফিসিয়াল ফোন / মোবাইল নম্বর
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="যেমন: +880 1831-121031"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPhoneToggle"
                  checked={formData.showPhone !== false}
                  onChange={(e) => setFormData({ ...formData, showPhone: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-[#2D5A41]"
                />
                <label htmlFor="showPhoneToggle" className="text-[11px] text-[#5C665F] cursor-pointer">
                  ওয়েবসাইটে ফোন নম্বর সক্রিয়ভাবে প্রদর্শন করুন
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                অফিসিয়াল ইমেইল এড্রেস *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                অফিসিয়াল ফেসবুক পেজ বা গ্রুপ লিংক
              </label>
              <input
                type="url"
                value={formData.facebookUrl}
                onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                placeholder="https://facebook.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                ইউটিউব চ্যানেল লিংক
              </label>
              <input
                type="url"
                value={formData.youtubeUrl || ''}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                placeholder="https://youtube.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                WhatsApp নম্বর
              </label>
              <input
                type="text"
                value={formData.whatsappNumber || ''}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="যেমন: +8801831121031"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Imo নম্বর
              </label>
              <input
                type="text"
                value={formData.imoNumber || ''}
                onChange={(e) => setFormData({ ...formData, imoNumber: e.target.value })}
                placeholder="যেমন: +8801859046961"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. MEMBERS DISPLAY PREFERENCES */}
      {activeSection === 'members' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-5">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <User className="w-4 h-4 text-[#2D5A41]" />
              <span>সদস্য প্রোফাইল ছবি প্রদর্শন শৈলী</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              সদস্য তালিকা ও বিস্তারিত পেজে সদস্যের অবতার/ছবির ফ্রেমের আকার ও শেপ নির্ধারণ করুন।
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#2D3630] mb-2">
              ডিফল্ট অবতার ফ্রেম শেপ:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'circle', label: 'বৃত্তাকার (Circular - Classic)', preview: 'rounded-full' },
                { id: 'rounded', label: 'সফট কোণযুক্ত (Rounded Square)', preview: 'rounded-2xl' },
                { id: 'square', label: 'ক্লাসিক বক্স (Square Frame)', preview: 'rounded-md' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    formData.memberImageShape === opt.id || (!formData.memberImageShape && opt.id === 'circle')
                      ? 'border-[#2D5A41] bg-[#E8EFEA]'
                      : 'border-[#EBE8E0] bg-[#FDFCF9] hover:bg-[#F7F5F0]'
                  }`}
                >
                  <input
                    type="radio"
                    name="memberImageShape"
                    value={opt.id}
                    checked={formData.memberImageShape === opt.id || (!formData.memberImageShape && opt.id === 'circle')}
                    onChange={(e) => setFormData({ ...formData, memberImageShape: e.target.value as any })}
                    className="text-[#2D5A41] focus:ring-[#2D5A41]"
                  />
                  <div className={`w-8 h-8 ${opt.preview} bg-[#2D5A41] text-white flex items-center justify-center shrink-0`}>
                    <User className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-[#2D3630] text-xs">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Action Bar */}
      <div className="sticky bottom-6 z-20 flex justify-end p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE8E0] shadow-lg">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white font-semibold text-xs shadow-2xs active:scale-98 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>সকল সাইট সেটিংস পরিবর্তন সংরক্ষণ করুন</span>
        </button>
      </div>
    </form>
  );
};
