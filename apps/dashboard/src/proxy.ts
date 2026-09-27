import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isSupabaseMode } from './lib/supabase/env';
import { updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // En mode mock (personas de developpement), pas d'authentification reelle.
  if (!isSupabaseMode()) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
