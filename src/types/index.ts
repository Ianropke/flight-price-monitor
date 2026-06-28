export interface TrackedRoute {
  id: string;
  user_id: string | null;
  origin: string; // 3-letter IATA code
  destination: string; // 3-letter IATA code
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  target_price: number | null;
  drop_percentage: number | null;
  currency: string;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  route_id: string;
  fetch_date: string; // ISO Timestamp
  lowest_price: number;
  raw_response?: any;
  created_at: string;
}

export interface RouteWithHistory extends TrackedRoute {
  price_history: PriceHistory[];
}
