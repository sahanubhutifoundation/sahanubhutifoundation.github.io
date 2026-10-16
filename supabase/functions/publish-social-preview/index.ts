// Supabase Edge Function: publish-social-preview
// Triggers the GitHub Actions deploy.yml workflow securely using a server-side GITHUB_PAT secret.
// Browser callers never receive or see the GitHub token.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

const GITHUB_REPO_OWNER = Deno.env.get('GITHUB_REPO_OWNER') || 'sahanubhutifoundation';
const GITHUB_REPO_NAME = Deno.env.get('GITHUB_REPO_NAME') || 'sahanubhutifoundation.github.io';
const GITHUB_WORKFLOW_ID = Deno.env.get('GITHUB_WORKFLOW_ID') || 'deploy.yml';
const GITHUB_DEFAULT_BRANCH = Deno.env.get('GITHUB_DEFAULT_BRANCH') || 'main';

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Verify caller authorization header is present
    const authHeader = req.headers.get('Authorization') || req.headers.get('x-admin-token');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'unauthorized',
          errorType: 'unauthorized',
          message: 'প্রবেশাধিকার নেই: অ্যাডমিন অনুমোদন টোকেন অনুপস্থিত (401 Unauthorized)।',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Parse request payload
    let body: { action?: string; mode?: string; imageUrl?: string; branch?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // 5. Read the required server-side secret GITHUB_PAT
    const githubPat = Deno.env.get('GITHUB_PAT');
    if (!githubPat) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'missing_secret',
          errorType: 'missing_secret',
          missingSecret: 'GITHUB_PAT',
          message: 'Supabase Edge Function secret "GITHUB_PAT" is not configured in Supabase project secrets.',
          setupGuide: {
            title: 'Supabase Edge Function Secret Required',
            step1: 'Generate a fine-grained GitHub PAT with "Actions: Read and write" and "Contents: Read and write" permissions for sahanubhutifoundation/sahanubhutifoundation.github.io.',
            step2: 'Add GITHUB_PAT into Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets (or via CLI: supabase secrets set GITHUB_PAT=...).',
            manualAlternative: 'You can also trigger "Deploy to GitHub Pages" manually from the GitHub Actions tab.',
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Support checking workflow status
    if (body.action === 'status') {
      const runsUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/runs?per_page=1`;
      const runsRes = await fetch(runsUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubPat}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Sahanubhuti-Publish-Service/1.0',
        },
      });

      if (!runsRes.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            status: 'status_check_failed',
            statusCode: runsRes.status,
            message: `Could not retrieve workflow runs: ${runsRes.statusText}`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const runsData = await runsRes.json();
      const latestRun = runsData?.workflow_runs?.[0] || null;

      return new Response(
        JSON.stringify({
          success: true,
          status: 'run_info',
          run: latestRun
            ? {
                id: latestRun.id,
                status: latestRun.status, // queued, in_progress, completed
                conclusion: latestRun.conclusion, // success, failure, cancelled, null
                html_url: latestRun.html_url,
                created_at: latestRun.created_at,
                updated_at: latestRun.updated_at,
              }
            : null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Dispatch workflow via GitHub REST API
    const mode = body.mode === 'custom' ? 'custom' : 'auto';
    const imageUrl = body.imageUrl || '';
    const branch = body.branch || GITHUB_DEFAULT_BRANCH;

    const dispatchUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`;

    const githubRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubPat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Sahanubhuti-Publish-Service/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: branch,
        inputs: {
          mode,
          image_url: imageUrl,
        },
      }),
    });

    if (githubRes.status === 204) {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'dispatched',
          message: 'GitHub Actions পাবলিশিং ওয়ার্কফ্লো সফলভাবে শুরু হয়েছে (Workflow Dispatched)।',
          branch,
          mode,
          workflow: GITHUB_WORKFLOW_ID,
          repository: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Specific GitHub Error Diagnoses
    const errorText = await githubRes.text();
    let errorType = 'github_error';
    let userFriendlyMessage = `GitHub API ত্রুটি (${githubRes.status}): ${errorText}`;

    if (githubRes.status === 401) {
      errorType = 'github_unauthorized';
      userFriendlyMessage = 'GitHub Authentication ব্যর্থ (401 Bad credentials)। Supabase সিক্রেটে থাকা GITHUB_PAT টোকেনটি সঠিক এবং সক্রিয় কিনা নিশ্চিত করুন।';
    } else if (githubRes.status === 403) {
      errorType = 'github_forbidden';
      userFriendlyMessage = 'GitHub অ্যাক্সেস প্রত্যাখ্যাত (403 Forbidden)। GITHUB_PAT টোকেনে "Actions: Read and write" এবং "Contents: Read and write" পারমিশন দিন।';
    } else if (githubRes.status === 404) {
      errorType = 'workflow_not_found';
      userFriendlyMessage = `GitHub ওয়ার্কফ্লো "${GITHUB_WORKFLOW_ID}" অথবা রিপোজিটরি "${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}" পাওয়া যায়নি (404 Not Found)।`;
    } else if (githubRes.status === 422) {
      errorType = 'invalid_ref';
      userFriendlyMessage = `শাখা (Branch) "${branch}" পাওয়া যায়নি অথবা রিপোজিটরির Branch Protection রুল ডিসপ্যাচ করতে বাধা দিয়েছে (422 Unprocessable Entity)।`;
    }

    return new Response(
      JSON.stringify({
        success: false,
        status: errorType,
        errorType,
        statusCode: githubRes.status,
        message: userFriendlyMessage,
        details: errorText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 'server_error',
        errorType: 'server_error',
        message: err.message || 'Internal server error during dispatch.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
