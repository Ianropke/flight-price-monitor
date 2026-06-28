import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase';
import { flightService } from '@/services/flightApi';

// GET: Retrieve all tracked routes (with their price history)
export async function GET() {
  try {
    const supabase = await createServerSideClient();
    
    // Get user session if active
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch routes matching user_id (or user_id IS NULL for guests)
    const query = supabase
      .from('tracked_routes')
      .select(`
        *,
        price_history (
          id,
          route_id,
          fetch_date,
          lowest_price,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (user) {
      query.eq('user_id', user.id);
    } else {
      query.is('user_id', null);
    }

    const { data: routes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort price history for each route by fetch_date ascending (for charts)
    const formattedRoutes = routes?.map(route => {
      const sortedHistory = [...(route.price_history || [])].sort(
        (a, b) => new Date(a.fetch_date).getTime() - new Date(b.fetch_date).getTime()
      );
      return {
        ...route,
        price_history: sortedHistory
      };
    });

    return NextResponse.json(formattedRoutes || []);
  } catch (error: any) {
    console.error('Error fetching routes:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add a new tracked route and fetch its initial price
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { origin, destination, start_date, end_date, target_price, drop_percentage, currency = 'DKK' } = body;

    // Validation
    if (!origin || origin.length !== 3) {
      return NextResponse.json({ error: 'Origin must be a 3-letter IATA code' }, { status: 400 });
    }
    if (!destination || destination.length !== 3) {
      return NextResponse.json({ error: 'Destination must be a 3-letter IATA code' }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start date and End date are required' }, { status: 400 });
    }
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json({ error: 'Start date must be before or equal to End date' }, { status: 400 });
    }

    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Insert tracked route
    const { data: route, error: insertError } = await supabase
      .from('tracked_routes')
      .insert({
        user_id: user?.id || null, // fallback to guest if not authenticated
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        start_date,
        end_date,
        target_price: target_price ? parseFloat(target_price) : null,
        drop_percentage: drop_percentage ? parseFloat(drop_percentage) : null,
        currency: currency.toUpperCase()
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Proactively fetch initial price synchronously so dashboard has instant feedback
    let initialPrice: number | null = null;
    try {
      const priceResult = await flightService.fetchLowestPrice({
        origin: route.origin,
        destination: route.destination,
        departureDate: route.start_date,
        returnDate: route.end_date, // if roundtrip, search handles return date
        currency: route.currency
      });

      initialPrice = priceResult.lowestPrice;

      // Save initial price history entry
      await supabase
        .from('price_history')
        .insert({
          route_id: route.id,
          lowest_price: initialPrice,
          raw_response: priceResult.rawPayload
        });
    } catch (apiError: any) {
      console.warn(`Could not fetch initial price for route ${route.id}:`, apiError.message);
      // We still return the successfully created route, even if Amadeus failed at this moment
    }

    // Refetch the route with its new history to return complete object
    const { data: finalRoute } = await supabase
      .from('tracked_routes')
      .select(`
        *,
        price_history (
          id,
          route_id,
          fetch_date,
          lowest_price,
          created_at
        )
      `)
      .eq('id', route.id)
      .single();

    return NextResponse.json(finalRoute, { status: 201 });
  } catch (error: any) {
    console.error('Error creating route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Stop tracking a specific route
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Route ID is required' }, { status: 400 });
    }

    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    const query = supabase
      .from('tracked_routes')
      .delete()
      .eq('id', id);

    // Secure deletions for authenticated accounts
    if (user) {
      query.eq('user_id', user.id);
    } else {
      query.is('user_id', null);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Securely trigger a live price refresh for a single route on the server
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Route ID is required' }, { status: 400 });
    }

    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the route details to verify access and parameters
    const query = supabase
      .from('tracked_routes')
      .select('*')
      .eq('id', id);

    if (user) {
      query.eq('user_id', user.id);
    } else {
      query.is('user_id', null);
    }

    const { data: route, error: fetchError } = await query.single();

    if (fetchError || !route) {
      return NextResponse.json({ error: 'Route not found or unauthorized' }, { status: 404 });
    }

    // Fetch the latest price from Amadeus API
    const priceResult = await flightService.fetchLowestPrice({
      origin: route.origin,
      destination: route.destination,
      departureDate: route.start_date,
      returnDate: route.end_date,
      currency: route.currency
    });

    // Save the new price to history
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        route_id: route.id,
        lowest_price: priceResult.lowestPrice,
        raw_response: priceResult.rawPayload
      });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // Return the updated route with full price history
    const { data: finalRoute } = await supabase
      .from('tracked_routes')
      .select(`
        *,
        price_history (
          id,
          route_id,
          fetch_date,
          lowest_price,
          created_at
        )
      `)
      .eq('id', route.id)
      .single();

    const sortedHistory = [...(finalRoute.price_history || [])].sort(
      (a, b) => new Date(a.fetch_date).getTime() - new Date(b.fetch_date).getTime()
    );

    return NextResponse.json({
      ...finalRoute,
      price_history: sortedHistory
    });

  } catch (error: any) {
    console.error('Error refreshing route price:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

