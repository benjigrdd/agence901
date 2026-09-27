'use client';

import { Archive } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { exportTenantAction } from './actions';

/** Export de reversibilite. Donnees personnelles : option reservee aux administrateurs de la commune. */
export function ExportButton({
  slug,
  canIncludePersonalData,
}: {
  slug: string;
  canIncludePersonalData: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [personal, setPersonal] = useState(false);
  const warningId = useId();
  return (
    <section aria-labelledby="export-titre" className="mt-10 space-y-3 rounded-lg border p-4">
      <h2 id="export-titre" className="text-lg font-semibold">
        Réversibilité
      </h2>
      <p className="text-muted-foreground text-sm">
        Téléchargez toutes les données de la commune dans une archive ZIP : chaque table en JSON et
        en CSV, quartiers, zones de collecte et lieux en GeoJSON, images de la médiathèque et un
        fichier README décrivant le format. Le lien est valable 24 heures ; l’archive est supprimée
        du serveur après 7 jours.
      </p>
      {canIncludePersonalData ? (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4"
              checked={personal}
              onChange={(e) => setPersonal(e.target.checked)}
              aria-describedby={warningId}
              disabled={pending}
            />
            Inclure les données personnelles
          </label>
          <p
            id={warningId}
            className={
              personal
                ? 'rounded-md border border-amber-600 bg-amber-50 p-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50'
                : 'text-muted-foreground text-sm'
            }
          >
            {personal
              ? 'Attention (RGPD) : l’archive contiendra les emails de contact, les identifiants pseudonymes des habitants et les photos de signalement. Conservez-la de manière sécurisée, ne la transmettez qu’à un destinataire habilité et supprimez-la après usage. L’export est inscrit dans le journal d’audit.'
              : 'Sans cette option, les signalements sont exportés sans email ni identifiant des habitants, et sans photos.'}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Les données personnelles des habitants ne sont pas incluses.
        </p>
      )}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await exportTenantAction(slug, personal);
            if (r.ok) {
              toast.success('Export prêt : téléchargement en cours');
              window.location.assign(r.data.url);
            } else toast.error(r.message);
          })
        }
      >
        <Archive aria-hidden="true" />
        {pending ? 'Préparation de l’export…' : 'Exporter toutes les données'}
      </Button>
    </section>
  );
}
