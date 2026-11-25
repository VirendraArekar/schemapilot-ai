import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { dismissToast } from '../../store/uiSlice';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dispatch(dismissToast(t.id)), 4000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xl"
        >
          {t.variant === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
          {t.variant === 'error' && <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />}
          {t.variant === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
          {(!t.variant || t.variant === 'default') && (
            <Info className="h-5 w-5 text-indigo-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
            {t.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dispatch(dismissToast(t.id))}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
