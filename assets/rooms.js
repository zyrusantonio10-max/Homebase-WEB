/*
  SAMPLE DATA. These rooms, prices and availability are placeholders, not the real Ariate Dormitory list.
  My Matches and Explore Rooms both read this one file, so edit it here and both pages update.
  Later (PHP + MySQL phase): replace this file with a fetch() to your PHP page that returns the same shape.

  Each room: { id, name, floor, type: "Single" | "Double" | "Quad", price (per month, in pesos), amenities: [...], available: true | false }
*/
window.HOMEBASE_AMENITIES = ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom', 'Laundry access', 'Kitchenette'];

window.HOMEBASE_ROOMS = [
  { id: '101', name: 'Room 101', floor: 1, type: 'Quad',   price: 3200, amenities: ['Wi-Fi', 'Laundry access'], available: true },
  { id: '102', name: 'Room 102', floor: 1, type: 'Quad',   price: 3200, amenities: ['Wi-Fi', 'Study desk'], available: false },
  { id: '103', name: 'Room 103', floor: 1, type: 'Double', price: 4800, amenities: ['Wi-Fi', 'Study desk', 'Air conditioning'], available: true },
  { id: '104', name: 'Room 104', floor: 1, type: 'Double', price: 4800, amenities: ['Wi-Fi', 'Air conditioning'], available: true },
  { id: '105', name: 'Room 105', floor: 1, type: 'Single', price: 6800, amenities: ['Wi-Fi', 'Study desk', 'Air conditioning', 'Private bathroom'], available: false },
  { id: '201', name: 'Room 201', floor: 2, type: 'Quad',   price: 3400, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk'], available: true },
  { id: '202', name: 'Room 202', floor: 2, type: 'Double', price: 5200, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Laundry access'], available: true },
  { id: '203', name: 'Room 203', floor: 2, type: 'Double', price: 5500, amenities: ['Wi-Fi', 'Air conditioning', 'Private bathroom'], available: true },
  { id: '204', name: 'Room 204', floor: 2, type: 'Single', price: 7200, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom'], available: true },
  { id: '301', name: 'Room 301', floor: 3, type: 'Quad',   price: 3600, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Kitchenette'], available: true },
  { id: '302', name: 'Room 302', floor: 3, type: 'Single', price: 8200, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom', 'Kitchenette'], available: true },
  { id: '303', name: 'Room 303', floor: 3, type: 'Double', price: 5800, amenities: ['Wi-Fi', 'Air conditioning', 'Study desk', 'Private bathroom', 'Laundry access'], available: false }
];