/**
 * Donne (ou retire) le role d'editeur (super-admin) a un compte existant.
 * Usage : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/set-platform-admin.ts <email> [--retirer]
 * La cle service est lue dans l'environnement du poste d'exploitation : jamais dans le code ni dans le dashboard.
 */
import { createClient } from '@supabase/supabase-js';

const [email, flag] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !serviceKey) {
  console.error('Usage : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... tsx scripts/set-platform-admin.ts <email> [--retirer]');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (error || !link.user) {
  console.error('Compte introuvable');
  process.exit(1);
}
const enable = flag !== '--retirer';
await admin.auth.admin.updateUserById(link.user.id, { app_metadata: { ...link.user.app_metadata, platform_admin: enable } });
console.log(`${email} : role editeur ${enable ? 'accorde' : 'retire'}. La 2FA reste obligatoire.`);
