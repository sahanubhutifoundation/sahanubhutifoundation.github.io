import { storageService } from '../services/storageService';

/**
 * Synchronizes Foundation Identity (Name, Logo) with browser-visible elements:
 * - document.title
 * - favicon (<link rel="icon">, <link rel="shortcut icon">)
 * - apple-touch-icon (<link rel="apple-touch-icon">)
 * - theme-color (<meta name="theme-color">)
 * - Open Graph metadata (og:title, og:image, og:site_name)
 */

function updateLinkTag(rel: string, href: string, type?: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (type) link.type = type;
  // If href changed, update it
  if (link.href !== href) {
    link.href = href;
  }
}

function updateMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attributeName, attributeValue);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export interface PageShareMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function syncBrowserIdentity(pageTitleOrMeta?: string | PageShareMeta) {
  if (typeof document === 'undefined') return;

  try {
    const config = storageService.getConfig();
    const nameBn = config.nameBn || 'সহানুভূতি ফাউন্ডেশন';
    const nameEn = config.nameEn || 'Sahanubhuti Foundation';
    const logoUrl = (config.logoUrl && config.logoUrl.trim().length > 0)
      ? config.logoUrl
      : '/assets/logo.svg';

    let pageTitle = '';
    let customDesc = '';
    let customImage = '';
    let customUrl = typeof window !== 'undefined' ? window.location.href : 'https://sahanubhutifoundation.github.io';
    let ogType = 'website';

    if (typeof pageTitleOrMeta === 'string') {
      pageTitle = pageTitleOrMeta;
    } else if (pageTitleOrMeta && typeof pageTitleOrMeta === 'object') {
      pageTitle = pageTitleOrMeta.title || '';
      customDesc = pageTitleOrMeta.description || '';
      customImage = pageTitleOrMeta.image || '';
      if (pageTitleOrMeta.url) customUrl = pageTitleOrMeta.url;
      if (pageTitleOrMeta.type) ogType = pageTitleOrMeta.type;
    }

    // 1. Browser Title
    const baseTitle = `${nameEn} | ${nameBn}`;
    if (pageTitle && pageTitle.trim()) {
      document.title = `${pageTitle.trim()} | ${nameBn}`;
    } else {
      document.title = baseTitle;
    }

    // 2. Favicon & Shortcut Icon (Distinct from social share image)
    updateLinkTag('icon', logoUrl, logoUrl.endsWith('.svg') ? 'image/svg+xml' : undefined);
    updateLinkTag('shortcut icon', logoUrl, logoUrl.endsWith('.svg') ? 'image/svg+xml' : undefined);

    // 3. Apple Touch Icon
    updateLinkTag('apple-touch-icon', logoUrl);

    // 4. Theme Color
    updateMetaTag('name', 'theme-color', '#2D5A41');

    // 5. Open Graph / Twitter Card Metadata
    const defaultShareTitle = config.socialSharePreview?.title?.bn || nameBn;
    const shareTitle = pageTitle ? `${pageTitle} | ${nameBn}` : defaultShareTitle;

    const defaultShareDesc = config.socialSharePreview?.description?.bn ||
      'সহানুভূতি ও মানবিকতার মাধ্যমে নিজেদের মানুষদের পাশে দাঁড়ানোর একটি পারিবারিক উদ্যোগ।';
    const shareDesc = customDesc || defaultShareDesc;

    // Resolve absolute image URL for crawlers / preview
    const configuredShareImg = config.socialSharePreview?.imageUrl?.trim();
    let shareImg = customImage || (configuredShareImg || logoUrl);
    if (shareImg.startsWith('/')) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sahanubhutifoundation.github.io';
      shareImg = `${origin}${shareImg}`;
    }

    // Meta Description
    updateMetaTag('name', 'description', shareDesc);

    // Open Graph Tags
    updateMetaTag('property', 'og:site_name', nameBn);
    updateMetaTag('property', 'og:title', shareTitle);
    updateMetaTag('property', 'og:description', shareDesc);
    updateMetaTag('property', 'og:image', shareImg);
    updateMetaTag('property', 'og:url', customUrl);
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:locale', 'bn_BD');

    // Twitter / X Card
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', shareTitle);
    updateMetaTag('name', 'twitter:description', shareDesc);
    updateMetaTag('name', 'twitter:image', shareImg);
  } catch (err) {
    console.warn('Browser identity sync warning:', err);
  }
}
