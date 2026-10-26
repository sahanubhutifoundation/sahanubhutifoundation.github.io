import html2canvas from 'html2canvas';
import JSZip from 'jszip';

/**
 * Converts an image URL into a base64 Data URL to prevent HTML5 canvas CORS tainting.
 * Automatically substitutes raster PNG for SVG logo to ensure pristine rendering.
 */
export async function imageToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) return url;

  // Prefer pre-rasterized high-res PNG for the foundation logo to guarantee non-tainted canvas
  const resolvedUrl = url.includes('logo.svg') ? '/assets/logo.png' : url;

  try {
    const response = await fetch(resolvedUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(resolvedUrl);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    // If fetch fails, try image-to-canvas conversion
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 200;
          c.height = img.naturalHeight || 200;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          // ignore
        }
        resolve(resolvedUrl);
      };
      img.onerror = () => {
        // Transparent fallback pixel so canvas export never fails
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
      };
      img.src = resolvedUrl;
    });
  }
}

/**
 * Accurately parses number or percentage strings (e.g. "50%", "0.5", "180deg")
 */
function parseColorNumber(val: string, max: number = 1): number {
  const trimmed = val.trim();
  if (trimmed.endsWith('%')) {
    return (parseFloat(trimmed) / 100) * max;
  }
  return parseFloat(trimmed);
}

/**
 * Converts Oklab coordinates (L, a, b) to standard sRGB rgb() / rgba() string
 */
function oklabToRgb(L: number, a: number, b: number, alpha: number = 1): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767434036 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toSRGB = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const R = Math.round(toSRGB(r) * 255);
  const G = Math.round(toSRGB(g) * 255);
  const B = Math.round(toSRGB(bl) * 255);
  const A = Math.round(Math.max(0, Math.min(1, alpha)) * 1000) / 1000;

  if (A < 1) {
    return `rgba(${R}, ${G}, ${B}, ${A})`;
  }
  return `rgb(${R}, ${G}, ${B})`;
}

/**
 * Converts Oklch coordinates (L, C, H) to standard sRGB rgb() / rgba() string
 */
function oklchToRgb(L: number, C: number, H: number, alpha: number = 1): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b, alpha);
}

/**
 * Normalizes all oklab(...) and oklch(...) occurrences in any CSS value (colors, borders, gradients, shadows)
 */
export function convertOklabAndOklchInString(input: string): string {
  if (!input || (!input.includes('oklab') && !input.includes('oklch'))) {
    return input;
  }

  return input.replace(/\b(oklab|oklch)\(([^)]+)\)/gi, (match, type, content) => {
    try {
      let parts = content.trim();
      let alpha = 1;
      if (parts.includes('/')) {
        const splitSlash = parts.split('/');
        parts = splitSlash[0].trim();
        alpha = parseColorNumber(splitSlash[1].trim(), 1);
      }
      const rawTokens = parts.split(/[\s,]+/).filter(Boolean);
      if (rawTokens.length < 3) return match;

      const L = parseColorNumber(rawTokens[0], 1);
      if (type.toLowerCase() === 'oklab') {
        const a = parseColorNumber(rawTokens[1], 0.4);
        const b = parseColorNumber(rawTokens[2], 0.4);
        return oklabToRgb(L, a, b, alpha);
      } else {
        const C = parseColorNumber(rawTokens[1], 0.4);
        const hStr = rawTokens[2].trim();
        let H = parseFloat(hStr);
        if (hStr.endsWith('turn')) H = H * 360;
        else if (hStr.endsWith('rad')) H = (H * 180) / Math.PI;
        else if (hStr.endsWith('grad')) H = (H * 360) / 400;
        return oklchToRgb(L, C, H, alpha);
      }
    } catch {
      return match;
    }
  });
}

/**
 * Traverses an element and all descendants, converting any computed or inline
 * oklab/oklch colors to browser-supported rgb()/rgba() styles.
 */
