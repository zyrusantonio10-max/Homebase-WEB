/*
  REAL ROOM DATA – Ariate Dormitory (Naga City, Bicol, Philippines)
  Sourced from the ARI_Dorm_Rooms photo dataset.

  Each room: { id, name, floor, type: "Single" | "Double" | "Triple" | "Quad", price (per person per month, in pesos),
          amenities: [...], available: true | false, image: 'assets/images/rooms/...',
          bedsTaken (optional: beds already taken outside Homebase) }
  Beds: Single 1, Double 2, Triple 3, Quad 4.

  Amenities are based on what is visible in each room's photo.
  Floors are best-guess based on room numbers (the photos carry no floor info).
  Prices are placeholder estimates per person per month. The landlord can edit them.
*/
/*
  Room-level amenities: features that can differ from one room to the next
  inside the same building. The landlord picks these per room in the Add/Edit form.
*/
window.HOMEBASE_AMENITIES = [
  'Wi-Fi',
  'Air conditioning',
  'Electric fan',
  'Study desk',
  'Lockable wardrobe',
  'Private bathroom',
  'Water heater (hot shower)',
  'Bedside power outlet',
  'Mini refrigerator',
  'Kitchenette',
  'Balcony / Window view',
  'TV'
];

window.HOMEBASE_ROOMS = [
  // ── Floor 1 ──
  { id: '01',  name: 'Room 01',  floor: 1, type: 'Double', price: 3500, amenities: ['Air conditioning'],                                                      available: true, image: 'assets/images/rooms/room-01.jpg' },
  { id: '1',   name: 'Room 1',   floor: 1, type: 'Double', price: 5500, amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Study desk', 'Private bathroom'],       available: true, image: 'assets/images/rooms/room-1.png' },
  { id: '02',  name: 'Room 02',  floor: 1, type: 'Single', price: 4500, amenities: ['Electric fan', 'Study desk', 'Lockable wardrobe'],                        available: true, image: 'assets/images/rooms/room-02.jpg' },
  { id: '03',  name: 'Room 03',  floor: 1, type: 'Double', price: 3500, amenities: ['Air conditioning', 'Lockable wardrobe'],                                  available: true, image: 'assets/images/rooms/room-03.jpg' },
  { id: '04',  name: 'Room 04',  floor: 1, type: 'Double', price: 3000, amenities: ['Electric fan', 'Study desk', 'Lockable wardrobe'],                        available: true, image: 'assets/images/rooms/room-04.jpg' },
  { id: '05',  name: 'Room 05',  floor: 1, type: 'Double', price: 3500, amenities: ['Air conditioning', 'Study desk'],                                        available: true, image: 'assets/images/rooms/room-05.jpg' },
  { id: '06',  name: 'Room 06',  floor: 1, type: 'Triple', price: 2800, amenities: [],                                                                        available: true, image: 'assets/images/rooms/room-06.jpg' },
  { id: '07',  name: 'Room 07',  floor: 1, type: 'Double', price: 3200, amenities: ['Study desk', 'Lockable wardrobe'],                                       available: true, image: 'assets/images/rooms/room-07.jpg' },
  { id: '08',  name: 'Room 08',  floor: 1, type: 'Triple', price: 3000, amenities: ['Electric fan', 'TV', 'Study desk'],                                      available: true, image: 'assets/images/rooms/room-08.jpg' },
  { id: '009', name: 'Room 009', floor: 1, type: 'Triple', price: 2800, amenities: ['Electric fan', 'Study desk'],                                            available: true, image: 'assets/images/rooms/room-009.webp' },

  // ── Floor 2 ──
  { id: '10',  name: 'Room 10',  floor: 2, type: 'Double', price: 3200, amenities: ['Study desk', 'Lockable wardrobe'],                                       available: true, image: 'assets/images/rooms/room-10.jpg' },
  { id: '11',  name: 'Room 11',  floor: 2, type: 'Quad',   price: 2500, amenities: ['Air conditioning', 'Lockable wardrobe'],                                 available: true, image: 'assets/images/rooms/room-11.jpg' },
  { id: '13',  name: 'Room 13',  floor: 2, type: 'Single', price: 5000, amenities: ['Study desk', 'Lockable wardrobe'],                                       available: true, image: 'assets/images/rooms/room-13.jpg' },

  // ── Floor 3 ──
  { id: '114', name: 'Room 114', floor: 3, type: 'Double', price: 3200, amenities: ['Study desk'],                                                            available: true, image: 'assets/images/rooms/room-114.webp' }
];
