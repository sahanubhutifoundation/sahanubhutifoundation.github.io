import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { ActivityFallbackCover } from '../components/ActivityFallbackCover';
import { storageService } from '../services/storageService';
import { Activity } from '../types';
import { 
  Calendar, 
  Tag, 
  ArrowLeft, 
  ArrowRight, 
  Share2, 
  Check, 
  MapPin, 
  Users, 
  Target, 
  CheckCircle, 
  Wallet,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toBengaliDigits } from '../utils/foundationHelpers';

export const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, tMulti, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [prevActivity, setPrevActivity] = useState<Activity | null>(null);
  const [nextActivity, setNextActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const list = storageService.getActivities().filter((a) => a.isPublished);
    const index = list.findIndex((a) => a.id === id || a.slug === id);
    
    if (index !== -1) {
      const current = list[index];
      setActivity(current);
      setPrevActivity(index > 0 ? list[index - 1] : null);
      setNextActivity(index < list.length - 1 ? list[index + 1] : null);
    } else {
      // Fallback search including drafts for direct preview
      const fallbackList = storageService.getActivities();
      const item = fallbackList.find((a) => a.id === id || a.slug === id);
      setActivity(item || null);
      setPrevActivity(null);
      setNextActivity(null);
    }
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!activity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#2D3630]">কার্যক্রমটি খুঁজে পাওয়া যায়নি</h2>
        <p className="text-[#7A877E] text-sm">
          অনুরোধকৃত কার্যক্রমটি অপ্রকাশিত হতে পারে অথবা লিংকটি পরিবর্তিত হয়েছে।
        </p>
        <Link
          to="/activities"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>সকল কার্যক্রমে ফিরে যান</span>
        </Link>
      </div>
    );
  }

  const formattedDate = language === 'bn' ? toBengaliDigits(activity.date) : activity.date;
  const detailedStory = tMulti(activity.fullDescription || activity.description);
  const leadSummary = tMulti(activity.shortSummary || activity.summary);
  const purposeText = activity.purpose ? tMulti(activity.purpose) : '';
  const locationText = activity.location ? tMulti(activity.location) : '';
  const beneficiariesText = activity.beneficiaries ? tMulti(activity.beneficiaries) : '';
  const outcomesText = activity.outcomes ? tMulti(activity.outcomes) : '';

  const galleryList = Array.isArray(activity.galleryImages) && activity.galleryImages.length > 0
    ? activity.galleryImages
    : Array.isArray(activity.images) && activity.images.length > 0
    ? activity.images
    : [];

  return (
    <div className="space-y-8 sm:space-y-10 pb-20">
      <PageHero
        title={tMulti(activity.title)}
        breadcrumb={[
          { label: t('navActivities'), path: '/activities' },
          { label: tMulti(activity.title) },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation & Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
          <Link
            to="/activities"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C665F] hover:text-[#2D5A41] transition-colors group self-start"
          >
            <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            <span>সকল কার্যক্রমে ফিরে যান</span>
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap">
            {activity.category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-xs font-bold shadow-3xs">
                <Tag className="w-3 h-3" />
                <span>{activity.category}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs text-[#7A877E] px-2.5 py-1 rounded-full bg-[#F7F5F0] border border-[#EBE8E0]">
              <Calendar className="w-3.5 h-3.5 text-[#A4B3A8]" />
              <span>{formattedDate}</span>
            </span>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#EBE8E0] bg-white text-[#5C665F] hover:bg-[#F7F5F0] text-xs font-semibold shadow-3xs transition-colors"
              title="লিংক কপি করুন"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span className="text-[#2D5A41] font-bold">কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>শেয়ার</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-[#EBE8E0] bg-[#F7F5F0] max-h-[460px] relative">
          {activity.coverImage ? (
            <img
              src={activity.coverImage}
              alt={tMulti(activity.title)}
              className="w-full h-full object-cover max-h-[460px]"
            />
          ) : (
            <div className="h-64 sm:h-80 w-full">
              <ActivityFallbackCover category={activity.category} />
            </div>
          )}
        </div>

        {/* Highlight Metadata Grid (Location, Beneficiaries, Purpose) */}
        {(locationText || beneficiariesText || purposeText) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {purposeText && (
              <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] shadow-3xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A41]">
                  <Target className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>উদ্দেশ্য ও প্রেক্ষাপট</span>
                </div>
                <p className="text-xs text-[#5C665F] leading-relaxed">{purposeText}</p>
              </div>
            )}

            {locationText && (
              <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] shadow-3xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A41]">
                  <MapPin className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>কার্যক্রমের স্থান</span>
                </div>
                <p className="text-xs text-[#5C665F] leading-relaxed">{locationText}</p>
              </div>
            )}

            {beneficiariesText && (
              <div className="p-3.5 rounded-xl bg-white border border-[#EBE8E0] shadow-3xs space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A41]">
                  <Users className="w-3.5 h-3.5 text-[#2D5A41]" />
                  <span>সুবিধাভোগী</span>
                </div>
                <p className="text-xs text-[#5C665F] leading-relaxed">{beneficiariesText}</p>
              </div>
            )}
          </div>
        )}

        {/* Detailed Editorial Content */}
        <article className="bg-white p-6 sm:p-10 rounded-2xl border border-[#EBE8E0] shadow-2xs space-y-6 text-[#2D3630]">
          {/* Optional Short Summary / Lead Quote if toggled on */}
          {activity.showShortSummaryInDetail && leadSummary && (
            <div className="p-4 rounded-xl bg-[#F7F5F0] border-l-4 border-[#2D5A41] text-xs sm:text-sm italic font-medium text-[#2D3630] leading-relaxed">
              "{leadSummary}"
            </div>
          )}

          <div className="text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
            {detailedStory}
          </div>

          {/* Key Outcomes / Results Block */}
          {outcomesText && (
            <div className="p-4 sm:p-5 rounded-xl bg-[#E8EFEA]/60 border border-[#2D5A41]/20 space-y-2 mt-6">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#2D5A41]">
                <CheckCircle className="w-4 h-4 text-[#2D5A41]" />
                <span>অর্জন ও ফলাফল (Key Outcomes)</span>
              </div>
              <p className="text-xs sm:text-sm text-[#2D3630] leading-relaxed">
                {outcomesText}
              </p>
            </div>
          )}
        </article>

        {/* Financial Transparency Link / Record if linked */}
        {(activity.financialRecord || activity.linkedExpenseId) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBE8E0] shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E8EFEA] text-[#2D5A41] shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#2D3630]">
                  তহবিল ও ব্যয় স্বচ্ছতা রেকর্ড
                </h4>
                <p className="text-[11px] text-[#7A877E] mt-0.5">
                  এই কার্যক্রমের যাবতীয় ব্যয় ভাউচার ও নিরীক্ষিত অডিট রেকর্ড ওপেন ট্রেইল লেজারে অন্তর্ভুক্ত।
                </p>
              </div>
            </div>

            <Link
              to="/transparency"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#2D5A41] text-[#2D5A41] hover:bg-[#E8EFEA] text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
            >
              <span>ব্যয় বিবরণী দেখুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Photo Gallery if attached */}
        {galleryList.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm sm:text-base font-bold text-[#2D3630]">
              কার্যক্রমের স্থিরচিত্র (Photo Gallery)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleryList.map((imgUrl, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-[#EBE8E0] bg-[#F7F5F0] h-48 shadow-3xs">
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous & Next Activity Navigation Links */}
        <div className="pt-6 border-t border-[#EBE8E0]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevActivity ? (
              <Link
                to={`/activities/${prevActivity.slug || prevActivity.id}`}
                className="p-4 rounded-xl bg-white border border-[#EBE8E0] hover:border-[#2D5A41] shadow-3xs hover:shadow-2xs transition-all flex items-center gap-3 group text-left"
              >
                <div className="p-2 rounded-lg bg-[#F7F5F0] group-hover:bg-[#E8EFEA] text-[#5C665F] group-hover:text-[#2D5A41] transition-colors shrink-0">
                  <ChevronLeft className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-[#7A877E] block">
                    পূর্ববর্তী কার্যক্রম
                  </span>
                  <strong className="text-xs text-[#2D3630] group-hover:text-[#2D5A41] transition-colors block truncate">
                    {tMulti(prevActivity.title)}
                  </strong>
                </div>
              </Link>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#EBE8E0] text-center text-xs text-[#A4B3A8]">
                কোনো পূর্ববর্তী কার্যক্রম নেই
              </div>
            )}

            {nextActivity ? (
              <Link
                to={`/activities/${nextActivity.slug || nextActivity.id}`}
                className="p-4 rounded-xl bg-white border border-[#EBE8E0] hover:border-[#2D5A41] shadow-3xs hover:shadow-2xs transition-all flex items-center justify-between gap-3 group text-right"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-[#7A877E] block">
                    পরবর্তী কার্যক্রম
                  </span>
                  <strong className="text-xs text-[#2D3630] group-hover:text-[#2D5A41] transition-colors block truncate">
                    {tMulti(nextActivity.title)}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-[#F7F5F0] group-hover:bg-[#E8EFEA] text-[#5C665F] group-hover:text-[#2D5A41] transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#EBE8E0] text-center text-xs text-[#A4B3A8]">
                কোনো পরবর্তী কার্যক্রম নেই
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