export function normalizeColorsInElementTree(root: HTMLElement): void {
  if (!root) return;
  const win = root.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  if (!win) return;

  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const colorProps = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'box-shadow',
    'text-shadow',
    'fill',
    'stroke',
    'stop-color',
    'background-image',
  ];

  for (const el of elements) {
    if (!el || !el.style) continue;
    try {
      const computed = win.getComputedStyle(el);
      for (const prop of colorProps) {
        const val = computed.getPropertyValue(prop);
        if (val && (val.includes('oklab') || val.includes('oklch'))) {
          const converted = convertOklabAndOklchInString(val);
          el.style.setProperty(prop, converted, 'important');
        }
      }
      if (el.style.cssText && (el.style.cssText.includes('oklab') || el.style.cssText.includes('oklch'))) {
        el.style.cssText = convertOklabAndOklchInString(el.style.cssText);
      }
    } catch (err) {
      console.warn('Error normalizing colors for receipt element:', err);
    }
  }
}

/**
 * Prepares an offscreen element clone for high-fidelity canvas rasterization:
 * - Awaits web fonts (document.fonts.ready)
 * - Inlines all images as data URLs
 * - Normalizes oklab/oklch colors to standard rgb/rgba
 * - Keeps opacity: 1 and visibility: visible so html2canvas renders all pixels
 * - Places offscreen at z-index: -9999 so user does not see flickering
 */
async function prepareElementInSandbox(sourceElement: HTMLElement): Promise<{
  clone: HTMLElement;
  sandbox: HTMLElement;
  cleanup: () => void;
}> {
  // 1. Wait for web fonts (Bangla Kalpurush, Noto Sans, Hind Siliguri)
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await Promise.allSettled([
        document.fonts.load('400 14px "Hind Siliguri"'),
        document.fonts.load('500 12px "Hind Siliguri"'),
        document.fonts.load('600 14px "Hind Siliguri"'),
        document.fonts.load('700 14px "Hind Siliguri"'),
        document.fonts.load('700 18px "Hind Siliguri"'),
        document.fonts.load('800 30px "Hind Siliguri"'),
        document.fonts.load('400 14px "Noto Sans Bengali"'),
        document.fonts.load('500 12px "Noto Sans Bengali"'),
        document.fonts.load('600 14px "Noto Sans Bengali"'),
        document.fonts.load('700 14px "Noto Sans Bengali"'),
      ]);
      await document.fonts.ready;
    } catch (e) {
      // continue
    }
  }

  // 2. Create offscreen container with OPACITY 1 (opacity: 0 makes html2canvas render blank!)
  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '0';
  sandbox.style.top = '0';
  sandbox.style.zIndex = '-9999';
  sandbox.style.width = '680px';
  sandbox.style.minWidth = '680px';
  sandbox.style.maxWidth = '680px';
  sandbox.style.opacity = '1';
  sandbox.style.visibility = 'visible';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.transform = 'none';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.overflow = 'visible';
  sandbox.style.boxSizing = 'border-box';
  sandbox.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif";
  sandbox.style.lineHeight = '1.6';
  sandbox.style.setProperty('-webkit-font-smoothing', 'antialiased');
  sandbox.style.setProperty('text-rendering', 'optimizeLegibility');

  // 3. Clone source element with fixed 680px geometry and visible overflow
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0 auto';
  clone.style.width = '680px';
  clone.style.minWidth = '680px';
  clone.style.maxWidth = '680px';
  clone.style.height = 'auto';
  clone.style.minHeight = 'auto';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif";
  clone.style.lineHeight = '1.6';
  clone.style.setProperty('-webkit-font-smoothing', 'antialiased');
  clone.style.setProperty('text-rendering', 'optimizeLegibility');

  // 4. Preload, inline, and await decoding of all images
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      img.style.filter = 'none';
      if (img.src) {
        try {
          const dataUrl = await imageToDataUrl(img.src);
          img.src = dataUrl;
          if ('decode' in img) {
            await img.decode();
          }
        } catch {
          // continue gracefully if decode fails
        }
      }
    })
  );

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // 5. Convert any computed oklab/oklch colors in the cloned tree to standard rgb/rgba
  normalizeColorsInElementTree(clone);

  // Short settling delay for DOM layout calculation and font rendering
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {}
  }
  await new Promise((r) => setTimeout(r, 120));

  const cleanup = () => {
    if (document.body.contains(sandbox)) {
      document.body.removeChild(sandbox);
    }
  };

  return { clone, sandbox, cleanup };
}

