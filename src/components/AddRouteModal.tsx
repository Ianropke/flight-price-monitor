'use client';

import { useState, useRef, useEffect } from 'react';
import { X, PlaneTakeoff, PlaneLanding, Calendar, DollarSign, Percent, Loader2, Sparkles } from 'lucide-react';

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRoute: any) => void;
}

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

const POPULAR_AIRPORTS: Airport[] = [
  { code: 'CPH', name: 'Københavns Lufthavn', city: 'København', country: 'Danmark' },
  { code: 'BLL', name: 'Billund Lufthavn', city: 'Billund', country: 'Danmark' },
  { code: 'AAR', name: 'Aarhus Lufthavn', city: 'Aarhus', country: 'Danmark' },
  { code: 'BOM', name: 'Chhatrapati Shivaji International Airport', city: 'Mumbai', country: 'Indien' },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'Indien' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Kina' },
  { code: 'SYD', name: 'Kingsford Smith Airport', city: 'Sydney', country: 'Australien' },
  { code: 'OPO', name: 'Francisco Sá Carneiro Lufthavn', city: 'Porto', country: 'Portugal' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'Skotland' },
  { code: 'JFK', name: 'John F. Kennedy Intl Airport', city: 'New York', country: 'USA' },
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'Storbritannien' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'FCO', name: 'Fiumicino Airport', city: 'Rom', country: 'Italien' },
  { code: 'BCN', name: 'El Prat Airport', city: 'Barcelona', country: 'Spanien' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'Frankrig' },
  { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Holland' },
  { code: 'BER', name: 'Brandenburg Airport', city: 'Berlin', country: 'Tyskland' },
  { code: 'MUC', name: 'Munich Airport', city: 'München', country: 'Tyskland' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'Forenede Arabiske Emirater' },
  { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA' },
  { code: 'YYZ', name: 'Pearson International Airport', city: 'Toronto', country: 'Canada' },
  { code: 'AGP', name: 'Málaga Airport', city: 'Málaga', country: 'Spanien' },
  { code: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma de Mallorca', country: 'Spanien' },
  { code: 'LPA', name: 'Gran Canaria Airport', city: 'Las Palmas / Gran Canaria', country: 'Spanien' },
  { code: 'ALC', name: 'Alicante-Elche Airport', city: 'Alicante', country: 'Spanien' },
  { code: 'AYT', name: 'Antalya Airport', city: 'Antalya', country: 'Tyrkiet' },
  { code: 'ATH', name: 'Eleftherios Venizelos Airport', city: 'Athen', country: 'Grækenland' },
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lissabon', country: 'Portugal' },
  { code: 'ARN', name: 'Arlanda Airport', city: 'Stockholm', country: 'Sverige' },
  { code: 'OSL', name: 'Gardermoen Airport', city: 'Oslo', country: 'Norge' },
  { code: 'KEF', name: 'Keflavík International Airport', city: 'Reykjavík', country: 'Island' }
];

export default function AddRouteModal({ isOpen, onClose, onSuccess }: AddRouteModalProps) {
  const [originSearch, setOriginSearch] = useState('');
  const [originIata, setOriginIata] = useState('');
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);

  const [destSearch, setDestSearch] = useState('');
  const [destIata, setDestIata] = useState('');
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [isFlexible, setIsFlexible] = useState(false);
  const [tripDuration, setTripDuration] = useState('7');
  const [targetType, setTargetType] = useState<'absolute' | 'percentage'>('absolute');
  const [targetPriceThreshold, setTargetPriceThreshold] = useState('');
  const [dropPercentageThreshold, setDropPercentageThreshold] = useState('');
  const [currency, setCurrency] = useState('DKK');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  // Luk forslagslisterne hvis der klikkes udenfor modal inputområdet
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const getFilteredAirports = (searchVal: string) => {
    if (!searchVal) return [];
    const query = searchVal.toLowerCase().trim();
    return POPULAR_AIRPORTS.filter(
      a => 
        a.code.toLowerCase().includes(query) ||
        a.city.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        a.country.toLowerCase().includes(query)
    ).slice(0, 6); // Begræns til top 6 forslag
  };

  const handleOriginChange = (val: string) => {
    setOriginSearch(val);
    if (val.length === 3) {
      setOriginIata(val.toUpperCase());
    } else {
      setOriginIata('');
    }
    setShowOriginSuggestions(true);
  };

  const handleDestChange = (val: string) => {
    setDestSearch(val);
    if (val.length === 3) {
      setDestIata(val.toUpperCase());
    } else {
      setDestIata('');
    }
    setShowDestSuggestions(true);
  };

  const selectOriginSuggestion = (airport: Airport) => {
    setOriginSearch(`${airport.city} (${airport.code})`);
    setOriginIata(airport.code);
    setShowOriginSuggestions(false);
  };

  const selectDestSuggestion = (airport: Airport) => {
    setDestSearch(`${airport.city} (${airport.code})`);
    setDestIata(airport.code);
    setShowDestSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hvis brugeren har tastet en kode uden at vælge fra listen, så tag de sidste 3 bogstaver i parentes eller rå tekst
    let finalOrigin = originIata;
    if (!finalOrigin && originSearch.length === 3) {
      finalOrigin = originSearch.toUpperCase();
    }
    
    let finalDest = destIata;
    if (!finalDest && destSearch.length === 3) {
      finalDest = destSearch.toUpperCase();
    }

    if (!finalOrigin || finalOrigin.length !== 3) {
      setError('Vælg venligst en gyldig afrejseby eller indtast en 3-bogstavs lufthavnskode (f.eks. CPH)');
      return;
    }
    if (!finalDest || finalDest.length !== 3) {
      setError('Vælg venligst en gyldig destination eller indtast en 3-bogstavs lufthavnskode (f.eks. OPO)');
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
          origin_iata: finalOrigin,
          destination_iata: finalDest,
          departure_date: departureDate,
          return_date: returnDate,
          target_price_threshold: targetType === 'absolute' ? parseFloat(targetPriceThreshold) || null : null,
          drop_percentage_threshold: targetType === 'percentage' ? parseFloat(dropPercentageThreshold) || null : null,
          trip_duration: isFlexible ? parseInt(tripDuration) || null : null,
          currency: currency.toUpperCase()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oprette overvågning');
      }

      onSuccess(data);
      // Reset form
      setOriginSearch('');
      setOriginIata('');
      setDestSearch('');
      setDestIata('');
      setDepartureDate('');
      setReturnDate('');
      setIsFlexible(false);
      setTripDuration('7');
      setTargetPriceThreshold('');
      setDropPercentageThreshold('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Der opstod en uventet fejl');
    } finally {
      setIsLoading(false);
    }
  };

  const originSuggestions = getFilteredAirports(originSearch);
  const destSuggestions = getFilteredAirports(destSearch);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg glass-panel overflow-visible rounded-2xl border border-white/10 bg-gray-950/80 shadow-2xl transition-all duration-300 transform scale-100"
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
            <div className="relative space-y-2" ref={originRef}>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <PlaneTakeoff className="w-3.5 h-3.5 text-indigo-400" />
                Afrejse (By eller IATA)
              </label>
              <input
                type="text"
                placeholder="Skriv afrejseby..."
                value={originSearch}
                onChange={(e) => handleOriginChange(e.target.value)}
                onFocus={() => setShowOriginSuggestions(true)}
                required
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white"
              />
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-[100] max-h-48 overflow-y-auto rounded-xl bg-gray-950/95 border border-white/10 shadow-2xl backdrop-blur-md">
                  {originSuggestions.map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => selectOriginSuggestion(a)}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-indigo-600/30 text-gray-300 hover:text-white border-b border-white/5 last:border-b-0 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">{a.city}</div>
                        <div className="text-[10px] text-gray-400">{a.name}</div>
                      </div>
                      <div className="font-black text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25">
                        {a.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative space-y-2" ref={destRef}>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <PlaneLanding className="w-3.5 h-3.5 text-indigo-400" />
                Destination (By eller IATA)
              </label>
              <input
                type="text"
                placeholder="Skriv ankomstby..."
                value={destSearch}
                onChange={(e) => handleDestChange(e.target.value)}
                onFocus={() => setShowDestSuggestions(true)}
                required
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white"
              />
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-[100] max-h-48 overflow-y-auto rounded-xl bg-gray-950/95 border border-white/10 shadow-2xl backdrop-blur-md">
                  {destSuggestions.map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => selectDestSuggestion(a)}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-indigo-600/30 text-gray-300 hover:text-white border-b border-white/5 last:border-b-0 flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">{a.city}</div>
                        <div className="text-[10px] text-gray-400">{a.name}</div>
                      </div>
                      <div className="font-black text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25">
                        {a.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dato-fleksibilitet */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Dato-fleksibilitet</label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-900/80 border border-white/5">
              <button
                type="button"
                onClick={() => setIsFlexible(false)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  !isFlexible 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Bestemte datoer
              </button>
              <button
                type="button"
                onClick={() => setIsFlexible(true)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  isFlexible 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Fleksibelt tidsrum
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {isFlexible ? 'Tidligste afrejse' : 'Afrejsedato'}
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
                {isFlexible ? 'Seneste hjemrejse' : 'Hjemrejsedato'}
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

          {/* Rejsevarighed (vises kun ved fleksibelt tidsrum) */}
          {isFlexible && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Ønsket rejsevarighed (antal dage)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={tripDuration}
                onChange={(e) => setTripDuration(e.target.value)}
                required={isFlexible}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white"
                placeholder="f.eks. 7"
              />
            </div>
          )}

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
