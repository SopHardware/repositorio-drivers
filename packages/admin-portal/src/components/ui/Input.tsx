'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-xs text-text-muted uppercase tracking-wider mb-2">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={`w-full bg-transparent border-b-2 py-2 px-1 text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-brand-red transition-colors duration-200 ${error ? 'border-red-500' : 'border-border-soft'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';