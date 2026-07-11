import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  // Only allow seeding in development mode OR in production with a valid secret (safety check)
  if (process.env.NODE_ENV === 'production' && (!expectedSecret || secret !== expectedSecret)) {
    return NextResponse.json({ error: 'Ikke tilladt i produktion uden gyldig hemmelighed' }, { status: 403 });
  }

  try {
    const supabase = createServiceRoleClient();

    // 1. Clear existing seed data safely
    await supabase.from('tracked_routes').delete().is('user_id', null);

    // 2. Insert mock routes for November 2026
    const routesData = [
      {
        origin_iata: 'CPH',
        destination_iata: null,
        route_type: 'explore',
        explore_regions: ['Europe'],
        departure_date: '2026-12-20',
        return_date: '2026-12-27',
        target_price_threshold: 2000,
        drop_percentage_threshold: null,
        currency: 'DKK',
        status: 'active'
      },
      {
        origin_iata: 'CPH',
        destination_iata: null,
        route_type: 'explore',
        explore_regions: ['Asia'],
        departure_date: '2026-11-15',
        return_date: '2026-11-29',
        target_price_threshold: 4000,
        drop_percentage_threshold: 15,
        currency: 'DKK',
        status: 'active'
      },
      {
        origin_iata: 'CPH',
        destination_iata: 'JFK',
        route_type: 'specific',
        departure_date: '2026-11-10',
        return_date: '2026-11-24',
        target_price_threshold: 3000,
        drop_percentage_threshold: 10,
        currency: 'DKK',
        status: 'active'
      }
    ];

    const { data: insertedRoutes, error: insertError } = await supabase
      .from('tracked_routes')
      .insert(routesData)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert routes: ${insertError.message}`);
    }

    // 3. Generate history data for each route
    const now = new Date();
    const historyData: { route_id: string; lowest_price_found: number; currency: string; fetch_date: string; explore_deals?: any }[] = [];

    // Helper to generate ISO strings at offsets
    const getPastDateString = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(now.getDate() - daysAgo);
      return d.toISOString();
    };

    // Route 1 (CPH -> JFK) prices: fluctuating around 3200 DKK, target is 3000 (not met)
    const route3 = insertedRoutes.find(r => r.destination_iata === 'JFK');
    if (route3) {
      const prices = [3400, 3320, 3280, 3350, 3200, 3250, 3210];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: route3.id,
          lowest_price_found: price,
          currency: route3.currency,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 1),
        });
      });
    }

    // Route 2 (CPH -> Europe Explore) prices
    const routeEurope = insertedRoutes.find(r => r.route_type === 'explore' && r.explore_regions?.includes('Europe'));
    if (routeEurope) {
      const prices = [1100, 1050, 950, 800, 850, 750, 680];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: routeEurope.id,
          lowest_price_found: price,
          currency: routeEurope.currency,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 1),
          explore_deals: [
            { destination: 'LHR', airportName: 'London Heathrow', price: price, duration: 120, airline: 'British Airways' },
            { destination: 'CDG', airportName: 'Paris Charles de Gaulle', price: price + 150, duration: 130, airline: 'Air France' },
            { destination: 'FCO', airportName: 'Rome Fiumicino', price: price + 200, duration: 160, airline: 'SAS' }
          ]
        });
      });
    }

    // Route 3 (CPH -> Asia Explore) prices
    const routeAsia = insertedRoutes.find(r => r.route_type === 'explore' && r.explore_regions?.includes('Asia'));
    if (routeAsia) {
      const prices = [5100, 4900, 4850, 4700, 4900, 4800, 4600];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: routeAsia.id,
          lowest_price_found: price,
          currency: routeAsia.currency,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 1),
          explore_deals: [
            { destination: 'BKK', airportName: 'Bangkok Suvarnabhumi', price: price, duration: 650, airline: 'Thai Airways' },
            { destination: 'NRT', airportName: 'Tokyo Narita', price: price + 400, duration: 780, airline: 'SAS' },
            { destination: 'SIN', airportName: 'Singapore Changi', price: price + 800, duration: 800, airline: 'Singapore Airlines' }
          ]
        });
      });
    }

    const { error: historyError } = await supabase
      .from('price_history')
      .insert(historyData);

    if (historyError) {
      throw new Error(`Failed to insert history: ${historyError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with routes and 7-day price histories.',
      seededCount: {
        routes: insertedRoutes.length,
        history: historyData.length
      }
    });

  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}
