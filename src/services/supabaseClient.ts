import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

/**
 * Normalizes Supabase URL by removing any trailing /rest/v1 or trailing slashes,
 * ensuring auth, storage, realtime, and rest endpoints all work smoothly.
 */
function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest/v1/
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  return cleaned.replace(/\/+$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

let clientInstance: SupabaseClient | null = null;

/**
 * Check if valid Supabase credentials have been configured in the environment
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
}

/**
 * Returns configuration details (sanitized) for display in Admin panel
 */
export function getSupabaseConfig(): { url: string; hasKey: boolean; isConfigured: boolean } {
  return {
    url: supabaseUrl,
    hasKey: Boolean(supabaseAnonKey),
    isConfigured: isSupabaseConfigured(),
  };
}

/**
 * Get the Supabase client instance (lazily initialized)
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
}

