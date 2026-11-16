/*
  Student <-> landlord messaging for room inquiries.
  Shared by: rooms.html, matches.html, floorplan.html (Ask button), messages.html (student inbox),
             landlord-messages.html (landlord inbox), landlord.html (Message button), and every navbar (unread badge).
  Load order: auth.js, rooms.js, reservation.js, then this file.

  Stored in localStorage as two lists, shaped like the two tables a database would have.

  "homebase_threads"   one conversation per student + room
    { id, studentId, studentName, studentEmail, roomId, roomName,
      lastMessage, lastSenderRole: "student" | "landlord",
      studentLastReadAt, landlordLastReadAt, createdAt, updatedAt }

  "homebase_messages"
    { id, threadId, senderId, senderName, senderRole: "student" | "landlord", body, createdAt }

  Rules: a student sees only their own threads. The landlord sees every thread (there is one dormitory).
         A message is plain text, 1 to 1000 characters. It is always drawn with textContent, never as HTML.
         Unread = messages from the OTHER side that are newer than your own last-read time.

  SUPABASE LATER: only the `store` object below touches storage. Replace its four functions with table reads and writes,
  and replace the "storage" event listeners with a realtime subscription. Nothing is connected yet.
  Note that Supabase calls are async, so the functions that call the store will return Promises at that point.
*/
(function () {
  'use strict';

  var THREADS_KEY = 'homebase_threads';
  var MESSAGES_KEY = 'homebase_messages';
  var MAX_LEN = 1000;

  // ---- storage: the ONE place to swap for Supabase ----
  function readList(key) { try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); return true; } catch (e) { return false; } }
  var store = {
    threads: function () { return readList(THREADS_KEY); },
    saveThreads: function (list) { return writeList(THREADS_KEY, list); },
    messages: function () { return readList(MESSAGES_KEY); },
    saveMessages: function (list) { return writeList(MESSAGES_KEY, list); }
  };

  function nowIso() { return new Date().toISOString(); }
  function newId(p) { return p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); }
  function roleOf(user) { return user && user.role === 'landlord' ? 'landlord' : 'student'; }
  function byUpdatedDesc(a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function when(iso, withDay) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var time = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === new Date().toDateString()) return time;
    var day = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    return withDay ? day + ', ' + time : day;
  }

  // ---- student profile (landlord side) ----
  function avatar(prof, name, size) {
    var a = el('span', 'grid shrink-0 place-items-center overflow-hidden rounded-full bg-forest font-display font-semibold text-white ' + size);
    a.setAttribute('aria-hidden', 'true');
    if (prof && prof.photo && /^(data:image\/|https?:)/.test(prof.photo)) {
      var i = document.createElement('img'); i.src = prof.photo; i.alt = ''; i.className = 'h-full w-full object-cover'; a.appendChild(i);
    } else a.textContent = String(name || '?').charAt(0).toUpperCase();
    return a;
  }
  function profileOf(studentId) { return (window.HB_AUTH && HB_AUTH.getProfile) ? (HB_AUTH.getProfile(studentId) || {}) : {}; }
  function pretty(v) { return v ? String(v).replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }) : ''; }
  function courseLine(prof) { return (prof.course || '') + (prof.course && prof.yearLevel ? ', ' : '') + (prof.yearLevel || ''); }

  // A read-only window with everything the student wrote in their profile.
  function openStudentProfile(info) {
    var prof = profileOf(info.studentId);
    var name = prof.name || info.studentName || 'Student', email = prof.email || info.studentEmail || '';
    var dlg = document.getElementById('hb-student-profile');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'hb-student-profile'; dlg.setAttribute('aria-labelledby', 'hb-sp-title');
      dlg.className = 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = '';
    var box = el('div', 'p-6');
    var top = el('div', 'flex items-center gap-4');
    top.appendChild(avatar(prof, name, 'h-16 w-16 text-2xl'));
    var who = el('div', 'min-w-0');
    var h = el('h2', 'break-words font-display text-xl font-bold tracking-tight', name); h.id = 'hb-sp-title';
    who.appendChild(h);
    if (courseLine(prof)) who.appendChild(el('p', 'text-base text-muted', courseLine(prof)));
    top.appendChild(who); box.appendChild(top);

    function section(title, rows) {
      var sec = el('div', 'mt-5'); sec.appendChild(el('h3', 'text-sm font-semibold uppercase tracking-wide text-muted', title));
      var dl = el('dl', 'mt-2 grid gap-2 rounded-xl border border-line bg-tint p-4 text-base');
      rows.forEach(function (r) {
        var d = el('div', 'grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3');
        d.appendChild(el('dt', 'text-sm font-medium text-muted', r[0]));
        d.appendChild(el('dd', 'break-words ' + (r[1] ? '' : 'text-muted'), r[1] || 'Not provided'));
        dl.appendChild(d);
      });
      sec.appendChild(dl); box.appendChild(sec);
    }
    var F = (window.HB_AUTH && HB_AUTH.formatLifestyle) ? HB_AUTH.formatLifestyle : function (t, v) { return v || ''; };
    function life(type, v) { return v ? F(type, v) : ''; }
    section('Contact', [['Email', email], ['Phone', prof.phone], ['Social', prof.social]]);
    section('About', [['Bio', prof.bio]]);
    section('Lifestyle', [
      ['Sleep schedule', life('sleep', prof.sleepSchedule)], ['Study habit', life('study', prof.studyHabit)],
      ['Cleanliness', life('clean', prof.cleanliness)], ['Noise tolerance', pretty(prof.noiseTolerance)], ['Guests', pretty(prof.guestFrequency)]
    ]);
    section('Emergency contact', [['Name', prof.emergencyName], ['Relationship', prof.emergencyRel], ['Phone', prof.emergencyPhone]]);
    var close = el('button', 'btn mt-6', 'Close'); close.type = 'button';
    close.addEventListener('click', function () { dlg.close(); });
    box.appendChild(close); dlg.appendChild(box);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    close.focus();
  }

  var QUICK = ['Is this room still available?', 'Can I visit the room before I request it?', 'What is included in the monthly rent?'];
  var STATE_TEXT = { available: 'Beds available', full: 'Full', taken: 'Closed' };

  var M = {
    MAX_LEN: MAX_LEN,
    openStudentProfile: openStudentProfile,

    // ---- threads ----
    threadsFor: function (user) {
      var all = store.threads();
      if (roleOf(user) === 'landlord') return all.sort(byUpdatedDesc);
      return all.filter(function (t) { return t.studentId === user.id; }).sort(byUpdatedDesc);
    },
    getThread: function (id) { return store.threads().filter(function (t) { return t.id === id; })[0] || null; },
    findThread: function (studentId, roomId) {
      return store.threads().filter(function (t) { return t.studentId === studentId && t.roomId === roomId; })[0] || null;
    },
    canAccess: function (user, thread) { return !!thread && !!user && (roleOf(user) === 'landlord' || thread.studentId === user.id); },

    // info: { studentId, studentName, studentEmail, roomId, roomName }. Returns the existing thread for that student + room, or makes one.
    ensureThread: function (info) {
      var hit = M.findThread(info.studentId, info.roomId);
      if (hit) return hit;
      var ts = nowIso();
      var t = {
        id: newId('thr'), studentId: info.studentId, studentName: info.studentName, studentEmail: info.studentEmail,
        roomId: info.roomId, roomName: info.roomName, lastMessage: '', lastSenderRole: '',
        studentLastReadAt: ts, landlordLastReadAt: '', createdAt: ts, updatedAt: ts
      };
      var all = store.threads(); all.push(t); store.saveThreads(all);
      return t;
    },

    // ---- messages ----
    messagesIn: function (threadId) {
      return store.messages().filter(function (m) { return m.threadId === threadId; })
        .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
    },
    send: function (threadId, user, text) {
      var body = String(text == null ? '' : text).trim();
      if (!body) return { ok: false, error: 'Type a message first.' };
      if (body.length > MAX_LEN) return { ok: false, error: 'Messages can be up to ' + MAX_LEN + ' characters.' };
      var threads = store.threads();
      var t = threads.filter(function (x) { return x.id === threadId; })[0];
      if (!M.canAccess(user, t)) return { ok: false, error: 'This conversation is not available.' };
      var role = roleOf(user), ts = nowIso();
      var msg = { id: newId('msg'), threadId: t.id, senderId: user.id, senderName: user.name, senderRole: role, body: body, createdAt: ts };
      var msgs = store.messages(); msgs.push(msg);
      if (!store.saveMessages(msgs)) return { ok: false, error: 'Your browser is blocking site data, so the message was not sent. Allow site data and try again.' };
      t.lastMessage = body.slice(0, 120); t.lastSenderRole = role; t.updatedAt = ts; t[role + 'LastReadAt'] = ts;
      store.saveThreads(threads);
      return { ok: true, message: msg, thread: t };
    },

    // ---- unread ----
    unreadMap: function (user) {
      var role = roleOf(user), map = {}, threads = M.threadsFor(user), msgs = store.messages();
      threads.forEach(function (t) {
        var since = t[role + 'LastReadAt'] || '';
        map[t.id] = msgs.filter(function (m) { return m.threadId === t.id && m.senderRole !== role && m.createdAt > since; }).length;
      });
      return map;
    },
    unreadTotal: function (user) {
      var map = M.unreadMap(user);
      return Object.keys(map).filter(function (k) { return map[k] > 0; }).length; // conversations with something new
    },
    markRead: function (threadId, user) {
      var threads = store.threads(), t = threads.filter(function (x) { return x.id === threadId; })[0];
      if (!M.canAccess(user, t)) return false;
      t[roleOf(user) + 'LastReadAt'] = nowIso();
      return store.saveThreads(threads);
    },

    // Fills every <span data-msg-badge> in the navbar ("2 new"), and keeps it current across tabs.
    bindBadge: function (user) {
      var u = user || (window.HB_AUTH && HB_AUTH.getUser()); if (!u) return;
      function paint() {
        var n = M.unreadTotal(u);
        document.querySelectorAll('[data-msg-badge]').forEach(function (b) { b.textContent = n + ' new'; b.classList.toggle('hidden', n === 0); });
      }
      // students see the Concerns link only while they live here, or if they already have concerns on record
      function paintConcernsNav() {
        var items = document.querySelectorAll('[data-concerns-nav]'); if (!items.length) return;
        var show = false;
        try { show = !!(window.HB && HB.currentStay && HB.currentStay(u.id)); } catch (e) {}
        if (!show) { try { show = JSON.parse(localStorage.getItem('homebase_concerns') || '[]').some(function (c) { return c.userId === u.id; }); } catch (e) {} }
        items.forEach(function (li) { li.style.display = show ? '' : 'none'; });
      }
      paintConcernsNav();
      paint();
      M.refreshBadge = paint; // call after this tab changes read state (the storage event only fires in OTHER tabs)
      window.addEventListener('storage', function (e) { if (!e.key || e.key === THREADS_KEY || e.key === MESSAGES_KEY) paint(); });
      return paint;
    },

    // ---- "Ask about this room" window (student) ----
    openInquiry: function (room, user) {
      var dlg = document.getElementById('hb-inquiry');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'hb-inquiry'; dlg.setAttribute('aria-labelledby', 'hb-inq-title');
        dlg.className = 'max-h-[90vh] w-[calc(100vw-2rem)] max-w-[440px] overflow-y-auto rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/50';
        dlg.innerHTML =
          '<div class="p-6"><h2 id="hb-inq-title" class="font-display text-xl font-bold tracking-tight"></h2>' +
          '<p id="hb-inq-sub" class="mt-1 text-base text-muted"></p>' +
          '<form id="hb-inq-form" novalidate class="mt-5 space-y-4">' +
            '<p id="hb-inq-error" role="alert" class="hidden rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger"></p>' +
            '<div><p class="label">Quick questions</p><div id="hb-inq-quick" class="flex flex-wrap gap-2"></div></div>' +
            '<div><label class="label" for="hb-inq-msg">Your message</label>' +
              '<textarea id="hb-inq-msg" rows="4" maxlength="' + MAX_LEN + '" class="field"></textarea></div>' +
            '<p class="text-sm text-muted">This goes to the dormitory office. Asking a question does not reserve the room. To reserve it, send a room request.</p>' +
            '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
              '<button type="button" id="hb-inq-cancel" class="btn btn-outline">Not now</button>' +
              '<button type="submit" class="btn">Send message</button></div>' +
          '</form></div>';
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        document.getElementById('hb-inq-cancel').addEventListener('click', function () { dlg.close(); });
      }
      var form = document.getElementById('hb-inq-form'), msg = document.getElementById('hb-inq-msg'), err = document.getElementById('hb-inq-error');
      var existing = M.findThread(user.id, room.id);
      document.getElementById('hb-inq-title').textContent = 'Ask about ' + room.name;
      document.getElementById('hb-inq-sub').textContent = existing
        ? 'You already have a conversation about this room. Your message is added to it.'
        : 'Floor ' + room.floor + ', ' + room.type + ' room. Ask the landlord anything before you request it.';
      var quick = document.getElementById('hb-inq-quick'); quick.innerHTML = '';
      QUICK.forEach(function (q) {
        var b = el('button', 'choice !min-h-[44px] !px-3 text-sm', q); b.type = 'button';
        b.addEventListener('click', function () { msg.value = q; msg.focus(); });
        quick.appendChild(b);
      });
      msg.value = ''; msg.removeAttribute('aria-invalid'); err.classList.add('hidden');
      form.onsubmit = function (e) {
        e.preventDefault(); err.classList.add('hidden'); msg.removeAttribute('aria-invalid');
        var thread = M.ensureThread({ studentId: user.id, studentName: user.name, studentEmail: user.email, roomId: room.id, roomName: room.name });
        var res = M.send(thread.id, user, msg.value);
        if (!res.ok) { msg.setAttribute('aria-invalid', 'true'); err.textContent = res.error; err.classList.remove('hidden'); msg.focus(); return; }
        window.location.href = 'messages.html?thread=' + encodeURIComponent(thread.id);
      };
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      msg.focus();
    },

    // A ready-made button for room cards: M.askButton(room, user, 'btn-outline w-full')
    askButton: function (room, user, extraClass) {
      var b = el('button', 'btn btn-outline ' + (extraClass || ''), 'Ask about this room'); b.type = 'button';
      b.setAttribute('aria-label', 'Ask the landlord about ' + room.name);
      b.addEventListener('click', function () { M.openInquiry(room, user); });
      return b;
    },

    /*
      The inbox screen, used by both messages.html and landlord-messages.html.
      opts: { user, threadId?, draft? }
        draft = { studentId, studentName, studentEmail, roomId, roomName }: the landlord opens a chat with a student who has not
        written yet. The thread is only created when the first message is sent, so empty threads never pile up.
    */
    mount: function (root, opts) {
      var user = opts.user, role = roleOf(user), isLandlord = role === 'landlord';
      var state = { activeId: null, draft: null, filter: 'all', open: {} }; // filter + open apply to the landlord's grouped list
      var otherName = isLandlord ? null : 'Dormitory office';

      if (opts.draft) {
        var found = M.findThread(opts.draft.studentId, opts.draft.roomId);
        if (found) state.activeId = found.id; else state.draft = opts.draft;
      } else if (opts.threadId) {
        var th = M.getThread(opts.threadId);
        if (M.canAccess(user, th)) state.activeId = th.id;
      }

      if (isLandlord) state.filter = M.threadsFor(user).some(function (t) { return t.lastSenderRole === 'student'; }) ? 'reply' : 'all';

      root.innerHTML = '';
      var wrap = el('div', 'grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]');
      var listPane = el('section', 'min-w-0'); listPane.setAttribute('aria-label', 'Conversations');
      var convoPane = el('section', 'min-w-0'); convoPane.setAttribute('aria-label', 'Conversation');
      wrap.appendChild(listPane); wrap.appendChild(convoPane); root.appendChild(wrap);

      var ui = {}; // pieces of the open conversation (header, log, composer)

      function active() { return state.activeId ? M.getThread(state.activeId) : null; }
      function setUrl(id) { try { history.replaceState(null, '', location.pathname + (id ? '?thread=' + encodeURIComponent(id) : '')); } catch (e) {} }
      function personName(t) { return isLandlord ? t.studentName : otherName; }

      function layout() {
        var open = !!(state.activeId || state.draft);
        listPane.className = 'min-w-0 ' + (open ? 'hidden md:block' : '');
        convoPane.className = 'min-w-0 ' + (open ? '' : 'hidden md:block');
      }

      // ---- left: the list of conversations ----
      function roomSub(t) {
        var room = (window.HB && HB.getRooms ? HB.getRooms() : []).filter(function (r) { return r.id === t.roomId; })[0];
        return room ? room.type + ' \u00B7 ' + HB.priceLabel(room) : '';
      }
      function openThread(t) { state.draft = null; state.activeId = t.id; state.open[t.studentId] = true; setUrl(t.id); renderConvo(); }
      function preview(t) {
        if (!t.lastMessage) return 'No messages yet';
        return (t.lastSenderRole === role ? 'You: ' : (isLandlord ? '' : 'Dormitory office: ')) + t.lastMessage;
      }
      function rowButton(title, sub, text, time, n, isActive, onClick) {
        var b = el('button', 'block w-full rounded-xl border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-forest ' +
          (isActive ? 'border-forest bg-tint' : 'border-line bg-white hover:border-edge')); b.type = 'button';
        if (isActive) b.setAttribute('aria-current', 'true');
        var top = el('div', 'flex items-start justify-between gap-2');
        top.appendChild(el('span', 'min-w-0 truncate font-display text-base font-semibold', title));
        top.appendChild(el('span', 'shrink-0 text-sm text-muted', time));
        b.appendChild(top);
        if (sub) b.appendChild(el('span', 'mt-0.5 block text-sm text-muted', sub));
        var foot = el('div', 'mt-1 flex items-center justify-between gap-2');
        foot.appendChild(el('span', 'min-w-0 truncate text-sm text-muted', text));
        if (n > 0) foot.appendChild(HB.chip(n + ' new', 'warn'));
        b.appendChild(foot); b.addEventListener('click', onClick); return b;
      }

      function renderList() {
        listPane.innerHTML = '';
        var threads = M.threadsFor(user), unread = M.unreadMap(user);
        if (!threads.length && !state.draft) {
          var empty = el('div', 'rounded-[20px] border border-line p-6');
          empty.appendChild(el('p', 'card-title', 'No conversations yet'));
          empty.appendChild(el('p', 'note mt-2', isLandlord
            ? 'When a student asks about a room, the conversation shows up here. You can also message a student from their request on the Dashboard.'
            : 'Open a room on Explore Rooms and choose Ask about this room to start one.'));
          if (!isLandlord) { var a = el('a', 'textlink mt-2', 'Explore Rooms'); a.href = 'rooms.html'; empty.appendChild(a); }
          listPane.appendChild(empty); return;
        }

        // student: one chat per room, simple list
        if (!isLandlord) {
          var sl = el('ul', 'space-y-2');
          threads.forEach(function (t) {
            var li = el('li'); li.appendChild(rowButton(t.roomName, roomSub(t), preview(t), when(t.updatedAt, false), unread[t.id] || 0, t.id === state.activeId, function () { openThread(t); }));
            sl.appendChild(li);
          });
          listPane.appendChild(sl); return;
        }

        // landlord: one row per student, their room chats grouped inside
        var groups = {}, order = [];
        threads.forEach(function (t) {
          var g = groups[t.studentId];
          if (!g) { g = groups[t.studentId] = { id: t.studentId, name: t.studentName, threads: [], unread: 0, needs: false }; order.push(g); }
          g.threads.push(t); g.unread += unread[t.id] || 0; if (t.lastSenderRole === 'student') g.needs = true;
        });
        if (state.draft) {
          var dg = groups[state.draft.studentId];
          if (!dg) { dg = groups[state.draft.studentId] = { id: state.draft.studentId, name: state.draft.studentName, threads: [], unread: 0, needs: false }; order.unshift(dg); }
          dg.draft = state.draft;
        }
        order.forEach(function (g) {
          g.hasActive = !!g.draft || g.threads.some(function (t) { return t.id === state.activeId; });
          if (g.hasActive && state.open[g.id] === undefined) state.open[g.id] = true;
        });
        var nReply = order.filter(function (g) { return g.needs; }).length, nUnread = order.filter(function (g) { return g.unread > 0; }).length;

        var bar = el('div', 'mb-3 flex flex-wrap gap-2'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Filter conversations');
        [['reply', 'Needs reply (' + nReply + ')'], ['unread', 'Unread (' + nUnread + ')'], ['all', 'All (' + order.length + ')']].forEach(function (f) {
          var fb = el('button', 'choice !min-h-[44px] !px-3 text-sm', f[1]); fb.type = 'button';
          fb.setAttribute('aria-pressed', String(state.filter === f[0]));
          fb.addEventListener('click', function () { state.filter = f[0]; renderList(); });
          bar.appendChild(fb);
        });
        listPane.appendChild(bar);

        var shown = order.filter(function (g) {
          if (g.hasActive) return true; // never hide the chat you are in
          return state.filter === 'reply' ? g.needs : state.filter === 'unread' ? g.unread > 0 : true;
        });
        if (!shown.length) {
          var none = el('div', 'rounded-[20px] border border-line p-6');
          none.appendChild(el('p', 'card-title', state.filter === 'reply' ? 'Nothing needs a reply' : 'Nothing unread'));
          none.appendChild(el('p', 'note mt-2', 'You are all caught up.'));
          var all = el('button', 'btn btn-outline mt-3', 'Show all conversations'); all.type = 'button';
          all.addEventListener('click', function () { state.filter = 'all'; renderList(); });
          none.appendChild(all); listPane.appendChild(none); return;
        }

        var ul = el('ul', 'space-y-2');
        shown.forEach(function (g) {
          var li = el('li', 'rounded-[20px] border bg-white ' + (g.hasActive ? 'border-forest' : 'border-line'));
          var count = g.threads.length + (g.draft ? 1 : 0), expanded = !!state.open[g.id];
          var hb = el('button', 'flex w-full items-start justify-between gap-3 rounded-[20px] p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-forest'); hb.type = 'button';
          if (count > 1) hb.setAttribute('aria-expanded', String(expanded));
          var left = el('span', 'min-w-0');
          left.appendChild(el('span', 'block truncate font-display text-base font-semibold', g.name));
          var latest = g.threads[0];
          left.appendChild(el('span', 'mt-0.5 block truncate text-sm text-muted',
            count > 1 ? count + ' room chats: ' + g.threads.map(function (t) { return t.roomName; }).join(', ')
                      : (latest ? latest.roomName + ' \u00B7 ' + preview(latest) : g.draft.roomName + ' \u00B7 New conversation')));
          hb.appendChild(left);
          var right = el('span', 'flex shrink-0 flex-col items-end gap-1');
          if (latest) right.appendChild(el('span', 'text-sm text-muted', when(latest.updatedAt, false)));
          if (g.unread > 0) right.appendChild(HB.chip(g.unread + ' new', 'warn')); else if (g.needs) right.appendChild(HB.chip('Needs reply', 'warn'));
          hb.appendChild(right);
          hb.addEventListener('click', function () {
            if (count === 1 && latest) { openThread(latest); return; }
            state.open[g.id] = !expanded; renderList();
          });
          li.appendChild(hb);
          if (count > 1 && expanded) {
            var kids = el('ul', 'space-y-2 px-3 pb-3');
            if (g.draft) { var dli = el('li'); dli.appendChild(rowButton(g.draft.roomName, '', 'New conversation. Nothing sent yet.', '', 0, true, function () {})); kids.appendChild(dli); }
            g.threads.forEach(function (t) {
              var kli = el('li'); kli.appendChild(rowButton(t.roomName, roomSub(t), preview(t), when(t.updatedAt, false), unread[t.id] || 0, t.id === state.activeId, function () { openThread(t); }));
              kids.appendChild(kli);
            });
            li.appendChild(kids);
          }
          ul.appendChild(li);
        });
        listPane.appendChild(ul);
      }

      // ---- right: one conversation ----
      function roomChip(t) {
        var room = (window.HB && HB.getRooms ? HB.getRooms() : []).filter(function (r) { return r.id === t.roomId; })[0];
        if (!room) return null;
        var st = HB.roomState(room, t.studentId), text = STATE_TEXT[st];
        if (st === 'yours') text = isLandlord ? 'This student has a request here' : 'You have a request here';
        return { room: room, chip: HB.chip(text || st, HB.roomTone(st)) };
      }

      function renderConvo() {
        layout(); renderList();
        convoPane.innerHTML = '';
        var t = active(), d = state.draft;
        if (!t && !d) {
          var none = el('div', 'rounded-[20px] border border-line p-6');
          none.appendChild(el('p', 'card-title', 'Select a conversation'));
          none.appendChild(el('p', 'note mt-2', 'Choose one on the left to read it and reply.'));
          convoPane.appendChild(none); return;
        }
        var info = t || d;
        var box = el('div', 'flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-[20px] border border-line bg-white');

        var head = el('div', 'flex items-start gap-3 border-b border-line bg-tint p-4');
        var back = el('button', 'btn btn-outline md:hidden !px-4', 'Back'); back.type = 'button';
        back.setAttribute('aria-label', 'Back to all conversations');
        back.addEventListener('click', function () { state.activeId = null; state.draft = null; setUrl(null); renderConvo(); });
        head.appendChild(back);
        var sprof = isLandlord ? profileOf(info.studentId) : null;
        if (isLandlord) head.appendChild(avatar(sprof, info.studentName, 'h-11 w-11 text-base'));
        var hb = el('div', 'min-w-0 flex-1');
        hb.appendChild(el('h2', 'truncate font-display text-lg font-semibold tracking-tight', isLandlord ? info.studentName : 'Dormitory office'));
        var sub = el('div', 'mt-1 flex flex-wrap items-center gap-2');
        sub.appendChild(el('span', 'text-sm font-medium', info.roomName));
        var rc = roomChip(info);
        if (rc) { sub.appendChild(el('span', 'text-sm text-muted', HB.priceLabel(rc.room))); sub.appendChild(rc.chip); }
        hb.appendChild(sub);
        if (isLandlord) {
          var cl = courseLine(sprof);
          hb.appendChild(el('p', 'mt-1 truncate text-sm text-muted', (cl ? cl + ' \u00B7 ' : '') + (info.studentEmail || '')));
        }
        head.appendChild(hb);
        if (isLandlord) {
          var vp = el('button', 'btn btn-outline shrink-0 !px-4 text-sm', 'View profile'); vp.type = 'button';
          vp.setAttribute('aria-label', 'View profile of ' + info.studentName);
          vp.addEventListener('click', function () { openStudentProfile(info); });
          head.appendChild(vp);
        }
        box.appendChild(head);

        var log = el('div', 'flex-1 space-y-3 overflow-y-auto p-4'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite');
        log.setAttribute('aria-label', 'Messages'); log.tabIndex = 0;
        box.appendChild(log); ui.log = log;

        var form = el('form', 'border-t border-line p-4'); form.noValidate = true;
        var lab = el('label', 'sr-only', 'Write a message'); lab.setAttribute('for', 'msg-input');
        var ta = el('textarea', 'field'); ta.id = 'msg-input'; ta.rows = 2; ta.maxLength = MAX_LEN; ta.placeholder = 'Write a message';
        var err = el('p', 'err hidden'); err.setAttribute('role', 'alert');
        var row = el('div', 'mt-2 flex items-center justify-between gap-3');
        row.appendChild(el('p', 'text-sm text-muted', 'Enter sends. Shift+Enter adds a new line.'));
        var send = el('button', 'btn', 'Send'); send.type = 'submit'; row.appendChild(send);
        form.appendChild(lab); form.appendChild(ta); form.appendChild(err); form.appendChild(row);
        box.appendChild(form);
        convoPane.appendChild(box);

        ta.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (form.requestSubmit) form.requestSubmit(); else send.click(); }
        });
        form.addEventListener('submit', function (e) {
          e.preventDefault(); err.classList.add('hidden'); ta.removeAttribute('aria-invalid');
          var thread = active();
          if (!thread && state.draft) thread = M.ensureThread(state.draft);
          var res = M.send(thread.id, user, ta.value);
          if (!res.ok) { ta.setAttribute('aria-invalid', 'true'); err.textContent = res.error; err.classList.remove('hidden'); ta.focus(); return; }
          ta.value = '';
          if (state.draft) { state.draft = null; state.activeId = thread.id; setUrl(thread.id); }
          renderList(); renderLog(); ta.focus();
        });

        renderLog();
        if (!isNarrow()) ta.focus({ preventScroll: true });
      }

      function isNarrow() { return window.matchMedia && !window.matchMedia('(min-width: 768px)').matches; }

      function renderLog() {
        var t = active(), log = ui.log; if (!log) return;
        log.innerHTML = '';
        var msgs = t ? M.messagesIn(t.id) : [];
        if (!msgs.length) {
          log.appendChild(el('p', 'note', isLandlord ? 'No messages yet. Write the first one below.' : 'No messages yet.'));
        }
        msgs.forEach(function (m) {
          var mine = m.senderRole === role;
          var item = el('div', 'flex ' + (mine ? 'justify-end' : 'justify-start'));
          var bubble = el('div', 'max-w-[85%] rounded-2xl border px-4 py-2.5 ' + (mine ? 'border-forest bg-forest text-white' : 'border-line bg-tint text-ink'));
          bubble.appendChild(el('p', 'text-sm font-semibold ' + (mine ? 'text-white' : 'text-forest'), (mine ? 'You' : (isLandlord ? m.senderName : 'Dormitory office')) + ' \u00B7 ' + when(m.createdAt, true)));
          bubble.appendChild(el('p', 'mt-0.5 whitespace-pre-wrap break-words text-base', m.body));
          item.appendChild(bubble); log.appendChild(item);
        });
        log.scrollTop = log.scrollHeight;
        if (t && M.unreadMap(user)[t.id] > 0) { M.markRead(t.id, user); renderList(); if (M.refreshBadge) M.refreshBadge(); }
      }

      // live updates from another tab (a student and the landlord can have both open)
      window.addEventListener('storage', function (e) {
        if (e.key && e.key !== THREADS_KEY && e.key !== MESSAGES_KEY) return;
        var dt = state.draft && M.findThread(state.draft.studentId, state.draft.roomId);
        if (dt) { state.activeId = dt.id; state.draft = null; renderConvo(); return; }
        renderList(); renderLog();
      });

      renderConvo();
    }
  };

  window.HB_MSG = M;
})();