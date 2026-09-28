/**
 * Effacement des donnees personnelles avant envoi a Sentry (`beforeSend`) : emails, coordonnees GPS,
 * jetons et parametres de requete, a tous les niveaux de l'evenement (message, exception, contexte,
 * fil d'Ariane, requete). Modifie l'objet en place.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Paire latitude/longitude (au moins 3 decimales) : « 47.3941, 0.6848 » ou « POINT(0.68 47.39) ».
const COORDS = /-?\d{1,3}\.\d{3,}\s*[, ]\s*-?\d{1,3}\.\d{3,}/g;
const TOKENS = [
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // JWT
  /Expo(nent)?PushToken\[[^\]]+\]/g,
  /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi,
  /\bsb_(secret|publishable)_[A-Za-z0-9_-]+/g,
];
const SENSITIVE_KEY = /^(e-?mail|contact_?email|lat|lng|lon|latitude|longitude|coords?|point|position|token|access_?token|refresh_?token|push_?token|password|secret|authorization|cookie|cookies|set-cookie|apikey|x-api-key|query_string|ip_address)$/i;
const FILTERED = '[filtre]';

/** Chaine nettoyee : URLs sans parametres, emails, coordonnees et jetons masques. */
export function scrubString(value: string): string {
  let out = value.replace(/(https?:\/\/[^\s?#"']+)\?[^\s#"']*/g, '$1');
  out = out.replace(EMAIL, '[email]').replace(COORDS, '[coordonnees]');
  for (const token of TOKENS) out = out.replace(token, '[jeton]');
  return out;
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (value && typeof value === 'object' && depth < 12) scrubInPlace(value, depth + 1);
  return value;
}

export function scrubInPlace(target: object, depth = 0): void {
  if (Array.isArray(target)) {
    target.forEach((item, i) => {
      target[i] = scrubValue(item, depth);
    });
    return;
  }
  for (const [key, value] of Object.entries(target)) {
    if (SENSITIVE_KEY.test(key) && value !== null && value !== undefined) Reflect.set(target, key, FILTERED);
    else Reflect.set(target, key, scrubValue(value, depth));
  }
}

/** `beforeSend` / `beforeSendTransaction` : evenement nettoye, sans utilisateur identifiable. */
export function scrubSentryEvent<T extends object>(event: T): T {
  if ('user' in event && event.user && typeof event.user === 'object') {
    const id = 'id' in event.user ? event.user.id : undefined;
    Reflect.set(event, 'user', id === undefined ? undefined : { id });
  }
  scrubInPlace(event);
  return event;
}
