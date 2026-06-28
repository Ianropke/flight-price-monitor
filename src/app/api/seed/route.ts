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
        destination_iata: 'OPO',
        departure_date: '2026-11-12',
        return_date: '2026-11-19',
        target_price_threshold: 1200,
        drop_percentage_threshold: null,
        currency: 'DKK',
        status: 'active'
      },
      {
        origin_iata: 'CPH',
        destination_iata: 'EDI',
        departure_date: '2026-11-15',
        return_date: '2026-11-22',
        target_price_threshold: null,
        drop_percentage_threshold: 15,
        currency: 'DKK',
        status: 'active'
      },
      {
        origin_iata: 'CPH',
        destination_iata: 'JFK',
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
    const historyData: { route_id: string; lowest_price_found: number; currency: string; fetch_date: string }[] = [];

    // Helper to generate ISO strings at offsets
    const getPastDateString = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(now.getDate() - daysAgo);
      return d.toISOString();
    };

    // Route 1 (CPH -> OPO) prices: descending down to target threshold of 1200 (final is 1150)
    const route1 = insertedRoutes.find(r => r.destination_iata === 'OPO');
    if (route1) {
      const prices = [1500, 1420, 1350, 1290, 1310, 1250, 1150];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: route1.id,
          lowest_price_found: price,
          currency: route1.currency,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 1), // 1 point per day for last 7 days
        });
      });
    }

    // Route 2 (CPH -> EDI) prices: volatile then a sudden 20% drop (from ~1000 avg to 790)
    const route2 = insertedRoutes.find(r => r.destination_iata === 'EDI');
    if (route2) {
      const prices = [1050, 980, 1020, 990, 1010, 970, 790];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: route2.id,
          lowest_price_found: price,
          currency: route2.currency,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 1),
        });
      });
    }

    // Route 3 (CPH -> JFK) prices: fluctuating around 3200 DKK, target is 3000 (not met)
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
