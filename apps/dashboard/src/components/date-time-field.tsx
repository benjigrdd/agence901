'use client';

import { isoToParisInput, parisInputToIso } from '@app/shared';

import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';

type DateTimeFieldProps = {
  id: string;
  label: string;
  /** ISO UTC ou `null`. */
  value: string | null;
  onChange: (iso: string | null) => void;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

/** Saisie en heure de Paris, stockage en ISO UTC. */
export function DateTimeField({ id, label, value, onChange, help, error, required, disabled }: DateTimeFieldProps) {
  return (
    <FormField id={id} label={label} help={help ?? 'Heure de Paris'} error={error} required={required}>
      {(control) => (
        <Input
          {...control}
          type="datetime-local"
          value={isoToParisInput(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value ? parisInputToIso(event.target.value) : null)}
        />
      )}
    </FormField>
  );
}
