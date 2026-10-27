/*
  Reservation requests: shared by Home, My Matches, Explore Rooms, Floor Plan and the landlord page.
  Stored in localStorage under "homebase_reservations" as a list. Each item has the same columns a MySQL
  "reservations" table would have, so the move to PHP + MySQL later only swaps load() and save():

    { id, userId, studentName, studentEmail, roomId, roomName, floor, type, price,
      moveIn: "2026-11-02", message, status: "pending" | "approved" | "declined" | "cancelled", createdAt, updatedAt }

  Rules: a student can have ONE active request (pending or approved) at a time.
         A room with a pending request is "held", with an approved request it is "taken".
         The student who asked for it sees it as "yours".
  Payment is NOT handled here. The dormitory office handles payment and the contract.
*/
(function () {
  var KEY = 'homebase_reservations';

  function load() {
    try {
      var raw = localStorage.getItem(KEY), v = raw ? JSON.parse(raw) : [];
      return { ok: true, list: Array.isArray(v) ? v : [] };
    } catch (e) { return { ok: false, list: [] }; }
  }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function isActive(r) { return r.status === 'pending' || r.status === 'approved'; }
  function nowIso() { return new Date().toISOString(); }

  var HB = {
    load: load,
    isActive: isActive,

    // newest first
    forUser: function (userId) {
      return load().list.filter(function (r) { return r.userId === userId; })
        .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    },
    activeFor: function (userId) { return HB.forUser(userId).filter(isActive)[0] || null; },

    // "available" | "held" | "taken" | "yours"
    roomState: function (room, userId) {
      var hit = load().list.filter(function (r) { return r.roomId === room.id && isActive(r); })[0];
      if (hit) return hit.userId === userId ? 'yours' : (hit.status === 'approved' ? 'taken' : 'held');
      return room.available ? 'available' : 'taken';
    },

    create: function (user, room, moveIn, message) {
      var all = load();
      if (!all.ok) return { ok: false, error: 'Your browser is blocking site data, so the request cannot be saved. Allow site data and try again.' };
      if (HB.activeFor(user.id)) return { ok: false, error: 'You already have an active request. Cancel it on Home before requesting another room.' };
      if (HB.roomState(room, user.id) !== 'available') return { ok: false, error: 'This room is no longer available.' };
      var rec = {
        id: 'res-' + Date.now(), userId: user.id, studentName: user.name, studentEmail: user.email,
        roomId: room.id, roomName: room.name, floor: room.floor, type: room.type, price: room.price,
        moveIn: moveIn, message: String(message || '').trim().slice(0, 300),
        status: 'pending', createdAt: nowIso(), updatedAt: nowIso()
      };
      all.list.push(rec);
      if (!save(all.list)) return { ok: false, error: 'Your browser blocked saving the request. Allow site data and try again.' };
      return { ok: true, reservation: rec };
    },

    setStatus: function (id, status) {
      var all = load(); if (!all.ok) return false;
      var hit = all.list.filter(function (r) { return r.id === id; })[0];
      if (!hit) return false;
      hit.status = status; hit.updatedAt = nowIso();
      return save(all.list);
    },

    // ---- the request dialog (built once, reused) ----
    openRequest: function (room, user) {
      var dlg = document.getElementById('hb-request');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'hb-request';
        dlg.setAttribute('aria-labelledby', 'hb-req-title');
        dlg.className = 'w-[calc(100vw-2rem)] max-w-[440px] rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
        dlg.innerHTML =
          '<div class="p-6">' +
            '<h2 id="hb-req-title" class="font-display text-xl font-bold tracking-tight"></h2>' +
            '<p id="hb-req-sub" class="mt-1 text-base text-muted"></p>' +
            '<form id="hb-req-form" novalidate class="mt-5 space-y-4">' +
              '<p id="hb-req-error" role="alert" class="hidden rounded-xl border border-danger/30 bg-[#FEF3F2] px-3.5 py-3 text-sm font-medium text-danger"></p>' +
              '<div><label class="mb-1.5 block text-sm font-medium" for="hb-req-date">Move-in date</label>' +
                '<input id="hb-req-date" type="date" required aria-describedby="hb-req-date-err" class="block h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/30 aria-[invalid=true]:border-danger">' +
                '<p id="hb-req-date-err" class="mt-1.5 hidden text-sm font-medium text-danger"></p></div>' +
              '<div><label class="mb-1.5 block text-sm font-medium" for="hb-req-msg">Message to the landlord (optional)</label>' +
                '<textarea id="hb-req-msg" rows="3" maxlength="300" class="block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/30"></textarea></div>' +
              '<p class="text-sm text-muted">The dormitory office reviews your request. Your room is held while it is pending. Payment and the contract are handled by the office, not on Homebase.</p>' +
              '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
                '<button type="button" id="hb-req-cancel" class="btn btn-outline">Not now</button>' +
                '<button type="submit" id="hb-req-send" class="btn">Send request</button>' +
              '</div>' +
            '</form>' +
          '</div>';
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        document.getElementById('hb-req-cancel').addEventListener('click', function () { dlg.close(); });
      }

      var form = document.getElementById('hb-req-form');
      var date = document.getElementById('hb-req-date'), dateErr = document.getElementById('hb-req-date-err');
      var formErr = document.getElementById('hb-req-error');
      var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
      var today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

      document.getElementById('hb-req-title').textContent = 'Request ' + room.name;
      document.getElementById('hb-req-sub').textContent = 'Floor ' + room.floor + ', ' + room.type + ' room, \u20B1' + room.price.toLocaleString('en-PH') + ' per month';
      date.min = today; date.value = ''; date.removeAttribute('aria-invalid');
      dateErr.classList.add('hidden'); formErr.classList.add('hidden');
      document.getElementById('hb-req-msg').value = '';

      // replace the submit handler each time so it always points at the current room
      form.onsubmit = function (e) {
        e.preventDefault();
        dateErr.classList.add('hidden'); formErr.classList.add('hidden'); date.removeAttribute('aria-invalid');
        if (!date.value || date.value < today) {
          date.setAttribute('aria-invalid', 'true');
          dateErr.textContent = !date.value ? 'Choose your move-in date.' : 'Choose today or a later date.';
          dateErr.classList.remove('hidden'); date.focus(); return;
        }
        var res = HB.create(user, room, date.value, document.getElementById('hb-req-msg').value);
        if (!res.ok) { formErr.textContent = res.error; formErr.classList.remove('hidden'); return; }
        window.location.href = 'home.html#reservation';
      };

      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      date.focus();
    }
  };

  window.HB = HB;
})();