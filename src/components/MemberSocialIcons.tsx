import React from 'react';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import { Member } from '../types';

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
      ? 'w-6 h-6 text-[10px]'
      : 'w-7 h-7 text-xs';

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-1.5 pt-1.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Facebook */}
      {facebook && member.showFacebook !== false && (
        <a
          href={facebook.startsWith('http') ? facebook : `https://${facebook}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
          className={`${btnClass} rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-colors font-bold font-sans`}
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
          className={`${btnClass} rounded-full bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C] hover:text-white flex items-center justify-center transition-colors font-bold font-sans`}
        >
          in
        </a>
      )}

      {/* WhatsApp */}
      {whatsapp && member.showWhatsapp !== false && (
        <a
          href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          className={`${btnClass} rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-colors`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </a>
      )}

      {/* Imo */}
      {imo && member.showImo !== false && (
        <a
          href={`tel:${imo}`}
          title="Imo"
          className={`${btnClass} rounded-full bg-[#00A4E4]/15 text-[#00A4E4] hover:bg-[#00A4E4] hover:text-white flex items-center justify-center transition-colors font-bold font-sans`}
        >
          imo
        </a>
      )}

      {/* Direct Phone */}
      {showPhone && !whatsapp && (
        <a
          href={`tel:${member.phone}`}
          title="Call"
          className={`${btnClass} rounded-full bg-[#2D5A41]/10 text-[#2D5A41] hover:bg-[#2D5A41] hover:text-white flex items-center justify-center transition-colors`}
        >
          <Phone className="w-3 h-3" />
        </a>
      )}

      {/* Direct Email */}
      {showEmail && (
        <a
          href={`mailto:${member.email}`}
          title="Email"
          className={`${btnClass} rounded-full bg-[#7A877E]/15 text-[#5C665F] hover:bg-[#2D5A41] hover:text-white flex items-center justify-center transition-colors`}
        >
          <Mail className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
