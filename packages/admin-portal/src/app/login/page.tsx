'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative" hover={false}>
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 bg-brand-red rounded-full flex items-center justify-center shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="pt-12">
          <h1 className="text-2xl font-black text-text-main text-center uppercase tracking-wider mb-8">
            Member Login
          </h1>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  required
                  className="pl-10"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                  className="pl-10"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              </div>
            </div>

            <div className="flex items-center">
              <input type="checkbox" id="remember" className="w-4 h-4 text-brand-red border-border-soft rounded focus:ring-brand-red" />
              <label htmlFor="remember" className="ml-2 text-sm text-text-muted">Remember me</label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <a href="#" className="block text-sm text-brand-red hover:underline">
              Forgot Password?
            </a>
            <Link href={process.env.NEXT_PUBLIC_PUBLIC_REPO_URL || 'http://localhost:3000'} className="block text-sm text-text-muted hover:text-brand-red">
              Volver al buscador público
            </Link>
          </div>
        </div>
      </Card>

      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-text-muted">© 2026 Soporte Técnico e Infraestructura. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}