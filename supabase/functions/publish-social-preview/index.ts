// Supabase Edge Function: publish-social-preview
// Triggers the GitHub Actions deploy.yml workflow securely using a server-side GITHUB_PAT secret.
// Browser callers never receive or see the GitHub token.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GITHUB_REPO_OWNER = 'sahanubhutifoundation';
const GITHUB_REPO_NAME = 'sahanubhutifoundation.github.io';
const GITHUB_WORKFLOW_ID = 'deploy.yml';
const GITHUB_DEFAULT_BRANCH = 'main';

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

    // 3. Verify user authorization header is present
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'unauthorized',
          message: 'প্রবেশাধিকার নেই: অ্যাডমিন অনুমোদন টোকেন অনুপস্থিত।',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Parse request payload
    let body: { mode?: string; imageUrl?: string; branch?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const mode = body.mode === 'custom' ? 'custom' : 'auto';
    const imageUrl = body.imageUrl || '';
    const branch = body.branch || GITHUB_DEFAULT_BRANCH;

    // 5. Check for GitHub PAT in server-side environment secrets
    const githubPat = Deno.env.get('GITHUB_PAT') || Deno.env.get('GH_WORKFLOW_TOKEN') || Deno.env.get('GITHUB_TOKEN');
    if (!githubPat) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'missing_secret',
          message: 'GitHub Personal Access Token (GITHUB_PAT with actions:write) is not set in Supabase secrets.',
          setupGuide: {
            title: 'GitHub Actions Server Dispatch Setup',
            step1: 'Create a fine-grained GitHub PAT with "Actions: Read and write" and "Contents: Read and write" permissions for sahanubhutifoundation.github.io.',
            step2: 'Add GITHUB_PAT into Supabase Project Settings -> Secrets.',
            manualAlternative: 'You can also trigger "Deploy to GitHub Pages" manually from the GitHub Actions tab.',
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Dispatch workflow via GitHub REST API
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
          message: 'GitHub Actions পাবলিশিং ওয়ার্কফ্লো সফলভাবে শুরু হয়েছে।',
          branch,
          mode,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      const errorText = await githubRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          status: 'github_error',
          statusCode: githubRes.status,
          message: `GitHub API error: ${githubRes.status} ${errorText}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 'server_error',
        message: err.message || 'Internal server error during dispatch.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
