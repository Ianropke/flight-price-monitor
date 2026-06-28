import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase';
import { flightService } from '@/services/serpApi';

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
          lowest_price_found,
          currency,
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
    const { 
      origin_iata, 
      destination_iata, 
      departure_date, 
      return_date, 
      target_price_threshold, 
      drop_percentage_threshold, 
      trip_duration,
      currency = 'DKK' 
    } = body;

    // Validation
    if (!origin_iata || origin_iata.length !== 3) {
      return NextResponse.json({ error: 'Afrejse skal være en 3-bogstavs IATA-kode (f.eks. CPH)' }, { status: 400 });
    }
    if (!destination_iata || destination_iata.length !== 3) {
      return NextResponse.json({ error: 'Destination skal være en 3-bogstavs IATA-kode (f.eks. OPO)' }, { status: 400 });
    }
    if (!departure_date || !return_date) {
      return NextResponse.json({ error: 'Afrejse- og hjemrejsedato er påkrævet' }, { status: 400 });
    }
    if (new Date(departure_date) > new Date(return_date)) {
      return NextResponse.json({ error: 'Afrejsedato skal være før eller lig med hjemrejsedato' }, { status: 400 });
    }

    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Insert tracked route
    const { data: route, error: insertError } = await supabase
      .from('tracked_routes')
      .insert({
        user_id: user?.id || null, // fallback to guest if not authenticated
        origin_iata: origin_iata.toUpperCase(),
        destination_iata: destination_iata.toUpperCase(),
        departure_date,
        return_date,
        target_price_threshold: target_price_threshold ? parseFloat(target_price_threshold) : null,
        drop_percentage_threshold: drop_percentage_threshold ? parseFloat(drop_percentage_threshold) : null,
        trip_duration: trip_duration ? parseInt(trip_duration) : null,
        currency: currency.toUpperCase(),
        status: 'active'
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
        origin: route.origin_iata,
        destination: route.destination_iata,
        departureDate: route.departure_date,
        returnDate: route.return_date,
        currency: route.currency,
        tripDuration: route.trip_duration
      });

      initialPrice = priceResult.lowestPrice;

      // Save initial price history entry
      await supabase
        .from('price_history')
        .insert({
          route_id: route.id,
          lowest_price_found: initialPrice,
          currency: route.currency,
          raw_response: priceResult.rawPayload
        });
    } catch (apiError: any) {
      console.warn(`Could not fetch initial price for route ${route.id}:`, apiError.message);
      // Return the successfully created route even if initial fetch failed
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
          lowest_price_found,
          currency,
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
    }, { status: 201 });
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

    // Check if route is already inactive
    if (route.status === 'inactive') {
      return NextResponse.json({ error: 'Ruten er inaktiv (afrejsedato er overskredet)' }, { status: 400 });
    }

    // Fetch the latest price from SerpApi
    const priceResult = await flightService.fetchLowestPrice({
      origin: route.origin_iata,
      destination: route.destination_iata,
      departureDate: route.departure_date,
      returnDate: route.return_date,
      currency: route.currency,
      tripDuration: route.trip_duration
    });

    // Save the new price to history
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        route_id: route.id,
        lowest_price_found: priceResult.lowestPrice,
        currency: route.currency,
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
          lowest_price_found,
          currency,
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
