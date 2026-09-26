'use client';

import { ALT_TEXT_REQUIRED_MESSAGE } from '@app/shared';
import { ImageUp } from 'lucide-react';
import { useId, useState } from 'react';

import type { MediaView } from '@/app/[tenant]/(app)/mediatheque/actions';
import { uploadMediaAction } from '@/app/[tenant]/(app)/mediatheque/actions';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resizeToWebp } from '@/lib/image';
import { cn } from '@/lib/utils';

type MediaUploadProps = { slug: string; onUploaded: (media: MediaView) => void };

/** Televersement : glisser-deposer ou bouton, redimensionnement 2 000 px, WebP, texte alternatif. */
export function MediaUpload({ slug, onUploaded }: MediaUploadProps) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [decorative, setDecorative] = useState(false);
  const [credit, setCredit] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ form?: string; altText?: string; file?: string }>({});

  const pick = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!candidate.type.startsWith('image/')) {
      setErrors({ file: 'Choisissez un fichier image (JPEG, PNG, WebP…)' });
      return;
    }
    setErrors({});
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  };

  const submit = async () => {
    if (!file) {
      setErrors({ file: 'Choisissez une image' });
      return;
    }
    if (!decorative && !altText.trim()) {
      setErrors({ altText: ALT_TEXT_REQUIRED_MESSAGE });
      document.getElementById(`${id}-alt`)?.focus();
      return;
    }
    setPending(true);
    try {
      const resized = await resizeToWebp(file);
      const result = await uploadMediaAction(
        slug,
        { name: file.name, ...resized },
        { altText: decorative ? '' : altText.trim(), decorative, credit: credit.trim() || null },
      );
      if (!result.ok) {
        setErrors({ form: result.message, altText: result.fieldErrors?.altText });
        return;
      }
      onUploaded(result.data);
      setFile(null);
      setPreview(null);
      setAltText('');
      setCredit('');
      setDecorative(false);
    } catch {
      setErrors({ form: 'Impossible de traiter cette image' });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files[0]);
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center',
          dragging ? 'border-primary bg-muted' : 'border-border',
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- apercu local (objet blob)
          <img src={preview} alt="Aperçu de l’image choisie" className="max-h-40 rounded-md object-contain" />
        ) : (
          <ImageUp className="text-muted-foreground size-10" aria-hidden="true" />
        )}
        <p className="text-muted-foreground text-sm">Glissez une image ici ou</p>
        <Label htmlFor={`${id}-file`} className="cursor-pointer">
          <span className="border-input hover:bg-accent inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium">
            Choisir un fichier
          </span>
        </Label>
        <input
          id={`${id}-file`}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-describedby={errors.file ? `${id}-file-error` : undefined}
          onChange={(event) => pick(event.target.files?.[0])}
        />
        {errors.file ? (
          <p id={`${id}-file-error`} className="text-destructive text-sm font-medium">
            {errors.file}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">Redimensionnée à 2 000 px maximum et convertie en WebP.</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id={`${id}-decorative`} checked={decorative} onCheckedChange={(v) => setDecorative(v === true)} />
        <Label htmlFor={`${id}-decorative`}>Image décorative (aucune information à transmettre)</Label>
      </div>

      {!decorative ? (
        <FormField
          id={`${id}-alt`}
          label="Texte alternatif"
          required
          help="Décrivez ce que montre l’image pour les personnes qui ne la voient pas."
          error={errors.altText}
        >
          {(control) => <Input {...control} value={altText} onChange={(e) => setAltText(e.target.value)} maxLength={250} />}
        </FormField>
      ) : null}

      <FormField id={`${id}-credit`} label="Crédit" help="Auteur ou source de l’image (facultatif).">
        {(control) => <Input {...control} value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={120} />}
      </FormField>

      {errors.form ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {errors.form}
        </p>
      ) : null}
      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? 'Téléversement…' : 'Téléverser'}
      </Button>
    </div>
  );
}
