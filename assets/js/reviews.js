/*
  Student reviews for Ariate Dormitory. Needs assets/js/reservation.js (window.HB) loaded first.

  Who can review: a student whose stay is confirmed (paid) and whose move-in date has arrived, or whose stay has ended.
  One review per stay (per reservation). The student can edit it later. Commute and safety live here, as reviews.

  Stored in localStorage "homebase_reviews" (PHP + MySQL phase: a "reviews" table with the same columns):
    { id, reservationId, userId, authorName ("Zyrus A."), roomId, roomName,
      ratings: { overall, commute, safety, cleanliness } (each a whole number 1 to 5), comment, createdAt, updatedAt }

  No review is made up: with no reviews, every place that shows them says so.
*/
(function () {
  var KEY = 'homebase_reviews';
  var CATS = [['overall', 'Overall'], ['commute', 'Commute'], ['safety', 'Safety'], ['cleanliness', 'Cleanliness']];
  var PILL = 'flex min-h-[44px] items-center justify-center rounded-xl border border-line bg-white px-3 text-center text-base font-medium text-ink transition-colors hover:border-[#8FA397] peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-forest peer-focus-visible:ring-offset-2';
  var DIALOG = 'max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';

  function readAll() { try { var r = localStorage.getItem(KEY), v = r ? JSON.parse(r) : []; return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeAll(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function today() { var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function fmt(s) { var d = new Date(s && String(s).length === 10 ? s + 'T00:00:00' : s); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }); }
  function shortName(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return 'A student';
    return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0).toUpperCase() + '.' : p[0];
  }
  function avg(list, key) {
    if (!list.length) return null;
    var s = 0; list.forEach(function (r) { s += r.ratings[key]; });
    return Math.round(s / list.length * 10) / 10;
  }
  function ratingLine(r) { return CATS.map(function (c) { return c[1] + ' ' + r.ratings[c[0]] + '/5'; }).join(', '); }

  function openDialog(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function makeDialog(id, width) {
    var d = document.getElementById(id);
    if (!d) { d = el('dialog', DIALOG + ' ' + width); d.id = id; document.body.appendChild(d); d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); }
    return d;
  }

  var HBR = {
    CATS: CATS,
    list: function () { return readAll().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }); },
    forRoom: function (roomId) { return HBR.list().filter(function (r) { return r.roomId === roomId; }); },
    summary: function (list) {
      list = list || HBR.list();
      var s = { count: list.length };
      CATS.forEach(function (c) { s[c[0]] = avg(list, c[0]); });
      return s;
    },
    mine: function (reservationId) { return readAll().filter(function (r) { return r.reservationId === reservationId; })[0] || null; },
    canReview: function (res) { return res.status === 'ended' || (res.status === 'confirmed' && String(res.moveIn) <= today()); },

    save: function (user, res, ratings, comment) {
      if (!user || !res || res.userId !== user.id) return { ok: false, error: 'You can only review your own stay.' };
      if (!HBR.canReview(res)) return { ok: false, error: 'You can review this stay after your move-in date.' };
      for (var i = 0; i < CATS.length; i++) {
        var v = ratings[CATS[i][0]];
        if (!(v >= 1 && v <= 5) || Math.floor(v) !== v) return { ok: false, error: 'Rate every part from 1 to 5.' };
      }
      var all = readAll(), now = new Date().toISOString(), text = String(comment || '').trim().slice(0, 500);
      var hit = all.filter(function (r) { return r.reservationId === res.id; })[0];
      if (hit) { hit.ratings = ratings; hit.comment = text; hit.updatedAt = now; hit.authorName = shortName(user.name); }
      else all.push({ id: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), reservationId: res.id, userId: user.id, authorName: shortName(user.name), roomId: res.roomId, roomName: res.roomName, ratings: ratings, comment: text, createdAt: now, updatedAt: now });
      return writeAll(all) ? { ok: true } : { ok: false, error: 'Your browser blocked saving the review. Allow site data and try again.' };
    },

    // ---- the list of reviews (all, or one room) ----
    openList: function (opts) {
      opts = opts || {};
      var d = makeDialog('hb-reviews', 'max-w-xl');
      function draw(roomId, roomName) {
        var list = roomId ? HBR.forRoom(roomId) : HBR.list(), s = HBR.summary(list);
        d.textContent = '';
        var box = el('div', 'p-6');
        box.appendChild(el('h2', 'font-display text-xl font-bold tracking-tight', roomId ? 'Reviews of ' + roomName : 'Student reviews'));
        box.appendChild(el('p', 'mt-1 text-base text-muted', 'Ariate Dormitory' + (list.length ? ', ' + list.length + ' review' + (list.length === 1 ? '' : 's') : '')));
        if (list.length) {
          box.appendChild(el('p', 'mt-3 text-base font-medium', CATS.map(function (c) { return c[1] + ' ' + s[c[0]] + '/5'; }).join(', ')));
        }
        if (!list.length) {
          box.appendChild(el('p', 'mt-4 text-base text-muted', roomId ? 'No one has reviewed this room yet.' : 'No reviews yet. Students who stayed at Ariate Dormitory can review after their stay.'));
        } else {
          var ul = el('ul', 'mt-4 space-y-3');
          list.forEach(function (r) {
            var li = el('li', 'rounded-xl border border-line p-4');
            li.appendChild(el('p', 'font-semibold', r.authorName + ' stayed in ' + r.roomName));
            li.appendChild(el('p', 'text-sm text-muted', fmt(r.createdAt)));
            li.appendChild(el('p', 'mt-2 text-base', ratingLine(r)));
            if (r.comment) li.appendChild(el('p', 'mt-2 break-words text-base', r.comment));
            ul.appendChild(li);
          });
          box.appendChild(ul);
        }
        var row = el('div', 'mt-5 flex flex-wrap gap-2');
        if (roomId) { var all = el('button', 'btn btn-outline', 'See all reviews'); all.type = 'button'; all.addEventListener('click', function () { draw(); }); row.appendChild(all); }
        var close = el('button', 'btn', 'Close'); close.type = 'button'; close.addEventListener('click', function () { d.close(); }); row.appendChild(close);
        box.appendChild(row); d.appendChild(box);
      }
      draw(opts.roomId, opts.roomName);
      openDialog(d);
    },

    // ---- write or edit a review ----
    openWrite: function (user, res, onSaved) {
      var d = makeDialog('hb-review-write', 'max-w-[460px]');
      var mine = HBR.mine(res.id);
      d.textContent = '';
      var box = el('div', 'p-6');
      box.appendChild(el('h2', 'font-display text-xl font-bold tracking-tight', (mine ? 'Edit your review of ' : 'Review your stay in ') + res.roomName));
      box.appendChild(el('p', 'mt-1 text-base text-muted', 'Rate each part from 1 (poor) to 5 (excellent). Other students will read this.'));
      var form = el('form', 'mt-5 space-y-4'); form.noValidate = true;
      var err = el('p', 'rounded-xl border border-danger/30 bg-[#FEF3F2] px-3.5 py-3 text-sm font-medium text-danger'); err.setAttribute('role', 'alert'); err.hidden = true;
      form.appendChild(err);
      CATS.forEach(function (c) {
        var fs = el('fieldset'); fs.appendChild(el('legend', 'mb-1.5 block text-sm font-medium', c[1]));
        var grid = el('div', 'grid grid-cols-5 gap-2');
        for (var n = 1; n <= 5; n++) {
          var label = el('label', 'relative block cursor-pointer');
          var input = el('input', 'peer sr-only'); input.type = 'radio'; input.name = 'r-' + c[0]; input.value = String(n);
          input.setAttribute('aria-label', c[1] + ' ' + n + ' out of 5');
          input.checked = !!mine && mine.ratings[c[0]] === n;
          label.appendChild(input); label.appendChild(el('span', PILL, String(n))); grid.appendChild(label);
        }
        fs.appendChild(grid); form.appendChild(fs);
      });
      var cw = el('div'); var cl = el('label', 'mb-1.5 block text-sm font-medium', 'Comment (optional)'); cl.setAttribute('for', 'hb-rev-comment');
      var ta = el('textarea', 'block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/30');
      ta.id = 'hb-rev-comment'; ta.rows = 4; ta.maxLength = 500; ta.value = mine ? mine.comment : '';
      cw.appendChild(cl); cw.appendChild(ta); form.appendChild(cw);
      var row = el('div', 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end');
      var cancel = el('button', 'btn btn-outline', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', function () { d.close(); });
      var send = el('button', 'btn', mine ? 'Save changes' : 'Post review'); send.type = 'submit';
      row.appendChild(cancel); row.appendChild(send); form.appendChild(row);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); err.hidden = true;
        var ratings = {};
        CATS.forEach(function (c) { var ch = form.querySelector('input[name="r-' + c[0] + '"]:checked'); ratings[c[0]] = ch ? Number(ch.value) : 0; });
        var res2 = HBR.save(user, res, ratings, ta.value);
        if (!res2.ok) { err.textContent = res2.error; err.hidden = false; return; }
        d.close(); if (onSaved) onSaved();
      });
      box.appendChild(form); d.appendChild(box);
      openDialog(d);
    },

    // ---- small pieces other pages drop in ----
    // a strip with the averages and a "Read reviews" button
    summaryBox: function () {
      var s = HBR.summary();
      var box = el('div', 'rounded-[20px] border border-line bg-tint p-5');
      box.appendChild(el('p', 'font-display text-lg font-semibold tracking-tight', 'What students say'));
      if (!s.count) {
        box.appendChild(el('p', 'mt-1 text-base text-muted', 'No reviews yet. Students who stayed at Ariate Dormitory can review it after their stay.'));
        return box;
      }
      box.appendChild(el('p', 'mt-1 text-base', s.overall + ' out of 5 overall, from ' + s.count + ' review' + (s.count === 1 ? '' : 's') + '. ' +
        'Commute ' + s.commute + '/5, safety ' + s.safety + '/5, cleanliness ' + s.cleanliness + '/5.'));
      var b = el('button', 'mt-2 inline-flex min-h-[44px] items-center rounded font-semibold text-forest underline underline-offset-4 outline-none hover:text-forest-deep focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2', 'Read reviews');
      b.type = 'button'; b.addEventListener('click', function () { HBR.openList(); });
      box.appendChild(b);
      return box;
    },
    // a line about one room's reviews
    roomLine: function (room) {
      var list = HBR.forRoom(room.id), box = el('div', 'mt-3');
      if (!list.length) { box.appendChild(el('p', 'text-sm text-muted', 'No reviews of this room yet.')); return box; }
      var o = HBR.summary(list).overall;
      box.appendChild(el('p', 'text-sm text-muted', list.length + ' review' + (list.length === 1 ? '' : 's') + ' of this room, ' + o + ' out of 5 overall.'));
      var b = el('button', 'inline-flex min-h-[44px] items-center rounded font-semibold text-forest underline underline-offset-4 outline-none hover:text-forest-deep focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2', 'Read reviews of ' + room.name);
      b.type = 'button'; b.addEventListener('click', function () { HBR.openList({ roomId: room.id, roomName: room.name }); });
      box.appendChild(b);
      return box;
    },
    // on Home: the student's stays that can be reviewed
    stayBlock: function (user, reservations, onChange) {
      var stays = reservations.filter(function (r) { return r.status === 'confirmed' || r.status === 'ended'; });
      if (!stays.length) return null;
      var box = el('div', 'mt-5 rounded-xl border border-line p-4');
      box.appendChild(el('p', 'font-semibold', 'Review your stay'));
      stays.forEach(function (r) {
        var row = el('div', 'mt-3 flex flex-wrap items-center justify-between gap-3');
        var left = el('div', 'min-w-0'); left.appendChild(el('p', 'text-base font-medium', r.roomName));
        if (!HBR.canReview(r)) {
          left.appendChild(el('p', 'text-sm text-muted', 'You can review this stay after your move-in date, ' + fmt(r.moveIn) + '.'));
          row.appendChild(left);
        } else {
          var m = HBR.mine(r.id);
          left.appendChild(el('p', 'text-sm text-muted', m ? 'Your review: ' + ratingLine(m) : 'How was it? Rate the commute, safety and more.'));
          row.appendChild(left);
          var b = el('button', 'btn btn-outline', m ? 'Edit review' : 'Write a review'); b.type = 'button';
          b.setAttribute('aria-label', (m ? 'Edit your review of ' : 'Write a review of ') + r.roomName);
          b.addEventListener('click', function () { HBR.openWrite(user, r, onChange); });
          row.appendChild(b);
        }
        box.appendChild(row);
      });
      return box;
    }
  };

  window.HBReviews = HBR;
})();