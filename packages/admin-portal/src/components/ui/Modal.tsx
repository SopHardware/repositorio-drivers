'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-card-bg rounded-xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border-soft">
          <h2 className="text-lg font-black text-text-main">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-border-soft transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
