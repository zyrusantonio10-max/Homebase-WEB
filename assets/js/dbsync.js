/*
  Database synchronization service for reviews, messages, concerns, and amenities.
  Synchronizes local storage with Supabase database tables:
    1. Pull: loads remote table changes into localStorage on page init.
    2. Push: serializes local mutations and commits diffs to remote tables.
    3. Realtime: subscribes to remote postgres changes via Supabase Realtime.
*/
(function () {
  'use strict';

  function db() { return window.HB_DB || null; }
  function me() { return (window.HB_AUTH && HB_AUTH.getUser) ? HB_AUTH.getUser() : null; }
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function ts(v) { return v || null; }
  function fts(v) { return v || ''; }
  function uuidOrNull(v) { return UUID_RE.test(String(v || '')) ? v : null; }

  // Table schemas and data transformation mappings
  var REG = {
    concerns: {
      key: 'homebase_concerns',
      tables: [{ table: 'concerns', idKey: 'id' }, { table: 'concern_updates', idKey: 'id' }],
      toRows: function (list) {
        var c = [], u = [];
        list.forEach(function (x) {
          c.push({ id: x.id, user_id: x.userId, student_name: x.studentName, student_email: x.studentEmail, reservation_id: uuidOrNull(x.reservationId),
            room_id: x.roomId, room_name: x.roomName, category: x.category, description: x.description, urgent: !!x.urgent, photo: x.photo || null,
            status: x.status, created_at: x.createdAt, updated_at: x.updatedAt, resolved_at: ts(x.resolvedAt), confirmed_at: ts(x.confirmedAt), reopened_at: ts(x.reopenedAt) });
          (x.updates || []).forEach(function (p) {
            u.push({ id: p.id, concern_id: x.id, kind: p.kind, by_role: p.by, name: p.name || null, text: p.text || '', status: p.status || '', created_at: p.at });
          });
        });
        return { concerns: c, concern_updates: u };
      },
      fromRows: function (t) {
        var byConcern = {};
        t.concern_updates.forEach(function (p) {
          (byConcern[p.concern_id] = byConcern[p.concern_id] || []).push({ id: p.id, kind: p.kind, by: p.by_role, name: p.name || '', text: p.text || '', status: p.status || '', at: p.created_at });
        });
        return t.concerns.map(function (x) {
          var ups = (byConcern[x.id] || []).sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
          return { id: x.id, userId: x.user_id, studentName: x.student_name, studentEmail: x.student_email, reservationId: x.reservation_id || '',
            roomId: x.room_id, roomName: x.room_name, category: x.category, description: x.description, urgent: !!x.urgent, photo: x.photo || '',
            status: x.status, updates: ups, createdAt: x.created_at, updatedAt: x.updated_at,
            resolvedAt: fts(x.resolved_at), confirmedAt: fts(x.confirmed_at), reopenedAt: fts(x.reopened_at) };
        });
      }
    },
    threads: {
      key: 'homebase_threads',
      tables: [{ table: 'threads', idKey: 'id' }],
      toRows: function (list) {
        return { threads: list.map(function (t) {
          return { id: t.id, student_id: t.studentId, student_name: t.studentName, student_email: t.studentEmail, room_id: t.roomId, room_name: t.roomName,
            last_message: t.lastMessage || null, last_sender_role: t.lastSenderRole || null,
            student_last_read_at: ts(t.studentLastReadAt), landlord_last_read_at: ts(t.landlordLastReadAt), created_at: t.createdAt, updated_at: t.updatedAt };
        }) };
      },
      fromRows: function (t) {
        return t.threads.map(function (x) {
          return { id: x.id, studentId: x.student_id, studentName: x.student_name, studentEmail: x.student_email, roomId: x.room_id, roomName: x.room_name,
            lastMessage: x.last_message || '', lastSenderRole: x.last_sender_role || '',
            studentLastReadAt: fts(x.student_last_read_at), landlordLastReadAt: fts(x.landlord_last_read_at), createdAt: x.created_at, updatedAt: x.updated_at };
        });
      }
    },
    messages: {
      key: 'homebase_messages',
      tables: [{ table: 'messages', idKey: 'id' }],
      toRows: function (list) {
        return { messages: list.map(function (m) {
          return { id: m.id, thread_id: m.threadId, sender_id: m.senderId, sender_name: m.senderName, sender_role: m.senderRole, body: m.body, created_at: m.createdAt };
        }) };
      },
      fromRows: function (t) {
        return t.messages.map(function (x) {
          return { id: x.id, threadId: x.thread_id, senderId: x.sender_id, senderName: x.sender_name, senderRole: x.sender_role, body: x.body, createdAt: x.created_at };
        });
      }
    },
    reviews: {
      key: 'homebase_reviews',
      tables: [{ table: 'reviews', idKey: 'id' }],
      toRows: function (list) {
        return { reviews: list.map(function (r) {
          var k = r.ratings || {}, rep = r.reply || {}, hid = r.hidden || {};
          return { id: r.id, reservation_id: r.reservationId, user_id: r.userId, author_name: r.authorName, room_id: r.roomId, room_name: r.roomName,
            overall: k.overall, commute: k.commute, safety: k.safety, cleanliness: k.cleanliness, comment: r.comment || '',
            reply_text: rep.text || null, reply_at: ts(rep.at), hidden_reason: hid.reason || null, hidden_at: ts(hid.at),
            created_at: r.createdAt, updated_at: r.updatedAt };
        }) };
      },
      fromRows: function (t) {
        return t.reviews.map(function (x) {
          var r = { id: x.id, reservationId: x.reservation_id, userId: x.user_id, authorName: x.author_name, roomId: x.room_id, roomName: x.room_name,
            ratings: { overall: x.overall, commute: x.commute, safety: x.safety, cleanliness: x.cleanliness }, comment: x.comment || '',
            createdAt: x.created_at, updatedAt: x.updated_at };
          if (x.reply_text) r.reply = { text: x.reply_text, at: x.reply_at };
          if (x.hidden_reason) r.hidden = { reason: x.hidden_reason, at: x.hidden_at };
          return r;
        });
      }
    },
    building: {
      key: 'homebase_building_amenities',
      tables: [{ table: 'building_perks', idKey: 'name' }],
      toRows: function (list) { return { building_perks: list.map(function (n) { return { name: String(n) }; }) }; },
      fromRows: function (t) { return t.building_perks.map(function (x) { return x.name; }); }
    }
  };
  var NAMES = Object.keys(REG);

  // Helper functions for normalization and serialization
  function readLocal(key) { try { var v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  // Normalize date fields to standard ISO strings
  function normRow(r) {
    var o = {};
    for (var k in r) { var v = r[k]; o[k] = (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && !isNaN(Date.parse(v))) ? new Date(v).toISOString() : v; }
    return o;
  }
  // Compare serialized representations of collection rows
  function canon(reg, rows) {
    return JSON.stringify(reg.tables.map(function (t) {
      return (rows[t.table] || []).slice().sort(function (a, b) { return String(a[t.idKey]).localeCompare(String(b[t.idKey])); }).map(normRow);
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

  // Snapshot of current database state
  var snap = {};
  NAMES.forEach(function (n) { try { snap[n] = REG[n].toRows(readLocal(REG[n].key)); } catch (e) { snap[n] = {}; } });
  var queue = Promise.resolve(), lastWrite = 0;

  // Pull remote changes into localStorage
  function pull(name, force) {
    var reg = REG[name];
    return Promise.all(reg.tables.map(function (t) { return db().from(t.table).select('*'); })).then(function (res) {
      var fetched = {};
      res.forEach(function (r, i) { if (r.error) throw r.error; fetched[reg.tables[i].table] = r.data || []; });
      var list = reg.fromRows(fetched), norm = reg.toRows(list);
      var changed = canon(reg, norm) !== canon(reg, reg.toRows(readLocal(reg.key)));
      if (changed || force) { try { localStorage.setItem(reg.key, JSON.stringify(list)); } catch (e) {} }
      snap[name] = norm;
      return changed ? reg.key : null;
    }).catch(function (e) { try { console.warn('Homebase sync failed for', name, e); } catch (x) {} return null; });
  }
  // Fetch updates across all registered collections
  function pullAll(force) { return Promise.all(NAMES.map(function (n) { return pull(n, force); })).then(function (rs) { return rs.filter(Boolean); }); }

  // Push local changes to database tables
  function failed(text, err) {
    try { console.error('Homebase:', text, err); } catch (e) {}
    pullAll(true).then(function () { window.alert(text + ' The page will reload with what is really saved.'); window.location.reload(); });
  }
  function applyDiff(reg, prev, next) {
    var d = db(), chain = Promise.resolve();
    reg.tables.forEach(function (t) {
      var before = {}, after = prev[t.table] || [], rows = next[t.table] || [], adds = [], edits = [];
      after.forEach(function (r) { before[r[t.idKey]] = JSON.stringify(normRow(r)); });
      rows.forEach(function (r) {
        var old = before[r[t.idKey]];
        if (old === undefined) adds.push(r); else if (old !== JSON.stringify(normRow(r))) edits.push(r);
      });
      if (adds.length) chain = chain.then(function () { return d.from(t.table).insert(adds).then(function (r) { if (r.error) throw r.error; }); });
      edits.forEach(function (r) {
        var body = {}; for (var k in r) if (k !== t.idKey) body[k] = r[k];
        chain = chain.then(function () {
          return d.from(t.table).update(body).eq(t.idKey, r[t.idKey]).select().then(function (x) {
            if (x.error) throw x.error;
            if (!x.data || !x.data.length) throw new Error('not allowed');
          });
        });
      });
    });
    reg.tables.slice().reverse().forEach(function (t) {
      var keep = {}, gone = [];
      (next[t.table] || []).forEach(function (r) { keep[r[t.idKey]] = 1; });
      (prev[t.table] || []).forEach(function (r) { if (!keep[r[t.idKey]]) gone.push(r[t.idKey]); });
      if (gone.length) chain = chain.then(function () { return d.from(t.table).delete().in(t.idKey, gone).then(function (r) { if (r.error) throw r.error; }); });
    });
    return chain;
  }
  // Queue push operation for modified collection
  function saved(name, list) {
    var reg = REG[name];
    if (!reg || !db() || !me() || !Array.isArray(list)) return;
    var prev = snap[name] || {}, next = reg.toRows(list);
    snap[name] = next;
    lastWrite = Date.now();
    queue = queue.then(function () { return applyDiff(reg, prev, next); }).catch(function (e) { failed('That could not be saved.', e); });
  }

  function run() {
    if (!me() || !db()) return;
    var jobs = [queue.then(function () { return pullAll(false); })];
    if (window.HB && HB.sync) jobs.push(HB.sync({ noReload: true }));
    Promise.all(jobs).then(function (rs) { if (((rs[0] && rs[0].length) || rs[1]) && canReload()) window.location.reload(); });
  }

  // Realtime subscription and live updates
  var LIVE_TABLES = ['rooms', 'reservations', 'reviews', 'threads', 'messages', 'concerns', 'concern_updates', 'building_perks'];
  var RELOAD_KEYS = ['homebase_rooms', 'homebase_reservations', 'homebase_reviews', 'homebase_building_amenities'];
  var liveTimer = null, liveBusy = false, liveAgain = false;

  function selfHandled() { return /(messages|concerns)/i.test(window.location.pathname); }
  function quietReload() {
    var tries = 0;
    (function wait() {
      var a = document.activeElement;
      var busy = document.hidden || document.querySelector('dialog[open]') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
      if (!busy) { if (canReload()) window.location.reload(); return; }
      if (++tries < 60) setTimeout(wait, 2000);   // keep waiting up to 2 minutes; the next page load syncs anyway
    })();
  }
  function refreshLive() {
    if (liveBusy) { liveAgain = true; return; }
    liveBusy = true;
    var mine = Date.now() - Math.max(lastWrite, (window.HB && HB.lastWriteAt) || 0) < 4000;   // an echo of our own save
    Promise.all([queue.then(function () { return pullAll(false); }), (window.HB && HB.sync) ? HB.sync({ noReload: true }) : false]).then(function (rs) {
      var keys = rs[0].slice();
      if (rs[1]) keys.push('homebase_rooms', 'homebase_reservations');
      if (mine || !keys.length) return;
      keys.forEach(function (k) { try { window.dispatchEvent(new StorageEvent('storage', { key: k })); } catch (e) {} });
      if (!selfHandled() && keys.some(function (k) { return RELOAD_KEYS.indexOf(k) !== -1; })) quietReload();
    }).catch(function () {}).then(function () { liveBusy = false; if (liveAgain) { liveAgain = false; scheduleLive(); } });
  }
  function scheduleLive() { clearTimeout(liveTimer); liveTimer = setTimeout(refreshLive, 500); }
  function startLive() {
    var d = db(); if (!d || !d.channel || !me()) return;
    d.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session; if (!s) return;
      try { d.realtime.setAuth(s.access_token); } catch (e) {}
      var ch = d.channel('homebase-live');
      LIVE_TABLES.forEach(function (t) { ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, scheduleLive); });
      ch.subscribe();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) scheduleLive(); });   // catch up after the phone slept
    }).catch(function () {});
  }

  window.HB_SYNC = { saved: saved, pull: pullAll, flush: function () { return queue; }, run: run };
  function boot() { run(); startLive(); loadUserData(); }
  // saved rooms, match preferences and comparisons live in userdata.js
  function loadUserData() {
    if (window.HB_USERDATA || !me()) return;
    var root = /\/pages\/[^/]+\//.test(location.pathname) ? '../../' : '';
    var s = document.createElement('script'); s.src = root + 'assets/js/userdata.js'; document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
