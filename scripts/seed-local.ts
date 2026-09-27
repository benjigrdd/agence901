/**
 * Seed de la base Supabase LOCALE a partir des fixtures du mock (`@app/data/mock`) : memes communes,
 * memes personas, memes contenus. Refuse toute base qui n'est pas locale.
 *
 * Personas : mot de passe `Demo-Local-2026!` (uniquement en local).
 */
import { PERSONAS, USER_IDS } from '@app/data';
import { createFixtures } from '@app/data/mock';
import type { GeoMultiPolygon, GeoPoint } from '@app/shared';
import { execFileSync } from 'node:child_process';
import { crc32, deflateSync } from 'node:zlib';

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

export const LOCAL_PASSWORD = 'Demo-Local-2026!';
/** Secret TOTP (base32) des personas en local : codes calculables par les tests et par une app d'authentification. */
export const LOCAL_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const host = new URL(DB_URL).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refus : le seed de demonstration ne s'execute que sur une base locale (hote recu : ${host}).`);
  process.exit(1);
}

type Value = string | number | boolean | null | undefined | readonly unknown[] | Record<string, unknown>;
class Raw {
  constructor(readonly sql: string) {}
}

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
function literal(v: Value | Raw): string {
  if (v instanceof Raw) return v.sql;
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return quote(v);
  return quote(JSON.stringify(v));
}

/** Tableau Postgres (uuid[]) ; les autres tableaux sont ecrits en JSON. */
const pgArray = (values: readonly string[]) => new Raw(quote(`{${values.join(',')}}`));
const point = (p: GeoPoint) => `SRID=4326;POINT(${p.lng} ${p.lat})`;
const multiPolygon = (g: GeoMultiPolygon) =>
  `SRID=4326;MULTIPOLYGON(${g.coordinates.map((poly) => `(${poly.map((ring) => `(${ring.map(([x, y]) => `${x} ${y}`).join(',')})`).join(',')})`).join(',')})`;

function insert(table: string, rows: Record<string, Value | Raw>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0] ?? {});
  const values = rows.map((r) => `(${columns.map((c) => literal(r[c])).join(', ')})`).join(',\n');
  return `insert into ${table} (${columns.map((c) => `"${c}"`).join(', ')}) values\n${values};\n`;
}

const stamps = (r: { createdAt: string; updatedAt: string }) => ({ created_at: r.createdAt, updated_at: r.updatedAt });

/** Cle service LOCALE lue depuis la CLI (jamais ecrite dans le code). */
function localStatus(): { apiUrl: string; serviceKey: string } {
  const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const json: unknown = JSON.parse(raw.slice(raw.indexOf('{')));
  const get = (key: string) => (json && typeof json === 'object' && key in json ? String(Reflect.get(json, key)) : '');
  return { apiUrl: get('API_URL'), serviceKey: get('SERVICE_ROLE_KEY') };
}

function dataUrlBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = /^data:([^;,]+)((?:;[^;,]*)*),(.*)$/s.exec(dataUrl);
  const mime = match?.[1] ?? 'application/octet-stream';
  const payload = match?.[3] ?? '';
  const base64 = (match?.[2] ?? '').includes(';base64');
  return { mime, bytes: base64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload)) };
}

/** Photo de demonstration (PNG gris uni) : le bucket des photos refuse le SVG (risque de script). */
function demoPhotoPng(size = 64): Buffer {
  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([head, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x9a)]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: size }, () => row)));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', pixels), chunk('IEND', Buffer.alloc(0))]);
}
const DEMO_PHOTO_PNG = demoPhotoPng();

/** Fichiers de demonstration (mediatheque, photos de signalement) deposes dans Storage. */
async function uploadFixtureFiles(data: ReturnType<typeof createFixtures>): Promise<number> {
  const { apiUrl, serviceKey } = localStatus();
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiUrl) || !serviceKey) throw new Error('Supabase local introuvable (pnpm db:start)');
  const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });
  let count = 0;
  for (const media of data.media) {
    const { bytes, mime } = dataUrlBytes(media.url);
    const { error } = await admin.storage.from('public-media').upload(media.path, bytes, { contentType: mime, upsert: true });
    if (!error) count++;
  }
  for (const report of data.reports) {
    for (const k of report.photos.keys()) {
      const { error } = await admin.storage.from('report-photos').upload(`${report.tenantId}/${report.id}/photo-${k + 1}.png`, DEMO_PHOTO_PNG, { contentType: 'image/png', upsert: true });
      if (!error) count++;
    }
  }
  return count;
}

