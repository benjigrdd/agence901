// Quotidien (via `private.purge_retention`) : supprime les archives d'export de plus de 7 jours.
import { json } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/caller.ts';
import { isServiceCall } from '../_shared/expo.ts';
import { readJsonObject } from '../_shared/validate.ts';

const RETENTION_MS = 7 * 24 * 3600_000;

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: 'Accès refusé' }, 401);
  const body = await readJsonObject(req);
  const now =
    typeof body.now === 'string' && !Number.isNaN(Date.parse(body.now))
      ? Date.parse(body.now)
      : Date.now();
  const storage = serviceClient().storage.from('exports');
  const { data: folders, error } = await storage.list('', { limit: 1000 });
  if (error) return json({ error: 'Liste des exports impossible' }, 500);
  let removed = 0;
  for (const folder of folders ?? []) {
    const { data: files } = await storage.list(folder.name, { limit: 1000 });
    const expired = (files ?? [])
      .filter((f) => f.created_at && Date.parse(f.created_at) < now - RETENTION_MS)
      .map((f) => `${folder.name}/${f.name}`);
    if (expired.length) {
      const { error: removeError } = await storage.remove(expired);
      if (!removeError) removed += expired.length;
    }
  }
  return json({ removed });
});
