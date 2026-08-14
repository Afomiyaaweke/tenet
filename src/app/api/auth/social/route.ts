import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

// OAuth provider configuration
const OAUTH_PROVIDERS: Record<string, { clientId: string; clientSecret: string; authUrl: string; tokenUrl: string; userInfoUrl: string; scope: string }> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scope: 'openid email profile',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'user:email',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile User.Read',
  },
};

function getRequiredEnvVars(provider: string): string[] {
  switch (provider) {
    case 'google': return ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    case 'linkedin': return ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'];
    case 'github': return ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
    case 'microsoft': return ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'];
    default: return [];
  }
}

// GET: Initiate OAuth flow — redirect to provider
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (!provider || !OAUTH_PROVIDERS[provider]) {
    return NextResponse.json({ success: false, error: 'Invalid provider' }, { status: 400 });
  }

  const config = OAUTH_PROVIDERS[provider];

  if (!config.clientId) {
    // Return HTML that communicates the error back to the parent window via postMessage
    // and auto-closes the popup, so the user sees a proper toast instead of raw JSON
    const errorMsg = `${provider} login is not available yet. Please use email/password to sign in.`;
    const html = `<!DOCTYPE html><html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-error', provider: '${provider}', error: ${JSON.stringify(errorMsg)} }, '*');
      }
      window.close();
    </script></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Build the authorization URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/social/callback`;
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}

// POST: Handle social login (direct token exchange)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, code, accessToken } = body;

    if (!provider || !OAUTH_PROVIDERS[provider]) {
      return NextResponse.json({ success: false, error: 'Invalid provider' }, { status: 400 });
    }

    const config = OAUTH_PROVIDERS[provider];

    let userEmail: string | null = null;
    let userName: string | null = null;
    let providerId: string | null = null;

    // If we have an authorization code, exchange it for an access token
    if (code) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const redirectUri = `${appUrl}/api/auth/social/callback`;
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenRes.ok) {
        return NextResponse.json({ success: false, error: 'Failed to exchange code for token' }, { status: 400 });
      }

      const tokenData = await tokenRes.json();
      const socialAccessToken = tokenData.access_token;

      // Fetch user info from provider
      const userInfoRes = await fetch(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${socialAccessToken}`,
          ...(provider === 'github' ? { 'User-Agent': 'TenetBid' } : {}),
        },
      });

      if (!userInfoRes.ok) {
        return NextResponse.json({ success: false, error: 'Failed to fetch user info from provider' }, { status: 400 });
      }

      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email;
      userName = userInfo.name || userInfo.given_name || userInfo.login;
      providerId = userInfo.sub || userInfo.id?.toString() || userInfo.login;
    } else if (accessToken) {
      // Direct access token (e.g., from client-side SDK)
      const userInfoRes = await fetch(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(provider === 'github' ? { 'User-Agent': 'TenetBid' } : {}),
        },
      });

      if (!userInfoRes.ok) {
        return NextResponse.json({ success: false, error: 'Failed to fetch user info' }, { status: 400 });
      }

      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email;
      userName = userInfo.name || userInfo.given_name || userInfo.login;
      providerId = userInfo.sub || userInfo.id?.toString() || userInfo.login;
    } else {
      return NextResponse.json({ success: false, error: 'Missing code or accessToken' }, { status: 400 });
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, error: 'Could not get email from provider. Please ensure your account has a public email.' }, { status: 400 });
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { email: userEmail } });

    if (!user) {
      // Auto-create user on first social login
      const hashedPassword = await bcryptjs.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await db.user.create({
        data: {
          email: userEmail,
          passwordHash: hashedPassword,
          role: 'user',
          profile: {
            create: {
              fullName: userName || userEmail.split('@')[0],
              verified: true, // Social logins are pre-verified
            },
          },
        },
      });
    }

    // Generate JWT using centralized auth function
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tokenVersion: user.tokenVersion ?? 0,
    });

    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error: any) {
    console.error('Social login error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Social login failed' }, { status: 500 });
  }
}
