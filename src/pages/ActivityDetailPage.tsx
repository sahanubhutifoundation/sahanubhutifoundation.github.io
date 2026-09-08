import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { storageService } from '../services/storageService';
import { Activity } from '../types';
import { Calendar, Tag, ArrowLeft, ArrowRight, Share2, Check } from 'lucide-react';

export const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, tMulti, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const list = storageService.getActivities();
    const item = list.find((a) => a.id === id || a.slug === id);
    if (item) {
      setActivity(item);
    }
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!activity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#2D3630]">কার্যক্রমটি পাওয়া যায়নি</h2>
        <p className="text-[#7A877E] text-sm">অনুগ্রহ করে কার্যক্রম তালিকায় ফিরে যান।</p>
        <Link
          to="/activities"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>তালিকায় ফিরে যান</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={tMulti(activity.title)}
        subtitle={tMulti(activity.summary)}
        breadcrumb={[
          { label: t('navActivities'), path: '/activities' },
          { label: tMulti(activity.title) },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Back and Meta bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EBE8E0]">
          <Link
            to="/activities"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C665F] hover:text-[#2D3630] transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>সকল কার্যক্রমে ফিরে যান</span>
          </Link>

          <div className="flex items-center gap-3">
            {activity.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E8EFEA] text-[#2D5A41] text-xs font-semibold">
                <Tag className="w-3 h-3" />
                <span>{activity.category}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-[#7A877E]">
              <Calendar className="w-3.5 h-3.5 text-[#A4B3A8]" />
              <span>{activity.date}</span>
            </span>

            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg border border-[#EBE8E0] text-[#5C665F] hover:bg-[#F7F5F0] text-xs inline-flex items-center gap-1"
              title="লিংক কপি করুন"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#2D5A41]" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Cover Image */}
        {activity.coverImage && (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-[#EBE8E0] bg-[#F7F5F0] max-h-96">
            <img
              src={activity.coverImage}
              alt={tMulti(activity.title)}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Detailed Content */}
        <article className="prose prose-stone max-w-none text-[#2D3630] text-base leading-relaxed space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-[#EBE8E0] shadow-2xs">
          <p className="whitespace-pre-line leading-relaxed">
            {tMulti(activity.description)}
          </p>
        </article>

        {/* Additional Gallery if attached */}
        {activity.images && activity.images.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-base font-bold text-[#2D3630]">কার্যক্রমের স্থিরচিত্র</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activity.images.map((imgUrl, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-[#EBE8E0] bg-[#F7F5F0] h-48">
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
