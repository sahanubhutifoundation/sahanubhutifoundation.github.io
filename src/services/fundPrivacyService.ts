import { storageService } from './storageService';
import { authService } from './authService';
import { FundPrivacySettings } from '../types';

/**
 * Fund Privacy Service
 * Controls PIN-protected access to private monthly contributions, member names,
 * yearly totals, and expense details on the Fund page.
 * Stores only salted cryptographic SHA-256 hashes (never plaintext PINs).
 */

const SESSION_KEY = 'sf_fund_access_grant';
const DEFAULT_SALT = 'sf_fund_pin_salt_moulovi_2024';
const DEFAULT_PIN_HASH = '987d1b556fb4922ebb7b8a18a2dbac1ddc67f058a9c3d9c625ff726174f2f759';
const SECONDARY_INITIAL_HASH = 'c1e13bf45550bbf3975a0f07722ab8db01de137063e38dd78e6164c130275763';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const fundPrivacyService = {
  /**
   * Returns current privacy settings from saved foundation config.
   * Default is enabled = true.
   */
  getSettings(): FundPrivacySettings {
    const config = storageService.getConfig();
    if (!config.fundPrivacy) {
      return {
        isEnabled: true,
        salt: DEFAULT_SALT,
        pinHash: DEFAULT_PIN_HASH,
      };
    }
    return {
      isEnabled: config.fundPrivacy.isEnabled !== false,
      salt: config.fundPrivacy.salt || DEFAULT_SALT,
      pinHash: config.fundPrivacy.pinHash || DEFAULT_PIN_HASH,
      updatedAt: config.fundPrivacy.updatedAt,
    };
  },

  /**
   * Checks whether Fund page protection is enabled.
   */
  isProtectionEnabled(): boolean {
    const settings = this.getSettings();
    return settings.isEnabled;
  },

  /**
   * Checks whether access is currently granted to the visitor.
   * - If protection is disabled -> always true
   * - If logged in as Admin -> always true (automatic bypass)
   * - If session storage has active grant -> true
   */
  isAccessGranted(): boolean {
    if (!this.isProtectionEnabled()) {
      return true;
    }

    // Authenticated admin bypasses PIN
    if (authService.isAuthenticated()) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return sessionStorage.getItem(SESSION_KEY) === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Unlocks the fund page with candidate PIN.
   * Hashes candidate with the active salt and compares against salted hash.
   */
  async verifyAndUnlock(candidatePin: string): Promise<{ success: boolean; error?: string }> {
    const cleanPin = (candidatePin || '').trim();
    if (!cleanPin) {
      return {
        success: false,
        error: 'অনুগ্রহ করে পিন নম্বর প্রদান করুন।',
      };
    }

    const settings = this.getSettings();
    const activeSalt = settings.salt || DEFAULT_SALT;
    const activeHash = settings.pinHash || DEFAULT_PIN_HASH;

    const candidateHash = await sha256(activeSalt + cleanPin);

    // Primary check against active hash
    const isMatch =
      candidateHash === activeHash ||
      // Fallback check against secondary initial hash if using default salt
      (activeSalt === DEFAULT_SALT && candidateHash === SECONDARY_INITIAL_HASH);

    if (isMatch) {
      try {
        sessionStorage.setItem(SESSION_KEY, 'granted');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sf_fund_privacy_changed', { detail: { isUnlocked: true } })
          );
        }
      } catch (e) {
        console.warn('Session storage write error:', e);
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'ভুল পিন নম্বর। অনুগ্রহ করে সঠিক পিন প্রদান করুন।',
    };
  },

  /**
   * Locks the Fund page immediately by clearing the session grant.
   */
  lock(): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
      window.dispatchEvent(
        new CustomEvent('sf_fund_privacy_changed', { detail: { isUnlocked: false } })
      );
    }
  },

  /**
   * Admin-only: Updates Fund privacy protection settings and/or sets a new PIN.
   * Stores ONLY the salted SHA-256 hash. Plaintext PIN is never stored or exposed.
   */
  async updatePrivacySettings(options: {
    isEnabled: boolean;
    newPin?: string;
    confirmPin?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!authService.isAuthenticated()) {
      return {
        success: false,
        message: 'অননুমোদিত অ্যাক্সেস। শুধুমাত্র অ্যাডমিন এই সেটিংস পরিবর্তন করতে পারেন।',
      };
    }

    const currentConfig = storageService.getConfig();
    const currentSettings = this.getSettings();

    let newSalt = currentSettings.salt || DEFAULT_SALT;
    let newHash = currentSettings.pinHash || DEFAULT_PIN_HASH;

    if (options.newPin && options.newPin.trim()) {
      const pin = options.newPin.trim();
      const confirm = (options.confirmPin || '').trim();

      if (pin !== confirm) {
        return {
          success: false,
          message: 'নতুন পিন এবং নিশ্চিতকরণ পিন মিলছে না। অনুগ্রহ করে উভয় ঘরে একই পিন দিন।',
        };
      }

      if (pin.length < 4) {
        return {
          success: false,
          message: 'পিন নম্বর কমপক্ষে ৪ সংখ্যার বা অক্ষরের হতে হবে।',
        };
      }

      // Generate a fresh random cryptographic salt
      newSalt =
        'sf_fund_salt_' +
        Math.random().toString(36).substring(2, 10) +
        '_' +
        Date.now().toString(36);
      newHash = await sha256(newSalt + pin);
    }

    const updatedPrivacy: FundPrivacySettings = {
      isEnabled: options.isEnabled,
      salt: newSalt,
      pinHash: newHash,
      updatedAt: new Date().toISOString(),
    };

    currentConfig.fundPrivacy = updatedPrivacy;
    storageService.saveConfig(currentConfig);

    try {
      await storageService.saveConfigAsync(currentConfig);
    } catch (err) {
      console.warn('Fund privacy save notice:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sf_fund_privacy_changed', {
          detail: { isUnlocked: this.isAccessGranted() },
        })
      );
    }

    return {
      success: true,
      message: 'তহবিল তথ্যের গোপনীয়তা সুরক্ষা সেটিংস সফলভাবে সংরক্ষিত হয়েছে।',
    };
  },
};
