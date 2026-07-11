export interface TrackedRoute {
  id: string;
  user_id: string | null;
  route_type: 'specific' | 'explore';
  origin_iata: string; // 3-letter IATA code
  destination_iata: string | null; // Nullable for explore mode
  explore_regions: string[] | null; // e.g., ['Europe', 'Asia']
  departure_date: string; // YYYY-MM-DD
  return_date: string; // YYYY-MM-DD
  target_price_threshold: number | null;
  drop_percentage_threshold: number | null;
  currency: string;
  status: 'active' | 'inactive';
  trip_duration: number | null;
  created_at: string;
}

export interface ExploreDeal {
  destination: string;
  price: number;
  duration: number;
  airline: string;
  airportName: string;
}

export interface PriceHistory {
  id: string;
  route_id: string;
  fetch_date: string; // ISO Timestamp
  lowest_price_found: number;
  currency: string;
  explore_deals?: ExploreDeal[] | null;
  raw_response?: any;
  created_at: string;
}

export interface RouteWithHistory extends TrackedRoute {
  price_history: PriceHistory[];
}
