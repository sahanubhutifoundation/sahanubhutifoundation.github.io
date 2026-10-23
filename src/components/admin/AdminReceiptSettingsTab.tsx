import React, { useState } from 'react';
import { FoundationConfig, DonationReceiptSettings, Member } from '../../types';
import { DonationReceiptCard, ReceiptData } from '../receipt/DonationReceiptCard';
import { storageService } from '../../services/storageService';
import {
  FileText,
  Sliders,
  Eye,
  Check,
  UploadCloud,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Building,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';

interface AdminReceiptSettingsTabProps {
  config: FoundationConfig;
  onConfigChange: (updatedConfig: FoundationConfig) => void;
  showToast: (msg: string) => void;
  triggerSyncStatus?: (status: 'saving' | 'success' | 'error', text: string) => void;
}

export const AdminReceiptSettingsTab: React.FC<AdminReceiptSettingsTabProps> = ({
  config,
  onConfigChange,
  showToast,
  triggerSyncStatus,
}) => {
  const currentSettings: DonationReceiptSettings = config.donationReceiptSettings || {
    fieldVisibility: {
      showAddress: true,
      showPhone: true,
      showDonorSerial: true,
      showWordsAmount: true,
      showCollectorSignature: true,
      showWatermark: true,
      showNotes: true,
      showDisclaimer: true,
    },
    labels: {
      receiptTitle: 'দান গ্রহণ রসিদ',
      organizationNameBangla: 'সহানুভূতি ফাউন্ডেশন',
      organizationNameEnglish: 'Sahanubhuti Foundation',
      sloganBangla: 'মানবতার সেবায় নিয়োজিত',
      organizationAddress: 'মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের নিকটে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ',
      organizationContact: 'ফেসবুক: fb.com/sahanubhutifoundation',
      thankYouMessage: 'ধন্যবাদসহ গ্রহণ করা হলো। আপনার অনুদান মানবতার কল্যাণে ব্যবহৃত হবে।',
      signatureLabel: 'আদায়কারী / অনুমোদিত স্বাক্ষর',
      disclaimerText: 'এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল রসিদ।',
    },
    signaturePlacement: 'bottom-right',
    signatureWidth: 140,
    receiptPrefix: 'SF-MR',
    borderStyle: 'ornate',
  };

  const [settings, setSettings] = useState<DonationReceiptSettings>(currentSettings);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sample member for live preview
  const sampleMember: Member = {
    id: 'sample-01',
    serial: 1,
    name: 'মুহাম্মদ রহিম উল্লাহ',
    nameBn: 'মুহাম্মদ রহিম উল্লাহ',
    nameEn: 'Muhammad Rahim Ullah',
    address: 'মৌলভী বাড়ি, শর্শদী, ফেনী',
    phone: '+8801812345678',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const sampleReceiptData: ReceiptData = {
    receiptNumber: `${settings.receiptPrefix || 'SF-MR'}-2026-001-JAN`,
    issueDate: '২৩ অক্টোবর, ২০২৬',
    year: '2026',
    months: ['Jan'],
    periodLabel: 'জানুয়ারি ২০২৬',
    member: sampleMember,
    amount: 500,
  };

  // Preview config with live settings
  const previewConfig: FoundationConfig = {
    ...config,
    donationReceiptSettings: settings,
  };

  // Handle label change
  const handleLabelChange = (field: keyof typeof settings.labels, val: string) => {
    setSettings((prev) => ({
      ...prev,
      labels: {
        ...prev.labels,
        [field]: val,
      },
    }));
  };

  // Handle visibility toggle
  const handleVisibilityToggle = (field: keyof typeof settings.fieldVisibility) => {
    setSettings((prev) => ({
      ...prev,
      fieldVisibility: {
        ...prev.fieldVisibility,
        [field]: !prev.fieldVisibility[field],
      },
    }));
  };

  // Strictly validate and handle PNG signature upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignatureError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: PNG format only
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    if (!isPng) {
      setSignatureError('ভুল ফাইল ফরম্যাট! অনুগ্রহ করে শুধুমাত্র স্বচ্ছ ব্যাকগ্রাউন্ডযুক্ত পিএনজি (.png) ফাইল আপলোড করুন।');
      if (e.target) e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSignatureError('ফাইলের সাইজ অনেক বড়। সর্বোচ্চ ২ MB ফাইল আপলোড করা যাবে।');
      if (e.target) e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSettings((prev) => ({
          ...prev,
          signatureImageUrl: dataUrl,
        }));
        showToast('স্বাক্ষর ফাইল সফলভাবে যুক্ত হয়েছে। সংরক্ষণ করুন বাটনে ক্লিক করুন।');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setSettings((prev) => ({
      ...prev,
      signatureImageUrl: undefined,
    }));
    showToast('স্বাক্ষর মুছে ফেলা হয়েছে।');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (triggerSyncStatus) triggerSyncStatus('saving', 'রসিদ সেটিংস সংরক্ষণ করা হচ্ছে...');
      const updatedConfig: FoundationConfig = {
        ...config,
        donationReceiptSettings: settings,
      };
      await storageService.saveConfigAsync(updatedConfig);
      onConfigChange(updatedConfig);
      if (triggerSyncStatus) triggerSyncStatus('success', 'রসিদ সেটিংস সংরক্ষিত');
      showToast('অনলাইন রসিদ ডিজাইন ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      console.error('Failed to save receipt settings:', err);
      if (triggerSyncStatus) triggerSyncStatus('error', 'সংরক্ষণ ব্যর্থ');
      showToast('সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-[#1E3E2B] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-800 text-emerald-200 mb-1.5 border border-emerald-700/50">
            <FileText className="w-3.5 h-3.5" />
            <span>ডিজিটাল মানি রসিদ CMS</span>
          </div>
          <h3 className="text-lg font-bold">অনলাইন রসিদ ডিজাইন ও সেটিংস</h3>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            সদস্যদের জন্য অফিসিয়াল রসিদের তথ্য, শিরোনাম, স্বাক্ষর ও লেবেল পরিবর্তন করুন
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 shadow-md transition-all self-start sm:self-auto flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" /> : <Check className="w-4 h-4 text-emerald-700" />}
          <span>সেটিংস সংরক্ষণ করুন</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Organization & Header Labels */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>প্রতিষ্ঠান ও রসিদের শিরোনাম</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">রসিদের শিরোনাম</label>
                <input
                  type="text"
                  value={settings.labels.receiptTitle || ''}
                  onChange={(e) => handleLabelChange('receiptTitle', e.target.value)}
                  placeholder="যেমন: দান গ্রহণ রসিদ"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">রসিদ নম্বর প্রিফিক্স (Prefix)</label>
                <input
                  type="text"
                  value={settings.receiptPrefix || ''}
                  onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                  placeholder="যেমন: SF-MR"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 font-mono focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">সংগঠনের নাম (বাংলা)</label>
                <input
                  type="text"
                  value={settings.labels.organizationNameBangla || ''}
                  onChange={(e) => handleLabelChange('organizationNameBangla', e.target.value)}
                  placeholder="সহানুভূতি ফাউন্ডেশন"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">সংগঠনের নাম (ইংরেজি)</label>
                <input
                  type="text"
                  value={settings.labels.organizationNameEnglish || ''}
                  onChange={(e) => handleLabelChange('organizationNameEnglish', e.target.value)}
                  placeholder="Sahanubhuti Foundation"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">স্লোগান বা মূলমন্ত্র</label>
                <input
                  type="text"
                  value={settings.labels.sloganBangla || ''}
                  onChange={(e) => handleLabelChange('sloganBangla', e.target.value)}
                  placeholder="মানবতার সেবায় নিয়োজিত"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">প্রতিষ্ঠানের ঠিকানা</label>
                <input
                  type="text"
                  value={settings.labels.organizationAddress || ''}
                  onChange={(e) => handleLabelChange('organizationAddress', e.target.value)}
                  placeholder="মৌলভী বাড়ি, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">ধন্যবাদ ও শুভেচ্ছা বার্তা</label>
                <input
                  type="text"
                  value={settings.labels.thankYouMessage || ''}
                  onChange={(e) => handleLabelChange('thankYouMessage', e.target.value)}
                  placeholder="ধন্যবাদসহ গ্রহণ করা হলো। আপনার অনুদান মানবতার কল্যাণে ব্যবহৃত হবে।"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">ডিসক্লেইমার / শর্তাবলী</label>
                <input
                  type="text"
                  value={settings.labels.disclaimerText || ''}
                  onChange={(e) => handleLabelChange('disclaimerText', e.target.value)}
                  placeholder="এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল রসিদ।"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Transparent PNG Signature Upload */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-gray-900 flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>অনুমোদনকারী স্বাক্ষর আপলোড (স্বচ্ছ ব্যাকগ্রাউন্ড PNG)</span>
              </span>
              <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                শুধুমাত্র PNG ফরম্যাট
              </span>
            </h4>

            {signatureError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{signatureError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  স্বাক্ষর ফাইল নির্বাচন করুন
                </label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-600 transition-colors bg-gray-50/50">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleSignatureUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <UploadCloud className="w-8 h-8 text-gray-400 mx-auto" />
                    <span className="text-xs font-semibold text-emerald-800 block">
                      স্বাক্ষর ছবি আপলোড করুন (.PNG)
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      স্বচ্ছ ব্যাকগ্রাউন্ডযুক্ত পিএনজি ফাইল নির্বাচন করুন (সর্বোচ্চ ২ MB)
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Preview & Controls */}
              <div className="p-3 bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center min-h-[120px] text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase mb-2">স্বাক্ষর প্রিভিউ</span>
                {settings.signatureImageUrl ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-white/80 rounded-lg border border-dashed border-gray-300 inline-block shadow-inner">
                      <img
                        src={settings.signatureImageUrl}
                        alt="অনুমোদিত স্বাক্ষর"
                        style={{ width: `${settings.signatureWidth || 140}px`, maxHeight: '50px' }}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>মুছে ফেলুন</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs italic">
                    কোনো স্বাক্ষর আপলোড করা হয়নি
                  </div>
                )}
              </div>
            </div>

            {/* Signature Width & Label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">স্বাক্ষরের নিচে পদবী / লেবেল</label>
                <input
                  type="text"
                  value={settings.labels.signatureLabel || ''}
                  onChange={(e) => handleLabelChange('signatureLabel', e.target.value)}
                  placeholder="আদায়কারী / অনুমোদিত স্বাক্ষর"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  স্বাক্ষরের প্রস্থ (Size): {settings.signatureWidth || 140}px
                </label>
                <input
                  type="range"
                  min="80"
                  max="220"
                  step="5"
                  value={settings.signatureWidth || 140}
                  onChange={(e) => setSettings({ ...settings, signatureWidth: Number(e.target.value) })}
                  className="w-full accent-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Field Visibility Toggles */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
              <Eye className="w-4 h-4 text-emerald-700" />
              <span>রসিদে ফিল্ড দৃশ্যমানতা (Field Visibility)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showAddress !== false}
                  onChange={() => handleVisibilityToggle('showAddress')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">সদস্যের ঠিকানা প্রদর্শন</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showPhone !== false}
                  onChange={() => handleVisibilityToggle('showPhone')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">মোবাইল নম্বর প্রদর্শন</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showDonorSerial !== false}
                  onChange={() => handleVisibilityToggle('showDonorSerial')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">সদস্য ক্রমিক নম্বর (#) প্রদর্শন</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showWordsAmount !== false}
                  onChange={() => handleVisibilityToggle('showWordsAmount')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">কথায় টাকার পরিমাণ প্রদর্শন</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showCollectorSignature !== false}
                  onChange={() => handleVisibilityToggle('showCollectorSignature')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">অনুমোদিত স্বাক্ষর অংশ প্রদর্শন</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showWatermark !== false}
                  onChange={() => handleVisibilityToggle('showWatermark')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">ব্যাকগ্রাউন্ড ওয়াটারমার্ক প্রদর্শন</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={settings.fieldVisibility.showDisclaimer !== false}
                  onChange={() => handleVisibilityToggle('showDisclaimer')}
                  className="accent-emerald-700 w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-800">ডিসক্লেইমার ও নোট প্রদর্শন</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-gray-500 font-semibold px-1">
              <span className="flex items-center gap-1.5 text-emerald-950">
                <Eye className="w-4 h-4 text-emerald-700" />
                <span>লাইভ রসিদ প্রিভিউ</span>
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200">
                নমুনা প্রিভিউ
              </span>
            </div>

            <div className="w-full transform scale-90 sm:scale-95 origin-top">
              <DonationReceiptCard
                receipt={sampleReceiptData}
                config={previewConfig}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
