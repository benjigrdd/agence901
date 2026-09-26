'use client';

import type { TenantCreationInput, TenantModuleKey, TenantPlan, TenantType } from '@app/shared';
import { formatNumberFr, MODULE_LABELS, slugify, TENANT_PLAN_LABELS, TENANT_PLANS, TENANT_TYPE_LABELS, TENANT_TYPES, TenantCreationInputSchema } from '@app/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import type { BrandingDraft } from '@/components/admin/branding-editor';
import { BrandingEditor, isBrandingValid } from '@/components/admin/branding-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CommuneSuggestion } from '@/lib/commune-suggestion';
import { CommuneSuggestionSchema } from '@/lib/commune-suggestion';

import { createTenantAction, isSlugAvailableAction } from '../actions';

type Identity = { name: string; type: TenantType; slug: string; inseeCode: string; population: string; lat: string; lng: string; plan: TenantPlan };
const STEPS = ['Identité', 'Marque', 'Modules', 'Premier administrateur', 'Récapitulatif'] as const;
const SELECT = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const Err = ({ id, message }: { id?: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  ) : null;

export function TenantWizard({ modules }: { modules: { key: TenantModuleKey; v2: boolean }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [identity, setIdentity] = useState<Identity>({ name: '', type: 'commune', slug: '', inseeCode: '', population: '', lat: '', lng: '', plan: 'pilot' });
  const [slugEdited, setSlugEdited] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CommuneSuggestion[] | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [branding, setBranding] = useState<BrandingDraft>({
    appName: '',
    shortName: '',
    colors: { primary: '#1d4e89', onPrimary: '#ffffff', secondary: '#f2a900', background: '#ffffff', surface: '#f1f5f9', text: '#111827' },
    logoUrl: null,
  });
  const [enabled, setEnabled] = useState<TenantModuleKey[]>(modules.filter((m) => !m.v2).map((m) => m.key));
  const [admin, setAdmin] = useState({ email: '', displayName: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      void fetch(`/api/admin/communes?nom=${encodeURIComponent(query.trim())}`)
        .then(async (r) => {
          setGeoError(r.headers.get('X-Geo-Error') === '1');
          const parsed = CommuneSuggestionSchema.array().safeParse(r.ok ? await r.json() : []);
          setSuggestions(parsed.success ? parsed.data : []);
        })
        .catch(() => {
          setGeoError(true);
          setSuggestions([]);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = (c: CommuneSuggestion) => {
    const slug = slugEdited ? identity.slug : slugify(c.name);
    setIdentity({ ...identity, name: c.name, inseeCode: c.inseeCode, population: String(c.population), lat: c.center ? String(c.center.lat) : '', lng: c.center ? String(c.center.lng) : '', slug });
    setBranding((b) => ({ ...b, appName: b.appName || `Ma ville ${c.name}`.slice(0, 30), shortName: b.shortName || c.name.slice(0, 12) }));
    setSuggestions(null);
    setQuery('');
  };

  const buildInput = (): TenantCreationInput => ({
    identity: {
      name: identity.name.trim(),
      type: identity.type,
      slug: identity.slug,
      inseeCode: identity.inseeCode.trim(),
      population: Number(identity.population),
      center: { lat: Number(identity.lat), lng: Number(identity.lng) },
      plan: identity.plan,
    },
    branding: { appName: branding.appName.trim(), shortName: branding.shortName.trim(), colors: branding.colors, logoUrl: branding.logoUrl },
    modules: enabled,
    firstAdmin: { email: admin.email.trim(), displayName: admin.displayName.trim() },
  });

  const fieldErrors = (part: 'identity' | 'firstAdmin'): Record<string, string> => {
    const schema = TenantCreationInputSchema.shape[part];
    const result = schema.safeParse(buildInput()[part]);
    if (result.success) return {};
    const out: Record<string, string> = {};
    for (const issue of result.error.issues) out[issue.path.join('.')] ??= issue.message;
    return out;
  };

  const next = async () => {
    if (step === 0) {
      const errs = fieldErrors('identity');
      if (!errs.slug && identity.slug && !(await isSlugAvailableAction(identity.slug))) errs.slug = 'Cet identifiant d’URL est déjà utilisé';
      setErrors(errs);
      if (Object.keys(errs).length) return;
    }
    if (step === 1 && !isBrandingValid(branding)) {
      setErrors({ branding: 'Corrigez la marque : noms obligatoires et contrastes d’au moins 4,5:1.' });
      return;
    }
    if (step === 3) {
      const errs = fieldErrors('firstAdmin');
      setErrors(errs);
      if (Object.keys(errs).length) return;
    }
    setErrors({});
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const create = () =>
    startTransition(async () => {
      const r = await createTenantAction(buildInput());
      if (r.ok) {
        toast.success('Commune créée');
        router.push(`/admin/communes/${r.data.id}`);
      } else {
        setErrors(r.fieldErrors ?? { form: r.message });
        toast.error(r.message);
      }
    });

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Étapes">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className={`rounded-full border px-3 py-1 ${i === step ? 'border-primary bg-primary text-primary-foreground' : i < step ? 'border-green-700 text-green-800' : 'text-muted-foreground'}`}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold focus:outline-none" aria-live="polite">
        Étape {step + 1} sur {STEPS.length} : {STEPS[step]}
      </h2>

      {step === 0 ? (
        <div className="max-w-3xl space-y-4">
          <div className="space-y-1">
            <Label htmlFor="w-recherche">Rechercher la commune (base officielle geo.api.gouv.fr)</Label>
            <Input id="w-recherche" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom de la commune" autoComplete="off" />
            {geoError ? <p className="text-sm text-amber-900">Recherche indisponible : saisissez les informations manuellement ci-dessous.</p> : null}
            {suggestions && suggestions.length > 0 ? (
              <ul className="divide-y rounded-md border" aria-label="Communes trouvées">
                {suggestions.map((c) => (
                  <li key={c.inseeCode}>
                    <button type="button" className="hover:bg-accent w-full px-3 py-2 text-left text-sm" onClick={() => choose(c)}>
                      {c.name} ({c.postalCodes[0] ?? c.inseeCode}) · {formatNumberFr(c.population)} habitants
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="w-nom">Nom</Label>
              <Input id="w-nom" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value, slug: slugEdited ? identity.slug : slugify(e.target.value) })} aria-invalid={errors.name ? true : undefined} />
              <Err message={errors.name} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-slug">Identifiant d’URL</Label>
              <Input
                id="w-slug"
                value={identity.slug}
                aria-describedby="w-slug-aide"
                aria-invalid={errors.slug ? true : undefined}
                onChange={(e) => {
                  setSlugEdited(true);
                  setIdentity({ ...identity, slug: e.target.value });
                }}
              />
              <p id="w-slug-aide" className="text-muted-foreground text-xs">
                Adresse de l’espace : /{identity.slug || 'identifiant'}
              </p>
              <Err message={errors.slug} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-insee">Code INSEE</Label>
              <Input id="w-insee" value={identity.inseeCode} onChange={(e) => setIdentity({ ...identity, inseeCode: e.target.value })} aria-invalid={errors.inseeCode ? true : undefined} />
              <Err message={errors.inseeCode} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-population">Population</Label>
              <Input id="w-population" inputMode="numeric" value={identity.population} onChange={(e) => setIdentity({ ...identity, population: e.target.value })} aria-invalid={errors.population ? true : undefined} />
              <Err message={errors.population} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-lat">Latitude du centre</Label>
              <Input id="w-lat" inputMode="decimal" value={identity.lat} onChange={(e) => setIdentity({ ...identity, lat: e.target.value })} aria-invalid={errors['center.lat'] ? true : undefined} />
              <Err message={errors['center.lat']} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-lng">Longitude du centre</Label>
              <Input id="w-lng" inputMode="decimal" value={identity.lng} onChange={(e) => setIdentity({ ...identity, lng: e.target.value })} aria-invalid={errors['center.lng'] ? true : undefined} />
              <Err message={errors['center.lng']} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-type">Type</Label>
              <select id="w-type" className={SELECT} value={identity.type} onChange={(e) => setIdentity({ ...identity, type: TENANT_TYPES.find((t) => t === e.target.value) ?? 'commune' })}>
                {TENANT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TENANT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-plan">Offre</Label>
              <select id="w-plan" className={SELECT} value={identity.plan} onChange={(e) => setIdentity({ ...identity, plan: TENANT_PLANS.find((p) => p === e.target.value) ?? 'pilot' })}>
                {TENANT_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {TENANT_PLAN_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <>
          <BrandingEditor value={branding} onChange={setBranding} />
          <Err message={errors.branding} />
        </>
      ) : null}

      {step === 2 ? (
        <ul className="grid max-w-3xl gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <Label htmlFor={`w-mod-${m.key}`} className="font-normal">
                {MODULE_LABELS[m.key]}
                {m.v2 ? <span className="text-muted-foreground block text-xs">Disponible en V2</span> : null}
              </Label>
              <Switch
                id={`w-mod-${m.key}`}
                disabled={m.v2}
                checked={!m.v2 && enabled.includes(m.key)}
                onCheckedChange={(on) => setEnabled((cur) => (on ? [...cur, m.key] : cur.filter((k) => k !== m.key)))}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {step === 3 ? (
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="w-admin-nom">Nom</Label>
            <Input id="w-admin-nom" value={admin.displayName} onChange={(e) => setAdmin({ ...admin, displayName: e.target.value })} aria-invalid={errors.displayName ? true : undefined} />
            <Err message={errors.displayName} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="w-admin-email">Email</Label>
            <Input id="w-admin-email" type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} aria-invalid={errors.email ? true : undefined} />
            <Err message={errors.email} />
          </div>
          <p className="text-muted-foreground text-sm sm:col-span-2">L’invitation est créée au statut « Invité » ; l’email sera envoyé à partir du lot 13.</p>
        </div>
      ) : null}

      {step === 4 ? (
        <dl className="grid max-w-2xl gap-2 text-sm sm:grid-cols-[200px_1fr]">
          <dt className="text-muted-foreground">Commune</dt>
          <dd>
            {identity.name} ({TENANT_TYPE_LABELS[identity.type]}, INSEE {identity.inseeCode}, {formatNumberFr(Number(identity.population) || 0)} habitants)
          </dd>
          <dt className="text-muted-foreground">Adresse de l’espace</dt>
          <dd>/{identity.slug}</dd>
          <dt className="text-muted-foreground">Offre</dt>
          <dd>{TENANT_PLAN_LABELS[identity.plan]}</dd>
          <dt className="text-muted-foreground">Application</dt>
          <dd>
            {branding.appName} (« {branding.shortName} »)
          </dd>
          <dt className="text-muted-foreground">Modules</dt>
          <dd>{enabled.map((m) => MODULE_LABELS[m]).join(', ') || 'Aucun'}</dd>
          <dt className="text-muted-foreground">Premier administrateur</dt>
          <dd>
            {admin.displayName} ({admin.email})
          </dd>
        </dl>
      ) : null}

      <Err message={errors.form} />
      <div className="flex gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            Précédent
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => void next()}>
            Suivant
          </Button>
        ) : (
          <Button type="button" onClick={create} disabled={pending}>
            Créer la commune
          </Button>
        )}
      </div>
    </div>
  );
}
