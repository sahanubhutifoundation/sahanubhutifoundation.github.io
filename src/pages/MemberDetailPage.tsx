import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PageHero } from '../components/PageHero';
import { DesignationBadge } from '../components/DesignationBadge';
import { storageService } from '../services/storageService';
import { Member, Designation } from '../types';
import { User, ArrowLeft, Calendar, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, isRTL } = useLanguage();
  const [member, setMember] = useState<Member | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);

  useEffect(() => {
    const list = storageService.getMembers();
    const found = list.find((m) => m.id === id);
    if (found) {
      setMember(found);
    }
    setDesignations(storageService.getDesignations());
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
        <h2 className="text-xl font-bold text-[#2D3630]">সদস্যের তথ্য পাওয়া যায়নি</h2>
        <p className="text-[#7A877E] text-sm">অনুগ্রহ করে সদস্য তালিকায় ফিরে যান।</p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D5A41] hover:bg-[#234733] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>সদস্য তালিকায় ফিরে যান</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      <PageHero
        title={member.name}
        subtitle={member.role || 'সহানুভূতি ফাউন্ডেশনের সম্মানিত সদস্য'}
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
            <span>সদস্য তালিকায় ফিরে যান</span>
          </Link>
          <span className="px-3 py-1 rounded-full bg-[#E8EFEA] text-[#2D5A41] text-xs font-bold font-mono">
            ক্রমিক নং #{member.serial}
          </span>
        </div>

        {/* Member Profile Card */}
        <div className="p-5 sm:p-8 rounded-2xl bg-white border border-[#EBE8E0] shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {(() => {
            const config = storageService.getConfig();
            const shape = member.imageShape || config.memberImageShape || 'rounded';
            const shapeClass =
              shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-xl' : 'rounded-2xl';
            return (
              <div className={`w-28 h-28 sm:w-36 sm:h-36 ${shapeClass} bg-[#F7F5F0] border-2 border-[#EBE8E0] overflow-hidden shrink-0 flex items-center justify-center text-[#A4B3A8] shadow-xs`}>
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: member.imagePosition || 'center' }}
                  />
                ) : (
                  <User className="w-16 h-16 text-[#A4B3A8]" />
                )}
              </div>
            );
          })()}

          <div className="space-y-3.5 text-center sm:text-start flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8EFEA] text-[#2D5A41] border border-[#2D5A41]/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>সক্রিয় সদস্য</span>
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

            {member.bio && (
              <p className="text-xs sm:text-sm text-[#5C665F] leading-relaxed pt-1 break-words">
                {member.bio}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#EBE8E0] text-xs text-[#5C665F]">
              {member.joiningDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#A4B3A8] shrink-0" />
                  <span>যোগদান: {member.joiningDate}</span>
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
