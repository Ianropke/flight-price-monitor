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

class KiwiFlightService implements IFlightService {
  private getBaseUrl(): string {
    return 'https://api.tequila.kiwi.com/v2/search';
  }

  private formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  async fetchLowestPrice(criteria: FlightSearchCriteria): Promise<FlightPriceResult> {
    const apiKey = process.env.KIWI_API_KEY;
    const baseUrl = this.getBaseUrl();
    const currency = criteria.currency || 'DKK';

    if (!apiKey) {
      throw new Error('Kiwi Tequila API key (KIWI_API_KEY) is missing');
    }

    const formattedDeparture = this.formatDate(criteria.departureDate);

    const params = new URLSearchParams({
      fly_from: criteria.origin.toUpperCase(),
      fly_to: criteria.destination.toUpperCase(),
      date_from: formattedDeparture,
      date_to: formattedDeparture,
      curr: currency,
      limit: '5',
      vehicle_type: 'aircraft',
    });

    if (criteria.returnDate) {
      const formattedReturn = this.formatDate(criteria.returnDate);
      params.append('return_from', formattedReturn);
      params.append('return_to', formattedReturn);
    }

    const apiUrl = `${baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Kiwi Flight search failed [${response.status}]: ${errorBody}`);
      }

      const payload = await response.json();

      if (!payload.data || payload.data.length === 0) {
        throw new Error(`No flights found for route ${criteria.origin} -> ${criteria.destination} on dates`);
      }

      // Kiwi results are already sorted by price ascending, so data[0] is the cheapest
      const cheapestOffer = payload.data[0];
      const price = parseFloat(cheapestOffer.price);
      
      // Get carrier code of the first route segment
      let carrierCode: string | undefined;
      try {
        carrierCode = cheapestOffer.route?.[0]?.airline;
      } catch (e) {
        // Safe fallback
      }

      return {
        lowestPrice: price,
        currency,
        carrierCode,
        rawPayload: payload,
      };
    } catch (error) {
      console.error(`Error searching flights on Kiwi Tequila for ${criteria.origin}-${criteria.destination}:`, error);
      throw error;
    }
  }
}

// Export the active service implementation (Kiwi Tequila)
export const flightService: IFlightService = new KiwiFlightService();
export default flightService;
