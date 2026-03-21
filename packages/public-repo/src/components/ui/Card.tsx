import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div
      className={`bg-card-bg rounded-2xl shadow-card p-6 ${hover ? 'hover:shadow-card-hover transition-shadow duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
