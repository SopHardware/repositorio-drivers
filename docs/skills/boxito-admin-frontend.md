# Skill: boxito-admin-frontend

## Descripción

Este skill proporciona una guía completa para implementar el panel de administración del proyecto Boxito usando Next.js 14 (App Router), React y Tailwind CSS. Incluye autenticación JWT, gestión de drivers y usuarios.

## Pre-requisitos

- Node.js 18+
- npm o yarn
- Conocimiento de React
- Conocimiento de Next.js
- Conocimiento de Tailwind CSS

## Técnicas de Programación

### 1. App Router - Estructura

**Server Components vs Client Components:**
```typescript
// Server Component (por defecto)
export default async function DashboardPage() {
  const drivers = await getDrivers();
  return <Dashboard drivers={drivers} />;
}

// Client Component
'use client';
export default function LoginPage() {
  const [username, setUsername] = useState('');
  return <input value={username} onChange={(e) => setUsername(e.target.value)} />;
}
```

**Layouts:**
```typescript
// Root Layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

// Page Layout
export default function DriversLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

**Dynamic Routes:**
```typescript
// pages/drivers/[id]/edit/page.tsx
export default function EditDriverPage({ params }: { params: { id: string } }) {
  const driverId = parseInt(params.id, 10);
  // ...
}
```

### 2. React Hooks

**useState:**
```typescript
'use client';
import { useState } from 'react';

export function SearchBar() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  return (
    <input 
      value={search} 
      onChange={(e) => setSearch(e.target.value)}
      disabled={loading}
    />
  );
}
```

**useEffect:**
```typescript
useEffect(() => {
  if (user) {
    loadDrivers();
  }
}, [user]);

useEffect(() => {
  const token = Cookies.get('accessToken');
  if (token) {
    setUser(parseToken(token));
  }
}, []);
```

**Custom Hooks:**
```typescript
// hooks/useDrivers.ts
export function useDrivers() {
  const [drivers, setDrivers] = useState<HardwareDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const loadDrivers = async (params: DriverParams) => {
    try {
      const result = await getDrivers(params);
      setDrivers(result.drivers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return { drivers, loading, error, loadDrivers };
}
```

### 3. Context API - AuthContext

**Crear contexto:**
```typescript
// context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface User {
  userId: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    const userData = Cookies.get('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    Cookies.set('accessToken', data.data.accessToken, { expires: 1 });
    Cookies.set('user', JSON.stringify({ 
      userId: data.data.userId, 
      username, 
      role: data.data.role 
    }), { expires: 1 });
    
    setUser({ userId: data.data.userId, username, role: data.data.role });
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Usar contexto:**
```typescript
// components/Header.tsx
'use client';

import { useAuth } from '@/context/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  
  return (
    <header>
      <span>{user?.username}</span>
      <button onClick={logout}>Logout</button>
    </header>
  );
}
```

### 4. Tailwind CSS - Design Tokens

**Configuración:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { red: '#EA0B2A' },
        app: { bg: '#FFFCFD' },
        text: { main: '#000000', muted: '#6B7280' },
        border: { soft: '#E5E7EB' },
        card: { bg: '#FFFFFF' }
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }
    }
  }
};
```

**Utility Classes:**
```typescript
// Botón primario
<button className="bg-brand-red text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors">
  Click me
</button>

// Input
<input className="w-full border-b-2 border-border-soft py-2 focus:outline-none focus:border-brand-red" />

// Card
<div className="bg-card-bg rounded-2xl shadow-card p-6 hover:shadow-card-hover">
  Content
</div>

// Badge
<span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-xs font-semibold">
  IMPRESORA
</span>
```

### 5. Forms - Controlled Inputs

**Form con validación:**
```typescript
'use client';

import { useState } from 'react';

interface FormData {
  driverName: string;
  brand: string;
  model: string;
  version: string;
  hardwareType: string;
}

