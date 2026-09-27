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

export function syncBrowserIdentity(pageTitle?: string) {
  if (typeof document === 'undefined') return;

  try {
    const config = storageService.getConfig();
    const nameBn = config.nameBn || 'সহানুভূতি ফাউন্ডেশন';
    const nameEn = config.nameEn || 'Sahanubhuti Foundation';
    const logoUrl = (config.logoUrl && config.logoUrl.trim().length > 0)
      ? config.logoUrl
      : '/assets/logo.svg';

    // 1. Browser Title
    const baseTitle = `${nameEn} | ${nameBn}`;
    if (pageTitle && pageTitle.trim()) {
      document.title = `${pageTitle.trim()} | ${nameBn}`;
    } else {
      document.title = baseTitle;
    }

    // 2. Favicon & Shortcut Icon
    updateLinkTag('icon', logoUrl, logoUrl.endsWith('.svg') ? 'image/svg+xml' : undefined);
    updateLinkTag('shortcut icon', logoUrl, logoUrl.endsWith('.svg') ? 'image/svg+xml' : undefined);

    // 3. Apple Touch Icon
    updateLinkTag('apple-touch-icon', logoUrl);

    // 4. Theme Color
    updateMetaTag('name', 'theme-color', '#2D5A41');

    // 5. Open Graph / Web App Metadata
    updateMetaTag('property', 'og:site_name', nameBn);
    updateMetaTag('property', 'og:title', pageTitle ? `${pageTitle} | ${nameBn}` : baseTitle);
    updateMetaTag('property', 'og:image', logoUrl);
  } catch (err) {
    console.warn('Browser identity sync warning:', err);
  }
}
