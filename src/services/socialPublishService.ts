import { getSupabase } from './supabaseClient';
import { authService } from './authService';

export interface PublishResult {
  success: boolean;
  status: 'saved_only' | 'pending' | 'success' | 'missing_secret' | 'failed';
  message: string;
  details?: string;
  setupGuide?: {
    title: string;
    step1: string;
    step2: string;
    manualAlternative: string;
  };
}

export const socialPublishService = {
  /**
   * Invokes the secure server-side publishing pipeline to update public/assets/og-preview.png in GitHub.
   * A public browser never touches or receives a GitHub token.
   */
  async triggerPublish(options: {
    mode: 'auto' | 'custom';
    imageUrl?: string;
  }): Promise<PublishResult> {
    if (!authService.isAuthenticated()) {
      return {
        success: false,
        status: 'failed',
        message: 'পাবলিশ করার জন্য অ্যাডমিন লগইন থাকা আবশ্যক।',
      };
    }

    try {
      const supabase = getSupabase();
      // If Supabase client is initialized, attempt edge function dispatch
      if (supabase) {
        const sessionToken = authService.getSessionToken() || '';
        const { data, error } = await supabase.functions.invoke('publish-social-preview', {
          body: {
            mode: options.mode,
            imageUrl: options.imageUrl,
          },
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (error) {
          console.warn('[socialPublish] Edge function returned error/not deployed:', error);
          return {
            success: false,
            status: 'missing_secret',
            message: 'সার্ভার-সাইড এজ ফাংশন বা GitHub টোকেন সিক্রেট সেটআপ সম্পন্ন হয়নি।',
            details: error.message || 'Supabase Edge Function not reachable.',
            setupGuide: {
              title: 'GitHub Actions Server Dispatch Setup',
              step1: 'Create a fine-grained GitHub PAT with "Actions: Read and write" and "Contents: Read and write" permissions.',
              step2: 'Add GITHUB_PAT into Supabase Project Settings -> Secrets.',
              manualAlternative: 'You can also trigger "Deploy to GitHub Pages" manually from the GitHub Actions tab.',
            },
          };
        }

        if (data?.status === 'missing_secret') {
          return {
            success: false,
            status: 'missing_secret',
            message: data.message || 'GitHub PAT সিক্রেট সেটআপ করা নেই।',
            setupGuide: data.setupGuide,
          };
        }

        if (data?.success) {
          return {
            success: true,
            status: 'success',
            message: data.message || 'GitHub Actions পাবলিশিং ওয়ার্কফ্লো সফলভাবে শুরু হয়েছে।',
          };
        }

        return {
          success: false,
          status: 'failed',
          message: data?.message || 'পাবলিশিং ওয়ার্কফ্লো চালু করতে সমস্যা হয়েছে।',
          details: data?.statusCode ? `Status code: ${data.statusCode}` : undefined,
        };
      }

      // Supabase client not configured
      return {
        success: false,
        status: 'missing_secret',
        message: 'সেটিংস সংরক্ষিত হয়েছে। তবে সরাসরি স্বয়ংক্রিয় পাবলিশিংয়ের জন্য Supabase সংযোগ আবশ্যক।',
        setupGuide: {
          title: 'GitHub Actions Server Dispatch Setup',
          step1: 'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.',
          step2: 'Configure GITHUB_PAT in Supabase project secrets.',
          manualAlternative: 'Trigger "Deploy to GitHub Pages" in GitHub Actions tab.',
        },
      };
    } catch (err: any) {
      console.error('[socialPublish] Exception during publish trigger:', err);
      return {
        success: false,
        status: 'failed',
        message: err.message || 'পাবলিশিং প্রক্রিয়া চালু করা যায়নি।',
      };
    }
  },
};
