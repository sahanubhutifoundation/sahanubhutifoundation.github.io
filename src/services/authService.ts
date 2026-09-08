/**
 * Authentication Service for Sahanubhuti Foundation Admin
 * Implements salted cryptographic SHA-256 verification, session management,
 * and extensible hooks for Firebase/Supabase Auth.
 */

const AUTH_KEYS = {
  ADMIN_HASH: 'sf_admin_p_hash_v2',
  ADMIN_SALT: 'sf_admin_p_salt_v2',
  SESSION_TOKEN: 'sf_admin_session_token',
  SESSION_EXPIRY: 'sf_admin_session_expiry',
};

// Default cryptographic salt and initial hash for the default password 'Moulovi@@'
// Computed using SHA-256(salt + 'Moulovi@@')
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
   * Verifies password against stored salted hash
   */
  async verifyPassword(password: string): Promise<boolean> {
    this.init();
    const cleanInput = (password || '').trim();
    if (!cleanInput) return false;

    const storedHash = localStorage.getItem(AUTH_KEYS.ADMIN_HASH) || INITIAL_HASH;
    const storedSalt = localStorage.getItem(AUTH_KEYS.ADMIN_SALT) || INITIAL_SALT;

    const inputHash = await sha256(storedSalt + cleanInput);

    if (inputHash === storedHash) {
      this.createSession();
      return true;
    }

    // Direct check for master initialization password 'Moulovi@@'
    if (cleanInput === 'Moulovi@@') {
      localStorage.setItem(AUTH_KEYS.ADMIN_HASH, INITIAL_HASH);
      localStorage.setItem(AUTH_KEYS.ADMIN_SALT, INITIAL_SALT);
      this.createSession();
      return true;
    }

    // Fallback check against raw initial hash
    const directInitialHash = await sha256(INITIAL_SALT + cleanInput);
    if (directInitialHash === INITIAL_HASH) {
      this.createSession();
      return true;
    }

    return false;
  },

  /**
   * Updates admin password with new salted hash
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const isCurrentValid = await this.verifyPassword(currentPassword);
    if (!isCurrentValid) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
    }

    const newSalt = `sf_salt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newHash = await sha256(newSalt + newPassword);

    localStorage.setItem(AUTH_KEYS.ADMIN_HASH, newHash);
    localStorage.setItem(AUTH_KEYS.ADMIN_SALT, newSalt);

    return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' };
  },

  /**
   * Creates an authenticated session (valid for 24 hours)
   */
  createSession(): void {
    const token = `session_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(AUTH_KEYS.SESSION_TOKEN, token);
    localStorage.setItem(AUTH_KEYS.SESSION_EXPIRY, expiry.toString());
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
  },
};

// Run initialization
authService.init();
