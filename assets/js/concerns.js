/*
  Concerns: a tenant tells the office about a problem during their stay, and follows it until it is fixed.
  Used by: concerns.html (tenant), landlord-concerns.html (landlord), landlord.html (the "Open concerns" tile).
  Load order: auth.js, rooms.js, reservation.js, then this file. Needs window.HB.

  Who can report: a student whose stay is confirmed (paid) and whose move-in date has arrived (HB.currentStay).
  Who can see a concern: the student who wrote it and the landlord. Nobody else, ever.

  Stored in localStorage "homebase_concerns" as one list. Each item has the columns a database table would have:
    { id, userId, studentName, studentEmail, reservationId, roomId, roomName,
      category, description, urgent: true | false, photo: "" | "data:image/jpeg;base64,...",
      status: "received" | "in_progress" | "resolved",
      updates: [ { id, kind: "note" | "status" | "reopen" | "confirm", by: "student" | "landlord", name, text, status, at } ],
      createdAt, updatedAt, resolvedAt, confirmedAt, reopenedAt }

  Life of a concern: received -> in_progress -> resolved (by the office) -> the tenant confirms "it is fixed" (closed)
  or reopens it (back to received). A closed concern takes no more notes.
  Rule used by the landlord sidebar badge (assets/js/landlord-shell.js): "new" = status is "received".

  SUPABASE LATER: only the `store` object touches storage. Swap its two functions for table reads and writes, keep the photo in
  Supabase Storage (not in the row), and replace the "storage" event listeners with a realtime subscription.
  Supabase calls are async, so the functions that call `store` will return Promises at that point. Nothing is connected yet.
*/
(function () {
  'use strict';

  var KEY = 'homebase_concerns';
  var CATEGORIES = ['Repairs', 'Water and electricity', 'Cleanliness', 'Noise or housemates', 'Billing', 'Safety', 'Other'];
  var STATUS_TEXT = { received: 'Received', in_progress: 'In progress', resolved: 'Resolved' };
  var MIN_DESC = 10, MAX_DESC = 500, MAX_NOTE = 300;

  // ---- storage: the ONE place to swap for Supabase ----
  var store = {
    all: function () { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } },
    save: function (list) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { return false; }
      if (window.HB_SYNC) HB_SYNC.saved('concerns', list);
      try { window.dispatchEvent(new Event('hb-concerns')); } catch (e) {} // the storage event only reaches OTHER tabs
      return true;
    }
  };

  function nowIso() { return new Date().toISOString(); }
  function newId(p) { return (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); }
  function roleOf(u) { return u && u.role === 'landlord' ? 'landlord' : 'student'; }
  function isClosed(c) { return c.status === 'resolved' && !!c.confirmedAt; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function when(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }
  function day(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }); }

  // ---- small visual helpers ----
  var ICO = {
    Repairs: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z"/>',
    'Water and electricity': '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
    Cleanliness: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    'Noise or housemates': '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>',
    Billing: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    Safety: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    Other: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'
  };
  function icon(name, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', cls || 'h-5 w-5'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICO[name] || ICO.Other;
    return s;
  }
  function roomThumb(roomId, cls) {
    var room = null; try { room = HB.getRooms().filter(function (r) { return r.id === roomId; })[0] || null; } catch (e) {}
    var f = el('span', 'shrink-0 overflow-hidden rounded-xl bg-track ' + cls); f.setAttribute('aria-hidden', 'true');
    if (room) { var i = document.createElement('img'); i.src = HB.roomImage(room); i.alt = ''; i.className = 'h-full w-full object-cover'; f.appendChild(i); }
    return f;
  }
  function personDot(userId, name, cls) {
    var prof = (window.HB_AUTH && HB_AUTH.getProfile) ? (HB_AUTH.getProfile(userId) || {}) : {};
    var a = el('span', 'grid shrink-0 place-items-center overflow-hidden rounded-full bg-forest font-display font-semibold text-white ' + cls); a.setAttribute('aria-hidden', 'true');
    if (prof.photo && /^(data:image\/|https?:)/.test(prof.photo)) { var i = document.createElement('img'); i.src = prof.photo; i.alt = ''; i.className = 'h-full w-full object-cover'; a.appendChild(i); }
    else a.textContent = String(name || '?').charAt(0).toUpperCase();
    return a;
  }
  function tile(n, label, extra, on) {
    var t = el('div', 'rounded-[20px] border p-4 ' + (on ? 'border-forest bg-tint' : 'border-line bg-white'));
    t.appendChild(el('p', 'font-display text-3xl font-bold leading-none tracking-tight', String(n)));
    t.appendChild(el('p', 'mt-1.5 text-sm ' + (on ? 'font-semibold text-forest' : 'text-muted'), label));
    if (extra) { var x = el('p', 'mt-2'); x.appendChild(extra); t.appendChild(x); }
    return t;
  }
  function dashed(iconName, title, line) {
    var d = el('div', 'rounded-[20px] border border-dashed border-edge p-8 text-center');
    var ic = el('span', 'mx-auto grid h-14 w-14 place-items-center rounded-full bg-tint text-forest'); ic.appendChild(icon(iconName, 'h-7 w-7')); d.appendChild(ic);
    d.appendChild(el('p', 'card-title mt-3 text-muted', title));
    if (line) d.appendChild(el('p', 'note mt-1', line));
    return d;
  }

  // Received > In progress > Resolved > Fixed, as four connected dots
  function stepsRow(c) {
    var labels = ['Received', 'In progress', 'Resolved', 'Fixed'];
    var idx = isClosed(c) ? 3 : c.status === 'resolved' ? 2 : c.status === 'in_progress' ? 1 : 0;
    var ol = el('ol', 'mt-4 grid'); ol.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))'; ol.setAttribute('aria-label', 'Progress');
    labels.forEach(function (l, i) {
      var st = (isClosed(c) || i < idx) ? 'done' : i === idx ? 'now' : 'todo';
      var li = el('li', 'relative flex flex-col items-center text-center');
      if (i > 0) { var bar = el('span', 'absolute right-1/2 top-[11px] h-0.5 w-full ' + (st === 'todo' ? 'bg-line' : 'bg-forest')); bar.setAttribute('aria-hidden', 'true'); li.appendChild(bar); }
      var dot = el('span', 'relative z-10 grid h-6 w-6 place-items-center rounded-full border-2 ' + (st === 'done' ? 'border-forest bg-forest text-white' : st === 'now' ? 'border-forest bg-white text-forest' : 'border-line bg-white text-muted'));
      if (st === 'done') dot.appendChild(icon('check', 'h-3.5 w-3.5')); else dot.appendChild(el('span', 'text-xs font-semibold', String(i + 1)));
      li.appendChild(dot);
      var lab = el('span', 'mt-1.5 px-0.5 text-xs sm:text-sm ' + (st === 'todo' ? 'text-muted' : 'font-semibold'), l);
      lab.appendChild(el('span', 'sr-only', st === 'done' ? ' (done)' : st === 'now' ? ' (now)' : ' (next)'));
      li.appendChild(lab); ol.appendChild(li);
    });
    return ol;
  }

  // ---------------------------------------------------------------------------------------------------------------- data
  var C = {
    CATEGORIES: CATEGORIES,
    MAX_DESC: MAX_DESC,
    MAX_NOTE: MAX_NOTE,

    all: function () { return store.all(); },
    get: function (id) { return store.all().filter(function (c) { return c.id === id; })[0] || null; },
    forStudent: function (userId) {
      return store.all().filter(function (c) { return c.userId === userId; }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    },
    openCount: function () { return store.all().filter(function (c) { return c.status !== 'resolved'; }).length; },
    newCount: function () { return store.all().filter(function (c) { return c.status === 'received'; }).length; },
    isClosed: isClosed,

    // data: { category, description, urgent, photo }. stay = HB.currentStay(user.id).
    create: function (user, stay, data) {
      if (roleOf(user) !== 'student' || !stay) return { ok: false, error: 'You can report a concern once your stay has started.' };
      if (CATEGORIES.indexOf(data.category) < 0) return { ok: false, error: 'Choose what the concern is about.', field: 'category' };
      var desc = String(data.description || '').trim();
      if (desc.length < MIN_DESC) return { ok: false, error: 'Describe the problem in at least ' + MIN_DESC + ' characters.', field: 'description' };
      if (desc.length > MAX_DESC) return { ok: false, error: 'Please keep it under ' + MAX_DESC + ' characters.', field: 'description' };
      var photo = String(data.photo || '');
      if (photo && photo.indexOf('data:image/') !== 0) photo = '';
      var ts = nowIso();
      var c = {
        id: newId('con'), userId: user.id, studentName: user.name, studentEmail: user.email, reservationId: stay.id,
        roomId: stay.roomId, roomName: stay.roomName, category: data.category, description: desc, urgent: !!data.urgent, photo: photo,
        status: 'received', updates: [], createdAt: ts, updatedAt: ts, resolvedAt: '', confirmedAt: '', reopenedAt: ''
      };
      var list = store.all(); list.push(c);
      if (!store.save(list)) return { ok: false, error: 'Your browser could not save this. Allow site data, or try again without the photo.' };
      return { ok: true, concern: c };
    },

    // a note from either side, while the concern is not closed
    addNote: function (id, user, text) {
      var body = String(text || '').trim();
      if (!body) return { ok: false, error: 'Write a note first.' };
      if (body.length > MAX_NOTE) return { ok: false, error: 'Notes can be up to ' + MAX_NOTE + ' characters.' };
      return mutate(id, user, function (c, role) {
        if (isClosed(c)) return 'This concern is closed.';
        push(c, { kind: 'note', by: role, name: user.name, text: body, status: '' });
      });
    },

    // landlord only: move it to in_progress or resolved, with an optional note
    setStatus: function (id, user, status, note) {
      if (roleOf(user) !== 'landlord') return { ok: false, error: 'Only the office can change the status.' };
      if (status !== 'in_progress' && status !== 'resolved') return { ok: false, error: 'That status is not available.' };
      var body = String(note || '').trim();
      if (body.length > MAX_NOTE) return { ok: false, error: 'Notes can be up to ' + MAX_NOTE + ' characters.' };
      return mutate(id, user, function (c) {
        if (isClosed(c)) return 'The tenant already confirmed this one is fixed.';
        if (c.status === status) return 'It is already marked ' + STATUS_TEXT[status].toLowerCase() + '.';
        c.status = status; c.resolvedAt = status === 'resolved' ? nowIso() : '';
        push(c, { kind: 'status', by: 'landlord', name: user.name, text: body, status: status });
      });
    },

    // tenant only, on their own concern, after the office marked it resolved
    confirmFixed: function (id, user) {
      return mutate(id, user, function (c, role) {
        if (role !== 'student') return 'Only the tenant can confirm this.';
        if (c.status !== 'resolved' || c.confirmedAt) return 'This concern is not waiting for your confirmation.';
        c.confirmedAt = nowIso();
        push(c, { kind: 'confirm', by: 'student', name: user.name, text: '', status: '' });
      });
    },
    reopen: function (id, user) {
      return mutate(id, user, function (c, role) {
        if (role !== 'student') return 'Only the tenant can reopen this.';
        if (c.status !== 'resolved' || c.confirmedAt) return 'This concern is not waiting for your confirmation.';
        c.status = 'received'; c.resolvedAt = ''; c.reopenedAt = nowIso();
        push(c, { kind: 'reopen', by: 'student', name: user.name, text: '', status: '' });
      });
    }
  };

  function push(c, u) { var at = nowIso(); u.id = newId('upd'); u.at = at; c.updates.push(u); c.updatedAt = at; }
  // finds the concern, checks the user may touch it, runs fn(concern, role). fn returns an error string or nothing.
  function mutate(id, user, fn) {
    var list = store.all(), c = list.filter(function (x) { return x.id === id; })[0], role = roleOf(user);
    if (!c || !user || (role === 'student' && c.userId !== user.id)) return { ok: false, error: 'This concern is not available.' };
    var err = fn(c, role); if (err) return { ok: false, error: err };
    if (!store.save(list)) return { ok: false, error: 'Your browser could not save this. Allow site data and try again.' };
    return { ok: true, concern: c };
  }

  // ----------------------------------------------------------------------------------------------------------------- UI
  function statusChip(c, role) {
    if (isClosed(c)) return HB.chip('Fixed', 'ok');
    if (c.status === 'resolved') return HB.chip(role === 'student' ? 'Marked resolved' : 'Resolved', 'ok');
    if (c.status === 'received' && c.reopenedAt) return HB.chip('Reopened', 'bad');
    return HB.chip(STATUS_TEXT[c.status], 'warn');
  }

  // a photo, large, in a window
  function showPhoto(src, alt) {
    var dlg = document.getElementById('hb-photo');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'hb-photo'; dlg.setAttribute('aria-label', 'Photo');
      dlg.className = 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-auto rounded-2xl border border-line bg-white p-4 text-ink shadow-xl backdrop:bg-ink/50';
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = '';
    var img = document.createElement('img'); img.src = src; img.alt = alt; img.className = 'mx-auto max-h-[70vh] w-auto max-w-full rounded-xl';
    var close = el('button', 'btn mt-4', 'Close'); close.type = 'button'; close.addEventListener('click', function () { dlg.close(); });
    dlg.appendChild(img); dlg.appendChild(close);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    close.focus();
  }

  function timeline(c, role) {
    if (!c.updates.length) return null;
    var ol = el('ol', 'space-y-3'); ol.setAttribute('aria-label', 'Updates');
    c.updates.forEach(function (u) {
      var mine = u.by === role;
      var who = u.by === 'landlord' ? 'Office' : (mine ? 'You' : (c.studentName || 'Student'));
      var li = el('li', 'flex gap-3');
      li.appendChild(u.by === 'landlord'
        ? (function () { var o = el('span', 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-xs font-semibold text-white', 'O'); o.setAttribute('aria-hidden', 'true'); return o; })()
        : personDot(c.userId, c.studentName, 'h-8 w-8 text-xs'));
      var body = el('div', 'min-w-0 flex-1');
      var line = el('p', 'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm');
      line.appendChild(el('span', 'font-semibold text-forest', who));
      line.appendChild(el('span', 'text-muted', when(u.at)));
      var chip = u.kind === 'status' ? HB.chip(STATUS_TEXT[u.status], u.status === 'resolved' ? 'ok' : 'warn')
        : u.kind === 'reopen' ? HB.chip('Reopened, not fixed yet', 'bad')
        : u.kind === 'confirm' ? HB.chip('Fixed', 'ok') : null;
      if (chip) line.appendChild(chip);
      body.appendChild(line);
      if (u.text) body.appendChild(el('p', 'mt-1 whitespace-pre-wrap break-words rounded-xl rounded-tl-sm border border-line bg-tint px-3 py-2 text-base', u.text));
      li.appendChild(body); ol.appendChild(li);
    });
    var wrap = el('div', 'mt-4 border-t border-line pt-4');
    if (c.updates.length > 2) {
      var d = el('details'); var sm = el('summary', 'inline-flex min-h-[44px] cursor-pointer items-center rounded font-semibold text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest', c.updates.length + ' updates');
      d.appendChild(sm); ol.className += ' mt-2'; d.appendChild(ol); wrap.appendChild(d);
    } else wrap.appendChild(ol);
    return wrap;
  }

  // the shared top of a card: category icon, what state it is in, which room, the words, the photo, the four steps
  function cardTop(c, role) {
    var live = c.urgent && !isClosed(c) && c.status !== 'resolved';
    var art = el('article', 'rounded-[20px] border bg-white p-4 sm:p-5 ' + (live ? 'border-danger' : 'border-line'));
    var head = el('div', 'flex items-start gap-3');
    var ic = el('span', 'grid h-11 w-11 shrink-0 place-items-center rounded-xl ' + (live ? 'bg-danger-soft text-danger' : 'bg-tint text-forest')); ic.appendChild(icon(c.category, 'h-6 w-6'));
    head.appendChild(ic);
    var mid = el('div', 'min-w-0 flex-1');
    var line = el('div', 'flex flex-wrap items-center justify-between gap-2');
    line.appendChild(el('h3', 'font-display text-lg font-semibold tracking-tight', c.category));
    var chips = el('div', 'flex flex-wrap gap-2');
    if (c.urgent && c.status !== 'resolved') chips.appendChild(HB.chip('Urgent', 'bad'));
    chips.appendChild(statusChip(c, role));
    line.appendChild(chips); mid.appendChild(line);
    var sub = el('p', 'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted');
    if (role === 'landlord') { sub.appendChild(personDot(c.userId, c.studentName, 'h-6 w-6 text-xs')); sub.appendChild(el('span', 'font-medium text-ink', c.studentName)); }
    sub.appendChild(el('span', '', c.roomName)); sub.appendChild(el('span', '', day(c.createdAt)));
    mid.appendChild(sub); head.appendChild(mid); art.appendChild(head);

    art.appendChild(el('p', 'mt-3 whitespace-pre-wrap break-words text-base', c.description));
    if (c.photo) {
      var pb = el('button', 'mt-3 block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-forest'); pb.type = 'button';
      pb.setAttribute('aria-label', 'View the photo attached to this concern');
      var img = document.createElement('img'); img.src = c.photo; img.alt = 'Photo attached to this concern'; img.className = 'max-h-40 w-auto rounded-xl border border-line';
      pb.appendChild(img); pb.addEventListener('click', function () { showPhoto(c.photo, 'Photo attached to this concern'); });
      art.appendChild(pb);
    }
    art.appendChild(stepsRow(c));
    return art;
  }

  function errLine() { var p = el('p', 'err hidden'); p.setAttribute('role', 'alert'); return p; }
  function showErr(p, msg) { p.textContent = msg; p.classList.remove('hidden'); }

  // ---- tenant: one concern ----
  function studentCard(c, user, refresh) {
    var art = cardTop(c, 'student'), tl = timeline(c, 'student'); if (tl) art.appendChild(tl);
    var err = errLine();
    if (isClosed(c)) {
      art.appendChild(el('p', 'mt-4 text-sm text-muted', 'Fixed on ' + day(c.confirmedAt)));
    } else if (c.status === 'resolved') {
      var box = el('div', 'mt-4 rounded-xl border border-forest bg-tint p-4');
      var q = el('p', 'flex items-center gap-2 text-base font-semibold'); q.appendChild(icon('check', 'h-5 w-5 text-forest')); q.appendChild(document.createTextNode('Marked resolved. Is it fixed?'));
      box.appendChild(q);
      var row = el('div', 'mt-3 flex flex-col gap-2 sm:flex-row');
      var yes = el('button', 'btn', 'Yes, it is fixed'); yes.type = 'button';
      var no = el('button', 'btn btn-outline', 'Not fixed, reopen'); no.type = 'button';
      yes.addEventListener('click', function () { var r = C.confirmFixed(c.id, user); if (!r.ok) showErr(err, r.error); else refresh(); });
      no.addEventListener('click', function () { var r = C.reopen(c.id, user); if (!r.ok) showErr(err, r.error); else refresh(); });
      row.appendChild(yes); row.appendChild(no); box.appendChild(row); box.appendChild(err); art.appendChild(box);
    } else {
      var form = el('form', 'mt-4'); form.noValidate = true;
      var lab = el('label', 'sr-only', 'Add a note to this concern'); var id = 'note-' + c.id; lab.setAttribute('for', id);
      var line = el('div', 'flex gap-2');
      var inp = el('input', 'field min-w-0 flex-1'); inp.id = id; inp.type = 'text'; inp.maxLength = C.MAX_NOTE; inp.placeholder = 'Add a note';
      var add = el('button', 'btn btn-outline', 'Add note'); add.type = 'submit';
      line.appendChild(inp); line.appendChild(add);
      form.appendChild(lab); form.appendChild(line); form.appendChild(err);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); err.classList.add('hidden'); inp.removeAttribute('aria-invalid');
        var r = C.addNote(c.id, user, inp.value);
        if (!r.ok) { inp.setAttribute('aria-invalid', 'true'); showErr(err, r.error); inp.focus(); return; }
        refresh();
      });
      art.appendChild(form);
    }
    return art;
  }

  // ---- landlord: one concern ----
  function landlordCard(c, user, refresh) {
    var art = cardTop(c, 'landlord'), tl = timeline(c, 'landlord'); if (tl) art.appendChild(tl);
    var err = errLine();
    if (isClosed(c)) {
      art.appendChild(el('p', 'mt-4 text-sm text-muted', 'The tenant confirmed it on ' + day(c.confirmedAt)));
    } else {
      var form = el('form', 'mt-4'); form.noValidate = true;
      var id = 'upd-' + c.id, lab = el('label', 'sr-only', 'Update for ' + c.studentName); lab.setAttribute('for', id);
      var ta = el('textarea', 'field'); ta.id = id; ta.rows = 2; ta.maxLength = C.MAX_NOTE;
      ta.placeholder = c.status === 'resolved' ? 'Waiting for the tenant. You can still add a note.' : 'Update for the tenant, for example: plumber comes Thursday';
      var row = el('div', 'mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap');
      function act(label, cls, fn) { var b = el('button', 'btn ' + cls, label); b.type = 'button'; b.addEventListener('click', function () { err.classList.add('hidden'); var r = fn(); if (!r.ok) showErr(err, r.error); else refresh(c.id); }); row.appendChild(b); }
      if (c.status === 'received') act('Start work', 'btn-outline', function () { return C.setStatus(c.id, user, 'in_progress', ta.value); });
      if (c.status !== 'resolved') act('Mark resolved', '', function () { return C.setStatus(c.id, user, 'resolved', ta.value); });
      act('Post note only', 'btn-outline', function () { return C.addNote(c.id, user, ta.value); });
      form.appendChild(lab); form.appendChild(ta); form.appendChild(row); form.appendChild(err);
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      art.appendChild(form);
    }
    var ml = el('a', 'btn btn-outline mt-3 gap-2 !px-4 text-sm'); ml.href = 'landlord-messages.html?res=' + encodeURIComponent(c.reservationId);
    ml.appendChild(icon('chat', 'h-4 w-4')); ml.appendChild(document.createTextNode('Message'));
    ml.setAttribute('aria-label', 'Message ' + c.studentName);
    art.appendChild(ml);
    return art;
  }

  // downsizes a photo so it fits in browser storage: longest side 800px, JPEG
  function shrink(file, cb) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var s = Math.min(1, 800 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      cb(null, cv.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb('error'); };
    img.src = url;
  }

  // ---- the "Report a concern" window (tenant) ----
  C.openReport = function (user, stay, onDone) {
    var dlg = document.getElementById('hb-concern');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'hb-concern'; dlg.setAttribute('aria-labelledby', 'hb-con-title');
      dlg.className = 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-[480px] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = '';
    var box = el('div', 'p-6');
    var h = el('h2', 'font-display text-xl font-bold tracking-tight', 'Report a concern'); h.id = 'hb-con-title';
    box.appendChild(h);
    box.appendChild(el('p', 'mt-1 text-base text-muted', stay.roomName + '. Only you and the landlord can see this.'));
    var form = el('form', 'mt-5 space-y-5'); form.noValidate = true;

    var top = el('p', 'err hidden rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger !mt-0'); top.setAttribute('role', 'alert');
    form.appendChild(top);

    var fs = el('fieldset'); fs.appendChild(el('legend', 'label', 'What is it about?'));
    var grid = el('div', 'grid grid-cols-3 gap-2');
    CATEGORIES.forEach(function (name, i) {
      var lab = el('label', 'relative block cursor-pointer'), inp = el('input', 'peer sr-only'); inp.type = 'radio'; inp.name = 'hb-con-cat'; inp.value = name;
      var span = el('span', 'choice !min-h-[76px] flex-col gap-1.5 !px-1 !py-2 text-xs leading-tight'); span.appendChild(icon(name, 'h-6 w-6')); span.appendChild(document.createTextNode(name));
      lab.appendChild(inp); lab.appendChild(span); grid.appendChild(lab);
    });
    fs.appendChild(grid); fs.appendChild(errLine()); form.appendChild(fs);
    var catErr = fs.lastChild;

    var dw = el('div'); var dl = el('label', 'label', 'What is the problem?'); dl.setAttribute('for', 'hb-con-desc');
    var ta = el('textarea', 'field'); ta.id = 'hb-con-desc'; ta.rows = 4; ta.maxLength = MAX_DESC;
    var hint = el('p', 'mt-1.5 text-sm text-muted', 'Where is it, and when did it start?');
    var descErr = errLine(); dw.appendChild(dl); dw.appendChild(ta); dw.appendChild(hint); dw.appendChild(descErr); form.appendChild(dw);

    var ul = el('label', 'flex min-h-[44px] cursor-pointer items-start gap-3 text-base');
    var urgent = el('input', 'mt-1 h-5 w-5 shrink-0'); urgent.type = 'checkbox';
    ul.appendChild(urgent); ul.appendChild(el('span', null, 'Urgent: no water, no power, or a safety risk')); form.appendChild(ul);

    var pw = el('div'); var pl = el('label', 'label', 'Photo (optional)'); pl.setAttribute('for', 'hb-con-photo');
    var file = el('input', 'field'); file.id = 'hb-con-photo'; file.type = 'file'; file.accept = 'image/*';
    var prev = el('div', 'mt-2 hidden'); var pimg = document.createElement('img'); pimg.alt = 'Preview of your photo'; pimg.className = 'max-h-32 w-auto rounded-xl border border-line';
    var rm = el('button', 'textlink mt-1', 'Remove photo'); rm.type = 'button'; prev.appendChild(pimg); prev.appendChild(rm);
    var photoErr = errLine(); pw.appendChild(pl); pw.appendChild(file); pw.appendChild(prev); pw.appendChild(photoErr); form.appendChild(pw);
    var photo = '';
    file.addEventListener('change', function () {
      photoErr.classList.add('hidden'); photo = ''; prev.classList.add('hidden');
      var f = file.files && file.files[0]; if (!f) return;
      if (f.type.indexOf('image/') !== 0) { showErr(photoErr, 'Choose an image file.'); file.value = ''; return; }
      if (f.size > 10 * 1024 * 1024) { showErr(photoErr, 'That photo is over 10 MB. Choose a smaller one.'); file.value = ''; return; }
      shrink(f, function (e, data) { if (e) { showErr(photoErr, 'We could not read that photo. Try another one.'); file.value = ''; return; } photo = data; pimg.src = data; prev.classList.remove('hidden'); });
    });
    rm.addEventListener('click', function () { photo = ''; file.value = ''; prev.classList.add('hidden'); file.focus(); });

    var btns = el('div', 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end');
    var cancel = el('button', 'btn btn-outline', 'Not now'); cancel.type = 'button'; cancel.addEventListener('click', function () { dlg.close(); });
    var send = el('button', 'btn', 'Send concern'); send.type = 'submit';
    btns.appendChild(cancel); btns.appendChild(send); form.appendChild(btns);

    form.addEventListener('submit', function (e) {
      e.preventDefault(); [top, catErr, descErr].forEach(function (p) { p.classList.add('hidden'); }); ta.removeAttribute('aria-invalid');
      var chosen = form.querySelector('input[name=hb-con-cat]:checked');
      var r = C.create(user, stay, { category: chosen ? chosen.value : '', description: ta.value, urgent: urgent.checked, photo: photo });
      if (!r.ok) {
        if (r.field === 'category') showErr(catErr, r.error);
        else if (r.field === 'description') { ta.setAttribute('aria-invalid', 'true'); showErr(descErr, r.error); ta.focus(); }
        else showErr(top, r.error);
        return;
      }
      dlg.close(); if (onDone) onDone(r.concern);
    });
    box.appendChild(form); dlg.appendChild(box);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  };

  function liveRefresh(root, render) {
    window.addEventListener('storage', function (e) {
      if (e.key && e.key !== KEY && e.key !== 'homebase_reservations') return;
      if (root.querySelector('textarea:focus, input:focus')) return; // do not wipe what someone is typing
      render();
    });
  }

  // ---- tenant page ----
  C.mountStudent = function (root, user) {
    function render() {
      root.innerHTML = '';
      var stay = HB.currentStay(user.id), mine = C.forStudent(user.id);

      if (stay) {
        var banner = el('div', 'flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-tint p-4 sm:p-5');
        banner.appendChild(roomThumb(stay.roomId, 'h-14 w-20'));
        var t = el('div', 'min-w-0 flex-1');
        t.appendChild(el('p', 'truncate font-display text-lg font-bold tracking-tight', stay.roomName));
        t.appendChild(el('p', 'text-sm text-muted', 'Your room'));
        banner.appendChild(t);
        var rb = el('button', 'btn', 'Report a concern'); rb.type = 'button';
        rb.addEventListener('click', function () { C.openReport(user, stay, render); });
        banner.appendChild(rb); root.appendChild(banner);

        var openN = mine.filter(function (c) { return !isClosed(c) && c.status !== 'resolved'; }).length;
        var waitN = mine.filter(function (c) { return c.status === 'resolved' && !c.confirmedAt; }).length;
        var fixedN = mine.filter(isClosed).length;
        var tiles = el('div', 'mt-4 grid grid-cols-3 gap-3');
        tiles.appendChild(tile(openN, 'Open', null, openN > 0));
        tiles.appendChild(tile(waitN, 'Is it fixed?', null, waitN > 0));
        tiles.appendChild(tile(fixedN, 'Fixed', null, false));
        root.appendChild(tiles);
      } else {
        var future = HB.forUser(user.id).filter(function (r) { return r.status === 'confirmed'; })[0];
        var wrap = dashed('lock', future ? 'Opens on your move-in date' : 'Opens when your stay starts',
          future ? day(future.moveIn + 'T00:00:00') : '');
        var home = el('a', 'btn btn-outline mt-4', 'Go to Home'); home.href = 'home.html'; wrap.appendChild(home);
        root.appendChild(wrap);
      }

      if (!mine.length) { if (stay) { var none = dashed('check', 'No concerns'); none.className += ' mt-4'; root.appendChild(none); } return; }
      function section(title, list) {
        if (!list.length) return;
        var s = el('section', 'mt-6'); s.appendChild(el('h2', 'font-display text-xl font-bold tracking-tight', title));
        var ul = el('ul', 'mt-3 space-y-3');
        list.forEach(function (c) { var li = el('li'); li.appendChild(studentCard(c, user, render)); ul.appendChild(li); });
        s.appendChild(ul); root.appendChild(s);
      }
      section('Open', mine.filter(function (c) { return !isClosed(c); }));
      section('Fixed', mine.filter(isClosed));
    }
    render(); liveRefresh(root, render);
  };

  // ---- landlord page ----
  C.mountLandlord = function (root, user) {
    var FILTERS = [['attention', 'New'], ['progress', 'In progress'], ['resolved', 'Resolved'], ['all', 'All']];
    var pinned = null; // the concern you just acted on stays in view until you pick another filter
    var filter = C.newCount() > 0 ? 'attention' : 'progress';
    if (C.newCount() === 0 && !store.all().some(function (c) { return c.status === 'in_progress'; })) filter = 'all';

    function sorted(list) {
      return list.slice().sort(function (a, b) {
        var ar = a.status === 'resolved', br = b.status === 'resolved';
        if (ar !== br) return ar ? 1 : -1;
        if (!ar && a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        return ar ? String(b.updatedAt).localeCompare(String(a.updatedAt)) : String(a.createdAt).localeCompare(String(b.createdAt)); // oldest open first
      });
    }
    function render(pinId) {
      if (typeof pinId === 'string') pinned = pinId;
      root.innerHTML = '';
      var all = store.all();
      var by = {
        attention: all.filter(function (c) { return c.status === 'received'; }),
        progress: all.filter(function (c) { return c.status === 'in_progress'; }),
        resolved: all.filter(function (c) { return c.status === 'resolved'; }),
        all: all
      };
      if (!all.length) { root.appendChild(dashed('check', 'No concerns yet')); return; }

      // the four stages, and the filter
      var bar = el('div', 'grid grid-cols-2 gap-3 md:grid-cols-4'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Filter concerns');
      FILTERS.forEach(function (f) {
        var on = filter === f[0];
        var b = el('button', 'rounded-[20px] border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 ' + (on ? 'border-forest bg-tint' : 'border-line bg-white hover:border-edge')); b.type = 'button';
        b.setAttribute('aria-pressed', String(on));
        b.appendChild(el('span', 'block font-display text-3xl font-bold leading-none tracking-tight', String(by[f[0]].length)));
        b.appendChild(el('span', 'mt-1.5 block text-sm ' + (on ? 'font-semibold text-forest' : 'text-muted'), f[1]));
        var urgentNew = f[0] === 'attention' ? by.attention.filter(function (c) { return c.urgent; }).length : 0;
        if (urgentNew) { var u = el('span', 'mt-2 block'); u.appendChild(HB.chip(urgentNew + ' urgent', 'bad')); b.appendChild(u); }
        b.addEventListener('click', function () { filter = f[0]; pinned = null; render(); });
        bar.appendChild(b);
      });
      root.appendChild(bar);

      // what is open, by type: one bar each
      var counts = {};
      all.filter(function (c) { return c.status !== 'resolved'; }).forEach(function (c) { counts[c.category] = (counts[c.category] || 0) + 1; });
      var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);
      if (cats.length) {
        var card = el('section', 'mt-4 rounded-[20px] border border-line bg-white p-4 sm:p-5'); card.setAttribute('aria-label', 'Open concerns by type');
        card.appendChild(el('h2', 'text-xs font-semibold uppercase tracking-wider text-muted', 'Open by type'));
        var ul0 = el('ul', 'mt-3 space-y-2.5'), top = counts[cats[0]];
        cats.forEach(function (name) {
          var li = el('li', 'grid grid-cols-[auto_minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3');
          var ic = el('span', 'grid h-8 w-8 place-items-center rounded-lg bg-tint text-forest'); ic.appendChild(icon(name, 'h-4 w-4')); li.appendChild(ic);
          li.appendChild(el('span', 'truncate text-sm', name));
          var track = el('span', 'h-2 overflow-hidden rounded-full bg-track'); var fill = el('span', 'block h-full rounded-full bg-forest'); fill.style.width = Math.round(100 * counts[name] / top) + '%'; track.appendChild(fill); li.appendChild(track);
          li.appendChild(el('span', 'font-display text-base font-bold', String(counts[name])));
          ul0.appendChild(li);
        });
        card.appendChild(ul0); root.appendChild(card);
      }

      var list = by[filter].slice();
      if (pinned && !list.some(function (c) { return c.id === pinned; })) { var pc = all.filter(function (c) { return c.id === pinned; })[0]; if (pc) list.push(pc); }
      list = sorted(list);
      if (!list.length) {
        var none = dashed('check', filter === 'attention' ? 'Nothing new' : 'Nothing here'); none.className += ' mt-4';
        var showAll = el('button', 'btn btn-outline mt-4', 'Show all'); showAll.type = 'button';
        showAll.addEventListener('click', function () { filter = 'all'; pinned = null; render(); });
        none.appendChild(showAll); root.appendChild(none); return;
      }
      var ul = el('ul', 'mt-4 space-y-3');
      list.forEach(function (c) { var li = el('li'); li.appendChild(landlordCard(c, user, render)); ul.appendChild(li); });
      root.appendChild(ul);
    }
    render(); liveRefresh(root, render);
  };

  window.HB_CONCERNS = C;
})();