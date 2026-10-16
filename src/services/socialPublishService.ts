import { getSupabase } from './supabaseClient';
import { authService } from './authService';

export type PublishStatusType =
  | 'idle'
  | 'saved_only'
  | 'manual_required'
  | 'pending'
  | 'dispatched'
  | 'running'
  | 'success'
  | 'verified'
  | 'undeployed'
  | 'missing_secret'
  | 'unauthorized'
  | 'github_unauthorized'
  | 'github_forbidden'
  | 'workflow_not_found'
  | 'invalid_ref'
  | 'failed';

export interface PublishResult {
  success: boolean;
  status: PublishStatusType;
  message: string;
  details?: string;
  setupGuide?: {
    title: string;
    step1: string;
    step2: string;
    manualAlternative: string;
  };
  runInfo?: {
    id?: number;
    status?: string;
    conclusion?: string | null;
    html_url?: string;
  };
}

export const socialPublishService = {
  /**
   * Invokes the secure server-side publishing pipeline to update public/assets/og-preview.png in GitHub.
   * Browser callers never touch, transmit, or receive a GitHub token.
   */
  async triggerPublish(options: {
    mode: 'auto' | 'custom';
    imageUrl?: string;
  }): Promise<PublishResult> {
    if (!authService.isAuthenticated()) {
      return {
        success: false,
        status: 'unauthorized',
        message: 'পাবলিশ করার জন্য অ্যাডমিন লগইন থাকা আবশ্যক (401 Unauthorized)।',
      };
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        return {
          success: false,
          status: 'failed',
          message: 'Supabase সংযোগ ক্লায়েন্ট কনফিগার করা নেই। VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY নিশ্চিত করুন।',
        };
      }

      const sessionToken = authService.getSessionToken() || '';
      const { data, error } = await supabase.functions.invoke('publish-social-preview', {
        body: {
          action: 'dispatch',
          mode: options.mode,
          imageUrl: options.imageUrl,
        },
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'x-admin-token': sessionToken,
        },
      });

      // 1. Distinguish Edge Function invocation errors (e.g., undeployed function vs unauthorized)
      if (error) {
        console.warn('[socialPublish] Edge function returned error:', error);

        // Check if the edge function is undeployed (HTTP 404 or missing function)
        const errorMsg = String(error.message || '').toLowerCase();
        const errorStatus = (error as any).context?.status;

        if (errorStatus === 404 || errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('failed to send a request')) {
          return {
            success: false,
            status: 'undeployed',
            message: 'Supabase Edge Function "publish-social-preview" ক্লাউডে ডিপ্লয় করা নেই (404 Not Found)।',
            details: 'Edge Function is not yet deployed in the Supabase project instance.',
            setupGuide: {
              title: 'Supabase Edge Function Deployment Required',
              step1: 'Ensure SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID are added to GitHub Actions secrets.',
              step2: 'Run the ".github/workflows/deploy-supabase-function.yml" workflow in GitHub Actions.',
              manualAlternative: 'Run in terminal: supabase functions deploy publish-social-preview --project-ref "$SUPABASE_PROJECT_ID"',
            },
          };
        }

        if (errorStatus === 401 || errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
          return {
            success: false,
            status: 'unauthorized',
            message: 'অননুমোদিত অনুরোধ: Supabase Auth বা অ্যাডমিন সেশন টোকেন প্রত্যাখ্যাত হয়েছে (401 Unauthorized)।',
          };
        }

        return {
          success: false,
          status: 'failed',
          message: `Supabase Edge Function সংযোগ ব্যর্থ: ${error.message || 'অজানা ত্রুটি'}`,
          details: error.message,
        };
      }

      // 2. Differentiate responses returned by the Edge Function
      if (data?.status === 'missing_secret') {
        return {
          success: false,
          status: 'missing_secret',
          message: data.message || 'Supabase Edge Function সিক্রেটে "GITHUB_PAT" অনুপস্থিত।',
          setupGuide: data.setupGuide || {
            title: 'Supabase Edge Function Secret Required',
            step1: 'Generate a fine-grained GitHub PAT with Actions: Read & write and Contents: Read & write.',
            step2: 'Add GITHUB_PAT to Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets.',
            manualAlternative: 'Run via CLI: supabase secrets set GITHUB_PAT=your_github_token',
          },
        };
      }

      if (data?.status === 'github_unauthorized') {
        return {
          success: false,
          status: 'github_unauthorized',
          message: data.message || 'GitHub Authentication ব্যর্থ (401 Bad credentials)। GITHUB_PAT টোকেনটি যাচাই করুন।',
          details: data.details,
        };
      }

      if (data?.status === 'github_forbidden') {
        return {
          success: false,
          status: 'github_forbidden',
          message: data.message || 'GitHub অ্যাক্সেস প্রত্যাখ্যাত (403 Forbidden)। GITHUB_PAT-এ Actions: write ও Contents: write অনুমতি দিন।',
          details: data.details,
        };
      }

      if (data?.status === 'workflow_not_found') {
        return {
          success: false,
          status: 'workflow_not_found',
          message: data.message || 'GitHub deploy.yml ওয়ার্কফ্লো খুঁজে পাওয়া যায়নি (404 Not Found)।',
          details: data.details,
        };
      }

      if (data?.status === 'invalid_ref') {
        return {
          success: false,
          status: 'invalid_ref',
          message: data.message || 'রিপোজিটরি শাখা বা ব্রাঞ্চ প্রটেকশন রুল ডিসপ্যাচ আটকে দিয়েছে (422)।',
          details: data.details,
        };
      }

      if (data?.success && data?.status === 'dispatched') {
        return {
          success: true,
          status: 'dispatched',
          message: 'GitHub Actions পাবলিশিং ওয়ার্কফ্লো সফলভাবে শুরু হয়েছে (Workflow Dispatched)। ডিপ্লয়মেন্ট চলমান...',
        };
      }

      return {
        success: false,
        status: 'failed',
        message: data?.message || 'পাবলিশিং ওয়ার্কফ্লো চালু করতে সমস্যা হয়েছে।',
        details: data?.details || (data?.statusCode ? `Status code: ${data.statusCode}` : undefined),
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

  /**
   * Polls the real GitHub Actions workflow run status
   */
  async checkWorkflowStatus(): Promise<{
    state: 'queued' | 'running' | 'success' | 'failed' | 'unknown';
    runUrl?: string;
    message?: string;
  }> {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const sessionToken = authService.getSessionToken() || '';
        const { data } = await supabase.functions.invoke('publish-social-preview', {
          body: { action: 'status' },
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'x-admin-token': sessionToken,
          },
        });

        if (data?.run) {
          const run = data.run;
          const status = run.status;
          const conclusion = run.conclusion;

          if (status === 'queued') {
            return { state: 'queued', runUrl: run.html_url, message: 'GitHub Actions সারিতে আছে (Queued)...' };
          }
          if (status === 'in_progress') {
            return { state: 'running', runUrl: run.html_url, message: 'GitHub Actions-এ বিল্ড ও ডিপ্লয়মেন্ট চলমান (Running)...' };
          }
          if (status === 'completed') {
            if (conclusion === 'success') {
              return { state: 'success', runUrl: run.html_url, message: 'GitHub Pages পাবলিকেশন সফলভাবে সম্পন্ন হয়েছে!' };
            }
            return { state: 'failed', runUrl: run.html_url, message: `ডিপ্লয়মেন্ট সম্পন্ন হতে ব্যর্থ হয়েছে (${conclusion || 'failed'})।` };
          }
        }
      }

      // Fallback: public GitHub API for public repo
      const publicRes = await fetch(
        'https://api.github.com/repos/sahanubhutifoundation/sahanubhutifoundation.github.io/actions/workflows/deploy.yml/runs?per_page=1',
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (publicRes.ok) {
        const publicData = await publicRes.json();
        const run = publicData?.workflow_runs?.[0];
        if (run) {
          if (run.status === 'queued') return { state: 'queued', runUrl: run.html_url, message: 'GitHub Actions সারিতে আছে (Queued)...' };
          if (run.status === 'in_progress') return { state: 'running', runUrl: run.html_url, message: 'GitHub Actions-এ বিল্ড ও ডিপ্লয়মেন্ট চলমান...' };
          if (run.status === 'completed') {
            if (run.conclusion === 'success') return { state: 'success', runUrl: run.html_url, message: 'GitHub Pages পাবলিকেশন সফল হয়েছে!' };
            return { state: 'failed', runUrl: run.html_url, message: `GitHub Actions বিল্ড ব্যর্থ (${run.conclusion})` };
          }
        }
      }
    } catch (e) {
      console.warn('[socialPublish] Error checking workflow run:', e);
    }

    return { state: 'unknown' };
  },

  /**
   * Verifies that the deployed asset is live and reachable at https://sahanubhutifoundation.github.io/assets/og-preview.png
   */
  async verifyPublishedAsset(): Promise<{ verified: boolean; statusCode?: number; size?: number; message: string }> {
    try {
      const cacheBustUrl = `https://sahanubhutifoundation.github.io/assets/og-preview.png?t=${Date.now()}`;
      const res = await fetch(cacheBustUrl, { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const contentLength = res.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : undefined;
        return {
          verified: true,
          statusCode: res.status,
          size,
          message: `পাবলিক অ্যাসেট og-preview.png অনলাইনে সক্রিয় রয়েছে (${size ? `${Math.round(size / 1024)} KB` : '200 OK'})।`,
        };
      }
      return {
        verified: false,
        statusCode: res.status,
        message: `পাবলিক অ্যাসেট এখনও প্রপাগেট হচ্ছে (HTTP ${res.status})। কয়েক সেকেন্ড পর চেক করুন।`,
      };
    } catch (e: any) {
      return {
        verified: false,
        message: `পাবলিক অ্যাসেট ভেরিফিকেশন রিকোয়েস্ট ব্যর্থ: ${e.message}`,
      };
    }
  },
};
