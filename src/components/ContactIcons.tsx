import React from 'react';
import { Phone, Mail, Instagram } from 'lucide-react';

/**
 * Recognizable Official WhatsApp Vector Icon
 * Uses the authentic speech-bubble handset silhouette
 */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

/**
 * Recognizable Official IMO Vector Icon
 * Uses the authentic IMO speech-bubble mark with distinctive lowercase 'imo' lettering.
 * Never misrepresents generic chat bubbles as IMO.
 */
export const ImoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {/* Authentic IMO bubble silhouette with signature pointer */}
    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.95.56 3.77 1.53 5.31L2.2 21.4a.65.65 0 0 0 .8.8l4.09-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm-5.75 6.5a.85.85 0 1 1 0-1.7.85.85 0 0 1 0 1.7Zm-.75 2.15c0-.47.38-.85.85-.85s.85.38.85.85v4.5a.85.85 0 0 1-1.7 0v-4.5Zm3.9-.85c.47 0 .85.38.85.85v.3c.33-.35.8-.55 1.35-.55.65 0 1.25.35 1.55.85.35-.5.95-.85 1.65-.85 1.05 0 1.85.8 1.85 1.95v2.8a.85.85 0 0 1-1.7 0v-2.6c0-.4-.3-.7-.7-.7s-.7.3-.7.7v2.6a.85.85 0 0 1-1.7 0v-2.6c0-.4-.3-.7-.7-.7s-.7.3-.7.7v2.6a.85.85 0 0 1-1.7 0v-4.5c0-.47.38-.85.85-.85Zm8.5-.15c1.45 0 2.6 1.15 2.6 2.6s-1.15 2.6-2.6 2.6-2.6-1.15-2.6-2.6 1.15-2.6 2.6-2.6Zm0 1.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" />
  </svg>
);

/**
 * Recognizable Phone Call Icon
 */
export const PhoneCallIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <Phone className={className} aria-hidden="true" />
);

/**
 * Recognizable Email Envelope Icon
 */
export const EmailEnvelopeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <Mail className={className} aria-hidden="true" />
);

/**
 * Recognizable Official Instagram Vector Icon
 * Uses the authentic Instagram brand mark from the project's lucide-react icon library.
 */
export const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <Instagram className={className} aria-hidden="true" focusable="false" />
);

export type ContactChannelType = 'whatsapp' | 'imo' | 'phone' | 'email' | 'instagram';

interface UnifiedContactLinkProps {
  type: ContactChannelType;
  value: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'rounded' | 'card';
  className?: string;
  showText?: boolean;
}

/**
 * Unified, reusable contact link component ensuring consistent recognition,
 * sizing, accessible attributes, and interaction behavior across the application.
 */
