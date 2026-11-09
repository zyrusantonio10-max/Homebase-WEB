/*
 * Homebase – Building (Property) Amenities Module
 * -------------------------------------------------
 * This file defines the data model and helper functions for
 * **building‑level** amenities – features that apply to the whole
 * dormitory/apartment rather than a specific room.
 *
 * The list of common dormitory amenities is based on the
 * "College Dormitory Association" (CDA) recommendations and typical
 * university housing specs (see https://www.csda.org/resources/amenities).
 *
 * Default building amenities for Ariate Dormitory are empty – the
 * landlord can enable any of the options via the Building Settings UI.
 * -------------------------------------------------
 */

// Default set of building‑wide amenities that many dorms provide.
// These are shown as checkboxes in the Building Settings page.
window.HOMEBASE_BUILDING_AMENITIES = [
  // Basic utilities & comfort
  '24/7 CCTV / Security cameras',
  'On‑site security guard',
  'Purified drinking water station',
  'Backup generator / UPS',
  'Common study lounge',
  'Bicycle / Motorcycle parking',
  'Car parking (allocated spaces)',
  // Additional services (optional)
  'Gym / Fitness center',
  'Laundry facility (shared washers/dryers)',
  'Rooftop terrace / Garden',
  'Package delivery locker',
];

/**
 * Load the building amenities configuration from localStorage.
 * Returns an array of strings (the selected amenities). If none are
 * stored yet, returns an empty array.
 */
function loadBuildingAmenities() {
  try {
    var raw = localStorage.getItem('homebase_building_amenities');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // ignore and fall through
  }
  return [];
}

/** Save the selected building amenities to localStorage. */
function saveBuildingAmenities(list) {
  try {
    localStorage.setItem('homebase_building_amenities', JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

/** Public API used by other modules (rooms, matches, UI). */
var HB_BUILDING = {
  /** Get the current building amenity list. */
  get: function () {
    return loadBuildingAmenities();
  },
  /** Overwrite the whole list with a new array of amenity strings. */
  set: function (list) {
    return saveBuildingAmenities(list);
  },
  /** Convenience: toggle a single amenity on/off. */
  toggle: function (amenity) {
    var cur = loadBuildingAmenities();
    var idx = cur.indexOf(amenity);
    if (idx >= 0) cur.splice(idx, 1);
    else cur.push(amenity);
    return saveBuildingAmenities(cur);
  },
  /** Provide the master catalogue (all possible building amenities). */
  catalogue: function () {
    return window.HOMEBASE_BUILDING_AMENITIES.slice();
  },
};

// Export for other scripts that may use ES modules (not needed for now)
if (typeof module !== 'undefined') module.exports = HB_BUILDING;

