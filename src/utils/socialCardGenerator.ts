/**
 * Sahanubhuti Foundation — Social Share Preview Card Generator
 * Renders a crisp 1200 x 630 landscape social share image on an HTML5 canvas.
 * Produces clean PNG assets matching the official brand identity:
 * - Contain-fitted uncropped official logo with ample white margin
 * - High-contrast readable typography in Bengali, English, or Arabic
 * - Official domain and humanitarian initiative badges
 */

export interface SocialCardGenParams {
  lang: 'bn' | 'en' | 'ar';
  logoUrl?: string;
  title?: string;
  description?: string;
  nameBn?: string;
  nameEn?: string;
  nameAr?: string;
  domain?: string;
  location?: string;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 3
): string[] {
  if (!text || !text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        // Last allowed line: check remaining text
        const remaining = words.slice(i).join(' ');
        let lastLine = remaining;
        while (lastLine.length > 0 && ctx.measureText(lastLine + '...').width > maxWidth) {
          lastLine = lastLine.slice(0, -1).trim();
        }
        lines.push(lastLine ? `${lastLine}...` : '...');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.slice(0, maxLines);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin in case of local asset
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

export async function renderSocialCardCanvas(
  params: SocialCardGenParams
): Promise<HTMLCanvasElement> {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Ensure fonts are loaded if available
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const lang = params.lang || 'bn';
  const nameBn = params.nameBn || 'সহানুভূতি ফাউন্ডেশন';
  const nameEn = params.nameEn || 'Sahanubhuti Foundation';
  const nameAr = params.nameAr || 'مؤسسة ساهانوبوتي';
  const domain = params.domain || 'sahanubhutifoundation.github.io';
  const logoUrl = params.logoUrl || '/assets/logo.svg';

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#FCFAF6');
  bgGrad.addColorStop(1, '#F4EFE6');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Top Two-Tone Brand Accent
  ctx.fillStyle = '#2D5A41';
  ctx.fillRect(0, 0, 760, 6);
  ctx.fillStyle = '#F37A20';
  ctx.fillRect(760, 0, 440, 6);

  // 3. Subtle Inset Border Frame
  ctx.strokeStyle = '#E6DFD1';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 18, 18, width - 36, height - 36, 24);
  ctx.stroke();

  // 4. Left Card Container: Logo Box (Contain style, comfortable margin)
  const logoBoxX = 64;
  const logoBoxY = 90;
  const logoBoxSize = 450;
  const logoBoxRadius = 32;

  // Shadow for logo box
  ctx.save();
  ctx.shadowColor = 'rgba(30, 62, 43, 0.08)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, logoBoxRadius);
  ctx.fill();
  ctx.restore();

  // Logo Box Border
  ctx.strokeStyle = '#E8E2D5';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, logoBoxRadius);
  ctx.stroke();

  // Draw Logo Image inside with contain fitting
  const logoImg = await loadImage(logoUrl);
  if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
    const maxDrawWidth = logoBoxSize - 90; // 360 max
    const maxDrawHeight = logoBoxSize - 90;
    const imgAspect = logoImg.width / logoImg.height;
    let drawW = maxDrawWidth;
    let drawH = drawW / imgAspect;

    if (drawH > maxDrawHeight) {
      drawH = maxDrawHeight;
      drawW = drawH * imgAspect;
    }

    const drawX = logoBoxX + (logoBoxSize - drawW) / 2;
    const drawY = logoBoxY + (logoBoxSize - drawH) / 2;

    ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
  } else {
    // Text fallback if image loading fails
    ctx.fillStyle = '#2D5A41';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAHANUBHUTI', logoBoxX + logoBoxSize / 2, logoBoxY + logoBoxSize / 2 - 10);
    ctx.font = 'bold 28px "Noto Sans Bengali", sans-serif';
    ctx.fillText('সহানুভূতি ফাউন্ডেশন', logoBoxX + logoBoxSize / 2, logoBoxY + logoBoxSize / 2 + 30);
  }

  // 5. Right Content Area
  const textX = 560;
  const textWidth = width - textX - 64; // ~576px
  ctx.textAlign = 'left';

  // Category Badge Pill
  const badgeY = 96;
  const badgeH = 32;
  let badgeText = 'HUMANITARIAN FAMILY INITIATIVE';
  let badgeFont = '700 12px "Plus Jakarta Sans", sans-serif';

  if (lang === 'bn') {
    badgeText = 'মানবিক পারিবারিক সেবামূলক উদ্যোগ';
    badgeFont = '700 13px "Noto Sans Bengali", sans-serif';
  } else if (lang === 'ar') {
    badgeText = 'مبادرة عائلية إنسانية مخلصة';
    badgeFont = '700 13px "Noto Sans Arabic", sans-serif';
  }

  ctx.font = badgeFont;
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = badgeMetrics.width + 32;

  ctx.fillStyle = '#E8EFEA';
  ctx.strokeStyle = '#B8D5C2';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, textX, badgeY, badgeW, badgeH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2D5A41';
  ctx.fillText(badgeText, textX + 16, badgeY + 21);

  // Foundation Brand Heading
  let primTitle = nameBn;
  let secTitle = nameEn;
  let primFont = 'bold 40px "Noto Sans Bengali", sans-serif';
  let secFont = '600 22px "Plus Jakarta Sans", sans-serif';

  if (lang === 'en') {
    primTitle = nameEn;
    secTitle = nameBn;
    primFont = '800 42px "Plus Jakarta Sans", sans-serif';
    secFont = '600 24px "Noto Sans Bengali", sans-serif';
  } else if (lang === 'ar') {
    primTitle = nameAr;
    secTitle = `${nameEn} • ${nameBn}`;
    primFont = 'bold 38px "Noto Sans Arabic", sans-serif';
    secFont = '600 18px "Plus Jakarta Sans", sans-serif';
  }

  ctx.fillStyle = '#1E3E2B';
  ctx.font = primFont;
  ctx.fillText(primTitle, textX, badgeY + 75);

  ctx.fillStyle = '#4A6B56';
  ctx.font = secFont;
  ctx.fillText(secTitle, textX, badgeY + 112);

  // Dual Brand Accent Line
  const barY = badgeY + 128;
  ctx.fillStyle = '#2D5A41';
  ctx.fillRect(textX, barY, 84, 4);
  ctx.fillStyle = '#F37A20';
  ctx.fillRect(textX + 84, barY, 42, 4);

  // Custom / Configured Share Title & Description
  const shareTitleText = (params.title && params.title.trim())
    ? params.title.trim()
    : (lang === 'en' ? 'Sahanubhuti Foundation Official Portal' : lang === 'ar' ? 'البوابة الرسمية لمؤسسة ساهانوبوتي' : 'সহানুভূতি ফাউন্ডেশন অফিশিয়াল পোর্টাল');

  const shareDescText = (params.description && params.description.trim())
    ? params.description.trim()
    : (lang === 'en'
        ? 'A sincere humanitarian family initiative based in Moulovi Bari, Sharshadi, Feni Sadar, Feni, Bangladesh.'
        : lang === 'ar'
        ? 'مبادرة عائلية إنسانية مخلصة لدعم المحتاجين في شارشادي، فيني، بنغلاديش.'
        : 'সহানুভূতি ও মানবিকতার মাধ্যমে নিজেদের মানুষদের পাশে দাঁড়ানোর একটি পারিবারিক উদ্যোগ।');

  // Title rendering
  ctx.fillStyle = '#1E3E2B';
  let titleFont = 'bold 24px "Noto Sans Bengali", sans-serif';
  if (lang === 'en') titleFont = 'bold 25px "Plus Jakarta Sans", sans-serif';
  if (lang === 'ar') titleFont = 'bold 24px "Noto Sans Arabic", sans-serif';
  ctx.font = titleFont;

  const titleLines = wrapText(ctx, shareTitleText, textWidth, 2);
  let currentTextY = barY + 36;
  for (const line of titleLines) {
    ctx.fillText(line, textX, currentTextY);
    currentTextY += 30;
  }

  // Description rendering
  ctx.fillStyle = '#4D5950';
  let descFont = '400 17px "Noto Sans Bengali", sans-serif';
  if (lang === 'en') descFont = '400 17px "Plus Jakarta Sans", sans-serif';
  if (lang === 'ar') descFont = '400 17px "Noto Sans Arabic", sans-serif';
  ctx.font = descFont;

  const descLines = wrapText(ctx, shareDescText, textWidth, 2);
  currentTextY += 6;
  for (const line of descLines) {
    ctx.fillText(line, textX, currentTextY);
    currentTextY += 24;
  }

  // Bottom Area: Location & Domain Badge
  const bottomY = logoBoxY + logoBoxSize - 40;

  // Location string with orange pin dot
  ctx.fillStyle = '#F37A20';
  ctx.beginPath();
  ctx.arc(textX + 6, bottomY - 30, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6E7A71';
  let locFont = '500 13px "Noto Sans Bengali", sans-serif';
  let locText = params.location || 'মৌলভী বাড়ি, শর্শদী, ফেনী সদর, ফেনী, বাংলাদেশ • প্রতিষ্ঠা: ২০২৪';
  if (lang === 'en') {
    locFont = '500 13px "Plus Jakarta Sans", sans-serif';
    locText = params.location || 'Moulovi Bari, Sharshadi, Feni Sadar, Feni, Bangladesh • Est. 2024';
  } else if (lang === 'ar') {
    locFont = '500 13px "Noto Sans Arabic", sans-serif';
    locText = params.location || 'مولفي باري، شارشادي، فيني سادار، بنغلاديش • تأسست: ٢٠٢٤';
  }
  ctx.font = locFont;
  ctx.fillText(locText, textX + 18, bottomY - 26);

  // Domain Badge Pill
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#DCD6C9';
  ctx.lineWidth = 1.2;
  const domainBadgeW = 280;
  const domainBadgeH = 36;
  drawRoundedRect(ctx, textX, bottomY - 10, domainBadgeW, domainBadgeH, 10);
  ctx.fill();
  ctx.stroke();

  // Green active dot
  ctx.fillStyle = '#2D5A41';
  ctx.beginPath();
  ctx.arc(textX + 18, bottomY + 8, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2D5A41';
  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(domain, textX + 32, bottomY + 13);

  return canvas;
}

export async function generateSocialCardDataUrl(params: SocialCardGenParams): Promise<string> {
  const canvas = await renderSocialCardCanvas(params);
  return canvas.toDataURL('image/png');
}

export async function generateSocialCardBlob(params: SocialCardGenParams): Promise<Blob> {
  const canvas = await renderSocialCardCanvas(params);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob returned null'));
      }
    }, 'image/png');
  });
}
