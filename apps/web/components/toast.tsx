'use client';

import { useEffect } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastState = {
  kind: ToastKind;
  message: string;
} | null;

type ToastProps = {
  toast: ToastState;
  onClose: () => void;
  durationMs?: number;
};

export default function Toast({ toast, onClose, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [toast, onClose, durationMs]);

  if (!toast) return null;

  const base =
    'pointer-events-auto fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-lg sm:inset-x-auto sm:right-6 sm:left-auto';

  const kindStyles: Record<ToastKind, string> = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-50',
    error: 'border-red-500/40 bg-red-500/10 text-red-50',
    info: 'border-slate-500/40 bg-slate-800/90 text-slate-50'
  };

  const icon =
    toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '!' : 'ℹ';

  return (
    <div className={`${base} ${kindStyles[toast.kind]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] font-bold">
          {icon}
        </span>
        <p className="flex-1 leading-snug">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-xs text-slate-200/80 hover:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
