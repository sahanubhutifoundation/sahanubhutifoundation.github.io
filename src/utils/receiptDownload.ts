import html2canvas from 'html2canvas';
import JSZip from 'jszip';

export interface DownloadReceiptOptions {
  element: HTMLElement;
  filename: string;
  format: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Captures an HTML element and triggers a direct browser download.
 */
export async function downloadReceiptElement({
  element,
  filename,
  format,
  quality = 0.95,
}: DownloadReceiptOptions): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2.5, // 2.5x high-res rendering for print-level sharpness
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const link = document.createElement('a');
  link.download = `${filename}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    const canvas = await html2canvas(item.element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const mimeType = item.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    const base64Data = dataUrl.split(',')[1];
    const ext = item.format === 'jpeg' ? 'jpg' : 'png';
    zip.file(`${item.filename}.${ext}`, base64Data, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${zipFilename}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
