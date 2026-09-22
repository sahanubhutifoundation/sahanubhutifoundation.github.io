import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { EmptyState } from '../components/EmptyState';
import { DesignationBadge } from '../components/DesignationBadge';
import { MemberAvatar } from '../components/MemberAvatar';
import { MemberSerialBadge } from '../components/MemberSerialBadge';
import { MemberSocialIcons } from '../components/MemberSocialIcons';
import { storageService } from '../services/storageService';
import { Member, Designation } from '../types';
import { Users, User, ArrowRight, MapPin, HeartHandshake, Calendar } from 'lucide-react';
import { toBengaliDigits, formatFoundingDate } from '../utils/foundationHelpers';

export const MembersPage: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const [members, setMembers] = useState<Member[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [config, setConfig] = useState(() => storageService.getConfig());

  const loadData = () => {
    const list = storageService.getMembers().filter((m) => m.isActive);
    setMembers(list);
    setDesignations(storageService.getDesignations());
    setConfig(storageService.getConfig());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('sf_data_updated', loadData);
    window.addEventListener('sf_config_updated', loadData);
    window.addEventListener('sf_cloud_synced', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('sf_data_updated', loadData);
      window.removeEventListener('sf_config_updated', loadData);
      window.removeEventListener('sf_cloud_synced', loadData);
      window.removeEventListener('storage', loadData);
    };
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

        {/* Member Cards Grid - Highly Responsive */}
        {members.length > 0 ? (
          (() => {
            const desktopCols = config.membersPageGrid?.desktopCols || 4;
            const mobileCols = config.membersPageGrid?.mobileCols || 2;
            const mobileClass = mobileCols === 1 ? 'grid-cols-1' : mobileCols === 3 ? 'grid-cols-3' : 'grid-cols-2';
            const tabletClass = desktopCols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
            const desktopClass =
              desktopCols === 2
                ? 'lg:grid-cols-2'
                : desktopCols === 3
                ? 'lg:grid-cols-3'
                : desktopCols === 5
                ? 'lg:grid-cols-5'
                : desktopCols === 6
                ? 'lg:grid-cols-6'
                : 'lg:grid-cols-4';

            return (
              <div className={`grid ${mobileClass} ${tabletClass} ${desktopClass} gap-3 sm:gap-4 lg:gap-5`}>
                {members.map((member) => {
                  const designation = getMemberDesignation(member);

                  return (
                    <div
                      key={member.id}
                      className="bg-white rounded-2xl border border-[#EBE8E0] shadow-2xs hover:shadow-xs hover:border-[#2D5A41]/40 transition-all p-4 sm:p-5 flex flex-col items-center text-center group relative overflow-hidden"
                    >
                      <Link
                        to={`/members/${member.id}`}
                        className="flex flex-col items-center w-full focus:outline-hidden text-center"
                      >
                        {/* Refined Serial Indicator Badge */}
                        <MemberSerialBadge
                          serial={member.serial}
                          config={config}
                          language={language}
                        />

                        {/* Profile Photo with Crop and Custom Shape */}
                        <MemberAvatar
                          member={member}
                          config={config}
                          size="lg"
                          className="mb-3 mt-1"
                        />

                        {/* Member Name */}
                        <h2 className="text-sm sm:text-base font-bold text-[#2D3630] group-hover:text-[#2D5A41] transition-colors leading-snug break-words max-w-full">
                          {member.name}
                        </h2>

                        {/* Styled Designation Badge */}
                        {(designation || member.role) && (
                          <div className="mt-1.5 mb-1 flex items-center justify-center max-w-full">
                            <DesignationBadge
                              designation={designation}
                              roleFallback={member.role}
                              size="md"
                            />
                          </div>
                        )}
                      </Link>

                      {/* Member Social Icons - separate from Link */}
                      <div className="my-1 relative z-10 w-full flex justify-center">
                        <MemberSocialIcons
                          member={member}
                          size="sm"
                        />
                      </div>

                      <Link
                        to={`/members/${member.id}`}
                        className="flex flex-col items-center w-full focus:outline-hidden text-center mt-auto"
                      >
                        {/* Join Date (if set and enabled) */}
                        {member.joiningDate && member.showJoiningDate !== false && (
                          <div className="flex items-center justify-center gap-1 text-[11px] text-[#7A877E] mt-1 max-w-full">
                            <Calendar className="w-3 h-3 text-[#A4B3A8] shrink-0" />
                            <span>
                              {language === 'bn'
                                ? `সদস্য: ${toBengaliDigits(member.joiningDate)}`
                                : `Member since: ${member.joiningDate}`}
                            </span>
                          </div>
                        )}

                        {/* Location / Address */}
                        {member.address && (
                          <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs text-[#7A877E] mt-1 max-w-full">
                            <MapPin className="w-3 h-3 text-[#A4B3A8] shrink-0" />
                            <span className="line-clamp-1">{member.address}</span>
                          </div>
                        )}

                        {/* Bio summary */}
                        {member.bio && (
                          <p className="text-xs text-[#5C665F] line-clamp-2 mt-1.5 leading-relaxed break-words">
                            {member.bio}
                          </p>
                        )}

                        {/* Card Footer Link */}
                        <div className="pt-3 mt-3 w-full flex items-center justify-between text-xs text-[#7A877E] group-hover:text-[#2D5A41] font-semibold transition-colors border-t border-[#EBE8E0]">
                          <span>{t('viewDetails')}</span>
                          <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            );
          })()
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
