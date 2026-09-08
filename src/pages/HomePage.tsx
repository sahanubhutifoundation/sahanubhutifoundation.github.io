import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storageService';
import { Logo } from '../components/Logo';
import { FoundationLocationDisplay } from '../components/FoundationLocationDisplay';
import { formatFoundingDate } from '../utils/foundationHelpers';
import {
  FoundationConfig,
  Activity,
  Notice,
  Member,
  Designation,
  GalleryItem,
} from '../types';
import { DesignationBadge } from '../components/DesignationBadge';
import {
  Heart,
  ArrowRight,
  Calendar,
  Users,
  Wallet,
  ImageIcon,
  Bell,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Building,
  UserCheck,
  HeartHandshake,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, tMulti, language, isRTL } = useLanguage();
  const [config, setConfig] = useState<FoundationConfig>(storageService.getConfig());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const refreshData = () => {
      setConfig(storageService.getConfig());
      setActivities(storageService.getActivities().filter((a) => a.isPublished).slice(0, 3));
      setNotices(storageService.getNotices().filter((n) => n.isPublished).slice(0, 3));
      setMembers(storageService.getMembers().filter((m) => m.isActive).slice(0, 4));
      setDesignations(storageService.getDesignations());
      setGallery(storageService.getGalleryItems().filter((g) => g.isPublished).slice(0, 4));
    };

    refreshData();
    window.addEventListener('sf_config_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('sf_config_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F7F5F0] via-[#FDFCF9] to-[#FDFCF9] pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#EBE8E0]">
        {/* Soft decorative background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage: 'url(/assets/humanitarian-pattern.svg)',
            backgroundRepeat: 'repeat',
            backgroundSize: '150px 150px',
          }}
          aria-hidden="true"
        />

        {/* Ambient warm glows */}
        <div
          className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-[#E8EFEA]/50 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-20 w-96 h-96 rounded-full bg-[#F1EDE4]/60 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo in Hero */}
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-white rounded-2xl shadow-xs border border-[#EBE8E0] inline-flex items-center justify-center">
              <Logo size="xl" showText={false} location="hero" />
            </div>
          </div>

          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20 mb-4 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#2D5A41] animate-pulse" />
            <span>{tMulti(config.heroBadge) || t('heroBadge')}</span>
          </div>

          {/* Foundation Names */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#2D3630] tracking-tight leading-tight">
            {config.nameBn}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-[#5C665F] mt-2 tracking-normal">
            {config.nameEn}
          </p>

          {/* Thin decorative divider */}
          <div className="flex items-center justify-center gap-2 my-6">
            <div className="h-[2px] w-14 bg-[#2D5A41] rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#65B78A]" />
            <div className="h-[2px] w-14 bg-[#2D5A41] rounded-full" />
          </div>

          {/* Concise Humanitarian Message */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-[#4D5750] leading-relaxed font-normal px-4">
            {tMulti(config.heroMessage)}
          </p>

          {/* Subtitle / Description */}
          {Boolean(tMulti(config.heroSubtitle)) && (
            <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#7A877E] leading-relaxed mt-2.5 px-4">
              {tMulti(config.heroSubtitle)}
            </p>
          )}

          {/* Origin and Date subtitle */}
          {(config.locationDisplayMode !== 'hidden' || (config.showFoundingDate !== false && Boolean(config.foundedDate))) && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-[#7A877E] mt-5">
              {config.locationDisplayMode !== 'hidden' && (
                <FoundationLocationDisplay config={config} variant="inline" />
              )}
              {config.locationDisplayMode !== 'hidden' && config.showFoundingDate !== false && Boolean(config.foundedDate) && (
                <span className="text-[#C5BFB0]">•</span>
              )}
              {config.showFoundingDate !== false && Boolean(config.foundedDate) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#557B64] shrink-0" />
                  <span>{formatFoundingDate(config.foundedDate, language)}</span>
                </span>
              )}
            </div>
          )}

          {/* CTA Buttons - Fully Controlled by CMS */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <Link
              to={config.heroPrimaryCtaLink || '/about'}
              className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] shadow-xs hover:shadow-sm transition-all active:scale-98 inline-flex items-center gap-2"
            >
              <span>{tMulti(config.heroPrimaryCtaText) || t('heroCtaAbout')}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>

            <Link
              to={config.heroSecondaryCtaLink || '/activities'}
              className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm font-semibold text-[#2D3630] bg-white hover:bg-[#F7F5F0] border border-[#EBE8E0] hover:border-[#D4CEBF] shadow-2xs transition-all active:scale-98 inline-flex items-center gap-2"
            >
              <Heart className="w-4 h-4 text-[#2D5A41]" />
              <span>{tMulti(config.heroSecondaryCtaText) || t('heroCtaActivities')}</span>
            </Link>

            <Link
              to={config.heroContactCtaLink || '/contact'}
              className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm font-semibold text-[#2D3630] bg-[#F1EDE4] hover:bg-[#EBE8E0] transition-all active:scale-98 inline-flex items-center gap-2"
            >
              <span>{tMulti(config.heroContactCtaText) || t('heroCtaContact')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SHORT INTRODUCTION & PURPOSE - Synced with CMS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text summary */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#F1EDE4] text-[#2D3630] border border-[#EBE8E0]">
              <Building className="w-3.5 h-3.5 text-[#5C665F]" />
              <span>{t('sectionIntroductionTitle')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2D3630] leading-tight">
              {language === 'bn'
                ? 'পারিবারিক আন্তরিকতা থেকে শুরু হওয়া একটি সেবামূলক অঙ্গীকার'
                : 'A Welfare Pledge Originating From Family Kinship'}
            </h2>
            <div className="h-[2px] w-12 bg-[#2D5A41] rounded-full" />
            <p className="text-[#5C665F] text-sm sm:text-base leading-relaxed">
              {tMulti(config.homepageAboutSummary) ||
                tMulti(config.aboutSpeech) ||
                tMulti(config.familyInitiativeText) ||
                (language === 'bn'
                  ? 'সহানুভূতি ফাউন্ডেশন ফেনী সদর উপজেলার শর্শদী ইউনিয়নের ঐতিহ্যবাহী মৌলভী বাড়ির তরুণ সমাজের উদ্যোগে প্রতিষ্ঠিত। আমাদের মূল লক্ষ্য—একতাবদ্ধ থাকা, দুঃসময়ে পারস্পরিক পাশে দাঁড়ানো এবং সবার সহযোগিতায় ক্ষুদ্র পরিসরে হলেও নিয়মিত কল্যাণমূলক কাজ চালিয়ে যাওয়া।'
                  : 'Sahanubhuti Foundation was initiated by the young members of our family residing in Moulovi Bari, Sharshadi, Feni. Our primary commitment is maintaining unity, standing beside each other in times of distress, and sustaining benevolent community assistance within our humble means.')}
            </p>
            <p className="text-[#5C665F] text-sm sm:text-base leading-relaxed">
              {tMulti(config.baytulMalText) ||
                (language === 'bn'
                  ? 'প্রতি মাসে সদস্যদের ক্ষুদ্র ক্ষুদ্র সঞ্চয় একত্রিত করে আমরা ‘বাইতুল মাল’ শক্তিশালী করছি, যা আপৎকালীন যেকোনো প্রয়োজনে তাৎক্ষণিক পাশে দাঁড়াতে পারে।'
                  : 'Through small regular monthly savings from our members, we continue strengthening our "Baytul Mal" safety reserve.')}
            </p>

            <div className="pt-2">
              <Link
                to="/about"
                className="text-xs sm:text-sm font-semibold text-[#2D5A41] hover:text-[#234733] inline-flex items-center gap-1.5 group"
              >
                <span>{t('readMoreAbout') || (language === 'bn' ? 'আরও জানুন' : language === 'ar' ? 'اقرأ المزيد' : 'Read More')}</span>
                <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
              </Link>
            </div>
          </div>

          {/* Key Pillars Highlights */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2D3630]">
                  {language === 'bn' ? 'শতভাগ আর্থিক স্বচ্ছতা' : '100% Financial Transparency'}
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? 'তহবিলের প্রতিটি টাকা ও ব্যয়ের হিসাব সবার জন্য দৃশ্যমান ও উন্মুক্ত।'
                    : 'Every single penny received and spent is completely open.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41] shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2D3630]">
                  {language === 'bn' ? 'পারিবারিক বাইতুল মাল' : 'Family Baytul Mal'}
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? 'মাসিক ক্ষুদ্র সঞ্চয়ের মাধ্যমে আপৎকালীন বিপদে স্বজনদের সহায়তার স্থায়ী তহবিল।'
                    : 'Permanent safety fund built through small monthly member contributions.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#EBE8E0] shadow-2xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E8EFEA] border border-[#2D5A41]/20 flex items-center justify-center text-[#2D5A41] shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2D3630]">
                  {language === 'bn' ? 'বাস্তবধর্মী ও সততাপূর্ণ পথচলা' : 'Realistic & Sincere Journey'}
                </h3>
                <p className="text-xs text-[#7A877E] mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? 'কোনো অতিরঞ্জন বা অসত্য দাবি নয়; সামর্থ্য অনুযায়ী নিবেদিত সেবা।'
                    : 'No exaggerated claims; honest service true to our actual capacity.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FUND SNAPSHOT PREVIEW */}
      {config.showHomeFundSummary !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#18231B] text-[#D3DDD5] border border-[#28382C] shadow-md relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#2D5A41]/20 blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#28382C]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#223026] text-[#A4B3A8] border border-[#2D3E32] mb-2">
                  <Wallet className="w-3.5 h-3.5 text-[#65B78A]" />
                  <span>{t('sectionFundSnapshotTitle')}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FDFCF9]">
                  {t('fundDashboardTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-[#8A9B8F] mt-1 max-w-xl">
                  {t('fundSubtitle')}
                </p>
              </div>

              <Link
                to="/fund"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#2D5A41] hover:bg-[#234733] text-white transition-colors shrink-0 inline-flex items-center gap-2 self-start md:self-center"
              >
                <span>{t('viewDetails')}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
            </div>

            {/* Fund Transparency Principles Snapshot */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-[#202C23] border border-[#28382C] space-y-1.5">
                <div className="flex items-center gap-2 text-[#82CCA3] text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>মাসিক অঙ্গীকার ও বাইতুল মাল</span>
                </div>
                <p className="text-xs text-[#A4B3A8] leading-relaxed">
                  পরিবারের সদস্যদের নিয়মিত মাসিক অঙ্গীকারে গঠিত স্থায়ী বাইতুল মাল সঞ্চয়।
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#202C23] border border-[#28382C] space-y-1.5">
                <div className="flex items-center gap-2 text-[#82CCA3] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>জরুরি মানবিক ও চিকিৎসা সহায়তা</span>
                </div>
                <p className="text-xs text-[#A4B3A8] leading-relaxed">
                  পরিবারের সদস্য ও স্বজনদের জরুরি চিকিৎসা ও মানবিক প্রয়োজনে তাৎক্ষণিক পাশে থাকা।
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#202C23] border border-[#28382C] space-y-1.5">
                <div className="flex items-center gap-2 text-[#82CCA3] text-xs font-bold">
                  <Wallet className="w-4 h-4" />
                  <span>লাইভ গুগল শিট জবাবদিহিতা</span>
                </div>
                <p className="text-xs text-[#A4B3A8] leading-relaxed">
                  প্রতিটি জমা ও ব্যয়ের হিসাব সার্বক্ষণিক গুগল শিটের মাধ্যমে উন্মুক্ত ও যাচাইযোগ্য।
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. SELECTED ACTIVITIES PREVIEW */}
      {config.showHomeActivities !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
                {t('sectionActivitiesTitle')}
              </h2>
              <div className="h-[2px] w-10 bg-[#2D5A41] rounded-full mt-1.5" />
            </div>
            <Link
              to="/activities"
              className="text-xs sm:text-sm font-semibold text-[#2D5A41] hover:text-[#234733] inline-flex items-center gap-1 group"
            >
              <span>{t('viewAll')}</span>
              <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
            </Link>
          </div>

          {activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white rounded-xl border border-[#EBE8E0] hover:border-[#D4CEBF] shadow-2xs hover:shadow-xs transition-all p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#7A877E] mb-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#E8EFEA] text-[#2D5A41] font-semibold text-[11px]">
                        {act.category}
                      </span>
                      <span>{act.date}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#2D3630] mb-2 leading-snug">
                      {tMulti(act.title)}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5C665F] line-clamp-3 leading-relaxed">
                      {tMulti(act.summary)}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#EBE8E0] flex items-center justify-between">
                    <Link
                      to={`/activities/${act.slug || act.id}`}
                      className="text-xs font-bold text-[#2D5A41] hover:text-[#234733] inline-flex items-center gap-1"
                    >
                      <span>{t('viewDetails')}</span>
                      <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-xl border border-[#EBE8E0] text-center text-xs sm:text-sm text-[#7A877E]">
              {t('emptyActivities')}
            </div>
          )}
        </section>
      )}

      {/* 5. MEMBERS SNAPSHOT */}
      {config.showHomeMembersPreview !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#2D3630]">
                {t('sectionMembersTitle')}
              </h2>
              <div className="h-[2px] w-10 bg-[#2D5A41] rounded-full mt-1.5" />
            </div>
            <Link
              to="/members"
              className="text-xs sm:text-sm font-semibold text-[#2D5A41] hover:text-[#234733] inline-flex items-center gap-1 group"
            >
              <span>{t('viewAll')}</span>
              <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
            </Link>
          </div>

          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {members.map((member) => {
                const des = member.designationId
                  ? designations.find((d) => d.id === member.designationId)
                  : designations.find(
                      (d) =>
                        d.name.bn === member.role ||
                        d.name.en.toLowerCase() === (member.role || '').toLowerCase() ||
                        d.name.ar === member.role
                    );

                return (
                  <Link
                    key={member.id}
                    to={`/members/${member.id}`}
                    className="p-4 rounded-xl bg-white border border-[#EBE8E0] hover:border-[#2D5A41]/40 shadow-2xs hover:shadow-xs transition-all text-center group flex flex-col items-center"
                  >
                    {(() => {
                      const shape = member.imageShape || config.memberImageShape || 'circle';
                      const shapeClass =
                        shape === 'square'
                          ? 'rounded-lg'
                          : shape === 'rounded'
                          ? 'rounded-2xl'
                          : 'rounded-full';
                      return (
                        <div className={`w-16 h-16 ${shapeClass} mx-auto mb-3 bg-[#F7F5F0] border-2 border-[#EBE8E0] flex items-center justify-center text-[#7A877E] overflow-hidden shrink-0`}>
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: member.imagePosition || 'center' }}
                            />
                          ) : (
                            <Users className="w-7 h-7 text-[#A8B3AA] group-hover:text-[#2D5A41] transition-colors" />
                          )}
                        </div>
                      );
                    })()}
                    <div className="text-xs font-mono text-[#2D5A41] mb-0.5 font-bold">
                      #{member.serial}
                    </div>
                    <h3 className="text-sm font-bold text-[#2D3630] group-hover:text-[#2D5A41] transition-colors line-clamp-1">
                      {member.name}
                    </h3>
                    {(des || member.role) && (
                      <div className="mt-1.5 max-w-full">
                        <DesignationBadge
                          designation={des}
                          roleFallback={member.role}
                          size="sm"
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white border border-[#EBE8E0] text-center text-xs sm:text-sm text-[#7A877E] flex flex-col items-center justify-center gap-2">
              <Users className="w-8 h-8 text-[#A8B3AA]" />
              <p>{t('emptyMembers')}</p>
              <Link
                to="/members"
                className="text-xs font-semibold text-[#2D5A41] hover:underline"
              >
                সদস্য তালিকা ও সদস্য হওয়ার আহ্বান দেখুন
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 6. LATEST NOTICES & ANNOUNCEMENTS */}
      {config.showNoticeTicker !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#F7F5F0] border border-[#EBE8E0]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#2D5A41]" />
                <h2 className="text-lg sm:text-xl font-bold text-[#2D3630]">
                  {t('sectionNoticeTitle')}
                </h2>
              </div>
              <Link
                to="/notice"
                className="text-xs sm:text-sm font-semibold text-[#2D5A41] hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>

            {notices.length > 0 ? (
              <div className="space-y-3">
                {notices.map((not) => (
                  <Link
                    key={not.id}
                    to={`/notice/${not.id}`}
                    className="block p-4 rounded-xl bg-white border border-[#EBE8E0] hover:border-[#2D5A41]/40 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between text-xs text-[#7A877E] mb-1">
                      <span className="font-semibold text-[#2D5A41] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A41]" />
                        জরুরি ঘোষণা
                      </span>
                      <span>{not.date}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#2D3630] hover:text-[#2D5A41] transition-colors">
                      {tMulti(not.title)}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5C665F] line-clamp-2 mt-1">
                      {tMulti(not.body)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-white rounded-xl text-center text-xs text-[#7A877E]">
                {t('emptyNotices')}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 7. JOIN THE INITIATIVE CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#EBE8E0] shadow-xs text-center space-y-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-[#E8EFEA] border border-[#2D5A41]/20 mx-auto flex items-center justify-center text-[#2D5A41]">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#2D3630]">
            {language === 'bn' ? 'আমাদের উদ্যোগে আপনার অংশগ্রহণ প্রত্যাশিত' : 'Your Participation in Our Cause is Cherished'}
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#5C665F] leading-relaxed">
            {language === 'bn'
              ? 'আমরা চাই না পরিবারের কোনো সদস্য এই সুন্দর উদ্যোগের বাইরে থাকুক। সবার অংশগ্রহণে আমাদের এই বন্ধন আরও মজবুত হবে। যুক্ত হতে বা যেকোনো পরামর্শ দিতে আমাদের সাথে যোগাযোগ করুন।'
              : 'We warmly desire that no family member remains outside this noble endeavor. Collective participation strengthens our familial bonds. Connect with us to join or offer suggestions.'}
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#2D5A41] hover:bg-[#234733] shadow-xs hover:shadow-sm transition-all inline-flex items-center gap-2"
            >
              <Heart className="w-4 h-4" />
              <span>{t('heroCtaContact')}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
