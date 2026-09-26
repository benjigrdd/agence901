'use client';

import { UserRoundCog } from 'lucide-react';

import { setPersona } from '@/app/actions/session';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type PersonaOption = { key: string; label: string; description: string };

type PersonaSwitcherProps = { personas: PersonaOption[]; current: string | null };

/** Outil de developpement : visible uniquement avec `DATA_SOURCE=mock`. */
export function PersonaSwitcher({ personas, current }: PersonaSwitcherProps) {
  const currentLabel = personas.find((p) => p.key === current)?.label ?? 'aucune';
  return (
    <div className="fixed right-4 bottom-4 z-50" data-dev-tool>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" className="shadow-lg">
            <UserRoundCog aria-hidden="true" />
            Persona : {currentLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <h2 className="mb-1 text-sm font-semibold">Changer de persona (développement)</h2>
          <p className="text-muted-foreground mb-3 text-xs">Données fictives : aucune authentification réelle.</p>
          <ul className="space-y-1">
            {personas.map((persona) => (
              <li key={persona.key}>
                <form action={setPersona}>
                  <input type="hidden" name="persona" value={persona.key} />
                  <Button
                    type="submit"
                    variant={persona.key === current ? 'default' : 'ghost'}
                    className="h-auto w-full flex-col items-start py-2 text-left whitespace-normal"
                    aria-pressed={persona.key === current}
                  >
                    <span className="font-medium">{persona.label}</span>
                    <span className="text-xs font-normal opacity-80">{persona.description}</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
