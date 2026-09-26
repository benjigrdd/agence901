'use client';

import { useEffect, useRef } from 'react';

type FormErrorSummaryProps = {
  /** Champ (id du controle) -> message. */
  errors: { fieldId: string; label: string; message: string }[];
  message?: string | null;
};

/** Resume des erreurs en haut du formulaire, avec un lien vers chaque champ. */
export function FormErrorSummary({ errors, message }: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = errors.length > 0 || !!message;
  useEffect(() => {
    if (visible) ref.current?.focus();
  }, [visible, errors.length, message]);
  if (!visible) return null;
  return (
    <div ref={ref} role="alert" tabIndex={-1} className="border-destructive bg-destructive/5 mb-6 rounded-md border p-4 focus:outline-none">
      <h2 className="text-destructive font-semibold">
        {errors.length > 0 ? `Le formulaire contient ${errors.length} erreur${errors.length > 1 ? 's' : ''}` : 'Enregistrement impossible'}
      </h2>
      {message ? <p className="mt-1 text-sm">{message}</p> : null}
      {errors.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {errors.map((e) => (
            <li key={e.fieldId}>
              <a
                href={`#${e.fieldId}`}
                className="underline"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(e.fieldId)?.focus();
                }}
              >
                {e.label} : {e.message}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
