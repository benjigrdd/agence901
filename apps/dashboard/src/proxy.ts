import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { buildCsp, createNonce } from './lib/security-headers';
import { isSupabaseMode } from './lib/supabase/env';
import { updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // CSP a nonce : Next applique le nonce de l'en-tete de la requete a ses propres scripts.
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', csp);

  // En mode mock (personas de developpement), pas d'authentification reelle.
  const response = isSupabaseMode() ? await updateSession(request) : NextResponse.next({ request });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
