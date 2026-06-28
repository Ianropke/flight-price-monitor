export interface FlightSearchCriteria {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;    // YYYY-MM-DD (optional, if roundtrip)
  currency?: string;      // Defaults to DKK
}

export interface FlightPriceResult {
  lowestPrice: number;
  currency: string;
  carrierCode?: string;
  rawPayload: any;
}

export interface IFlightService {
  fetchLowestPrice(criteria: FlightSearchCriteria): Promise<FlightPriceResult>;
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

  private getSimulatedPrice(basePrice: number): number {
    // Generer et dynamisk udsving på +/- 15% baseret på sekundtal
    const now = Date.now();
    const wave = Math.sin(now / 15000);
    const fluctuation = basePrice * 0.15 * wave;
    return Math.round(basePrice + fluctuation);
  }

  async fetchLowestPrice(criteria: FlightSearchCriteria): Promise<FlightPriceResult> {
    const apiKey = process.env.SERPAPI_KEY;
    const currency = criteria.currency || 'DKK';

    // Hvis SerpApi-nøgle er angivet, lav et rigtigt kald til Google Flights via SerpApi
    if (apiKey && apiKey !== 'your-serpapi-api-key') {
      try {
        const params = new URLSearchParams({
          engine: 'google_flights',
          departure_id: criteria.origin.toUpperCase(),
          arrival_id: criteria.destination.toUpperCase(),
          outbound_date: criteria.departureDate,
          currency: currency,
          hl: 'da',
          gl: 'dk',
          api_key: apiKey,
        });

        if (criteria.returnDate) {
          params.append('return_date', criteria.returnDate);
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
            throw new Error(`Ingen flyvninger fundet hos SerpApi for rute ${criteria.origin} -> ${criteria.destination}`);
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

      } catch (error) {
        console.warn('Real SerpApi call failed, falling back to simulator:', error);
      }
    }

    // Simulator Fallback
    const basePrice = this.getBasePrice(criteria.origin, criteria.destination);
    const simulatedPrice = this.getSimulatedPrice(basePrice);
    
    const carriers = ['SK', 'DY', 'FR', 'EZ', 'LH', 'TP'];
    const carrierIndex = Math.abs(criteria.origin.charCodeAt(0) + criteria.destination.charCodeAt(0)) % carriers.length;
    const carrierCode = carriers[carrierIndex];

    console.log(`[SerpApi Flight Simulator] ${criteria.origin} -> ${criteria.destination}: ${simulatedPrice} ${currency}`);

    return {
      lowestPrice: simulatedPrice,
      currency,
      carrierCode,
      rawPayload: {
        info: 'Simuleret prisdata fra SerpApi Google Flights simulator',
        basePrice,
        timestamp: new Date().toISOString()
      }
    };
  }
}

export const flightService: IFlightService = new SerpApiFlightService();
export default flightService;
