// Chaque jour a 18 h (Paris) : rappel la veille d'une collecte, pour les habitants qui l'ont active.
import { createClient } from 'npm:@supabase/supabase-js@2';
import rrule from 'npm:rrule@2';

import { json } from '../_shared/cors.ts';
import { expoBaseUrl, isServiceCall, sendPush } from '../_shared/expo.ts';
import { parseRows, readJsonObject, z } from '../_shared/validate.ts';

const LABELS: Record<string, string> = {
  household: 'ordures ménagères',
  recycling: 'emballages recyclables',
  glass: 'verre',
  biowaste: 'biodéchets',
  bulky: 'encombrants',
  green: 'déchets verts',
};

const ExceptionSchema = z.object({ date: z.string(), movedTo: z.string().nullable() });
type Exception = z.infer<typeof ExceptionSchema>;
const ScheduleSchema = z.object({ zone_id: z.string(), waste_type: z.string(), rrule: z.string(), exceptions: z.array(ExceptionSchema).nullable() });
const ReminderRecipientSchema = z.object({ push_token_id: z.string(), token: z.string() });

// Paquet CommonJS : l'export par defaut porte les fonctions.
const { rrulestr } = rrule;

/** Collectes du jour `day` (AAAA-MM-JJ) pour une recurrence, exceptions appliquees (meme regle que @app/shared). */
function collectsOn(rrule: string, exceptions: Exception[], day: string): boolean {
  const moved = exceptions.find((e) => e.movedTo === day);
  if (moved) return true;
  if (exceptions.some((e) => e.date === day)) return false;
  const start = new Date(`${day}T00:00:00Z`);
  return rrulestr(rrule).between(start, new Date(start.getTime() + 86_399_000), true).length > 0;
}

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: 'Accès refusé' }, 401);
  const body = await readJsonObject(req);
  const expo = expoBaseUrl(body.expoUrl);
  const tomorrow = typeof body.day === 'string' ? body.day : new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
  const run = await admin.from('job_runs').insert({ job: 'send-waste-reminders' }).select('id').single();

  const { data: schedules } = await admin.from('waste_schedules').select('zone_id, waste_type, rrule, exceptions');
  const byZone = new Map<string, string[]>();
  for (const s of parseRows(ScheduleSchema, schedules)) {
    if (collectsOn(s.rrule, s.exceptions ?? [], tomorrow)) byZone.set(s.zone_id, [...(byZone.get(s.zone_id) ?? []), LABELS[s.waste_type] ?? s.waste_type]);
  }
  let messages = 0;
  let errors = 0;
  for (const [zoneId, types] of byZone) {
    const { data: recipients } = await admin.rpc('waste_reminder_recipients', { p_zone_id: zoneId });
    const list = parseRows(ReminderRecipientSchema, recipients);
    if (list.length === 0) continue;
    try {
      await sendPush(expo, list.map((r) => ({ to: r.token, title: 'Collecte demain', body: `Pensez à sortir vos bacs : ${types.join(', ')}.`, channelId: 'collecte', data: { url: '/environnement' } })));
      messages += list.length;
    } catch {
      errors++;
    }
  }
  const details = { day: tomorrow, zones: byZone.size, messages, errors };
  if (run.data) await admin.from('job_runs').update({ finished_at: new Date().toISOString(), status: errors ? 'partial' : 'success', details }).eq('id', run.data.id);
  return json(details);
});
