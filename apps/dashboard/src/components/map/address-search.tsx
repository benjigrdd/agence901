'use client';

import type { GeoPoint } from '@app/shared';
import { useEffect, useId, useRef, useState } from 'react';

import { searchAddressAction } from '@/app/actions/geocoding';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AddressSearchProps = {
  slug: string;
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (result: { label: string; point: GeoPoint }) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** Champ adresse avec autocompletion (combobox ARIA, debounce 300 ms). */
export function AddressSearch({ slug, id, value, onValueChange, onSelect, invalid, describedBy }: AddressSearchProps) {
  const listId = useId();
  const [results, setResults] = useState<{ label: string; point: GeoPoint }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!touched) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void searchAddressAction(slug, value).then((r) => {
        setResults(r);
        setOpen(r.length > 0);
        setActive(-1);
      });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [slug, value, touched]);

  const choose = (index: number) => {
    const result = results[index];
    if (!result) return;
    onSelect(result);
    setOpen(false);
    setTouched(false);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setTouched(true);
          onValueChange(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            choose(active);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Adresses proposées"
        className={cn('bg-popover absolute z-20 mt-1 w-full rounded-md border shadow-md', !open && 'hidden')}
      >
        {results.map((r, i) => (
          <li
            key={`${r.label}-${i}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={cn('cursor-pointer px-3 py-2 text-sm', i === active && 'bg-accent')}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(i);
            }}
          >
            {r.label}
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {open ? `${results.length} adresse${results.length > 1 ? 's' : ''} proposée${results.length > 1 ? 's' : ''}` : ''}
      </p>
    </div>
  );
}
