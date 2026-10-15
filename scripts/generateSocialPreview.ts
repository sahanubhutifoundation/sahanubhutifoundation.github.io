import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

/**
 * Generates the authentic 1200 x 630 landscape social preview image for Sahanubhuti Foundation.
 * Contains:
 * - Complete, uncropped authentic official Foundation logo vector
 * - Prominent, readable bilingual Foundation names ("Sahanubhuti Foundation" & "সহানুভূতি ফাউন্ডেশন")
 * - Humanitarian tagline, origin, and official domain badge
 * - Warm, uncluttered, professional aesthetic
 */
export function generateSocialPreviewImage(): void {
  const logoPath = path.resolve(process.cwd(), 'public/assets/logo.svg');
  const outputPath = path.resolve(process.cwd(), 'public/assets/og-preview.png');
  const fontBengaliPath = path.resolve(process.cwd(), 'scripts/fonts/NotoSansBengali.ttf');
  const fontEnglishPath = path.resolve(process.cwd(), 'scripts/fonts/PlusJakartaSans.ttf');

  if (!fs.existsSync(logoPath)) {
    console.warn('[social-preview] logo.svg not found at', logoPath);
    return;
  }

  const logoSvgRaw = fs.readFileSync(logoPath, 'utf-8');
  // Strip outer svg tags to cleanly nest within container
  const logoInner = logoSvgRaw
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>/i, '');

  const width = 1200;
  const height = 630;

  const fullSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#1E3E2B" flood-opacity="0.08"/>
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCFAF6" />
      <stop offset="100%" stop-color="#F4EFE6" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Two-tone Top Brand Accent -->
  <rect x="0" y="0" width="760" height="6" fill="#2D5A41" />
  <rect x="760" y="0" width="440" height="6" fill="#F37A20" />

  <!-- Refined Outer Inset Frame -->
  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="24" fill="none" stroke="#E6DFD1" stroke-width="1.5" />

  <!-- Left Side: Official Logo Card Container (Contain-style, Comfortable Margins) -->
  <g transform="translate(68, 95)" filter="url(#cardShadow)">
    <rect width="440" height="440" rx="32" fill="#FFFFFF" stroke="#E8E2D5" stroke-width="1.5" />
    <!-- Authentic Official Vector Logo cleanly fitted without cropping -->
    <g transform="translate(45, 45) scale(0.7)">
      ${logoInner}
    </g>
  </g>

  <!-- Right Side: Foundation Identity & Typography -->
  <!-- Category Pill Badge -->
  <g transform="translate(560, 110)">
    <rect width="320" height="34" rx="17" fill="#E8EFEA" stroke="#B8D5C2" stroke-width="1" />
    <text x="160" y="22" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="12" letter-spacing="1.2" fill="#2D5A41">HUMANITARIAN FAMILY INITIATIVE</text>
  </g>

  <!-- Primary English Foundation Name -->
  <text x="560" y="195" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="44" letter-spacing="-0.5" fill="#1E3E2B">Sahanubhuti Foundation</text>

  <!-- Primary Bengali Foundation Name -->
  <text x="560" y="260" font-family="Noto Sans Bengali, sans-serif" font-weight="700" font-size="38" letter-spacing="0" fill="#2D5A41">সহানুভূতি ফাউন্ডেশন</text>

  <!-- Balanced Dual Accent Line -->
  <rect x="560" y="285" width="90" height="4" rx="2" fill="#2D5A41" />
  <rect x="655" y="285" width="45" height="4" rx="2" fill="#F37A20" />

  <!-- Humanitarian Mission Summary -->
  <text x="560" y="340" font-family="Noto Sans Bengali, sans-serif" font-weight="500" font-size="20" fill="#3D4A41">সহানুভূতি ও মানবিকতার মাধ্যমে নিজেদের মানুষদের</text>
  <text x="560" y="370" font-family="Noto Sans Bengali, sans-serif" font-weight="500" font-size="20" fill="#3D4A41">পাশে দাঁড়ানোর একটি পারিবারিক উদ্যোগ।</text>

  <!-- Origin & Foundation Location -->
  <g transform="translate(560, 420)">
    <circle cx="8" cy="8" r="5" fill="#F37A20" />
    <text x="24" y="13" font-family="Noto Sans Bengali, sans-serif" font-weight="500" font-size="15" fill="#6B776E">মৌলভী বাড়ি, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ • প্রতিষ্ঠা: ২০২৪</text>
  </g>

  <!-- Domain Badge -->
  <g transform="translate(560, 470)">
    <rect width="290" height="38" rx="10" fill="#FFFFFF" stroke="#DCD6C9" stroke-width="1.2" />
    <circle cx="20" cy="19" r="4" fill="#2D5A41" />
    <text x="34" y="24" font-family="Plus Jakarta Sans, sans-serif" font-weight="600" font-size="14" fill="#2D5A41">sahanubhutifoundation.github.io</text>
  </g>
</svg>
`;

  const fontFiles: string[] = [];
  if (fs.existsSync(fontBengaliPath)) fontFiles.push(fontBengaliPath);
  if (fs.existsSync(fontEnglishPath)) fontFiles.push(fontEnglishPath);

  const resvg = new Resvg(fullSvg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles: fontFiles.length > 0 ? fontFiles : undefined,
      loadSystemFonts: true,
    },
  });

  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`[social-preview] Successfully generated 1200x630 share card at ${outputPath} (${pngBuffer.length} bytes)`);

  const distAssetPath = path.resolve(process.cwd(), 'dist/assets/og-preview.png');
  if (fs.existsSync(path.dirname(distAssetPath))) {
    fs.writeFileSync(distAssetPath, pngBuffer);
    console.log(`[social-preview] Synchronized share card to ${distAssetPath}`);
  }
}

// Execute immediately when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSocialPreviewImage();
}
