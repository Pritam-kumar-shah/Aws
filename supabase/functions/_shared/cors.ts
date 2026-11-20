/**
 * CORS for the public auth endpoints.
 *
 * Set `ALLOWED_ORIGINS` (comma separated) in Supabase secrets to lock these
 * functions to your own domains. Left unset it falls back to `*`, which is
 * fine for local development but should not be how you ship.
 */

const configured = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowOrigin =
    configured.length === 0
      ? '*'
      : requestOrigin && configured.includes(requestOrigin)
        ? requestOrigin
        : configured[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function jsonResponse(
  body: unknown,
  status: number,
  requestOrigin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(requestOrigin), 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) });
}
