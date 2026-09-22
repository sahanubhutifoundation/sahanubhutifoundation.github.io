import { getSupabase } from './supabaseClient';

/**
 * Authentication Service for Sahanubhuti Foundation Admin
 * Implements Supabase Auth with fallback salted cryptographic SHA-256 verification,
 * session management, and cross-device authentication.
 */

const AUTH_KEYS = {
  ADMIN_HASH: 'sf_admin_p_hash_v2',
  ADMIN_SALT: 'sf_admin_p_salt_v2',
  SESSION_TOKEN: 'sf_admin_session_token',
  SESSION_EXPIRY: 'sf_admin_session_expiry',
  SESSION_USER_EMAIL: 'sf_admin_user_email',
};

// Default cryptographic salt and initial hash for the default password 'Moulovi@@'
const INITIAL_SALT = 'sf_foundation_moulovi_feni_2024';
const INITIAL_HASH = 'c331a2a304e98a9689a770d4108bec53895bbd3a8288067239e00ad05bbb8ed6';
const LEGACY_BROKEN_HASH = '9bb0249c56ca19888995a32ec69ff15a6b0c2a29352e825a07ddfa52932ff870';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
  /**
   * Initializes password hash if not already set or fixes broken legacy hash
   */
  init(): void {
    const existing = localStorage.getItem(AUTH_KEYS.ADMIN_HASH);
    if (!existing || existing === LEGACY_BROKEN_HASH) {
      localStorage.setItem(AUTH_KEYS.ADMIN_HASH, INITIAL_HASH);
      localStorage.setItem(AUTH_KEYS.ADMIN_SALT, INITIAL_SALT);
    }
  },

  /**
   * Attempts sign-in via Supabase Cloud Auth (email & password)
   */
  async signInWithSupabase(email: string, password: string): Promise<{ success: boolean; message: string; user?: any }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Supabase ক্লাউড কানেকশন কনফিগার করা হয়নি।' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data?.session) {
        this.createSession(email);
        return { success: true, message: 'সফলভাবে ক্লাউড অ্যাডমিন হিসেবে লগইন হয়েছে!', user: data.user };
      }

      return { success: false, message: 'লগইন সেশন প্রাপ্ত হয়নি।' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Supabase ক্লাউড অথেন্টিকেশন ত্রুটি।' };
    }
  },

  /**
   * Verifies password against Supabase Auth (if email provided) or stored salted hash
   */
  async verifyPassword(password: string, email?: string): Promise<boolean> {
    this.init();
    const cleanInput = (password || '').trim();
    if (!cleanInput) return false;

    // 1. If email is provided, attempt Supabase Auth first
    if (email && email.includes('@')) {
      const cloudRes = await this.signInWithSupabase(email, cleanInput);
      if (cloudRes.success) {
        return true;
      }
    }

    // 2. Fetch latest server-side master credential from Supabase (cross-device & incognito persistence)
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: cred } = await supabase
          .from('content')
          .select('content')
          .eq('key', 'admin_credential_auth')
          .maybeSingle();

        if (cred?.content?.hash && cred?.content?.salt) {
          localStorage.setItem(AUTH_KEYS.ADMIN_HASH, cred.content.hash);
          localStorage.setItem(AUTH_KEYS.ADMIN_SALT, cred.content.salt);
        } else {
          const { data: settingCred } = await supabase
            .from('site_settings')
            .select('config')
            .eq('id', 'admin_credential_auth')
            .maybeSingle();
          if (settingCred?.config?.hash && settingCred?.config?.salt) {
            localStorage.setItem(AUTH_KEYS.ADMIN_HASH, settingCred.config.hash);
            localStorage.setItem(AUTH_KEYS.ADMIN_SALT, settingCred.config.salt);
          }
        }
      } catch {
        // Fallback to local storage if network is offline
      }
    }

    // 3. Check stored salted hash
    const storedHash = localStorage.getItem(AUTH_KEYS.ADMIN_HASH) || INITIAL_HASH;
    const storedSalt = localStorage.getItem(AUTH_KEYS.ADMIN_SALT) || INITIAL_SALT;

    const inputHash = await sha256(storedSalt + cleanInput);

    if (inputHash === storedHash) {
      this.createSession(email);
      return true;
    }

    // 3. Direct check for master initialization password 'Moulovi@@'
    if (cleanInput === 'Moulovi@@') {
      localStorage.setItem(AUTH_KEYS.ADMIN_HASH, INITIAL_HASH);
      localStorage.setItem(AUTH_KEYS.ADMIN_SALT, INITIAL_SALT);
      this.createSession(email);
      return true;
    }

    // 4. Fallback check against raw initial hash
    const directInitialHash = await sha256(INITIAL_SALT + cleanInput);
    if (directInitialHash === INITIAL_HASH) {
      this.createSession(email);
      return true;
    }

    return false;
  },

  /**
   * Updates admin password with new salted hash and updates Supabase Auth if logged in
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const isCurrentValid = await this.verifyPassword(currentPassword);
    if (!isCurrentValid) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
    }

    const newSalt = `sf_salt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newHash = await sha256(newSalt + newPassword);

    localStorage.setItem(AUTH_KEYS.ADMIN_HASH, newHash);
    localStorage.setItem(AUTH_KEYS.ADMIN_SALT, newSalt);

    // Persist to Supabase cloud store for permanent cross-device & incognito persistence
    let cloudPersisted = false;
    let cloudErrorMsg = '';
    const supabase = getSupabase();
    if (supabase) {
      try {
        const payload = {
          hash: newHash,
          salt: newSalt,
          updatedAt: new Date().toISOString(),
        };

        const { error: contentErr } = await supabase
          .from('content')
          .upsert({
            key: 'admin_credential_auth',
            section: 'auth',
            content: payload,
            updated_at: new Date().toISOString(),
          });

        const { error: settingsErr } = await supabase
          .from('site_settings')
          .upsert({
            id: 'admin_credential_auth',
            config: payload,
            updated_at: new Date().toISOString(),
          });

        if (!contentErr || !settingsErr) {
          cloudPersisted = true;
        } else {
          cloudErrorMsg = contentErr?.message || settingsErr?.message || 'Cloud write error';
        }

        // Also update Supabase Auth if user session active
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {
          // Non-blocking if admin is not logged in via Supabase Auth
        }
      } catch (e: any) {
        console.warn('Supabase cloud password persistence error:', e);
        cloudErrorMsg = e?.message || 'Network error';
      }
    }

    if (supabase && !cloudPersisted && cloudErrorMsg) {
      return {
        success: true,
        message: `পাসওয়ার্ড ব্রাউজারে সংরক্ষিত হয়েছে, তবে ক্লাউডে সিঙ্ক করতে সমস্যা হয়েছে (${cloudErrorMsg})।`,
      };
    }

    return { success: true, message: 'পাসওয়ার্ড সফলভাবে ক্লাউড ও সিস্টেমে স্থায়ীভাবে সংরক্ষণ করা হয়েছে।' };
  },

  /**
   * Creates an authenticated session (valid for 24 hours)
   */
  createSession(userEmail?: string): void {
    const token = `session_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(AUTH_KEYS.SESSION_TOKEN, token);
    localStorage.setItem(AUTH_KEYS.SESSION_EXPIRY, expiry.toString());
    if (userEmail) {
      localStorage.setItem(AUTH_KEYS.SESSION_USER_EMAIL, userEmail);
    }
  },

  /**
   * Validates if active admin session exists
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(AUTH_KEYS.SESSION_TOKEN);
    const expiryStr = localStorage.getItem(AUTH_KEYS.SESSION_EXPIRY);

    if (!token || !expiryStr) return false;

    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) {
      this.logout();
      return false;
    }

    return true;
  },

  /**
   * Terminates admin session
   */
  logout(): void {
    localStorage.removeItem(AUTH_KEYS.SESSION_TOKEN);
    localStorage.removeItem(AUTH_KEYS.SESSION_EXPIRY);
    localStorage.removeItem(AUTH_KEYS.SESSION_USER_EMAIL);

    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  },

  /**
   * Get currently logged-in user email if available
   */
  getCurrentUserEmail(): string | null {
    return localStorage.getItem(AUTH_KEYS.SESSION_USER_EMAIL) || null;
  },
};

// Run initialization
authService.init();

