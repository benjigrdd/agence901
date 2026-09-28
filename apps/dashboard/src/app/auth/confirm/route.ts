import type { EmailOtpType } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

import { safeNextPath } from '@/lib/safe-redirect';

const TYPES: EmailOtpType[] = ['invite', 'recovery', 'email', 'signup', 'magiclink', 'email_change'];

/** Liens des emails (invitation, reinitialisation) : `token_hash` verifie cote serveur, puis redirection interne. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = TYPES.find((t) => t === searchParams.get('type'));
  const next = searchParams.get('next');
  const target = safeNextPath(next);
  const code = searchParams.get('code');
  const supabase = await createSupabaseServerClient();
  const ok = tokenHash && type
    ? !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error
    : code
      ? !(await supabase.auth.exchangeCodeForSession(code)).error
      : false;
  return NextResponse.redirect(new URL(ok ? target : '/connexion?erreur=lien', origin));
}
