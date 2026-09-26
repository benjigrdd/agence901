'use client';

import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';

type Day = { date: string; label: string; installs: number; activeUsers: number; reports: number; posts: number };

const SERIES = [
  { key: 'installs', label: 'Installations' },
  { key: 'activeUsers', label: 'Utilisateurs actifs' },
  { key: 'reports', label: 'Signalements' },
  { key: 'posts', label: 'Publications' },
] as const;

/** Un petit graphique par indicateur (titre explicite, pas de legende par couleur) + tableau equivalent. */
export function UsageCharts({ days }: { days: Day[] }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {SERIES.map((s) => {
          const total = days.reduce((sum, d) => sum + d[s.key], 0);
          return (
            <figure key={s.key} className="space-y-1">
              <figcaption className="text-sm font-medium">
                {s.label} sur 90 jours : {total}
              </figcaption>
              <div className="h-40" role="img" aria-label={`${s.label} par jour sur 90 jours, total ${total}. Détail dans le tableau des données.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart accessibilityLayer={false} data={days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} interval={14} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey={s.key} name={s.label} stroke="#1d4ed8" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </figure>
          );
        })}
      </div>
      <Button variant="outline" size="sm" aria-expanded={showTable} aria-controls="usage-donnees" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Masquer les données' : 'Voir les données'}
      </Button>
      <div id="usage-donnees" hidden={!showTable} className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Usage quotidien sur 90 jours</caption>
          <thead>
            <tr className="border-b text-left">
              <th scope="col">Date</th>
              {SERIES.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-b">
                <th scope="row" className="text-left font-normal">
                  {d.label}
                </th>
                {SERIES.map((s) => (
                  <td key={s.key}>{d[s.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
