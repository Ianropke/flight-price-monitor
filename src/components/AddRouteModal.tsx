'use client';

import { useState } from 'react';
import { X, PlaneTakeoff, PlaneLanding, Calendar, DollarSign, Percent, Loader2, Sparkles } from 'lucide-react';

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRoute: any) => void;
}

export default function AddRouteModal({ isOpen, onClose, onSuccess }: AddRouteModalProps) {
  const [originIata, setOriginIata] = useState('');
  const [destinationIata, setDestinationIata] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [targetType, setTargetType] = useState<'absolute' | 'percentage'>('absolute');
  const [targetPriceThreshold, setTargetPriceThreshold] = useState('');
  const [dropPercentageThreshold, setDropPercentageThreshold] = useState('');
  const [currency, setCurrency] = useState('DKK');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (originIata.length !== 3 || destinationIata.length !== 3) {
      setError('Lufthavnskoder skal være præcis 3 tegn (f.eks. CPH)');
      return;
    }
    if (!departureDate || !returnDate) {
      setError('Vælg venligst både afrejse- og hjemrejsedato');
      return;
    }
    if (new Date(departureDate) > new Date(returnDate)) {
      setError('Afrejsedato skal være før eller lig med hjemrejsedato');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin_iata: originIata.toUpperCase().trim(),
          destination_iata: destinationIata.toUpperCase().trim(),
          departure_date: departureDate,
          return_date: returnDate,
          target_price_threshold: targetType === 'absolute' ? parseFloat(targetPriceThreshold) || null : null,
          drop_percentage_threshold: targetType === 'percentage' ? parseFloat(dropPercentageThreshold) || null : null,
          currency: currency.toUpperCase()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oprette overvågning');
      }

      onSuccess(data);
      // Reset form
      setOriginIata('');
      setDestinationIata('');
      setDepartureDate('');
      setReturnDate('');
      setTargetPriceThreshold('');
      setDropPercentageThreshold('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Der opstod en uventet fejl');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg glass-panel overflow-hidden rounded-2xl border border-white/10 bg-gray-950/80 shadow-2xl transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400 glow-text-indigo" />
            <h2 className="text-xl font-semibold tracking-wide text-white font-outfit">Overvåg ny rute</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {/* Origins / Destinations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <PlaneTakeoff className="w-3.5 h-3.5 text-indigo-400" />
                Afrejse (IATA)
              </label>
              <input
                type="text"
                placeholder="CPH"
                maxLength={3}
                value={originIata}
                onChange={(e) => setOriginIata(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-lg font-bold tracking-widest text-center text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <PlaneLanding className="w-3.5 h-3.5 text-indigo-400" />
                Destination (IATA)
              </label>
              <input
                type="text"
                placeholder="OPO"
                maxLength={3}
                value={destinationIata}
                onChange={(e) => setDestinationIata(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-lg font-bold tracking-widest text-center text-white"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Afrejsedato
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Hjemrejsedato
              </label>
              <input
                type="date"
                min={departureDate || new Date().toISOString().split('T')[0]}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white"
              />
            </div>
          </div>

          {/* Threshold Options Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Alarm-triggertype</label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-900/80 border border-white/5">
              <button
                type="button"
                onClick={() => setTargetType('absolute')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  targetType === 'absolute' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Absolut pris
              </button>
              <button
                type="button"
                onClick={() => setTargetType('percentage')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  targetType === 'percentage' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Procentvis fald
              </button>
            </div>
          </div>

          {/* Values based on type */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              {targetType === 'absolute' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                    Målpris (grænseværdi)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="f.eks. 1200"
                      min={0}
                      value={targetPriceThreshold}
                      onChange={(e) => setTargetPriceThreshold(e.target.value)}
                      required={targetType === 'absolute'}
                      className="w-full pl-4 pr-16 py-2.5 rounded-xl glass-input text-base text-white"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center text-sm font-bold text-gray-400">
                      {currency}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-indigo-400" />
                    Mål-prisfald i procent
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="f.eks. 15"
                      min={1}
                      max={99}
                      value={dropPercentageThreshold}
                      onChange={(e) => setDropPercentageThreshold(e.target.value)}
                      required={targetType === 'percentage'}
                      className="w-full pl-4 pr-12 py-2.5 rounded-xl glass-input text-base text-white"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center text-sm font-bold text-gray-400">
                      %
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Valuta</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base text-white font-medium"
                >
                  <option value="DKK">DKK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400/80 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
            {targetType === 'absolute' 
              ? `Du modtager en alarm, hvis flyprisen falder under den grænseværdi, du har angivet ovenfor.`
              : `Du modtager en alarm, hvis prisen falder med ${dropPercentageThreshold || 'X'}% eller mere i forhold til rutens 7-dages løbende gennemsnit.`
            }
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Søger flypriser...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start overvågning</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
