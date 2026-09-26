'use client';

import type { ContactInfo } from '@app/shared';
import { emptyWeeklyHours, openingHoursErrors, parseOpeningHours, serializeOpeningHours } from '@app/shared';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { OpeningHoursEditor } from '@/components/opening-hours-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { saveContactAction } from './actions';

/** Bloc « Mairie : horaires et contact », enregistre dans `TenantAppConfig.contact`. */
export function ContactForm({ slug, canEdit, initial }: { slug: string; canEdit: boolean; initial: ContactInfo }) {
  const [pending, startTransition] = useTransition();
  const [hours, setHours] = useState(parseOpeningHours(initial.openingHours) ?? emptyWeeklyHours());
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Object.keys(openingHoursErrors(hours)).length) return setErrors({ openingHours: 'Corrigez les horaires' });
    startTransition(async () => {
      const r = await saveContactAction(slug, {
        openingHours: serializeOpeningHours(hours),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      });
      if (r.ok) {
        setErrors({});
        toast.success('Contact de la mairie enregistré');
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.message);
      }
    });
  };

  return (
    <section aria-labelledby="contact-mairie" className="space-y-3">
      <h2 id="contact-mairie" className="text-lg font-semibold">
        Mairie : horaires et contact
      </h2>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={!canEdit || pending} className="grid gap-4 lg:grid-cols-2">
          <OpeningHoursEditor value={hours} onChange={setHours} />
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="m-tel">Téléphone</Label>
              <Input id="m-tel" type="tel" value={phone} aria-invalid={errors.phone ? true : undefined} onChange={(e) => setPhone(e.target.value)} />
              {errors.phone ? <p role="alert" className="text-destructive text-sm">{errors.phone}</p> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-email">Email</Label>
              <Input id="m-email" type="email" value={email} aria-invalid={errors.email ? true : undefined} onChange={(e) => setEmail(e.target.value)} />
              {errors.email ? <p role="alert" className="text-destructive text-sm">{errors.email}</p> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-adresse">Adresse</Label>
              <Input id="m-adresse" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
            </div>
            {errors.openingHours ? <p role="alert" className="text-destructive text-sm">{errors.openingHours}</p> : null}
            {canEdit ? <Button type="submit">Enregistrer le contact</Button> : <p className="text-muted-foreground text-sm">Modification réservée aux administrateurs.</p>}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
