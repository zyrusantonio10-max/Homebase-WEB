/*
  Ariate Dormitory room catalogue seed data.
  Room entity structure:
    id, name, floor, type ("Single" | "Double" | "Triple" | "Quad"),
    price (monthly per resident in PHP), amenities, available, image, bedsTaken.
*/

/* Available room amenities */
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

var ROOT = /\/pages\/[^/]+\//.test(location.pathname) ? '../../' : '';
window.HOMEBASE_ROOMS = [
  // Floor 1
  { id: '1',  name: 'Room 1',  floor: 1, type: 'Double', price: 3500, amenities: ['Air conditioning'],                                                      available: true, image: ROOT + 'assets/images/rooms/room-01.jpg' },
  { id: '2',  name: 'Room 2',  floor: 1, type: 'Double', price: 5500, amenities: ['Wi-Fi', 'Air conditioning', 'TV', 'Study desk', 'Private bathroom'],       available: true, image: ROOT + 'assets/images/rooms/room-1.png' },
  { id: '3',  name: 'Room 3',  floor: 1, type: 'Single', price: 4500, amenities: ['Electric fan', 'Study desk', 'Lockable wardrobe'],                        available: true, image: ROOT + 'assets/images/rooms/room-02.jpg' },
  { id: '4',  name: 'Room 4',  floor: 1, type: 'Double', price: 3500, amenities: ['Air conditioning', 'Lockable wardrobe'],                                  available: true, image: ROOT + 'assets/images/rooms/room-03.jpg' },
  { id: '5',  name: 'Room 5',  floor: 1, type: 'Double', price: 3000, amenities: ['Electric fan', 'Study desk', 'Lockable wardrobe'],                        available: true, image: ROOT + 'assets/images/rooms/room-04.jpg' },
  { id: '6',  name: 'Room 6',  floor: 1, type: 'Double', price: 3500, amenities: ['Air conditioning', 'Study desk'],                                        available: true, image: ROOT + 'assets/images/rooms/room-05.jpg' },
  { id: '7',  name: 'Room 7',  floor: 1, type: 'Triple', price: 2800, amenities: [],                                                                        available: true, image: ROOT + 'assets/images/rooms/room-06.jpg' },
  { id: '8',  name: 'Room 8',  floor: 1, type: 'Double', price: 3200, amenities: ['Study desk', 'Lockable wardrobe'],                                       available: true, image: ROOT + 'assets/images/rooms/room-07.jpg' },
  { id: '9',  name: 'Room 9',  floor: 1, type: 'Triple', price: 3000, amenities: ['Electric fan', 'TV', 'Study desk'],                                      available: true, image: ROOT + 'assets/images/rooms/room-08.jpg' },
  { id: '10', name: 'Room 10', floor: 1, type: 'Triple', price: 2800, amenities: ['Electric fan', 'Study desk'],                                            available: true, image: ROOT + 'assets/images/rooms/room-009.webp' },

  // Floor 2
  { id: '11', name: 'Room 11', floor: 2, type: 'Double', price: 3200, amenities: ['Study desk', 'Lockable wardrobe'],                                       available: true, image: ROOT + 'assets/images/rooms/room-10.jpg' },
  { id: '12', name: 'Room 12', floor: 2, type: 'Quad',   price: 2500, amenities: ['Air conditioning', 'Lockable wardrobe'],                                 available: true, image: ROOT + 'assets/images/rooms/room-11.jpg' },
  { id: '13', name: 'Room 13', floor: 2, type: 'Single', price: 5000, amenities: ['Study desk', 'Lockable wardrobe'],                                       available: true, image: ROOT + 'assets/images/rooms/room-13.jpg' },

  // Floor 3
  { id: '14', name: 'Room 14', floor: 3, type: 'Double', price: 3200, amenities: ['Study desk'],                                                            available: true, image: ROOT + 'assets/images/rooms/room-114.webp' }
];
