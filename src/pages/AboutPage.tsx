import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { FoundationLocationDisplay } from '../components/FoundationLocationDisplay';
import { formatFoundingDate } from '../utils/foundationHelpers';
import { storageService } from '../services/storageService';
import { FoundationConfig } from '../types';
import {
  Heart,
  Target,
  Compass,
  Lightbulb,
  ShieldCheck,
  Building,
  Quote,
  Calendar,
  MapPin,
  Coins,
  CheckCircle2,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { t, tMulti, language } = useLanguage();
  const [config, setConfig] = useState<FoundationConfig>(storageService.getConfig());

  useEffect(() => {
    const update = () => {
      setConfig(storageService.getConfig());
    };
    update();
    window.addEventListener('sf_config_updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('sf_config_updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Page Hero */}
      <PageHero
        title={t('navAbout')}
        subtitle={
          language === 'bn'
            ? 'ফেনীর শর্শদী ইউনিয়নের মৌলভী বাড়ি থেকে শুরু হওয়া একতা, সহমর্মিতা ও মানবিক দায়িত্বের ইতিবৃত্ত।'
            : 'The genesis of unity, empathy, and humanitarian responsibility originating from Moulovi Bari, Sharshadi, Feni.'
        }
        breadcrumb={[{ label: t('navAbout') }]}
        tag="পারিবারিক মানবিক উদ্যোগ"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* 1. CENTRAL AUTHENTIC PRESENTATION SPEECH */}
        <section className="p-6 sm:p-10 rounded-2xl bg-white border border-[#EBE8E0] shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#EBE8E0]">
            <div className="w-10 h-10 rounded-xl bg-[#E8EFEA] border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41]">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2D3630]">
                {language === 'bn' ? 'ফাউন্ডেশনের উদ্বোধনী বার্তা' : 'Inaugural Address of the Foundation'}
              </h2>
              <p className="text-xs text-[#7A877E]">
                {language === 'bn'
                  ? 'উপস্থাপকের আন্তরিক আহ্বান ও যাত্রার পটভূমি'
                  : 'Sincere Call & Journey Context by the Presenter'}
              </p>
            </div>
          </div>

          {/* Formatted Speech Paragraphs */}
          <div className="prose prose-stone max-w-none text-[#5C665F] text-sm sm:text-base leading-relaxed space-y-4">
            {tMulti(config.aboutSpeech)
              .split('\n\n')
              .map((para, idx) => (
                <p key={idx} className="whitespace-pre-line text-[#5C665F] leading-relaxed">
                  {para}
                </p>
              ))}
          </div>
        </section>

        {/* Optional About Supporting Image */}
        {config.aboutImage && (
          <section className="rounded-2xl overflow-hidden border border-[#EBE8E0] shadow-2xs">
            <img
              src={config.aboutImage}
              alt="About Sahanubhuti Foundation"
              className="w-full h-64 sm:h-80 md:h-96 object-cover"
            />
          </section>
        )}

        {/* 2. আমাদের শুরু (OUR BEGINNING) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20 flex items-center justify-center font-bold text-sm">
              <Building className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
              {t('aboutStartTitle')}
            </h2>
          </div>
          <div className="h-[2px] w-12 bg-[#2D5A41] rounded-full" />
          <div className="p-6 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] space-y-3 text-[#5C665F] text-sm sm:text-base leading-relaxed">
            <p>
              {tMulti(config.familyInitiativeText) ||
                (language === 'bn'
                  ? 'সহানুভূতি ফাউন্ডেশনের বীজ রোপিত হয়েছিল মৌলভী বাড়ি, মোহাম্মদ আলী বাজারের কাছে, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশে। ২০২৪ সালের ২৮ নভেম্বর আনুষ্ঠানিক পথচলা শুরু হলেও পারিবারিক তরুণদের এই সংকল্প গত প্রায় এক-দেড় বছর ধরে নিভৃতে ও নিরবচ্ছিন্নভাবে অগ্রসর হচ্ছে।'
                  : 'The seed of Sahanubhuti Foundation was planted at Moulovi Bari, near Mohammad Ali Bazar, Sharshadi, Feni Sadar, Feni, Bangladesh. While officially founded on 28 November 2024, this resolution has been progressing quietly and steadily for nearly a year and a half.')}
            </p>
            {((config.locationDisplayMode !== 'hidden') || (config.showFoundingDate !== false && Boolean(config.foundedDate))) && (
              <div
                className={`grid gap-3 pt-2 text-xs font-medium text-[#5C665F] ${
                  config.locationDisplayMode !== 'hidden' && config.showFoundingDate !== false && Boolean(config.foundedDate)
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {config.locationDisplayMode !== 'hidden' && (
                  <FoundationLocationDisplay config={config} variant="card" />
                )}
                {config.showFoundingDate !== false && Boolean(config.foundedDate) && (
                  <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-[#EBE8E0]">
                    <Calendar className="w-4 h-4 text-[#557B64] shrink-0" />
                    <span>{formatFoundingDate(config.foundedDate, language)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 3. আমাদের উদ্দেশ্য (OUR PURPOSE) & বাইতুল মাল */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20 flex items-center justify-center font-bold text-sm">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
              {t('aboutPurposeTitle')}
            </h2>
          </div>
          <div className="h-[2px] w-12 bg-[#2D5A41] rounded-full" />
          <div className="p-6 rounded-xl bg-white border border-[#EBE8E0] space-y-4 text-[#5C665F] text-sm sm:text-base leading-relaxed shadow-2xs">
            <p>{tMulti(config.mission)}</p>

            {/* Baytul Mal Focus Box */}
            <div className="mt-4 p-5 rounded-xl bg-[#E8EFEA] border border-[#2D5A41]/20 space-y-2">
              <div className="flex items-center gap-2 text-[#1E3E2D] font-bold text-base">
                <Coins className="w-5 h-5 text-[#2D5A41]" />
                <h3>{t('aboutBaytulMalTitle')}</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#2D3630] leading-relaxed">
                {tMulti(config.baytulMalText) ||
                  (language === 'bn'
                    ? 'আমাদের এই সংগঠনের সবচেয়ে গুরুত্বপূর্ণ বুনিয়াদ হলো ‘বাইতুল মাল’। প্রতি মাসে সদস্যরা যে সামান্য কিছু অর্থ এখানে জমা দেন, তা কোনো ছোট বিষয় নয়। দিনশেষে এই সঞ্চিত অংশটুকুই বিপদগ্রস্ত কোনো মানুষের পাশে দাঁড়াতে কিংবা বড় কোনো সংকট উত্তরণে সর্বাধিক ভূমিকা রাখে।'
                    : 'The most pivotal pillar of our organization is the "Baytul Mal". The modest monthly contributions members deposit here carry immense collective power, standing ready as a dedicated safety net for those confronting distress or emergency.')}
              </p>
            </div>
          </div>
        </section>

        {/* 4. আমাদের মূল্যবোধ (OUR VALUES) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20 flex items-center justify-center font-bold text-sm">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
              {t('aboutValuesTitle')}
            </h2>
          </div>
          <div className="h-[2px] w-12 bg-[#2D5A41] rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tMulti(config.values)
              .split('\n')
              .filter(Boolean)
              .map((val, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#2D5A41] shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-[#2D3630]">{val}</span>
                </div>
              ))}
          </div>
        </section>

        {/* 5. আমাদের ভবিষ্যৎ ভাবনা (OUR FUTURE VISION) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20 flex items-center justify-center font-bold text-sm">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
              {t('aboutFutureTitle')}
            </h2>
          </div>
          <div className="h-[2px] w-12 bg-[#2D5A41] rounded-full" />
          <div className="p-6 rounded-xl bg-[#18231B] text-[#D3DDD5] border border-[#28382C] space-y-4 shadow-sm">
            <p className="text-[#8A9B8F] text-sm sm:text-base leading-relaxed">
              {tMulti(config.vision)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-[#D3DDD5]">
              {tMulti(config.futurePlans)
                .split('\n')
                .filter(Boolean)
                .map((plan, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-[#202C23] rounded-lg border border-[#28382C]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#65B78A] shrink-0" />
                    <span>{plan}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
