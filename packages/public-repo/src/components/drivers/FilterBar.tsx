'use client';

const HARDWARE_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'IMPRESORA', label: 'Impresoras' },
  { value: 'ESCANER', label: 'Escáneres' },
  { value: 'TARJETA_RED', label: 'Tarjetas de Red' },
  { value: 'USB', label: 'USB' },
  { value: 'DISCO_DURO', label: 'Discos Duros' },
  { value: 'OPTICO', label: 'Ópticos' },
  { value: 'OTRO', label: 'Otros' },
];

interface FilterBarProps {
  selectedType: string;
  onChange: (type: string) => void;
}

export function FilterBar({ selectedType, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {HARDWARE_TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            selectedType === type.value
              ? 'bg-brand-red text-white shadow-md'
              : 'bg-card-bg text-text-muted border border-border-soft hover:border-brand-red hover:text-brand-red'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
