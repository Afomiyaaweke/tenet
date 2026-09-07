// Google Identity Services (GIS) client helper — "Sign In With Google"
//
// Uses the client-ID-only ID-token flow: the browser renders Google's official
// button, the user picks an account, and Google returns a signed ID token
// (JWT) which the app exchanges at POST /api/auth/google.

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '349861539680-uk1gbm740qd6hcbvlicl1nmut3kqi2va.apps.googleusercontent.com';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// ── Minimal typings for the GIS API ─────────────────────────────────────────

export interface GoogleIdCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GsiButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

export interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleIdCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonConfig) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
}

interface GoogleAccountsNamespace {
  id?: GoogleIdApi;
}

declare global {
  interface Window {
    google?: { accounts?: GoogleAccountsNamespace };
  }
}

// ── Script loader (loads once, resolves when window.google.accounts.id is ready) ──

let gsiScriptPromise: Promise<GoogleIdApi> | null = null;

export function loadGoogleIdentityServices(): Promise<GoogleIdApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Sign-In is only available in the browser'));
  }

  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);

  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise<GoogleIdApi>((resolve, reject) => {
    // Reuse an in-flight/existing script tag if one is present
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
    const attach = (el: HTMLScriptElement) => {
      el.addEventListener('load', () => {
        const api = window.google?.accounts?.id;
        if (api) resolve(api);
        else reject(new Error('Google Sign-In loaded but is unavailable'));
      });
      el.addEventListener('error', () => {
        gsiScriptPromise = null;
        reject(new Error('Could not load Google Sign-In. Check your network connection.'));
      });
    };

    if (existing) {
      attach(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    attach(script);
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}
