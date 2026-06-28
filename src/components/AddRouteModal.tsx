'use client';

import { useState, useRef, useEffect } from 'react';
import { X, PlaneTakeoff, PlaneLanding, Calendar, DollarSign, Percent, Loader2, Sparkles } from 'lucide-react';
import { RouteWithHistory } from '@/types';

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRoute: any) => void;
  routeToEdit?: RouteWithHistory | null;
}

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

const POPULAR_AIRPORTS: Airport[] = [
  // Denmark
  { code: 'CPH', name: 'Københavns Lufthavn', city: 'København', country: 'Danmark' },
  { code: 'BLL', name: 'Billund Lufthavn', city: 'Billund', country: 'Danmark' },
  { code: 'AAR', name: 'Aarhus Lufthavn', city: 'Aarhus', country: 'Danmark' },
  { code: 'AAL', name: 'Aalborg Lufthavn', city: 'Aalborg', country: 'Danmark' },
  
  // Italy
  { code: 'FLR', name: 'Peretola Airport', city: 'Firenze', country: 'Italien' },
  { code: 'FCO', name: 'Fiumicino Airport', city: 'Rom', country: 'Italien' },
  { code: 'CIA', name: 'Ciampino Airport', city: 'Rom', country: 'Italien' },
  { code: 'PSA', name: 'Galileo Galilei Airport', city: 'Pisa', country: 'Italien' },
  { code: 'VCE', name: 'Marco Polo Airport', city: 'Venedig', country: 'Italien' },
  { code: 'NAP', name: 'Capodichino Airport', city: 'Napoli', country: 'Italien' },
  { code: 'MXP', name: 'Malpensa Airport', city: 'Milano', country: 'Italien' },
  { code: 'LIN', name: 'Linate Airport', city: 'Milano', country: 'Italien' },
  { code: 'BGY', name: 'Orio al Serio Airport', city: 'Milano / Bergamo', country: 'Italien' },
  { code: 'BLQ', name: 'Guglielmo Marconi Airport', city: 'Bologna', country: 'Italien' },
  { code: 'CTA', name: 'Fontanarossa Airport', city: 'Catania', country: 'Italien' },
  { code: 'PMO', name: 'Falcone-Borsellino Airport', city: 'Palermo', country: 'Italien' },
  { code: 'TRN', name: 'Turin Airport', city: 'Torino', country: 'Italien' },
  { code: 'VRN', name: 'Valerio Catullo Airport', city: 'Verona', country: 'Italien' },

  // Portugal
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lissabon', country: 'Portugal' },
  { code: 'OPO', name: 'Francisco Sá Carneiro Lufthavn', city: 'Porto', country: 'Portugal' },
  { code: 'FAO', name: 'Faro Airport', city: 'Faro / Algarve', country: 'Portugal' },
  { code: 'FNC', name: 'Madeira Airport', city: 'Funchal / Madeira', country: 'Portugal' },

  // Spain
  { code: 'BCN', name: 'El Prat Airport', city: 'Barcelona', country: 'Spanien' },
  { code: 'MAD', name: 'Adolfo Suárez Barajas Airport', city: 'Madrid', country: 'Spanien' },
  { code: 'AGP', name: 'Málaga Airport', city: 'Málaga', country: 'Spanien' },
  { code: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma de Mallorca', country: 'Spanien' },
  { code: 'ALC', name: 'Alicante-Elche Airport', city: 'Alicante', country: 'Spanien' },
  { code: 'LPA', name: 'Gran Canaria Airport', city: 'Las Palmas / Gran Canaria', country: 'Spanien' },
  { code: 'TFS', name: 'Tenerife South Airport', city: 'Tenerife', country: 'Spanien' },
  { code: 'ACE', name: 'Lanzarote Airport', city: 'Lanzarote', country: 'Spanien' },
  { code: 'IBZ', name: 'Ibiza Airport', city: 'Ibiza', country: 'Spanien' },
  { code: 'VLC', name: 'Valencia Airport', city: 'Valencia', country: 'Spanien' },
  { code: 'BIO', name: 'Bilbao Airport', city: 'Bilbao', country: 'Spanien' },
  { code: 'SVQ', name: 'Seville Airport', city: 'Sevilla', country: 'Spanien' },

  // France
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'Frankrig' },
  { code: 'ORY', name: 'Orly Airport', city: 'Paris', country: 'Frankrig' },
  { code: 'NCE', name: 'Côte d\'Azur Airport', city: 'Nice', country: 'Frankrig' },
  { code: 'LYS', name: 'Saint Exupéry Airport', city: 'Lyon', country: 'Frankrig' },
  { code: 'MRS', name: 'Marseille Provence Airport', city: 'Marseille', country: 'Frankrig' },
  { code: 'BOD', name: 'Bordeaux-Mérignac Airport', city: 'Bordeaux', country: 'Frankrig' },

  // Greece
  { code: 'ATH', name: 'Eleftherios Venizelos Airport', city: 'Athen', country: 'Grækenland' },
  { code: 'HER', name: 'Heraklion Airport', city: 'Kreta', country: 'Grækenland' },
  { code: 'CHQ', name: 'Chania Airport', city: 'Kreta / Chania', country: 'Grækenland' },
  { code: 'RHO', name: 'Diagoras Airport', city: 'Rhodos', country: 'Grækenland' },
  { code: 'CFU', name: 'Ioannis Kapodistrias Airport', city: 'Korfu', country: 'Grækenland' },
  { code: 'JTR', name: 'Santorini Airport', city: 'Santorini', country: 'Grækenland' },
  { code: 'JMK', name: 'Mykonos Airport', city: 'Mykonos', country: 'Grækenland' },

  // UK & Ireland
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'Storbritannien' },
  { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'Storbritannien' },
  { code: 'STN', name: 'Stansted Airport', city: 'London', country: 'Storbritannien' },
  { code: 'LTN', name: 'Luton Airport', city: 'London', country: 'Storbritannien' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'Storbritannien' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'Skotland' },
  { code: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'Storbritannien' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Irland' },

  // Germany, Austria & Switzerland
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Tyskland' },
  { code: 'MUC', name: 'Munich Airport', city: 'München', country: 'Tyskland' },
  { code: 'BER', name: 'Brandenburg Airport', city: 'Berlin', country: 'Tyskland' },
  { code: 'HAM', name: 'Hamburg Airport', city: 'Hamburg', country: 'Tyskland' },
  { code: 'DUS', name: 'Düsseldorf Airport', city: 'Düsseldorf', country: 'Tyskland' },
  { code: 'VIE', name: 'Vienna International Airport', city: 'Wien', country: 'Østrig' },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zürich', country: 'Schweiz' },
  { code: 'GVA', name: 'Geneva Airport', city: 'Genève', country: 'Schweiz' },

  // Other Europe
  { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Holland' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Bruxelles', country: 'Belgien' },
  { code: 'PRG', name: 'Václav Havel Airport', city: 'Prag', country: 'Tjekkiet' },
  { code: 'BUD', name: 'Liszt Ferenc Airport', city: 'Budapest', country: 'Ungarn' },
  { code: 'WAW', name: 'Chopin Airport', city: 'Warszawa', country: 'Polen' },
  { code: 'ARN', name: 'Arlanda Airport', city: 'Stockholm', country: 'Sverige' },
  { code: 'OSL', name: 'Gardermoen Airport', city: 'Oslo', country: 'Norge' },
  { code: 'HEL', name: 'Helsinki-Vantaa Airport', city: 'Helsinki', country: 'Finland' },
  { code: 'KEF', name: 'Keflavík International Airport', city: 'Reykjavík', country: 'Island' },

  // Turkey & Middle East
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Tyrkiet' },
  { code: 'AYT', name: 'Antalya Airport', city: 'Antalya', country: 'Tyrkiet' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'Forenede Arabiske Emirater' },

  // Asia & Oceania
  { code: 'BOM', name: 'Chhatrapati Shivaji International Airport', city: 'Mumbai', country: 'Indien' },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'Indien' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  { code: 'HKT', name: 'Phuket Airport', city: 'Phuket', country: 'Thailand' },
  { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Kina' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'NRT', name: 'Narita Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'DPS', name: 'Ngurah Rai Airport', city: 'Bali', country: 'Indonesien' },
  { code: 'SYD', name: 'Kingsford Smith Airport', city: 'Sydney', country: 'Australien' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australien' },

  // North America
  { code: 'JFK', name: 'John F. Kennedy Intl Airport', city: 'New York', country: 'USA' },
  { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark / New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA' },
  { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA' },
  { code: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'USA' },
  { code: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas', country: 'USA' },
  { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'USA' },
  { code: 'YYZ', name: 'Pearson International Airport', city: 'Toronto', country: 'Canada' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
  { code: 'CUN', name: 'Cancún International Airport', city: 'Cancún', country: 'Mexico' }
];

interface TimeOption {
  label: string;
  start: string;
  end: string;
}

const generateMonthOptions = (): TimeOption[] => {
  const options: TimeOption[] = [];
  const start = new Date(2026, 5, 1);
  
  const monthNames = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ];

  for (let i = 0; i < 18; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthName = monthNames[monthIndex];
    
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    
    const startStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    options.push({
      label: `${monthName} ${year}`,
      start: startStr,
      end: endStr
    });
  }
  return options;
};

const generateWeekOptions = (): TimeOption[] => {
  const options: TimeOption[] = [];
  const today = new Date(2026, 5, 28);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const currentMonday = new Date(today.setDate(diff));

  const monthNamesShort = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'
  ];

  const getWeekNumber = (d: Date): number => {
    const tempDate = new Date(d.valueOf());
    const dayNum = (d.getDay() + 6) % 7;
    tempDate.setDate(tempDate.getDate() - dayNum + 3);
    const firstThursday = tempDate.valueOf();
    tempDate.setMonth(0, 1);
    if (tempDate.getDay() !== 4) {
      tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
  };

  for (let i = 0; i < 35; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + i * 7);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekNum = getWeekNumber(monday);
    const year = monday.getFullYear();
    
    const startStr = monday.toISOString().split('T')[0];
    const endStr = sunday.toISOString().split('T')[0];
    
    const monLabel = `${monday.getDate()}. ${monthNamesShort[monday.getMonth()]}`;
    const sunLabel = `${sunday.getDate()}. ${monthNamesShort[sunday.getMonth()]}`;
    
    options.push({
      label: `Uge ${weekNum} (${monLabel} - ${sunLabel}) ${year}`,
      start: startStr,
      end: endStr
    });
  }
  
  return options;
};

export default function AddRouteModal({ isOpen, onClose, onSuccess, routeToEdit }: AddRouteModalProps) {
  const [originSearch, setOriginSearch] = useState('');
  const [originIata, setOriginIata] = useState('');
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);

  const [destSearch, setDestSearch] = useState('');
  const [destIata, setDestIata] = useState('');
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Date selection states
  const [isFlexible, setIsFlexible] = useState(false);
  const [flexType, setFlexType] = useState<'month' | 'week'>('month');
  
  const monthOptions = generateMonthOptions();
  const weekOptions = generateWeekOptions();
  
  const [selectedMonthIndex, setSelectedMonthIndex] = useState('5');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState('0');
  
  const [specificDepartureDate, setSpecificDepartureDate] = useState('');
  const [specificReturnDate, setSpecificReturnDate] = useState('');
  
  // Trip Duration presets
  const [durationPreset, setDurationPreset] = useState<'3' | '4' | '7' | '10' | '14' | 'custom'>('7');
  const [customTripDuration, setCustomTripDuration] = useState('7');

  const [targetType, setTargetType] = useState<'absolute' | 'percentage'>('absolute');
  const [targetPriceThreshold, setTargetPriceThreshold] = useState('');
  const [dropPercentageThreshold, setDropPercentageThreshold] = useState('');
  const [currency, setCurrency] = useState('DKK');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  // Pre-fill fields if editing
  useEffect(() => {
    if (isOpen && routeToEdit) {
      const origAirport = POPULAR_AIRPORTS.find(a => a.code === routeToEdit.origin_iata);
      setOriginSearch(origAirport ? `${origAirport.city} (${origAirport.code})` : routeToEdit.origin_iata);
      setOriginIata(routeToEdit.origin_iata);

      const destAirport = POPULAR_AIRPORTS.find(a => a.code === routeToEdit.destination_iata);
      setDestSearch(destAirport ? `${destAirport.city} (${destAirport.code})` : routeToEdit.destination_iata);
      setDestIata(routeToEdit.destination_iata);

      setCurrency(routeToEdit.currency || 'DKK');
      setTargetType(routeToEdit.target_price_threshold ? 'absolute' : 'percentage');
      setTargetPriceThreshold(routeToEdit.target_price_threshold ? String(routeToEdit.target_price_threshold) : '');
      setDropPercentageThreshold(routeToEdit.drop_percentage_threshold ? String(routeToEdit.drop_percentage_threshold) : '');

      const isFlex = !!routeToEdit.trip_duration;
      setIsFlexible(isFlex);

      if (isFlex) {
        const durationStr = String(routeToEdit.trip_duration);
        if (['3', '4', '7', '10', '14'].includes(durationStr)) {
          setDurationPreset(durationStr as any);
        } else {
          setDurationPreset('custom');
          setCustomTripDuration(durationStr);
        }

        const matchedMonthIdx = monthOptions.findIndex(
          o => o.start === routeToEdit.departure_date && o.end === routeToEdit.return_date
        );
        const matchedWeekIdx = weekOptions.findIndex(
          o => o.start === routeToEdit.departure_date && o.end === routeToEdit.return_date
        );

        if (matchedMonthIdx !== -1) {
          setFlexType('month');
          setSelectedMonthIndex(String(matchedMonthIdx));
        } else if (matchedWeekIdx !== -1) {
          setFlexType('week');
          setSelectedWeekIndex(String(matchedWeekIdx));
        } else {
          setIsFlexible(false);
          setSpecificDepartureDate(routeToEdit.departure_date);
          setSpecificReturnDate(routeToEdit.return_date);
          setDurationPreset('custom');
          setCustomTripDuration(durationStr);
        }
      } else {
        setSpecificDepartureDate(routeToEdit.departure_date);
        setSpecificReturnDate(routeToEdit.return_date);
      }
    } else if (isOpen) {
      // Reset form fields
      setOriginSearch('');
      setOriginIata('');
      setDestSearch('');
      setDestIata('');
      setSpecificDepartureDate('');
      setSpecificReturnDate('');
      setIsFlexible(false);
      setFlexType('month');
      setSelectedMonthIndex('5');
      setSelectedWeekIndex('0');
      setDurationPreset('7');
      setCustomTripDuration('7');
      setTargetPriceThreshold('');
      setDropPercentageThreshold('');
    }
  }, [isOpen, routeToEdit]);

  // Close lists on outside click
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
    ).slice(0, 6);
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

    let finalOrigin = originIata;
    if (!finalOrigin && originSearch.length === 3) {
      finalOrigin = originSearch.toUpperCase();
    }
    
    let finalDest = destIata;
    if (!finalDest && destSearch.length === 3) {
      finalDest = destSearch.toUpperCase();
    }

    if (!finalOrigin || finalOrigin.length !== 3) {
      setError('Vælg en afrejseby fra listen eller indtast en 3-bogstavs IATA-kode (f.eks. CPH)');
      return;
    }
    if (!finalDest || finalDest.length !== 3) {
      setError('Vælg en destination fra listen eller indtast en 3-bogstavs IATA-kode (f.eks. OPO)');
      return;
    }

    let departure_date = '';
    let return_date = '';
    let trip_duration: number | null = null;

    if (isFlexible) {
      if (flexType === 'month') {
        const idx = parseInt(selectedMonthIndex);
        departure_date = monthOptions[idx].start;
        return_date = monthOptions[idx].end;
      } else {
        const idx = parseInt(selectedWeekIndex);
        departure_date = weekOptions[idx].start;
        return_date = weekOptions[idx].end;
      }
      
      trip_duration = durationPreset === 'custom' 
        ? parseInt(customTripDuration) 
        : parseInt(durationPreset);
    } else {
      departure_date = specificDepartureDate;
      return_date = specificReturnDate;
      
      if (!departure_date || !return_date) {
        setError('Udfyld venligst afrejse- og hjemrejsedato');
        return;
      }
      if (new Date(departure_date) > new Date(return_date)) {
        setError('Afrejsedato skal være før eller lig med hjemrejsedato');
        return;
      }
    }

    setIsLoading(true);

    try {
      const method = routeToEdit ? 'PATCH' : 'POST';
      const response = await fetch('/api/routes', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: routeToEdit?.id,
          origin_iata: finalOrigin,
          destination_iata: finalDest,
          departure_date,
          return_date,
          target_price_threshold: targetType === 'absolute' ? parseFloat(targetPriceThreshold) || null : null,
          drop_percentage_threshold: targetType === 'percentage' ? parseFloat(dropPercentageThreshold) || null : null,
          trip_duration,
          currency: currency.toUpperCase()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke gemme overvågning');
      }

      onSuccess(data);
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
            <h2 className="text-xl font-semibold tracking-wide text-white font-outfit">
              {routeToEdit ? 'Rediger overvågning' : 'Overvåg ny rute'}
            </h2>
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
                disabled={!!routeToEdit} // Lock airports on edit to prevent inconsistency, or keep editable
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white disabled:opacity-50"
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
                disabled={!!routeToEdit}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white disabled:opacity-50"
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

          {/* Dato-fleksibilitet Toggle */}
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
                Måned eller Uge
              </button>
            </div>
          </div>

          {/* Flexible Travel Window Selector (Months or Weeks) */}
          {isFlexible ? (
            <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/5 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Overvåg tidsrum</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFlexType('month')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        flexType === 'month' 
                          ? 'bg-white/10 border-indigo-500/50 text-white' 
                          : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      En hel måned
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlexType('week')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        flexType === 'week' 
                          ? 'bg-white/10 border-indigo-500/50 text-white' 
                          : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      En bestemt uge
                    </button>
                  </div>
                </div>
                
                {flexType === 'month' ? (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vælg måned</label>
                    <select
                      value={selectedMonthIndex}
                      onChange={(e) => setSelectedMonthIndex(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white font-medium focus:border-indigo-500"
                    >
                      {monthOptions.map((opt, idx) => (
                        <option key={idx} value={idx}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vælg uge</label>
                    <select
                      value={selectedWeekIndex}
                      onChange={(e) => setSelectedWeekIndex(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-white font-medium focus:border-indigo-500"
                    >
                      {weekOptions.map((opt, idx) => (
                        <option key={idx} value={idx}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rejsens varighed</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: '3', label: 'Weekend' },
                      { val: '4', label: 'Forlænget' },
                      { val: '7', label: '1 uge' },
                      { val: '10', label: '10 dg.' },
                      { val: '14', label: '2 uger' },
                      { val: 'custom', label: 'Andet' }
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setDurationPreset(p.val as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border ${
                          durationPreset === p.val 
                            ? 'bg-indigo-600/30 border-indigo-500 text-white' 
                            : 'border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {durationPreset === 'custom' && (
                  <div className="space-y-1.5 col-span-2 animate-fade-in">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Indtast rejsevarighed (antal dage)</label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={customTripDuration}
                      onChange={(e) => setCustomTripDuration(e.target.value)}
                      required={durationPreset === 'custom'}
                      className="w-full px-4 py-2 rounded-xl glass-input text-sm text-white focus:border-indigo-500"
                      placeholder="f.eks. 5"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Afrejsedato
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={specificDepartureDate}
                  onChange={(e) => setSpecificDepartureDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                  required={!isFlexible}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white cursor-pointer"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Hjemrejsedato
                </label>
                <input
                  type="date"
                  min={specificDepartureDate || new Date().toISOString().split('T')[0]}
                  value={specificReturnDate}
                  onChange={(e) => setSpecificReturnDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                  required={!isFlexible}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-white cursor-pointer"
                />
              </div>
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
                  <span>{routeToEdit ? 'Gem ændringer' : 'Start overvågning'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
