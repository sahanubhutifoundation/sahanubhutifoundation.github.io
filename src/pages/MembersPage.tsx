import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { DesignationBadge } from '../components/DesignationBadge';
import { storageService } from '../services/storageService';
import { Member, Designation } from '../types';
import { Users, User, ArrowRight, MapPin, HeartHandshake } from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const [members, setMembers] = useState<Member[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const config = storageService.getConfig();

  useEffect(() => {
    // Only active members sorted by serial
    const list = storageService.getMembers().filter((m) => m.isActive);
    setMembers(list);
    setDesignations(storageService.getDesignations());
  }, []);

  const getMemberDesignation = (member: Member): Designation | undefined => {
    if (member.designationId) {
      const found = designations.find((d) => d.id === member.designationId);
      if (found) return found;
    }
    if (member.role) {
      return designations.find(
        (d) =>
          d.name.bn === member.role ||
          d.name.en.toLowerCase() === member.role.toLowerCase() ||
          d.name.ar === member.role
      );
    }
    return undefined;
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      <PageHero
        title={t('membersPageTitle')}
        subtitle={t('membersSubtitle')}
        breadcrumb={[{ label: t('navMembers') }]}
        tag="পারিবারিক সদস্য তালিকা"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Call to Join notice banner */}
        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#F7F5F0] border border-[#EBE8E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <HeartHandshake className="w-5 h-5 text-[#2D5A41] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#2D3630]">
                {language === 'bn'
                  ? 'পরিবারের সকল সদস্যের প্রতি আন্তরিক আহ্বান'
                  : 'A Heartfelt Call to All Family Members'}
              </h3>
              <p className="text-xs sm:text-sm text-[#5C665F] mt-0.5 leading-relaxed">
                {language === 'bn'
                  ? 'আমাদের এই উদ্যোগকে আরও শক্তিশালী ও গতিশীল করতে পরিবারের যেকেউ সদস্য হিসেবে যুক্ত হতে যোগাযোগ করতে পারেন।'
                  : 'To strengthen and vitalize our cause, any family member is warmly encouraged to reach out and join.'}
              </p>
            </div>
          </div>
          <Link
            to="/contact"
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#2D5A41] hover:bg-[#234733] text-white transition-colors self-start sm:self-center shrink-0 shadow-2xs text-center"
          >
            সদস্য হতে যোগাযোগ করুন
          </Link>
        </div>

        {/* Member Cards Grid - Highly Responsive (1 col on small phones, 2 col on tablets, 3 col on laptops, 4 col on wide screens) */}
        {members.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {members.map((member) => {
              const designation = getMemberDesignation(member);
              const shape = member.imageShape || config.memberImageShape || 'circle';
              const shapeClass =
                shape === 'square'
                  ? 'rounded-xl'
                  : shape === 'rounded'
                  ? 'rounded-2xl'
                  : 'rounded-full';
              const fitClass = member.imageFit === 'contain' ? 'object-contain p-1' : 'object-cover';

              return (
                <Link
                  key={member.id}
                  to={`/members/${member.id}`}
                  className="bg-white rounded-2xl border border-[#EBE8E0] shadow-2xs hover:shadow-xs hover:border-[#2D5A41]/40 transition-all p-5 flex flex-col items-center text-center group relative overflow-hidden"
                >
                  {/* Serial Badge */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#F7F5F0] text-[#5C665F] text-[11px] font-mono font-bold group-hover:bg-[#E8EFEA] group-hover:text-[#2D5A41] transition-colors">
                    #{member.serial}
                  </div>

                  {/* Profile Photo */}
                  <div className={`w-20 h-20 sm:w-22 sm:h-22 ${shapeClass} mb-3.5 bg-[#F7F5F0] border-2 border-[#EBE8E0] group-hover:border-[#2D5A41]/40 transition-all overflow-hidden flex items-center justify-center text-[#A4B3A8] shrink-0`}>
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className={`w-full h-full ${fitClass} group-hover:scale-105 transition-transform duration-200`}
                        style={{ objectPosition: member.imagePosition || 'center' }}
                        loading="lazy"
                      />
                    ) : (
                      <User className="w-10 h-10 text-[#A4B3A8] group-hover:text-[#2D5A41] transition-colors" />
                    )}
                  </div>

                  {/* Member Name */}
                  <h2 className="text-base sm:text-lg font-bold text-[#2D3630] group-hover:text-[#2D5A41] transition-colors leading-snug break-words max-w-full">
                    {member.name}
                  </h2>

                  {/* Styled Designation Badge */}
                  {(designation || member.role) && (
                    <div className="mt-2 mb-1 flex items-center justify-center max-w-full">
                      <DesignationBadge
                        designation={designation}
                        roleFallback={member.role}
                        size="md"
                      />
                    </div>
                  )}

                  {/* Location / Address */}
                  {member.address && (
                    <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs text-[#7A877E] mt-2 max-w-full">
                      <MapPin className="w-3 h-3 text-[#A4B3A8] shrink-0" />
                      <span className="line-clamp-1">{member.address}</span>
                    </div>
                  )}

                  {/* Bio summary */}
                  {member.bio && (
                    <p className="text-xs text-[#5C665F] line-clamp-2 mt-2 leading-relaxed break-words">
                      {member.bio}
                    </p>
                  )}

                  {/* Card Footer Link */}
                  <div className="pt-3 mt-auto w-full flex items-center justify-between text-xs text-[#7A877E] group-hover:text-[#2D5A41] font-semibold transition-colors border-t border-[#EBE8E0]">
                    <span>{t('viewDetails')}</span>
                    <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            message={t('emptyMembers')}
            subMessage="সদস্য তালিকা বর্তমানে সংকলন করা হচ্ছে। অ্যাডমিন প্যানেল থেকে ক্রমানুসারে সদস্য যুক্ত করা যাবে।"
            icon={<Users className="w-6 h-6 text-[#A4B3A8]" />}
            actionText="যোগাযোগ ফর্ম পূরণ করুন"
            onAction={() => window.location.assign('/contact')}
          />
        )}
      </div>
    </div>
  );
};
