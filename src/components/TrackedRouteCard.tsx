'use client';

import { useState } from 'react';
import { Trash2, TrendingDown, TrendingUp, Bell, RefreshCw, Calendar, ArrowRight, EyeOff } from 'lucide-react';
import { RouteWithHistory } from '@/types';

interface TrackedRouteCardProps {
  route: RouteWithHistory;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

export default function TrackedRouteCard({ route, onDelete, onRefresh }: TrackedRouteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ price: number; date: string; x: number; y: number } | null>(null);

  const history = route.price_history || [];
  const latestFetch = history[history.length - 1];
  const currentPrice = latestFetch ? latestFetch.lowest_price_found : null;
  const isInactive = route.status === 'inactive';

  // Calculate stats
  const priceValues = history.map(h => h.lowest_price_found);
  const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;
  const avgPrice = priceValues.length > 0 
    ? priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length 
    : 0;

  // Is threshold met?
  let targetMet = false;
  let targetDiffText = '';
  
  if (currentPrice !== null && !isInactive) {
    if (route.target_price_threshold) {
      targetMet = currentPrice <= route.target_price_threshold;
      const diff = route.target_price_threshold - currentPrice;
      targetDiffText = diff >= 0 
        ? `${diff.toFixed(0)} ${route.currency} under målpris`
        : `${Math.abs(diff).toFixed(0)} ${route.currency} over målpris`;
    } else if (route.drop_percentage_threshold && avgPrice > 0) {
      const dropFromAvg = ((avgPrice - currentPrice) / avgPrice) * 100;
      targetMet = dropFromAvg >= route.drop_percentage_threshold;
      targetDiffText = dropFromAvg > 0
        ? `${dropFromAvg.toFixed(1)}% fald fra gns (7-dage)`
        : `${Math.abs(dropFromAvg).toFixed(1)}% stigning fra gns (7-dage)`;
    }
  }

