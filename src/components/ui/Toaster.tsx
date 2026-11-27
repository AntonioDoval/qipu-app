'use client';

// Short confirmation messages at the bottom of the screen ("Now in English", later "Moved to trash · Undo").

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  /** Show a message for a few seconds (longer when it has an action, such as Undo). */
  toast: (message: string, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const toast = useCallback<ToastApi['toast']>((message, action) => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setCurrent({ id: nextId.current, message, action });
    timer.current = setTimeout(() => setCurrent(null), action ? 6000 : 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex justify-center px-4">
        {current && (
          <div
            key={current.id}
            role="status"
            className="pointer-events-auto flex max-w-full items-center gap-4 rounded-lg bg-ink px-4 py-2 text-[13.5px] text-paper shadow-lg motion-safe:animate-toast-in"
          >
            <span>{current.message}</span>
            {current.action && (
              <button
                type="button"
                onClick={() => {
                  current.action?.onClick();
                  setCurrent(null);
                }}
                className="font-medium text-soft underline-offset-2 hover:underline"
              >
                {current.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
