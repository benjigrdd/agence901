import { formatInTimeZone } from 'date-fns-tz';

/** Regle anti-lassitude : au-dela de ce nombre de notifications non urgentes par jour, justification exigee. */
export const DAILY_NON_URGENT_NOTIFICATION_LIMIT = 3;

export const NOTIFICATION_JUSTIFICATION_REQUIRED_MESSAGE =
  'Plus de 3 notifications non urgentes aujourd’hui : une justification est obligatoire';

type NotificationLike = { urgent: boolean; createdAt: string; scheduledAt: string | null };

const parisDay = (iso: string) => formatInTimeZone(new Date(iso), 'Europe/Paris', 'yyyy-MM-dd');

/** Nombre de notifications non urgentes envoyees ou programmees le meme jour (Europe/Paris). */
export function nonUrgentNotificationsOnDay(existing: readonly NotificationLike[], day: Date): number {
  const target = parisDay(day.toISOString());
  return existing.filter((n) => !n.urgent && parisDay(n.scheduledAt ?? n.createdAt) === target).length;
}

/** Vrai si la nouvelle notification depasse le quota quotidien et doit etre justifiee. */
export function requiresNotificationJustification(
  existing: readonly NotificationLike[],
  next: { urgent: boolean; scheduledAt: string | null },
  now: Date,
): boolean {
  if (next.urgent) return false;
  const day = next.scheduledAt ? new Date(next.scheduledAt) : now;
  return nonUrgentNotificationsOnDay(existing, day) >= DAILY_NON_URGENT_NOTIFICATION_LIMIT;
}
