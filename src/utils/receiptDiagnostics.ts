/**
 * Temporary diagnostic helper to compare the visible preview element and the export clone.
 * Compares getBoundingClientRect, computed styles, and font metrics.
 */

export interface ElementDiagnostic {
  name: string;
  preview: {
    rect: { width: number; height: number; top: number; left: number };
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    padding: string;
    margin: string;
    display: string;
    alignItems: string;
    justifyContent: string;
    verticalAlign: string;
    overflow: string;
    boxSizing: string;
    textAlign: string;
  };
  clone: {
    rect: { width: number; height: number; top: number; left: number };
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    padding: string;
    margin: string;
    display: string;
    alignItems: string;
    justifyContent: string;
    verticalAlign: string;
    overflow: string;
    boxSizing: string;
    textAlign: string;
  };
  diffs: string[];
}

function extractStyles(el: HTMLElement) {
  const win = el.ownerDocument?.defaultView || window;
  const cs = win.getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    rect: {
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height * 100) / 100,
      top: Math.round(r.top * 100) / 100,
      left: Math.round(r.left * 100) / 100,
    },
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
    margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
    display: cs.display,
    alignItems: cs.alignItems,
    justifyContent: cs.justifyContent,
    verticalAlign: cs.verticalAlign,
    overflow: cs.overflow,
    boxSizing: cs.boxSizing,
    textAlign: cs.textAlign,
  };
}

export function compareElements(
  name: string,
  previewEl: HTMLElement | null,
  cloneEl: HTMLElement | null
): ElementDiagnostic | null {
  if (!previewEl || !cloneEl) return null;

  const preview = extractStyles(previewEl);
  const clone = extractStyles(cloneEl);
  const diffs: string[] = [];

  if (Math.abs(preview.rect.width - clone.rect.width) > 1) {
    diffs.push(`width: preview ${preview.rect.width}px vs clone ${clone.rect.width}px`);
  }
  if (Math.abs(preview.rect.height - clone.rect.height) > 1) {
    diffs.push(`height: preview ${preview.rect.height}px vs clone ${clone.rect.height}px`);
  }
  if (preview.fontFamily !== clone.fontFamily) {
    diffs.push(`fontFamily: "${preview.fontFamily}" vs "${clone.fontFamily}"`);
  }
  if (preview.fontSize !== clone.fontSize) {
    diffs.push(`fontSize: ${preview.fontSize} vs ${clone.fontSize}`);
  }
  if (preview.fontWeight !== clone.fontWeight) {
    diffs.push(`fontWeight: ${preview.fontWeight} vs ${clone.fontWeight}`);
  }
  if (preview.lineHeight !== clone.lineHeight) {
    diffs.push(`lineHeight: ${preview.lineHeight} vs ${clone.lineHeight}`);
  }
  if (preview.padding !== clone.padding) {
    diffs.push(`padding: ${preview.padding} vs ${clone.padding}`);
  }
  if (preview.display !== clone.display) {
    diffs.push(`display: ${preview.display} vs ${clone.display}`);
  }
  if (preview.alignItems !== clone.alignItems) {
    diffs.push(`alignItems: ${preview.alignItems} vs ${clone.alignItems}`);
  }

  return { name, preview, clone, diffs };
}

export function runReceiptDiagnostics(
  previewRoot: HTMLElement,
  cloneRoot: HTMLElement
): ElementDiagnostic[] {
  const targets = [
    { name: 'Root Card', selector: '#printable-donation-receipt' },
    { name: 'Title Banner Container', selector: '.bg-gradient-to-r' },
    { name: 'Title Banner Text', selector: '.bg-gradient-to-r span' },
    { name: 'Receipt Meta Grid', selector: '.grid-cols-3' },
    { name: 'Receipt Number Label', selector: '.grid-cols-3 div:nth-child(1) span:first-child' },
    { name: 'Receipt Number Value', selector: '.grid-cols-3 div:nth-child(1) span:last-child' },
    { name: 'Issue Date Value', selector: '.grid-cols-3 div:nth-child(2) span:last-child' },
    { name: 'Period Value', selector: '.grid-cols-3 div:nth-child(3) span:last-child' },
    { name: 'Donor Info Box', selector: '.grid-cols-2' },
    { name: 'Donor Name', selector: '.grid-cols-2 div:first-child div' },
    { name: 'Table Header', selector: 'table thead tr' },
    { name: 'Table Row 1 Desc', selector: 'table tbody tr:first-child td:first-child' },
    { name: 'Table Row 1 Month', selector: 'table tbody tr:first-child td:nth-child(2)' },
    { name: 'Table Row 1 Amount', selector: 'table tbody tr:first-child td:last-child' },
    { name: 'Total Row', selector: 'table tbody tr:last-child' },
    { name: 'Total Label', selector: 'table tbody tr:last-child td:first-child' },
    { name: 'Total Value', selector: 'table tbody tr:last-child td:last-child' },
    { name: 'Amount in Words Box', selector: '.bg-emerald-50\\/70' },
    { name: 'Verification Status Pill', selector: '.border-gray-100' },
    { name: 'Thank You Note', selector: '.border-dashed' },
    { name: 'Signature Label', selector: '.border-emerald-900\\/60 span:first-child' },
  ];

  const results: ElementDiagnostic[] = [];

  for (const t of targets) {
    const pEl = (t.selector === '#printable-donation-receipt'
      ? previewRoot
      : previewRoot.querySelector<HTMLElement>(t.selector)) as HTMLElement | null;
    const cEl = (t.selector === '#printable-donation-receipt'
      ? cloneRoot
      : cloneRoot.querySelector<HTMLElement>(t.selector)) as HTMLElement | null;

    if (pEl && cEl) {
      const diag = compareElements(t.name, pEl, cEl);
      if (diag) results.push(diag);
    }
  }

  return results;
}