export const UnifiedContactLink: React.FC<UnifiedContactLinkProps> = ({
  type,
  value,
  label,
  size = 'md',
  variant = 'circle',
  className = '',
  showText = false,
}) => {
  if (!value || !value.trim()) return null;
  const cleanValue = value.trim();

  let href = '';
  let title = label || '';
  let ariaLabel = '';
  let IconComponent: React.FC<{ className?: string }> = PhoneCallIcon;
  let brandBg = '';
  let brandHover = '';
  let brandText = '';

  switch (type) {
    case 'whatsapp': {
      const numeric = cleanValue.replace(/[^0-9]/g, '');
      href = `https://wa.me/${numeric}`;
      title = label || `WhatsApp: ${cleanValue}`;
      ariaLabel = `Send WhatsApp message to ${cleanValue}`;
      IconComponent = WhatsAppIcon;
      brandBg = 'bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/20';
      brandHover = 'hover:bg-[#25D366] hover:text-white';
      brandText = 'text-[#25D366]';
      break;
    }
    case 'imo': {
      href = `tel:${cleanValue}`;
      title = label || `IMO: ${cleanValue}`;
      ariaLabel = `Call IMO at ${cleanValue}`;
      IconComponent = ImoIcon;
      brandBg = 'bg-[#00A4E4]/15 text-[#00A4E4] hover:bg-[#00A4E4] hover:text-white border-[#00A4E4]/20';
      brandHover = 'hover:bg-[#00A4E4] hover:text-white';
      brandText = 'text-[#00A4E4]';
      break;
    }
    case 'phone': {
      href = `tel:${cleanValue}`;
      title = label || `Call: ${cleanValue}`;
      ariaLabel = `Call telephone number ${cleanValue}`;
      IconComponent = PhoneCallIcon;
      brandBg = 'bg-[#2D5A41]/10 text-[#2D5A41] hover:bg-[#2D5A41] hover:text-white border-[#2D5A41]/20';
      brandHover = 'hover:bg-[#2D5A41] hover:text-white';
      brandText = 'text-[#2D5A41]';
      break;
    }
    case 'email': {
      href = `mailto:${cleanValue}`;
      title = label || `Email: ${cleanValue}`;
      ariaLabel = `Send email to ${cleanValue}`;
      IconComponent = EmailEnvelopeIcon;
      brandBg = 'bg-[#7A877E]/15 text-[#5C665F] hover:bg-[#2D5A41] hover:text-white border-[#7A877E]/20';
      brandHover = 'hover:bg-[#2D5A41] hover:text-white';
      brandText = 'text-[#2D5A41]';
      break;
    }
    case 'instagram': {
      href = cleanValue.startsWith('http') ? cleanValue : `https://${cleanValue}`;
      title = label || `Instagram: ${cleanValue}`;
      ariaLabel = `Instagram Profile: ${cleanValue}`;
      IconComponent = InstagramIcon;
      brandBg = 'bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C] hover:text-white border-[#E1306C]/20';
      brandHover = 'hover:bg-[#E1306C] hover:text-white';
      brandText = 'text-[#E1306C]';
      break;
    }
  }

  // Size variations
  const sizeMap = {
    sm: {
      btn: 'w-6 h-6 min-w-[24px] min-h-[24px]',
      icon: 'w-3.5 h-3.5',
      text: 'text-xs',
    },
    md: {
      btn: 'w-7 h-7 min-w-[28px] min-h-[28px]',
      icon: 'w-4 h-4',
      text: 'text-xs',
    },
    lg: {
      btn: 'w-8 h-8 min-w-[32px] min-h-[32px]',
      icon: 'w-4.5 h-4.5',
      text: 'text-sm',
    },
  };

  const currentSize = sizeMap[size];
  const roundedClass = variant === 'circle' ? 'rounded-full' : 'rounded-xl';
  const isExternalTarget = type === 'whatsapp' || type === 'instagram';

  if (variant === 'card') {
    return (
      <a
        href={href}
        target={isExternalTarget ? '_blank' : undefined}
        rel={isExternalTarget ? 'noopener noreferrer' : undefined}
        title={title}
        aria-label={ariaLabel}
        className={`flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F5F0] border border-[#EBE8E0] hover:border-[#2D5A41]/40 transition-colors group ${className}`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${brandBg}`}
        >
          <IconComponent className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[#7A877E] block text-[11px] font-semibold">
            {type === 'whatsapp'
              ? 'WhatsApp'
              : type === 'imo'
              ? 'IMO'
              : type === 'instagram'
              ? 'ইনস্টাগ্রাম (Instagram)'
              : type === 'phone'
              ? 'ফোন (Phone)'
              : 'ইমেইল (Email)'}
          </span>
          <span className="font-mono font-medium text-[#2D3630] group-hover:text-[#2D5A41] transition-colors break-all">
            {cleanValue}
          </span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={href}
      target={isExternalTarget ? '_blank' : undefined}
      rel={isExternalTarget ? 'noopener noreferrer' : undefined}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center shrink-0 transition-all cursor-pointer font-sans leading-none ${roundedClass} ${
        showText ? 'px-2.5 py-1.5 gap-1.5' : currentSize.btn
      } ${brandBg} ${className}`}
    >
      <IconComponent className={currentSize.icon} />
      {showText && <span className={`font-medium ${currentSize.text}`}>{cleanValue}</span>}
    </a>
  );
};
