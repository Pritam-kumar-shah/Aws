/**
 * The four sign-in options and how each one is actually dispatched.
 *
 * Kept free of React so the resolution rules can be unit-tested directly.
 */

import { AUTH_CONFIG } from '@/config/env';

export type ProviderId = 'google' | 'github' | 'aws' | 'aws_builder';

export const PROVIDER_IDS: readonly ProviderId[] = ['google', 'github', 'aws', 'aws_builder'];

/** How a given button should be dispatched once clicked. */
export type ProviderStrategy =
  | { kind: 'oauth'; provider: string }
  | { kind: 'sso'; providerId: string }
  | { kind: 'sso'; domain: string }
  | { kind: 'unconfigured'; hint: string };

export interface ProviderDescriptor {
  id: ProviderId;
  /** Button label. */
  label: string;
  /** Short line under the label. */
  caption: string;
  /** Announced to screen readers in place of the decorative brand mark. */
  accessibleName: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  google: {
    id: 'google',
    label: 'Continue with Google',
    caption: 'Fastest — uses your Google account',
    accessibleName: 'Continue with Google',
  },
  github: {
    id: 'github',
    label: 'Continue with GitHub',
    caption: 'Great if you already build in the open',
    accessibleName: 'Continue with GitHub',
  },
  aws: {
    id: 'aws',
    label: 'Continue with AWS Account',
    caption: 'AWS IAM Identity Center single sign-on',
    accessibleName: 'Continue with your AWS account',
  },
  aws_builder: {
    id: 'aws_builder',
    label: 'Continue with AWS Builder Center',
    caption: 'Your AWS Builder ID / Builder Center profile',
    accessibleName: 'Continue with AWS Builder Center',
  },
};

const UNCONFIGURED_HINT =
  'AWS Builder ID / IAM SSO requires an enterprise AWS Cognito or Identity Center tenant. For this community event, please use Email code verification below — it works instantly with any email!';

/**
 * Resolves a button to a concrete strategy.
 *
 * Precedence for the AWS options is SSO provider id → SSO domain → OAuth
 * bridge. An explicit provider UUID is the most specific thing the organiser
 * can configure, so it wins.
 */
export function resolveProviderStrategy(
  id: ProviderId,
  config: typeof AUTH_CONFIG = AUTH_CONFIG,
): ProviderStrategy {
  switch (id) {
    case 'google':
      return config.google.enabled
        ? { kind: 'oauth', provider: 'google' }
        : { kind: 'unconfigured', hint: UNCONFIGURED_HINT };

    case 'github':
      return config.github.enabled
        ? { kind: 'oauth', provider: 'github' }
        : { kind: 'unconfigured', hint: UNCONFIGURED_HINT };

    case 'aws':
      return resolveFederated(config.aws);

    case 'aws_builder':
      return resolveFederated(config.awsBuilder);
  }
}

function resolveFederated(settings: {
  ssoProviderId: string;
  ssoDomain: string;
  oauthProvider: string;
}): ProviderStrategy {
  if (settings.ssoProviderId) return { kind: 'sso', providerId: settings.ssoProviderId };
  if (settings.ssoDomain) return { kind: 'sso', domain: settings.ssoDomain };
  if (settings.oauthProvider) return { kind: 'oauth', provider: settings.oauthProvider };
  return { kind: 'unconfigured', hint: UNCONFIGURED_HINT };
}

export function isProviderAvailable(
  id: ProviderId,
  config: typeof AUTH_CONFIG = AUTH_CONFIG,
): boolean {
  return resolveProviderStrategy(id, config).kind !== 'unconfigured';
}

/** Absolute URL the provider sends the browser back to. */
export function buildRedirectUrl(
  origin: string,
  next?: string,
  config: typeof AUTH_CONFIG = AUTH_CONFIG,
): string {
  const url = new URL(config.redirectPath, origin);
  if (next) url.searchParams.set('next', next);
  return url.toString();
}
