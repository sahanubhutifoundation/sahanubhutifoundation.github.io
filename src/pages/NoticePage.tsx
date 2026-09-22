import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { storageService } from '../services/storageService';
import { Notice } from '../types';
import { Bell, Calendar, ArrowRight, AlertCircle, FileText } from 'lucide-react';

export const NoticePage: React.FC = () => {
  const { t, tMulti, isRTL } = useLanguage();
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const list = storageService.getNotices().filter((n) => n.isPublished);
    setNotices(list);
  }, []);

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <PageHero
        title={t('noticesTitle')}
        subtitle={t('noticesSubtitle')}
        breadcrumb={[{ label: t('navNotice') }]}
        tag="অফিসিয়াল নোটিশ বোর্ড"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {notices.length > 0 ? (
          <div className="space-y-4">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  notice.isImportant
                    ? 'border-[#2D5A41]/40 shadow-xs hover:border-[#2D5A41] bg-[#F7F5F0]'
                    : 'border-[#EBE8E0] shadow-2xs hover:border-[#D4CEBF] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[#7A877E] mb-2">
                  <div className="flex items-center gap-2">
                    {notice.isImportant && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-[11px] font-bold">
                        <AlertCircle className="w-3 h-3" />
                        <span>জরুরি বিজ্ঞপ্তি</span>
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[#A4B3A8]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{notice.date}</span>
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-[#2D3630] mb-2 leading-snug">
                  <Link
                    to={`/notice/${notice.id}`}
                    className="hover:text-[#2D5A41] transition-colors"
                  >
                    {tMulti(notice.title)}
                  </Link>
                </h2>

                <p className="text-xs sm:text-sm text-[#5C665F] line-clamp-3 leading-relaxed">
                  {tMulti(notice.body)}
                </p>

                <div className="pt-4 mt-4 border-t border-[#EBE8E0] flex items-center justify-between">
                  <Link
                    to={`/notice/${notice.id}`}
                    className="text-xs font-bold text-[#2D5A41] hover:text-[#234733] inline-flex items-center gap-1"
                  >
                    <span>সম্পূর্ণ নোটিশ পড়ুন</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                  </Link>

                  {notice.attachmentUrl && (
                    <span className="flex items-center gap-1 text-xs text-[#7A877E]">
                      <FileText className="w-3.5 h-3.5" />
                      <span>সংযুক্তি সংযুক্ত</span>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            message={t('emptyNotices')}
            subMessage="সহানুভূতি ফাউন্ডেশনের নতুন সিদ্ধান্ত, সভা বা সাধারণ বিজ্ঞপ্তি প্রকাশিত হলে এখানে প্রদর্শিত হবে।"
            icon={<Bell className="w-6 h-6 text-[#A4B3A8]" />}
          />
        )}
      </div>
    </div>
  );
};
