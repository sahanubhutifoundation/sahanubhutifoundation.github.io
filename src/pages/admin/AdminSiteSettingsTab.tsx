import React, { useState, useEffect } from 'react';
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
  Loader2,
  Plus,
  Trash2,
  Grid,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Heart,
  Users,
  Wallet,
  Stethoscope,
  GraduationCap,
  Upload,
  Wand2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  FoundationConfig,
  MultilingualText,
  LogoOverrides,
  FooterVisibilitySettings,
  FooterAppearanceSettings,
  ContactPageConfig,
  AboutValueCard,
  AboutFutureCard,
  Activity,
  SocialSharePreviewConfig,
} from '../../types';
import { storageService } from '../../services/storageService';
import { mediaService } from '../../services/mediaService';
import { renderSocialCardCanvas, generateSocialCardBlob } from '../../utils/socialCardGenerator';
import { MediaUploadField } from '../../components/MediaUploadField';
import {
  toCanonicalDateInput,
  formatFoundingDate,
  isMapUrlValid,
} from '../../utils/foundationHelpers';

export interface AdminSiteSettingsTabProps {
  config: FoundationConfig;
  onConfigChange: (updated: FoundationConfig) => void;
  onShowToast: (msg: string) => void;
  currentSection?:
    | 'general'
    | 'hero'
    | 'logo'
    | 'header'
    | 'footer'
    | 'about'
    | 'contact'
    | 'social'
    | 'social-share'
    | 'members';
  hideSubNav?: boolean;
}

