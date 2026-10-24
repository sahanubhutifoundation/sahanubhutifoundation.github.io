import html2canvas from 'html2canvas';
import JSZip from 'jszip';

/**
 * Converts an image URL into a base64 Data URL to prevent HTML5 canvas CORS tainting.
 * If fetch or CORS fails, provides an inline fallback SVG to ensure export never crashes.
 */
export async function imageToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    // If cross-origin fetch is blocked, fallback to transparent 1x1 png or try direct image load via canvas
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 100;
          c.height = img.naturalHeight || 100;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          // ignore
        }
        resolve(url);
      };
      img.onerror = () => {
        // Return 1x1 transparent png data url so canvas rendering proceeds without taint
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
      };
      img.src = url;
    });
  }
}

/**
 * Pre-processes an HTML element clone for reliable canvas rasterization:
 * - Awaits web fonts (document.fonts.ready)
 * - Converts all <img> tags to inline base64 data URLs
 * - Removes problematic CSS filters (like filter: grayscale)
 * - Mounts inside an unscaled, fixed off-screen sandbox
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

  // 2. Create sandbox container
  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '0';
  sandbox.style.top = '0';
  sandbox.style.zIndex = '-9999';
  sandbox.style.width = '680px';
  sandbox.style.minHeight = '400px';
  sandbox.style.opacity = '0';
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
      // Remove any CSS filters that break html2canvas
      img.style.filter = 'none';
      if (img.src) {
        const dataUrl = await imageToDataUrl(img.src);
        img.src = dataUrl;
      }
    })
  );

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Allow short tick for layout calculation
  await new Promise((r) => setTimeout(r, 60));

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
  quality = 0.96,
}: DownloadReceiptOptions): Promise<void> {
  const { clone, cleanup } = await prepareElementInSandbox(element);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2.5, // 2.5x high-res rendering for print-level sharpness
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: 680,
    });

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';

    // Export via Blob for browser safety and memory stability
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    );

    if (!blob) {
      throw new Error('Canvas toBlob returned null');
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename}.${ext}`;
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 680,
      });

      const mimeType = item.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = item.format === 'jpeg' ? 'jpg' : 'png';

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), mimeType, 0.95)
      );

      if (blob) {
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
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
