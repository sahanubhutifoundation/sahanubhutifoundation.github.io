import React from 'react';
import { Member } from '../types';
import { UnifiedContactLink, InstagramIcon } from './ContactIcons';

interface MemberSocialIconsProps {
  member: Member;
  size?: 'sm' | 'md';
  className?: string;
}

export const MemberSocialIcons: React.FC<MemberSocialIconsProps> = ({
  member,
  size = 'sm',
  className = '',
}) => {
  if (member.showSocials === false) return null;

  const facebook = member.facebook || member.socialLinks?.facebook;
  const instagram = member.instagram || member.socialLinks?.instagram;
  const whatsapp = member.whatsapp || member.socialLinks?.whatsapp;
  const imo = member.imo || member.socialLinks?.imo;
  const showPhone = member.phone && member.showPhone !== false;
  const showEmail = member.email && member.showEmail !== false;

  const hasSocials =
    (facebook && member.showFacebook !== false) ||
    (instagram && member.showInstagram !== false) ||
    (whatsapp && member.showWhatsapp !== false) ||
    (imo && member.showImo !== false) ||
    showPhone ||
    showEmail;

  if (!hasSocials) return null;

  const btnClass =
    size === 'sm'
      ? 'w-6 h-6 min-w-[24px] min-h-[24px] text-[10px]'
      : 'w-7 h-7 min-w-[28px] min-h-[28px] text-xs';

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 pt-1 max-w-full overflow-hidden ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Facebook */}
      {facebook && member.showFacebook !== false && (
        <a
          href={facebook.startsWith('http') ? facebook : `https://${facebook}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
          aria-label="Facebook Profile"
          className={`${btnClass} shrink-0 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-colors font-bold font-sans leading-none`}
        >
          f
        </a>
      )}

      {/* Instagram */}
      {instagram && member.showInstagram !== false && (
        <a
          href={instagram.startsWith('http') ? instagram : `https://${instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
          aria-label="Instagram Profile"
          className={`${btnClass} shrink-0 rounded-full bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C] hover:text-white flex items-center justify-center transition-colors font-bold font-sans leading-none`}
        >
          <InstagramIcon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </a>
      )}

      {/* WhatsApp */}
      {whatsapp && member.showWhatsapp !== false && (
        <UnifiedContactLink
          type="whatsapp"
          value={whatsapp}
          size={size}
          variant="circle"
        />
      )}

      {/* IMO */}
      {imo && member.showImo !== false && (
        <UnifiedContactLink
          type="imo"
          value={imo}
          size={size}
          variant="circle"
        />
      )}

      {/* Direct Phone */}
      {showPhone && (
        <UnifiedContactLink
          type="phone"
          value={member.phone || ''}
          size={size}
          variant="circle"
        />
      )}

      {/* Direct Email */}
      {showEmail && (
        <UnifiedContactLink
          type="email"
          value={member.email || ''}
          size={size}
          variant="circle"
        />
      )}
    </div>
  );
};