export const AdminSiteSettingsTab: React.FC<AdminSiteSettingsTabProps> = ({
  config,
  onConfigChange,
  onShowToast,
  currentSection,
  hideSubNav = false,
}) => {
  const [formData, setFormData] = useState<FoundationConfig>(config);
  const [activeSection, setActiveSection] = useState<
    | 'general'
    | 'hero'
    | 'logo'
    | 'header'
    | 'footer'
    | 'about'
    | 'contact'
    | 'social'
    | 'social-share'
    | 'members'
  >(currentSection || 'general');

  useEffect(() => {
    if (currentSection) {
      setActiveSection(currentSection);
    }
  }, [currentSection]);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const [availableActivities, setAvailableActivities] = useState<Activity[]>([]);
  const [selectedActivityToAdd, setSelectedActivityToAdd] = useState<string>('');

  useEffect(() => {
    const loadActs = () => {
      setAvailableActivities(storageService.getActivities().filter((a) => a.isPublished !== false));
    };
    loadActs();
    window.addEventListener('sf_data_updated', loadActs);
    return () => window.removeEventListener('sf_data_updated', loadActs);
  }, []);

  // Social Share Preview State & Handlers
  const [shareCardPreviewLang, setShareCardPreviewLang] = useState<'bn' | 'en' | 'ar'>(
    formData.socialSharePreview?.cardLanguage || 'bn'
  );
  const [isGeneratingShareCard, setIsGeneratingShareCard] = useState<boolean>(false);
  const [cardCanvasPreviewUrl, setCardCanvasPreviewUrl] = useState<string>('');
  const [customImageWarning, setCustomImageWarning] = useState<string | null>(null);
  const [customImageDimensions, setCustomImageDimensions] = useState<{ width: number; height: number } | null>(() => {
    if (formData.socialSharePreview?.customImageWidth && formData.socialSharePreview?.customImageHeight) {
      return {
        width: formData.socialSharePreview.customImageWidth,
        height: formData.socialSharePreview.customImageHeight,
      };
    }
    return null;
  });

  const currentShareMode: 'auto' | 'custom' = formData.socialSharePreview?.mode || 'auto';

  // Live Auto-Generated Card Canvas Preview re-render
  useEffect(() => {
    let isCancelled = false;
    const generatePreview = async () => {
      try {
        const logoUrl =
          formData.socialSharePreview?.cardLogoUrl ||
          formData.logoOverrides?.header ||
          formData.logoUrl ||
          '/assets/logo.svg';

        const canvas = await renderSocialCardCanvas({
          lang: shareCardPreviewLang,
          logoUrl,
          title: formData.socialSharePreview?.title?.[shareCardPreviewLang] || formData.socialSharePreview?.title?.bn || '',
          description: formData.socialSharePreview?.description?.[shareCardPreviewLang] || formData.socialSharePreview?.description?.bn || '',
          nameBn: formData.nameBn,
          nameEn: formData.nameEn,
          nameAr: formData.nameAr,
          domain: 'sahanubhutifoundation.github.io',
        });
        if (!isCancelled) {
          setCardCanvasPreviewUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.warn('Could not render live canvas preview:', err);
      }
    };

    generatePreview();
    return () => {
      isCancelled = true;
    };
  }, [
    shareCardPreviewLang,
    formData.socialSharePreview?.cardLogoUrl,
    formData.socialSharePreview?.title,
    formData.socialSharePreview?.description,
    formData.logoOverrides?.header,
    formData.logoUrl,
    formData.nameBn,
    formData.nameEn,
    formData.nameAr,
  ]);

  const handleShareModeChange = (mode: 'auto' | 'custom') => {
    const effectiveImg = mode === 'custom'
      ? (formData.socialSharePreview?.customImageUrl || '')
      : (formData.socialSharePreview?.autoGeneratedImageUrl || cardCanvasPreviewUrl || '');
    const updatedSharePreview: SocialSharePreviewConfig = {
      ...formData.socialSharePreview,
      mode,
      imageUrl: effectiveImg,
    };
    setFormData({
      ...formData,
      socialSharePreview: updatedSharePreview,
    });
  };

  const handleGenerateAndSaveCard = async () => {
    try {
      setIsGeneratingShareCard(true);
      const logoUrl =
        formData.socialSharePreview?.cardLogoUrl ||
        formData.logoOverrides?.header ||
        formData.logoUrl ||
        '/assets/logo.svg';

      const blob = await generateSocialCardBlob({
        lang: shareCardPreviewLang,
        logoUrl,
        title: formData.socialSharePreview?.title?.[shareCardPreviewLang] || formData.socialSharePreview?.title?.bn || '',
        description: formData.socialSharePreview?.description?.[shareCardPreviewLang] || formData.socialSharePreview?.description?.bn || '',
        nameBn: formData.nameBn,
        nameEn: formData.nameEn,
        nameAr: formData.nameAr,
        domain: 'sahanubhutifoundation.github.io',
      });

      if (!blob || blob.size === 0) {
        throw new Error('কার্ডের ইমেজ ডাটা তৈরি করা সম্ভব হয়নি।');
      }

      const file = new File([blob], `sf-share-card-${shareCardPreviewLang}.png`, { type: 'image/png' });
      const uploadRes = await mediaService.uploadFile(file, {
        bucket: 'branding',
        previousUrl: formData.socialSharePreview?.autoGeneratedImageUrl,
      });

      if (!uploadRes.success || !uploadRes.url) {
        throw new Error(uploadRes.error || 'কার্ড আপলোড ও সংরক্ষণ ব্যর্থ হয়েছে।');
      }

      const updatedSharePreview: SocialSharePreviewConfig = {
        ...formData.socialSharePreview,
        mode: 'auto',
        cardLanguage: shareCardPreviewLang,
        autoGeneratedImageUrl: uploadRes.url,
        imageUrl: uploadRes.url,
      };

      const updatedConfig: FoundationConfig = {
        ...formData,
        socialSharePreview: updatedSharePreview,
      };

      setFormData(updatedConfig);
      await storageService.saveConfigAsync(updatedConfig);
      onConfigChange(updatedConfig);
      setPublishStatus({
        saved: true,
        published: 'manual_required',
        message: '১২০০x৬৩০ ব্রanded শেয়ার কার্ড সেন্ট্রাল ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে।',
      });
      onShowToast('১২০০x৬৩০ ব্রanded শেয়ার কার্ড সফলভাবে তৈরি ও সংরক্ষণ করা হয়েছে!');
    } catch (err: any) {
      console.error('Share card generation failed:', err);
      onShowToast(err.message || 'শেয়ার কার্ড তৈরি করতে সমস্যা হয়েছে। পূর্বের সেটিংস অপরিবর্তিত রাখা হয়েছে।');
    } finally {
      setIsGeneratingShareCard(false);
    }
  };

  const handleCustomImageUpload = (url: string) => {
    if (!url) {
      const updatedSharePreview: SocialSharePreviewConfig = {
        ...formData.socialSharePreview,
        customImageUrl: '',
        customImageWidth: undefined,
        customImageHeight: undefined,
        imageUrl: currentShareMode === 'custom' ? '' : (formData.socialSharePreview?.autoGeneratedImageUrl || ''),
      };
      setFormData({
        ...formData,
        socialSharePreview: updatedSharePreview,
      });
      setCustomImageWarning(null);
      setCustomImageDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setCustomImageDimensions({ width: w, height: h });

      const ratio = w / h;
      const targetRatio = 1200 / 630;
      if (Math.abs(ratio - targetRatio) > 0.18 || w < 600 || h < 315) {
        setCustomImageWarning(
          `সতর্কতা: আপলোডকৃত ছবির আকার ${w} × ${h} পিক্সেল (অনুপাত ${ratio.toFixed(2)}:1)। ফেসবুক ও হোয়াটসঅ্যাপে ১২০০ × ৬৩০ (১.৯১:১) অনুপাতের ছবি নিখুঁত প্রদর্শিত হয়। অন্য সাইজের ছবি ক্রপ হতে পারে।`
        );
      } else {
        setCustomImageWarning(null);
      }

      const updatedSharePreview: SocialSharePreviewConfig = {
        ...formData.socialSharePreview,
        mode: 'custom',
        customImageUrl: url,
        customImageWidth: w,
        customImageHeight: h,
        imageUrl: url,
      };

      setFormData({
        ...formData,
        socialSharePreview: updatedSharePreview,
      });
    };
    img.onerror = () => {
      const updatedSharePreview: SocialSharePreviewConfig = {
        ...formData.socialSharePreview,
        mode: 'custom',
        customImageUrl: url,
        imageUrl: url,
      };
      setFormData({
        ...formData,
        socialSharePreview: updatedSharePreview,
      });
    };
    img.src = url;
  };

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

  const updateFooterAppearance = (key: keyof FooterAppearanceSettings, val: any) => {
    const current = formData.footerAppearance || {};
    setFormData({
      ...formData,
      footerAppearance: {
        ...current,
        [key]: val,
      },
    });
  };

  const updateContactConfig = (field: keyof ContactPageConfig, val: any) => {
    const current = formData.contactPageConfig || {};
    setFormData({
      ...formData,
      contactPageConfig: {
        ...current,
        [field]: val,
      },
    });
  };

  const updateContactMultiText = (
    field: keyof ContactPageConfig,
    lang: 'bn' | 'en' | 'ar',
    val: string
  ) => {
    const current = formData.contactPageConfig || {};
    const currentText = (current[field] as MultilingualText) || { bn: '', en: '', ar: '' };
    setFormData({
      ...formData,
      contactPageConfig: {
        ...current,
        [field]: {
          ...currentText,
          [lang]: val,
        },
      },
    });
  };

  const updateFeatureCard = (index: number, field: 'title' | 'description', lang: 'bn' | 'en', value: string) => {
    const defaultCards = [
      {
        id: 'feat-1',
        title: { bn: 'শতভাগ আর্থিক স্বচ্ছতা', en: '100% Financial Transparency', ar: 'الشفافية المالية التامة' },
        description: { bn: 'তহবিলের প্রতিটি টাকা ও ব্যয়ের হিসাব সবার জন্য দৃশ্যমান ও উন্মুক্ত।', en: 'Every single penny received and spent is completely open.', ar: 'كل قرش يدخل ويصرف مسجل ومتاح للجميع.' },
        icon: 'ShieldCheck',
      },
      {
        id: 'feat-2',
        title: { bn: 'পারিবারিক বাইতুল মাল', en: 'Family Baytul Mal', ar: 'بيت المال العائلي' },
        description: { bn: 'মাসিক ক্ষুদ্র সঞ্চয়ের মাধ্যমে আপৎকালীন বিপদে স্বজনদের সহায়তার স্থায়ী তহবিল।', en: 'Permanent safety fund built through small monthly member contributions.', ar: 'صندوق أمان دائم تم إنشاؤه من خلال المساهمات الشهرية المنتظمة.' },
        icon: 'HeartHandshake',
      },
      {
        id: 'feat-3',
        title: { bn: 'বাস্তবধর্মী ও সততাপূর্ণ পথচলা', en: 'Realistic & Sincere Journey', ar: 'مسيرة واقعية ومخلصة' },
        description: { bn: 'কোনো অতিরঞ্জন বা অসত্য দাবি নয়; সামর্থ্য অনুযায়ী নিবেদিত সেবা।', en: 'No exaggerated claims; honest service true to our actual capacity.', ar: 'خدمة مخلصة وفق قدراتنا الحقيقية دون أي ادعاءات مبالغ فيها.' },
        icon: 'UserCheck',
      },
    ];
    const currentCards = [...(formData.featureCards && formData.featureCards.length === 3 ? formData.featureCards : defaultCards)];
    const card = { ...currentCards[index] };
    const multiObj = { ...(card[field] as any) };
    multiObj[lang] = value;
    (card as any)[field] = multiObj;
    currentCards[index] = card;
    setFormData({ ...formData, featureCards: currentCards });
  };

  const updateFundSnapshotCard = (index: number, field: 'title' | 'description', lang: 'bn' | 'en', value: string) => {
    const defaultCards = [
      {
        id: 'fund-snap-1',
        title: { bn: 'মাসিক অঙ্গীকার ও বাইতুল মাল', en: 'Monthly Pledges & Baytul Mal', ar: 'التعهدات الشهرية وبيت المال' },
        description: { bn: 'পরিবারের সদস্যদের নিয়মিত মাসিক অঙ্গীকারে গঠিত স্থায়ী বাইতুল মাল সঞ্চয়।', en: 'Permanent Baytul Mal reserve built through regular monthly member pledges.', ar: 'مدخرات بيت المال الدائمة الناتجة عن التعهدات الشهرية المنتظمة.' },
        icon: 'CheckCircle2',
      },
      {
        id: 'fund-snap-2',
        title: { bn: 'জরুরি মানবিক ও চিকিৎসা সহায়তা', en: 'Emergency & Medical Assistance', ar: 'المساعدات الطبية والإنسانية العاجلة' },
        description: { bn: 'পরিবারের সদস্য ও স্বজনদের জরুরি চিকিৎসা ও মানবিক প্রয়োজনে তাৎক্ষণিক পাশে থাকা।', en: 'Instant verified assistance for prescription medicine and emergency treatments.', ar: 'مساعدات مالية معتمدة وفورية للأدوية والعلاج للحالات الحرجة.' },
        icon: 'ShieldCheck',
      },
      {
        id: 'fund-snap-3',
        title: { bn: 'লাইভ গুগল শিট জবাবদিহিতা', en: 'Live Google Sheet Accountability', ar: 'المساءلة المباشرة عبر جداول بيانات جوجل' },
        description: { bn: 'প্রতিটি জমা ও ব্যয়ের হিসাব সার্বক্ষণিক গুগল শিটের মাধ্যমে উন্মুক্ত ও যাচাইযোগ্য।', en: 'Financial ledger openly accessible to all contributors and well-wishers.', ar: 'سجل مالي شفاف ومتاح لجميع المساهمين والمهتمين.' },
        icon: 'Wallet',
      },
    ];
    const currentCards = [...(formData.fundSnapshotCards && formData.fundSnapshotCards.length === 3 ? formData.fundSnapshotCards : defaultCards)];
    const card = { ...currentCards[index] };
    const multiObj = { ...(card[field] as any) };
    multiObj[lang] = value;
    (card as any)[field] = multiObj;
    currentCards[index] = card;
    setFormData({ ...formData, fundSnapshotCards: currentCards });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{
    saved: boolean;
    published: 'idle' | 'pending' | 'manual_required' | 'success';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalData = { ...formData };
      if (finalData.socialSharePreview) {
        const mode = finalData.socialSharePreview.mode || 'auto';
        const effectiveImg = mode === 'custom'
          ? (finalData.socialSharePreview.customImageUrl || '')
          : (finalData.socialSharePreview.autoGeneratedImageUrl || finalData.socialSharePreview.imageUrl || '/assets/og-preview.png');
        finalData.socialSharePreview = {
          ...finalData.socialSharePreview,
          mode,
          imageUrl: effectiveImg,
        };
      }

      const res = await storageService.saveConfigAsync(finalData);
      if (res.success && res.data) {
        setFormData(res.data);
        onConfigChange(res.data);
        setPublishStatus({
          saved: true,
          published: 'manual_required',
          message: 'সেটিংস সংরক্ষিত হয়েছে। সামাজিক মাধ্যমের ক্রলারদের জন্য GitHub Actions বিল্ডের মাধ্যমে স্ট্যাটিক মেটাডাটা আপডেট সম্পন্ন হতে হবে।',
        });
        onShowToast('সাইট সেটিংস ও CMS কনফিগারেশন সেন্ট্রাল ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে!');
      } else {
        onShowToast(`সংরক্ষণ ব্যর্থ: ${res.error || 'সেন্ট্রাল ডাটাবেজে সংরক্ষণ করা যায়নি'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-xs">
      {/* Sub-tab Navigation (Hidden when controlled from primary Admin sidebar) */}
      {!hideSubNav && (
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-[#F7F5F0] rounded-2xl border border-[#EBE8E0]">
          {[
            { id: 'general', label: 'সাধারণ পরিচিতি', icon: Globe },
            { id: 'hero', label: 'হোমপেজ ও হিরো CMS', icon: Sparkles },
            { id: 'logo', label: 'লোগো ও অবস্থান', icon: ImageIcon },
            { id: 'header', label: 'হেডার কন্ট্রোল', icon: Compass },
            { id: 'footer', label: 'ফুটার কন্ট্রোল', icon: Layers },
            { id: 'about', label: 'আমাদের সম্পর্কে CMS', icon: FileText },
            { id: 'contact', label: 'যোগাযোগ পেজ CMS', icon: Mail },
            { id: 'social', label: 'যোগাযোগ ও সোশ্যাল', icon: Share2 },
            { id: 'social-share', label: 'সোশ্যাল প্রিভিউ (Social Share)', icon: Share2 },
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
      )}

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
                bucket="branding"
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

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#EBE8E0] bg-white cursor-pointer hover:border-[#2D5A41] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.showFeatureCards !== false}
                  onChange={(e) => setFormData({ ...formData, showFeatureCards: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="font-semibold text-[#2D3630] text-xs">মূল স্তম্ভ / ফিচার কার্ডস</span>
              </label>
            </div>
          </div>

          {/* 6. Key Pillars / Feature Cards CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ৬. মূল স্তম্ভ / ফিচার কার্ডস সম্পাদনা (Key Pillars / Feature Cards CMS)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                হোমপেজে প্রদর্শিত ৩টি মূল স্তম্ভের শিরোনাম ও বিবরণ বাংলা ও ইংরেজিতে সম্পাদনা করুন।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((idx) => {
                const card = formData.featureCards?.[idx] || {
                  id: `feat-${idx + 1}`,
                  title: {
                    bn: idx === 0 ? 'শতভাগ আর্থিক স্বচ্ছতা' : idx === 1 ? 'পারিবারিক বাইতুল মাল' : 'বাস্তবধর্মী ও সততাপূর্ণ পথচলা',
                    en: idx === 0 ? '100% Financial Transparency' : idx === 1 ? 'Family Baytul Mal' : 'Realistic & Sincere Journey',
                  },
                  description: {
                    bn: idx === 0 ? 'তহবিলের প্রতিটি টাকা ও ব্যয়ের হিসাব সবার জন্য দৃশ্যমান ও উন্মুক্ত।' : idx === 1 ? 'মাসিক ক্ষুদ্র সঞ্চয়ের মাধ্যমে আপৎকালীন বিপদে স্বজনদের সহায়তার স্থায়ী তহবিল।' : 'কোনো অতিরঞ্জন বা অসত্য দাবি নয়; সামর্থ্য অনুযায়ী নিবেদিত সেবা।',
                    en: idx === 0 ? 'Every single penny received and spent is completely open.' : idx === 1 ? 'Permanent safety fund built through small monthly member contributions.' : 'No exaggerated claims; honest service true to our actual capacity.',
                  },
                };

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] space-y-2.5">
                    <div className="font-bold text-[#2D5A41] text-xs">কার্ড {idx + 1}</div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">শিরোনাম (বাংলা)</label>
                      <input
                        type="text"
                        value={card.title?.bn || ''}
                        onChange={(e) => updateFeatureCard(idx, 'title', 'bn', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">Title (English)</label>
                      <input
                        type="text"
                        value={card.title?.en || ''}
                        onChange={(e) => updateFeatureCard(idx, 'title', 'en', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বিবরণ (বাংলা)</label>
                      <textarea
                        rows={2}
                        value={card.description?.bn || ''}
                        onChange={(e) => updateFeatureCard(idx, 'description', 'bn', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">Description (English)</label>
                      <textarea
                        rows={2}
                        value={card.description?.en || ''}
                        onChange={(e) => updateFeatureCard(idx, 'description', 'en', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. Fund Snapshot Cards CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="pb-2 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630]">
                ৭. হোমপেজ তহবিল স্ন্যাপশট কার্ডস সম্পাদনা (Fund Snapshot Preview Cards CMS)
              </label>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                হোমপেজের ডার্ক তহবিল সেকশনের নিচের ৩টি পয়েন্টের শিরোনাম ও বিবরণ বাংলা ও ইংরেজিতে নির্ধারণ করুন।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((idx) => {
                const snap = formData.fundSnapshotCards?.[idx] || {
                  id: `fund-snap-${idx + 1}`,
                  title: {
                    bn: idx === 0 ? 'মাসিক অঙ্গীকার ও বাইতুল মাল' : idx === 1 ? 'জরুরি মানবিক ও চিকিৎসা সহায়তা' : 'লাইভ গুগল শিট জবাবদিহিতা',
                    en: idx === 0 ? 'Monthly Pledges & Baytul Mal' : idx === 1 ? 'Emergency & Medical Assistance' : 'Live Google Sheet Accountability',
                  },
                  description: {
                    bn: idx === 0 ? 'পরিবারের সদস্যদের নিয়মিত মাসিক অঙ্গীকারে গঠিত স্থায়ী বাইতুল মাল সঞ্চয়।' : idx === 1 ? 'পরিবারের সদস্য ও স্বজনদের জরুরি চিকিৎসা ও মানবিক প্রয়োজনে তাৎক্ষণিক পাশে থাকা।' : 'প্রতিটি জমা ও ব্যয়ের হিসাব সার্বক্ষণিক গুগল শিটের মাধ্যমে উন্মুক্ত ও যাচাইযোগ্য।',
                    en: idx === 0 ? 'Permanent Baytul Mal reserve built through regular monthly member pledges.' : idx === 1 ? 'Instant verified assistance for prescription medicine and emergency treatments.' : 'Financial ledger openly accessible to all contributors and well-wishers.',
                  },
                };

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] space-y-2.5">
                    <div className="font-bold text-[#2D5A41] text-xs">স্ন্যাপশট পয়েন্ট {idx + 1}</div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">শিরোনাম (বাংলা)</label>
                      <input
                        type="text"
                        value={snap.title?.bn || ''}
                        onChange={(e) => updateFundSnapshotCard(idx, 'title', 'bn', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">Title (English)</label>
                      <input
                        type="text"
                        value={snap.title?.en || ''}
                        onChange={(e) => updateFundSnapshotCard(idx, 'title', 'en', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বিবরণ (বাংলা)</label>
                      <textarea
                        rows={2}
                        value={snap.description?.bn || ''}
                        onChange={(e) => updateFundSnapshotCard(idx, 'description', 'bn', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">Description (English)</label>
                      <textarea
                        rows={2}
                        value={snap.description?.en || ''}
                        onChange={(e) => updateFundSnapshotCard(idx, 'description', 'en', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8. Homepage Activities Display & Rail CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-5">
            <div className="pb-2.5 border-b border-[#EBE8E0]">
              <label className="block font-bold text-[#2D3630] text-sm">
                ৮. হোমপেজ কার্যক্রম ডিসপ্লে ও ক্যারোসেল/রেল কন্ট্রোল (Homepage Activities Rail CMS)
              </label>
              <p className="text-[11px] text-[#5C665F] mt-0.5">
                হোমপেজে নির্বাচিত কার্যক্রম সেকশনের দৃশ্যমানতা, শিরোনাম, স্লাইডার কলাম, মোট প্রিভিউ লিমিট, ক্রম এবং ম্যানুয়াল কার্যক্রম প্রদর্শন নিয়ন্ত্রণ করুন।
              </p>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#EBE8E0]">
              <div>
                <span className="block font-bold text-xs text-[#2D3630]">হোমপেজে কার্যক্রম সেকশন প্রদর্শন</span>
                <span className="text-[11px] text-[#7A877E]">বন্ধ করলে হোমপেজ থেকে কার্যক্রম সেকশন সম্পূর্ণ লুকানো থাকবে</span>
              </div>
              <input
                type="checkbox"
                checked={formData.showHomeActivities !== false}
                onChange={(e) => setFormData({ ...formData, showHomeActivities: e.target.checked })}
                className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
              />
            </div>

            {/* Titles & Texts */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ছোট লেবেল / Eyebrow (বাংলা)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesEyebrow?.bn || ''}
                    onChange={(e) => updateMultiText('homeActivitiesEyebrow', 'bn', e.target.value)}
                    placeholder="যেমন: আমাদের মানবিক উদ্যোগ"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Eyebrow (English)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesEyebrow?.en || ''}
                    onChange={(e) => updateMultiText('homeActivitiesEyebrow', 'en', e.target.value)}
                    placeholder="e.g. Our Humanitarian Initiatives"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Eyebrow (العربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.homeActivitiesEyebrow?.ar || ''}
                    onChange={(e) => updateMultiText('homeActivitiesEyebrow', 'ar', e.target.value)}
                    placeholder="مثال: مبادراتنا الإنسانية"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">মূল শিরোনাম (বাংলা) *</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesTitle?.bn || ''}
                    onChange={(e) => updateMultiText('homeActivitiesTitle', 'bn', e.target.value)}
                    placeholder="ডিফল্ট: নির্বাচিত কার্যক্রম"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Main Headline (English)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesTitle?.en || ''}
                    onChange={(e) => updateMultiText('homeActivitiesTitle', 'en', e.target.value)}
                    placeholder="Default: Featured Activities"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Main Headline (العربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.homeActivitiesTitle?.ar || ''}
                    onChange={(e) => updateMultiText('homeActivitiesTitle', 'ar', e.target.value)}
                    placeholder="افتراضي: الأنشطة المميزة"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">উপ-শিরোনাম / বিবরণ (বাংলা)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesSubtitle?.bn || ''}
                    onChange={(e) => updateMultiText('homeActivitiesSubtitle', 'bn', e.target.value)}
                    placeholder="যেমন: আর্তমানবতার সেবায় সহানুভূতি পরিবারের চলমান বিভিন্ন কার্যক্রম"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Subtitle (English)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesSubtitle?.en || ''}
                    onChange={(e) => updateMultiText('homeActivitiesSubtitle', 'en', e.target.value)}
                    placeholder="e.g. Humanitarian initiatives undertaken by Sahanubhuti family"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Subtitle (العربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.homeActivitiesSubtitle?.ar || ''}
                    onChange={(e) => updateMultiText('homeActivitiesSubtitle', 'ar', e.target.value)}
                    placeholder="مثال: مبادرات إنسانية لعائلة ساهانوبهوتي"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
              </div>
            </div>

            {/* Responsive Cards Per View & Preview Limit */}
            <div className="p-3.5 bg-white rounded-xl border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-xs text-[#2D3630]">
                রেসপনসিভ কলাম সংখ্যা ও মোট লিমিট (Cards Per View & Total Preview Limit):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">মোট প্রিভিউ সংখ্যা</label>
                  <select
                    value={formData.homeActivitiesLimit || 6}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesLimit: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                      <option key={num} value={num}>
                        {num} টি {num === 6 ? '(ডিফল্ট)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ওয়াইড ডেস্কটপ (≥1280px)</label>
                  <select
                    value={formData.homeActivitiesWideDesktopCols || 5}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesWideDesktopCols: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  >
                    <option value={3}>৩ টি কার্ড</option>
                    <option value={4}>৪ টি কার্ড</option>
                    <option value={5}>৫ টি কার্ড (ডিফল্ট)</option>
                    <option value={6}>৬ টি কার্ড</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ডেস্কটপ (Cards/View)</label>
                  <select
                    value={formData.homeActivitiesDesktopCols || 4}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesDesktopCols: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  >
                    <option value={2}>২ টি কার্ড</option>
                    <option value={3}>৩ টি কার্ড</option>
                    <option value={4}>৪ টি কার্ড (ডিফল্ট)</option>
                    <option value={5}>৫ টি কার্ড</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ট্যাবলেট (Tablet)</label>
                  <select
                    value={formData.homeActivitiesTabletCols || 2}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesTabletCols: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  >
                    <option value={1}>১ টি কার্ড</option>
                    <option value={2}>২ টি কার্ড (ডিফল্ট)</option>
                    <option value={3}>৩ টি কার্ড</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">মোবাইল (Mobile)</label>
                  <select
                    value={formData.homeActivitiesMobileCols || 1}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesMobileCols: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  >
                    <option value={1}>১ টি কার্ড (ডিফল্ট)</option>
                    <option value={2}>২ টি কার্ড</option>
                  </select>
                </div>
              </div>

              {/* Real-time Math Summary */}
              <div className="p-2 rounded-lg bg-[#E8EFEA] border border-[#2D5A41]/20 flex flex-wrap items-center justify-between text-[11px] text-[#2D5A41] gap-2">
                <span>
                  <strong>ডেস্কটপ স্ক্রিন:</strong> একসাথে {formData.homeActivitiesDesktopCols || 4} টি কার্ড পাশাপাশি দৃশ্যমান হবে (ওয়াইড স্ক্রিনে {formData.homeActivitiesWideDesktopCols || 5} টি)।
                </span>
                <span>
                  <strong>মোবাইল স্ক্রিন:</strong> একসাথে {formData.homeActivitiesMobileCols || 1} টি কার্ড দৃশ্যমান হবে (অনুভূমিক সোয়াইপযোগ্য)।
                </span>
                <span>
                  <strong>মোট রেন্ডার:</strong> সর্বোচ্চ {formData.homeActivitiesLimit || 6} টি রেকর্ড। একক অনুভূমিক রেল (দ্বিতীয় কোনো সারি হবে না)।
                </span>
              </div>
            </div>

            {/* Ordering Mode */}
            <div className="p-3.5 bg-white rounded-xl border border-[#EBE8E0] space-y-3">
              <label className="block font-bold text-xs text-[#2D3630]">
                কার্যক্রম সাজানোর ক্রম (Ordering Mode):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'latest',
                    title: 'সর্বশেষ তারিখ অনুযায়ী (ডিফল্ট)',
                    desc: 'সবচেয়ে সাম্প্রতিক তারিখের প্রকাশিত কার্যক্রমগুলো প্রথমে আসবে',
                  },
                  {
                    id: 'oldest',
                    title: 'প্রাচীনতম তারিখ অনুযায়ী',
                    desc: 'পুরোনো কার্যক্রম থেকে ক্রমানুসারে সাজানো হবে',
                  },
                  {
                    id: 'featured',
                    title: 'বাছাইকৃত কার্যক্রম প্রথমে, এরপর অন্যান্য',
                    desc: 'নিচে বাছাইকৃত কার্যক্রমগুলো শুরুতে থাকবে, এরপর বাকিগুলো তারিখ অনুযায়ী আসবে',
                  },
                  {
                    id: 'manual',
                    title: 'শুধুমাত্র ম্যানুয়াল বাছাইকৃত কার্যক্রম',
                    desc: 'নিচে অ্যাডমিন যেসব কার্যক্রম নির্বাচন করেছেন কেবল সেগুলোই নির্দিষ্ট ক্রমে দেখাবে',
                  },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      (formData.homeActivitiesOrdering || 'latest') === mode.id
                        ? 'bg-[#E8EFEA] border-[#2D5A41] text-[#2D5A41]'
                        : 'bg-[#FDFCF9] border-[#EBE8E0] text-[#5C665F] hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="homeActivitiesOrdering"
                      value={mode.id}
                      checked={(formData.homeActivitiesOrdering || 'latest') === mode.id}
                      onChange={(e) => setFormData({ ...formData, homeActivitiesOrdering: e.target.value as any })}
                      className="mt-0.5 text-[#2D5A41] focus:ring-[#2D5A41]"
                    />
                    <div>
                      <span className="block font-bold text-xs">{mode.title}</span>
                      <span className="text-[10px] text-[#7A877E]">{mode.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Manual Activity Selection (Featured Activities) */}
            <div className="p-3.5 bg-white rounded-xl border border-[#EBE8E0] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="block font-bold text-xs text-[#2D3630]">
                    হোমপেজে বাছাইকৃত কার্যক্রম নির্বাচন (Homepage Featured Activities):
                  </span>
                  <span className="text-[10px] text-[#7A877E]">
                    হোমপেজে নির্দিষ্ট কার্যক্রম প্রদর্শন ও তাদের প্রদর্শন ক্রম নিয়ন্ত্রণ করুন
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#E8EFEA] text-[#2D5A41]">
                  {(formData.homeFeaturedActivityIds || []).length} টি নির্বাচিত
                </span>
              </div>

              {/* Add Activity to Featured Selector */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value={selectedActivityToAdd}
                  onChange={(e) => setSelectedActivityToAdd(e.target.value)}
                  className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                >
                  <option value="">-- প্রকাশিত কার্যক্রম নির্বাচন করুন --</option>
                  {availableActivities
                    .filter((act) => !(formData.homeFeaturedActivityIds || []).includes(act.id))
                    .map((act) => (
                      <option key={act.id} value={act.id}>
                        {typeof act.title === 'string' ? act.title : act.title?.bn || act.title?.en || act.id} ({act.date || 'তারিখ নেই'})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedActivityToAdd}
                  onClick={() => {
                    if (!selectedActivityToAdd) return;
                    const list = formData.homeFeaturedActivityIds || [];
                    if (!list.includes(selectedActivityToAdd)) {
                      setFormData({
                        ...formData,
                        homeFeaturedActivityIds: [...list, selectedActivityToAdd],
                      });
                    }
                    setSelectedActivityToAdd('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    selectedActivityToAdd
                      ? 'bg-[#2D5A41] text-white hover:bg-[#234733] cursor-pointer'
                      : 'bg-[#EBE8E0] text-[#7A877E] cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>তালিকায় যোগ করুন</span>
                </button>
              </div>

              {/* Featured List items with Move Up / Down & Delete */}
              {(formData.homeFeaturedActivityIds || []).length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {(formData.homeFeaturedActivityIds || []).map((id, index) => {
                    const act = availableActivities.find((a) => a.id === id);
                    const title = act ? (typeof act.title === 'string' ? act.title : act.title?.bn || act.title?.en || id) : `কার্যক্রম ID: ${id}`;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#FDFCF9] border border-[#EBE8E0] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-5 h-5 rounded-full bg-[#E8EFEA] text-[#2D5A41] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-[#2D3630] truncate">{title}</span>
                          {act?.category && (
                            <span className="px-1.5 py-0.5 rounded bg-[#EBE8E0] text-[#5C665F] text-[10px] shrink-0">
                              {act.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const list = [...(formData.homeFeaturedActivityIds || [])];
                              if (index > 0) {
                                const temp = list[index];
                                list[index] = list[index - 1];
                                list[index - 1] = temp;
                                setFormData({ ...formData, homeFeaturedActivityIds: list });
                              }
                            }}
                            className={`p-1 rounded hover:bg-white border border-transparent hover:border-[#EBE8E0] ${
                              index === 0 ? 'text-[#D4CEBF] cursor-not-allowed' : 'text-[#5C665F] hover:text-[#2D5A41]'
                            }`}
                            title="উপরে নিন"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === (formData.homeFeaturedActivityIds || []).length - 1}
                            onClick={() => {
                              const list = [...(formData.homeFeaturedActivityIds || [])];
                              if (index < list.length - 1) {
                                const temp = list[index];
                                list[index] = list[index + 1];
                                list[index + 1] = temp;
                                setFormData({ ...formData, homeFeaturedActivityIds: list });
                              }
                            }}
                            className={`p-1 rounded hover:bg-white border border-transparent hover:border-[#EBE8E0] ${
                              index === (formData.homeFeaturedActivityIds || []).length - 1
                                ? 'text-[#D4CEBF] cursor-not-allowed'
                                : 'text-[#5C665F] hover:text-[#2D5A41]'
                            }`}
                            title="নিচে নিন"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = (formData.homeFeaturedActivityIds || []).filter((item) => item !== id);
                              setFormData({ ...formData, homeFeaturedActivityIds: list });
                            }}
                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="তালিকা থেকে বাদ দিন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center rounded-lg bg-[#FDFCF9] border border-dashed border-[#EBE8E0] text-[11px] text-[#7A877E]">
                  বর্তমানে কোনো নির্দিষ্ট কার্যক্রম বাছাই করা নেই। সাজানোর ক্রম অনুযায়ী কার্যক্রমগুলো প্রদর্শিত হবে।
                </div>
              )}
            </div>

            {/* Card Details Display & CTA Controls */}
            <div className="p-3.5 bg-white rounded-xl border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-xs text-[#2D3630]">
                কার্ডের ভেতরের উপাদান ও কল-টু-অ্যাকশন (Card Elements & CTA):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D3630]">
                  <input
                    type="checkbox"
                    checked={formData.homeActivitiesShowDate !== false}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesShowDate: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2D5A41]"
                  />
                  <span>তারিখ প্রদর্শন</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D3630]">
                  <input
                    type="checkbox"
                    checked={formData.homeActivitiesShowCategory !== false}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesShowCategory: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2D5A41]"
                  />
                  <span>ক্যাটাগরি ব্যাজ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D3630]">
                  <input
                    type="checkbox"
                    checked={formData.homeActivitiesShowSummary !== false}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesShowSummary: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2D5A41]"
                  />
                  <span>সংক্ষিপ্ত বিবরণ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D3630]">
                  <input
                    type="checkbox"
                    checked={formData.homeActivitiesShowCta !== false}
                    onChange={(e) => setFormData({ ...formData, homeActivitiesShowCta: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2D5A41]"
                  />
                  <span>&quot;বিস্তারিত দেখুন&quot; লিংক</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">কার্ড CTA লেবেল (বাংলা)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesCtaLabel?.bn || 'বিস্তারিত দেখুন'}
                    onChange={(e) => updateMultiText('homeActivitiesCtaLabel', 'bn', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Card CTA Label (English)</label>
                  <input
                    type="text"
                    value={formData.homeActivitiesCtaLabel?.en || 'View Details'}
                    onChange={(e) => updateMultiText('homeActivitiesCtaLabel', 'en', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">Card CTA Label (العربية)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.homeActivitiesCtaLabel?.ar || 'عرض التفاصيل'}
                    onChange={(e) => updateMultiText('homeActivitiesCtaLabel', 'ar', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  />
                </div>
              </div>
            </div>

            {/* Bottom "সব কার্যক্রম দেখুন" Button Controls */}
            <div className="p-3.5 bg-white rounded-xl border border-[#EBE8E0] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D3630]">
                <input
                  type="checkbox"
                  checked={formData.homeShowViewAllActivities !== false}
                  onChange={(e) => setFormData({ ...formData, homeShowViewAllActivities: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41]"
                />
                <span>হোমপেজে কার্যক্রম রেলের নিচে &quot;সব কার্যক্রম দেখুন&quot; বাটন প্রদর্শন করুন</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#5C665F] block mb-1">বাটন লেবেল (বাংলা):</label>
                  <input
                    type="text"
                    value={formData.homeViewAllActivitiesLabel?.bn || 'সব কার্যক্রম দেখুন'}
                    onChange={(e) => updateMultiText('homeViewAllActivitiesLabel', 'bn', e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C665F] block mb-1">Button Label (English):</label>
                  <input
                    type="text"
                    value={formData.homeViewAllActivitiesLabel?.en || 'View All Activities'}
                    onChange={(e) => updateMultiText('homeViewAllActivitiesLabel', 'en', e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C665F] block mb-1">Button Label (العربية):</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.homeViewAllActivitiesLabel?.ar || 'عرض جميع الأنشطة'}
                    onChange={(e) => updateMultiText('homeViewAllActivitiesLabel', 'ar', e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                  />
                </div>
              </div>
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
                bucket="branding"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="হেডার লোগো ওভাররাইড (Header Logo Override)"
                value={formData.logoOverrides?.header || ''}
                onChange={(url) => updateLogoOverride('header', url)}
                helperText="খালি রাখলে মূল ডিফল্ট লোগো প্রদর্শিত হবে"
                bucket="branding"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="হিরো সেকশন লোগো (Hero Logo Override)"
                value={formData.logoOverrides?.hero || ''}
                onChange={(url) => updateLogoOverride('hero', url)}
                helperText="হোমপেজের মূল ব্যানারে বড় আকারে প্রদর্শিত লোগো"
                bucket="branding"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <MediaUploadField
                label="ফুটার লোগো (Footer Logo Override - Dark Theme)"
                value={formData.logoOverrides?.footer || ''}
                onChange={(url) => updateLogoOverride('footer', url)}
                helperText="ফুটারের গাঢ় সবুজ ব্যাকগ্রাউন্ডের জন্য উপযুক্ত লোগো"
                bucket="branding"
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-[#EBE8E0]">
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
                Header CTA Text (العربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.headerCtaText?.ar || ''}
                onChange={(e) => updateMultiText('headerCtaText', 'ar', e.target.value)}
                placeholder="مثال: سجل الصندوق"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Footer Description (العربية)
              </label>
              <textarea
                rows={3}
                dir="rtl"
                value={formData.footerDescription?.ar || ''}
                onChange={(e) => updateMultiText('footerDescription', 'ar', e.target.value)}
                placeholder="نبذة عن المؤسسة باللغة العربية..."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#EBE8E0]">
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
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Copyright Text (العربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.footerCopyright?.ar || ''}
                onChange={(e) => updateMultiText('footerCopyright', 'ar', e.target.value)}
                placeholder="مثال: © 2024-2026 مؤسسة التعاطف. جميع الحقوق محفوظة."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#EBE8E0]">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                উদ্যোগ পরিচিতি ট্যাগলাইন (বাংলা)
              </label>
              <input
                type="text"
                value={formData.footerInitiativeText?.bn || ''}
                onChange={(e) => updateMultiText('footerInitiativeText', 'bn', e.target.value)}
                placeholder="যেমন: উদ্যোগ: পারিবারিক তরুণ সমাজের সম্মিলিত প্রচেষ্টা"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Initiative Tagline (English)
              </label>
              <input
                type="text"
                value={formData.footerInitiativeText?.en || ''}
                onChange={(e) => updateMultiText('footerInitiativeText', 'en', e.target.value)}
                placeholder="e.g. Initiative: Joint endeavor of our family youth"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Initiative Tagline (العربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.footerInitiativeText?.ar || ''}
                onChange={(e) => updateMultiText('footerInitiativeText', 'ar', e.target.value)}
                placeholder="مثال: المبادرة: مسعى مشترك لشباب العائلة"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#EBE8E0]">
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                যোগাযোগ কলামের সহায়ক বক্তব্য (বাংলা)
              </label>
              <textarea
                rows={2}
                value={formData.footerText?.bn || ''}
                onChange={(e) => updateMultiText('footerText', 'bn', e.target.value)}
                placeholder="যেমন: ফাউন্ডেশনের বিষয়ে যেকোনো প্রশ্ন বা পরামর্শের জন্য আমাদের ইমেইল করতে পারেন।"
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Contact Column Helper Note (English)
              </label>
              <textarea
                rows={2}
                value={formData.footerText?.en || ''}
                onChange={(e) => updateMultiText('footerText', 'en', e.target.value)}
                placeholder="e.g. For any questions or feedback regarding the foundation, feel free to reach out via email."
                className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2D3630] mb-1">
                Contact Helper Note (العربية)
              </label>
              <textarea
                rows={2}
                dir="rtl"
                value={formData.footerText?.ar || ''}
                onChange={(e) => updateMultiText('footerText', 'ar', e.target.value)}
                placeholder="مثال: لأي استفسارات أو ملاحظات، لا تتردد في مراسلتنا..."
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

          {/* Footer Visual Appearance Controls */}
          <div className="pt-5 border-t border-[#EBE8E0] space-y-4">
            <div>
              <h4 className="font-bold text-[#2D3630] text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2D5A41]" />
                <span>ফুটার ভিজ্যুয়াল ও থিম কন্ট্রোল (Footer Visual Appearance)</span>
              </h4>
              <p className="text-[11px] text-[#7A877E] mt-0.5">
                ফুটারের ব্যাকগ্রাউন্ড কালার, ব্যাকগ্রাউন্ড ছবি, ওভারলে স্বচ্ছতা, টেক্সট কালার ও বর্ডার স্টাইল এখান থেকে সরাসরি কাস্টমাইজ করুন।
              </p>
            </div>

            {/* Background Mode Toggle */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-[#2D3630]">ব্যাকগ্রাউন্ড ধরন (Background Mode):</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#2D3630]">
                  <input
                    type="radio"
                    name="footerBgType"
                    value="solid"
                    checked={formData.footerAppearance?.bgType !== 'image'}
                    onChange={() => updateFooterAppearance('bgType', 'solid')}
                    className="w-4 h-4 accent-[#2D5A41]"
                  />
                  <span>সলিড ব্যাকগ্রাউন্ড কালার (Solid Color)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#2D3630]">
                  <input
                    type="radio"
                    name="footerBgType"
                    value="image"
                    checked={formData.footerAppearance?.bgType === 'image'}
                    onChange={() => updateFooterAppearance('bgType', 'image')}
                    className="w-4 h-4 accent-[#2D5A41]"
                  />
                  <span>কাস্টম ব্যাকগ্রাউন্ড ছবি (Image Background)</span>
                </label>
              </div>

              {/* Background Color Picker & Hex Input */}
              <div className="pt-2">
                <label className="block font-semibold text-[#2D3630] mb-1">
                  ফুটার মূল ব্যাকগ্রাউন্ড কালার
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.footerAppearance?.bgColor || '#18231B'}
                    onChange={(e) => updateFooterAppearance('bgColor', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#EBE8E0] p-1 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.footerAppearance?.bgColor || '#18231B'}
                    onChange={(e) => updateFooterAppearance('bgColor', e.target.value)}
                    placeholder="#18231B"
                    className="w-32 px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] font-mono text-xs focus:outline-hidden focus:border-[#2D5A41]"
                  />
                  <button
                    type="button"
                    onClick={() => updateFooterAppearance('bgColor', '#18231B')}
                    className="px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] text-[11px] text-[#5C665F] hover:bg-white"
                  >
                    ডিফল্ট ডার্ক গ্রিন
                  </button>
                </div>
              </div>

              {/* Background Image Upload & Config (shown when image mode selected) */}
              {formData.footerAppearance?.bgType === 'image' && (
                <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] space-y-3 mt-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2D3630]">ফুটার ব্যাকগ্রাউন্ড ছবি নির্বাচন:</span>
                    {formData.footerAppearance?.bgImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updateFooterAppearance('bgImageUrl', '');
                          updateFooterAppearance('bgType', 'solid');
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        ছবি মুছে সলিড কালারে ফিরুন
                      </button>
                    )}
                  </div>

                  <MediaUploadField
                    label="ফুটার ব্যাকগ্রাউন্ড ছবি আপলোড"
                    value={formData.footerAppearance?.bgImageUrl || ''}
                    onChange={(url) => updateFooterAppearance('bgImageUrl', url)}
                    helperText="উচ্চমানের ল্যান্ডস্কেপ বা প্যাটার্ন ছবি (JPG, PNG, WebP)"
                    bucket="foundation"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#EBE8E0]">
                    <div>
                      <label className="block font-semibold text-[#2D3630] mb-1">ইমেজ পজিশন</label>
                      <select
                        value={formData.footerAppearance?.bgPosition || 'center'}
                        onChange={(e) => updateFooterAppearance('bgPosition', e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                      >
                        <option value="center">সেন্টার (Center)</option>
                        <option value="top">টপ (Top)</option>
                        <option value="bottom">বটম (Bottom)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#2D3630] mb-1">ফিট বিহেভিয়ার</label>
                      <select
                        value={formData.footerAppearance?.bgFit || 'cover'}
                        onChange={(e) => updateFooterAppearance('bgFit', e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630]"
                      >
                        <option value="cover">সম্পূর্ণ কভার (Cover)</option>
                        <option value="contain">কন্টেইন (Contain)</option>
                        <option value="auto">আসল সাইজ (Auto)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-[#2D3630]">ওভারলে তীব্রতা</label>
                        <span className="font-mono text-xs text-[#2D5A41] font-bold">
                          {formData.footerAppearance?.overlayStrength ?? 70}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.footerAppearance?.overlayStrength ?? 70}
                        onChange={(e) => updateFooterAppearance('overlayStrength', Number(e.target.value))}
                        className="w-full accent-[#2D5A41] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Typography & Border Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
              <div>
                <label className="block font-semibold text-[#2D3630] mb-1">
                  মূল টেক্সট কালার (Primary Text)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.footerAppearance?.textColor || '#D3DDD5'}
                    onChange={(e) => updateFooterAppearance('textColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-[#EBE8E0] p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.footerAppearance?.textColor || '#D3DDD5'}
                    onChange={(e) => updateFooterAppearance('textColor', e.target.value)}
                    placeholder="#D3DDD5"
                    className="w-24 px-2 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2D3630] mb-1">
                  সেকেন্ডারি টেক্সট কালার (Muted)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.footerAppearance?.secondaryTextColor || '#8A9B8F'}
                    onChange={(e) => updateFooterAppearance('secondaryTextColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-[#EBE8E0] p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.footerAppearance?.secondaryTextColor || '#8A9B8F'}
                    onChange={(e) => updateFooterAppearance('secondaryTextColor', e.target.value)}
                    placeholder="#8A9B8F"
                    className="w-24 px-2 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2D3630] mb-1">
                  টপ বর্ডার ও ডিভাইডার কালার
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.footerAppearance?.borderColor || '#28382C'}
                    onChange={(e) => updateFooterAppearance('borderColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-[#EBE8E0] p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formData.footerAppearance?.borderColor || '#28382C'}
                    onChange={(e) => updateFooterAppearance('borderColor', e.target.value)}
                    placeholder="#28382C"
                    className="w-24 px-2 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-[#2D3630] font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Real-time Footer Appearance Preview Box */}
            <div className="rounded-2xl border border-[#EBE8E0] overflow-hidden shadow-xs">
              <div className="px-4 py-2 bg-[#FDFCF9] border-b border-[#EBE8E0] text-[11px] font-bold text-[#5C665F] flex items-center justify-between">
                <span>লাইভ প্রিভিউ (Footer Appearance Preview)</span>
                <span className="text-[10px] text-[#A4B3A8]">রিয়েল-টাইম রেন্ডার</span>
              </div>
              <div
                style={{
                  backgroundColor: formData.footerAppearance?.bgColor || '#18231B',
                  color: formData.footerAppearance?.textColor || '#D3DDD5',
                  borderTopColor: formData.footerAppearance?.borderColor || '#28382C',
                }}
                className="p-6 relative border-t overflow-hidden"
              >
                {formData.footerAppearance?.bgType === 'image' && formData.footerAppearance?.bgImageUrl && (
                  <>
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(${formData.footerAppearance.bgImageUrl})`,
                        backgroundPosition: formData.footerAppearance.bgPosition || 'center',
                        backgroundSize: formData.footerAppearance.bgFit || 'cover',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: formData.footerAppearance?.bgColor || '#18231B',
                        opacity: (formData.footerAppearance?.overlayStrength ?? 70) / 100,
                      }}
                    />
                  </>
                )}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="font-bold text-sm block">
                      {formData.nameBn || 'সহানুভূতি ফাউন্ডেশন'}
                    </span>
                    <span
                      style={{ color: formData.footerAppearance?.secondaryTextColor || '#8A9B8F' }}
                      className="text-xs block"
                    >
                      {formData.footerDescription?.bn || 'একটি অরাজনৈতিক, অলাভজনক ও পারিবারিক কল্যাণ তহবিল'}
                    </span>
                  </div>
                  <div
                    style={{ borderColor: formData.footerAppearance?.borderColor || '#28382C' }}
                    className="border-t sm:border-t-0 sm:border-l sm:pl-4 pt-2 sm:pt-0 text-[11px]"
                  >
                    <span style={{ color: formData.footerAppearance?.secondaryTextColor || '#8A9B8F' }}>
                      {formData.footerCopyright?.bn || `© ${new Date().getFullYear()} ${formData.nameBn}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ABOUT PAGE NARRATIVE CMS */}
      {activeSection === 'about' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2D5A41]" />
              <span>আমাদের সম্পর্কে ও ইতিহাস CMS</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              পারিবারিক উদ্যোগের শুরু, বক্তব্য, বাস্তবায়িত মানবিক উদ্যোগ, বাইতুল মাল দর্শন, ভবিষ্যৎ পরিকল্পনা এবং সেকশন দৃশ্যমানতা নিয়ন্ত্রণ করুন।
            </p>
          </div>

          {/* Section Visibility Toggles */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-2">
            <span className="block font-bold text-[#2D3630] text-xs">আমাদের সম্পর্কে পৃষ্ঠার সেকশন দৃশ্যমানতা:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {[
                { key: 'aboutShowSpeechSection', label: 'উদ্বোধনী বক্তব্য সেকশন' },
                { key: 'aboutShowBeginningSection', label: 'আমাদের শুরু ও প্রেক্ষাপট' },
                { key: 'aboutShowPurposeSection', label: 'উদ্দেশ্য ও বাইতুল মাল সেকশন' },
                { key: 'aboutShowValuesSection', label: 'মূল্যবোধ ও নীতিমালা' },
                { key: 'aboutShowVisionSection', label: 'ভবিষ্যত ভাবনা ও রূপরেখা' },
              ].map(({ key, label }) => {
                const isChecked = (formData as any)[key] !== false;
                return (
                  <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#EBE8E0] cursor-pointer hover:bg-[#FDFCF9]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                    />
                    <span className="text-[#2D3630] font-medium text-[11px]">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Banner & Hero Titles */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-4">
            <MediaUploadField
              label="আমাদের সম্পর্কে পৃষ্ঠার ব্যানার ছবি (About Page Banner Image)"
              value={formData.aboutImage || ''}
              onChange={(url) => setFormData({ ...formData, aboutImage: url })}
              helperText="ফাউন্ডেশনের সভা বা মানবিক উদ্যোগের বাস্তব ছবি"
              bucket="activities"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#EBE8E0]">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  হিরো শিরোনাম (বাংলা)
                </label>
                <input
                  type="text"
                  value={formData.aboutHeroTitle?.bn || ''}
                  onChange={(e) => updateMultiText('aboutHeroTitle', 'bn', e.target.value)}
                  placeholder="যেমন: আমাদের সম্পর্কে"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  Hero Title (English)
                </label>
                <input
                  type="text"
                  value={formData.aboutHeroTitle?.en || ''}
                  onChange={(e) => updateMultiText('aboutHeroTitle', 'en', e.target.value)}
                  placeholder="e.g. About Our Foundation"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  Hero Title (العربية)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.aboutHeroTitle?.ar || ''}
                  onChange={(e) => updateMultiText('aboutHeroTitle', 'ar', e.target.value)}
                  placeholder="مثال: من نحن"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  হিরো সাবটাইটেল (বাংলা)
                </label>
                <input
                  type="text"
                  value={formData.aboutHeroSubtitle?.bn || ''}
                  onChange={(e) => updateMultiText('aboutHeroSubtitle', 'bn', e.target.value)}
                  placeholder="যেমন: পারিবারিক সংহতি, রক্ত ও আত্মীয়তার বন্ধন দৃঢ়করণ"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  Hero Subtitle (English)
                </label>
                <input
                  type="text"
                  value={formData.aboutHeroSubtitle?.en || ''}
                  onChange={(e) => updateMultiText('aboutHeroSubtitle', 'en', e.target.value)}
                  placeholder="e.g. Strengthening kinship bonds and mutual solidarity"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">
                  Hero Subtitle (العربية)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.aboutHeroSubtitle?.ar || ''}
                  onChange={(e) => updateMultiText('aboutHeroSubtitle', 'ar', e.target.value)}
                  placeholder="مثال: تعزيز أواصر القربى والتضامن المتبادل"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* Official Speech Section CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2D3630] text-sm">ফাউন্ডেশনের উদ্বোধনী বার্তা / বক্তব্য কনটেন্ট</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={formData.aboutShowSpeechSection !== false}
                  onChange={(e) => setFormData({ ...formData, aboutShowSpeechSection: e.target.checked })}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="text-[#2D3630] font-semibold">বক্তব্য সেকশন সক্রিয়</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">বক্তব্যের শিরোনাম (বাংলা)</label>
                <input
                  type="text"
                  value={formData.aboutSpeechTitle?.bn || ''}
                  onChange={(e) => updateMultiText('aboutSpeechTitle', 'bn', e.target.value)}
                  placeholder="যেমন: ফাউন্ডেশনের উদ্বোধনী বার্তা"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Speech Title (English)</label>
                <input
                  type="text"
                  value={formData.aboutSpeechTitle?.en || ''}
                  onChange={(e) => updateMultiText('aboutSpeechTitle', 'en', e.target.value)}
                  placeholder="e.g. Inaugural Address of the Foundation"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Speech Title (العربية)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.aboutSpeechTitle?.ar || ''}
                  onChange={(e) => updateMultiText('aboutSpeechTitle', 'ar', e.target.value)}
                  placeholder="مثال: الخطاب الافتتاحي للمؤسسة"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">বক্তব্যের সাবটাইটেল (বাংলা)</label>
                <input
                  type="text"
                  value={formData.aboutSpeechSubtitle?.bn || ''}
                  onChange={(e) => updateMultiText('aboutSpeechSubtitle', 'bn', e.target.value)}
                  placeholder="যেমন: উপস্থাপকের আন্তরিক আহ্বান ও যাত্রার পটভূমি"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Speech Subtitle (English)</label>
                <input
                  type="text"
                  value={formData.aboutSpeechSubtitle?.en || ''}
                  onChange={(e) => updateMultiText('aboutSpeechSubtitle', 'en', e.target.value)}
                  placeholder="e.g. Sincere Call & Journey Context by Presenter"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Speech Subtitle (العربية)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.aboutSpeechSubtitle?.ar || ''}
                  onChange={(e) => updateMultiText('aboutSpeechSubtitle', 'ar', e.target.value)}
                  placeholder="مثال: نداء مخلص وسياق الرحلة"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">বক্তব্যের মূল বয়ান (বাংলা)</label>
                <textarea
                  rows={4}
                  value={formData.aboutSpeech?.bn || ''}
                  onChange={(e) => updateMultiText('aboutSpeech', 'bn', e.target.value)}
                  placeholder="আমাদের লক্ষ্য আত্মীয়তার সম্পর্ক সুদৃঢ় করা এবং পারস্পরিক সহযোগিতার পথ প্রশস্ত করা..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Speech Content (English)</label>
                <textarea
                  rows={4}
                  value={formData.aboutSpeech?.en || ''}
                  onChange={(e) => updateMultiText('aboutSpeech', 'en', e.target.value)}
                  placeholder="Our goal is to strengthen the ties of kinship and pave the way for mutual support..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Speech Content (العربية)</label>
                <textarea
                  rows={4}
                  dir="rtl"
                  value={formData.aboutSpeech?.ar || ''}
                  onChange={(e) => updateMultiText('aboutSpeech', 'ar', e.target.value)}
                  placeholder="هدفنا هو توطيد صلة الرحم وفتح آفاق التعاون المتبادل..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] leading-relaxed focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* Other Sections Texts */}
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-[#2D3630] text-xs">আমাদের শুরু ও পারিবারিক উদ্যোগ বক্তব্য (Family Initiative):</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বাংলা</label>
                  <textarea
                    rows={3}
                    value={formData.familyInitiativeText?.bn || ''}
                    onChange={(e) => updateMultiText('familyInitiativeText', 'bn', e.target.value)}
                    placeholder="পারিবারিক তরুণদের উদ্যোগের পেছনের প্রেক্ষাপট..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">English</label>
                  <textarea
                    rows={3}
                    value={formData.familyInitiativeText?.en || ''}
                    onChange={(e) => updateMultiText('familyInitiativeText', 'en', e.target.value)}
                    placeholder="Context behind the family youth initiative..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">العربية</label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={formData.familyInitiativeText?.ar || ''}
                    onChange={(e) => updateMultiText('familyInitiativeText', 'ar', e.target.value)}
                    placeholder="سياق مبادرة شباب العائلة..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-[#2D3630] text-xs">বাইতুল মাল দর্শন ও সঞ্চয় গুরুত্ব (Baytul Mal Philosophy):</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বাংলা</label>
                  <textarea
                    rows={3}
                    value={formData.baytulMalText?.bn || ''}
                    onChange={(e) => updateMultiText('baytulMalText', 'bn', e.target.value)}
                    placeholder="বাইতুল মাল এর গুরুত্ব ও সদস্যদের মাসিক জমার ভূমিকা..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">English</label>
                  <textarea
                    rows={3}
                    value={formData.baytulMalText?.en || ''}
                    onChange={(e) => updateMultiText('baytulMalText', 'en', e.target.value)}
                    placeholder="Philosophy of Baytul Mal and monthly contributions..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">العربية</label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={formData.baytulMalText?.ar || ''}
                    onChange={(e) => updateMultiText('baytulMalText', 'ar', e.target.value)}
                    placeholder="فلسفة بيت المال ومساهمات الأعضاء الشهرية..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-[#2D3630] text-xs">ভবিষ্যত সম্প্রসারণ ও সমাজ উন্নয়ন রূপরেখা (Expansion Statement):</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বাংলা</label>
                  <textarea
                    rows={3}
                    value={formData.expansionStatement?.bn || ''}
                    onChange={(e) => updateMultiText('expansionStatement', 'bn', e.target.value)}
                    placeholder="ভবিষ্যতে পরিবারের গণ্ডি পেরিয়ে বৃহত্তর সমাজ কল্যাণের রূপরেখা..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">English</label>
                  <textarea
                    rows={3}
                    value={formData.expansionStatement?.en || ''}
                    onChange={(e) => updateMultiText('expansionStatement', 'en', e.target.value)}
                    placeholder="Future vision extending beyond family to societal welfare..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">العربية</label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={formData.expansionStatement?.ar || ''}
                    onChange={(e) => updateMultiText('expansionStatement', 'ar', e.target.value)}
                    placeholder="رؤية التوسع المستقبلي لخدمة المجتمع الأوسع..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] text-xs leading-relaxed focus:outline-hidden focus:border-[#2D5A41]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Structured Values Cards CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#2D3630] text-xs sm:text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2D5A41]" />
                  <span>আমাদের মূল্যবোধ কার্ডসমূহ (Values Cards CMS)</span>
                </h4>
                <p className="text-[11px] text-[#7A877E] mt-0.5">
                  মূল্যবোধ পৃষ্ঠায় প্রদর্শিত ৪টি স্তম্ভ বা কার্ডের শিরোনাম, বিবরণ ও সক্রিয়তা পরিচালনা করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentCards = formData.aboutValuesCards || [];
                  const newCard: AboutValueCard = {
                    id: `val-${Date.now()}`,
                    title: { bn: 'নতুন মূল্যবোধ', en: 'New Value', ar: '' },
                    description: { bn: '', en: '', ar: '' },
                    icon: 'ShieldCheck',
                    sortOrder: currentCards.length + 1,
                    isEnabled: true,
                  };
                  setFormData({ ...formData, aboutValuesCards: [...currentCards, newCard] });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>কার্ড যুক্ত করুন</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {(formData.aboutValuesCards || []).map((card, idx) => (
                <div key={card.id || idx} className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#EBE8E0] pb-2">
                    <span className="font-bold text-xs text-[#2D3630]">
                      কার্ড #{idx + 1}: {card.title?.bn || 'শিরোনামহীন'}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-[#5C665F] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={card.isEnabled !== false}
                          onChange={(e) => {
                            const updated = [...(formData.aboutValuesCards || [])];
                            updated[idx] = { ...card, isEnabled: e.target.checked };
                            setFormData({ ...formData, aboutValuesCards: updated });
                          }}
                          className="w-3.5 h-3.5 rounded text-[#2D5A41]"
                        />
                        <span>সক্রিয়</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.aboutValuesCards || []).filter((_, i) => i !== idx);
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="p-1 rounded text-[#A34B4B] hover:bg-[#FDF3F3]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">শিরোনাম (বাংলা)</label>
                      <input
                        type="text"
                        value={card.title?.bn || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutValuesCards || [])];
                          updated[idx] = {
                            ...card,
                            title: { ...card.title, bn: e.target.value },
                          };
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Title (English)</label>
                      <input
                        type="text"
                        value={card.title?.en || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutValuesCards || [])];
                          updated[idx] = {
                            ...card,
                            title: { ...card.title, en: e.target.value },
                          };
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Title (العربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={card.title?.ar || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutValuesCards || [])];
                          updated[idx] = {
                            ...card,
                            title: { ...card.title, ar: e.target.value },
                          };
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">বিবরণ / ব্যাখ্যা (বাংলা)</label>
                      <textarea
                        rows={2}
                        value={card.description?.bn || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutValuesCards || [])];
                          updated[idx] = {
                            ...card,
                            description: { ...card.description, bn: e.target.value },
                          };
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Description (English)</label>
                      <textarea
                        rows={2}
                        value={card.description?.en || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutValuesCards || [])];
                          updated[idx] = {
                            ...card,
                            description: { ...card.description, en: e.target.value },
                          };
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Description (العربية)</label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={card.description?.ar || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutValuesCards || [])];
                          updated[idx] = {
                            ...card,
                            description: { ...card.description, ar: e.target.value },
                          };
                          setFormData({ ...formData, aboutValuesCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Future Vision Cards CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#2D3630] text-xs sm:text-sm flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#2D5A41]" />
                  <span>আমাদের ভবিষ্যৎ ভাবনা কার্ডসমূহ (Future Plans CMS)</span>
                </h4>
                <p className="text-[11px] text-[#7A877E] mt-0.5">
                  ভবিষ্যত ভাবনা সেকশনের ৪টি মূল উদ্যোগ কার্ড
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentCards = formData.aboutFutureCards || [];
                  const newCard: AboutFutureCard = {
                    id: `fut-${Date.now()}`,
                    title: { bn: 'নতুন পরিকল্পনা', en: 'New Plan', ar: '' },
                    description: { bn: '', en: '', ar: '' },
                    icon: 'Wallet',
                    sortOrder: currentCards.length + 1,
                    isEnabled: true,
                  };
                  setFormData({ ...formData, aboutFutureCards: [...currentCards, newCard] });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D5A41] text-white text-xs font-semibold hover:bg-[#234733]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>কার্ড যুক্ত করুন</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {(formData.aboutFutureCards || []).map((card, idx) => (
                <div key={card.id || idx} className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#EBE8E0] pb-2">
                    <span className="font-bold text-xs text-[#2D3630]">
                      পরিকল্পনা #{idx + 1}: {card.title?.bn || 'শিরোনামহীন'}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-[#5C665F] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={card.isEnabled !== false}
                          onChange={(e) => {
                            const updated = [...(formData.aboutFutureCards || [])];
                            updated[idx] = { ...card, isEnabled: e.target.checked };
                            setFormData({ ...formData, aboutFutureCards: updated });
                          }}
                          className="w-3.5 h-3.5 rounded text-[#2D5A41]"
                        />
                        <span>সক্রিয়</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.aboutFutureCards || []).filter((_, i) => i !== idx);
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="p-1 rounded text-[#A34B4B] hover:bg-[#FDF3F3]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">শিরোনাম (বাংলা)</label>
                      <input
                        type="text"
                        value={card.title?.bn || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutFutureCards || [])];
                          updated[idx] = {
                            ...card,
                            title: { ...card.title, bn: e.target.value },
                          };
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Title (English)</label>
                      <input
                        type="text"
                        value={card.title?.en || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutFutureCards || [])];
                          updated[idx] = {
                            ...card,
                            title: { ...card.title, en: e.target.value },
                          };
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Title (العربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={card.title?.ar || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutFutureCards || [])];
                          updated[idx] = {
                            ...card,
                            title: { ...card.title, ar: e.target.value },
                          };
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">বিবরণ / লক্ষ্য (বাংলা)</label>
                      <textarea
                        rows={2}
                        value={card.description?.bn || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutFutureCards || [])];
                          updated[idx] = {
                            ...card,
                            description: { ...card.description, bn: e.target.value },
                          };
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Description (English)</label>
                      <textarea
                        rows={2}
                        value={card.description?.en || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutFutureCards || [])];
                          updated[idx] = {
                            ...card,
                            description: { ...card.description, en: e.target.value },
                          };
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2D3630] mb-0.5">Description (العربية)</label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={card.description?.ar || ''}
                        onChange={(e) => {
                          const updated = [...(formData.aboutFutureCards || [])];
                          updated[idx] = {
                            ...card,
                            description: { ...card.description, ar: e.target.value },
                          };
                          setFormData({ ...formData, aboutFutureCards: updated });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs text-[#2D3630]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. CONTACT PAGE CMS */}
      {activeSection === 'contact' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#2D5A41]" />
              <span>যোগাযোগ পেজ CMS ও বার্তা ফর্ম কনফিগারেশন</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              যোগাযোগ পেজের শিরোনাম, সরাসরি যোগাযোগের বক্তব্য, সদস্যপদের নোট এবং মেসেজ ফর্মের ফিল্ড ও লেবেল সম্পূর্ণ নিয়ন্ত্রণ করুন। ব্যবহারকারীদের প্রেরিত বার্তা সরাসরি অ্যাডমিন ইনবক্সে জমা হয়।
            </p>
          </div>

          {/* Page Hero Titles */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-4">
            <span className="block font-bold text-[#2D3630] text-xs">পেজ হিরো শিরোনাম ও সাবটাইটেল:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">পেজ শিরোনাম (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.pageTitle?.bn || ''}
                  onChange={(e) => updateContactMultiText('pageTitle', 'bn', e.target.value)}
                  placeholder="যেমন: যোগাযোগ ও সংযোগ"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Page Title (English)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.pageTitle?.en || ''}
                  onChange={(e) => updateContactMultiText('pageTitle', 'en', e.target.value)}
                  placeholder="e.g. Contact & Connect"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">পেজ সাবটাইটেল (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.pageSubtitle?.bn || ''}
                  onChange={(e) => updateContactMultiText('pageSubtitle', 'bn', e.target.value)}
                  placeholder="যেমন: সহানুভূতি ফাউন্ডেশনের সাথে যুক্ত হতে বা যেকোনো প্রয়োজনে..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">Page Subtitle (English)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.pageSubtitle?.en || ''}
                  onChange={(e) => updateContactMultiText('pageSubtitle', 'en', e.target.value)}
                  placeholder="e.g. Reach out to collaborate, inquire or join us..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* Left Column Text CMS */}
          <div className="p-4 rounded-xl bg-[#FDFCF9] border border-[#EBE8E0] space-y-4">
            <span className="block font-bold text-[#2D3630] text-xs">সরাসরি যোগাযোগ ও সদস্যপদের নোট CMS:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">সরাসরি সংযোগ সেকশন শিরোনাম (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.directContactTitle?.bn || ''}
                  onChange={(e) => updateContactMultiText('directContactTitle', 'bn', e.target.value)}
                  placeholder="যেমন: সরাসরি সংযোগ"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">সরাসরি সংযোগ সহায়ক বক্তব্য (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.directContactDescription?.bn || ''}
                  onChange={(e) => updateContactMultiText('directContactDescription', 'bn', e.target.value)}
                  placeholder="যেমন: আমাদের সাথে যেকোনো সময় ইমেইল বা ফেসবুকের মাধ্যমে..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EBE8E0]">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">সদস্যপদ ও পরামর্শ কার্ড শিরোনাম (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.membershipNoteTitle?.bn || ''}
                  onChange={(e) => updateContactMultiText('membershipNoteTitle', 'bn', e.target.value)}
                  placeholder="যেমন: সদস্যপদ ও পরামর্শের জন্য"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">সদস্যপদ ও পরামর্শ কার্ড বিবরণ (বাংলা)</label>
                <textarea
                  rows={2}
                  value={formData.contactPageConfig?.membershipNoteContent?.bn || ''}
                  onChange={(e) => updateContactMultiText('membershipNoteContent', 'bn', e.target.value)}
                  placeholder="যেমন: আপনি যদি পরিবারের সদস্য হয়ে থাকেন এবং এখনো..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>
          </div>

          {/* Form Headers & Requirement Controls */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-4">
            <span className="block font-bold text-[#2D3630] text-xs">বার্তা ফর্ম শিরোনাম ও ফিল্ডের শর্তাবলী:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">ফর্ম শিরোনাম (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.formTitle?.bn || ''}
                  onChange={(e) => updateContactMultiText('formTitle', 'bn', e.target.value)}
                  placeholder="যেমন: আমাদের বার্তা পাঠান"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2D3630] mb-1">ফর্ম সাবটাইটেল (বাংলা)</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.formSubtitle?.bn || ''}
                  onChange={(e) => updateContactMultiText('formSubtitle', 'bn', e.target.value)}
                  placeholder="যেমন: ফর্মটি পূরণ করে সাবমিট করলে সরাসরি অ্যাডমিন ইনবক্সে জমা হবে।"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-white text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 border-t border-[#EBE8E0]">
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-[#EBE8E0]">
                <input
                  type="checkbox"
                  checked={Boolean(formData.contactPageConfig?.isPhoneRequired)}
                  onChange={(e) => updateContactConfig('isPhoneRequired', e.target.checked)}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="text-[#2D3630] font-semibold text-xs">ফোন নম্বর ফিল্ড আবশ্যক (Required) করুন</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-[#EBE8E0]">
                <input
                  type="checkbox"
                  checked={Boolean(formData.contactPageConfig?.isSubjectRequired)}
                  onChange={(e) => updateContactConfig('isSubjectRequired', e.target.checked)}
                  className="w-4 h-4 rounded text-[#2D5A41] focus:ring-[#2D5A41]"
                />
                <span className="text-[#2D3630] font-semibold text-xs">বিষয় (Subject) ফিল্ড আবশ্যক করুন</span>
              </label>
            </div>
          </div>

          {/* Form Labels & Placeholders */}
          <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] space-y-3">
            <span className="block font-bold text-[#2D3630] text-xs">ফর্ম ইনপুট লেবেল ও প্লেসহোল্ডার কাস্টমাইজেশন:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">নামের লেবেল</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.nameLabel || ''}
                  onChange={(e) => updateContactConfig('nameLabel', e.target.value)}
                  placeholder="আপনার নাম"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">নামের প্লেসহোল্ডার</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.namePlaceholder || ''}
                  onChange={(e) => updateContactConfig('namePlaceholder', e.target.value)}
                  placeholder="যেমন: মোহাম্মদ আবদুল্লাহ"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">ইমেইল লেবেল</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.emailLabel || ''}
                  onChange={(e) => updateContactConfig('emailLabel', e.target.value)}
                  placeholder="ইমেইল ঠিকানা"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">ইমেইল প্লেসহোল্ডার</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.emailPlaceholder || ''}
                  onChange={(e) => updateContactConfig('emailPlaceholder', e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">ফোন নম্বর লেবেল</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.phoneLabel || ''}
                  onChange={(e) => updateContactConfig('phoneLabel', e.target.value)}
                  placeholder="ফোন / মোবাইল নম্বর"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">ফোন নম্বর প্লেসহোল্ডার</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.phonePlaceholder || ''}
                  onChange={(e) => updateContactConfig('phonePlaceholder', e.target.value)}
                  placeholder="+880 1..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বিষয়ের লেবেল</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.subjectLabel || ''}
                  onChange={(e) => updateContactConfig('subjectLabel', e.target.value)}
                  placeholder="বার্তা বা যোগাযোগের বিষয়"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5C665F] mb-1">বিষয়ের প্লেসহোল্ডার</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.subjectPlaceholder || ''}
                  onChange={(e) => updateContactConfig('subjectPlaceholder', e.target.value)}
                  placeholder="যেমন: সদস্য হওয়ার আবেদন / পরামর্শ"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#EBE8E0] bg-[#FDFCF9] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Submission Feedback Messages */}
          <div className="p-4 rounded-xl bg-[#E8EFEA] border border-[#2D5A41]/20 space-y-3">
            <span className="block font-bold text-[#234733] text-xs">সফলভাবে প্রেরণের পর ব্যবহারকারীকে দেখানো বার্তা:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#2D5A41] mb-1">সফলতার শিরোনাম</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.successTitle || ''}
                  onChange={(e) => updateContactConfig('successTitle', e.target.value)}
                  placeholder="আপনার বার্তা সফলভাবে পাঠানো হয়েছে!"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#2D5A41]/30 bg-white text-xs text-[#2D3630]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#2D5A41] mb-1">আরেকটি বার্তা পাঠান বাটনের টেক্সট</label>
                <input
                  type="text"
                  value={formData.contactPageConfig?.sendAnotherText || ''}
                  onChange={(e) => updateContactConfig('sendAnotherText', e.target.value)}
                  placeholder="আরেকটি বার্তা পাঠান"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#2D5A41]/30 bg-white text-xs text-[#2D3630]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#2D5A41] mb-1">সফলতার বিস্তারিত বার্তা</label>
              <textarea
                rows={2}
                value={formData.contactPageConfig?.successMessage || ''}
                onChange={(e) => updateContactConfig('successMessage', e.target.value)}
                placeholder="আপনার প্রেরিত বার্তাটি নিরাপদে সংরক্ষিত হয়েছে। ইনশাআল্লাহ দ্রুত যোগাযোগ করা হবে।"
                className="w-full px-3 py-1.5 rounded-lg border border-[#2D5A41]/30 bg-white text-xs text-[#2D3630]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. SOCIAL & CONTACT CHANNELS */}
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

      {/* 8. SOCIAL SHARE PREVIEW / WEBSITE PREVIEW SETTINGS */}
      {activeSection === 'social-share' && (
        <div className="p-6 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-6">
          <div className="pb-3 border-b border-[#EBE8E0]">
            <h3 className="text-sm font-bold text-[#2D3630] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#2D5A41]" />
              <span>সোশ্যাল মিডিয়া শেয়ার ও প্রিভিউ সেটিংস (Social Share / Website Preview)</span>
            </h3>
            <p className="text-[11px] text-[#5C665F] mt-0.5">
              Facebook, WhatsApp, Messenger, Twitter/X বা লিঙ্ক শেয়ারিংয়ে প্রদর্শিত প্রিভিউ কার্ড (og:title, og:description, og:image) কাস্টমাইজ করুন।
            </p>
          </div>

          {/* Limitation & Platform Cache Notice */}
          <div className="p-4 rounded-xl bg-[#F4F7F5] border border-[#2D5A41]/20 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#2D5A41]">
              <Sparkles className="w-4 h-4 text-[#2D5A41]" />
              <span>GitHub Pages ও সোশ্যাল ক্রলার সংক্রান্ত তথ্য:</span>
            </div>
            <p className="text-[#5C665F] leading-relaxed">
              ১. <strong>স্ট্যাটিক হোস্টিং মেটাডাটা:</strong> এই ওয়েবসাইটটি GitHub Pages স্ট্যাটিক হোস্টিংয়ে হোস্ট করা। এখানে পরিবর্তনগুলো ক্লাউড ডাটাবেজে ও ব্রাউজারে সঙ্গে সঙ্গে আপডেট হয়। তবে ফেসবুক বা হোয়াটসঅ্যাপের মতো এক্সটার্নাল ক্রলারগুলো রিয়্যাল-টাইম জাভাস্ক্রিপ্ট না চালিয়ে সরাসরি সার্ভার এইচটিএমএল রিড করে। ফলে গিটহাব অ্যাকশন্সের পরবর্তী বিল্ড/ডিপ্লয়মেন্ট সম্পন্ন হলে ক্রলারগুলো সর্বশেষ স্ট্যাটিক মেটাডাটা সরাসরি পাবে।<br />
              ২. <strong>ক্রলার ক্যাশ রিফ্রেশ:</strong> সামাজিক যোগাযোগ মাধ্যমগুলো (যেমন ফেসবুক বা হোয়াটসঅ্যাপ) পূর্বের মেটাডাটা সাময়িকভাবে ক্যাশ করে রাখে। নতুন পরিবর্তনের তাৎক্ষণিক রিফ্রেশ পেতে ফেসবুকের <span className="font-mono text-[#2D5A41]">Sharing Debugger</span> এ গিয়ে &quot;Scrape Again&quot; করতে হতে পারে।
            </p>
          </div>

          {/* TWO INDEPENDENT IMAGE CREATION MODES SELECTOR */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#2D3630]">
              শেয়ার ইমেজ তৈরির পদ্ধতি নির্বাচন করুন (Social Share Image Mode):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Auto-generated Branded Card */}
              <div
                onClick={() => handleShareModeChange('auto')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  currentShareMode === 'auto'
                    ? 'border-[#2D5A41] bg-[#E8EFEA]/30 shadow-2xs'
                    : 'border-[#EBE8E0] bg-[#FDFCF9] hover:bg-[#F7F5F0]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="shareMode"
                    checked={currentShareMode === 'auto'}
                    onChange={() => handleShareModeChange('auto')}
                    className="mt-1 text-[#2D5A41] focus:ring-[#2D5A41]"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#2D3630]">
                      <Wand2 className="w-3.5 h-3.5 text-[#2D5A41]" />
                      <span>১. স্বয়ংক্রিয় ব্রanded শেয়ার কার্ড (Auto-generated branded share card)</span>
                    </div>
                    <p className="text-[11px] text-[#5C665F] leading-relaxed">
                      অফিসিয়াল লোগো, বাংলা/ইংরেজি/আরবি নাম, শিরোনাম ও পরিচিতি দিয়ে ১২০০×৬৩০ হাই-রেজ্যুলুশন শেয়ার কার্ড তৈরি করুন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Upload Custom Designed Image */}
              <div
                onClick={() => handleShareModeChange('custom')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  currentShareMode === 'custom'
                    ? 'border-[#2D5A41] bg-[#E8EFEA]/30 shadow-2xs'
                    : 'border-[#EBE8E0] bg-[#FDFCF9] hover:bg-[#F7F5F0]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="shareMode"
                    checked={currentShareMode === 'custom'}
                    onChange={() => handleShareModeChange('custom')}
                    className="mt-1 text-[#2D5A41] focus:ring-[#2D5A41]"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#2D3630]">
                      <Upload className="w-3.5 h-3.5 text-[#2D5A41]" />
                      <span>২. নিজের ডিজাইন করা ছবি আপলোড (Upload my own designed image)</span>
                    </div>
                    <p className="text-[11px] text-[#5C665F] leading-relaxed">
                      বাইরে ক্যানভা বা ফটোশপে ডিজাইন করা সম্পন্ন PNG/JPEG ব্যানার সরাসরি আপলোড করুন। কোনো অতিরিক্ত লেখা বা লোগো বসানো হবে না।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-[#EBE8E0]">
            {/* Form Inputs Column */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#2D3630] pb-1 border-b border-[#EBE8E0]">
                শেয়ার শিরোনাম (Share Title)
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  বাংলা শিরোনাম
                </label>
                <input
                  type="text"
                  value={formData.socialSharePreview?.title?.bn || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialSharePreview: {
                        ...formData.socialSharePreview,
                        title: {
                          bn: e.target.value,
                          en: formData.socialSharePreview?.title?.en || '',
                          ar: formData.socialSharePreview?.title?.ar || '',
                        },
                      },
                    })
                  }
                  placeholder={formData.nameBn || 'সহানুভূতি ফাউন্ডেশন'}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  English Title
                </label>
                <input
                  type="text"
                  value={formData.socialSharePreview?.title?.en || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialSharePreview: {
                        ...formData.socialSharePreview,
                        title: {
                          bn: formData.socialSharePreview?.title?.bn || '',
                          en: e.target.value,
                          ar: formData.socialSharePreview?.title?.ar || '',
                        },
                      },
                    })
                  }
                  placeholder={formData.nameEn || 'Sahanubhuti Foundation'}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  العنوان بالعربية (Arabic Title)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.socialSharePreview?.title?.ar || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialSharePreview: {
                        ...formData.socialSharePreview,
                        title: {
                          bn: formData.socialSharePreview?.title?.bn || '',
                          en: formData.socialSharePreview?.title?.en || '',
                          ar: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder={formData.nameAr || 'مؤسسة ساهانوبوتي'}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <h4 className="font-bold text-xs text-[#2D3630] pt-2 pb-1 border-b border-[#EBE8E0]">
                শেয়ার সংক্ষিপ্ত বিবরণ (Share Description)
              </h4>
              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  বাংলা বিবরণ
                </label>
                <textarea
                  rows={2}
                  value={formData.socialSharePreview?.description?.bn || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialSharePreview: {
                        ...formData.socialSharePreview,
                        description: {
                          bn: e.target.value,
                          en: formData.socialSharePreview?.description?.en || '',
                          ar: formData.socialSharePreview?.description?.ar || '',
                        },
                      },
                    })
                  }
                  placeholder="সহানুভূতি ও মানবিকতার মাধ্যমে নিজেদের মানুষদের পাশে দাঁড়ানোর একটি পারিবারিক উদ্যোগ।"
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  English Description
                </label>
                <textarea
                  rows={2}
                  value={formData.socialSharePreview?.description?.en || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialSharePreview: {
                        ...formData.socialSharePreview,
                        description: {
                          bn: formData.socialSharePreview?.description?.bn || '',
                          en: e.target.value,
                          ar: formData.socialSharePreview?.description?.ar || '',
                        },
                      },
                    })
                  }
                  placeholder="A sincere humanitarian family foundation based in Moulovi Bari, Sharshadi, Feni, Bangladesh."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2D3630] mb-1">
                  الوصف بالعربية (Arabic Description)
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={formData.socialSharePreview?.description?.ar || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialSharePreview: {
                        ...formData.socialSharePreview,
                        description: {
                          bn: formData.socialSharePreview?.description?.bn || '',
                          en: formData.socialSharePreview?.description?.en || '',
                          ar: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="مبادرة عائلية إنسانية مخلصة لدعم المحتاجين في شارشادي، فيني، بنغلاديش."
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE8E0] bg-[#FDFCF9] text-[#2D3630] focus:outline-hidden focus:border-[#2D5A41] focus:ring-1 focus:ring-[#2D5A41]"
                />
              </div>

              {/* MODE SPECIFIC CONTROLS */}
              {currentShareMode === 'auto' ? (
                /* MODE 1: AUTO GENERATED CONTROLS */
                <div className="space-y-4 pt-3 border-t border-[#EBE8E0]">
                  <h4 className="font-bold text-xs text-[#2D3630] flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-[#2D5A41]" />
                    <span>স্বয়ংক্রিয় ব্রanded শেয়ার কার্ড কনফিগারেশন</span>
                  </h4>

                  {/* Language Selector for Card Generator */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0]">
                    <span className="text-xs font-bold text-[#2D3630] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#2D5A41]" />
                      <span>জেনারেটেড কার্ডের ভাষা (Preview Language):</span>
                    </span>
                    <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg border border-[#EBE8E0]">
                      {(['bn', 'en', 'ar'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setShareCardPreviewLang(lang);
                            setFormData({
                              ...formData,
                              socialSharePreview: {
                                ...formData.socialSharePreview,
                                cardLanguage: lang,
                              },
                            });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            shareCardPreviewLang === lang
                              ? 'bg-[#2D5A41] text-white shadow-2xs font-bold'
                              : 'text-[#5C665F] hover:text-[#2D3630]'
                          }`}
                        >
                          {lang === 'bn' ? 'বাংলা' : lang === 'en' ? 'English' : 'العربية'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Canonical Logo & Card Logo Override */}
                  <div className="p-3.5 rounded-xl border border-[#EBE8E0] bg-[#FAF9F6] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D3630]">
                        কার্ডে ব্যবহৃত লোগো (Header Logo):
                      </span>
                      <span className="text-[10px] text-[#2D5A41] font-semibold bg-[#E8EFEA] px-2 py-0.5 rounded">
                        Contain ফিট (লোগো ক্রপ হবে না)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-[#EBE8E0] p-1.5 flex items-center justify-center shadow-3xs shrink-0">
                        <img
                          src={
                            formData.socialSharePreview?.cardLogoUrl ||
                            formData.logoOverrides?.header ||
                            formData.logoUrl ||
                            '/assets/logo.svg'
                          }
                          alt="Card Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="text-[11px] text-[#5C665F] space-y-1">
                        <p>
                          {formData.socialSharePreview?.cardLogoUrl
                            ? 'সোশ্যাল কার্ডের জন্য পৃথক লোগো ওভাররাইড সক্রিয় রয়েছে।'
                            : 'ডিফল্ট হেডার লোগো স্বয়ংক্রিয়ভাবে ব্যবহৃত হচ্ছে।'}
                        </p>
                        {formData.socialSharePreview?.cardLogoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                socialSharePreview: {
                                  ...formData.socialSharePreview,
                                  cardLogoUrl: '',
                                },
                              })
                            }
                            className="text-[10px] text-rose-600 font-semibold hover:underline"
                          >
                            লোগো ওভাররাইড বাতিল করে মূল হেডারে ফিরে যান
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional Card Logo Override Upload */}
                    <div className="pt-1">
                      <MediaUploadField
                        label="ঐচ্ছিক: শুধুমাত্র শেয়ার কার্ডের জন্য পৃথক লোগো (Optional Override)"
                        value={formData.socialSharePreview?.cardLogoUrl || ''}
                        onChange={(url) =>
                          setFormData({
                            ...formData,
                            socialSharePreview: {
                              ...formData.socialSharePreview,
                              cardLogoUrl: url,
                            },
                          })
                        }
                        helperText="মূল হেডার লোগো অক্ষুণ্ন রেখে শুধুমাত্র শেয়ার কার্ডের জন্য ভিন্ন লোগো নির্বাচন করতে চাইলে এখানে আপলোড করুন।"
                        bucket="branding"
                        previewAspect="square"
                        maxSizeBytes={3 * 1024 * 1024}
                      />
                    </div>
                  </div>

                  {/* Generate & Save Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isGeneratingShareCard}
                      onClick={handleGenerateAndSaveCard}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D5A41] text-white text-xs font-bold hover:bg-[#234733] active:scale-99 transition-all shadow-2xs disabled:opacity-50"
                    >
                      {isGeneratingShareCard ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>১২০০x৬৩০ কার্ড তৈরি ও ক্লাউডে আপলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>১২০০x৬৩০ ব্রanded শেয়ার কার্ড তৈরি ও সংরক্ষণ করুন (Generate & Save Share Card)</span>
                        </>
                      )}
                    </button>
                    {formData.socialSharePreview?.autoGeneratedImageUrl && (
                      <p className="text-[10px] text-[#2D5A41] mt-1.5 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>সর্বশেষ প্রস্তুতকৃত স্বয়ংক্রিয় কার্ড সংরক্ষিত ও কার্যকর রয়েছে</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* MODE 2: CUSTOM IMAGE UPLOAD CONTROLS */
                <div className="space-y-4 pt-3 border-t border-[#EBE8E0]">
                  <h4 className="font-bold text-xs text-[#2D3630] flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#2D5A41]" />
                    <span>কাস্টম ডিজাইন করা শেয়ার ছবি আপলোড</span>
                  </h4>

                  <MediaUploadField
                    label="শেয়ার ব্যানার ছবি (Custom Social Card Image - 1200x630)"
                    value={formData.socialSharePreview?.customImageUrl || ''}
                    onChange={handleCustomImageUpload}
                    helperText="ফেসবুক, হোয়াটসঅ্যাপ বা এক্স-এর জন্য বাইরে ডিজাইন করা সম্পন্ন PNG বা JPEG ছবি নির্বাচন করুন। কোনো স্বয়ংক্রিয় লোগো বা ওয়াটারমার্ক বসানো হবে না।"
                    bucket="branding"
                    previewAspect="wide"
                    maxSizeBytes={8 * 1024 * 1024}
                  />

                  {customImageWarning && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{customImageWarning}</span>
                    </div>
                  )}

                  {customImageDimensions && (
                    <div className="text-[11px] text-[#5C665F] flex items-center gap-2 p-2 rounded-lg bg-[#FAF9F6] border border-[#EBE8E0]">
                      <span>শনাক্তকৃত সাইজ:</span>
                      <span className="font-mono font-bold text-[#2D3630]">
                        {customImageDimensions.width} × {customImageDimensions.height} px
                      </span>
                      <span className="text-[#A4B3A8]">|</span>
                      <span>অনুপাত:</span>
                      <span className="font-mono font-bold text-[#2D3630]">
                        {(customImageDimensions.width / customImageDimensions.height).toFixed(2)}:1
                      </span>
                    </div>
                  )}

                  {formData.socialSharePreview?.customImageUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCustomImageUpload('')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>কাস্টম ছবি অপসারণ করুন</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Preview Column */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#2D3630] pb-1 border-b border-[#EBE8E0] flex items-center justify-between">
                <span>লাইভ প্রিভিউ প্রদর্শন (Live Social Card Preview)</span>
                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${
                    currentShareMode === 'custom'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20'
                  }`}
                >
                  {currentShareMode === 'custom' ? 'কাস্টম আপলোডকৃত ছবি মোড' : 'স্বয়ংক্রিয় ব্রanded কার্ড মোড'}
                </span>
              </h4>

              {/* Mock Social Card */}
              <div className="rounded-2xl border border-[#D9D6CC] bg-[#F9F8F5] overflow-hidden shadow-sm">
                {/* Image Area */}
                <div className="w-full aspect-[1.91/1] bg-[#E8EFEA] relative overflow-hidden flex items-center justify-center border-b border-[#EBE8E0]">
                  {currentShareMode === 'custom' ? (
                    formData.socialSharePreview?.customImageUrl ? (
                      <img
                        src={formData.socialSharePreview.customImageUrl}
                        alt="Custom Social Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-6 text-[#7A877E] space-y-1">
                        <Upload className="w-8 h-8 text-[#A4B3A8] mx-auto" />
                        <span className="text-xs font-medium block">কাস্টম ছবি এখনো আপলোড করা হয়নি</span>
                        <span className="text-[10px] text-[#A4B3A8] block">বাম পাশের আপলোড ফিল্ড ব্যবহার করুন</span>
                      </div>
                    )
                  ) : (
                    cardCanvasPreviewUrl || formData.socialSharePreview?.autoGeneratedImageUrl ? (
                      <img
                        src={cardCanvasPreviewUrl || formData.socialSharePreview?.autoGeneratedImageUrl}
                        alt="Auto Generated Social Card Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <img
                          src="/assets/og-preview.png"
                          alt="Default Foundation Social Card"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded font-medium">
                          ডিফল্ট ১২০০x৬৩০ কার্ড
                        </div>
                      </>
                    )
                  )}
                </div>

                {/* Content Area */}
                <div className="p-4 bg-white space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#7A877E] tracking-wider block">
                    sahanubhutifoundation.github.io
                  </span>
                  <h5 className="text-sm font-bold text-[#1E293B] line-clamp-1 leading-snug">
                    {formData.socialSharePreview?.title?.[shareCardPreviewLang] ||
                      formData.socialSharePreview?.title?.bn ||
                      formData.nameBn ||
                      'সহানুভূতি ফাউন্ডেশন'}
                  </h5>
                  <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                    {formData.socialSharePreview?.description?.[shareCardPreviewLang] ||
                      formData.socialSharePreview?.description?.bn ||
                      'সহানুভূতি ও মানবিকতার মাধ্যমে নিজেদের মানুষদের পাশে দাঁড়ানোর একটি পারিবারিক উদ্যোগ।'}
                  </p>
                </div>
              </div>

              {/* English & Arabic Card Accordions / Mini View */}
              <div className="p-3.5 rounded-xl border border-[#EBE8E0] bg-[#FAF9F6] space-y-2 text-xs">
                <span className="block font-bold text-[#2D3630]">অন্যান্য ভাষার প্রিভিউ টেক্সট:</span>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="font-bold text-[#2D5A41]">EN: </span>
                    <span className="font-semibold text-[#2D3630]">
                      {formData.socialSharePreview?.title?.en || formData.nameEn || 'Sahanubhuti Foundation'}
                    </span>
                    <p className="text-[#5C665F] truncate">
                      {formData.socialSharePreview?.description?.en ||
                        'A sincere humanitarian family foundation based in Moulovi Bari, Sharshadi, Feni, Bangladesh.'}
                    </p>
                  </div>
                  <div className="pt-1 border-t border-[#EBE8E0]">
                    <span className="font-bold text-[#2D5A41]">AR: </span>
                    <span className="font-semibold text-[#2D3630]" dir="rtl">
                      {formData.socialSharePreview?.title?.ar || formData.nameAr || 'مؤسسة ساهانوبوتي'}
                    </span>
                    <p className="text-[#5C665F] truncate" dir="rtl">
                      {formData.socialSharePreview?.description?.ar ||
                        'مبادرة عائلية إنسانية مخلصة لدعم المحتاجين في شارشادي، فيني، بنغلاديش.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status and GitHub Pages Static Publishing Lifecycle */}
              <div className="p-4 rounded-xl border border-[#2D5A41]/20 bg-[#F4F7F5] space-y-3 text-[11px] text-[#2D3630]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2D5A41]/10">
                  <span className="font-bold text-[#2D5A41] flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-[#2D5A41]" />
                    <span>পাবলিকেশন স্ট্যাটাস ও সোশ্যাল ক্রলার নির্দেশিকা</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      সেটিংস সংরক্ষিত
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      <Clock className="w-3 h-3 text-amber-700" />
                      স্ট্যাটিক ডিপ্লয়মেন্টে প্রযোজ্য
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-[#5C665F] leading-relaxed">
                  <p>
                    ১. <strong>সেন্ট্রাল ডাটাবেজ (Supabase):</strong> আপনি যে মোড নির্বাচন করেছেন (স্বয়ংক্রিয় বা কাস্টম ছবি), তা ক্লাউড ডাটাবেজে স্থায়ীভাবে সংরক্ষিত হয়েছে। ব্রাউজার ভিজিটররা ওয়েবসাইটে প্রবেশ করলে সরাসরি এই ছবিটি দেখতে পাবেন।
                  </p>
                  <p>
                    ২. <strong>সোশ্যাল ক্রলার ও GitHub Pages:</strong> ফেসবুক, হোয়াটসঅ্যাপ বা এক্স (টুইটার) লিঙ্ক প্রিভিউ স্ক্র্যাপারগুলো জাভাস্ক্রিপ্ট চালায় না; তারা স্ট্যাটিক HTML ফাইল পড়ে। GitHub Actions-এর <span className="font-mono text-[#2D5A41] font-semibold">Deploy to GitHub Pages</span> ওয়ার্কফ্লোটি রান হলে তা স্বয়ংক্রিয়ভাবে ক্লাউড থেকে আপনার সর্বশেষ সোশ্যাল কনফিগারেশন নিয়ে স্ট্যাটিক HTML ও ১২০০x৬৩০ মেটাডাটা তৈরি করে প্রকাশ করে।
                  </p>
                  <p>
                    ৩. <strong>ক্রলার ক্যাশ রিফ্রেশ:</strong> ফেসবুক বা হোয়াটসঅ্যাপ ইতিমধ্যে শেয়ার করা লিঙ্কের পুরনো ছবি কিছু সময় মেমরিতে রেখে দেয় (Cache)। নতুন ছবি তৎক্ষণাৎ দেখতে ফেসবুকের <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer" className="text-[#2D5A41] underline font-semibold inline-flex items-center gap-0.5">Sharing Debugger <ExternalLink className="w-2.5 h-2.5" /></a>-এ গিয়ে &quot;Scrape Again&quot; করুন।
                  </p>
                </div>

                {publishStatus && (
                  <div className="p-2.5 rounded-lg bg-white border border-[#2D5A41]/20 text-[11px] text-[#2D5A41] flex items-center justify-between">
                    <span className="font-medium">{publishStatus.message}</span>
                    <span className="text-[10px] bg-[#E8EFEA] px-2 py-0.5 rounded font-bold">আপডেট সংরক্ষিত</span>
                  </div>
                )}
              </div>
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

          {/* Serial Design & Corner Position */}
          <div className="pt-4 border-t border-[#EBE8E0] space-y-4">
            <div>
              <label className="block font-bold text-[#2D3630] mb-2">
                সদস্য ক্রমিক নম্বর ডিজাইন শৈলী (Member Serial Design Style):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {[
                  { id: 'minimal', label: 'সফট ক্লিন (Minimal)', desc: 'হালকা ব্যাকগ্রাউন্ডে পরিচ্ছন্ন সংখ্যা', preview: '01' },
                  { id: 'circle', label: 'বৃত্তাকার ব্যাজ (Circle)', desc: 'বৃত্তের মধ্যে নম্বর', preview: '01' },
                  { id: 'pill', label: 'সফট পিল (Soft Pill)', desc: 'ওভাল পিল আকৃতি', preview: '01' },
                  { id: 'corner', label: 'কর্নার ট্যাগ (Corner)', desc: 'কোণায় সলিড ব্র্যান্ড ট্যাগ', preview: '01' },
                  { id: 'outline', label: 'আউটলাইন (Outline)', desc: 'বর্ডার ফ্রেমসহ নম্বর', preview: '01' },
                ].map((s) => (
                  <label
                    key={s.id}
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                      (formData.memberSerialStyle || 'minimal') === s.id
                        ? 'border-[#2D5A41] bg-[#E8EFEA]'
                        : 'border-[#EBE8E0] bg-[#FDFCF9] hover:bg-[#F7F5F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#2D3630]">{s.label}</span>
                      <input
                        type="radio"
                        name="memberSerialStyle"
                        value={s.id}
                        checked={(formData.memberSerialStyle || 'minimal') === s.id}
                        onChange={(e) => setFormData({ ...formData, memberSerialStyle: e.target.value as any })}
                        className="text-[#2D5A41]"
                      />
                    </div>
                    <span className="text-[10px] text-[#7A877E] mb-2">{s.desc}</span>
                    <div className="mt-auto flex items-center justify-center p-2 bg-white rounded-lg border border-[#EBE8E0]">
                      {s.id === 'circle' ? (
                        <span className="w-6 h-6 rounded-full bg-[#F7F5F0] border border-[#EBE8E0] text-[10px] font-mono font-bold text-[#2D5A41] flex items-center justify-center shadow-3xs">
                          {s.preview}
                        </span>
                      ) : s.id === 'pill' ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#E8EFEA] border border-[#D1DFD6] text-[10px] font-mono font-bold text-[#2D5A41]">
                          {s.preview}
                        </span>
                      ) : s.id === 'corner' ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#2D5A41] text-white text-[10px] font-mono font-bold">
                          {s.preview}
                        </span>
                      ) : s.id === 'outline' ? (
                        <span className="px-1.5 py-0.5 rounded-md border border-[#7A877E]/60 text-[10px] font-mono font-bold text-[#2D3630]">
                          {s.preview}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-[#7A877E] px-1.5 py-0.5 rounded-md bg-[#F7F5F0]">
                          {s.preview}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#2D3630] mb-2">
                সদস্য কার্ডে ক্রমিকের কোণ অবস্থান (Serial Corner Position):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'top-left', label: 'উপরে বামে (Top-Left)', desc: 'ডিফল্ট আদর্শ অবস্থান' },
                  { id: 'top-right', label: 'উপরে ডানে (Top-Right)', desc: 'ডান কোণায় প্রদর্শিত' },
                  { id: 'bottom-left', label: 'নিচে বামে (Bottom-Left)', desc: 'কার্ডের নিচে বামে' },
                  { id: 'bottom-right', label: 'নিচে ডানে (Bottom-Right)', desc: 'কার্ডের নিচে ডানে' },
                ].map((pos) => (
                  <label
                    key={pos.id}
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                      (formData.memberSerialPosition || 'top-left') === pos.id
                        ? 'border-[#2D5A41] bg-[#E8EFEA]'
                        : 'border-[#EBE8E0] bg-[#FDFCF9] hover:bg-[#F7F5F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#2D3630]">{pos.label}</span>
                      <input
                        type="radio"
                        name="memberSerialPosition"
                        value={pos.id}
                        checked={(formData.memberSerialPosition || 'top-left') === pos.id}
                        onChange={(e) => setFormData({ ...formData, memberSerialPosition: e.target.value as any })}
                        className="text-[#2D5A41]"
                      />
                    </div>
                    <span className="text-[10px] text-[#7A877E]">{pos.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Member Grid Controls */}
          <div className="pt-4 border-t border-[#EBE8E0] space-y-4">
            <h4 className="font-bold text-[#2D3630] text-xs sm:text-sm flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-[#2D5A41]" />
              <span>সদস্য গ্রিড কলাম ও ডিসপ্লে কন্ট্রোল (Member Grid Controls)</span>
            </h4>

            {/* Homepage Grid */}
            <div className="p-3.5 bg-[#FDFCF9] rounded-xl border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-xs text-[#2D3630]">
                ১. হোমপেজ সদস্য গ্রিড (Homepage Member Grid):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ডেস্কটপ কলাম (Cards/Row)</label>
                  <select
                    value={formData.homeMemberGrid?.desktopCols || 4}
                    onChange={(e) => {
                      const cols = parseInt(e.target.value, 10);
                      const rows = formData.homeMemberGrid?.desktopRows || 2;
                      setFormData({
                        ...formData,
                        homeMembersCount: cols * rows,
                        homeMemberGrid: {
                          ...formData.homeMemberGrid,
                          desktopCols: cols,
                          desktopRows: rows,
                          desktopLimit: cols * rows,
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  >
                    <option value={2}>২ কলাম</option>
                    <option value={3}>৩ কলাম</option>
                    <option value={4}>৪ কলাম (ডিফল্ট)</option>
                    <option value={5}>৫ কলাম</option>
                    <option value={6}>৬ কলাম</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ডেস্কটপ সারি (Rows)</label>
                  <select
                    value={formData.homeMemberGrid?.desktopRows || 2}
                    onChange={(e) => {
                      const rows = parseInt(e.target.value, 10);
                      const cols = formData.homeMemberGrid?.desktopCols || 4;
                      setFormData({
                        ...formData,
                        homeMembersCount: cols * rows,
                        homeMemberGrid: {
                          ...formData.homeMemberGrid,
                          desktopCols: cols,
                          desktopRows: rows,
                          desktopLimit: cols * rows,
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  >
                    <option value={1}>১ সারি ({(formData.homeMemberGrid?.desktopCols || 4) * 1} জন)</option>
                    <option value={2}>২ সারি ({(formData.homeMemberGrid?.desktopCols || 4) * 2} জন - ডিফল্ট)</option>
                    <option value={3}>৩ সারি ({(formData.homeMemberGrid?.desktopCols || 4) * 3} জন)</option>
                    <option value={4}>৪ সারি ({(formData.homeMemberGrid?.desktopCols || 4) * 4} জন)</option>
                    <option value={5}>৫ সারি ({(formData.homeMemberGrid?.desktopCols || 4) * 5} জন)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">মোবাইল কলাম (Cards/Row)</label>
                  <select
                    value={formData.homeMemberGrid?.mobileCols || 2}
                    onChange={(e) => {
                      const cols = parseInt(e.target.value, 10);
                      const rows = formData.homeMemberGrid?.mobileRows || 2;
                      setFormData({
                        ...formData,
                        homeMemberGrid: {
                          ...formData.homeMemberGrid,
                          mobileCols: cols,
                          mobileRows: rows,
                          mobileLimit: cols * rows,
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  >
                    <option value={1}>১ কলাম</option>
                    <option value={2}>২ কলাম (ডিফল্ট)</option>
                    <option value={3}>৩ কলাম</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">মোবাইল সারি (Rows)</label>
                  <select
                    value={formData.homeMemberGrid?.mobileRows || 2}
                    onChange={(e) => {
                      const rows = parseInt(e.target.value, 10);
                      const cols = formData.homeMemberGrid?.mobileCols || 2;
                      setFormData({
                        ...formData,
                        homeMemberGrid: {
                          ...formData.homeMemberGrid,
                          mobileCols: cols,
                          mobileRows: rows,
                          mobileLimit: cols * rows,
                        },
                      });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  >
                    <option value={1}>১ সারি ({(formData.homeMemberGrid?.mobileCols || 2) * 1} জন)</option>
                    <option value={2}>২ সারি ({(formData.homeMemberGrid?.mobileCols || 2) * 2} জন - ডিফল্ট)</option>
                    <option value={3}>৩ সারি ({(formData.homeMemberGrid?.mobileCols || 2) * 3} জন)</option>
                    <option value={4}>৪ সারি ({(formData.homeMemberGrid?.mobileCols || 2) * 4} জন)</option>
                    <option value={5}>৫ সারি ({(formData.homeMemberGrid?.mobileCols || 2) * 5} জন)</option>
                  </select>
                </div>
              </div>

              {/* Exact Count Summary Indicator */}
              <div className="p-2 rounded-lg bg-[#E8EFEA] border border-[#2D5A41]/20 flex flex-wrap items-center justify-between text-[11px] text-[#2D5A41]">
                <span>
                  <strong>হোমপেজ প্রদর্শন:</strong> ডেস্কটপে সর্বোচ্চ{' '}
                  {(formData.homeMemberGrid?.desktopCols || 4) * (formData.homeMemberGrid?.desktopRows || 2)} জন ({formData.homeMemberGrid?.desktopCols || 4} কলাম × {formData.homeMemberGrid?.desktopRows || 2} সারি)
                </span>
                <span>
                  মোবাইলে সর্বোচ্চ{' '}
                  {(formData.homeMemberGrid?.mobileCols || 2) * (formData.homeMemberGrid?.mobileRows || 2)} জন ({formData.homeMemberGrid?.mobileCols || 2} কলাম × {formData.homeMemberGrid?.mobileRows || 2} সারি)
                </span>
              </div>

              {/* View All Members Button Controls */}
              <div className="pt-2.5 border-t border-[#EBE8E0] flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D3630]">
                  <input
                    type="checkbox"
                    checked={formData.homeShowViewAllMembers !== false}
                    onChange={(e) => setFormData({ ...formData, homeShowViewAllMembers: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2D5A41]"
                  />
                  <span>হোমপেজে সদস্য কার্ডগুলোর নিচে &quot;সব সদস্য দেখুন&quot; বাটন প্রদর্শন করুন</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-[#5C665F]">বাটন লেবেল (বাংলা):</label>
                  <input
                    type="text"
                    value={formData.homeViewAllMembersLabel?.bn || 'সব সদস্য দেখুন'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        homeViewAllMembersLabel: {
                          ...formData.homeViewAllMembersLabel,
                          bn: e.target.value,
                        },
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  />
                </div>
              </div>
            </div>

            {/* Members Page Grid */}
            <div className="p-3.5 bg-[#FDFCF9] rounded-xl border border-[#EBE8E0] space-y-3">
              <span className="block font-bold text-xs text-[#2D3630]">
                ২. সদস্য তালিকা পেজ গ্রিড (/members Page Grid):
              </span>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">ডেস্কটপ কলাম</label>
                  <select
                    value={formData.membersPageGrid?.desktopCols || 4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        membersPageGrid: {
                          ...formData.membersPageGrid,
                          desktopCols: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  >
                    <option value={2}>২ কলাম</option>
                    <option value={3}>৩ কলাম</option>
                    <option value={4}>৪ কলাম (ডিফল্ট)</option>
                    <option value={5}>৫ কলাম</option>
                    <option value={6}>৬ কলাম</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3630] mb-1">মোবাইল কলাম</label>
                  <select
                    value={formData.membersPageGrid?.mobileCols || 2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        membersPageGrid: {
                          ...formData.membersPageGrid,
                          mobileCols: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#EBE8E0] bg-white text-xs text-[#2D3630]"
                  >
                    <option value={1}>১ কলাম</option>
                    <option value={2}>২ কলাম (ডিফল্ট)</option>
                    <option value={3}>৩ কলাম</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Action Bar */}
      <div className="sticky bottom-6 z-20 flex justify-end p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EBE8E0] shadow-lg">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white font-semibold text-xs shadow-2xs active:scale-98 transition-all disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'সংরক্ষণ ও যাচাই হচ্ছে...' : 'সকল সাইট সেটিংস পরিবর্তন সংরক্ষণ করুন'}</span>
        </button>
      </div>
    </form>
  );
};
