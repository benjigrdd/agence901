'use server';

import { PASSWORD_MIN_LENGTH, passwordStrength } from '@app/shared';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isSupabaseMode } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type FormState = { error?: string; fieldErrors?: Record<string, string>; message?: string } | null;

const GENERIC_LOGIN_ERROR = 'Identifiants incorrects';

/** Destination interne apres connexion (jamais une URL externe). */
function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;
}

function assertSupabase() {
  if (!isSupabaseMode()) throw new Error('Connexion réelle indisponible en mode démonstration');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  assertSupabase();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Saisissez votre email et votre mot de passe' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Message identique que le compte existe ou non.
  if (error) return { error: GENERIC_LOGIN_ERROR };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const next = encodeURIComponent(safeNext(formData.get('next')));
  // Sans appareil 2FA verifie : configuration obligatoire avant tout acces.
  redirect(aal?.nextLevel === 'aal2' ? `/connexion/2fa?next=${next}` : `/connexion/2fa/configurer?next=${next}`);
}

export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  assertSupabase();
  const code = String(formData.get('code') ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return { error: 'Le code comporte 6 chiffres' };
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).filter((f) => f.status === 'verified');
  if (verified.length === 0) redirect('/connexion/2fa/configurer');
  // Plusieurs appareils : on essaie chacun (le code ne correspond qu'a l'un d'eux).
  for (const factor of verified) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (!error) redirect(safeNext(formData.get('next')));
  }
  return { error: 'Code incorrect ou expiré' };
}

export type Enrollment = { factorId: string; qrCode: string; secret: string } | { error: string };

/** Demarre l'ajout d'un appareil TOTP (les tentatives non terminees sont supprimees). */
export async function startEnrollmentAction(): Promise<Enrollment> {
  assertSupabase();
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const count = (factors?.totp ?? []).length;
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Appareil ${count + 1} (${new Date().toISOString().slice(0, 10)})` });
  if (error || !data) return { error: 'Impossible de préparer la double authentification. Réessayez.' };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmEnrollmentAction(factorId: string, code: string, next: string): Promise<{ error: string } | void> {
  assertSupabase();
  if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) return { error: 'Le code comporte 6 chiffres' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
  if (error) return { error: 'Code incorrect ou expiré' };
  redirect(safeNext(next));
}

export async function removeFactorAction(factorId: string): Promise<{ error?: string }> {
  assertSupabase();
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).filter((f) => f.status === 'verified');
  if (verified.length <= 1) return { error: 'Gardez au moins un appareil de double authentification' };
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return error ? { error: 'Suppression impossible' } : {};
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  assertSupabase();
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { fieldErrors: { email: 'Saisissez votre email' } };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteOrigin()}/auth/confirm?next=/reinitialiser` });
  // Toujours le meme message : on ne revele pas si le compte existe.
  return { message: 'Si un compte correspond à cette adresse, un email vient de vous être envoyé.' };
}

function checkNewPassword(formData: FormData): FormState {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const strength = passwordStrength(password);
  if (password.length < PASSWORD_MIN_LENGTH) return { fieldErrors: { password: `${PASSWORD_MIN_LENGTH} caractères minimum` } };
  if (!strength.acceptable) return { fieldErrors: { password: `Mot de passe trop faible : ${strength.hints.join(', ').toLowerCase()}` } };
  if (password !== confirm) return { fieldErrors: { confirm: 'Les deux mots de passe ne correspondent pas' } };
  return null;
}

/** Nouveau mot de passe apres un lien de reinitialisation ou d'invitation. */
export async function setPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  assertSupabase();
  const invalid = checkNewPassword(formData);
  if (invalid) return invalid;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: String(formData.get('password')) });
  if (error) return { error: 'Le lien a expiré. Recommencez la procédure.' };
  if (formData.get('mode') === 'invitation') {
    await supabase.rpc('accept_invitations');
    redirect('/connexion/2fa/configurer');
  }
  redirect('/connexion/2fa');
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  assertSupabase();
  const invalid = checkNewPassword(formData);
  if (invalid) return invalid;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: String(formData.get('password')) });
  return error ? { error: 'Modification impossible. Reconnectez-vous puis réessayez.' } : { message: 'Mot de passe modifié' };
}

export async function signOutEverywhereAction(): Promise<void> {
  if (isSupabaseMode()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: 'global' });
  }
  redirect('/connexion');
}
