/**
 * Chemin de redirection interne sur (parametre `next`) : chemin absolu du site uniquement. Refuse
 * `//hote`, `/\hote` (normalise en `//hote` par les navigateurs), les schemas et les caracteres de controle.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  if (/^\/[/\\]/.test(value) || /[\u0000-\u001f\\]/.test(value)) return '/';
  try {
    // Toute URL resolue hors de l'origine est refusee.
    const url = new URL(value, 'https://origine.invalid');
    return url.origin === 'https://origine.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/';
  } catch {
    return '/';
  }
}
