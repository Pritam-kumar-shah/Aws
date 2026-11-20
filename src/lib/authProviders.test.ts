import { describe, it, expect } from 'vitest';
import {
  PROVIDERS,
  PROVIDER_IDS,
  resolveProviderStrategy,
  isProviderAvailable,
  buildRedirectUrl,
  type ProviderId,
} from '@/lib/authProviders';
import type { AUTH_CONFIG } from '@/config/env';

type Config = typeof AUTH_CONFIG;

/** A config with every federated option switched off. */
function makeConfig(overrides: Partial<{
  google: { enabled: boolean };
  github: { enabled: boolean };
  aws: Partial<Config['aws']>;
  awsBuilder: Partial<Config['awsBuilder']>;
  redirectPath: string;
}> = {}): Config {
  const blank = { ssoProviderId: '', ssoDomain: '', oauthProvider: '' };
  return {
    redirectPath: overrides.redirectPath ?? '/auth/callback',
    google: overrides.google ?? { enabled: true },
    github: overrides.github ?? { enabled: true },
    aws: { ...blank, ...(overrides.aws ?? {}) },
    awsBuilder: { ...blank, ...(overrides.awsBuilder ?? {}) },
  } as Config;
}

describe('provider catalogue', () => {
  it('exposes exactly the four requested sign-in options', () => {
    expect(PROVIDER_IDS).toEqual(['google', 'github', 'aws', 'aws_builder']);
  });

  it('describes every id it lists', () => {
    for (const id of PROVIDER_IDS) {
      expect(PROVIDERS[id]).toBeDefined();
      expect(PROVIDERS[id].id).toBe(id);
      expect(PROVIDERS[id].label.length).toBeGreaterThan(0);
      expect(PROVIDERS[id].caption.length).toBeGreaterThan(0);
      expect(PROVIDERS[id].accessibleName.length).toBeGreaterThan(0);
    }
  });

  it('gives each provider a distinct label', () => {
    const labels = PROVIDER_IDS.map((id) => PROVIDERS[id].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('resolveProviderStrategy — Google and GitHub', () => {
  it('maps Google to the built-in Supabase OAuth provider', () => {
    expect(resolveProviderStrategy('google', makeConfig())).toEqual({
      kind: 'oauth',
      provider: 'google',
    });
  });

  it('maps GitHub to the built-in Supabase OAuth provider', () => {
    expect(resolveProviderStrategy('github', makeConfig())).toEqual({
      kind: 'oauth',
      provider: 'github',
    });
  });

  it('reports Google as unconfigured when explicitly disabled', () => {
    const strategy = resolveProviderStrategy('google', makeConfig({ google: { enabled: false } }));
    expect(strategy.kind).toBe('unconfigured');
  });

  it('reports GitHub as unconfigured when explicitly disabled', () => {
    const strategy = resolveProviderStrategy('github', makeConfig({ github: { enabled: false } }));
    expect(strategy.kind).toBe('unconfigured');
  });
});

describe.each([
  ['aws', 'aws'] as const,
  ['aws_builder', 'awsBuilder'] as const,
])('resolveProviderStrategy — %s', (providerId, configKey) => {
  const id = providerId as ProviderId;

  it('uses the SSO provider id when one is configured', () => {
    const config = makeConfig({ [configKey]: { ssoProviderId: 'uuid-1234' } });
    expect(resolveProviderStrategy(id, config)).toEqual({
      kind: 'sso',
      providerId: 'uuid-1234',
    });
  });

  it('falls back to the SSO domain when no provider id is set', () => {
    const config = makeConfig({ [configKey]: { ssoDomain: 'builders.example.com' } });
    expect(resolveProviderStrategy(id, config)).toEqual({
      kind: 'sso',
      domain: 'builders.example.com',
    });
  });

  it('falls back to the OAuth bridge when no SSO settings exist', () => {
    const config = makeConfig({ [configKey]: { oauthProvider: 'keycloak' } });
    expect(resolveProviderStrategy(id, config)).toEqual({
      kind: 'oauth',
      provider: 'keycloak',
    });
  });

  it('prefers the provider id over the domain and the OAuth bridge', () => {
    const config = makeConfig({
      [configKey]: {
        ssoProviderId: 'uuid-1234',
        ssoDomain: 'builders.example.com',
        oauthProvider: 'keycloak',
      },
    });
    expect(resolveProviderStrategy(id, config)).toEqual({
      kind: 'sso',
      providerId: 'uuid-1234',
    });
  });

  it('prefers the domain over the OAuth bridge', () => {
    const config = makeConfig({
      [configKey]: { ssoDomain: 'builders.example.com', oauthProvider: 'keycloak' },
    });
    expect(resolveProviderStrategy(id, config)).toEqual({
      kind: 'sso',
      domain: 'builders.example.com',
    });
  });

  it('is unconfigured, with a hint, when nothing is wired up', () => {
    const strategy = resolveProviderStrategy(id, makeConfig());
    expect(strategy.kind).toBe('unconfigured');
    if (strategy.kind === 'unconfigured') {
      // The fallback must point at the path that does work.
      expect(strategy.hint).toMatch(/email code/i);
    }
  });

  it('does not leak the other AWS option’s configuration', () => {
    const otherKey = configKey === 'aws' ? 'awsBuilder' : 'aws';
    const config = makeConfig({ [otherKey]: { ssoProviderId: 'uuid-other' } });
    expect(resolveProviderStrategy(id, config).kind).toBe('unconfigured');
  });
});

describe('isProviderAvailable', () => {
  it('is true for anything with a concrete strategy', () => {
    const config = makeConfig({ aws: { ssoProviderId: 'uuid' } });
    expect(isProviderAvailable('google', config)).toBe(true);
    expect(isProviderAvailable('github', config)).toBe(true);
    expect(isProviderAvailable('aws', config)).toBe(true);
  });

  it('is false for an unconfigured provider', () => {
    expect(isProviderAvailable('aws_builder', makeConfig())).toBe(false);
  });
});

describe('buildRedirectUrl', () => {
  it('joins the origin and the configured callback path', () => {
    expect(buildRedirectUrl('https://reinvent.bhopal.dev', undefined, makeConfig())).toBe(
      'https://reinvent.bhopal.dev/auth/callback',
    );
  });

  it('carries a `next` destination through as a query parameter', () => {
    expect(buildRedirectUrl('https://reinvent.bhopal.dev', '/apply', makeConfig())).toBe(
      'https://reinvent.bhopal.dev/auth/callback?next=%2Fapply',
    );
  });

  it('omits `next` when it is empty', () => {
    expect(buildRedirectUrl('https://x.dev', '', makeConfig())).toBe('https://x.dev/auth/callback');
  });

  it('respects a custom callback path', () => {
    expect(
      buildRedirectUrl('https://x.dev', undefined, makeConfig({ redirectPath: '/oauth/done' })),
    ).toBe('https://x.dev/oauth/done');
  });

  it('keeps a port from the origin, so localhost development works', () => {
    expect(buildRedirectUrl('http://localhost:5173', '/apply', makeConfig())).toBe(
      'http://localhost:5173/auth/callback?next=%2Fapply',
    );
  });

  it('encodes a `next` value containing a query string', () => {
    expect(buildRedirectUrl('https://x.dev', '/my?tab=ticket', makeConfig())).toBe(
      'https://x.dev/auth/callback?next=%2Fmy%3Ftab%3Dticket',
    );
  });
});
