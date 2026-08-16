import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/social/callback
 * OAuth callback handler — receives the authorization code from the provider
 * and passes it back to the parent window via postMessage, then closes the popup.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Determine provider from the state or from a stored cookie/header
  // Since we can't easily pass provider in the OAuth redirect, we detect it
  // from the referrer or accept it as a query param fallback
  // The frontend opens the popup with the provider in the URL, and the
  // provider's redirect comes back here. We'll try to detect the provider.
  const provider = searchParams.get('provider') || detectProviderFromUrl(req);

  if (error) {
    const errorMsg = errorDescription || error || 'OAuth authentication failed';
    const html = `<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-error', provider: ${JSON.stringify(provider)}, error: ${JSON.stringify(errorMsg)} }, '*');
      }
      window.close();
    </script></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code) {
    const html = `<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-error', provider: ${JSON.stringify(provider)}, error: 'No authorization code received' }, '*');
      }
      window.close();
    </script></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Send the authorization code back to the parent window via postMessage
  // The parent window will then call POST /api/auth/social with the code
  const html = `<!DOCTYPE html><html><body><script>
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth-callback', provider: ${JSON.stringify(provider)}, code: ${JSON.stringify(code)}, state: ${JSON.stringify(state)} }, '*');
    }
    window.close();
  </script></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Try to detect the OAuth provider from the request referrer or URL.
 * This is a best-effort detection since providers don't include provider info in the callback.
 */
function detectProviderFromUrl(req: NextRequest): string {
  const referer = req.headers.get('referer') || '';
  if (referer.includes('google')) return 'google';
  if (referer.includes('linkedin')) return 'linkedin';
  if (referer.includes('github')) return 'github';
  if (referer.includes('microsoft') || referer.includes('microsoftonline')) return 'microsoft';
  return 'unknown';
}
