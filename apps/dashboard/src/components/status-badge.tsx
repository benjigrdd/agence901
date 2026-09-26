import type { ContentStatus, ReportStatus } from '@app/shared';
import { CONTENT_STATUS_LABELS, REPORT_STATUS_LABELS } from '@app/shared';
import type { LucideIcon } from 'lucide-react';
import { Archive, CalendarClock, CircleCheck, CircleDot, CircleX, Clock, Copy, Eye, PencilLine, Wrench } from 'lucide-react';

import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'muted';

// Couleurs choisies pour un contraste AA du texte sur le fond ; le texte porte toujours l'information.
const TONES: Record<Tone, string> = {
  neutral: 'border-slate-300 bg-slate-100 text-slate-900',
  info: 'border-blue-300 bg-blue-50 text-blue-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  success: 'border-green-300 bg-green-50 text-green-900',
  danger: 'border-red-300 bg-red-50 text-red-900',
  muted: 'border-zinc-300 bg-zinc-100 text-zinc-700',
};

const CONTENT: Record<ContentStatus, { tone: Tone; icon: LucideIcon }> = {
  draft: { tone: 'neutral', icon: PencilLine },
  pending_review: { tone: 'warning', icon: Clock },
  scheduled: { tone: 'info', icon: CalendarClock },
  published: { tone: 'success', icon: CircleCheck },
  archived: { tone: 'muted', icon: Archive },
};

const REPORT: Record<ReportStatus, { tone: Tone; icon: LucideIcon }> = {
  new: { tone: 'info', icon: CircleDot },
  acknowledged: { tone: 'neutral', icon: Eye },
  in_progress: { tone: 'warning', icon: Wrench },
  resolved: { tone: 'success', icon: CircleCheck },
  rejected: { tone: 'danger', icon: CircleX },
  duplicate: { tone: 'muted', icon: Copy },
};

type StatusBadgeProps =
  | { kind: 'content'; status: ContentStatus; className?: string }
  | { kind: 'report'; status: ReportStatus; className?: string };

/** Statut : couleur ET icone ET texte, jamais la couleur seule. */
export function StatusBadge(props: StatusBadgeProps) {
  const { tone, icon: Icon } = props.kind === 'content' ? CONTENT[props.status] : REPORT[props.status];
  const label = props.kind === 'content' ? CONTENT_STATUS_LABELS[props.status] : REPORT_STATUS_LABELS[props.status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        props.className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
