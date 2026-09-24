import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { DesignationBadge } from '../components/DesignationBadge';
import { MemberAvatar } from '../components/MemberAvatar';
import { MemberSerialBadge } from '../components/MemberSerialBadge';
import { MemberSocialIcons } from '../components/MemberSocialIcons';
import { storageService } from '../services/storageService';
import { Member, Designation, FoundationConfig } from '../types';
import { User, ArrowLeft, Calendar, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';
import { toBengaliDigits } from '../utils/foundationHelpers';

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const [member, setMember] = useState<Member | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [config, setConfig] = useState<FoundationConfig>(() => storageService.getConfig());

  const loadData = () => {
    const list = storageService.getMembers();
    const found = list.find((m) => m.id === id);
    if (found) {
      setMember(found);
    }
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
  }, [id]);

  const memberDesignation = React.useMemo(() => {
    if (!member) return undefined;
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
  }, [member, designations]);

  if (!member) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#2D3630]">{t('memberNotFound')}</h2>
        <p className="text-[#7A877E] text-sm">{t('memberNotFoundHint')}</p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('backToMembers')}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      <PageHero
        title={member.name}
        subtitle={member.role || (language === 'bn' ? 'সহানুভূতি ফাউন্ডেশনের সম্মানিত সদস্য' : language === 'ar' ? 'عضو كريم في مؤسسة ساهانوبوتي' : 'Honorable Member of Sahanubhuti Foundation')}
        breadcrumb={[
          { label: t('navMembers'), path: '/members' },
          { label: member.name },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#EBE8E0]">
          <Link
            to="/members"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C665F] hover:text-[#2D3630] transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t('backToMembers')}</span>
          </Link>
        </div>

        {/* Member Profile Card */}
        <div className="relative p-5 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <MemberSerialBadge
            serial={member.serial}
            config={config}
            language={language}
          />
          <MemberAvatar
            member={member}
            config={config}
            size="xl"
            className="shadow-xs"
          />

          <div className="space-y-3.5 text-center sm:text-start flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('activeMember')}</span>
              </div>
              {(memberDesignation || member.role) && (
                <DesignationBadge
                  designation={memberDesignation}
                  roleFallback={member.role}
                  size="md"
                />
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#2D3630] break-words">{member.name}</h1>

            <MemberSocialIcons
              member={member}
              size="md"
              className="justify-center sm:justify-start !pt-0"
            />

            {member.bio && (
              <p className="text-xs sm:text-sm text-[#5C665F] leading-relaxed pt-1 break-words">
                {member.bio}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#EBE8E0] text-xs text-[#5C665F]">
              {member.joiningDate && member.showJoiningDate !== false && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#A4B3A8] shrink-0" />
                  <span>
                    {t('memberJoinDateLabel')}{' '}
                    {language === 'bn'
                      ? toBengaliDigits(member.joiningDate)
                      : member.joiningDate}
                  </span>
                </div>
              )}
              {member.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#A4B3A8] shrink-0" />
                  <span className="break-words">{member.address}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#A4B3A8] shrink-0" />
                  <a href={`mailto:${member.email}`} className="text-[#2D5A41] hover:underline truncate">
                    {member.email}
                  </a>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#A4B3A8] shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
