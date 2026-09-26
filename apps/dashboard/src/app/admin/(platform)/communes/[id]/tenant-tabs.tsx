'use client';

import type { Tenant, TenantModuleKey, TenantStatus, TenantStoreInfoInput } from '@app/shared';
import {
  formatDateFr,
  MODULE_LABELS,
  STORE_PUBLICATION_STATUS_LABELS,
  STORE_PUBLICATION_STATUSES,
  TENANT_PLAN_LABELS,
  TENANT_PLANS,
  TENANT_STATUS_LABELS,
  TENANT_TYPE_LABELS,
  TENANT_TYPES,
  V2_MODULES,
} from '@app/shared';
import { TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import type { BrandingDraft } from '@/components/admin/branding-editor';
import { BrandingEditor, isBrandingValid } from '@/components/admin/branding-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/server/errors';

import { setModuleAction, setTenantStatusAction, updateBrandingAction, updateStoreInfoAction, updateTenantAction } from '../actions';

const SELECT = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = (fn: () => Promise<ActionResult<null>>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setErrors({});
        toast.success(success);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? { form: r.message });
        toast.error(r.message);
      }
    });
  return { pending, errors, run };
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GeneralTab({ tenant }: { tenant: Tenant }) {
  const { pending, errors, run } = useAction();
  const [v, setV] = useState(tenant);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { id: _id, createdAt: _c, updatedAt: _u, ...input } = v;
    void [_id, _c, _u];
    run(() => updateTenantAction(tenant.id, { ...input, internalNotes: input.internalNotes?.trim() || null }), 'Commune enregistrée');
  };
  const statuses: TenantStatus[] = tenant.status === 'suspended' ? ['suspended'] : ['onboarding', 'active'];
  return (
    <form onSubmit={submit} noValidate className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <Field id="g-nom" label="Nom" error={errors.name}>
        <Input id="g-nom" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field id="g-type" label="Type">
        <select id="g-type" className={SELECT} value={v.type} onChange={(e) => setV({ ...v, type: TENANT_TYPES.find((t) => t === e.target.value) ?? 'commune' })}>
          {TENANT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TENANT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="g-statut" label="Statut">
        <select id="g-statut" className={SELECT} value={v.status} disabled={tenant.status === 'suspended'} onChange={(e) => setV({ ...v, status: statuses.find((s) => s === e.target.value) ?? v.status })}>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {TENANT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="g-plan" label="Offre">
        <select id="g-plan" className={SELECT} value={v.plan} onChange={(e) => setV({ ...v, plan: TENANT_PLANS.find((p) => p === e.target.value) ?? 'pilot' })}>
          {TENANT_PLANS.map((p) => (
            <option key={p} value={p}>
              {TENANT_PLAN_LABELS[p]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="g-population" label="Population" error={errors.population}>
        <Input id="g-population" inputMode="numeric" value={v.population} onChange={(e) => setV({ ...v, population: Number(e.target.value) || 0 })} />
      </Field>
      <Field id="g-renouvellement" label="Date de renouvellement" error={errors.renewalDate}>
        <Input id="g-renouvellement" type="date" value={v.renewalDate ?? ''} onChange={(e) => setV({ ...v, renewalDate: e.target.value || null })} />
      </Field>
      <div className="sm:col-span-2">
        <Field id="g-notes" label="Notes internes (jamais visibles par la commune)" error={errors.internalNotes}>
          <Textarea id="g-notes" maxLength={2000} value={v.internalNotes ?? ''} onChange={(e) => setV({ ...v, internalNotes: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function BrandingTab({ tenantId, initial, iconUrl }: { tenantId: string; initial: BrandingDraft; iconUrl: string | null }) {
  const { pending, errors, run } = useAction();
  const [b, setB] = useState(initial);
  const valid = isBrandingValid(b);
  return (
    <div className="space-y-4">
      <p role="note" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Le nom, l’icône et l’écran de démarrage nécessitent une nouvelle version de l’app ; les couleurs sont appliquées à distance.
      </p>
      <BrandingEditor value={b} onChange={setB} />
      {errors.form ? (
        <p role="alert" className="text-destructive text-sm">
          {errors.form}
        </p>
      ) : null}
      <Button disabled={pending || !valid} onClick={() => run(() => updateBrandingAction(tenantId, { appName: b.appName.trim(), shortName: b.shortName.trim(), colors: b.colors, logoUrl: b.logoUrl, iconUrl }), 'Marque enregistrée')}>
        Enregistrer la marque
      </Button>
      {!valid ? <p className="text-destructive text-sm">Enregistrement bloqué : corrigez les noms ou les contrastes.</p> : null}
    </div>
  );
}

export function ModulesTab({ tenantId, modules }: { tenantId: string; modules: { module: TenantModuleKey; enabled: boolean }[] }) {
  const { pending, run } = useAction();
  const v2: readonly string[] = V2_MODULES;
  return (
    <ul className="grid max-w-3xl gap-2 sm:grid-cols-2">
      {modules.map((m) => (
        <li key={m.module} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <Label htmlFor={`mod-${m.module}`} className="font-normal">
            {MODULE_LABELS[m.module]}
            {v2.includes(m.module) ? <span className="text-muted-foreground block text-xs">Disponible en V2</span> : null}
          </Label>
          <Switch
            id={`mod-${m.module}`}
            disabled={pending || v2.includes(m.module)}
            checked={m.enabled}
            onCheckedChange={(on) => run(() => setModuleAction(tenantId, m.module, on), `${MODULE_LABELS[m.module]} ${on ? 'activé' : 'désactivé'}`)}
          />
        </li>
      ))}
    </ul>
  );
}

export function StoresTab({ tenantId, initial }: { tenantId: string; initial: TenantStoreInfoInput }) {
  const { pending, errors, run } = useAction();
  const [v, setV] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(
      () =>
        updateStoreInfoAction(tenantId, {
          ...v,
          easProjectId: v.easProjectId?.trim() || null,
          appStoreId: v.appStoreId?.trim() || null,
          playStoreUrl: v.playStoreUrl?.trim() || null,
          iosRejectionReason: v.iosStatus === 'rejected' ? v.iosRejectionReason?.trim() || null : null,
          androidRejectionReason: v.androidStatus === 'rejected' ? v.androidRejectionReason?.trim() || null : null,
        }),
      'Informations store enregistrées',
    );
  };
  const text = (key: 'iosBundleId' | 'androidPackage' | 'urlScheme' | 'easProjectId' | 'appStoreId' | 'playStoreUrl', label: string) => (
    <Field id={`st-${key}`} label={label} error={errors[key]}>
      <Input id={`st-${key}`} value={v[key] ?? ''} onChange={(e) => setV({ ...v, [key]: e.target.value })} className="font-mono" />
    </Field>
  );
  const platform = (p: 'ios' | 'android', label: string) => {
    const statusKey = p === 'ios' ? 'iosStatus' : 'androidStatus';
    const reasonKey = p === 'ios' ? 'iosRejectionReason' : 'androidRejectionReason';
    return (
      <fieldset className="space-y-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{label}</legend>
        <Field id={`st-${statusKey}`} label="Statut de publication">
          <select id={`st-${statusKey}`} className={SELECT} value={v[statusKey]} onChange={(e) => setV({ ...v, [statusKey]: STORE_PUBLICATION_STATUSES.find((s) => s === e.target.value) ?? 'not_started' })}>
            {STORE_PUBLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STORE_PUBLICATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        {v[statusKey] === 'rejected' ? (
          <Field id={`st-${reasonKey}`} label="Motif du rejet" error={errors[reasonKey]}>
            <Textarea id={`st-${reasonKey}`} maxLength={500} value={v[reasonKey] ?? ''} onChange={(e) => setV({ ...v, [reasonKey]: e.target.value })} />
          </Field>
        ) : null}
      </fieldset>
    );
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {text('iosBundleId', 'Identifiant de bundle iOS')}
          {text('androidPackage', 'Package Android')}
          {text('urlScheme', 'Schéma d’URL')}
          {text('easProjectId', 'Identifiant de projet EAS')}
          {text('appStoreId', 'Identifiant App Store')}
          {text('playStoreUrl', 'Lien Play Store (https)')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {platform('ios', 'iOS')}
          {platform('android', 'Android')}
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-lg font-semibold">Onboarding de la commune</legend>
        <ul className="space-y-2">
          {v.onboardingChecklist.map((step, i) => (
            <li key={step.key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                id={`ob-${step.key}`}
                className="mt-0.5 size-4"
                checked={step.done}
                onChange={(e) =>
                  setV({
                    ...v,
                    onboardingChecklist: v.onboardingChecklist.map((s, j) => (j === i ? { ...s, done: e.target.checked, doneAt: e.target.checked ? new Date().toISOString() : null } : s)),
                  })
                }
              />
              <Label htmlFor={`ob-${step.key}`} className="block font-normal">
                {step.label}
                {step.done && step.doneAt ? <span className="text-muted-foreground block text-xs">Fait le {formatDateFr(new Date(step.doneAt), 'd MMM yyyy')}</span> : null}
              </Label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="lg:col-span-2">
        {errors.form ? (
          <p role="alert" className="text-destructive mb-2 text-sm">
            {errors.form}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function DangerZone({ tenantId, slug, status }: { tenantId: string; slug: string; status: TenantStatus }) {
  const { pending, errors, run } = useAction();
  const [confirm, setConfirm] = useState('');
  const suspended = status === 'suspended';
  return (
    <section aria-labelledby="zone-sensible" className="max-w-2xl space-y-4 rounded-lg border border-red-300 p-4">
      <h2 id="zone-sensible" className="text-lg font-semibold text-red-900">
        {suspended ? 'Réactiver la commune' : 'Suspendre la commune'}
      </h2>
      <p className="text-sm">
        {suspended
          ? 'Les membres retrouveront l’accès à leur espace et l’application reprendra son fonctionnement normal.'
          : 'Les membres n’auront plus accès à leur espace et l’application affichera un message neutre.'}
      </p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setTenantStatusAction(tenantId, suspended ? 'active' : 'suspended', confirm), suspended ? 'Commune réactivée' : 'Commune suspendue');
        }}
        className="space-y-2"
      >
        <Label htmlFor="confirm-slug">
          Pour confirmer, saisissez l’identifiant <code>{slug}</code>
        </Label>
        <Input id="confirm-slug" value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} aria-invalid={errors.confirm ? true : undefined} className="max-w-xs" />
        {errors.confirm ? (
          <p role="alert" className="text-destructive text-sm">
            {errors.confirm}
          </p>
        ) : null}
        <Button type="submit" variant={suspended ? 'default' : 'destructive'} disabled={pending || confirm.trim() !== slug}>
          {suspended ? 'Réactiver la commune' : 'Suspendre la commune'}
        </Button>
      </form>
    </section>
  );
}
