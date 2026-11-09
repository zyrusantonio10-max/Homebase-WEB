/*
  SAMPLE DATA. These rooms, prices and availability are placeholders, not the real Ariate Dormitory list.
  Later (PHP + MySQL phase): the room list comes from the database instead, in the same shape as below.

  Each room: { id, name, floor, type: "Single" | "Double" | "Quad", price (per person per month, in pesos), amenities: [...], available: true | false,
          bedsTaken (optional: beds already taken outside Homebase) }
  Beds: Single 1, Double 2, Quad 4. Students can keep requesting a shared room until its last bed is taken.

  This file is only the STARTING list. When the landlord adds, edits or removes a room, the real list is kept in the browser
  (see HB.getRooms in reservation.js) and this file is not used for rooms any more. It still holds the amenity choices below.

  Pictures: every room is drawn automatically from its type and amenities (an illustration, not a photo).
  To use a real photo instead, put it in assets/images/ and add  image: 'assets/images/room-101.jpg'  to that room.
*/
/*
  Room‑level amenities: features that can differ from one room to the next
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
  'Balcony / Window view'
];

window.HOMEBASE_ROOMS = [
  { id: '101', name: 'Room 101', floor: 1, type: 'Quad',   price: 3200, amenities: ['Wi-Fi', 'Electric fan'], available: true },
  { id: '102', name: 'Room 102', floor: 1, type: 'Quad',   price: 3200, amenities: ['Wi-Fi', 'Study desk', 'Electric fan'], available: false },
  { id: '103', name: 'Room 103', floor: 1, type: 'Double', price: 4800, amenities: ['Wi-Fi', 'Study desk', 'Air conditioning', 'Lockable wardrobe'], available: true },
  { id: '104', name: 'Room 104', floor: 1, type: 'Double', price: 4800, amenities: ['Wi-Fi', 'Air conditioning', 'Bedside power outlet'], available: true },
  { id: '105', name: 'Room 105', floor: 1, type: 'Single', price: 6800, amenities: ['Wi-Fi', 'Study desk', 'Air conditioning', 'Private bathroom', 'Lockable wardrobe'], available: false },
  { id: '201', name: 'Room 201', floor: 2, type: 'Quad',   price: 3400, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk'], available: true },
  { id: '202', name: 'Room 202', floor: 2, type: 'Double', price: 5200, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Lockable wardrobe', 'Bedside power outlet'], available: true },
  { id: '203', name: 'Room 203', floor: 2, type: 'Double', price: 5500, amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom', 'Water heater (hot shower)'], available: true },
  { id: '204', name: 'Room 204', floor: 2, type: 'Single', price: 7200, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom', 'Lockable wardrobe'], available: true },
  { id: '301', name: 'Room 301', floor: 3, type: 'Quad',   price: 3600, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Kitchenette'], available: true },
  { id: '302', name: 'Room 302', floor: 3, type: 'Single', price: 8200, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom', 'Kitchenette', 'Mini refrigerator', 'Balcony / Window view'], available: true },
  { id: '303', name: 'Room 303', floor: 3, type: 'Double', price: 5800, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom', 'Water heater (hot shower)', 'Lockable wardrobe'], available: false }
];