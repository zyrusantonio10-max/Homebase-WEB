/*
  Homebase – Building (Property‑wide) Amenities Module
  =====================================================
  Building amenities are features that apply to the whole dormitory or
  apartment, not to any single room.  Every tenant in the building has
  access to them.  Different properties may offer different ones.

  The catalogue below is based on common student‑housing standards in
  Philippine universities (CHED CMO 9 s.2013 – Student Housing &
  Services Guidelines) and typical dormitory offerings near colleges
  such as UNC, UP Diliman, UST, and DLSU.

  The landlord selects which ones their building offers via the
  "Building amenities" section on the Dashboard.  Students see
  the selected items on every room card and in their match results.
  =====================================================
*/

/*
  Master catalogue of building‑level amenities.
  Grouped conceptually; each entry is shown as a checkbox for the landlord.
*/
window.HOMEBASE_BUILDING_AMENITIES = [
  // Security & safety
  'CCTV / Security cameras',
  'Security guard (24/7)',
  'Gated entrance / Curfew',
  'Fire extinguisher & smoke detectors',
  'Biometric / RFID access',

  // Utilities & power
  'Backup generator',
  'Purified drinking water station',

  // Shared living
  'Common study lounge',
  'Common kitchen / Pantry',
  'Shared laundry area',
  'Rooftop / Garden area',

  // Parking & transport
  'Bicycle / Motorcycle parking',
  'Car parking',

  // Connectivity & convenience
  'Building‑wide Wi‑Fi',
  'Package / Parcel receiving',
  'Housekeeping (common areas)',
];

/* ---- localStorage persistence & default property profile ---- */
var HB_BUILDING_KEY = 'homebase_building_amenities';

// Realistic defaults for Ariate Dormitory (Naga City / UNC) - notably no parking
var DEFAULT_ARIATE_BUILDING_AMENITIES = [
  'CCTV / Security cameras',
  'Gated entrance / Curfew',
  'Fire extinguisher & smoke detectors',
  'Purified drinking water station',
  'Building‑wide Wi‑Fi',
  'Shared laundry area'
];

function _loadBA() {
  try {
    var raw = localStorage.getItem(HB_BUILDING_KEY);
    if (raw) { var p = JSON.parse(raw); if (Array.isArray(p)) return p; }
    if (raw === null) {
      // First run: seed defaults for Ariate Dormitory
      _saveBA(DEFAULT_ARIATE_BUILDING_AMENITIES, true);
      return DEFAULT_ARIATE_BUILDING_AMENITIES.slice();
    }
  } catch (e) { /* swallow */ }
  return DEFAULT_ARIATE_BUILDING_AMENITIES.slice();
}
function _saveBA(list, noSync) {
  try { localStorage.setItem(HB_BUILDING_KEY, JSON.stringify(list)); }
  catch (e) { return false; }
  if (!noSync && window.HB_SYNC) HB_SYNC.saved('building', list);
  return true;
}

/* ---- public API ---- */
window.HB_BUILDING = {
  /** The full catalogue of possible building amenities. */
  catalogue: function () {
    return (window.HOMEBASE_BUILDING_AMENITIES || []).slice();
  },

  /** Currently selected (enabled) building amenities. */
  get: function () { return _loadBA(); },

  /** Overwrite the whole list. */
  set: function (list) { return _saveBA(list); },

  /** Toggle a single amenity on/off; returns the new state (true = on). */
  toggle: function (amenity) {
    var cur = _loadBA();
    var idx = cur.indexOf(amenity);
    if (idx >= 0) { cur.splice(idx, 1); _saveBA(cur); return false; }
    cur.push(amenity); _saveBA(cur); return true;
  }
};
