'use client';

import type { Module, PermissionLevel, PermissionMap } from '@app/shared';
import { ADMIN_ONLY_MODULES, MODULE_LABELS, MODULES, PERMISSION_LEVEL_LABELS, PERMISSION_LEVELS, V2_MODULES } from '@app/shared';

/** Modules attribuables a un agent (hors V2 et hors modules reserves aux administrateurs). */
export const ASSIGNABLE_MODULES: Module[] = MODULES.filter(
  (m) => !(V2_MODULES as readonly string[]).includes(m) && !(ADMIN_ONLY_MODULES as readonly string[]).includes(m),
);

/** Matrice modules x niveaux : un groupe de boutons radio par module. */
export function PermissionsMatrix({ idPrefix, value, onChange, disabled }: { idPrefix: string; value: PermissionMap; onChange: (v: PermissionMap) => void; disabled?: boolean }) {
  const set = (module: Module, level: PermissionLevel | null) => {
    const next: PermissionMap = { ...value };
    if (level) next[module] = level;
    else delete next[module];
    onChange(next);
  };
  const columns: (PermissionLevel | null)[] = [null, ...PERMISSION_LEVELS];
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Droits par module</caption>
      <thead>
        <tr className="border-b text-left">
          <th scope="col" className="py-1">
            Module
          </th>
          {columns.map((c) => (
            <th key={c ?? 'none'} scope="col" className="px-2 text-center">
              {c ? PERMISSION_LEVEL_LABELS[c] : 'Aucun'}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ASSIGNABLE_MODULES.map((m) => (
          <tr key={m} className="border-b" role="radiogroup" aria-label={`Droits : ${MODULE_LABELS[m]}`}>
            <th scope="row" className="py-1 text-left font-normal">
              {MODULE_LABELS[m]}
            </th>
            {columns.map((c) => {
              const id = `${idPrefix}-${m}-${c ?? 'none'}`;
              return (
                <td key={c ?? 'none'} className="px-2 text-center">
                  <input
                    type="radio"
                    id={id}
                    name={`${idPrefix}-${m}`}
                    className="size-4"
                    disabled={disabled}
                    checked={(value[m] ?? null) === c}
                    onChange={() => set(m, c)}
                    aria-label={`${MODULE_LABELS[m]} : ${c ? PERMISSION_LEVEL_LABELS[c] : 'Aucun'}`}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
