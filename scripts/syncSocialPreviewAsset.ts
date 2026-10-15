import fs from 'fs';
import path from 'path';
import { generateSocialPreviewImage } from './generateSocialPreview';

/**
 * Synchronizes the canonical social share image at public/assets/og-preview.png.
 * 
 * Supports:
 * - MODE A (auto): Generates the 1200x630 branded card using official SVG logo, bilingual names, and mission statement.
 * - MODE B (custom): Downloads/copies the admin-uploaded custom image directly into public/assets/og-preview.png.
 * 
 * Invoked during GitHub Actions workflow builds and manual sync dispatches.
 */
async function syncSocialPreviewAsset(): Promise<void> {
  const outputPath = path.resolve(process.cwd(), 'public/assets/og-preview.png');
  const distPath = path.resolve(process.cwd(), 'dist/assets/og-preview.png');

  console.log('[sync-asset] Starting Social Preview asset synchronization...');

  let config: any = null;

  // 1. Try to load bundled initialConfig
  try {
    const initialMod = await import('../src/data/initialData.ts').catch(() => null) ||
                       await import('../src/data/initialData.js').catch(() => null);
    if (initialMod?.initialConfig) {
      config = initialMod.initialConfig;
    }
  } catch (err) {
    console.warn('[sync-asset] Note: error reading initialData:', err);
  }

  // 2. Try to fetch live config from Supabase if credentials are present in env
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      console.log('[sync-asset] Querying Supabase for latest site_settings...');
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
      }
    } catch (err) {
      console.warn('[sync-asset] Could not reach Supabase (using bundled config):', err);
    }
  }

  // 3. Check for workflow_dispatch overrides
  const dispatchMode = process.env.DISPATCH_MODE;
  const dispatchImageUrl = process.env.DISPATCH_IMAGE_URL;

  const mode = dispatchMode || config?.socialSharePreview?.mode || 'auto';
  const customUrl = dispatchImageUrl || config?.socialSharePreview?.customImageUrl;

  console.log(`[sync-asset] Effective Social Preview Mode: "${mode}"`);

  if (mode === 'custom' && customUrl && customUrl.trim().length > 0) {
    console.log(`[sync-asset] Processing Custom Image URL: ${customUrl.substring(0, 80)}...`);
    try {
      let buffer: Buffer | null = null;

      if (customUrl.startsWith('data:')) {
        // Base64 data URL
        const base64Data = customUrl.split(',')[1];
        if (base64Data) {
          buffer = Buffer.from(base64Data, 'base64');
        }
      } else if (customUrl.startsWith('http://') || customUrl.startsWith('https://')) {
        // Remote URL (e.g. Supabase Storage bucket)
        const res = await fetch(customUrl);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status} fetching image from ${customUrl}`);
        }
        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } else if (fs.existsSync(customUrl)) {
        buffer = fs.readFileSync(customUrl);
      }

      if (buffer && buffer.length > 0) {
        fs.writeFileSync(outputPath, buffer);
        console.log(`[sync-asset] Successfully wrote custom image to ${outputPath} (${buffer.length} bytes)`);

        if (fs.existsSync(path.dirname(distPath))) {
          fs.writeFileSync(distPath, buffer);
        }
        return;
      } else {
        console.warn('[sync-asset] Empty buffer for custom image, falling back to auto-generated card.');
      }
    } catch (err) {
      console.error('[sync-asset] Failed to download custom image, falling back to auto-generation:', err);
    }
  }

  // MODE A: Auto-generate branded 1200x630 card
  console.log('[sync-asset] Generating official 1200x630 branded card for Mode A...');
  generateSocialPreviewImage();

  // Verify file existence
  if (fs.existsSync(outputPath)) {
    const stat = fs.statSync(outputPath);
    console.log(`[sync-asset] Confirmed canonical asset at ${outputPath} (${stat.size} bytes)`);
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
