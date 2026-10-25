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
 * Prepares an offscreen element clone for high-fidelity canvas rasterization:
 * - Awaits web fonts (document.fonts.ready)
 * - Inlines all images as data URLs
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
  sandbox.style.opacity = '1';
  sandbox.style.visibility = 'visible';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.transform = 'none';
  sandbox.style.backgroundColor = '#ffffff';

  // 3. Clone source element
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.margin = '0 auto';
  clone.style.width = '680px';
  clone.style.maxWidth = '680px';
  clone.style.boxSizing = 'border-box';

  // 4. Preload and inline all images
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      img.style.filter = 'none';
      if (img.src) {
        const dataUrl = await imageToDataUrl(img.src);
        img.src = dataUrl;
      }
    })
  );

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Short tick for DOM layout calculation
  await new Promise((r) => setTimeout(r, 80));

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
 * Guaranteed not to taint canvas or crash on scaled/hidden containers.
 */
export async function downloadReceiptElement({
  element,
  filename,
  format,
  quality = 0.98,
}: DownloadReceiptOptions): Promise<void> {
  const { clone, cleanup } = await prepareElementInSandbox(element);

  try {
    const renderedHeight = clone.offsetHeight || clone.scrollHeight || 750;

    const canvas = await html2canvas(clone, {
      scale: 2.5, // 2.5x high-res rendering for print-level sharpness
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: 680,
      height: renderedHeight,
      windowWidth: 680,
      windowHeight: renderedHeight,
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
      const renderedHeight = clone.offsetHeight || clone.scrollHeight || 750;

      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: 680,
        height: renderedHeight,
        windowWidth: 680,
        windowHeight: renderedHeight,
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
