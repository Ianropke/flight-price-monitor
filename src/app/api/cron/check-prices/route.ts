import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { flightService } from '@/services/flightApi';

// SendGrid / Email notification wrapper placeholder
async function sendEmailAlert(
  route: any,
  currentPrice: number,
  alertType: 'absolute' | 'percentage',
  thresholdValue: number,
  comparisonPrice: number
) {
  const subject = `✈️ Price Alert: Flight drop on ${route.origin} to ${route.destination}!`;
  
  const textContent = `
    Flight Price Monitor Alert!
    
    A price drop was detected for your tracked route:
    Route: ${route.origin} ✈️ ${route.destination}
    Dates: ${route.start_date} to ${route.end_date}
    
    Current Lowest Price: ${currentPrice} ${route.currency}
    
    Trigger: Met ${alertType} threshold!
    - Target: ${thresholdValue} ${alertType === 'absolute' ? route.currency : '%'}
    - Reference Price: ${comparisonPrice.toFixed(2)} ${route.currency}
    
    Check the dashboard to book now!
  `;

  console.log(`[NOTIFICATION SENT] Email Subject: "${subject}"`);
  console.log(`[NOTIFICATION BODY]:\n${textContent}`);

  // Developer Configuration Note:
  // To enable SendGrid, you would uncomment this and add @sendgrid/mail
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: 'user@example.com', // Retrieve from route.user_id if mapped to auth.users
    from: 'alerts@yourdomain.com',
    subject: subject,
    text: textContent,
  };
  await sgMail.send(msg);
  */
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('Authorization');

    // Secure the cron endpoint
    const expectedSecret = process.env.CRON_SECRET;
    const providedSecret = secret || (authHeader ? authHeader.replace('Bearer ', '') : null);

    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize service role client (bypasses RLS to monitor all users' routes)
    const supabase = createServiceRoleClient();

    // Fetch all tracked routes
    const { data: routes, error: routesError } = await supabase
      .from('tracked_routes')
      .select('*');

    if (routesError) {
      return NextResponse.json({ error: routesError.message }, { status: 500 });
    }

    if (!routes || routes.length === 0) {
      return NextResponse.json({ message: 'No routes currently tracked' });
    }

    const results = [];

    // Iterate through all active routes and update prices
    for (const route of routes) {
      const routeLabel = `${route.origin} -> ${route.destination} (${route.start_date})`;
      console.log(`Processing route price update: ${routeLabel}...`);

      try {
        // Fetch current lowest price from Amadeus API
        const priceResult = await flightService.fetchLowestPrice({
          origin: route.origin,
          destination: route.destination,
          departureDate: route.start_date,
          returnDate: route.end_date,
          currency: route.currency,
        });

        const currentPrice = priceResult.lowestPrice;

        // Insert new price into history
        const { error: historyError } = await supabase
          .from('price_history')
          .insert({
            route_id: route.id,
            lowest_price: currentPrice,
            raw_response: priceResult.rawPayload
          });

        if (historyError) {
          console.error(`Error saving price history for ${routeLabel}:`, historyError.message);
          results.push({ routeId: route.id, routeLabel, status: 'error', error: `DB Error: ${historyError.message}` });
          continue;
        }

        let alertTriggered = false;
        let alertDetails = {};

        // 1. Evaluate Absolute Threshold
        if (route.target_price && currentPrice <= parseFloat(route.target_price)) {
          alertTriggered = true;
          alertDetails = { type: 'absolute', target: parseFloat(route.target_price) };
          await sendEmailAlert(
            route,
            currentPrice,
            'absolute',
            parseFloat(route.target_price),
            parseFloat(route.target_price)
          );
        }

        // 2. Evaluate Percentage Drop from 30-day Average
        if (route.drop_percentage && !alertTriggered) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          // Get price history for past 30 days (excluding the one we just inserted to prevent bias)
          const { data: pastHistory } = await supabase
            .from('price_history')
            .select('lowest_price')
            .eq('route_id', route.id)
            .gte('fetch_date', thirtyDaysAgo.toISOString())
            .order('fetch_date', { ascending: false });

          // Exclude the first index if it's the one we just inserted
          const historicalPrices = pastHistory
            ?.map(h => parseFloat(h.lowest_price as any))
            .filter((_, idx) => idx > 0) || [];

          if (historicalPrices.length > 0) {
            const sum = historicalPrices.reduce((total, p) => total + p, 0);
            const average30Day = sum / historicalPrices.length;
            const thresholdPercentage = parseFloat(route.drop_percentage);
            const targetDropPrice = average30Day * (1 - thresholdPercentage / 100);

            if (currentPrice <= targetDropPrice) {
              alertTriggered = true;
              alertDetails = { type: 'percentage', target: thresholdPercentage, average30Day };
              await sendEmailAlert(
                route,
                currentPrice,
                'percentage',
                thresholdPercentage,
                average30Day
              );
            }
          }
        }

        results.push({
          routeId: route.id,
          routeLabel,
          status: 'success',
          price: currentPrice,
          alertTriggered,
          alertDetails
        });

      } catch (err: any) {
        console.error(`Failed to process price check for ${routeLabel}:`, err.message);
        results.push({
          routeId: route.id,
          routeLabel,
          status: 'error',
          error: err.message || 'API error'
        });
      }
    }

    return NextResponse.json({
      processedCount: routes.length,
      results
    });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
