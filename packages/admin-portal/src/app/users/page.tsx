'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Users as UsersIcon, Shield, Trash2, AlertCircle } from 'lucide-react';
import { Button, Input, Card, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getUsers, createUser, deleteUser, User } from '@/lib/api';

const ROLES = ['ADMIN_SISTEMAS', 'SOPORTE_WP', 'CONSULTA'];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ username: '', password: '', role: 'SOPORTE_WP' });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && user.role !== 'ADMIN_SISTEMAS') router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN_SISTEMAS') loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await createUser(formData);
      setFormData({ username: '', password: '', role: 'SOPORTE_WP' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (authLoading) return <div className="min-h-screen bg-app-bg flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="bg-card-bg border-b border-border-soft">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-brand-red">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="text-xl font-black text-text-main flex items-center gap-2">
            <UsersIcon className="w-5 h-5" /> Gestión de Usuarios
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" />{error}</div>}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-text-main">Usuarios registrados</h2>
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Crear nuevo usuario</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required placeholder="usuario" />
                <div>
                  <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Rol</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="input-field">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Contraseña" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required placeholder="Mínimo 6 caracteres" />
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Creando...' : 'Crear Usuario'}</Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-text-muted">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">No hay usuarios registrados</p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-app-bg border-b border-border-soft">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Usuario</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Rol</th>
                  <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase">Creado</th>
                  <th className="text-right p-4 text-xs font-semibold text-text-muted uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border-soft">
                    <td className="p-4 font-medium text-text-main">{u.username}</td>
                    <td className="p-4">
                      <Badge variant={u.role === 'ADMIN_SISTEMAS' ? 'danger' : 'secondary'}>
                        <Shield className="w-3 h-3 mr-1" />{u.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 text-text-muted">{formatDate(u.createdAt)}</td>
                    <td className="p-4 text-right">
                      {users.length > 1 && (
                        <button onClick={() => handleDelete(u.id)} className="p-2 text-text-muted hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </div>
  );
}