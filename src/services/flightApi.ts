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

// Module-level token cache for serverless lifecycles
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0; // Milliseconds timestamp

class AmadeusFlightService implements IFlightService {
  private getBaseUrl(): string {
    const isProd = process.env.AMADEUS_ENVIRONMENT === 'production';
    return isProd ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiryTime) {
      return cachedToken;
    }

    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    const baseUrl = this.getBaseUrl();

    if (!clientId || !clientSecret) {
      throw new Error('Amadeus API credentials (AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET) are missing');
    }

    try {
      const response = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      cachedToken = data.access_token;
      // Set expiration 60 seconds early to avoid race conditions
      tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;

      return cachedToken!;
    } catch (error) {
      console.error('Error fetching Amadeus access token:', error);
      throw error;
    }
  }

  async fetchLowestPrice(criteria: FlightSearchCriteria): Promise<FlightPriceResult> {
    const token = await this.getAccessToken();
    const baseUrl = this.getBaseUrl();
    const currency = criteria.currency || 'DKK';

    const params = new URLSearchParams({
      originLocationCode: criteria.origin.toUpperCase(),
      destinationLocationCode: criteria.destination.toUpperCase(),
      departureDate: criteria.departureDate,
      adults: '1',
      currencyCode: currency,
      max: '5', // Fetch top 5 cheapest to find the lowest valid offer
    });

    if (criteria.returnDate) {
      params.append('returnDate', criteria.returnDate);
    }

    const apiUrl = `${baseUrl}/v2/shopping/flight-offers?${params.toString()}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Flight offers search failed [${response.status}]: ${errorBody}`);
      }

      const payload = await response.json();

      if (!payload.data || payload.data.length === 0) {
        throw new Error(`No flights found for route ${criteria.origin} -> ${criteria.destination} on dates`);
      }

      // Sort data to guarantee lowest price is found
      const offers = payload.data;
      let lowestOffer = offers[0];

      for (let i = 1; i < offers.length; i++) {
        const currentPrice = parseFloat(offers[i].price.total);
        const lowestPrice = parseFloat(lowestOffer.price.total);
        if (currentPrice < lowestPrice) {
          lowestOffer = offers[i];
        }
      }

      const finalPrice = parseFloat(lowestOffer.price.total);
      
      // Extract carrier code of the first segment of first itinerary if available
      let carrierCode: string | undefined;
      try {
        carrierCode = lowestOffer.itineraries?.[0]?.segments?.[0]?.carrierCode;
      } catch (e) {
        // Safe fallback
      }

      return {
        lowestPrice: finalPrice,
        currency: lowestOffer.price.currency || currency,
        carrierCode,
        rawPayload: payload, // Store response for transparency & debugging
      };
    } catch (error) {
      console.error(`Error searching flights for ${criteria.origin}-${criteria.destination}:`, error);
      throw error;
    }
  }
}

// Export the active service implementation
export const flightService: IFlightService = new AmadeusFlightService();
export default flightService;
