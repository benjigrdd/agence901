// Toutes les minutes (pg_cron) : notifications dues, suivi des signalements, accuses de reception Expo.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { json } from '../_shared/cors.ts';
import { expoBaseUrl, fetchReceipts, isServiceCall, sendPush } from '../_shared/expo.ts';

type Recipient = { pushTokenId: string; token: string };
type DueNotification = { id: string; title: string; body: string; channel: string; url: string | null; recipients: Recipient[] };
type OutboxItem = { id: string; kind: string; payload: { reportId?: string; reference?: string; message?: string | null }; tokens: Recipient[] };

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: 'Accès refusé' }, 401);
  const body = (await req.json().catch(() => ({}))) as { expoUrl?: unknown; now?: unknown };
  const expo = expoBaseUrl(body.expoUrl);
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
  const run = await admin.from('job_runs').insert({ job: 'dispatch-notifications' }).select('id').single();
  const summary = { notifications: 0, messages: 0, outbox: 0, receipts: 0, errors: 0 };

  // 1. Notifications dues (ciblees, alertes, programmees).
  const claimed = await admin.rpc('claim_due_notifications', { p_limit: 20, ...(typeof body.now === 'string' ? { p_now: body.now } : {}) });
  for (const n of (claimed.data ?? []) as DueNotification[]) {
    try {
      const tickets = await sendPush(
        expo,
        n.recipients.map((r) => ({ to: r.token, title: n.title, body: n.body, channelId: n.channel, sound: 'default', priority: n.channel === 'alertes' ? 'high' : 'normal', data: { url: n.url } })),
      );
      const results = n.recipients.map((r, i) => ({ pushTokenId: r.pushTokenId, ticketId: tickets[i]?.id ?? null, status: tickets[i]?.status ?? 'error', error: tickets[i]?.details?.error ?? null }));
      await admin.rpc('record_push_results', { p_notification_id: n.id, p_results: results });
      summary.notifications++;
      summary.messages += results.length;
    } catch (error) {
      summary.errors++;
      await admin.rpc('record_push_results', { p_notification_id: n.id, p_results: [], p_error: error instanceof Error ? error.message : 'Erreur' });
    }
  }

  // 2. Suivi des signalements (messages publics du personnel).
  const outbox = await admin.rpc('claim_outbox', { p_limit: 100 });
  for (const item of (outbox.data ?? []) as OutboxItem[]) {
    if (item.tokens.length === 0) continue;
    try {
      await sendPush(
        expo,
        item.tokens.map((t) => ({
          to: t.token,
          title: `Signalement ${item.payload.reference ?? ''}`.trim(),
          body: item.payload.message ?? 'Votre signalement a été mis à jour.',
          channelId: 'signalements',
          data: { url: item.payload.reportId ? `/signalements/${item.payload.reportId}` : null },
        })),
      );
      summary.outbox++;
    } catch {
      summary.errors++;
    }
  }

  // 3. Accuses de reception (jetons desinscrits → invalides).
  const pending = await admin.rpc('pending_receipts', { p_limit: 300 });
  const rows = (pending.data ?? []) as { delivery_id: string; ticket_id: string }[];
  if (rows.length) {
    const receipts = await fetchReceipts(expo, rows.map((r) => r.ticket_id));
    await admin.rpc('record_receipts', {
      p_receipts: rows.map((r) => ({ deliveryId: r.delivery_id, status: receipts[r.ticket_id]?.status ?? null, error: receipts[r.ticket_id]?.details?.error ?? null })),
    });
    summary.receipts = rows.length;
  }

  if (run.data) await admin.from('job_runs').update({ finished_at: new Date().toISOString(), status: summary.errors ? 'partial' : 'success', details: summary }).eq('id', run.data.id);
  return json(summary);
});
