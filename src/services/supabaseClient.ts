import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Strips outer quotes and whitespace from environment variable strings
 */
function cleanEnvString(val: unknown): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

// Environment variables for Supabase - supports standard anon key and newer publishable key naming
const rawSupabaseUrl = cleanEnvString(
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '')
);

const supabaseAnonKey = cleanEnvString(
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  (typeof process !== 'undefined' ? (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_KEY) : '')
);

/**
 * Normalizes Supabase URL by removing any trailing /rest/v1 or trailing slashes,
 * ensuring auth, storage, realtime, and rest endpoints all work smoothly.
 */
function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = cleanEnvString(url);
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

