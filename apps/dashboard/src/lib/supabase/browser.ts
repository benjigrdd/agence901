'use client';

import type { Database } from '@app/data/supabase';
import { createBrowserClient } from '@supabase/ssr';

import { supabasePublicKey, supabaseUrl } from './env';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublicKey());
}
