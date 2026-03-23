import { ReactNode } from 'react';

interface BadgeProps { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger'; className?: string; }

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = { primary: 'bg-brand-red/10 text-brand-red', secondary: 'bg-border-soft text-text-muted', danger: 'bg-red-100 text-red-600' };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${variants[variant]} ${className}`}>{children}</span>;
}