// Quotidien (pg_cron) : si une tache planifiee a echoue deux fois de suite, email a l'editeur via le
// SMTP configure (secrets SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_FROM, ALERT_EMAIL_TO).
// Le message ne contient que des noms de taches et des dates : aucune donnee de commune.
import nodemailer from 'npm:nodemailer@6';

import { serviceClient } from '../_shared/caller.ts';
import { json } from '../_shared/cors.ts';
import { isServiceCall } from '../_shared/expo.ts';

type JobHealth = { job: string; last_run_at: string | null; last_status: string | null; failing: boolean };

const isLocal = () => /kong|127\.0\.0\.1/.test(Deno.env.get('SUPABASE_URL') ?? '');

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: 'Accès refusé' }, 401);
  const body = (await req.json().catch(() => ({}))) as { smtpHost?: unknown; smtpPort?: unknown; alertTo?: unknown };
  const admin = serviceClient();
  const { data, error } = await admin.from('job_health').select('job, last_run_at, last_status, failing');
  if (error) return json({ error: 'Lecture de l’état des tâches impossible' }, 500);
  const failing = ((data ?? []) as JobHealth[]).filter((j) => j.failing);
  if (failing.length === 0) return json({ failing: [], sent: false });

  // Surcharges acceptees uniquement en local (tests avec le serveur SMTP de developpement).
  const to = isLocal() && typeof body.alertTo === 'string' ? body.alertTo : Deno.env.get('ALERT_EMAIL_TO');
  const host = isLocal() && typeof body.smtpHost === 'string' ? body.smtpHost : Deno.env.get('SMTP_HOST');
  const port = isLocal() && typeof body.smtpPort === 'number' ? body.smtpPort : Number(Deno.env.get('SMTP_PORT') ?? 465);
  if (!to || !host) return json({ failing: failing.map((j) => j.job), sent: false, reason: 'SMTP ou destinataire non configuré' });

  const user = Deno.env.get('SMTP_USER');
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, ...(user ? { auth: { user, pass: Deno.env.get('SMTP_PASS') ?? '' } } : {}) });
  const lines = failing.map((j) => `- ${j.job} : dernière exécution ${j.last_run_at ?? 'inconnue'} (${j.last_status ?? '?'})`);
  try {
    await transport.sendMail({
      from: Deno.env.get('ALERT_EMAIL_FROM') ?? 'alertes@plateforme-mairies.fr',
      to,
      subject: `[Plateforme mairies] ${failing.length} tâche(s) planifiée(s) en échec`,
      text: `Les tâches suivantes ont échoué deux fois de suite :\n\n${lines.join('\n')}\n\nDétail : table job_runs (super-admin). Procédure : docs/taches-serveur.md.\n`,
    });
  } catch (error) {
    console.error('job-alerts: envoi SMTP impossible', error instanceof Error ? error.message : error);
    return json({ failing: failing.map((j) => j.job), sent: false, reason: 'Envoi SMTP impossible' }, 502);
  }
  return json({ failing: failing.map((j) => j.job), sent: true });
});