  // Handle actions
  const handleDelete = async () => {
    if (!confirm(`Er du sikker på, at du vil stoppe med at overvåge flyvninger fra ${route.origin_iata} til ${route.destination_iata}?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/routes?id=${route.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete(route.id);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleRefresh = async () => {
    if (isInactive) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/routes?id=${route.id}`, { method: 'PUT' });
      if (!res.ok) throw new Error('Refresh failed');
      onRefresh(route.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate SVG dimensions and coordinates for Sparkline Chart
  const svgWidth = 460;
  const svgHeight = 110;
  const padding = 15;

  let points: { x: number; y: number; price: number; date: string }[] = [];
  let pathD = '';
  let fillD = '';

  if (history.length >= 2) {
    const minVal = Math.min(...priceValues);
    const maxVal = Math.max(...priceValues);
    const valueRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    points = history.map((h, i) => {
      const x = padding + (i * (svgWidth - padding * 2)) / (history.length - 1);
      const y = svgHeight - padding - ((h.lowest_price_found - minVal) * (svgHeight - padding * 2)) / valueRange;
      
      const dateFormatted = new Date(h.fetch_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return { x, y, price: h.lowest_price_found, date: dateFormatted };
    });

    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    fillD = `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (points.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    let closest = points[0];
    let minDiff = Math.abs(points[0].x - (mouseX / rect.width) * svgWidth);

    points.forEach(p => {
      const diff = Math.abs(p.x - (mouseX / rect.width) * svgWidth);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    });

    setHoveredPoint({
      price: closest.price,
      date: closest.date,
      x: closest.x,
      y: closest.y
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const formattedDate = (d: string) => {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`glass-panel rounded-2xl border transition-card flex flex-col justify-between overflow-hidden ${
      isInactive
        ? 'border-white/5 bg-gray-950/20 opacity-60 hover:opacity-80'
        : targetMet 
          ? 'border-emerald-500/30 bg-emerald-950/15 shadow-emerald-500/5' 
          : 'border-white/5 hover:border-indigo-500/25 bg-gray-950/40'
    }`}>
      {/* Card Header */}
      <div className="p-6 border-b border-white/5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xl font-bold tracking-wide font-outfit text-white">
              <span>{route.origin_iata}</span>
              <ArrowRight className="w-4 h-4 text-indigo-400" />
              <span>{route.destination_iata}</span>
              {isInactive && (
                <span className="ml-2 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/30 rounded-md flex items-center gap-1">
                  <EyeOff className="w-2.5 h-2.5" />
                  Inaktiv
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1.5 mt-1 text-xs text-gray-400 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate(route.departure_date)}</span>
              <span>•</span>
              <span>{formattedDate(route.return_date)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isInactive}
              title={isInactive ? "Inaktive ruter kan ikke opdateres" : "Opdater flypriser"}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title="Stop overvågning af rute"
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pricing / Alert Thresholds Indicators */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Aktuel pris</span>
            <div className="flex items-baseline space-x-1 text-white">
              {currentPrice !== null ? (
                <>
                  <span className="text-xl font-extrabold tracking-tight">{currentPrice.toLocaleString()}</span>
                  <span className="text-xs font-bold text-gray-400">{route.currency}</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-gray-400">Henter...</span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1">
              <Bell className="w-3 h-3 text-indigo-400" />
              Grænseværdi
            </span>
            <div className="text-sm font-bold text-white flex items-center space-x-1">
              {route.target_price_threshold ? (
                <>
                  <span>≤ {route.target_price_threshold.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-gray-400">{route.currency}</span>
                </>
              ) : (
                <span>-{route.drop_percentage_threshold}% fra gns</span>
              )}
            </div>
            {currentPrice !== null && !isInactive && (
              <span className={`text-[10px] block font-semibold ${targetMet ? 'text-emerald-400' : 'text-gray-400'}`}>
                {targetDiffText}
              </span>
            )}
            {isInactive && (
              <span className="text-[10px] block font-semibold text-red-400">
                Udløbet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Chart Body */}
      <div className="relative pt-4 flex-1 bg-gradient-to-t from-black/20 to-transparent">
        {history.length >= 2 ? (
          <div className="px-4 pb-4">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mb-2">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" /> 
                Min: {minPrice.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-red-400" /> 
                Maks: {maxPrice.toLocaleString()}
              </span>
            </div>
            
            {/* Interactive Custom SVG Chart */}
            <div className="relative overflow-visible">
              <svg
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="overflow-visible select-none cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  {/* Glowing line gradient */}
                  <linearGradient id={`line-grad-${route.id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  {/* Under curve gradient area */}
                  <linearGradient id={`area-grad-${route.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Avg reference dashed line */}
                {avgPrice > 0 && (
                  <line
                    x1={padding}
                    y1={
                      svgHeight -
                      padding -
                      ((avgPrice - Math.min(...priceValues)) * (svgHeight - padding * 2)) /
                        (Math.max(...priceValues) - Math.min(...priceValues) || 1)
                    }
                    x2={svgWidth - padding}
                    y2={
                      svgHeight -
                      padding -
                      ((avgPrice - Math.min(...priceValues)) * (svgHeight - padding * 2)) /
                        (Math.max(...priceValues) - Math.min(...priceValues) || 1)
                    }
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                )}

                {/* Shaded Area under path */}
                <path d={fillD} fill={`url(#area-grad-${route.id})`} />

                {/* Trend line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isInactive ? "rgba(156, 163, 175, 0.4)" : `url(#line-grad-${route.id})`}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Hover interactions */}
                {hoveredPoint && (
                  <>
                    {/* Hover vertical reference line */}
                    <line
                      x1={hoveredPoint.x}
                      y1={padding}
                      x2={hoveredPoint.x}
                      y2={svgHeight}
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    {/* Dot on path */}
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="5"
                      fill="#ffffff"
                      stroke={isInactive ? "#9ca3af" : "#6366f1"}
                      strokeWidth="3"
                      className="shadow-lg shadow-indigo-600/50"
                    />
                  </>
                )}
              </svg>

              {/* Tooltip Overlay inside container */}
              {hoveredPoint && (
                <div 
                  className="absolute pointer-events-none z-10 glass-panel px-2.5 py-1.5 rounded-lg border border-indigo-500/20 text-center shadow-lg"
                  style={{
                    left: `${Math.min(Math.max(10, (hoveredPoint.x / svgWidth) * 100 - 15), 70)}%`,
                    bottom: '75px',
                  }}
                >
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{hoveredPoint.date}</div>
                  <div className="text-xs font-black text-white">{hoveredPoint.price.toLocaleString()} {route.currency}</div>
                </div>
              )}
            </div>

            {/* Total tracked data points count */}
            <div className="text-[9px] text-right font-semibold text-gray-500 uppercase tracking-widest mt-1">
              {history.length} pristjek registreret
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <div className="text-xs font-semibold text-gray-400">Indsamler prishistorik...</div>
            <div className="text-[10px] text-gray-500 max-w-[200px]">
              Vi skal bruge mindst to historiske prispunkter for at vise kurven.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
