'use client';

import type { Announcements, DragEndEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type SortableListProps<T extends { id: string }> = {
  items: T[];
  label: (item: T) => string;
  render: (item: T) => ReactNode;
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  /** Libelle de la liste pour les lecteurs d'ecran. */
  ariaLabel: string;
};

/**
 * Liste reordonnable : glisser-deposer (souris ou clavier : Espace pour saisir, fleches, Espace pour deposer)
 * et, toujours, boutons « Monter » / « Descendre ».
 */
export function SortableList<T extends { id: string }>({ items, label, render, onReorder, disabled, ariaLabel }: SortableListProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const position = (id: string | number) => items.findIndex((i) => i.id === id) + 1;
  const name = (id: string | number) => {
    const item = items.find((i) => i.id === id);
    return item ? label(item) : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `« ${name(active.id)} » saisi, position ${position(active.id)} sur ${items.length}.`,
    onDragOver: ({ active, over }) => (over ? `« ${name(active.id)} » déplacé en position ${position(over.id)} sur ${items.length}.` : `« ${name(active.id)} » hors de la liste.`),
    onDragEnd: ({ active, over }) => (over ? `« ${name(active.id)} » déposé en position ${position(over.id)} sur ${items.length}.` : `« ${name(active.id)} » déposé.`),
    onDragCancel: ({ active }) => `Déplacement annulé. « ${name(active.id)} » reste en position ${position(active.id)}.`,
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    onReorder(arrayMove(items, from, to));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Pour déplacer, appuyez sur Espace, utilisez les flèches, puis Espace pour déposer ou Échap pour annuler.',
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul aria-label={ariaLabel} className="divide-y rounded-lg border">
          {items.map((item, index) => (
            <SortableRow key={item.id} id={item.id} label={label(item)} disabled={disabled}>
              <div className="min-w-0 flex-1">{render(item)}</div>
              {disabled ? null : (
                <span className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label={`Monter « ${label(item)} »`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Descendre « ${label(item)} »`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                    <ArrowDown aria-hidden="true" />
                  </Button>
                </span>
              )}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, label, disabled, children }: { id: string; label: string; disabled?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`bg-background flex items-center gap-2 p-2 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}>
      {disabled ? null : (
        <button type="button" {...attributes} {...listeners} aria-label={`Déplacer « ${label} »`} className="text-muted-foreground focus-visible:ring-ring flex size-8 cursor-grab items-center justify-center rounded focus-visible:ring-2">
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      )}
      {children}
    </li>
  );
}
