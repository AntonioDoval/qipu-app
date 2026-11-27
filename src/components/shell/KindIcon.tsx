import { Archive, BookText, PenLine } from 'lucide-react';
import type { ItemKind } from '@/data';

const ICONS = { bibliography: BookText, source: Archive, note: PenLine } as const;
const COLORS = { bibliography: 'text-kind-bibliography', source: 'text-kind-source', note: 'text-kind-note' } as const;

/** One icon per kind of item (Bibliography, Sources, Notes). */
export function KindIcon({ kind, size = 15, className = '' }: { kind: ItemKind; size?: number; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon size={size} strokeWidth={1.7} aria-hidden className={`shrink-0 ${COLORS[kind]} ${className}`} />;
}
