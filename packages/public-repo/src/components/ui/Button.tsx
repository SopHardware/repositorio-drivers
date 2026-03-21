'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-brand-red text-white hover:bg-red-700 focus:ring-brand-red',
      secondary: 'bg-white text-brand-red border-2 border-brand-red hover:bg-red-50 focus:ring-brand-red',
      outline: 'bg-transparent text-text-main border-2 border-border-soft hover:border-brand-red hover:text-brand-red focus:ring-brand-red',
    };

    const sizes = {
      sm: 'py-1.5 px-4 text-sm rounded-md',
      md: 'py-2.5 px-5 text-base rounded-lg',
      lg: 'py-3 px-6 text-lg rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
