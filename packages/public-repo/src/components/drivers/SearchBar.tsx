'use client';

import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar por nombre, marca o modelo..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pr-12 text-lg py-4"
        />
        <button
          onClick={onSubmit}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-brand-red hover:bg-red-50 rounded-r-lg transition-colors"
          aria-label="Buscar"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
