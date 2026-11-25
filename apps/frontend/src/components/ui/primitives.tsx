import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants: Record<string, string> = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/20 disabled:opacity-50',
      secondary:
        'bg-slate-800 text-slate-100 hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-100',
      outline:
        'border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
      danger: 'bg-rose-600 text-white hover:bg-rose-500',
    };
    const sizes: Record<string, string> = {
      sm: 'h-8 px-2.5 text-xs rounded-md',
      md: 'h-9 px-4 text-sm rounded-lg',
      lg: 'h-11 px-6 text-base rounded-lg',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/40',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'indigo' | 'emerald' | 'amber' | 'rose';
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    indigo: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
