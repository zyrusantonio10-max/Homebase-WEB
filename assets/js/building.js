/*
  Building-wide amenities catalogue and state management.
  Amenities apply to the entire property rather than individual rooms.
  Landlords configure active amenities from the dashboard.
*/

/* Master catalogue of building-wide amenities */
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

/* Local storage persistence and default values */
var HB_BUILDING_KEY = 'homebase_building_amenities';
var HB_HIDDEN_KEY   = 'homebase_hidden_building_amenities';

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
function _loadHidden() {
  try {
    var raw = localStorage.getItem(HB_HIDDEN_KEY);
    if (raw) { var p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch (e) { /* swallow */ }
  return [];
}
function _saveHidden(list) {
  try { localStorage.setItem(HB_HIDDEN_KEY, JSON.stringify(list)); return true; }
  catch (e) { return false; }
}

/* Public API */
window.HB_BUILDING = {
  /** The full catalogue of possible building amenities (excludes hidden built-ins, includes saved custom perks). */
  catalogue: function () {
    var hidden = _loadHidden();
    var base = (window.HOMEBASE_BUILDING_AMENITIES || []).filter(function (a) {
      return hidden.indexOf(a) === -1;
    });
    var selected = _loadBA();
    selected.forEach(function (s) {
      if (base.indexOf(s) === -1) base.push(s);
    });
    return base;
  },

  /** Persist which built-in amenities are hidden from the catalogue. */
  setHidden: function (list) { return _saveHidden(list); },

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