export function DriverForm() {
  const [formData, setFormData] = useState<FormData>({
    driverName: '',
    brand: '',
    model: '',
    version: '',
    hardwareType: 'IMPRESORA'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await createDriver(formData);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="driverName"
        value={formData.driverName}
        onChange={handleChange}
        required
      />
      <select 
        name="hardwareType" 
        value={formData.hardwareType}
        onChange={handleChange}
      >
        <option value="IMPRESORA">Impresora</option>
        <option value="ESCANER">Escáner</option>
      </select>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear'}
      </button>
    </form>
  );
}
```

### 6. File Uploads

**Manejo de archivos:**
```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    setFormData({ 
      ...formData, 
      fileExtension: ext, 
      fileSize: file.size,
      driverName: file.name.replace(/\.[^/.]+$/, '')
    });
    setFile(file);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!file) {
    setError('Selecciona un archivo');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/drivers/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  
  const result = await response.json();
  await createDriver({ ...formData, driveFileId: result.data.driveFileId });
};
```

### 7. Routing - Redirect y Navigation

**Redirect:**
```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

router.push('/');           // Navegar a página
router.push('/login');      // Redirigir a login
router.replace('/dashboard'); // Reemplazar historial

// En server components
import { redirect } from 'next/navigation';

if (!user) {
  redirect('/login');
}
```

**Protección de rutas:**
```typescript
useEffect(() => {
  if (!authLoading && !user) {
    router.push('/login');
  }
}, [authLoading, user, router]);

// Solo permitir ciertos roles
useEffect(() => {
  if (user && user.role !== 'ADMIN_SISTEMAS') {
    router.push('/');
  }
}, [user, router]);
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
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    aliases: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

**Setup file:**
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';

// Mock de cookies
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));
```

### Component Testing

**Test de Button:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should apply variant classes', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-brand-red');
  });
  
  it('should be disabled when loading', () => {
    render(<Button disabled={true}>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
  
  it('should call onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Test de Input:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('should render with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });
  
  it('should handle value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} />);
    
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });
  
  it('should display error message', () => {
    render(<Input error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });
});
```

### Hook Testing

**Test de useAuth:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn((key) => key === 'accessToken' ? 'mock-token' : null),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  it('should provide auth context', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Wait for loading to finish
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isLoading).toBe(false);
  });
  
  it('should have login function', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.login).toBe('function');
  });
  
  it('should have logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.logout).toBe('function');
  });
});
```

### Integration Testing

**Test de página de Login:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';

vi.mock('@/lib/api', () => ({
  login: vi.fn()
}));

describe('Login Page', () => {
  it('should render login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
  
  it('should show error on failed login', async () => {
    const mockLogin = vi.mocked(login);
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    
    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
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
    "lucide-react": "^0.312.0",
    "js-cookie": "^3.0.5"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.4.0",
    "vitest": "^1.2.0",
    "jsdom": "^24.0.0"
  }
}
```

## Implementación Paso a Paso

1. **Inicializar proyecto:**
   ```bash
   npx create-next-app@14 admin-portal --typescript --tailwind --eslint
   cd admin-portal
   npm install js-cookie lucide-react
   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. **Configurar Tailwind:**
   - Crear tailwind.config.js con tokens de Boxito
   - Configurar colors, shadows, fonts

3. **Crear estructura:**
   ```
   src/
   ├── app/
   │   ├── login/
   │   ├── drivers/
   │   ├── users/
   │   └── layout.tsx
   ├── components/
   │   ├── ui/
   │   ├── layout/
   │   └── drivers/
   ├── context/
   ├── lib/
   └── test/
   ```

4. **Implementar componentes UI:**
   - Button, Input, Badge, Card

5. **Crear AuthContext:**
   - Provider con login/logout
   - Hook useAuth
   - Cookies para persistencia

6. **Crear páginas:**
   - Login con diseño especificado
   - Dashboard con tabla
   - CRUD drivers
   - Gestión usuarios

7. **Configurar rutas protegidas:**
   - Middleware de autenticación
   - Verificación de roles

## Links de Referencia

- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [React Hooks](https://react.dev/reference/react)
- [Context API](https://react.dev/learn/passing-data-deeply-with-context)
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

La aplicación debería estar disponible en http://localhost:3002 (o puerto configurado).