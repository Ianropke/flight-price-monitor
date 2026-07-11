import { ExploreDeal } from '@/types';

export interface FlightSearchCriteria {
  origin: string;
  destination?: string; // Optional for explore
  departureDate: string; // YYYY-MM-DD (or earliest departure if flexible)
  returnDate?: string;    // YYYY-MM-DD (or latest return if flexible)
  currency?: string;      // Defaults to DKK
  tripDuration?: number | null; // Optional trip duration in days for flexible windows
  exploreRegionId?: string; // kgmid for Explore Mode
}

export interface FlightPriceResult {
  lowestPrice: number;
  currency: string;
  carrierCode?: string;
  exploreDeals?: ExploreDeal[];
  rawPayload: any;
}

export interface IFlightService {
  fetchLowestPrice(criteria: FlightSearchCriteria): Promise<FlightPriceResult>;
  fetchExploreDeals(criteria: FlightSearchCriteria): Promise<FlightPriceResult>;
}

class SerpApiFlightService implements IFlightService {
  private getBasePrice(origin: string, destination: string): number {
    const route = `${origin.toUpperCase()}-${destination.toUpperCase()}`;
    
    // Realistiske basispriser i DKK
    if (route === 'CPH-OPO') return 1200; // Porto
    if (route === 'CPH-EDI') return 850;  // Edinburgh
    if (route === 'CPH-JFK') return 3400; // New York
    if (route === 'CPH-BCN') return 1100; // Barcelona
    
    // Stabil hash-pris for andre ruter
    let hash = 0;
    for (let i = 0; i < route.length; i++) {
      hash = route.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 1000 + (Math.abs(hash) % 3500); // 1000 to 4500 DKK
  }

  private getSimulatedPrice(basePrice: number, isFlexible = false): number {
    // Generer et dynamisk udsving på +/- 15% baseret på sekundtal
    const now = Date.now();
    const wave = Math.sin(now / 15000);
    let fluctuation = basePrice * 0.15 * wave;
    
    // Fleksible tidsrum er typisk 10% billigere i gennemsnit
    let finalPrice = basePrice + fluctuation;
    if (isFlexible) {
      finalPrice = finalPrice * 0.9;
    }
    return Math.round(finalPrice);
  }

  // Single standard API fetch helper
  private async fetchSinglePrice(
    apiKey: string,
    origin: string,
    destination: string,
    departureDate: string,
    returnDate: string | undefined,
    currency: string
  ): Promise<FlightPriceResult> {
    const params = new URLSearchParams({
      engine: 'google_flights',
      departure_id: origin.toUpperCase(),
      arrival_id: destination.toUpperCase(),
      outbound_date: departureDate,
      currency: currency,
      hl: 'da',
      gl: 'dk',
      api_key: apiKey,
    });

    if (returnDate) {
      params.append('return_date', returnDate);
    }

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SerpApi search failed [${response.status}]: ${errorBody}`);
    }

    const payload = await response.json();

    // 1. Prøv at hente fra price_insights.lowest_price
    let lowestPrice = payload.price_insights?.lowest_price;

    // 2. Hvis missing, scan best_flights og andre flyvninger
    if (!lowestPrice) {
      const allFlights = [
        ...(payload.best_flights || []),
        ...(payload.other_flights || []),
      ];

      if (allFlights.length === 0) {
        throw new Error(`Ingen flyvninger fundet hos SerpApi for rute ${origin} -> ${destination}`);
      }

      const prices = allFlights
        .map(f => parseFloat(f.price))
        .filter(p => !isNaN(p));
      
      if (prices.length > 0) {
        lowestPrice = Math.min(...prices);
      }
    }

    if (!lowestPrice) {
      throw new Error('Kunne ikke udtrække laveste flypris fra SerpApi-svar');
    }

    // Hent flyselskabskode hvis tilgængelig
    let carrierCode: string | undefined;
    try {
      carrierCode = payload.best_flights?.[0]?.flights?.[0]?.airline;
    } catch (e) {}

    return {
      lowestPrice,
      currency,
      carrierCode,
      rawPayload: payload,
    };
  }

  async fetchLowestPrice(criteria: FlightSearchCriteria): Promise<FlightPriceResult> {
    const apiKey = process.env.SERPAPI_KEY;
    const currency = criteria.currency || 'DKK';
    const isFlexible = !!criteria.tripDuration && criteria.tripDuration > 0;

    // Hvis SerpApi-nøgle er angivet, lav et rigtigt kald til Google Flights via SerpApi
    if (apiKey && apiKey !== 'your-serpapi-api-key') {
      try {
        if (isFlexible && criteria.returnDate) {
          // Beregn dato-kandidater for fleksibel overvågning
          const tripDuration = criteria.tripDuration!;
          const start = new Date(criteria.departureDate);
          const end = new Date(criteria.returnDate);

          const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const maxDepartureDays = totalDays - tripDuration;

          if (maxDepartureDays <= 0) {
            // Hvis vinduet er for kort eller lig med rejsens længde, lav en enkelt standard søgning
            return await this.fetchSinglePrice(
              apiKey,
              criteria.origin,
              criteria.destination || '',
              criteria.departureDate,
              criteria.returnDate,
              currency
            );
          }

          // Definer 3 afrejse-kandidater (starten af vinduet, midten, og slutningen af vinduet)
          const addDays = (d: Date, days: number): string => {
            const temp = new Date(d);
            temp.setDate(temp.getDate() + days);
            return temp.toISOString().split('T')[0];
          };

          const depDates = [
            criteria.departureDate, // Start
            addDays(start, Math.floor(maxDepartureDays / 2)), // Midte
            addDays(start, maxDepartureDays) // Slut
          ];

          // Fjern dubletter hvis tidsvinduet er kort
          const uniqueDepDates = Array.from(new Set(depDates));

          console.log(`[SerpApi Flexible Search] Tjekker datoer:`, uniqueDepDates);

          const searchPromises = uniqueDepDates.map(depDate => {
            const retDate = addDays(new Date(depDate), tripDuration);
            return this.fetchSinglePrice(
              apiKey,
              criteria.origin,
              criteria.destination || '',
              depDate,
              retDate,
              currency
            ).catch(err => {
              console.warn(`Fejl ved søgning på kandidatdato ${depDate}:`, err.message);
              return null;
            });
          });

          const results = (await Promise.all(searchPromises)).filter(r => r !== null) as FlightPriceResult[];

          if (results.length === 0) {
            throw new Error(`Ingen kandidat-datoer lykkedes under fleksibel søgning.`);
          }

          // Vælg det absolut billigste resultat blandt kandidat-søgningerne
          let cheapestResult = results[0];
          for (const res of results) {
            if (res.lowestPrice < cheapestResult.lowestPrice) {
              cheapestResult = res;
            }
          }

          return {
            ...cheapestResult,
            rawPayload: {
              info: 'Fleksibel søgning på tværs af flere kandidat-datoer',
              searchedDatesCount: uniqueDepDates.length,
              cheapestOption: cheapestResult,
              allResults: results
            }
          };
        } else {
          // Standard specifik dato-søgning
          return await this.fetchSinglePrice(
            apiKey,
            criteria.origin,
            criteria.destination || '',
            criteria.departureDate,
            criteria.returnDate,
            currency
          );
        }

      } catch (error: any) {
        console.warn('Real SerpApi call failed, falling back to simulator:', error.message);
      }
    }

    // Simulator Fallback
    const dest = criteria.destination || '';
    const basePrice = this.getBasePrice(criteria.origin, dest);
    const simulatedPrice = this.getSimulatedPrice(basePrice, isFlexible);
    
    const carriers = ['SK', 'DY', 'FR', 'EZ', 'LH', 'TP'];
    const carrierIndex = Math.abs(criteria.origin.charCodeAt(0) + dest.charCodeAt(0)) % carriers.length;
    const carrierCode = carriers[carrierIndex];

    console.log(`[SerpApi Flight Simulator] ${criteria.origin} -> ${dest}: ${simulatedPrice} ${currency} (Fleksibel: ${isFlexible})`);

    return {
      lowestPrice: simulatedPrice,
      currency,
      carrierCode,
      rawPayload: {
        info: 'Simuleret prisdata fra SerpApi Google Flights simulator',
        basePrice,
        isFlexible,
        timestamp: new Date().toISOString()
      }
    };
  }

  async fetchExploreDeals(criteria: FlightSearchCriteria): Promise<FlightPriceResult> {
    const apiKey = process.env.SERPAPI_KEY;
    const currency = criteria.currency || 'DKK';

    if (!criteria.exploreRegionId) {
      throw new Error('ExploreRegionId is required for explore deals');
    }

    if (apiKey && apiKey !== 'your-serpapi-api-key') {
      try {
        const params = new URLSearchParams({
          engine: 'google_travel_explore',
          departure_id: criteria.origin.toUpperCase(),
          arrival_id: criteria.exploreRegionId,
          outbound_date: criteria.departureDate,
          return_date: criteria.returnDate || '',
          currency: currency,
          hl: 'da',
          gl: 'dk',
          api_key: apiKey,
        });

        const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Explore API failed: ${await response.text()}`);
        }

