/** Browser-visible configuration. Nothing secret belongs in this file. */

const env = import.meta.env as Record<string, string | undefined>;

const str = (...keys: string[]): string => {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
};

/** Supabase client configuration */
export const SUPABASE_CONFIG = {
  url:
    str('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') ||
    'https://huddmxtlcgkqltdixbux.supabase.co',
  anonKey:
    str('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZGRteHRsY2drcWx0ZGl4YnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTQ0ODksImV4cCI6MjEwODc3MDQ4OX0.Af4DDou0IlFRCUhFOTln4ytyA9oNL85kqAsQd-PgmKk',
};

/** Cloudflare Turnstile site key (optional/publishable) */
export const TURNSTILE_SITE_KEY = str('VITE_TURNSTILE_SITE_KEY');

/** HMAC secret for QR code signing */
export const QR_HMAC_SECRET =
  str('VITE_QR_HMAC_SECRET') ||
  'b8d7a6e5f4c3b2a1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7';

/**
 * Identity-provider wiring.
 *
 * Google and GitHub are first-class Supabase OAuth providers — they only need
 * to be switched on in the Supabase dashboard.
 *
 * AWS is not a built-in Supabase provider, so the two AWS buttons are wired
 * through whichever bridge the organiser has configured:
 *   - `sso`   — Supabase SAML SSO, e.g. AWS IAM Identity Center. Needs the SSO
 *               provider UUID (or a verified email domain).
 *   - `oauth` — a generic OIDC slot in Supabase (commonly the `keycloak` slot)
 *               pointed at an Amazon Cognito user pool federated with AWS.
 * When neither is configured the button stays visible but tells the user to
 * verify by email instead — it never silently fails.
 */
export const AUTH_CONFIG = {
  /** Where the OAuth/SSO round-trip returns to. */
  redirectPath: str('VITE_AUTH_REDIRECT_PATH') || '/auth/callback',

  google: { enabled: str('VITE_AUTH_GOOGLE_ENABLED') !== 'false' },
  github: { enabled: str('VITE_AUTH_GITHUB_ENABLED') !== 'false' },

  aws: {
    /** Supabase SSO provider UUID for AWS IAM Identity Center. */
    ssoProviderId: str('VITE_AWS_SSO_PROVIDER_ID'),
    /** Verified SSO email domain, used when no provider UUID is given. */
    ssoDomain: str('VITE_AWS_SSO_DOMAIN'),
    /** Supabase OAuth provider slot bridging to Cognito, e.g. `keycloak`. */
    oauthProvider: str('VITE_AWS_OAUTH_PROVIDER'),
  },

  awsBuilder: {
    ssoProviderId: str('VITE_AWS_BUILDER_SSO_PROVIDER_ID'),
    ssoDomain: str('VITE_AWS_BUILDER_SSO_DOMAIN'),
    oauthProvider: str('VITE_AWS_BUILDER_OAUTH_PROVIDER'),
  },
} as const;

/** Email OTP delivery. The secrets live in Supabase, not here. */
export const OTP_CONFIG = {
  /** Edge Function names. */
  sendFunction: str('VITE_OTP_SEND_FUNCTION') || 'send-otp',
  verifyFunction: str('VITE_OTP_VERIFY_FUNCTION') || 'verify-otp',
  /** Shown in the UI so people know who the mail will come from. */
  senderAddress: str('VITE_OTP_SENDER_ADDRESS') || 'awsugbhopal@gmail.com',
} as const;
