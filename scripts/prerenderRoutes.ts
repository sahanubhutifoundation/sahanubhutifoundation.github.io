import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Static route generator for GitHub Pages link crawlers (Facebook, WhatsApp, Messenger, Twitter/X)
 * Reads published activities, notices, members, and site configuration from Supabase (or bundled seed data)
 * and generates route-specific HTML files inside dist/ with pristine open graph, twitter card metadata,
 * and authoritative initial branding to eliminate first-load flash on fresh browsers.
 */

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const BASE_URL = 'https://sahanubhutifoundation.github.io';
const DEFAULT_SHARE_IMAGE = `${BASE_URL}/assets/og-preview.png`;

async function generateStaticRoutes() {
  if (!fs.existsSync(DIST_DIR)) {
    console.log('[prerender] dist/ directory not found. Skipping static route generation.');
    return;
  }

  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.log('[prerender] dist/index.html not found. Skipping.');
    return;
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  // Load data: start with initialData, then merge live Supabase records if available
  let initialActivities: any[] = [];
  let initialNotices: any[] = [];
  let initialMembers: any[] = [];
  let liveConfig: any = null;

  try {
    const initialDataMod = await import('../src/data/initialData.js').catch(() => null) ||
                           await import('../src/data/initialData.ts').catch(() => null);
    if (initialDataMod) {
      initialActivities = initialDataMod.initialActivities || [];
      initialNotices = initialDataMod.initialNotices || [];
      initialMembers = initialDataMod.initialMembers || [];
      liveConfig = initialDataMod.initialConfig || null;
    }
  } catch (err) {
    console.warn('[prerender] Notice: loading initialData:', err);
  }

  // Connect to Supabase at build time if credentials are present
  try {
    const { supabaseService } = await import('../src/services/supabaseService.js').catch(() => null) ||
                                await import('../src/services/supabaseService.ts').catch(() => null) || {};
    if (supabaseService && supabaseService.isAvailable()) {
      console.log('[prerender] Connecting to Supabase Cloud database to fetch latest published site metadata...');
      const [fetchedConfig, fetchedActs, fetchedNotices, fetchedMembers] = await Promise.all([
        supabaseService.fetchConfig().catch(() => null),
        supabaseService.fetchActivities().catch(() => null),
        supabaseService.fetchNotices().catch(() => null),
        supabaseService.fetchMembers().catch(() => null),
      ]);

      if (fetchedConfig) {
        liveConfig = { ...(liveConfig || {}), ...fetchedConfig };
        console.log('[prerender] Successfully retrieved live site_config from Supabase.');
      }
      if (Array.isArray(fetchedActs) && fetchedActs.length > 0) {
        initialActivities = fetchedActs;
        console.log(`[prerender] Retrieved ${fetchedActs.length} live activities from Supabase.`);
      }
      if (Array.isArray(fetchedNotices) && fetchedNotices.length > 0) {
        initialNotices = fetchedNotices;
        console.log(`[prerender] Retrieved ${fetchedNotices.length} live notices from Supabase.`);
      }
      if (Array.isArray(fetchedMembers) && fetchedMembers.length > 0) {
        initialMembers = fetchedMembers;
        console.log(`[prerender] Retrieved ${fetchedMembers.length} live members from Supabase.`);
      }
    }
  } catch (err) {
    console.warn('[prerender] Supabase build-time sync notice (using bundled defaults):', err);
  }

  // Calculate canonical social preview asset version hash for instant crawler cache invalidation
  let assetVersionHash = '';
  const distOgPath = path.join(DIST_DIR, 'assets/og-preview.png');
  const publicOgPath = path.join(PUBLIC_DIR, 'assets/og-preview.png');
  const targetOgFile = fs.existsSync(distOgPath) ? distOgPath : (fs.existsSync(publicOgPath) ? publicOgPath : null);

  if (targetOgFile) {
    try {
      const fileBuf = fs.readFileSync(targetOgFile);
      assetVersionHash = crypto.createHash('md5').update(fileBuf).digest('hex').substring(0, 8);
      console.log(`[prerender] Canonical og-preview.png content hash: ${assetVersionHash} (${fileBuf.length} bytes)`);
    } catch (e) {
      console.warn('[prerender] Could not compute asset hash:', e);
    }
  }

  // Canonical share image is ALWAYS https://sahanubhutifoundation.github.io/assets/og-preview.png
  // Appending ?v=hash forces social platforms (Facebook, Twitter, WhatsApp) to bust their CDN cache immediately
  const effectiveShareImage = `${BASE_URL}/assets/og-preview.png${assetVersionHash ? `?v=${assetVersionHash}` : ''}`;
  console.log('[prerender] Effective Canonical Social Share Image:', effectiveShareImage);

  // Authoritative Initial Branding Configuration
  // Solves GOAL B: Injected directly into static HTML so fresh browsers display the latest Admin branding on the very first byte
  const authoritativeBranding = {
    nameBn: liveConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন',
    nameEn: liveConfig?.nameEn || 'Sahanubhuti Foundation',
    nameAr: liveConfig?.nameAr || 'مؤسسة ساهানوبوتي',
    logoUrl: liveConfig?.logoUrl || '/assets/logo.svg',
    logoOverrides: liveConfig?.logoOverrides || {
      header: '',
      hero: '',
      footer: '',
      admin: '',
    },
    brandingVersion: liveConfig?.brandingVersion || assetVersionHash || Date.now().toString(),
    isAuthoritative: true,
  };

  // Synchronize static initial-branding.json files
  try {
    const brandingJson = JSON.stringify(authoritativeBranding, null, 2);
    const distAssetsDir = path.join(DIST_DIR, 'assets');
    const publicAssetsDir = path.join(PUBLIC_DIR, 'assets');
    fs.mkdirSync(distAssetsDir, { recursive: true });
    fs.mkdirSync(publicAssetsDir, { recursive: true });
    fs.writeFileSync(path.join(distAssetsDir, 'initial-branding.json'), brandingJson, 'utf-8');
    fs.writeFileSync(path.join(publicAssetsDir, 'initial-branding.json'), brandingJson, 'utf-8');
    console.log('[prerender] Successfully generated initial-branding.json asset.');
  } catch (err) {
    console.warn('[prerender] Notice generating initial-branding.json:', err);
  }

  function injectMeta(html: string, opts: {
    title: string;
    description: string;
    image?: string;
    url: string;
    type?: string;
  }): string {
    const title = opts.title.trim();
    const desc = opts.description.trim();
    const rawImg = opts.image && opts.image.trim() && !opts.image.startsWith('data:')
      ? opts.image.trim()
      : effectiveShareImage;
    const absImg = rawImg.startsWith('http')
      ? rawImg
      : `${BASE_URL}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
    const url = opts.url;
    const type = opts.type || 'website';

    let result = html;

    // CRITICAL: Ensure all script, style, and asset tags use root-relative paths (/assets/...) never relative (./assets/...)
    result = result.replace(/(src|href)=["']\.\/assets\//g, '$1="/assets/');
    result = result.replace(/(src|href)=["']assets\//g, '$1="/assets/');

    // Replace title
    result = result.replace(/<title>.*?<\/title>/i, `<title>${title} | ${liveConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন'}</title>`);

    // Replace or inject meta tags
    const metaTags = [
      { name: 'description', content: desc },
      { property: 'og:site_name', content: liveConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন' },
      { property: 'og:title', content: `${title} | ${liveConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন'}` },
      { property: 'og:description', content: desc },
      { property: 'og:image', content: absImg },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: `${title} | ${liveConfig?.nameEn || 'Sahanubhuti Foundation'}` },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${title} | ${liveConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন'}` },
      { name: 'twitter:description', content: desc },
      { name: 'twitter:image', content: absImg },
    ];

    for (const tag of metaTags) {
      const attr = tag.name ? `name="${tag.name}"` : `property="${tag.property}"`;
      const regex = new RegExp(`<meta\\s+${attr}\\s+content=".*?"\\s*\\/?>`, 'i');
      const replacement = `<meta ${attr} content="${tag.content.replace(/"/g, '&quot;')}" />`;
      if (regex.test(result)) {
        result = result.replace(regex, replacement);
      } else {
        result = result.replace('</head>', `    ${replacement}\n  </head>`);
      }
    }

    // Remove any stale preloading of obsolete /assets/logo.svg
    result = result.replace(/<link\s+rel="preload"\s+as="image"\s+href="\/assets\/logo\.svg"[^>]*\/?>\s*/gi, '');

    // Preload authoritative logo if non-empty and valid
    if (authoritativeBranding.logoUrl && authoritativeBranding.logoUrl.trim().length > 0) {
      const preloadTag = `<link rel="preload" as="image" href="${authoritativeBranding.logoUrl}" />`;
      if (!result.includes(preloadTag)) {
        result = result.replace('</head>', `    ${preloadTag}\n  </head>`);
      }
    }

    // Inject authoritative initial branding into window.__SF_INITIAL_BRANDING__
    const brandingScript = `<script id="sf-authoritative-branding">window.__SF_INITIAL_BRANDING__=${JSON.stringify(authoritativeBranding)};</script>`;
    if (result.includes('id="sf-authoritative-branding"')) {
      result = result.replace(/<script id="sf-authoritative-branding">.*?<\/script>/is, brandingScript);
    } else {
      result = result.replace('</head>', `    ${brandingScript}\n  </head>`);
    }

    return result;
  }

  function writeRoute(routePath: string, html: string) {
    const cleanRoute = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
    const targetDir = path.join(DIST_DIR, cleanRoute);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
    console.log(`[prerender] Generated static preview metadata for route: /${cleanRoute}`);
  }

  // 0. Update Root dist/index.html with resolved live metadata
  const homeTitle = liveConfig?.socialSharePreview?.title?.bn || liveConfig?.nameBn || 'সহানুভূতি ফাউন্ডেশন';
  const homeDesc = liveConfig?.socialSharePreview?.description?.bn || 'সহানুভূতি ও মানবিকতার মাধ্যমে নিজেদের মানুষদের পাশে দাঁড়ানোর একটি পারিবারিক উদ্যোগ।';
  const updatedRootHtml = injectMeta(baseHtml, {
    title: homeTitle,
    description: homeDesc,
    url: BASE_URL,
    image: effectiveShareImage,
  });
  fs.writeFileSync(indexHtmlPath, updatedRootHtml, 'utf-8');
  console.log('[prerender] Updated dist/index.html with effective social preview metadata and root-relative assets.');

  // 1. Standard Public Pages
  const publicPages = [
    {
      path: 'about',
      title: 'আমাদের সম্পর্কে',
      desc: 'সহানুভূতি ফাউন্ডেশনের ইতিহাস, লক্ষ্য, উদ্দেশ্য ও আদর্শ।',
    },
    {
      path: 'activities',
      title: 'কার্যক্রম ও উদ্যোগ',
      desc: 'সহানুভূতি ফাউন্ডেশনের চলমান ও সম্পন্ন মানবিক সেবামূলক কার্যক্রমসমূহ।',
    },
    {
      path: 'fund',
      title: 'তহবিল ও স্বচ্ছ হিসাব',
      desc: 'সহানুভূতি ফাউন্ডেশনের শতভাগ স্বচ্ছ আয়, ব্যয় ও তহবিল বিবরণী।',
    },
    {
      path: 'members',
      title: 'সম্মানিত সদস্যবৃন্দ',
      desc: 'সহানুভূতি ফাউন্ডেশনের নিবেদিতপ্রাণ সদস্য ও শুভানুধ্যায়ীদের তালিকা।',
    },
    {
      path: 'gallery',
      title: 'মিডিয়া ও গ্যালারি',
      desc: 'সহানুভূতি ফাউন্ডেশনের বিভিন্ন সেবামূলক কাজের আলোকচিত্র ও ভিডিও।',
    },
    {
      path: 'notice',
      title: 'নোটিশ বোর্ড',
      desc: 'সহানুভূতি ফাউন্ডেশনের অফিশিয়াল নোটিশ, বিজ্ঞপ্তি ও জরুরি তথ্য।',
    },
    {
      path: 'contact',
      title: 'যোগাযোগ',
      desc: 'সহানুভূতি ফাউন্ডেশনের সাথে যোগাযোগের অফিশিয়াল মাধ্যম ও ঠিকানা।',
    },
  ];

  for (const page of publicPages) {
    const pageHtml = injectMeta(baseHtml, {
      title: page.title,
      description: page.desc,
      url: `${BASE_URL}/${page.path}`,
    });
    writeRoute(page.path, pageHtml);
  }

  // 2. Published Activity Details
  for (const act of initialActivities) {
    if (act.isPublished === false) continue;
    const title = act.title?.bn || act.title?.en || 'কার্যক্রম বিস্তারিত';
    const desc = act.shortSummary?.bn || act.summary?.bn || act.description?.bn || act.summary?.en || '';
    const img = act.coverImage || '';

    const actHtml = injectMeta(baseHtml, {
      title,
      description: desc,
      image: img,
      url: `${BASE_URL}/activities/${act.slug || act.id}`,
      type: 'article',
    });

    writeRoute(`activities/${act.id}`, actHtml);
    if (act.slug && act.slug !== act.id) {
      writeRoute(`activities/${act.slug}`, actHtml);
    }
  }

  // 3. Notices
  for (const notice of initialNotices) {
    if (notice.isPublished === false) continue;
    const title = notice.title?.bn || notice.title?.en || 'নোটিশ';
    const desc = (notice.body?.bn || notice.body?.en || '').slice(0, 180);

    const noticeHtml = injectMeta(baseHtml, {
      title,
      description: desc,
      url: `${BASE_URL}/notice/${notice.id}`,
      type: 'article',
    });

    writeRoute(`notice/${notice.id}`, noticeHtml);
  }

  // 4. Members Detail Pages
  for (const member of initialMembers) {
    if (member.isPublished === false) continue;
    const name = member.nameBn || member.name || member.nameEn || 'সম্মানিত সদস্য';
    const role = member.roleBn || member.role || member.roleEn || 'সদস্য';
    const desc = `${name} - ${role}, সহানুভূতি ফাউন্ডেশন।`;
    const img = member.photoUrl || member.photo || '';

    const memberHtml = injectMeta(baseHtml, {
      title: `${name} | ${role}`,
      description: desc,
      image: img,
      url: `${BASE_URL}/members/${member.id}`,
      type: 'profile',
    });

    writeRoute(`members/${member.id}`, memberHtml);
  }

  // 5. Ensure dist/404.html is refreshed from the updated root HTML
  const fallback404Path = path.join(DIST_DIR, '404.html');
  fs.writeFileSync(fallback404Path, updatedRootHtml, 'utf-8');
  console.log('[prerender] Synchronized dist/404.html with root-relative assets and SPA routing fallback.');

  console.log('[prerender] All public route metadata and static detail pages generated successfully for GitHub Pages.');
}

generateStaticRoutes().catch(console.error);
