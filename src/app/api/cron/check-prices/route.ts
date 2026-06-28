import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { flightService } from '@/services/serpApi';

// Email alert log mock
async function sendEmailAlert(
  route: any,
  currentPrice: number,
  alertType: 'absolute' | 'percentage',
  thresholdValue: number,
  comparisonPrice: number
) {
  const subject = `✈️ Prisfalds-alarm: Flypris faldet på ${route.origin_iata} til ${route.destination_iata}!`;
  
  const textContent = `
    Alarm fra Flypris-Monitor!
    
    Et prisfald er registreret på din overvågede rute:
    Rute: ${route.origin_iata} ✈️ ${route.destination_iata}
    Datoer: ${route.departure_date} til ${route.return_date}
    
    Aktuel laveste pris fundet: ${currentPrice} ${route.currency}
    
    Udløser: Mødte ${alertType === 'absolute' ? 'målpris' : 'procentvis fald'} grænseværdien!
    - Grænse: ${thresholdValue} ${alertType === 'absolute' ? route.currency : '%'}
    - Referencepris: ${comparisonPrice.toFixed(2)} ${route.currency}
    
    Besøg dit dashboard for at bestille rejsen nu!
  `;

  console.log(`[ALARM SENDT] Emne: "${subject}"`);
  console.log(`[ALARM INDHOLD]:\n${textContent}`);
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

    const supabase = createServiceRoleClient();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Deaktiver automatisk ruter hvor afrejsedatoen er overskredet (departure_date < i dag)
    const { error: deactivateError } = await supabase
      .from('tracked_routes')
      .update({ status: 'inactive' })
      .lt('departure_date', todayStr)
      .eq('status', 'active');

    if (deactivateError) {
      console.error('Error auto-deactivating expired routes:', deactivateError.message);
    }

    // 2. Hent alle aktive ruter (status = active og departure_date >= i dag)
    const { data: routes, error: routesError } = await supabase
      .from('tracked_routes')
      .select('*')
      .eq('status', 'active')
      .gte('departure_date', todayStr);

    if (routesError) {
      return NextResponse.json({ error: routesError.message }, { status: 500 });
    }

    if (!routes || routes.length === 0) {
      return NextResponse.json({ message: 'Ingen aktive ruter at overvåge i øjeblikket' });
    }

    const results = [];

    // 3. Kør prisovervågning for hver rute
    for (const route of routes) {
      const routeLabel = `${route.origin_iata} -> ${route.destination_iata} (${route.departure_date})`;
      console.log(`Prisskraber: Tjekker priser for ${routeLabel}...`);

      try {
        // Hent den seneste flypris
        const priceResult = await flightService.fetchLowestPrice({
          origin: route.origin_iata,
          destination: route.destination_iata,
          departureDate: route.departure_date,
          returnDate: route.return_date,
          currency: route.currency,
          tripDuration: route.trip_duration
        });

        const currentPrice = priceResult.lowestPrice;

        // Gem prishistorik
        const { error: historyError } = await supabase
          .from('price_history')
          .insert({
            route_id: route.id,
            lowest_price_found: currentPrice,
            currency: route.currency,
            raw_response: priceResult.rawPayload
          });

        if (historyError) {
          console.error(`Databasefejl ved gemning af historik for ${routeLabel}:`, historyError.message);
          results.push({ routeId: route.id, routeLabel, status: 'error', error: `DB-fejl: ${historyError.message}` });
          continue;
        }

        let alertTriggered = false;
        let alertDetails = {};

        // A. Evaluer absolut målpris tærskel
        if (route.target_price_threshold && currentPrice <= parseFloat(route.target_price_threshold)) {
          alertTriggered = true;
          alertDetails = { type: 'absolute', target: parseFloat(route.target_price_threshold) };
          await sendEmailAlert(
            route,
            currentPrice,
            'absolute',
            parseFloat(route.target_price_threshold),
            parseFloat(route.target_price_threshold)
          );
        }

        // B. Evaluer procentvis fald i forhold til de sidste 7 dages gennemsnit
        if (route.drop_percentage_threshold && !alertTriggered) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          // Hent prishistorik for de sidste 7 dage (undtagen den netop indsatte)
          const { data: pastHistory } = await supabase
            .from('price_history')
            .select('lowest_price_found')
            .eq('route_id', route.id)
            .gte('fetch_date', sevenDaysAgo.toISOString())
            .order('fetch_date', { ascending: false });

          // Filtrer det senest indsatte element fra
          const historicalPrices = pastHistory
            ?.map(h => parseFloat(h.lowest_price_found as any))
            .filter((_, idx) => idx > 0) || [];

          if (historicalPrices.length > 0) {
            const sum = historicalPrices.reduce((total, p) => total + p, 0);
            const average7Day = sum / historicalPrices.length;
            const thresholdPercentage = parseFloat(route.drop_percentage_threshold);
            const targetDropPrice = average7Day * (1 - thresholdPercentage / 100);

            if (currentPrice <= targetDropPrice) {
              alertTriggered = true;
              alertDetails = { type: 'percentage', target: thresholdPercentage, average7Day };
              await sendEmailAlert(
                route,
                currentPrice,
                'percentage',
                thresholdPercentage,
                average7Day
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
        console.error(`Fejl ved kørsel af pristjek for ${routeLabel}:`, err.message);
        results.push({
          routeId: route.id,
          routeLabel,
          status: 'error',
          error: err.message || 'Scraper API error'
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
