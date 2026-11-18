/*
  Reservation requests: shared by Home, My Matches, Explore Rooms and the landlord pages.
  Stored in localStorage under "homebase_reservations" as a list. Each item has the same columns a MySQL
  "reservations" table would have, so the move to PHP + MySQL later only swaps load() and save():

    { id, userId, studentName, studentEmail, roomId, roomName, floor, type, price,
      moveIn: "2026-11-02", message, status: "pending" | "approved" | "confirmed" | "declined" | "cancelled" | "expired" | "ended",
      paymentDays, paymentDueAt, approvedAt, confirmedAt, endedAt (filled in as the request moves along), createdAt, updatedAt }

  Rules: a student can have ONE active request (pending or approved) at a time.
         Rooms have beds: Single 1, Double 2, Quad 4. Every active request takes ONE bed, so a shared room stays open for booking
         until its last bed is taken. (room.bedsTaken is an optional number of beds already taken outside Homebase.)
         A room is "available" (a bed is free), "full", "taken" (closed by the landlord), or "yours" (you hold a bed in it).
         Prices are per person per month.
         Life of a request: pending -> approved -> confirmed -> ended. Side exits: declined, cancelled (student), expired (not paid in time).
         The landlord sets the payment window (days) when approving. An approved request that is not marked paid by its deadline becomes "expired".
         The student who asked for it sees it as "yours".
  Payment is NOT handled here. The dormitory office handles payment and the contract.
*/
(function () {
  var KEY = 'homebase_reservations';
  var ROOMS_KEY = 'homebase_rooms';

  // The house rules posted at Ariate Dormitory (kept close to the sign's own wording).
  var RULES = [
    'Everyone in the house shares the cleaning of common spaces: bathrooms, toilets, the wash area, hallways and doormats. Clean not only your room but also the common places.',
    'Respect your housemates\u2019 privacy and things. If it is not yours, do not touch it.',
    'Smoking and drinking alcohol are not allowed.',
    'Electric fan and lights are free of charge. Other gadgets are charged and need approval.',
    'Visitors are not allowed to enter the room.',
    'Parents may stay for up to 2 days for free. After 2 days, the charge is \u20B1150 per day. A friend, sister or brother also pays \u20B1150 per day.',
    'When leaving the boarding house, make sure the faucets are closed, appliances are unplugged and your door is locked.',
    'The security deposit is consumable.',
    'Ariate Dorm reserves the right to inspect rooms.',
    'The reservation payment is good for 1 week only. If you do not confirm within 1 week, your reservation is forfeited.',
    'Pay your room rent on time to avoid a 5% charge.'
  ];
  // The ones students most need to know before they ask for a room.
  var KEY_RULES = [
    'No smoking and no drinking alcohol.',
    'Visitors are not allowed to enter the room.',
    'Your reservation payment is good for 1 week. If you do not confirm in time, it is forfeited.',
    'The security deposit is consumable.',
    'Pay rent on time to avoid a 5% charge.'
  ];

  function load() {
    try {
      var raw = localStorage.getItem(KEY), v = raw ? JSON.parse(raw) : [];
      var list = Array.isArray(v) ? v : [], changed = false, now = Date.now();
      // approved requests that were not paid by their deadline expire here, so every page agrees
      list.forEach(function (r) {
        if (r.status === 'approved' && r.paymentDueAt && Date.parse(r.paymentDueAt) < now) { r.status = 'expired'; r.updatedAt = nowIso(); changed = true; }
      });
      if (changed) save(list);
      return { ok: true, list: list };
    } catch (e) { return { ok: false, list: [] }; }
  }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function isActive(r) { return r.status === 'pending' || r.status === 'approved' || r.status === 'confirmed'; }
  function nowIso() { return new Date().toISOString(); }

  // A small picture of a room, drawn from its type and amenities (an illustration, not a photo).
  function roomArt(room) {
    var F = '#0B4A2F', D = '#083A25', B = '#0E5435', L = '#C6F24E', am = room.amenities || [];
    function bed(x, y, w) {
      return '<rect x="' + x + '" y="' + (y + 28) + '" width="' + w + '" height="28" fill="' + D + '"/>' +
             '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="32" rx="6" fill="' + B + '"/>' +
             '<rect x="' + (x + 8) + '" y="' + (y - 6) + '" width="34" height="14" rx="5" fill="#fff" stroke="#CBD5CF"/>';
    }
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
      '<rect width="640" height="400" fill="#E8EEEA"/>' +
      '<rect y="300" width="640" height="100" fill="' + F + '"/><rect y="296" width="640" height="8" fill="' + D + '"/>' +
      '<rect x="200" y="330" width="240" height="40" rx="10" fill="' + B + '"/>' +
      '<rect x="250" y="50" width="140" height="120" rx="4" fill="' + F + '"/>';
    [[258, 58], [322, 58], [258, 112], [322, 112]].forEach(function (pt, i) {
      o += '<rect x="' + pt[0] + '" y="' + pt[1] + '" width="60" height="50" rx="2" fill="' + (room.available && i === 1 ? L : D) + '"/>';
    });
    if (am.indexOf('Air conditioning') !== -1) o += '<rect x="100" y="40" width="110" height="34" rx="8" fill="#fff" stroke="#CBD5CF"/><path d="M114 58h82M114 65h82" stroke="#CBD5CF" stroke-width="2"/>';
    if (am.indexOf('Private bathroom') !== -1) o += '<rect x="402" y="100" width="48" height="200" fill="#CFE3D6" stroke="' + F + '" stroke-width="2"/><circle cx="438" cy="205" r="3.5" fill="' + F + '"/>';
    if (am.indexOf('Study desk') !== -1) o += '<rect x="245" y="235" width="150" height="10" fill="' + D + '"/><rect x="253" y="245" width="8" height="55" fill="' + D + '"/><rect x="379" y="245" width="8" height="55" fill="' + D + '"/>' +
      '<rect x="293" y="190" width="54" height="40" rx="4" fill="' + D + '"/><rect x="298" y="195" width="44" height="30" rx="2" fill="' + B + '"/>';
    if (room.type === 'Single') o += bed(60, 244, 150);
    else if (room.type === 'Double') o += bed(40, 244, 150) + bed(450, 244, 150);
    else [40, 470].forEach(function (x) {
      o += '<rect x="' + x + '" y="186" width="8" height="114" fill="' + D + '"/><rect x="' + (x + 122) + '" y="186" width="8" height="114" fill="' + D + '"/>' + bed(x + 8, 244, 114) + bed(x + 8, 190, 114);
    });
    return o + '</svg>';
  }

  // ============================================================
  // Supabase sync. The pages read rooms and requests from localStorage (fast, synchronous).
  // sync() copies the database into localStorage, and every change is also written to the database.
  // ============================================================
  var SNAP_KEY = 'homebase_sync_snapshot', OCC_KEY = 'homebase_occupancy';
  var pending = [];
  function db() { return window.HB_DB || null; }
  function me() { return (window.HB_AUTH && HB_AUTH.getUser) ? HB_AUTH.getUser() : null; }
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function roomToRow(r) {
    var img = null;
    if (r.images && Array.isArray(r.images) && r.images.length) {
      img = r.images.length === 1 ? r.images[0] : JSON.stringify(r.images);
    } else if (r.image) {
      img = r.image;
    }
    return { id: String(r.id), name: r.name, floor: Number(r.floor), type: r.type, price: Number(r.price), amenities: r.amenities || [],
      available: !!r.available, beds_taken: Number(r.bedsTaken) || 0, capacity: r.capacity ? Number(r.capacity) : null, image: img };
  }
  function rowToRoom(x) {
    var r = { id: x.id, name: x.name, floor: x.floor, type: x.type, price: x.price, amenities: x.amenities || [], available: x.available };
    if (x.beds_taken) r.bedsTaken = x.beds_taken;
    if (x.capacity) r.capacity = x.capacity;
    if (x.image) {
      var s = String(x.image);
      if (s.charAt(0) === '[') {
        try {
          r.images = JSON.parse(s);
          r.image = r.images[0] || null;
        } catch (e) {
          r.image = s;
          r.images = [s];
        }
      } else {
        r.image = s;
        r.images = [s];
      }
    } else if (x.images && Array.isArray(x.images)) {
      r.images = x.images;
      r.image = x.images[0] || null;
    }
    return r;
  }
  function resToRow(r) {
    return { id: r.id, user_id: r.userId, student_name: r.studentName, student_email: r.studentEmail, room_id: r.roomId, room_name: r.roomName,
      floor: r.floor, type: r.type, price: r.price, move_in: r.moveIn || null, message: r.message || null, status: r.status,
      rules_accepted_at: r.rulesAcceptedAt || null, created_at: r.createdAt, updated_at: r.updatedAt };
  }
  function rowToRes(x) {
    var r = { id: x.id, userId: x.user_id, studentName: x.student_name, studentEmail: x.student_email, roomId: x.room_id, roomName: x.room_name,
      floor: x.floor, type: x.type, price: x.price, moveIn: x.move_in || '', message: x.message || '', status: x.status,
      createdAt: x.created_at, updatedAt: x.updated_at };
    if (x.payment_days != null) r.paymentDays = x.payment_days;
    if (x.payment_due_at) r.paymentDueAt = x.payment_due_at;
    if (x.approved_at) r.approvedAt = x.approved_at;
    if (x.confirmed_at) r.confirmedAt = x.confirmed_at;
    if (x.ended_at) r.endedAt = x.ended_at;
    if (x.rules_accepted_at) r.rulesAcceptedAt = x.rules_accepted_at;
    return r;
  }
  function track(p) {
    var q = Promise.resolve(p).then(function (r) { return r; }, function (e) { return { error: e }; });
    pending.push(q);
    q.then(function () { var i = pending.indexOf(q); if (i > -1) pending.splice(i, 1); });
    return q;
  }
  // a save failed: put the page back in line with the database
  function failed(text, err) {
    try { console.error('Homebase:', text, err); } catch (e) {}
    try { localStorage.removeItem(SNAP_KEY); } catch (e) {}
    HB.sync({ noReload: true }).then(function () { window.alert(text + ' The page will reload with what is really saved.'); window.location.reload(); });
  }
  function push(id, fields) {
    var d = db(); if (!d) return;
    fields.updated_at = nowIso();
    track(d.from('reservations').update(fields).eq('id', id).select().then(function (r) {
      if (r.error || !r.data || !r.data.length) failed('That change could not be saved.', r.error);
    }));
  }
  function canReload() {
    try {
      var last = Number(sessionStorage.getItem('hb_reload_at') || 0);
      if (Date.now() - last < 3000) return false;
      sessionStorage.setItem('hb_reload_at', String(Date.now()));
    } catch (e) {}
    return true;
  }
  function readOcc() { try { var v = JSON.parse(localStorage.getItem(OCC_KEY) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }

  var HB = {
    load: load,

    // status chips: a word, tinted by meaning (ok = good, warn = needs attention, bad = problem, muted = neutral)
    statusTone: function (status) { return { pending: 'warn', approved: 'warn', confirmed: 'ok', ended: 'muted', declined: 'bad', cancelled: 'muted', expired: 'bad' }[status] || 'muted'; },
    roomTone: function (state) { return { available: 'ok', yours: 'ok', full: 'muted', taken: 'muted' }[state] || 'muted'; },
    chip: function (text, tone) { var n = document.createElement('span'); n.className = 'chip chip-' + tone; n.textContent = text; return n; },


    // ---- the room list ----
    // Starts as the sample rooms in assets/js/rooms.js. Once the landlord saves a change, the list lives in the browser
    // under "homebase_rooms" and every page reads it from here. (PHP + MySQL phase: this becomes a fetch to the server.)
    getRooms: function () {
      try {
        var raw = localStorage.getItem(ROOMS_KEY);
        if (raw) { var v = JSON.parse(raw); if (Array.isArray(v)) return v; }
      } catch (e) {}
      return JSON.parse(JSON.stringify(window.HOMEBASE_ROOMS || []));
    },
    // Copy rooms, requests and bed counts from the database into this browser. Reloads once if something changed.
    sync: function (opts) {
      var d = db(), u = me(); opts = opts || {};
      if (!d || !u) return Promise.resolve(false);
      return Promise.all([d.from('rooms').select('*'), d.from('reservations').select('*'), d.rpc('room_occupancy')]).then(function (res) {
        for (var i = 0; i < res.length; i++) if (res[i].error) throw res[i].error;
        var rooms = res[0].data.map(rowToRoom), list = res[1].data.map(rowToRes), occ = {};
        (res[2].data || []).forEach(function (o) { occ[o.room_id] = o.taken; });
        var snap = JSON.stringify([rooms, list, occ]), prev = null;
        try { prev = localStorage.getItem(SNAP_KEY); } catch (e) {}
        var changed = snap !== prev;
        if (changed || opts.force) {
          try {
            localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms)); localStorage.setItem(KEY, JSON.stringify(list));
            localStorage.setItem(OCC_KEY, JSON.stringify(occ)); localStorage.setItem(SNAP_KEY, snap);
          } catch (e) { return false; }
        }
        // the office records requests that were not paid in time
        if (u.role === 'landlord') {
          var now = Date.now();
          list.forEach(function (r) { if (r.status === 'approved' && r.paymentDueAt && Date.parse(r.paymentDueAt) < now) push(r.id, { status: 'expired' }); });
        }
        if (changed && !opts.noReload && canReload()) window.location.reload();
        return changed;
      }).catch(function (e) { try { console.warn('Homebase sync failed', e); } catch (x) {} return false; });
    },
    // resolves when every save to the database has finished
    flush: function () { return Promise.all(pending.slice()); },

    usingSampleRooms: function () { try { return !localStorage.getItem(ROOMS_KEY); } catch (e) { return true; } },
    saveRooms: function (list) {
      var prevIds = HB.getRooms().map(function (r) { return String(r.id); });
      try { localStorage.setItem(ROOMS_KEY, JSON.stringify(list)); } catch (e) { return false; }
      var d = db();
      if (d) {
        var ids = list.map(function (r) { return String(r.id); });
        var gone = prevIds.filter(function (x) { return ids.indexOf(x) === -1; });
        track(d.from('rooms').upsert(list.map(roomToRow)).then(function (r) { if (r.error) failed('The rooms could not be saved.', r.error); }));
        if (gone.length) track(d.from('rooms').delete().in('id', gone).then(function (r) { if (r.error) failed('A room could not be deleted.', r.error); }));
      }
      return true;
    },
    resetRooms: function () {
      try { localStorage.removeItem(ROOMS_KEY); } catch (e) { return false; }
      var d = db(), sample = (window.HOMEBASE_ROOMS || []);
      if (d && sample.length) {
        var ids = sample.map(function (r) { return String(r.id); });
        track(d.from('rooms').upsert(sample.map(roomToRow)).then(function (r) {
          if (r.error) { failed('The rooms could not be reset.', r.error); return; }
          return d.from('rooms').delete().not('id', 'in', '(' + ids.join(',') + ')').then(function (r2) { if (r2.error) failed('The rooms could not be reset.', r2.error); });
        }));
      }
      return true;
    },

    // a real photo if the room has images, an "image" path, or the drawn illustration
    roomImage: function (room) {
      if (room.images && room.images.length) return room.images[0];
      return room.image || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(roomArt(room)));
    },

    isActive: isActive,

    // newest first
    forUser: function (userId) {
      return load().list.filter(function (r) { return r.userId === userId; })
        .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    },
    activeFor: function (userId) { return HB.forUser(userId).filter(isActive)[0] || null; },
    // the stay a student is living in right now: paid (confirmed) and the move-in date has arrived. Concerns need this.
    currentStay: function (userId) {
      var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); }, today = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      return HB.forUser(userId).filter(function (r) { return r.status === 'confirmed' && r.moveIn && r.moveIn <= today; })[0] || null;
    },

    // beds in a room: a Double fits 2 students and a Quad fits 4
    capacity: function (room) { return Number(room.capacity) || { Single: 1, Double: 2, Quad: 4 }[room.type] || 1; },
    bedsInfo: function (room, userId) {
      var cap = HB.capacity(room);
      var active = load().list.filter(function (r) { return r.roomId === room.id && isActive(r); });
      var outside = Math.max(0, Math.min(cap, Number(room.bedsTaken) || 0));
      var occ = readOcc(), requested = occ ? Math.max(Number(occ[room.id]) || 0, active.length) : active.length;
      return {
        capacity: cap, outside: outside, requested: requested, active: active,
        free: room.available ? Math.max(0, cap - outside - requested) : 0,
        mine: !!userId && active.some(function (r) { return r.userId === userId; })
      };
    },
    // "available" (a bed is free) | "full" | "taken" (closed) | "yours" (you hold a bed here)
    roomState: function (room, userId) {
      var i = HB.bedsInfo(room, userId);
      if (i.mine) return 'yours';
      if (!room.available) return 'taken';
      return i.free > 0 ? 'available' : 'full';
    },
    bedsText: function (room) { var cap = HB.capacity(room); return cap > 1 ? HB.bedsInfo(room).free + ' of ' + cap + ' beds free' : ''; },
    priceLabel: function (room) { return '\u20B1' + Number(room.price).toLocaleString('en-PH') + (HB.capacity(room) > 1 ? ' per person per month' : ' per month'); },

    // a student under 18 cannot request a room until a parent or guardian has approved the account
    canRequest: function (user) {
      var msg = (user && window.HB_AUTH && HB_AUTH.requestBlock) ? HB_AUTH.requestBlock(user.id) : '';
      return msg ? { ok: false, error: msg } : { ok: true };
    },
    showBlocked: function (message) {
      var d = document.getElementById('hb-blocked');
      if (!d) {
        d = document.createElement('dialog'); d.id = 'hb-blocked'; d.setAttribute('aria-labelledby', 'hb-blocked-title');
        d.className = 'w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
        d.innerHTML = '<div class="p-6"><h2 id="hb-blocked-title" class="font-display text-xl font-bold tracking-tight">Parent or guardian approval needed</h2>' +
          '<p id="hb-blocked-text" class="mt-2 text-base text-muted"></p>' +
          '<div class="mt-5 flex flex-wrap gap-2"><a href="home.html" class="btn">Go to Home</a><button type="button" id="hb-blocked-close" class="btn btn-outline">Close</button></div></div>';
        document.body.appendChild(d);
        d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
        document.getElementById('hb-blocked-close').addEventListener('click', function () { d.close(); });
      }
      document.getElementById('hb-blocked-text').textContent = message;
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    },

    create: function (user, room, moveIn, message, rulesAccepted) {
      var gate = HB.canRequest(user); if (!gate.ok) return gate;
      if (!rulesAccepted) return { ok: false, error: 'Please agree to the house rules first.' };
      var all = load();
      if (!all.ok) return { ok: false, error: 'Your browser is blocking site data, so the request cannot be saved. Allow site data and try again.' };
      if (HB.activeFor(user.id)) return { ok: false, error: 'You already have an active request. Cancel it on Home before requesting another room.' };
      if (HB.roomState(room, user.id) !== 'available') return { ok: false, error: 'This room is no longer available.' };
      var rec = {
        id: newId(), userId: user.id, studentName: user.name, studentEmail: user.email,
        roomId: room.id, roomName: room.name, floor: room.floor, type: room.type, price: room.price,
        moveIn: moveIn, message: String(message || '').trim().slice(0, 300),
        status: 'pending', rulesAcceptedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso()
      };
      all.list.push(rec);
      if (!save(all.list)) return { ok: false, error: 'Your browser blocked saving the request. Allow site data and try again.' };
      var d = db(), saved = Promise.resolve({ ok: true });
      if (d) {
        saved = track(d.from('reservations').insert(resToRow(rec)).then(function (r) {
          if (!r.error) return { ok: true };
          var back = load(); back.list = back.list.filter(function (x) { return x.id !== rec.id; }); save(back.list);
          var m = String(r.error.message || ''), text;
          if (r.error.code === '23505') text = 'You already have an active request. Cancel it on Home before requesting another room.';
          else if (/full|available|row-level|policy/i.test(m)) text = /full/i.test(m) ? 'This room is full.' : (/available/i.test(m) ? 'This room is no longer available.' : 'This request is not allowed. If you are under 18, your parent or guardian must approve your account first.');
          else text = 'We could not save your request. Check your internet and try again.';
          return { ok: false, error: text };
        }));
      }
      return { ok: true, reservation: rec, saved: saved };
    },

    setStatus: function (id, status) {
      var all = load(); if (!all.ok) return false;
      var hit = all.list.filter(function (r) { return r.id === id; })[0];
      if (!hit) return false;
      hit.status = status; hit.updatedAt = nowIso();
      var okSave = save(all.list); if (okSave) push(id, { status: status });
      return okSave;
    },

    // landlord approves and sets the payment window (1 to 30 days)
    approve: function (id, days) {
      days = Math.floor(Number(days));
      if (!isFinite(days) || days < 1 || days > 30) return false;
      var all = load(); if (!all.ok) return false;
      var hit = all.list.filter(function (r) { return r.id === id && r.status === 'pending'; })[0];
      if (!hit) return false;
      hit.status = 'approved'; hit.paymentDays = days; hit.approvedAt = nowIso(); hit.updatedAt = nowIso();
      hit.paymentDueAt = new Date(Date.now() + days * 86400000).toISOString();
      var okSave = save(all.list);
      if (okSave) push(id, { status: 'approved', payment_days: days, approved_at: hit.approvedAt, payment_due_at: hit.paymentDueAt });
      return okSave;
    },
    // landlord marks that the office received payment
    confirmPayment: function (id) {
      var all = load(); if (!all.ok) return false;
      var hit = all.list.filter(function (r) { return r.id === id && r.status === 'approved'; })[0];
      if (!hit) return false;
      hit.status = 'confirmed'; hit.confirmedAt = nowIso(); hit.updatedAt = nowIso();
      var okSave = save(all.list); if (okSave) push(id, { status: 'confirmed', confirmed_at: hit.confirmedAt });
      return okSave;
    },
    // landlord ends the stay, the room becomes available again
    endStay: function (id) {
      var all = load(); if (!all.ok) return false;
      var hit = all.list.filter(function (r) { return r.id === id && r.status === 'confirmed'; })[0];
      if (!hit) return false;
      hit.status = 'ended'; hit.endedAt = nowIso(); hit.updatedAt = nowIso();
      var okSave = save(all.list); if (okSave) push(id, { status: 'ended', ended_at: hit.endedAt });
      return okSave;
    },

    // ---- the house rules window ----
    openRules: function () {
      var dlg = document.getElementById('hb-rules');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'hb-rules'; dlg.setAttribute('aria-labelledby', 'hb-rules-title');
        dlg.className = 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
        dlg.innerHTML =
          '<div class="p-6"><h2 id="hb-rules-title" class="font-display text-xl font-bold tracking-tight">House rules</h2>' +
          '<p class="mt-1 text-base text-muted">Ariate Dormitory</p>' +
          '<ol class="mt-4 list-decimal space-y-2 pl-6 text-base">' + RULES.map(function (t) { return '<li class="pl-1">' + t + '</li>'; }).join('') + '</ol>' +
          '<p class="mt-4 text-sm text-muted">These follow the rules posted at the dormitory. Ask the dormitory office if anything is unclear.</p>' +
          '<button type="button" id="hb-rules-close" class="btn mt-5">Close</button></div>';
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        document.getElementById('hb-rules-close').addEventListener('click', function () { dlg.close(); });
      }
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    },

    // ---- the request dialog (built once, reused) ----
    openRequest: function (room, user) {
      var gate = HB.canRequest(user); if (!gate.ok) { HB.showBlocked(gate.error); return; }
      var dlg = document.getElementById('hb-request');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'hb-request';
        dlg.setAttribute('aria-labelledby', 'hb-req-title');
        dlg.className = 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-[440px] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
        dlg.innerHTML =
          '<div class="p-6">' +
            '<h2 id="hb-req-title" class="font-display text-xl font-bold tracking-tight"></h2>' +
            '<p id="hb-req-sub" class="mt-1 text-base text-muted"></p>' +
            '<form id="hb-req-form" novalidate class="mt-5 space-y-4">' +
              '<p id="hb-req-error" role="alert" class="hidden rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"></p>' +
              '<div><label class="mb-1.5 block text-sm font-medium" for="hb-req-date">Move-in date</label>' +
                '<input id="hb-req-date" type="date" required aria-describedby="hb-req-date-err" class="block h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/30 aria-[invalid=true]:border-danger">' +
                '<p id="hb-req-date-err" class="mt-1.5 hidden text-sm font-medium text-danger"></p></div>' +
              '<div><label class="mb-1.5 block text-sm font-medium" for="hb-req-msg">Message to the landlord (optional)</label>' +
                '<textarea id="hb-req-msg" rows="3" maxlength="300" class="block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/30"></textarea></div>' +
              '<div class="rounded-xl border border-line bg-tint p-4"><p class="text-sm font-semibold">Before you request, know the house rules</p>' +
                '<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">' + KEY_RULES.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
                '<button type="button" id="hb-req-rules" class="mt-2 inline-flex min-h-[44px] items-center rounded font-semibold text-forest underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-forest">Read all ' + RULES.length + ' house rules</button></div>' +
              '<div><label class="flex min-h-[44px] cursor-pointer items-start gap-3 text-base"><input id="hb-req-agree" type="checkbox" aria-describedby="hb-req-agree-err" class="mt-1 h-5 w-5 shrink-0 accent-forest">' +
                '<span>I have read the house rules and agree to follow them.</span></label>' +
                '<p id="hb-req-agree-err" class="mt-1 hidden text-sm font-medium text-danger"></p></div>' +
              '<p class="text-sm text-muted">The dormitory office reviews your request. Your spot is held while it is pending. Payment and the contract are handled by the office, not on Homebase.</p>' +
              '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
                '<button type="button" id="hb-req-cancel" class="btn btn-outline">Not now</button>' +
                '<button type="submit" id="hb-req-send" class="btn">Send request</button>' +
              '</div>' +
            '</form>' +
          '</div>';
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        document.getElementById('hb-req-cancel').addEventListener('click', function () { dlg.close(); });
        document.getElementById('hb-req-rules').addEventListener('click', function () { HB.openRules(); });
      }

      var form = document.getElementById('hb-req-form');
      var date = document.getElementById('hb-req-date'), dateErr = document.getElementById('hb-req-date-err');
      var formErr = document.getElementById('hb-req-error');
      var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
      var today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

      document.getElementById('hb-req-title').textContent = 'Request ' + room.name;
      document.getElementById('hb-req-sub').textContent = 'Floor ' + room.floor + ', ' + room.type + ' room, ' + HB.priceLabel(room);
      var lim = new Date(d.getTime() + 365 * 86400000);
      var maxDay = lim.getFullYear() + '-' + pad(lim.getMonth() + 1) + '-' + pad(lim.getDate());
      date.min = today; date.max = maxDay; date.value = ''; date.removeAttribute('aria-invalid');
      dateErr.classList.add('hidden'); formErr.classList.add('hidden');
      document.getElementById('hb-req-msg').value = '';
      document.getElementById('hb-req-agree').checked = false; document.getElementById('hb-req-agree-err').classList.add('hidden');

      // replace the submit handler each time so it always points at the current room
      form.onsubmit = function (e) {
        e.preventDefault();
        dateErr.classList.add('hidden'); formErr.classList.add('hidden'); date.removeAttribute('aria-invalid');
        if (!date.value || date.value < today || date.value > maxDay) {
          date.setAttribute('aria-invalid', 'true');
          dateErr.textContent = !date.value ? 'Choose your move-in date.' : (date.value < today ? 'Choose today or a later date.' : 'Choose a date within the next year.');
          dateErr.classList.remove('hidden'); date.focus(); return;
        }
        var agree = document.getElementById('hb-req-agree'), agreeErr = document.getElementById('hb-req-agree-err');
        agreeErr.classList.add('hidden');
        if (!agree.checked) { agreeErr.textContent = 'Tick the box to confirm you have read the house rules.'; agreeErr.classList.remove('hidden'); agree.focus(); return; }
        var res = HB.create(user, room, date.value, document.getElementById('hb-req-msg').value, true);
        if (!res.ok) { formErr.textContent = res.error; formErr.classList.remove('hidden'); return; }
        var go = form.querySelector('[type=submit]'); if (go) go.disabled = true;
        (res.saved || Promise.resolve({ ok: true })).then(function (s) {
          if (go) go.disabled = false;
          if (!s.ok) { formErr.textContent = s.error; formErr.classList.remove('hidden'); return; }
          window.location.href = 'home.html#reservation';
        });
      };

      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      date.focus();
    }
  };

  window.HB = HB;
  document.addEventListener('DOMContentLoaded', function () { if (!window.HB_SYNC && db() && me()) HB.sync(); });
})();