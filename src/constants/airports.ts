export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const POPULAR_AIRPORTS: Airport[] = [
  // Denmark
  { code: 'CPH', name: 'Københavns Lufthavn', city: 'København', country: 'Danmark' },
  { code: 'BLL', name: 'Billund Lufthavn', city: 'Billund', country: 'Danmark' },
  { code: 'AAR', name: 'Aarhus Lufthavn', city: 'Aarhus', country: 'Danmark' },
  { code: 'AAL', name: 'Aalborg Lufthavn', city: 'Aalborg', country: 'Danmark' },
  
  // Italy
  { code: 'FLR', name: 'Peretola Airport', city: 'Firenze', country: 'Italien' },
  { code: 'FCO', name: 'Fiumicino Airport', city: 'Rom', country: 'Italien' },
  { code: 'CIA', name: 'Ciampino Airport', city: 'Rom', country: 'Italien' },
  { code: 'PSA', name: 'Galileo Galilei Airport', city: 'Pisa', country: 'Italien' },
  { code: 'VCE', name: 'Marco Polo Airport', city: 'Venedig', country: 'Italien' },
  { code: 'NAP', name: 'Capodichino Airport', city: 'Napoli', country: 'Italien' },
  { code: 'MXP', name: 'Malpensa Airport', city: 'Milano', country: 'Italien' },
  { code: 'LIN', name: 'Linate Airport', city: 'Milano', country: 'Italien' },
  { code: 'BGY', name: 'Orio al Serio Airport', city: 'Milano / Bergamo', country: 'Italien' },
  { code: 'BLQ', name: 'Guglielmo Marconi Airport', city: 'Bologna', country: 'Italien' },
  { code: 'CTA', name: 'Fontanarossa Airport', city: 'Catania', country: 'Italien' },
  { code: 'PMO', name: 'Falcone-Borsellino Airport', city: 'Palermo', country: 'Italien' },
  { code: 'TRN', name: 'Turin Airport', city: 'Torino', country: 'Italien' },
  { code: 'VRN', name: 'Valerio Catullo Airport', city: 'Verona', country: 'Italien' },

  // Portugal
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lissabon', country: 'Portugal' },
  { code: 'OPO', name: 'Francisco Sá Carneiro Lufthavn', city: 'Porto', country: 'Portugal' },
  { code: 'FAO', name: 'Faro Airport', city: 'Faro / Algarve', country: 'Portugal' },
  { code: 'FNC', name: 'Madeira Airport', city: 'Funchal / Madeira', country: 'Portugal' },

  // Spain
  { code: 'BCN', name: 'El Prat Airport', city: 'Barcelona', country: 'Spanien' },
  { code: 'MAD', name: 'Adolfo Suárez Barajas Airport', city: 'Madrid', country: 'Spanien' },
  { code: 'AGP', name: 'Málaga Airport', city: 'Málaga', country: 'Spanien' },
  { code: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma de Mallorca', country: 'Spanien' },
  { code: 'ALC', name: 'Alicante-Elche Airport', city: 'Alicante', country: 'Spanien' },
  { code: 'LPA', name: 'Gran Canaria Airport', city: 'Las Palmas / Gran Canaria', country: 'Spanien' },
  { code: 'TFS', name: 'Tenerife South Airport', city: 'Tenerife', country: 'Spanien' },
  { code: 'ACE', name: 'Lanzarote Airport', city: 'Lanzarote', country: 'Spanien' },
  { code: 'IBZ', name: 'Ibiza Airport', city: 'Ibiza', country: 'Spanien' },
  { code: 'VLC', name: 'Valencia Airport', city: 'Valencia', country: 'Spanien' },
  { code: 'BIO', name: 'Bilbao Airport', city: 'Bilbao', country: 'Spanien' },
  { code: 'SVQ', name: 'Seville Airport', city: 'Sevilla', country: 'Spanien' },

  // France
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'Frankrig' },
  { code: 'ORY', name: 'Orly Airport', city: 'Paris', country: 'Frankrig' },
  { code: 'NCE', name: 'Côte d\'Azur Airport', city: 'Nice', country: 'Frankrig' },
  { code: 'LYS', name: 'Saint Exupéry Airport', city: 'Lyon', country: 'Frankrig' },
  { code: 'MRS', name: 'Marseille Provence Airport', city: 'Marseille', country: 'Frankrig' },
  { code: 'BOD', name: 'Bordeaux-Mérignac Airport', city: 'Bordeaux', country: 'Frankrig' },

  // Greece
  { code: 'ATH', name: 'Eleftherios Venizelos Airport', city: 'Athen', country: 'Grækenland' },
  { code: 'HER', name: 'Heraklion Airport', city: 'Kreta', country: 'Grækenland' },
  { code: 'CHQ', name: 'Chania Airport', city: 'Kreta / Chania', country: 'Grækenland' },
  { code: 'RHO', name: 'Diagoras Airport', city: 'Rhodos', country: 'Grækenland' },
  { code: 'CFU', name: 'Ioannis Kapodistrias Airport', city: 'Korfu', country: 'Grækenland' },
  { code: 'JTR', name: 'Santorini Airport', city: 'Santorini', country: 'Grækenland' },
  { code: 'JMK', name: 'Mykonos Airport', city: 'Mykonos', country: 'Grækenland' },

  // UK & Ireland
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'Storbritannien' },
  { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'Storbritannien' },
  { code: 'STN', name: 'Stansted Airport', city: 'London', country: 'Storbritannien' },
  { code: 'LTN', name: 'Luton Airport', city: 'London', country: 'Storbritannien' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'Storbritannien' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'Skotland' },
  { code: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'Storbritannien' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Irland' },

  // Germany, Austria & Switzerland
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Tyskland' },
  { code: 'MUC', name: 'Munich Airport', city: 'München', country: 'Tyskland' },
  { code: 'BER', name: 'Brandenburg Airport', city: 'Berlin', country: 'Tyskland' },
  { code: 'HAM', name: 'Hamburg Airport', city: 'Hamburg', country: 'Tyskland' },
  { code: 'DUS', name: 'Düsseldorf Airport', city: 'Düsseldorf', country: 'Tyskland' },
  { code: 'VIE', name: 'Vienna International Airport', city: 'Wien', country: 'Østrig' },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zürich', country: 'Schweiz' },
  { code: 'GVA', name: 'Geneva Airport', city: 'Genève', country: 'Schweiz' },

  // Other Europe
  { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Holland' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Bruxelles', country: 'Belgien' },
  { code: 'PRG', name: 'Václav Havel Airport', city: 'Prag', country: 'Tjekkiet' },
  { code: 'BUD', name: 'Liszt Ferenc Airport', city: 'Budapest', country: 'Ungarn' },
  { code: 'WAW', name: 'Chopin Airport', city: 'Warszawa', country: 'Polen' },
  { code: 'ARN', name: 'Arlanda Airport', city: 'Stockholm', country: 'Sverige' },
  { code: 'OSL', name: 'Gardermoen Airport', city: 'Oslo', country: 'Norge' },
  { code: 'HEL', name: 'Helsinki-Vantaa Airport', city: 'Helsinki', country: 'Finland' },
  { code: 'KEF', name: 'Keflavík International Airport', city: 'Reykjavík', country: 'Island' },

  // Turkey & Middle East
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Tyrkiet' },
  { code: 'AYT', name: 'Antalya Airport', city: 'Antalya', country: 'Tyrkiet' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'Forenede Arabiske Emirater' },

  // Asia & Oceania
  { code: 'BOM', name: 'Chhatrapati Shivaji International Airport', city: 'Mumbai', country: 'Indien' },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'Indien' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  { code: 'HKT', name: 'Phuket Airport', city: 'Phuket', country: 'Thailand' },
  { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Kina' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'NRT', name: 'Narita Airport', city: 'Tokyo', country: 'Japan' },
  { code: 'DPS', name: 'Ngurah Rai Airport', city: 'Bali', country: 'Indonesien' },
  { code: 'SYD', name: 'Kingsford Smith Airport', city: 'Sydney', country: 'Australien' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australien' },

  // North America
  { code: 'JFK', name: 'John F. Kennedy Intl Airport', city: 'New York', country: 'USA' },
  { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark / New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA' },
  { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA' },
  { code: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'USA' },
  { code: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas', country: 'USA' },
  { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'USA' },
  { code: 'YYZ', name: 'Pearson International Airport', city: 'Toronto', country: 'Canada' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
  { code: 'CUN', name: 'Cancún International Airport', city: 'Cancún', country: 'Mexico' }
];
