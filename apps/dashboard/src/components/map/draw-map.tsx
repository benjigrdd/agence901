'use client';

import dynamic from 'next/dynamic';

import type { DrawMapProps } from './draw-map-impl';

export const DrawMap = dynamic<DrawMapProps>(() => import('./draw-map-impl').then((m) => m.DrawMapImpl), {
  ssr: false,
  loading: () => <div className="bg-muted h-[460px] w-full animate-pulse rounded-md" aria-hidden="true" />,
});
