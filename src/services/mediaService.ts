/**
 * Persistent Media Storage Service for Sahanubhuti Foundation
 * Handles client-side file upload, image compression, format validation,
 * persistent Data-URL generation, and IndexedDB storage.
 */

const DB_NAME = 'sf_foundation_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

// Initialize IndexedDB with promise wrapper
function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface UploadResult {
  success: boolean;
  url?: string;
  id?: string;
  fileName?: string;
  fileSize?: number;
  type?: 'image' | 'video' | 'doc';
  error?: string;
}

export const mediaService = {
  /**
   * Validate and upload file persistently
   */
  async uploadFile(file: File, options?: { maxSizeBytes?: number; isVideo?: boolean }): Promise<UploadResult> {
    try {
      if (!file) {
        return { success: false, error: 'কোনো ফাইল নির্বাচন করা হয়নি।' };
      }

      const isVideo = options?.isVideo || file.type.startsWith('video/');
      const maxSize = options?.maxSizeBytes || (isVideo ? 35 * 1024 * 1024 : 10 * 1024 * 1024);

      // Check size
      if (file.size > maxSize) {
        const mb = Math.round(maxSize / (1024 * 1024));
        return {
          success: false,
          error: `ফাইলের আকার অতিরিক্ত বড়। অনুগ্রহ করে সর্বোচ্চ ${mb} MB সাইজের ফাইল নির্বাচন করুন।`,
        };
      }

      // Check mime type
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

      if (!isVideo && !validImageTypes.includes(file.type)) {
        return {
          success: false,
          error: 'এই ফাইলটি সমর্থিত নয়। অনুগ্রহ করে JPG, PNG বা WebP ছবি নির্বাচন করুন।',
        };
      }

      if (isVideo && !validVideoTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|ogg|mov)$/i)) {
        return {
          success: false,
          error: 'এই ভিডিও ফরম্যাটটি সমর্থিত নয়। অনুগ্রহ করে MP4 বা WebM ভিডিও নির্বাচন করুন।',
        };
      }

      // Convert to persistent Data URL (with optional canvas compression for oversized JPEG/PNG images)
      let dataUrl: string;
      if (!isVideo && file.type !== 'image/svg+xml' && file.size > 800 * 1024) {
        dataUrl = await this.compressImage(file);
      } else {
        dataUrl = await this.readFileAsDataUrl(file);
      }

      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Save to IndexedDB for longevity
      try {
        const db = await openMediaDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({
          id: mediaId,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          mimeType: file.type,
          dataUrl,
          size: file.size,
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('IndexedDB persistence notice (data URL still active):', dbErr);
      }

      return {
        success: true,
        url: dataUrl,
        id: mediaId,
        fileName: file.name,
        fileSize: file.size,
        type: isVideo ? 'video' : 'image',
      };
    } catch (err: any) {
      console.error('File upload failed:', err);
      return {
        success: false,
        error: 'ফাইল প্রক্রিয়াকরণ ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
      };
    }
  },

  /**
   * Helper: Read file as Data URL
   */
  readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Helper: Compress oversized photos to ~1200px max edge while keeping sharp visual clarity
   */
  compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Cleanup media from IndexedDB if needed
   */
  async deleteMedia(id: string): Promise<void> {
    try {
      const db = await openMediaDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
    } catch (e) {
      console.warn('Could not delete media from IndexedDB:', e);
    }
  },
};