async function main() {
  const now = new Date();
  const data = createFixtures(now);
  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

  // Comptes Auth : personnel (mot de passe local) et habitants (sessions anonymes).
  const staffEmails = new Map(data.profiles.map((p) => [p.id, p.email]));
  const userIds = new Set<string>([
    ...data.profiles.map((p) => p.id),
    ...data.citizens.map((c) => c.userId),
    ...data.reports.map((r) => r.reporterId).filter((id): id is string => id !== null),
  ]);
  const personaByUser = new Map(Object.values(PERSONAS).map((p) => [p.userId, p]));
  const authUsers = [...userIds].map((id) => {
    const email = staffEmails.get(id) ?? (personaByUser.get(id)?.kind === 'citizen' ? 'habitant.alpha@demo-alpha.test' : null);
    const appMeta = { provider: email ? 'email' : 'anonymous', providers: email ? ['email'] : [], ...(id === USER_IDS.platformAdmin ? { platform_admin: true } : {}) };
    return {
      instance_id: '00000000-0000-0000-0000-000000000000',
      id,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      encrypted_password: email ? new Raw(`extensions.crypt(${quote(LOCAL_PASSWORD)}, extensions.gen_salt('bf'))`) : null,
      email_confirmed_at: email ? now.toISOString() : null,
      raw_app_meta_data: appMeta,
      raw_user_meta_data: {},
      is_anonymous: !email,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      confirmation_token: '',
      recovery_token: '',
      email_change_token_new: '',
      email_change: '',
    };
  });
  const identities = authUsers
    .filter((u) => u.email)
    .map((u) => ({
      provider_id: u.id,
      user_id: u.id,
      identity_data: { sub: u.id, email: u.email, email_verified: true },
      provider: 'email',
      last_sign_in_at: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));

  // 2FA deja configuree pour les personas du personnel, sauf « Admin Alpha sans 2FA ».
  const mfaFactors = Object.values(PERSONAS)
    .filter((p) => p.kind === 'staff' && p.aal === 'aal2')
    .map((p) => ({
      id: p.userId.replace(/^.{8}/, 'f0f0f0f0'),
      user_id: p.userId,
      friendly_name: 'Démo locale',
      factor_type: new Raw("'totp'::auth.factor_type"),
      status: new Raw("'verified'::auth.factor_status"),
      secret: LOCAL_TOTP_SECRET,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));

  const statements = [
    "set local app.skip_tenant_defaults = 'on';",
    "set local app.skip_audit = 'on';",
    insert('auth.users', authUsers),
    insert('auth.identities', identities),
    insert('auth.mfa_factors', mfaFactors),
    insert('public.tenants', data.tenants.map((t) => ({ id: t.id, slug: t.slug, name: t.name, type: t.type, parent_id: t.parentId, insee_code: t.inseeCode, population: t.population, status: t.status, plan: t.plan, timezone: t.timezone, center: point(t.center), renewal_date: t.renewalDate, ...stamps(t) }))),
    insert('public.tenant_internal_notes', data.tenants.filter((t) => t.internalNotes).map((t) => ({ tenant_id: t.id, notes: t.internalNotes }))),
    insert('public.tenant_branding', data.branding.map((b) => ({ id: b.id, tenant_id: b.tenantId, app_name: b.appName, short_name: b.shortName, colors: b.colors, logo_url: b.logoUrl, icon_url: b.iconUrl, ...stamps(b) }))),
    insert('public.tenant_modules', data.modules.map((m) => ({ id: m.id, tenant_id: m.tenantId, module: m.module, enabled: m.enabled, settings: m.settings, ...stamps(m) }))),
    insert('public.tenant_app_config', data.appConfigs.map((c) => ({ id: c.id, tenant_id: c.tenantId, home_layout: c.homeLayout, links: c.links, contact: c.contact, ...stamps(c) }))),
    insert('public.tenant_store_info', data.storeInfos.map((s) => ({ id: s.id, tenant_id: s.tenantId, ios_bundle_id: s.iosBundleId, android_package: s.androidPackage, eas_project_id: s.easProjectId, app_store_id: s.appStoreId, url_scheme: s.urlScheme, play_store_url: s.playStoreUrl, ios_status: s.iosStatus, android_status: s.androidStatus, ios_rejection_reason: s.iosRejectionReason, android_rejection_reason: s.androidRejectionReason, onboarding_checklist: s.onboardingChecklist, ...stamps(s) }))),
    insert('public.profiles', data.profiles.map((p) => ({ id: p.id, display_name: p.displayName, avatar_url: p.avatarUrl, ...stamps(p) }))),
    insert('public.memberships', data.memberships.map((m) => ({ id: m.id, tenant_id: m.tenantId, user_id: m.userId, role: m.role, invited_at: m.invitedAt, accepted_at: m.acceptedAt, disabled_at: m.disabledAt, ...stamps(m) }))),
    insert('public.membership_permissions', data.membershipPermissions.map((p) => ({ id: p.id, tenant_id: p.tenantId, membership_id: p.membershipId, module: p.module, level: p.level, ...stamps(p) }))),
    insert('public.topics', data.topics.map((t) => ({ id: t.id, tenant_id: t.tenantId, label: t.label, sort_order: t.order, ...stamps(t) }))),
    insert('public.districts', data.districts.map((d) => ({ id: d.id, tenant_id: d.tenantId, name: d.name, color: d.color, geom: multiPolygon(d.geom), ...stamps(d) }))),
    insert('public.waste_zones', data.wasteZones.map((z) => ({ id: z.id, tenant_id: z.tenantId, name: z.name, geom: multiPolygon(z.geom), ...stamps(z) }))),
    insert('public.waste_schedules', data.wasteSchedules.map((s) => ({ id: s.id, tenant_id: s.tenantId, zone_id: s.zoneId, waste_type: s.wasteType, rrule: s.rrule, exceptions: s.exceptions, note: s.note, ...stamps(s) }))),
    insert('public.citizen_profiles', data.citizens.map((c) => ({ user_id: c.userId, id: c.id, tenant_id: c.tenantId, locale: c.locale, district_ids: pgArray(c.districtIds), topic_ids: pgArray(c.topicIds), notification_prefs: c.notificationPrefs, waste_zone_id: c.wasteZoneId, contact_email: c.contactEmail, consent_at: c.createdAt, last_seen_at: c.lastSeenAt, ...stamps(c) }))),
    insert('public.media', data.media.map((m) => ({ id: m.id, tenant_id: m.tenantId, path: m.path, mime: m.mime, width: m.width, height: m.height, alt_text: m.altText, decorative: m.decorative, credit: m.credit, ...stamps(m) }))),
    insert('public.place_categories', data.placeCategories.map((c) => ({ id: c.id, tenant_id: c.tenantId, key: c.key, label: c.label, icon: c.icon, color: c.color, is_default: c.isDefault, hidden: c.hidden, ...stamps(c) }))),
    insert('public.places', data.places.map((p) => ({ id: p.id, tenant_id: p.tenantId, category_id: p.categoryId, name: p.name, point: point(p.point), address: p.address, opening_hours: p.openingHours, phone: p.phone, website: p.website, description: p.description, accessibility: p.accessibility, photo_media_id: p.photoMediaId, source: p.source, external_id: p.externalId, ...stamps(p) }))),
    insert('public.posts', data.posts.map((p) => ({ id: p.id, tenant_id: p.tenantId, type: p.type, title: p.title, summary: p.summary, body: p.body, cover_media_id: p.coverMediaId, status: p.status, publish_at: p.publishAt, unpublish_at: p.unpublishAt, district_ids: pgArray(p.districtIds), topic_ids: pgArray(p.topicIds), pinned: p.pinned, alert_level: p.alertLevel, send_push: p.sendPush, author_id: p.authorId, reviewer_id: p.reviewerId, ...stamps(p) }))),
    insert('public.events', data.events.map((e) => ({ id: e.id, tenant_id: e.tenantId, title: e.title, description: e.description, category: e.category, starts_at: e.startsAt, ends_at: e.endsAt, all_day: e.allDay, rrule: e.rrule, place_id: e.placeId, location_label: e.location?.label ?? null, location_point: e.location ? point(e.location.point) : null, organizer: e.organizer, price: e.price, registration_url: e.registrationUrl, cover_media_id: e.coverMediaId, accessible: e.accessible, status: e.status, publish_at: e.publishAt, author_id: e.authorId, reviewer_id: e.reviewerId, ...stamps(e) }))),
    insert('public.content_reviews', data.reviews.map((r) => ({ id: r.id, tenant_id: r.tenantId, entity_type: r.entityType, entity_id: r.entityId, action: r.action, comment: r.comment, author_id: r.authorId, ...stamps(r) }))),
    insert('public.procedures', data.procedures.map((p) => ({ id: p.id, tenant_id: p.tenantId, category: p.category, title: p.title, description: p.description, kind: p.kind, value: p.value, sort_order: p.order, ...stamps(p) }))),
    insert('public.sorting_guide_items', data.sortingGuide.map((s) => ({ id: s.id, tenant_id: s.tenantId, name: s.name, bin: s.bin, advice: s.advice, ...stamps(s) }))),
    insert('public.services', data.services.map((s) => ({ id: s.id, tenant_id: s.tenantId, name: s.name, email: s.email, ...stamps(s) }))),
    insert('public.report_categories', data.reportCategories.map((c) => ({ id: c.id, tenant_id: c.tenantId, label: c.label, icon: c.icon, default_service_id: c.defaultServiceId, sla_days: c.slaDays, ...stamps(c) }))),
    // Les doublons referencent un original : on insere d'abord les originaux.
    insert('public.reports', [...data.reports].sort((a, b) => Number(a.duplicateOfId !== null) - Number(b.duplicateOfId !== null)).map((r) => ({ id: r.id, tenant_id: r.tenantId, reference: r.reference, category_id: r.categoryId, description: r.description, point: point(r.point), address: r.address, status: r.status, priority: r.priority, service_id: r.serviceId, duplicate_of_id: r.duplicateOfId, reporter_id: r.reporterId, contact_email: r.contactEmail, ai_suggestion: r.aiSuggestion, resolved_at: r.resolvedAt, ...stamps(r) }))),
    insert('public.report_media', data.reports.flatMap((r) => r.photos.map((_, k) => ({ tenant_id: r.tenantId, report_id: r.id, path: `${r.tenantId}/${r.id}/photo-${k + 1}.png`, width: 64, height: 64 })))),
    insert('public.report_events', data.reportEvents.map((e) => ({ id: e.id, tenant_id: e.tenantId, report_id: e.reportId, kind: e.kind, from_status: e.fromStatus, to_status: e.toStatus, message: e.message, visibility: e.visibility, author_id: e.authorId, ...stamps(e) }))),
    insert('public.notifications', data.notifications.map((n) => ({ id: n.id, tenant_id: n.tenantId, title: n.title, body: n.body, target: n.target, linked_entity: n.linkedEntity, scheduled_at: n.scheduledAt, sent_at: n.sentAt, status: n.sentAt ? 'sent' : 'scheduled', stats: n.stats, urgent: n.urgent, justification: n.justification, author_id: n.authorId, ...stamps(n) }))),
    insert('public.audit_log', data.audit.map((a) => ({ id: a.id, tenant_id: a.tenantId, actor_id: a.actorId, action: a.action, entity: a.entity, entity_id: a.entityId, diff: a.diff, at: a.at }))),
    insert('public.usage_daily', data.usage.map((u) => ({ id: u.id, tenant_id: u.tenantId, date: u.date, installs: u.installs, active_users: u.activeUsers, reports_created: u.reportsCreated, posts_published: u.postsPublished }))),
    // Compteurs de references alignes sur les signalements de demonstration.
    `insert into public.tenant_counters (tenant_id, key, year, value)
     select tenant_id, 'report', split_part(reference, '-', 1)::int, max(split_part(reference, '-', 2)::int)
     from public.reports group by 1, 3
     on conflict (tenant_id, key, year) do update set value = excluded.value;`,
  ];

  await sql.begin(async (tx) => {
    for (const statement of statements.filter(Boolean)) await tx.unsafe(statement);
  });
  const [{ count }] = await sql<{ count: string }[]>`select count(*)::text as count from public.reports`;
  const files = await uploadFixtureFiles(data);
  console.log(`Fichiers deposes dans Storage : ${files}`);
  console.log(`Seed local termine : ${data.tenants.length} communes, ${authUsers.length} comptes, ${count} signalements. Mot de passe des personas : ${LOCAL_PASSWORD}, secret TOTP : ${LOCAL_TOTP_SECRET}`);
  await sql.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
