export interface TrackedRoute {
  id: string;
  user_id: string | null;
  origin_iata: string; // 3-letter IATA code
  destination_iata: string; // 3-letter IATA code
  departure_date: string; // YYYY-MM-DD
  return_date: string; // YYYY-MM-DD
  target_price_threshold: number | null;
  drop_percentage_threshold: number | null;
  currency: string;
  status: 'active' | 'inactive';
  trip_duration: number | null;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  route_id: string;
  fetch_date: string; // ISO Timestamp
  lowest_price_found: number;
  currency: string;
  raw_response?: any;
  created_at: string;
}

export interface RouteWithHistory extends TrackedRoute {
  price_history: PriceHistory[];
}
