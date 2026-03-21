'use client';

import { useState, useCallback } from 'react';
import { SearchBar, FilterBar, DriverCard } from '@/components/drivers';
import { Card } from '@/components/ui';
import { getDrivers, HardwareDriver } from '@/lib/api';
import { Loader2, PackageOpen } from 'lucide-react';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [hardwareType, setHardwareType] = useState('');
  const [drivers, setDrivers] = useState<HardwareDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const result = await getDrivers({
        search: search || undefined,
        hardwareType: hardwareType || undefined,
        limit: 20,
      });
      setDrivers(result.drivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los drivers');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [search, hardwareType]);

  const handleSearch = () => {
    fetchDrivers();
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <section className="bg-gradient-to-b from-card-bg to-app-bg py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-text-main mb-4">
            Repositorio de <span className="text-brand-red">Drivers</span>
          </h1>
          <p className="text-lg text-text-muted mb-8 max-w-2xl mx-auto">
            Encuentra los drivers que necesitas para tu hardware de forma rápida, 
            segura y sin complicaciones.
          </p>
          
          <div className="max-w-2xl mx-auto space-y-6">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSubmit={handleSearch}
            />
            
            <FilterBar
              selectedType={hardwareType}
              onChange={setHardwareType}
            />

            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary px-8"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Buscando...
                </span>
              ) : (
                'Buscar Drivers'
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {error && (
            <Card className="mb-8 bg-red-50 border border-red-200">
              <p className="text-red-600 text-center">{error}</p>
            </Card>
          )}

          {!hasSearched && drivers.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-border-soft mb-6">
                <PackageOpen className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-2xl font-bold text-text-main mb-2">
                Bienvenido al Repositorio
              </h2>
              <p className="text-text-muted">
                Realiza una búsqueda para encontrar los drivers que necesitas
              </p>
            </div>
          )}

          {hasSearched && drivers.length === 0 && !loading && !error && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-border-soft mb-6">
                <PackageOpen className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-2xl font-bold text-text-main mb-2">
                Sin resultados
              </h2>
              <p className="text-text-muted">
                No se encontraron drivers con los criterios seleccionados
              </p>
            </div>
          )}

          {drivers.length > 0 && (
            <>
              <p className="text-text-muted mb-6">
                Se encontraron <span className="font-semibold text-text-main">{drivers.length}</span> drivers
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {drivers.map((driver) => (
                  <DriverCard key={driver.id} driver={driver} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
