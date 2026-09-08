import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Logo } from './Logo';
import { FoundationLocationDisplay } from './FoundationLocationDisplay';
import { formatFoundingDate } from '../utils/foundationHelpers';
import { storageService } from '../services/storageService';
import {
  Mail,
  Facebook,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Youtube,
  MessageCircle,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { t, tMulti, language } = useLanguage();
  const config = storageService.getConfig();

  const currentYear = new Date().getFullYear();
  const vis = config.footerVisibility || {};
  const showDesc = vis.showDescription !== false;
  const showNav = vis.showNavigation !== false;
  const showOrigin = vis.showOrigin !== false;
  const showContact = vis.showContact !== false;
  const showCopyright = vis.showCopyright !== false;

  const footerDesc = tMulti(config.footerDescription) || t('footerAboutText');
  const footerCopy = tMulti(config.footerCopyright) || `© ${currentYear} ${config.nameEn} (${config.nameBn})। ${t('allRightsReserved')}`;

  return (
    <footer className="bg-[#18231B] text-[#D3DDD5] border-t border-[#28382C] pt-12 pb-8 sm:pt-16 sm:pb-12 text-sm relative overflow-hidden">
      {/* Subtle background ambient warmth */}
      <div
        className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-[#2D5A41]/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-[#3D4C40]/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-[#28382C]">
          {/* Col 1: Foundation Info & Logo */}
          {showDesc && (
            <div className="space-y-4">
              <Link to="/" className="inline-block">
                <Logo variant="dark" size="md" location="footer" />
              </Link>
              <p className="text-xs sm:text-sm text-[#8A9B8F] leading-relaxed max-w-sm">
                {footerDesc}
              </p>
              {vis.showSocial !== false && (
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {config.facebookUrl && (
                    <a
                      href={config.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook Page"
                      className="w-8 h-8 rounded-lg bg-[#223026] flex items-center justify-center text-[#A4B3A8] hover:text-white hover:bg-[#2D5A41] transition-colors border border-[#2D3E32]"
                      title="Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {config.youtubeUrl && (
                    <a
                      href={config.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube Channel"
                      className="w-8 h-8 rounded-lg bg-[#223026] flex items-center justify-center text-[#A4B3A8] hover:text-white hover:bg-[#C4302B] transition-colors border border-[#2D3E32]"
                      title="YouTube"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {config.whatsappNumber && (
                    <a
                      href={`https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="w-8 h-8 rounded-lg bg-[#223026] flex items-center justify-center text-[#A4B3A8] hover:text-white hover:bg-[#25D366] transition-colors border border-[#2D3E32]"
                      title={`WhatsApp: ${config.whatsappNumber}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  {config.imoNumber && (
                    <a
                      href={`tel:${config.imoNumber}`}
                      aria-label="Imo"
                      className="w-8 h-8 rounded-lg bg-[#223026] flex items-center justify-center text-[#A4B3A8] hover:text-white hover:bg-[#0084FF] transition-colors border border-[#2D3E32] text-xs font-bold"
                      title={`Imo: ${config.imoNumber}`}
                    >
                      imo
                    </a>
                  )}
                  {config.email && (
                    <a
                      href={`mailto:${config.email}`}
                      aria-label="Send Email"
                      className="w-8 h-8 rounded-lg bg-[#223026] flex items-center justify-center text-[#A4B3A8] hover:text-white hover:bg-[#2D5A41] transition-colors border border-[#2D3E32]"
                      title={`Email: ${config.email}`}
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {config.phone && config.showPhone !== false && (
                    <a
                      href={`tel:${config.phone}`}
                      aria-label="Call Foundation"
                      className="w-8 h-8 rounded-lg bg-[#223026] flex items-center justify-center text-[#65B78A] hover:text-white hover:bg-[#2D5A41] transition-colors border border-[#2D3E32]"
                      title={`Phone: ${config.phone}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Col 2: Navigation Links */}
          {showNav && (
            <div>
              <h3 className="text-[#FDFCF9] text-xs font-bold uppercase tracking-wider mb-4">
                {t('quickLinks')}
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <Link to="/" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navHome')}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navAbout')}
                  </Link>
                </li>
                <li>
                  <Link to="/activities" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navActivities')}
                  </Link>
                </li>
                <li>
                  <Link to="/members" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navMembers')}
                  </Link>
                </li>
                <li>
                  <Link to="/fund" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navFund')}
                  </Link>
                </li>
                <li>
                  <Link to="/gallery" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navGallery')}
                  </Link>
                </li>
                <li>
                  <Link to="/notice" className="text-[#8A9B8F] hover:text-[#FDFCF9] transition-colors">
                    {t('navNotice')}
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Col 3: Foundation Headquarters / Origin */}
          {showOrigin && (
            <div>
              <h3 className="text-[#FDFCF9] text-xs font-bold uppercase tracking-wider mb-4">
                {language === 'bn' ? 'ফাউন্ডেশনের অবস্থান' : language === 'ar' ? 'المقر والتأسيس' : 'Headquarters & Origin'}
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-[#8A9B8F]">
                {config.locationDisplayMode !== 'hidden' && (
                  <FoundationLocationDisplay config={config} variant="footer" />
                )}
                {config.showFoundingDate !== false && Boolean(config.foundedDate) && (
                  <li className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#8A9B8F] shrink-0" />
                    <span>{formatFoundingDate(config.foundedDate, language)}</span>
                  </li>
                )}
                <li className="text-xs text-[#8A9B8F] bg-[#202C23] p-2.5 rounded-lg border border-[#28382C]">
                  {language === 'bn'
                    ? 'উদ্যোগ: পারিবারিক তরুণ সমাজের সম্মিলিত প্রচেষ্টা'
                    : 'Initiative: Joint endeavor of our family youth'}
                </li>
              </ul>
            </div>
          )}

          {/* Col 4: Contact & Inquiries */}
          {showContact && (
            <div>
              <h3 className="text-[#FDFCF9] text-xs font-bold uppercase tracking-wider mb-4">
                {t('navContact')}
              </h3>
              <div className="space-y-3 text-xs sm:text-sm text-[#8A9B8F]">
                <p className="text-xs leading-relaxed">
                  {language === 'bn'
                    ? 'ফাউন্ডেশনের বিষয়ে যেকোনো প্রশ্ন বা পরামর্শের জন্য আমাদের ইমেইল করতে পারেন।'
                    : 'For any questions or feedback regarding the foundation, feel free to reach out via email.'}
                </p>
                {config.email && (
                  <div className="bg-[#202C23] p-3 rounded-lg border border-[#28382C]">
                    <div className="text-[11px] text-[#78887D] mb-1">ইমেইল:</div>
                    <a
                      href={`mailto:${config.email}`}
                      className="text-[#65B78A] hover:underline font-mono text-xs break-all block"
                    >
                      {config.email}
                    </a>
                  </div>
                )}
                {config.phone && config.showPhone !== false ? (
                  <div className="text-[11px] text-[#78887D]">
                    <span>হটলাইন: </span>
                    <a
                      href={`tel:${config.phone}`}
                      className="font-mono text-[#D3DDD5] hover:text-[#65B78A] transition-colors"
                    >
                      {config.phone}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar with copyright & subtle admin link */}
        {showCopyright && (
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6A7B70]">
            <div>{footerCopy}</div>
            <div className="flex items-center gap-4">
              <Link
                to="/contact"
                className="hover:text-[#A4B3A8] transition-colors"
              >
                {t('navContact')}
              </Link>
              <span className="text-[#2D3E32]">•</span>
              {/* Subtle admin portal entry matching required hash /#adminfoundation */}
              <a
                href="/#adminfoundation"
                className="inline-flex items-center gap-1 hover:text-[#A4B3A8] transition-colors opacity-70 hover:opacity-100"
                title="Admin CMS Portal"
              >
                <Lock className="w-3 h-3" />
                <span>প্রশাসক প্রবেশ</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
