import type { ReviewAction } from '@app/shared';
import { formatDateFr, REVIEW_ACTION_LABELS } from '@app/shared';

export type ReviewView = {
  id: string;
  action: ReviewAction;
  comment: string | null;
  authorName: string;
  createdAt: string;
};

export function ReviewHistory({ reviews }: { reviews: ReviewView[] }) {
  return (
    <section aria-labelledby="historique-validation" className="space-y-2">
      <h2 id="historique-validation" className="text-sm font-semibold">
        Historique de validation
      </h2>
      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune soumission pour l’instant.</p>
      ) : (
        <ol className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-md border p-3 text-sm">
              <p>
                <span className="font-medium">{REVIEW_ACTION_LABELS[r.action]}</span> par {r.authorName}
                <span className="text-muted-foreground"> · {formatDateFr(new Date(r.createdAt))}</span>
              </p>
              {r.comment ? (
                <p className="mt-1">
                  <span className="font-medium">Motif :</span> {r.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
