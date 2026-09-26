'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';

type Week = { label: string; created: number; resolved: number };

/** Graphique + resume textuel + tableau equivalent (aucune information portee par la seule couleur). */
export function ReportsChart({ weeks }: { weeks: Week[] }) {
  const [showTable, setShowTable] = useState(false);
  const created = weeks.reduce((s, w) => s + w.created, 0);
  const resolved = weeks.reduce((s, w) => s + w.resolved, 0);
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {created} créés, {resolved} résolus sur la période.
      </p>
      <div className="h-64 w-full" role="img" aria-label={`Histogramme : ${created} signalements créés et ${resolved} résolus sur 12 semaines. Détail dans le tableau des données.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <pattern id="hachures" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#15803d" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="created" name="Créés (plein)" fill="#1d4ed8" />
            <Bar dataKey="resolved" name="Résolus (hachuré)" fill="url(#hachures)" stroke="#15803d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Button variant="outline" size="sm" aria-expanded={showTable} aria-controls="donnees-signalements" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Masquer les données' : 'Voir les données'}
      </Button>
      <div id="donnees-signalements" hidden={!showTable}>
        <table className="w-full text-sm">
          <caption className="sr-only">Signalements créés et résolus par semaine</caption>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-1">
                Semaine du
              </th>
              <th scope="col">Créés</th>
              <th scope="col">Résolus</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.label} className="border-b">
                <th scope="row" className="py-1 text-left font-normal">
                  {w.label}
                </th>
                <td>{w.created}</td>
                <td>{w.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
