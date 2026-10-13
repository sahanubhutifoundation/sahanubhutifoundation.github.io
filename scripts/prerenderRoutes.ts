import fs from 'fs';
import path from 'path';

/**
 * Static route generator for GitHub Pages link crawlers (Facebook, WhatsApp, Messenger, Twitter/X)
 * Reads published activities and notices from initial/public seed data and generates route-specific
 * HTML files inside dist/ with pristine open graph and twitter card metadata.
 * When a social crawler fetches https://sahanubhutifoundation.github.io/activities/act-1 or slug,
 * it gets valid HTML with the localized title, description, and preview image without executing React.
 */

const DIST_DIR = path.resolve(process.cwd(), 'dist');
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

  // Load initialData safely
  let initialActivities: any[] = [];
  let initialNotices: any[] = [];
  let initialConfig: any = null;

  try {
    const initialDataMod = await import('../src/data/initialData.js').catch(() => null) ||
                           await import('../src/data/initialData.ts').catch(() => null);
    if (initialDataMod) {
      initialActivities = initialDataMod.initialActivities || [];
      initialNotices = initialDataMod.initialNotices || [];
      initialConfig = initialDataMod.initialConfig || null;
    }
  } catch (err) {
    console.warn('[prerender] Notice: loading initialData:', err);
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
    const img = opts.image && opts.image.trim() ? opts.image.trim() : DEFAULT_SHARE_IMAGE;
    const absImg = img.startsWith('http') ? img : `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
    const url = opts.url;
    const type = opts.type || 'website';

    let result = html;

    // Replace title
    result = result.replace(/<title>.*?<\/title>/i, `<title>${title} | সহানুভূতি ফাউন্ডেশন</title>`);

    // Replace or inject meta tags
    const metaTags = [
      { name: 'description', content: desc },
      { property: 'og:title', content: `${title} | সহানুভূতি ফাউন্ডেশন` },
      { property: 'og:description', content: desc },
      { property: 'og:image', content: absImg },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: `${title} | Sahanubhuti Foundation` },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      { name: 'twitter:title', content: `${title} | সহানুভূতি ফাউন্ডেশন` },
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

    return result;
  }

  function writeRoute(routePath: string, html: string) {
    const cleanRoute = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
    const targetDir = path.join(DIST_DIR, cleanRoute);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
    console.log(`[prerender] Generated static preview metadata for route: /${cleanRoute}`);
  }

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
    if (!act.isPublished) continue;
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

  console.log('[prerender] All public route metadata generated successfully for GitHub Pages.');
}

generateStaticRoutes().catch(console.error);
