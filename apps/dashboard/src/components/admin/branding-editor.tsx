'use client';

import type { BrandingColors } from '@app/shared';
import { checkBrandingPalette, EMPTY_RICH_TEXT_DOC, formatContrastRatio, MIN_TEXT_CONTRAST, normalizeHexColor } from '@app/shared';
import { CircleCheck, CircleX } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { MobilePreview } from '@/components/mobile-preview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type BrandingDraft = { appName: string; shortName: string; colors: BrandingColors; logoUrl: string | null };

const COLOR_FIELDS: { key: keyof BrandingColors; label: string }[] = [
  { key: 'primary', label: 'Couleur primaire' },
  { key: 'onPrimary', label: 'Texte sur primaire' },
  { key: 'secondary', label: 'Couleur secondaire' },
  { key: 'background', label: 'Fond' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Texte' },
];

/** Vrai si la marque peut etre enregistree (noms et contrastes AA). */
export function isBrandingValid(b: BrandingDraft): boolean {
  const colorsOk = Object.values(b.colors).every((c) => normalizeHexColor(c) !== null);
  return colorsOk && b.appName.trim().length > 0 && b.appName.length <= 30 && b.shortName.trim().length > 0 && b.shortName.length <= 12 && checkBrandingPalette(b.colors).every((c) => c.ok);
}

/** Saisie de la marque avec controle de contraste en direct et apercu mobile (assistant et fiche commune). */
export function BrandingEditor({ value, onChange, disabled }: { value: BrandingDraft; onChange: (v: BrandingDraft) => void; disabled?: boolean }) {
  const [logoError, setLogoError] = useState<string | null>(null);
  const colorsValid = Object.values(value.colors).every((c) => normalizeHexColor(c) !== null);
  const checks = colorsValid ? checkBrandingPalette(value.colors) : [];
  const setColor = (key: keyof BrandingColors, raw: string) => onChange({ ...value, colors: { ...value.colors, [key]: normalizeHexColor(raw) ?? raw } });

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/svg+xml'].includes(file.type)) return setLogoError('Format attendu : SVG ou PNG');
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      if (!url) return setLogoError('Fichier illisible');
      if (file.type === 'image/svg+xml') {
        setLogoError(null);
        onChange({ ...value, logoUrl: url });
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth !== img.naturalHeight) return setLogoError(`Le logo doit être carré (reçu ${img.naturalWidth} × ${img.naturalHeight} px)`);
        if (img.naturalWidth < 1024) return setLogoError(`1 024 px minimum (reçu ${img.naturalWidth} px)`);
        setLogoError(null);
        onChange({ ...value, logoUrl: url });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <fieldset disabled={disabled} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="b-nom">Nom de l’application</Label>
            <Input id="b-nom" value={value.appName} maxLength={30} aria-describedby="b-nom-aide" onChange={(e) => onChange({ ...value, appName: e.target.value })} />
            <p id="b-nom-aide" className="text-muted-foreground text-xs">
              {value.appName.length} / 30 caractères
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-court">Nom court (sous l’icône)</Label>
            <Input id="b-court" value={value.shortName} maxLength={12} aria-describedby="b-court-aide" onChange={(e) => onChange({ ...value, shortName: e.target.value })} />
            <p id="b-court-aide" className="text-muted-foreground text-xs">
              {value.shortName.length} / 12 caractères
            </p>
          </div>
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-sm font-medium">Couleurs</legend>
          {COLOR_FIELDS.map((f) => {
            const hex = normalizeHexColor(value.colors[f.key]);
            return (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`b-${f.key}`}>{f.label}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={`${f.label} : sélecteur`} value={hex ?? '#000000'} onChange={(e) => setColor(f.key, e.target.value)} className="h-9 w-10 shrink-0 rounded border" />
                  <Input id={`b-${f.key}`} value={value.colors[f.key]} className="font-mono" aria-invalid={hex ? undefined : true} onChange={(e) => setColor(f.key, e.target.value)} />
                </div>
                {hex ? null : <p className="text-destructive text-xs">Format #rrggbb attendu</p>}
              </div>
            );
          })}
        </fieldset>
        <section aria-labelledby="contrastes" className="space-y-1">
          <h3 id="contrastes" className="text-sm font-medium">
            Contrastes (minimum {formatContrastRatio(MIN_TEXT_CONTRAST)})
          </h3>
          <ul className="space-y-1 text-sm" aria-live="polite">
            {checks.map((c) => (
              <li key={c.key} className={`flex items-center gap-2 ${c.ok ? 'text-green-800' : 'text-destructive'}`}>
                {c.ok ? <CircleCheck className="size-4" aria-hidden="true" /> : <CircleX className="size-4" aria-hidden="true" />}
                {c.label} : {formatContrastRatio(c.ratio)} {c.ok ? '(conforme)' : `: insuffisant, ${formatContrastRatio(MIN_TEXT_CONTRAST)} attendu`}
              </li>
            ))}
          </ul>
          {checks.some((c) => !c.ok) ? (
            <p role="alert" className="text-destructive text-sm font-medium">
              Contraste insuffisant : l’enregistrement est bloqué tant qu’un couple est sous {formatContrastRatio(MIN_TEXT_CONTRAST)}.
            </p>
          ) : null}
        </section>
        <div className="space-y-1">
          <Label htmlFor="b-logo">Logo (SVG ou PNG carré, 1 024 px minimum)</Label>
          <input id="b-logo" type="file" accept="image/png,image/svg+xml" onChange={onLogo} className="block text-sm" aria-describedby={logoError ? 'b-logo-erreur' : undefined} />
          {logoError ? (
            <p id="b-logo-erreur" role="alert" className="text-destructive text-sm">
              {logoError}
            </p>
          ) : null}
          {value.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- apercu local du logo choisi
            <img src={value.logoUrl} alt="Logo choisi" className="size-16 rounded border object-contain" />
          ) : null}
        </div>
      </fieldset>
      <div className="space-y-6">
        {colorsValid ? (
          <>
            <MobilePreview
              appName={value.appName || 'Nom de l’app'}
              colors={value.colors}
              kicker="Actualité"
              title="Travaux de la place du marché"
              summary="La place sera fermée à la circulation du 3 au 7 octobre."
              body={EMPTY_RICH_TEXT_DOC}
            />
            <figure className="space-y-1">
              <figcaption className="text-muted-foreground text-xs">Icône sur l’écran d’accueil du téléphone</figcaption>
              <div className="flex w-24 flex-col items-center gap-1 rounded-xl bg-zinc-800 p-3">
                <span className="flex size-14 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold" style={{ backgroundColor: value.colors.primary, color: value.colors.onPrimary }}>
                  {value.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- apercu local
                    <img src={value.logoUrl} alt="" className="size-10 object-contain" />
                  ) : (
                    value.shortName.slice(0, 1).toUpperCase() || '?'
                  )}
                </span>
                <span className="w-full truncate text-center text-[11px] text-white">{value.shortName || 'Nom court'}</span>
              </div>
            </figure>
          </>
        ) : null}
      </div>
    </div>
  );
}
