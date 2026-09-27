/** Regles de mot de passe du personnel : 12 caracteres minimum, jauge de robustesse. */
export const PASSWORD_MIN_LENGTH = 12;

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; acceptable: boolean; hints: string[] };

const LABELS = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'] as const;
const COMMON = ['motdepasse', 'password', 'azerty', 'qwerty', '123456', 'mairie', 'bonjour', 'soleil'];

export function passwordStrength(password: string): PasswordStrength {
  const hints: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) hints.push(`${PASSWORD_MIN_LENGTH} caractères minimum`);
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) hints.push('Mélangez minuscules, majuscules, chiffres et symboles');
  const lower = password.toLowerCase();
  const common = COMMON.some((w) => lower.includes(w));
  if (common) hints.push('Évitez les mots courants');
  if (/(.)\1{3,}/.test(password)) hints.push('Évitez les caractères répétés');

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 16) score++;
  if (classes >= 3) score++;
  if (classes === 4 && password.length >= 14) score++;
  if (common || /(.)\1{3,}/.test(password)) score = Math.max(0, score - 2);
  const clamped = Math.min(4, score) as PasswordStrength['score'];
  return { score: clamped, label: LABELS[clamped], acceptable: password.length >= PASSWORD_MIN_LENGTH && clamped >= 2, hints };
}
