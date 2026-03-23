# Skill: boxito-public-frontend

## Descripción

Este skill proporciona una guía completa para implementar el repositorio público de drivers del proyecto Boxito usando Next.js 14 (App Router), React y Tailwind CSS. El portal es de acceso público sin autenticación.

## Pre-requisitos

- Node.js 18+
- npm o yarn
- Conocimiento de React
- Conocimiento de Next.js
- Conocimiento de Tailwind CSS

## Técnicas de Programación

### 1. App Router - Server Components

**Static Generation (SSG):**
```typescript
// pages que no requieren datos dinámicos
export default function HomePage() {
  return <h1>Repositorio Público</h1>;
}

// Generación estática con datos
export default async function DriverPage({ params }: { params: { id: string } }) {
  const driver = await getDriver(parseInt(params.id));
  return <DriverDetail driver={driver} />;
}

// Revalidation periódica
export const revalidate = 60; // Revalidar cada 60 segundos
```

**Server Components para data fetching:**
```typescript
// Ejecutar en el servidor
async function getDrivers(params: DriverParams) {
  const response = await fetch(`${API_URL}/drivers?${searchParams}`, {
    next: { revalidate: 60 }
  });
  return response.json();
}

// En componente servidor
export default async function HomePage() {
  const { drivers } = await getDrivers({ limit: 20 });
  
  return (
    <div>
      {drivers.map(driver => (
        <DriverCard key={driver.id} driver={driver} />
      ))}
    </div>
  );
}
```

**Client Components para interactividad:**
```typescript
'use client';

import { useState, useCallback } from 'react';

export function SearchBar() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSearch = useCallback(() => {
    setLoading(true);
    fetchDrivers({ search }).finally(() => setLoading(false));
  }, [search]);
  
  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>
    </div>
  );
}
```

### 2. Data Fetching

**Fetch con manejo de errores:**
```typescript
async function getDrivers(params: {
  search?: string;
  hardwareType?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ drivers: HardwareDriver[]; nextCursor: string | null; hasMore: boolean }> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set('search', params.search);
  if (params.hardwareType) searchParams.set('hardwareType', params.hardwareType);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  
  const response = await fetch(`${API_URL}/drivers?${searchParams}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 }
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar drivers');
  }
  
  const result = await response.json();
  return {
    drivers: result.data || [],
    nextCursor: result.pagination?.nextCursor || null,
    hasMore: result.pagination?.hasMore || false
  };
}
```

**Fetch en cliente con useEffect:**
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export function DriverList() {
  const [drivers, setDrivers] = useState<HardwareDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchDrivers = useCallback(async (filters: DriverFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getDrivers(filters);
      setDrivers(result.drivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchDrivers({});
  }, [fetchDrivers]);
  
  return (
    <div>
      {loading && <Loader />}
      {error && <ErrorMessage error={error} />}
      {drivers.map(driver => <DriverCard key={driver.id} driver={driver} />)}
    </div>
  );
}
```

### 3. Components - SearchBar

**Componente de búsqueda:**
```typescript
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
          className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-brand-red hover:bg-red-50 rounded-r-lg"
          aria-label="Buscar"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

### 4. Components - FilterBar

**Barra de filtros por tipo de hardware:**
```typescript
'use client';

const HARDWARE_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'IMPRESORA', label: 'Impresoras' },
  { value: 'ESCANER', label: 'Escáneres' },
  { value: 'TARJETA_RED', label: 'Tarjetas de Red' },
  { value: 'USB', label: 'USB' },
  { value: 'DISCO_DURO', label: 'Discos Duros' },
  { value: 'OPTICO', label: 'Ópticos' },
  { value: 'OTRO', label: 'Otros' }
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
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
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
```

### 5. Components - DriverCard

**Tarjeta de driver con diseño de tarjeta flotante:**
```typescript
'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { Card, Badge, Button } from '../ui';
import type { HardwareDriver } from '@/lib/api';

interface DriverCardProps {
  driver: HardwareDriver;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getHardwareTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    IMPRESORA: 'Impresora',
    ESCANER: 'Escáner',
    TARJETA_RED: 'Tarjeta de Red',
    USB: 'USB',
    DISCO_DURO: 'Disco Duro',
    OPTICO: 'Óptico',
    OTRO: 'Otro'
  };
  return labels[type] || type;
}

export function DriverCard({ driver }: DriverCardProps) {
  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/drivers/${driver.id}/download`;
  
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <Badge variant="primary">{getHardwareTypeLabel(driver.hardwareType)}</Badge>
        <span className="text-xs text-text-muted">v{driver.version}</span>
      </div>
      
      <h3 className="text-lg font-bold text-text-main mb-1 line-clamp-2">
        {driver.driverName}
      </h3>
      
      <p className="text-sm text-text-muted mb-1">
        {driver.brand} {driver.model}
      </p>
      
      <p className="text-xs text-text-muted mb-4">
        {formatFileSize(driver.fileSize)} • {driver.fileExtension.toUpperCase()}
      </p>
      
      <div className="mt-auto pt-4 border-t border-border-soft">
        <Link href={`/driver/${driver.id}`} className="block">
          <Button className="w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Descargar
          </Button>
        </Link>
      </div>
    </Card>
  );
}
```

### 6. Components - Badge

**Badge para tipos de hardware:**
```typescript
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-brand-red/10 text-brand-red',
    secondary: 'bg-border-soft text-text-muted'
  };
  
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

### 7. Tailwind - Diseño de Tarjetas Flotantes

**Efecto flotante:**
```typescript
// Card base
<div className="bg-card-bg rounded-2xl shadow-card p-6 hover:shadow-card-hover transition-shadow duration-200">
  Content
</div>

// Configuración en tailwind.config.js
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }
    }
  }
};
```

**Grid responsive:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {drivers.map(driver => (
    <DriverCard key={driver.id} driver={driver} />
  ))}
</div>
```

