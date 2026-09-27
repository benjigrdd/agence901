import type { Database } from '@app/data/supabase';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { supabasePublicKey, supabaseUrl } from './env';

/** Pages accessibles sans session. */
const PUBLIC_PATHS = ['/connexion', '/mot-de-passe-oublie', '/reinitialiser', '/auth/confirm', '/espace-suspendu'];
const MFA_VERIFY = '/connexion/2fa';
const MFA_SETUP = '/connexion/2fa/configurer';

const isPublic = (path: string) => PUBLIC_PATHS.some((p) => path === p) || path.startsWith('/auth/');

/**
 * Rafraichit la session Supabase et applique les redirections d'authentification :
 * non connecte → /connexion ; connecte sans 2FA validee → /connexion/2fa (ou configuration du facteur).
 * Les droits (super-admin, commune) restent verifies cote serveur par les gardes.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublicKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() revalide le jeton aupres d'Auth (et non une simple lecture du cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const redirect = (to: string, keepNext = true) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    if (keepNext && path !== '/' && !path.startsWith('/connexion')) url.searchParams.set('next', `${path}${request.nextUrl.search}`);
    const res = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (!user) {
    return isPublic(path) || path === '/invitation' ? response : redirect('/connexion');
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verified = aal?.currentLevel === 'aal2';
  const hasFactor = aal?.nextLevel === 'aal2';
  const onMfaPage = path === MFA_VERIFY || path === MFA_SETUP;

  if (!verified) {
    // L'invitation (choix du mot de passe) precede la configuration de la 2FA.
    if (path === '/invitation' || path === '/reinitialiser' || path.startsWith('/auth/')) return response;
    if (hasFactor && path !== MFA_VERIFY) return redirect(MFA_VERIFY);
    if (!hasFactor && path !== MFA_SETUP) return redirect(MFA_SETUP);
    return response;
  }
  if (path === '/connexion' || (onMfaPage && path !== MFA_SETUP)) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.searchParams.get('next')?.startsWith('/') ? (request.nextUrl.searchParams.get('next') ?? '/') : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}
