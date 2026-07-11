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
      route_type = 'specific',
      origin_iata, 
      destination_iata,
      explore_regions,
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
    if (route_type === 'specific' && (!destination_iata || destination_iata.length !== 3)) {
      return NextResponse.json({ error: 'Destination skal være en 3-bogstavs IATA-kode (f.eks. OPO)' }, { status: 400 });
    }
    if (route_type === 'explore' && (!explore_regions || explore_regions.length === 0)) {
      return NextResponse.json({ error: 'Explore mode kræver mindst én region' }, { status: 400 });
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
        route_type,
        origin_iata: origin_iata.toUpperCase(),
        destination_iata: destination_iata ? destination_iata.toUpperCase() : null,
        explore_regions: explore_regions || null,
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
    try {
      let priceResult;
      
      if (route.route_type === 'explore' && route.explore_regions && route.explore_regions.length > 0) {
        // Just search the first region for the initial synchronous fetch to show something
        const regionMap: Record<string, string> = {
          'Europe': '/m/02j9z',
          'Asia': '/m/0166m',
          'North America': '/m/054sv',
          'South America': '/m/06v8s'
        };
        const regionId = regionMap[route.explore_regions[0]] || '/m/02j9z';

        priceResult = await flightService.fetchExploreDeals({
          origin: route.origin_iata,
          exploreRegionId: regionId,
          departureDate: route.departure_date,
          returnDate: route.return_date,
          currency: route.currency,
          tripDuration: route.trip_duration
        });
      } else {
        priceResult = await flightService.fetchLowestPrice({
          origin: route.origin_iata,
          destination: route.destination_iata!,
          departureDate: route.departure_date,
          returnDate: route.return_date,
          currency: route.currency,
          tripDuration: route.trip_duration
        });
      }

      // Save initial price history entry
      await supabase
        .from('price_history')
        .insert({
          route_id: route.id,
          lowest_price_found: priceResult.lowestPrice,
          currency: route.currency,
          explore_deals: priceResult.exploreDeals || null,
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
    let priceResult;
    if (route.route_type === 'explore' && route.explore_regions && route.explore_regions.length > 0) {
        const regionMap: Record<string, string> = {
          'Europe': '/m/02j9z',
          'Asia': '/m/0166m',
          'North America': '/m/054sv',
          'South America': '/m/06v8s'
        };
        // For simplicity in a synchronous PUT refresh, just refresh the first region
        const regionId = regionMap[route.explore_regions[0]] || '/m/02j9z';

        priceResult = await flightService.fetchExploreDeals({
          origin: route.origin_iata,
          exploreRegionId: regionId,
          departureDate: route.departure_date,
          returnDate: route.return_date,
          currency: route.currency,
          tripDuration: route.trip_duration
        });
    } else {
        priceResult = await flightService.fetchLowestPrice({
          origin: route.origin_iata,
          destination: route.destination_iata!,
          departureDate: route.departure_date,
          returnDate: route.return_date,
          currency: route.currency,
          tripDuration: route.trip_duration
        });
    }

    // Save the new price to history
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        route_id: route.id,
        lowest_price_found: priceResult.lowestPrice,
        currency: route.currency,
        explore_deals: priceResult.exploreDeals || null,
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

// PATCH: Update an existing tracked route's configurations
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { 
      id,
      route_type,
      destination_iata,
      explore_regions,
      departure_date, 
      return_date, 
      target_price_threshold, 
      drop_percentage_threshold, 
      trip_duration,
      currency = 'DKK' 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Route ID is required' }, { status: 400 });
    }
    if (!departure_date || !return_date) {
      return NextResponse.json({ error: 'Afrejse- og hjemrejsedato er påkrævet' }, { status: 400 });
    }
    if (new Date(departure_date) > new Date(return_date)) {
      return NextResponse.json({ error: 'Afrejsedato skal være før eller lig med hjemrejsedato' }, { status: 400 });
    }

    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify ownership/guest access
    const verifyQuery = supabase
      .from('tracked_routes')
      .select('id')
      .eq('id', id);

    if (user) {
      verifyQuery.eq('user_id', user.id);
    } else {
      verifyQuery.is('user_id', null);
    }

    const { data: routeExists, error: verifyError } = await verifyQuery.single();

    if (verifyError || !routeExists) {
      return NextResponse.json({ error: 'Rute ikke fundet eller uautoriseret' }, { status: 404 });
    }

    // Determine status (if they update dates to the future, reset status to active!)
    const todayStr = new Date().toISOString().split('T')[0];
    const newStatus = new Date(departure_date) >= new Date(todayStr) ? 'active' : 'inactive';

    // Update tracked route fields
    const updatePayload: any = {
      departure_date,
      return_date,
      target_price_threshold: target_price_threshold ? parseFloat(target_price_threshold) : null,
      drop_percentage_threshold: drop_percentage_threshold ? parseFloat(drop_percentage_threshold) : null,
      trip_duration: trip_duration ? parseInt(trip_duration) : null,
      currency: currency.toUpperCase(),
      status: newStatus
    };

    if (route_type) updatePayload.route_type = route_type;
    if (destination_iata !== undefined) updatePayload.destination_iata = destination_iata;
    if (explore_regions !== undefined) updatePayload.explore_regions = explore_regions;

    const { data: updatedRoute, error: updateError } = await supabase
      .from('tracked_routes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Trigger price refresh immediately so graph reflects updated date candidate/price point
    try {
      let priceResult;
      
      if (updatedRoute.route_type === 'explore' && updatedRoute.explore_regions && updatedRoute.explore_regions.length > 0) {
        const regionMap: Record<string, string> = {
          'Europe': '/m/02j9z',
          'Asia': '/m/0166m',
          'North America': '/m/054sv',
          'South America': '/m/06v8s'
        };
        const regionId = regionMap[updatedRoute.explore_regions[0]] || '/m/02j9z';

        priceResult = await flightService.fetchExploreDeals({
          origin: updatedRoute.origin_iata,
          exploreRegionId: regionId,
          departureDate: updatedRoute.departure_date,
          returnDate: updatedRoute.return_date,
          currency: updatedRoute.currency,
          tripDuration: updatedRoute.trip_duration
        });
      } else {
        priceResult = await flightService.fetchLowestPrice({
          origin: updatedRoute.origin_iata,
          destination: updatedRoute.destination_iata!,
          departureDate: updatedRoute.departure_date,
          returnDate: updatedRoute.return_date,
          currency: updatedRoute.currency,
          tripDuration: updatedRoute.trip_duration
        });
      }

      // Save initial price history entry for new configuration
      await supabase
        .from('price_history')
        .insert({
          route_id: updatedRoute.id,
          lowest_price_found: priceResult.lowestPrice,
          currency: updatedRoute.currency,
          explore_deals: priceResult.exploreDeals || null,
          raw_response: priceResult.rawPayload
        });
    } catch (apiError: any) {
      console.warn(`Could not refresh initial price on edit for route ${updatedRoute.id}:`, apiError.message);
    }

    // Fetch final updated route with history points
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
      .eq('id', updatedRoute.id)
      .single();

    const sortedHistory = [...(finalRoute.price_history || [])].sort(
      (a, b) => new Date(a.fetch_date).getTime() - new Date(b.fetch_date).getTime()
    );

    return NextResponse.json({
      ...finalRoute,
      price_history: sortedHistory
    });

  } catch (error: any) {
    console.error('Error updating route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
