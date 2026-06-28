'use client';

import { useEffect, useState } from 'react';
import { 
  Plane, Plus, Loader2, BellRing, Info, 
  RefreshCw, Database, Activity 
} from 'lucide-react';
import { RouteWithHistory } from '@/types';
import AddRouteModal from '@/components/AddRouteModal';
import TrackedRouteCard from '@/components/TrackedRouteCard';

export default function Home() {
  const [routes, setRoutes] = useState<RouteWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCronRunning, setIsCronRunning] = useState(false);
  const [cronLogs, setCronLogs] = useState<any>(null);

  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      if (!res.ok) throw new Error('Failed to fetch routes');
      const data = await res.json();
      setRoutes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleRouteDeleted = (deletedId: string) => {
    setRoutes(prev => prev.filter(r => r.id !== deletedId));
  };

  const handleRouteAdded = (newRoute: any) => {
    setRoutes(prev => [newRoute, ...prev]);
  };

  const handleRouteRefresh = () => {
    fetchRoutes();
  };

  // Run dummy DB seed action
  const handleSeedDatabase = async () => {
    if (!confirm('Dette vil fylde databasen med testruter og historiske prispunkter. Vil du fortsætte?')) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      alert('Databasen blev fyldt med testdata!');
      fetchRoutes();
    } catch (err: any) {
      alert(`Fejl ved indlæsning af testdata: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Manually run cron pricing simulation
  const handleRunCronSimulation = async () => {
    setIsCronRunning(true);
    setCronLogs(null);
    try {
      const secret = 'your-cron-secret'; // default development secret from env config
      const res = await fetch(`/api/cron/check-prices?secret=${secret}`);
      const data = await res.json();
      setCronLogs(data);
      fetchRoutes();
    } catch (err: any) {
      console.error(err);
      alert('Kunne ikke simulere pristjek');
    } finally {
      setIsCronRunning(false);
    }
  };

  // Calculate statistics
  const activeRoutesCount = routes.length;
  const alertHitsCount = routes.filter(r => {
    const latest = r.price_history?.[r.price_history.length - 1];
    if (!latest) return false;
    
    if (r.target_price) {
      return latest.lowest_price <= r.target_price;
    }
    
    if (r.drop_percentage && r.price_history.length >= 2) {
      const historyPrices = r.price_history.map(h => h.lowest_price).filter((_, idx) => idx < r.price_history.length - 1);
      const avg = historyPrices.reduce((a, b) => a + b, 0) / historyPrices.length;
      return latest.lowest_price <= avg * (1 - r.drop_percentage / 100);
    }
    
    return false;
  }).length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Top Navigation & App Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 shadow-lg shadow-indigo-600/10">
            <Plane className="w-6 h-6 text-indigo-400 rotate-45" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white font-outfit">
              Flypris-<span className="text-indigo-400 glow-text-indigo">Monitor</span>
            </h1>
            <p className="text-xs font-semibold text-gray-400 mt-0.5 tracking-wide uppercase">
              Automatiseret flyprisskraber & alarm-motor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <button
            onClick={handleSeedDatabase}
            disabled={isSeeding}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSeeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span>Indlæs testdata</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tilføj rute</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center space-x-5">
          <div className="p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/10">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overvågede ruter</span>
            <div className="text-3xl font-extrabold tracking-tight text-white mt-1">
              {isLoading ? '...' : activeRoutesCount}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center space-x-5">
          <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/10">
            <BellRing className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alarmer udløst</span>
            <div className="text-3xl font-extrabold tracking-tight text-white mt-1">
              {isLoading ? '...' : alertHitsCount}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center space-x-5">
          <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/10">
            <RefreshCw className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Baggrunds-Cronjobs</span>
            <button
              onClick={handleRunCronSimulation}
              disabled={isCronRunning}
              className="mt-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
            >
              {isCronRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Tjekker...</span>
                </>
              ) : (
                <>
                  <span>Simuler dagligt pristjek</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-violet-400 underline decoration-dotted font-bold">Kør nu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Simulator logs panel (if cron is run manually) */}
      {cronLogs && (
        <section className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-indigo-950/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Simuleret Cron-pristjek logfiler</h3>
            </div>
            <button 
              onClick={() => setCronLogs(null)}
              className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider"
            >
              Luk logfiler
            </button>
          </div>
          
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-gray-300 max-h-48 overflow-y-auto space-y-1">
            <div className="text-gray-400">// Tjekkede {cronLogs.processedCount} rute(r):</div>
            {cronLogs.results?.map((res: any, idx: number) => (
              <div key={idx} className={res.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                {res.status === 'success' 
                  ? `✓ [${res.routeLabel}] Pris opdateret til ${res.price} DKK${res.alertTriggered ? ' -> 🚨 ALARM UDLØST!' : ''}`
                  : `✗ [${res.routeLabel}] Fejl: ${res.error}`
                }
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Tracked Routes Cards Grid */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold tracking-wide font-outfit text-white flex items-center gap-2">
          <span>Aktive ruter under overvågning</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-400 font-bold border border-white/5">
            {routes.length}
          </span>
        </h2>

        {isLoading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-32 bg-white/10 rounded-lg" />
                  <div className="h-6 w-16 bg-white/10 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-14 bg-white/5 rounded-xl" />
                  <div className="h-14 bg-white/5 rounded-xl" />
                </div>
                <div className="h-28 bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        ) : routes.length > 0 ? (
          /* Main Cards List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <TrackedRouteCard
                key={route.id}
                route={route}
                onDelete={handleRouteDeleted}
                onRefresh={handleRouteRefresh}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-panel py-16 px-6 text-center rounded-2xl border border-dashed border-white/10 bg-gray-950/10 flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto">
            <div className="p-4 rounded-full bg-white/5 border border-white/5 text-gray-400">
              <Plane className="w-8 h-8 rotate-45" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Ingen flyvninger overvåges endnu</h3>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                Tilføj de flyruter, du planlægger at rejse på, angiv målpriser eller procentvise fald, så overvåger vi dem for dig.
              </p>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSeedDatabase}
                disabled={isSeeding}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Indlæs testdata
              </button>
              
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all"
              >
                Tilføj din første rute
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal form dialog overlay */}
      <AddRouteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRouteAdded}
      />
      
    </main>
  );
}