export interface DownloadReceiptOptions {
  element: HTMLElement;
  filename: string;
  format: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Captures an HTML element and triggers a direct browser download.
 * Guaranteed not to taint canvas or crash on unsupported oklab/oklch colors.
 */
export async function downloadReceiptElement({
  element,
  filename,
  format,
  quality = 0.98,
}: DownloadReceiptOptions): Promise<void> {
  const { clone, cleanup } = await prepareElementInSandbox(element);

  try {
    const rect = clone.getBoundingClientRect();
    const naturalHeight = Math.ceil(Math.max(clone.offsetHeight, clone.scrollHeight, rect.height, 700));
    // 14px safety buffer to ensure bottom borders, signatures, and descenders are never clipped
    const targetHeight = naturalHeight + 14;

    const canvas = await html2canvas(clone, {
      scale: 2.5, // 2.5x high-res rendering for print-level sharpness
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: 680,
      height: targetHeight,
      windowWidth: 680,
      windowHeight: targetHeight,
      onclone: (_clonedDoc, clonedEl) => {
        clonedEl.style.width = '680px';
        clonedEl.style.minWidth = '680px';
        clonedEl.style.maxWidth = '680px';
        clonedEl.style.height = `${targetHeight}px`;
        clonedEl.style.overflow = 'visible';
        clonedEl.style.boxSizing = 'border-box';
        clonedEl.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif";
        clonedEl.style.lineHeight = '1.6';
        clonedEl.style.setProperty('-webkit-font-smoothing', 'antialiased');
        clonedEl.style.setProperty('text-rendering', 'optimizeLegibility');
        normalizeColorsInElementTree(clonedEl);
      },
    });

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    // Export via Blob with fallback to dataURL
    let blob: Blob | null = null;
    try {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), mimeType, quality)
      );
    } catch (e) {
      // toBlob failed, will fallback to dataURL below
    }

    if (!blob) {
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const res = await fetch(dataUrl);
      blob = await res.blob();
    }

    if (!blob || blob.size === 0) {
      throw new Error('Canvas export produced empty blob');
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.${ext}`;
    link.href = objectUrl;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Keep object URL alive for 60 seconds so browser download is not cancelled prematurely
    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }, 60000);
  } finally {
    cleanup();
  }
}

export interface BatchReceiptItem {
  element: HTMLElement;
  filename: string;
  format: 'png' | 'jpeg';
}

/**
 * Downloads multiple receipt elements into a single ZIP archive.
 */
export async function downloadReceiptsZip(
  items: BatchReceiptItem[],
  zipFilename: string
): Promise<void> {
  const zip = new JSZip();

  for (const item of items) {
    const { clone, cleanup } = await prepareElementInSandbox(item.element);
    try {
      const rect = clone.getBoundingClientRect();
      const naturalHeight = Math.ceil(Math.max(clone.offsetHeight, clone.scrollHeight, rect.height, 700));
      const targetHeight = naturalHeight + 14;

      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: 680,
        height: targetHeight,
        windowWidth: 680,
        windowHeight: targetHeight,
        onclone: (_clonedDoc, clonedEl) => {
          clonedEl.style.width = '680px';
          clonedEl.style.minWidth = '680px';
          clonedEl.style.maxWidth = '680px';
          clonedEl.style.height = `${targetHeight}px`;
          clonedEl.style.overflow = 'visible';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif";
          clonedEl.style.lineHeight = '1.6';
          clonedEl.style.setProperty('-webkit-font-smoothing', 'antialiased');
          clonedEl.style.setProperty('text-rendering', 'optimizeLegibility');
          normalizeColorsInElementTree(clonedEl);
        },
      });

      const mimeType = item.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = item.format === 'jpeg' ? 'jpg' : 'png';

      let blob: Blob | null = null;
      try {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), mimeType, 0.95)
        );
      } catch {}

      if (!blob) {
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }

      if (blob && blob.size > 0) {
        const arrayBuffer = await blob.arrayBuffer();
        zip.file(`${item.filename}.${ext}`, arrayBuffer);
      }
    } finally {
      cleanup();
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${zipFilename}.zip`;
  link.target = '_self';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {}
  }, 60000);
}