### 8. Página de Detalle - Driver Detail

**Página de detalle con descarga:**
```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { getDriver, getDriverDownloadUrl } from '@/lib/api';
import { Button, Badge, Card } from '@/components/ui';

interface DriverPageProps {
  params: {
    id: string;
  };
}

export default async function DriverPage({ params }: DriverPageProps) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) notFound();
  
  let driver;
  try {
    driver = await getDriver(id);
  } catch {
    notFound();
  }
  
  const downloadUrl = getDriverDownloadUrl(id);
  
  return (
    <div className="min-h-screen bg-app-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-text-muted hover:text-brand-red mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver al buscador
        </Link>
        
        <Card className="p-8">
          <div className="flex items-start justify-between mb-6">
            <Badge variant="primary">{driver.hardwareType}</Badge>
            <span className="text-sm text-text-muted">v{driver.version}</span>
          </div>
          
          <h1 className="text-3xl font-black text-text-main mb-2">
            {driver.driverName}
          </h1>
          
          <p className="text-xl text-text-muted mb-8">
            {driver.brand} {driver.model}
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-app-bg rounded-xl">
            <div>
              <p className="text-xs text-text-muted uppercase">Marca</p>
              <p className="font-semibold">{driver.brand}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Tamaño</p>
              <p className="font-semibold">{formatFileSize(driver.fileSize)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Formato</p>
              <p className="font-semibold">{driver.fileExtension.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Agregado</p>
              <p className="font-semibold">{formatDate(driver.createdAt)}</p>
            </div>
          </div>
          
          <a href={downloadUrl} download className="block">
            <Button className="w-full text-lg py-4 flex items-center justify-center gap-3">
              <Download className="w-6 h-6" />
              Descargar Driver
            </Button>
          </a>
        </Card>
      </div>
    </div>
  );
}
```

## Testing con Vitest + React Testing Library

### Configuración

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.tsx'],
    aliases: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

### Component Testing

**Test de DriverCard:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DriverCard } from './DriverCard';

const mockDriver = {
  id: 1,
  driverName: 'HP LaserJet Driver',
  brand: 'HP',
  model: 'LaserJet Pro',
  version: '1.0',
  hardwareType: 'IMPRESORA',
  driveFileId: 'file-123',
  fileExtension: '.exe',
  fileSize: 15000000,
  uploadedById: 'user-123',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DriverCard', () => {
  it('should render driver name', () => {
    renderWithRouter(<DriverCard driver={mockDriver} />);
    expect(screen.getByText('HP LaserJet Driver')).toBeInTheDocument();
  });
  
  it('should render brand and model', () => {
    renderWithRouter(<DriverCard driver={mockDriver} />);
    expect(screen.getByText('HP LaserJet Pro')).toBeInTheDocument();
  });
  
  it('should render hardware type badge', () => {
    renderWithRouter(<DriverCard driver={mockDriver} />);
    expect(screen.getByText('IMPRESORA')).toBeInTheDocument();
  });
  
  it('should render version', () => {
    renderWithRouter(<DriverCard driver={mockDriver} />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });
  
  it('should have download button', () => {
    renderWithRouter(<DriverCard driver={mockDriver} />);
    expect(screen.getByRole('link', { name: /descargar/i })).toBeInTheDocument();
  });
});
```

**Test de SearchBar:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('should render input', () => {
    render(<SearchBar value="" onChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });
  
  it('should call onChange when typing', () => {
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} onSubmit={vi.fn()} />);
    
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'HP' } });
    expect(handleChange).toHaveBeenCalledWith('HP');
  });
  
  it('should call onSubmit when pressing enter', () => {
    const handleSubmit = vi.fn();
    render(<SearchBar value="HP" onChange={vi.fn()} onSubmit={handleSubmit} />);
    
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(handleSubmit).toHaveBeenCalled();
  });
});
```

**Test de FilterBar:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from './FilterBar';

