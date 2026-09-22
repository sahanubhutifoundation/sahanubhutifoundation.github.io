import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { storageService } from '../services/storageService';
import { Notice } from '../types';
import { Calendar, ArrowLeft, AlertCircle, FileText, ExternalLink } from 'lucide-react';

export const NoticeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, tMulti, isRTL } = useLanguage();
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const list = storageService.getNotices();
    const found = list.find((n) => n.id === id);
    if (found) {
      setNotice(found);
    }
  }, [id]);

  if (!notice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#2D3630]">নোটিশটি পাওয়া যায়নি</h2>
        <p className="text-[#7A877E] text-sm">অনুগ্রহ করে নোটিশ বোর্ডে ফিরে যান।</p>
        <Link
          to="/notice"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>নোটিশ বোর্ডে ফিরে যান</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={tMulti(notice.title)}
        subtitle="সহানুভূতি ফাউন্ডেশনের সাধারণ তথ্য ও বিজ্ঞপ্তি"
        breadcrumb={[
          { label: t('navNotice'), path: '/notice' },
          { label: tMulti(notice.title) },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#EBE8E0]">
          <Link
            to="/notice"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C665F] hover:text-[#2D3630] transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>সকল নোটিশে ফিরে যান</span>
          </Link>

          <span className="flex items-center gap-1.5 text-xs text-[#7A877E] font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#A4B3A8]" />
            <span>প্রকাশের তারিখ: {notice.date}</span>
          </span>
        </div>

        {notice.isImportant && (
          <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] flex items-center gap-2.5 text-[#2D3630] text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-[#2D5A41] shrink-0" />
            <span>এটি একটি অতীব জরুরি অফিশিয়াল নোটিশ।</span>
          </div>
        )}

        {/* Notice Body */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-2xs space-y-4">
          <div className="prose prose-stone max-w-none text-[#2D3630] text-base leading-relaxed whitespace-pre-line">
            {tMulti(notice.body)}
          </div>

          {notice.attachmentUrl && (
            <div className="pt-6 mt-6 border-t border-[#EBE8E0]">
              <a
                href={notice.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EBE8E0] border border-[#EBE8E0] text-xs font-semibold text-[#2D3630] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#2D5A41]" />
                <span>সংযুক্ত ফাইল ডাউনলোড / দেখুন</span>
                <ExternalLink className="w-3 h-3 text-[#7A877E]" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
