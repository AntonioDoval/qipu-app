'use client';

// A centered dialog over a dimmed page. Escape or clicking outside closes it (unless busy).

import { useEffect, useId } from 'react';

export function Modal(props: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode; footer?: React.ReactNode }) {
  const titleId = useId();
  const { onClose, busy } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink/30 px-4 pb-6 pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-[480px] rounded-xl border border-dust bg-paper shadow-2xl">
        <h2 id={titleId} className="border-b border-dust px-5 py-3.5 font-display text-[19px] font-medium">
          {props.title}
        </h2>
        <div className="flex flex-col gap-4 px-5 py-4">{props.children}</div>
        {props.footer && <div className="flex justify-end gap-2 border-t border-dust px-5 py-3">{props.footer}</div>}
      </div>
    </div>
  );
}
