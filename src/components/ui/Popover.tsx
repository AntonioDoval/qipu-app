'use client';

// A button that opens a small panel; closes on outside click or Escape.

import { useEffect, useId, useRef, useState } from 'react';

export function Popover(props: {
  button: (open: boolean) => React.ReactNode;
  buttonClassName?: string;
  buttonLabel?: string;
  align?: 'left' | 'right';
  placement?: 'below' | 'above';
  panelClassName?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const position = `${props.align === 'right' ? 'right-0' : 'left-0'} ${props.placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-1.5'}`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={props.buttonLabel}
        className={props.buttonClassName}
      >
        {props.button(open)}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          className={`absolute z-50 rounded-lg border border-dust bg-surface p-3 shadow-lg ${position} ${props.panelClassName ?? ''}`}
        >
          {typeof props.children === 'function' ? props.children(close) : props.children}
        </div>
      )}
    </div>
  );
}
