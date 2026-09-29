import { formatNumberFr } from '@app/shared';
import { Info } from 'lucide-react';

type TruncationNoticeProps = {
  shown: number;
  total: number;
  /** Ce que l'utilisateur peut faire pour voir le reste (filtrer, exporter…). */
  hint: string;
};

/** Signale qu'une liste n'affiche qu'une partie des resultats : jamais de troncature silencieuse. */
export function TruncationNotice({ shown, total, hint }: TruncationNoticeProps) {
  if (total <= shown) return null;
  return (
    <p role="status" className="bg-muted text-foreground mb-4 flex items-start gap-2 rounded-md border p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Affichage des {formatNumberFr(shown)} premiers résultats sur {formatNumberFr(total)}. {hint}
      </span>
    </p>
  );
}
