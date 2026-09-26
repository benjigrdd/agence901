import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <Icon className="text-muted-foreground size-10" aria-hidden="true" />
      <h2 className="text-lg font-medium">{title}</h2>
      {description ? <p className="text-muted-foreground max-w-md text-sm">{description}</p> : null}
      {action}
    </div>
  );
}
