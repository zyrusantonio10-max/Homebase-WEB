/*
  Homebase per-student data in the database: match preferences, best match, saved rooms, compared rooms.
  The pages keep reading and writing localStorage as before. This file
    1. copies the student's rows from the table student_data into localStorage when a page loads, and uploads anything
       that exists only in this browser (so nothing already saved is lost), and
    2. watches those four localStorage keys and saves every change to the database.
  Needs: supabase.js (HB_DB), auth.js (HB_AUTH) and the student_data table.
*/
(function () {
  'use strict';
  var MAP = { homebase_preferences: 'preferences', homebase_topMatch: 'top_match', homebase_savedRooms: 'saved_rooms', homebase_comparisons: 'comparisons' };
  var timers = {}, pulling = false;

  function db() { return window.HB_DB || null; }
  function me() { return (window.HB_AUTH && HB_AUTH.getUser) ? HB_AUTH.getUser() : null; }
  function user() { var u = me(); return (u && u.role === 'student') ? u : null; }   // the office has no personal match data
  function localKey(base) { return base + '_' + user().id; }
  function baseOf(k) {
    var u = user(); if (!u) return null;
    for (var b in MAP) if (k === b + '_' + u.id) return b;
    return null;
  }

  function pushOne(base) {
    var u = user(), d = db(); if (!u || !d) return;
    var raw = null; try { raw = localStorage.getItem(localKey(base)); } catch (e) {}
    var q;
    if (raw === null) q = d.from('student_data').delete().eq('user_id', u.id).eq('key', MAP[base]);
    else {
      var val; try { val = JSON.parse(raw); } catch (e) { return; }
      q = d.from('student_data').upsert({ user_id: u.id, key: MAP[base], value: val, updated_at: new Date().toISOString() });
    }
    q.then(function (r) { if (r.error) { try { console.warn('Homebase: could not save', base, r.error); } catch (e) {} } });
  }
  function schedule(base) { clearTimeout(timers[base]); timers[base] = setTimeout(function () { pushOne(base); }, 400); }

  // watch the four keys (works for every page, nothing else has to change)
  if (window.Storage && Storage.prototype && !Storage.prototype.__hbUserData) {
    var origSet = Storage.prototype.setItem, origRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      var r = origSet.apply(this, arguments);
      if (this === window.localStorage && !pulling) { var b = baseOf(k); if (b) schedule(b); }
      return r;
    };
    Storage.prototype.removeItem = function (k) {
      var r = origRemove.apply(this, arguments);
      if (this === window.localStorage && !pulling) { var b = baseOf(k); if (b) schedule(b); }
      return r;
    };
    Storage.prototype.__hbUserData = true;
  }

  function pull() {
    var u = user(), d = db(); if (!u || !d) return;
    d.from('student_data').select('*').eq('user_id', u.id).then(function (r) {
      if (r.error) throw r.error;
      var have = {}, changed = false;
      (r.data || []).forEach(function (row) { have[row.key] = row.value; });
      pulling = true;
      try {
        Object.keys(MAP).forEach(function (base) {
          var k = localKey(base), name = MAP[base], cur = localStorage.getItem(k);
          if (have[name] !== undefined) {
            var next = JSON.stringify(have[name]);
            if (cur !== next) { localStorage.setItem(k, next); changed = true; }
          } else if (cur !== null) {
            schedule(base);   // only in this browser so far: upload it
          }
        });
      } finally { pulling = false; }
      if (changed) {
        try { Object.keys(MAP).forEach(function (b) { window.dispatchEvent(new StorageEvent('storage', { key: localKey(b) })); }); } catch (e) {}
        var last = 0; try { last = Number(sessionStorage.getItem('hb_reload_at') || 0); } catch (e) {}
        if (Date.now() - last > 3000) { try { sessionStorage.setItem('hb_reload_at', String(Date.now())); } catch (e) {} window.location.reload(); }
      }
    }).catch(function (e) { try { console.warn('Homebase: could not load saved data', e); } catch (x) {} });
  }

  window.HB_USERDATA = { pull: pull };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pull); else pull();
})();
