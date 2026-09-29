// Toutes les minutes (pg_cron) : notifications dues, suivi des signalements, accuses de reception Expo.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { json } from '../_shared/cors.ts';
import { expoBaseUrl, fetchReceipts, isServiceCall, sendPush } from '../_shared/expo.ts';
import { parseRows, readJsonObject, RecipientSchema, z } from '../_shared/validate.ts';

const DueNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  channel: z.string(),
  url: z.string().nullable(),
  recipients: z.array(RecipientSchema),
});
const OutboxItemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  payload: z.object({ reportId: z.string().optional(), reference: z.string().optional(), message: z.string().nullable().optional() }),
  tokens: z.array(RecipientSchema),
});
const PendingReceiptSchema = z.object({ delivery_id: z.string(), ticket_id: z.string() });

Deno.serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: 'Accès refusé' }, 401);
  const body = await readJsonObject(req);
  const expo = expoBaseUrl(body.expoUrl);
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
  const run = await admin.from('job_runs').insert({ job: 'dispatch-notifications' }).select('id').single();
  const summary = { notifications: 0, messages: 0, outbox: 0, receipts: 0, errors: 0 };

  // 1. Notifications dues (ciblees, alertes, programmees).
  const claimed = await admin.rpc('claim_due_notifications', { p_limit: 20, ...(typeof body.now === 'string' ? { p_now: body.now } : {}) });
  for (const n of parseRows(DueNotificationSchema, claimed.data)) {
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
  for (const item of parseRows(OutboxItemSchema, outbox.data)) {
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
  const rows = parseRows(PendingReceiptSchema, pending.data);
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
