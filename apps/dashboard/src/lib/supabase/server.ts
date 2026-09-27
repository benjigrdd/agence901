import 'server-only';

import type { Database } from '@app/data/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { supabasePublicKey, supabaseUrl } from './env';

/** Client Supabase de l'utilisateur connecte (session dans les cookies, RLS appliquee). Un par requete. */
export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabasePublicKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Appel depuis un Server Component : le proxy rafraichit deja la session.
        }
      },
    },
  });
});

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