        const payload = await response.json();
        const flights = payload.flights || [];

        const exploreDeals: ExploreDeal[] = flights.slice(0, 5).map((f: any) => ({
          destination: f.arrival_airport?.id || 'Unknown',
          airportName: f.arrival_airport?.name || 'Unknown Airport',
          price: parseFloat(f.price) || 0,
          duration: f.duration || 0,
          airline: f.airline || 'Unknown'
        })).filter((d: ExploreDeal) => d.price > 0);

        if (exploreDeals.length === 0) {
          throw new Error('No deals found in Explore API response');
        }

        // The overall lowest price for the region
        const lowestPrice = Math.min(...exploreDeals.map((d: ExploreDeal) => d.price));

        return {
          lowestPrice,
          currency,
          exploreDeals,
          rawPayload: payload
        };
      } catch (err: any) {
        console.warn('Real SerpApi Explore failed, falling back to simulator:', err.message);
      }
    }

    // Simulator Fallback for Explore
    console.log(`[Simulator] Exploring deals for region ${criteria.exploreRegionId}`);
    const simulatedDeals: ExploreDeal[] = [
      { destination: 'LHR', airportName: 'London Heathrow', price: 400 + Math.floor(Math.random()*200), duration: 120, airline: 'British Airways' },
      { destination: 'CDG', airportName: 'Paris Charles de Gaulle', price: 500 + Math.floor(Math.random()*200), duration: 130, airline: 'Air France' },
      { destination: 'FCO', airportName: 'Rome Fiumicino', price: 600 + Math.floor(Math.random()*200), duration: 160, airline: 'SAS' }
    ];
    
    return {
      lowestPrice: Math.min(...simulatedDeals.map(d => d.price)),
      currency,
      exploreDeals: simulatedDeals,
      rawPayload: { info: 'Simulated explore deals' }
    };
  }
}

export const flightService: IFlightService = new SerpApiFlightService();
export default flightService;
