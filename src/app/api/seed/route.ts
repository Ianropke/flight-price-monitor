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
    // Price history will cascade delete because of the foreign key constraint
    await supabase.from('tracked_routes').delete().is('user_id', null);

    // 2. Insert mock routes
    const routesData = [
      {
        origin: 'CPH',
        destination: 'JFK',
        start_date: '2026-09-10',
        end_date: '2026-09-24',
        target_price: 3000,
        drop_percentage: null,
        currency: 'DKK',
      },
      {
        origin: 'LHR',
        destination: 'HND',
        start_date: '2026-10-05',
        end_date: '2026-10-19',
        target_price: null,
        drop_percentage: 15,
        currency: 'DKK',
      },
      {
        origin: 'CPH',
        destination: 'BCN',
        start_date: '2026-08-01',
        end_date: '2026-08-08',
        target_price: 800,
        drop_percentage: 10,
        currency: 'DKK',
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
    const historyData: { route_id: string; lowest_price: number; fetch_date: string }[] = [];

    // Helper to generate ISO strings at offsets
    const getPastDateString = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(now.getDate() - daysAgo);
      return d.toISOString();
    };

    // Route 1 (CPH -> JFK) prices: descending down to target threshold of 3000 (final is 2950)
    const route1 = insertedRoutes.find(r => r.destination === 'JFK');
    if (route1) {
      const prices = [3500, 3420, 3350, 3190, 3250, 3100, 2950];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: route1.id,
          lowest_price: price,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 4), // spaced over ~24 days
        });
      });
    }

    // Route 2 (LHR -> HND) prices: volatile then a sudden 20% drop (from ~7200 avg to 5800)
    const route2 = insertedRoutes.find(r => r.destination === 'HND');
    if (route2) {
      const prices = [7300, 7150, 7250, 7200, 7350, 7180, 5800];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: route2.id,
          lowest_price: price,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 4),
        });
      });
    }

    // Route 3 (CPH -> BCN) prices: fluctuating around 1000 DKK, target is 800 (not met)
    const route3 = insertedRoutes.find(r => r.destination === 'BCN');
    if (route3) {
      const prices = [1150, 1120, 1080, 1190, 1100, 1050, 1070];
      prices.forEach((price, idx) => {
        historyData.push({
          route_id: route3.id,
          lowest_price: price,
          fetch_date: getPastDateString((prices.length - 1 - idx) * 4),
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
      message: 'Database seeded successfully with routes and price histories.',
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