describe('FilterBar', () => {
  it('should render all filter options', () => {
    render(<FilterBar selectedType="" onChange={vi.fn()} />);
    
    expect(screen.getByText('Todos los tipos')).toBeInTheDocument();
    expect(screen.getByText('Impresoras')).toBeInTheDocument();
    expect(screen.getByText('Escáneres')).toBeInTheDocument();
  });
  
  it('should call onChange when clicking filter', () => {
    const handleChange = vi.fn();
    render(<FilterBar selectedType="" onChange={handleChange} />);
    
    fireEvent.click(screen.getByText('Impresoras'));
    expect(handleChange).toHaveBeenCalledWith('IMPRESORA');
  });
  
  it('should highlight selected filter', () => {
    render(<FilterBar selectedType="IMPRESORA" onChange={vi.fn()} />);
    
    const selectedButton = screen.getByText('Impresoras');
    expect(selectedButton).toHaveClass('bg-brand-red');
  });
});
```

### Page Testing

**Test de página principal:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from './page';

vi.mock('@/lib/api', () => ({
  getDrivers: vi.fn()
}));

describe('Home Page', () => {
  it('should render hero section', () => {
    render(<BrowserRouter><HomePage /></BrowserRouter>);
    
    expect(screen.getByText(/repositorio de drivers/i)).toBeInTheDocument();
  });
  
  it('should render search bar', () => {
    render(<BrowserRouter><HomePage /></BrowserRouter>);
    
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });
  
  it('should render filter bar', () => {
    render(<BrowserRouter><HomePage /></BrowserRouter>);
    
    expect(screen.getByText('Todos los tipos')).toBeInTheDocument();
  });
  
  it('should render empty state initially', async () => {
    vi.mocked(getDrivers).mockResolvedValue({ drivers: [], nextCursor: null, hasMore: false });
    
    render(<BrowserRouter><HomePage /></BrowserRouter>);
    
    await waitFor(() => {
      expect(screen.getByText(/bienvenido al repositorio/i)).toBeInTheDocument();
    });
  });
});
```

**Test de página de detalle:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DriverPage from './driver/[id]/page';

vi.mock('@/lib/api', () => ({
  getDriver: vi.fn()
}));

const mockDriver = {
  id: 1,
  driverName: 'HP Driver',
  brand: 'HP',
  model: 'LaserJet',
  version: '1.0',
  hardwareType: 'IMPRESORA',
  fileSize: 15000000,
  fileExtension: '.exe',
  createdAt: '2024-01-01'
};

describe('Driver Page', () => {
  it('should render driver details', async () => {
    vi.mocked(getDriver).mockResolvedValue(mockDriver);
    
    render(
      <MemoryRouter initialEntries={['/driver/1']}>
        <Routes>
          <Route path="/driver/:id" element={<DriverPage params={{ id: '1' }} />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('HP Driver')).toBeInTheDocument();
      expect(screen.getByText('HP')).toBeInTheDocument();
    });
  });
  
  it('should render download button', async () => {
    vi.mocked(getDriver).mockResolvedValue(mockDriver);
    
    render(
      <MemoryRouter initialEntries={['/driver/1']}>
        <Routes>
          <Route path="/driver/:id" element={<DriverPage params={{ id: '1' }} />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /descargar driver/i })).toBeInTheDocument();
    });
  });
});
```

### Mock de API

```typescript
// src/test/mocks/api.ts
export const mockDrivers = [
  {
    id: 1,
    driverName: 'HP LaserJet Driver',
    brand: 'HP',
    model: 'LaserJet Pro',
    version: '1.0',
    hardwareType: 'IMPRESORA',
    driveFileId: 'file-123',
    fileExtension: '.exe',
    fileSize: 15000000,
    uploadedById: 'user-1',
    createdAt: '2024-01-01'
  }
];

export const mockApi = {
  getDrivers: vi.fn().mockResolvedValue({
    drivers: mockDrivers,
    nextCursor: null,
    hasMore: false
  }),
  getDriver: vi.fn().mockResolvedValue(mockDrivers[0])
};
```

## Scripts de Testing

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Configuración Necesaria

### Dependencies
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.312.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.4.0",
    "vitest": "^1.2.0",
    "jsdom": "^24.0.0"
  }
}
```

### Variables de Entorno
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Implementación Paso a Paso

1. **Inicializar proyecto:**
   ```bash
   npx create-next-app@14 public-repo --typescript --tailwind --eslint
   cd public-repo
   npm install lucide-react
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. **Configurar Tailwind:**
   - Crear tailwind.config.js con tokens de Boxito
   - Configurar colors, shadows

3. **Crear estructura:**
   ```
   src/
   ├── app/
   │   ├── driver/[id]/
   │   ├── layout.tsx
   │   └── page.tsx
   ├── components/
   │   ├── drivers/
   │   ├── layout/
   │   └── ui/
   ├── lib/
   └── test/
   ```

4. **Implementar componentes UI:**
   - Button, Input, Badge, Card

5. **Crear componentes de drivers:**
   - SearchBar, FilterBar, DriverCard

6. **Crear API client:**
   - getDrivers, getDriver, getDriverDownloadUrl

7. **Crear páginas:**
   - Home con búsqueda y filtros
   - Detail driver con descarga

8. **Configurar layout:**
   - Header con logo Boxito
   - Footer

## Links de Referencia

- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.dev/)

## Validación

Para verificar la implementación:

```bash
# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Iniciar desarrollo
npm run dev
```

La aplicación debería estar disponible en http://localhost:3000 (o puerto configurado).