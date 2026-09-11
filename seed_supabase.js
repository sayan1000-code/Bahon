import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('Loading Excel file...');
  const workbook = xlsx.readFile('Bus tracker.xlsx');
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Processing Sheet: ${sheetName} ---`);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
    
    let currentRouteId = null;
    let currentRouteName = null;
    let stopSequence = 1;

    for (const row of data) {
      if (row['BUS NAME']) {
        currentRouteName = String(row['BUS NAME']).trim();
        stopSequence = 1;
        
        let duration = 90;
        const durStr = String(row['Full Route Duration (Avg Traffic)'] || '');
        const match = durStr.match(/(\d+)/);
        if (match) duration = parseInt(match[1], 10);

        console.log(`Creating Route: ${currentRouteName}`);

        const { data: routeData, error: routeError } = await supabase
          .from('routes')
          .insert({ 
            route_name: currentRouteName,
            route_series: sheetName,
            total_duration_mins: duration
          })
          .select('id')
          .single();

        if (routeError) {
          console.error(`Failed to insert route ${currentRouteName}:`, routeError.message);
          continue; 
        }
        
        currentRouteId = routeData.id;

        const busesNeeded = 6; 
        for (let i = 0; i < busesNeeded; i++) {
          const { data: busData, error: busError } = await supabase
            .from('buses')
            .insert({
              route_id: currentRouteId,
              bus_identifier: `${currentRouteName}-0${i + 1}`
            })
            .select('id')
            .single();

          if (!busError && busData) {
            const totalMinutes = (6 * 60) + (i * 30); 
            const hr = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const min = String(totalMinutes % 60).padStart(2, '0');

            await supabase.from('trips').insert({
              bus_id: busData.id,
              route_id: currentRouteId,
              departure_time: `${hr}:${min}:00`,
              direction: 'outbound'
            });
          }
        }
      }

      if (currentRouteId && row['Stoppage Name'] && row['Latitude'] && row['Longitude']) {
        await supabase.from('route_stops').insert({
          route_id: currentRouteId,
          stop_sequence: stopSequence++,
          stoppage_name: row['Stoppage Name'],
          latitude: row['Latitude'],
          longitude: row['Longitude'],
          time_from_start_mins: 0
        });
      }
    }
  }
  console.log('\nDatabase seeding complete!');
}

seedDatabase();