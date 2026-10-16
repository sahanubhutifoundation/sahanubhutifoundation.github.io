import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSocialPreviewImage } from './generateSocialPreview';

/**
 * Synchronizes the canonical social share image at public/assets/og-preview.png.
 * 
 * Supports:
 * - MODE A (auto): Uses the authoritative branded share card selected/generated in Admin,
 *   or generates a fresh 1200x630 branded card using live config (official bilingual names & logo).
 * - MODE B (custom): Downloads/copies the exact admin-uploaded custom image bytes
 *   directly into public/assets/og-preview.png without modifying or overlaying it.
 * 
 * Invoked during GitHub Actions workflow builds and manual sync dispatches.
 */
export async function syncSocialPreviewAsset(): Promise<void> {
  const outputPath = path.resolve(process.cwd(), 'public/assets/og-preview.png');
  const distDir = path.resolve(process.cwd(), 'dist/assets');
  const distPath = path.resolve(distDir, 'og-preview.png');

  console.log('[sync-asset] Starting Social Preview asset synchronization...');

  let config: any = null;

  // 1. Try to load bundled initialConfig
  try {
    const initialMod = await import('../src/data/initialData.ts').catch(() => null) ||
                       await import('../src/data/initialData.js').catch(() => null);
    if (initialMod?.initialConfig) {
      config = { ...initialMod.initialConfig };
    }
  } catch (err) {
    console.warn('[sync-asset] Note: error reading initialData:', err);
  }

  // 2. Fetch live config from Supabase if credentials are present
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oskmpyuofgiivprcojfh.supabase.co';
  const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      console.log(`[sync-asset] Querying Supabase at ${supabaseUrl} for latest site_settings...`);
      const response = await fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.foundation_primary_config&select=config`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.config) {
          config = { ...(config || {}), ...rows[0].config };
          console.log('[sync-asset] Successfully retrieved live config from Supabase.');
        }
      } else {
        console.warn(`[sync-asset] Supabase response not OK (${response.status}): ${response.statusText}`);
      }
    } catch (err) {
      console.warn('[sync-asset] Could not reach Supabase (using local/bundled config):', err);
    }
  }

  // 3. Resolve Effective Mode and Image URL
  const dispatchMode = process.env.DISPATCH_MODE;
  const dispatchImageUrl = process.env.DISPATCH_IMAGE_URL;

  const mode: 'auto' | 'custom' = (dispatchMode === 'custom' || config?.socialSharePreview?.mode === 'custom')
    ? 'custom'
    : 'auto';

  console.log(`[sync-asset] Effective Social Preview Mode: "${mode}"`);

  // Helper to safely write image buffer to both public and dist assets
  function commitImageBuffer(buffer: Buffer, label: string): boolean {
    if (!buffer || buffer.length === 0) return false;

    // Validate standard PNG / JPEG signature
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8;
    if (!isPng && !isJpg) {
      console.warn(`[sync-asset] Warning: Buffer does not start with standard PNG/JPEG header (length: ${buffer.length}).`);
    }

    // Ensure output directories exist
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`[sync-asset] Successfully written to ${outputPath} (${buffer.length} bytes, SHA256: ${hash.substring(0, 16)}...)`);

    if (fs.existsSync(distDir)) {
      fs.writeFileSync(distPath, buffer);
      console.log(`[sync-asset] Synchronized copy to ${distPath}`);
    }
    return true;
  }

  // Helper to download or decode image from URL / data URI
  async function downloadImage(url: string, label: string): Promise<Buffer | null> {
    try {
      console.log(`[sync-asset] Downloading ${label} from: ${url.substring(0, 90)}...`);
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        if (base64Data) {
          return Buffer.from(base64Data, 'base64');
        }
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status} fetching image`);
        }
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      } else if (fs.existsSync(url)) {
        return fs.readFileSync(url);
      }
    } catch (err) {
      console.error(`[sync-asset] Error downloading ${label}:`, err);
    }
    return null;
  }

  // 4. Handle MODE B (CUSTOM UPLOAD)
  if (mode === 'custom') {
    const customUrl = dispatchImageUrl ||
                      config?.socialSharePreview?.customImageUrl ||
                      config?.socialSharePreview?.imageUrl;

    if (customUrl && customUrl.trim().length > 0 && !customUrl.includes('/assets/og-preview.png')) {
      const customBuf = await downloadImage(customUrl.trim(), 'Custom Social Preview Image');
      if (customBuf && commitImageBuffer(customBuf, 'Custom Image')) {
        return;
      }
    }

    // If already exists locally with custom content, preserve it
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log(`[sync-asset] Retaining existing custom image at ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
      if (fs.existsSync(distDir)) {
        fs.copyFileSync(outputPath, distPath);
      }
      return;
    }
  }

  // 5. Handle MODE A (AUTO GENERATED BRANDED CARD)
  // Check if Admin's canvas generated a branded card stored in Supabase
  const autoUrl = dispatchImageUrl ||
                  config?.socialSharePreview?.autoGeneratedImageUrl ||
                  (config?.socialSharePreview?.imageUrl?.startsWith('http') && !config.socialSharePreview.imageUrl.includes('/assets/og-preview.png')
                    ? config.socialSharePreview.imageUrl
                    : null);

  if (autoUrl && autoUrl.trim().length > 0) {
    const autoBuf = await downloadImage(autoUrl.trim(), 'Authoritative Admin Branded Card');
    if (autoBuf && commitImageBuffer(autoBuf, 'Authoritative Branded Card')) {
      return;
    }
  }

  // Fallback: Generate the branded card using generateSocialPreviewImage with live config
  console.log('[sync-asset] Generating official 1200x630 branded card for Mode A using live config...');
  generateSocialPreviewImage(config);

  if (fs.existsSync(outputPath)) {
    const stat = fs.statSync(outputPath);
    console.log(`[sync-asset] Confirmed canonical asset at ${outputPath} (${stat.size} bytes)`);
    if (fs.existsSync(distDir)) {
      fs.copyFileSync(outputPath, distPath);
    }
  } else {
    console.error(`[sync-asset] ERROR: Failed to produce asset at ${outputPath}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncSocialPreviewAsset().catch((err) => {
    console.error('[sync-asset] Unhandled error:', err);
    process.exit(1);
  });
}
