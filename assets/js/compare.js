/*
  Compare rooms: shared by Explore Rooms (rooms.html) and My Matches (matches.html).
  Needs assets/js/reservation.js (window.HB) loaded first, and the pages' .btn / .btn-outline classes.

  Usage on a page:
    var cmp = HBCompare.mount({ rooms: ROOMS, user: user, hasActive: hasActive });
    card.appendChild(cmp.checkbox(room));          // the "Compare" tick box for one room
    cmp.setPicked(['103', '202']); cmp.open(ids);  // used when a comparison is reopened from Home

  Comparisons are remembered in localStorage "homebase_comparisons" (newest first, max 10):
    { rooms: ["Room 103", "Room 202"], ids: ["103", "202"], date: ISO }
  Home lists them and links back to rooms.html?compare=103,202.
*/
(function () {
  var MAX = 3, KEY = 'homebase_comparisons';
  var STATUS = { available: 'Available', held: 'Held (request pending)', reserved: 'Reserved', occupied: 'Occupied', taken: 'Taken', yours: 'Your request' };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function peso(n) { return '\u20B1' + Number(n).toLocaleString('en-PH'); }
  function readList() { try { var r = localStorage.getItem(KEY), v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeList(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }

  window.HBCompare = {
    mount: function (cfg) {
      var rooms = cfg.rooms, user = cfg.user, hasActive = !!cfg.hasActive, picked = [];

      // ---- the bar at the bottom of the page and the comparison window ----
      var bar = document.getElementById('cmp-bar'), dlg = document.getElementById('cmp-dialog');
      if (!bar) {
        bar = el('div', 'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 py-3 sm:px-6');
        bar.id = 'cmp-bar'; bar.hidden = true;
        bar.innerHTML =
          '<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">' +
            '<p id="cmp-count" class="text-base font-medium" aria-live="polite"></p>' +
            '<div class="flex gap-2"><button type="button" id="cmp-clear" class="btn btn-outline">Clear</button>' +
            '<button type="button" id="cmp-open" class="btn">Compare rooms</button></div>' +
          '</div>';
        document.body.appendChild(bar);
      }
      if (!dlg) {
        dlg = el('dialog', 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50');
        dlg.id = 'cmp-dialog'; dlg.setAttribute('aria-labelledby', 'cmp-title');
        dlg.innerHTML =
          '<div class="p-6">' +
            '<div class="flex items-start justify-between gap-4"><div>' +
              '<h2 id="cmp-title" class="font-display text-xl font-bold tracking-tight">Compare rooms</h2>' +
              '<p class="mt-1 text-base text-muted">Side by side, so the differences are easy to see.</p></div>' +
              '<button type="button" id="cmp-x" aria-label="Close" class="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted outline-none hover:bg-track focus-visible:ring-2 focus-visible:ring-forest">' +
                '<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
            '<div class="mt-5 overflow-x-auto"><table id="cmp-table" class="w-full min-w-[560px] border-collapse text-left text-base"></table></div>' +
            '<p class="mt-4 text-sm text-muted">Sample rooms. Prices and availability are placeholders. Pictures are illustrations, not photos.</p>' +
            '<button type="button" id="cmp-close" class="btn mt-5">Close</button>' +
          '</div>';
        document.body.appendChild(dlg);
      }

      function roomById(id) { return rooms.filter(function (r) { return r.id === id; })[0]; }

      function updateBar() {
        bar.hidden = picked.length === 0;
        document.getElementById('cmp-count').textContent = picked.length < 2
          ? picked.length + ' room ticked. Pick at least one more to compare.'
          : picked.length + ' rooms ticked' + (picked.length === MAX ? ' (the most you can compare).' : '. You can add one more.');
        document.getElementById('cmp-open').disabled = picked.length < 2;
      }
      function syncBoxes() {
        document.querySelectorAll('input[data-cmp]').forEach(function (c) {
          c.checked = picked.indexOf(c.getAttribute('data-cmp')) !== -1;
          c.disabled = !c.checked && picked.length >= MAX;
        });
      }
      function toggle(id, on) {
        picked = picked.filter(function (x) { return x !== id; });
        if (on) picked.push(id);
        syncBoxes(); updateBar();
      }

      function saveComparison(list) {
        var cur = readList();
        var ids = list.map(function (r) { return r.id; }), key = ids.slice().sort().join(',');
        cur = cur.filter(function (x) { return !(Array.isArray(x.ids) && x.ids.slice().sort().join(',') === key); });
        cur.unshift({ rooms: list.map(function (r) { return r.name; }), ids: ids, date: new Date().toISOString() });
        if (!writeList(cur.slice(0, 10))) {
          var err = document.getElementById('page-error');
          if (err) { err.textContent = 'The comparison is shown, but your browser blocked saving it, so Home will not list it.'; err.classList.remove('hidden'); }
        }
      }

      function buildTable(list) {
        var t = document.getElementById('cmp-table'); t.textContent = '';
        var head = el('thead'), hr = el('tr');
        var corner = el('th', 'w-32 p-3'); corner.appendChild(el('span', 'sr-only', 'Feature')); hr.appendChild(corner);
        list.forEach(function (r) {
          var th = el('th', 'min-w-[150px] p-3 align-top'); th.scope = 'col';
          var img = el('img', 'aspect-[8/5] w-full rounded-lg bg-track object-cover');
          img.src = HB.roomImage(r); img.alt = r.name + ' (illustration)'; img.width = 640; img.height = 400; img.decoding = 'async';
          th.appendChild(img); th.appendChild(el('span', 'mt-2 block font-display text-lg font-semibold tracking-tight', r.name));
          hr.appendChild(th);
        });
        head.appendChild(hr); t.appendChild(head);

        var body = el('tbody');
        function addRow(label, fn) {
          var tr = el('tr'); var th = el('th', 'border-t border-line p-3 align-top text-sm font-medium text-muted', label); th.scope = 'row'; tr.appendChild(th);
          list.forEach(function (r) { var v = fn(r); tr.appendChild(el('td', 'border-t border-line p-3 align-top ' + (v.strong ? 'font-semibold text-forest' : ''), v.text)); });
          body.appendChild(tr);
        }
        var low = Math.min.apply(null, list.map(function (r) { return r.price; }));
        addRow('Status', function (r) { return { text: STATUS[HB.roomState(r, user.id)] }; });
        addRow('Floor', function (r) { return { text: 'Floor ' + r.floor }; });
        addRow('Room type', function (r) { return { text: r.type }; });
        addRow('Price per month', function (r) {
          var lowest = r.price === low && list.some(function (o) { return o.price !== low; });
          return { text: peso(r.price) + (lowest ? ' (lowest)' : ''), strong: lowest };
        });
        (window.HOMEBASE_AMENITIES || []).forEach(function (a) {
          addRow(a, function (r) { return { text: r.amenities.indexOf(a) !== -1 ? 'Yes' : 'No' }; });
        });
        var tr = el('tr'); var corner2 = el('th', 'border-t border-line p-3'); corner2.appendChild(el('span', 'sr-only', 'Action')); tr.appendChild(corner2);
        list.forEach(function (r) {
          var td = el('td', 'border-t border-line p-3 align-top');
          if (HB.roomState(r, user.id) === 'available' && !hasActive) {
            var b = el('button', 'btn', 'Request'); b.type = 'button'; b.setAttribute('aria-label', 'Request ' + r.name);
            b.addEventListener('click', function () { HB.openRequest(r, user); });
            td.appendChild(b);
          }
          tr.appendChild(td);
        });
        body.appendChild(tr); t.appendChild(body);
      }

      function open(ids) {
        var list = ids.map(roomById).filter(Boolean).slice(0, MAX);
        if (list.length < 2) return;
        buildTable(list); saveComparison(list);
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      }

      document.getElementById('cmp-open').addEventListener('click', function () { open(picked); });
      document.getElementById('cmp-clear').addEventListener('click', function () { picked = []; syncBoxes(); updateBar(); });
      ['cmp-close', 'cmp-x'].forEach(function (id) { document.getElementById(id).addEventListener('click', function () { dlg.close(); }); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

      return {
        // the tick box for one room. opts: { dark: true on a dark card, cls: extra classes for spacing }
        checkbox: function (room, opts) {
          opts = opts || {};
          var label = el('label', 'flex min-h-[44px] cursor-pointer items-center gap-3 text-base font-medium ' + (opts.dark ? 'text-white ' : '') + (opts.cls || ''));
          var cb = el('input', 'h-5 w-5 shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
            (opts.dark ? 'accent-lime focus-visible:ring-lime focus-visible:ring-offset-forest' : 'accent-forest focus-visible:ring-forest'));
          cb.type = 'checkbox'; cb.setAttribute('data-cmp', room.id); cb.setAttribute('aria-label', 'Compare ' + room.name);
          cb.checked = picked.indexOf(room.id) !== -1; cb.disabled = !cb.checked && picked.length >= MAX;
          cb.addEventListener('change', function () { toggle(room.id, cb.checked); });
          label.appendChild(cb); label.appendChild(el('span', null, 'Compare'));
          return label;
        },
        open: open,
        setPicked: function (ids) { picked = ids.slice(0, MAX); syncBoxes(); updateBar(); },
        clear: function () { picked = []; syncBoxes(); updateBar(); }
      };
    }
  };
})();