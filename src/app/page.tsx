'use client';

import { useEffect, useState } from 'react';
import { 
  Plane, Plus, Loader2, BellRing, Info, 
  RefreshCw, Database, Activity, Globe, Compass 
} from 'lucide-react';
import { RouteWithHistory } from '@/types';
import AddRouteModal from '@/components/AddRouteModal';
import TrackedRouteCard from '@/components/TrackedRouteCard';

export default function Home() {
  const [routes, setRoutes] = useState<RouteWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<RouteWithHistory | null>(null);
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

  const handleRouteSuccess = (savedRoute: any) => {
    setRoutes(prev => {
      const exists = prev.some(r => r.id === savedRoute.id);
      if (exists) {
        return prev.map(r => r.id === savedRoute.id ? savedRoute : r);
      } else {
        return [savedRoute, ...prev];
      }
    });
  };

  const handleAddClick = () => {
    setRouteToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (route: RouteWithHistory) => {
    setRouteToEdit(route);
    setIsModalOpen(true);
  };

  const handleRouteRefresh = () => {
    fetchRoutes();
  };

  // Run dummy DB seed action
  const handleSeedDatabase = async () => {
    if (!confirm('Dette vil fylde databasen med test "Udforsk"-agenter og historiske prispunkter. Vil du fortsætte?')) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed?secret=your-cron-secret');
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
  const activeRoutes = routes.filter(r => r.status === 'active');
  const activeRoutesCount = activeRoutes.length;
  
  const alertHitsCount = activeRoutes.filter(r => {
    const latest = r.price_history?.[r.price_history.length - 1];
    if (!latest) return false;
    
    if (r.target_price_threshold) {
      return latest.lowest_price_found <= r.target_price_threshold;
    }
    
    if (r.drop_percentage_threshold && r.price_history.length >= 2) {
      // 7-day average drop check (excluding the last one)
      const historyPrices = r.price_history
        .map(h => h.lowest_price_found)
        .filter((_, idx) => idx < r.price_history.length - 1);
      
      const avg = historyPrices.reduce((a, b) => a + b, 0) / historyPrices.length;
      return latest.lowest_price_found <= avg * (1 - r.drop_percentage_threshold / 100);
    }
    
    return false;
  }).length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-fade-in relative z-10 min-h-[90vh] flex flex-col justify-center">
      
      {/* Hero Section */}
      <header className="text-center max-w-3xl mx-auto space-y-6 py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-amber-100/80 tracking-widest uppercase mb-2 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          EventyrAgenten
        </div>
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white font-outfit drop-shadow-2xl">
          Hvor drømmer du <br/> om at vågne op?
        </h1>
        <p className="text-lg text-amber-50/70 font-medium max-w-xl mx-auto leading-relaxed">
          Slip for traditionel prisovervågning. Vælg en drømmedestination, og lad os finde de magiske rejser til dig, når markedet dumper priserne.
        </p>
        
        {routes.length === 0 && (
          <div className="pt-8 pb-12">
            <button
              onClick={handleAddClick}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-white font-bold text-lg shadow-[0_0_40px_rgba(251,191,36,0.3)] hover:shadow-[0_0_60px_rgba(251,191,36,0.5)] transition-all flex items-center justify-center gap-3 mx-auto transform hover:-translate-y-1"
            >
              <Compass className="w-6 h-6" />
              Bed agenten om at lede
            </button>
          </div>
        )}
      </header>

      {/* Simulator logs panel (if cron is run manually) */}
      {cronLogs && (
        <section className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md space-y-3 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Simuleret Agent-Søgning</h3>
            </div>
            <button 
              onClick={() => setCronLogs(null)}
              className="text-[10px] text-white/50 hover:text-white uppercase font-bold tracking-wider"
            >
              Luk log
            </button>
          </div>
          
          <div className="p-4 bg-black/40 rounded-2xl border border-white/5 font-mono text-xs text-gray-300 max-h-48 overflow-y-auto space-y-1">
            <div className="text-gray-500">// Tjekkede {cronLogs.processedCount} mission(er):</div>
            {cronLogs.results?.map((res: any, idx: number) => (
              <div key={idx} className={res.status === 'success' ? 'text-amber-200' : 'text-red-400'}>
                {res.status === 'success' 
                  ? `✓ [${res.routeLabel}] Fandt pris: ${res.price} DKK${res.alertTriggered ? ' -> 🌟 DRØMMEREJSE FUNDET!' : ''}`
                  : `✗ [${res.routeLabel}] Fejl: ${res.error}`
                }
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Missions (only show if routes exist) */}
      {routes.length > 0 && (
        <section className="space-y-8 pt-4 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight font-outfit text-white flex items-center gap-3">
              <span>Dine Rejse-Missioner</span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-amber-200 font-bold backdrop-blur-md border border-white/5">
                {routes.length}
              </span>
            </h2>
            <button
              onClick={handleAddClick}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-sm font-bold text-white transition-all flex items-center gap-2 backdrop-blur-md"
            >
              <Plus className="w-4 h-4" />
              Ny Mission
            </button>
          </div>

          {isLoading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-3xl bg-white/5 border border-white/10 animate-pulse backdrop-blur-sm" />
              ))}
            </div>
          ) : (
            /* Main Cards List */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes.map((route) => (
                <TrackedRouteCard
                  key={route.id}
                  route={route}
                  onDelete={handleRouteDeleted}
                  onRefresh={handleRouteRefresh}
                  onEdit={handleEditClick}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal form dialog overlay */}
      <AddRouteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRouteSuccess}
        routeToEdit={routeToEdit}
      />
      
      {/* Discreet Developer/Admin Footer */}
      <footer className="fixed bottom-6 right-6 flex items-center gap-3 opacity-20 hover:opacity-100 transition-opacity z-50">
          <button onClick={handleSeedDatabase} disabled={isSeeding} className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-110 transition-transform" title="Indlæs testdata (Admin)">
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          </button>
          <button onClick={handleRunCronSimulation} disabled={isCronRunning} className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-110 transition-transform" title="Kør Agent Søgning (Admin)">
            {isCronRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
      </footer>
    </main>
  );
}
