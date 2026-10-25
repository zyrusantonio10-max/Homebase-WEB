// Mock database for Ariate Dormitory. Field names match the planned MySQL columns,
// so each array maps to one table. Replace this file to load another dormitory.
window.HB = {
  dormitory: { dorm_id: 1, dorm_name: 'Ariate Dormitory', address: '[add dorm address]', has_elevator: false },
  amenityLabels: { wifi: 'Wi-Fi', study: 'Study area', laundry: 'Laundry', kitchen: 'Kitchen', cctv: 'CCTV', parking: 'Parking' },
  students: [{
    user_id: 1, role: 'student', name: 'Alex Santos', course: 'BS Computer Science', university: 'UNC',
    preferences: {
      budget_min: 4000, budget_max: 7000, room_type: 'any', bathroom: 'any', cooling: 'any', furnished: 'any', max_roommates: 3,
      // Safety is not a scoring weight: it only shows up inside review comments.
      weights: { affordability: 30, room_fit: 20, amenities: 20, quiet: 10, internet: 10, reviews: 10 }
    }
  }],
  // [room_id, floor, capacity, occupied_beds, monthly_price, aircon, own_bathroom, furnished, available, amenities]
  rooms: [
    [101,1,6,4,3800,0,0,0,1,['laundry','cctv']],
    [102,1,4,4,4200,0,0,1,0,['wifi','cctv']],
    [103,1,4,2,4300,0,0,1,1,['wifi','cctv','laundry']],
    [104,1,2,1,5200,1,1,1,1,['wifi','cctv','study']],
    [201,2,6,5,3900,0,0,0,1,['cctv']],
    [202,2,3,2,3800,0,0,1,1,['wifi','kitchen','cctv']],
    [203,2,4,2,4600,1,0,1,1,['wifi','study','laundry','cctv']],
    [204,2,2,1,5500,1,1,1,1,['wifi','study','laundry','cctv']],
    [205,2,2,2,5600,1,1,1,0,['wifi','study','cctv']],
    [301,3,1,0,7800,1,1,1,1,['wifi','study','kitchen','cctv','laundry']],
    [302,3,4,3,4800,0,0,1,1,['wifi','kitchen','study','cctv']],
    [303,3,3,1,5900,1,0,1,1,['wifi','study','cctv','parking']],
    [304,3,2,0,6200,1,1,0,1,['wifi','cctv','laundry']]
  ].map(r => ({ room_id: r[0], room_number: String(r[0]), floor: r[1], capacity: r[2], occupied_beds: r[3], monthly_price: r[4],
    aircon: !!r[5], own_bathroom: !!r[6], furnished: !!r[7], available: !!r[8], amenities: r[9] })),
  // included = costs the rent already covers (counted as 0 in True Monthly Cost)
  utilities: [
    [101,800,200,300,[]],[102,700,220,300,[]],[103,700,220,300,['internet']],[104,600,200,300,['internet']],
    [201,850,250,350,[]],[202,400,150,300,['internet']],[203,900,250,300,['internet']],[204,700,220,300,['electricity','water','internet']],
    [205,650,200,300,['electricity','water','internet']],[301,700,220,300,['electricity','water','internet']],
    [302,650,220,300,['internet']],[303,800,230,300,['internet']],[304,700,200,300,['internet']]
  ].map(u => ({ room_id: u[0], electricity_cost: u[1], water_cost: u[2], internet_cost: u[3], included: u[4] })),
  // Mock reviews (demo content). Rooms without a row are shown as "No reviews yet".
  reviews: [
    [204,4.6,5,5,5,'Quiet floor and the bills are already in the rent.'],[204,4.5,4,5,5,'Stairs only, but the room stays cool.'],
    [202,3.8,4,4,3,'Fine for the price, the kitchen gets crowded.'],[203,4.2,4,4,4,'Aircon helps, electricity adds up in summer.'],
    [101,3.2,3,2,3,'Cheapest option. Wi-Fi is not included and drops often.'],[101,3.0,3,2,2,'Six beds is a lot of noise during exams.'],
    [103,3.9,4,4,4,'Quiet enough, good value with internet included.'],[104,4.4,5,4,5,'Own bathroom makes a big difference.'],
    [201,3.1,3,2,2,'Crowded and loud at night. Walls are thin.'],[302,4.0,4,4,4,'The study area on the floor is actually usable.'],
    [303,4.3,4,5,4,'Parking is handy. Pricey once you add electricity.'],[301,4.7,5,5,5,'Private and calm, but the rent is steep.'],
    [304,4.1,4,4,5,'Bright room and a quiet corridor.'],[102,3.6,4,3,3,'Clean, but always full.'],[205,4.4,4,5,4,'Two beds, own bathroom, very stable.']
  ].map((r, i) => ({ review_id: i + 1, room_id: r[0], rating: r[1], cleanliness: r[2], internet: r[3], noise: r[4], comment: r[5] })),
  // Demo starting state for a fresh browser. Not real activity.
  seed: { saved: [204, 202], comparisons: [{ rooms: [203, 101], at: '2026-10-25T14:03:12' }] }
};
