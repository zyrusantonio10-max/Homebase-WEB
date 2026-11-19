/*
  Homebase Authentication & Session Management
  Shared across all pages: index.html, home.html, landlord.html, matches.html, rooms.html, floorplan.html, profile.html.

  Storage keys:
    homebase_users        List of registered user accounts: [{ id, name, email, role, password }]
    homebase_currentUser Currently active user session: { id, name, email, role }
        landlord account: manager@ariatedorm.com 
        password        : set in the seed below (see README, change it before real use)
    homebase_profile_<id> User profile details: { photo, phone, bio, course, yearLevel, emergencyName, emergencyPhone, emergencyRel, sleepSchedule, studyHabit, social, ... }
*/
(function (global) {
  'use strict'; 
  var USERS_KEY = 'homebase_users';
  var CURRENT_KEY = 'homebase_currentUser';

  // ---- Safe localStorage helpers ----
  function readStorage(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---- Seed default demo accounts ----
  function seedDefaultUsers() {
    if (!readStorage(USERS_KEY, null)) {
      writeStorage(USERS_KEY, [
        {
          id: 'demo-student',
          name: 'Alex Santos',
          email: 'alex@unc.edu.ph',
          role: 'student',
          password: 'sha256:2a6747e1b382015051cf9d7d23f72ed87ffa924d52b234b2b7e8e803c6f42188'
        },
        {
          id: 'demo-manager',
          name: 'Ariate Dorm Manager',
          email: 'manager@ariatedorm.com',
          role: 'landlord',
          password: 'sha256:6bf5236866a055acff4d82abcbe24eb25b5c899124843489658fc7dbc9ff235a'
        }
      ]);
    }
    // Seed default demo profile if not already set
    if (!readStorage('homebase_profile_demo-student', null)) {
      writeStorage('homebase_profile_demo-student', {
        name: 'Alex Santos',
        email: 'alex@unc.edu.ph',
        phone: '0917 123 4567',
        course: 'BS Computer Science',
        yearLevel: '2nd Year',
        social: '@alex_santos',
        bio: '2nd year CS student at UNC. Usually coding or reading. Clean, quiet, and respectful of dorm rules.',
        sleepSchedule: 'early',
        studyHabit: 'quiet',
        cleanliness: 'very-neat',
        noiseTolerance: 'moderate',
        guestFrequency: 'rarely',
        emergencyName: 'Maria Santos',
        emergencyRel: 'Mother',
        emergencyPhone: '0918 987 6543'
      });
    }
  }
  // (demo accounts removed: accounts now live in Supabase)

  // ---- Client-side password hashing (prototype layer before PHP/MySQL) ----
  function hashPassword(pw) {
    if (global.crypto && global.crypto.subtle && global.TextEncoder) {
      return global.crypto.subtle.digest('SHA-256', new TextEncoder().encode('homebase:' + pw)).then(function (buf) {
        return 'sha256:' + Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, '0');
        }).join('');
      });
    }
    return Promise.resolve('plain:' + pw);
  }

  function homeFor(role) {
    return role === 'landlord' ? 'landlord.html' : 'home.html';
  }

  // ---- Supabase glue ----
  // Supabase holds the real accounts. We keep a copy of the logged-in profile in localStorage so the pages
  // that are not migrated yet can still read the user synchronously.
  function db() { return global.HB_DB || null; }
  function loadProfile(uid) { return db().from('profiles').select('*').eq('id', uid).single(); }
  function rowToRecord(p) {
    var userType = p.user_type || (!p.school && !p.student_id ? 'non_student' : 'student');
    return { id: p.id, name: p.name, email: p.email, role: p.role, dob: p.dob || '', mobile: p.mobile || '', school: p.school || '',
      studentId: p.student_id || '', course: p.course || '', yearLevel: p.year_level || '', province: p.province || '',
      guardian: p.guardian || {}, guardianStatus: p.guardian_status, guardianCode: p.guardian_code || '',
      userType: userType, occupation: p.occupation || (userType === 'non_student' ? p.course : ''), workplace: p.workplace || '' };
  }
  function cacheProfile(p) {
    var rec = rowToRecord(p);
    var users = readStorage(USERS_KEY, []).filter(function (u) { return String(u.id) !== String(rec.id); });
    users.push(rec);
    writeStorage(USERS_KEY, users);
    var sess = { id: rec.id, name: rec.name, email: rec.email, role: rec.role, userType: rec.userType };
    var prev = readStorage(CURRENT_KEY, null);
    if (prev && String(prev.id) === String(rec.id) && prev.photo) sess.photo = prev.photo;
    if (!writeStorage(CURRENT_KEY, sess)) return null;
    if (!readStorage('homebase_profile_' + rec.id, null)) {
      var e = p.emergency || {}, h = p.habits || {}, prof = {
        name: rec.name, email: rec.email, phone: rec.mobile, course: rec.course, yearLevel: rec.yearLevel,
        bio: p.bio || '', emergencyName: e.name || '', emergencyRel: e.relationship || '', emergencyPhone: e.mobile || '',
        userType: rec.userType, occupation: rec.occupation, workplace: rec.workplace
      };
      if (p.photo) prof.photo = p.photo;
      for (var k in h) prof[k] = h[k];
      writeStorage('homebase_profile_' + rec.id, prof);
    }
    return sess;
  }
  var PROF_TOP = ['name', 'email', 'phone', 'course', 'yearLevel', 'bio', 'photo', 'emergencyName', 'emergencyRel', 'emergencyPhone', 'role'];
  function pushProfile(uid, prof) {
    var cur = readStorage(CURRENT_KEY, null);
    if (!db() || !cur || String(cur.id) !== String(uid)) return;
    var habits = {}; for (var k in prof) if (PROF_TOP.indexOf(k) === -1) habits[k] = prof[k];
    var row = {
      name: prof.name || cur.name, mobile: prof.phone || null, course: prof.course || null, year_level: prof.yearLevel || null,
      bio: prof.bio || null, photo: prof.photo || null,
      emergency: { name: prof.emergencyName || '', relationship: prof.emergencyRel || '', mobile: prof.emergencyPhone || '' }, habits: habits
    };
    db().from('profiles').update(row).eq('id', uid).then(function (r) { if (r.error) { try { console.warn('Profile not saved to database', r.error); } catch (e) {} } });
  }
  var NO_DB = 'Cannot reach the database right now. Check your internet connection and try again.';

  var HB_AUTH = {
    loadProfile: loadProfile,
    cacheProfile: cacheProfile,
    USERS_KEY: USERS_KEY,
    CURRENT_KEY: CURRENT_KEY,
    hashPassword: hashPassword,

    // Retrieve active logged in user or null
    getUser: function () {
      var u = readStorage(CURRENT_KEY, null);
      return (u && u.email) ? u : null;
    },

    isLoggedIn: function () {
      return !!HB_AUTH.getUser();
    },

    homeFor: homeFor,

    // Returns a key scoped to the logged-in user: e.g. "homebase_savedRooms_demo-student"
    userKey: function (baseKey, explicitUserId) {
      var uid = explicitUserId;
      if (!uid) {
        var u = HB_AUTH.getUser();
        uid = (u && u.id) ? u.id : '';
      }
      return uid ? (baseKey + '_' + uid) : baseKey;
    },

    // Session guard: Call in <head> or at top of script to protect private pages
    requireAuth: function (requiredRole, redirectUrl) {
      var u = HB_AUTH.getUser();
      var fallback = redirectUrl || 'index.html';
      if (!u) {
        global.location.replace(fallback);
        return null;
      }
      if (requiredRole && u.role !== requiredRole) {
        global.location.replace(homeFor(u.role));
        return null;
      }
      return u;
    },

    // Login with email and password (Supabase Auth)
    login: function (email, password) {
      var cleanEmail = String(email || '').trim().toLowerCase();
      var cleanPw = String(password || '');
      if (!db()) return Promise.resolve({ ok: false, error: NO_DB });
      return db().auth.signInWithPassword({ email: cleanEmail, password: cleanPw }).then(function (r) {
        if (r.error || !r.data || !r.data.user) {
          var m = r.error && r.error.message || '';
          if (/confirm/i.test(m)) return { ok: false, error: 'Please confirm your email first, then log in.' };
          if (/fetch|network/i.test(m)) return { ok: false, error: NO_DB };
          return { ok: false, error: 'That email and password do not match. Check both and try again, or create an account.' };
        }
        return loadProfile(r.data.user.id).then(function (pr) {
          if (pr.error || !pr.data) return { ok: false, error: 'You are signed in, but your profile could not be loaded. Please try again.' };
          var sess = cacheProfile(pr.data);
          if (!sess) return { ok: false, error: 'Your browser is blocking local storage, so we cannot keep you logged in. Allow site data and try again.' };
          return { ok: true, user: sess };
        });
      }, function () { return { ok: false, error: NO_DB }; });
    },

    // Register a new account
    register: function (name, email, password, role, extra) {
      var cleanName = String(name || '').trim();
      var cleanEmail = String(email || '').trim().toLowerCase();
      // Landlord (office) accounts are system provisioned; public registration is student or non-student resident
      var cleanRole = role === 'landlord' ? 'landlord' : 'student';
      var cleanPw = String(password || '');
      extra = extra || {};

      return hashPassword(cleanPw).then(function (hash) {
        var users = readStorage(USERS_KEY, []);
        if (users.some(function (u) { return u.email === cleanEmail; })) {
          return {
            ok: false,
            field: 'email',
            error: 'An account with this email already exists. Close this window and log in instead.'
          };
        }

        var newUser = {
          id: String(Date.now()),
          name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          userType: extra.userType || (role === 'non_student' ? 'non_student' : 'student'),
          password: hash
        };
        for (var k in extra) { if (!newUser.hasOwnProperty(k)) newUser[k] = extra[k]; }

        users.push(newUser);
        if (!writeStorage(USERS_KEY, users)) {
          return {
            ok: false,
            error: 'Your browser is blocking local storage, so we cannot save your account. Allow site data and try again.'
          };
        }

        var sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, userType: newUser.userType };
        writeStorage(CURRENT_KEY, sessionUser);
        return { ok: true, user: sessionUser };
      });
    },

    // Log out and clear session
    logout: function (redirectUrl) {
      clearStorage(CURRENT_KEY);
      var done = function () { if (redirectUrl !== false) global.location.href = redirectUrl || 'index.html'; };
      if (db()) Promise.resolve(db().auth.signOut()).then(done, done); else done();
    },

    // Attach click listener to all [data-logout] and #logout elements
    bindLogout: function (redirectUrl) {
      document.querySelectorAll('[data-logout], #logout').forEach(function (btn) {
        btn.addEventListener('click', function () {
          HB_AUTH.logout(redirectUrl);
        });
      });
    },

    // Resolve a reliable user identifier (ID or email fallback)
    getUserId: function (userOrId) {
      if (typeof userOrId === 'string' && userOrId) return userOrId;
      if (userOrId && typeof userOrId === 'object') {
        if (userOrId.id) return String(userOrId.id);
        if (userOrId.email) return String(userOrId.email);
      }
      var cur = HB_AUTH.getUser();
      if (cur) return cur.id ? String(cur.id) : (cur.email ? String(cur.email) : null);
      return null;
    },

    // Get extra profile data enriched with user identity
    getProfile: function (userId) {
      var uid = HB_AUTH.getUserId(userId);
      if (!uid) return {};

      // Read stored profile by primary ID
      var prof = readStorage('homebase_profile_' + uid, null);

      // If not found and current user has an email or ID alternate, check alternate key
      var cur = readStorage(CURRENT_KEY, null);
      if (!prof && cur) {
        if (cur.email && cur.email !== uid) {
          prof = readStorage('homebase_profile_' + cur.email, null);
        }
        if (!prof && cur.id && cur.id !== uid) {
          prof = readStorage('homebase_profile_' + cur.id, null);
        }
      }
      prof = prof || {};

      // Merge with user record from homebase_users or session
      var users = readStorage(USERS_KEY, []);
      var match = null;
      for (var i = 0; i < users.length; i++) {
        if (String(users[i].id) === String(uid) || String(users[i].email) === String(uid)) {
          match = users[i];
          break;
        }
      }
      var src = match || (cur && (String(cur.id) === String(uid) || String(cur.email) === String(uid)) ? cur : null);
      if (src) {
        if (!prof.name && src.name) prof.name = src.name;
        if (!prof.email && src.email) prof.email = src.email;
        if (!prof.role && src.role) prof.role = src.role;
      }
      return prof;
    },

    // Save extra profile data and keep session & users synchronized
    saveProfile: function (data, userId) {
      var uid = HB_AUTH.getUserId(userId);
      if (!uid) return false;

      var prof = data || {};
      writeStorage('homebase_profile_' + uid, prof);

      // Also sync to active user session if this is the current user
      var cur = readStorage(CURRENT_KEY, null);
      if (cur && (String(cur.id) === String(uid) || String(cur.email) === String(uid))) {
        if (prof.name) cur.name = prof.name;
        if (prof.email) cur.email = prof.email;
        if (prof.photo) cur.photo = prof.photo;
        writeStorage(CURRENT_KEY, cur);

        // If current user has both id and email, save under both keys to prevent lookup misses
        if (cur.id && String(cur.id) !== uid) writeStorage('homebase_profile_' + cur.id, prof);
        if (cur.email && String(cur.email) !== uid) writeStorage('homebase_profile_' + cur.email, prof);
      }

      // Sync name & email in homebase_users if updated
      var users = readStorage(USERS_KEY, []);
      var userUpdated = false;
      for (var i = 0; i < users.length; i++) {
        if (String(users[i].id) === String(uid) || String(users[i].email) === String(uid)) {
          if (prof.name) users[i].name = prof.name;
          if (prof.email) users[i].email = prof.email;
          userUpdated = true;
          break;
        }
      }
      if (userUpdated) writeStorage(USERS_KEY, users);

      pushProfile(uid, prof);
      return true;
    },

    // Format lifestyle choices into readable text
    formatLifestyle: function (type, val) {
      if (!val) return 'Not specified';
      var MAP = {
        sleep: {
          'early': 'Early bird (before 11 PM)',
          'night': 'Night owl (after 1 AM)',
          'flexible': 'Flexible / Varies'
        },
        study: {
          'quiet': 'Quiet & alone in room',
          'group': 'Group study / Discussion',
          'music': 'With background music',
          'library': 'Prefers library / Cafe'
        },
        clean: {
          'very-neat': 'Very neat (cleans daily)',
          'moderate': 'Moderate (weekly cleanup)',
          'relaxed': 'Relaxed / Casual'
        }
      };
      if (MAP[type] && MAP[type][val]) return MAP[type][val];
      return String(val);
    },

    // ---- Age and parent / guardian approval ----
    // A student under 18 needs a parent or legal guardian to approve the account before requesting a room.
    // (Under the Philippine Data Privacy Act a minor cannot give valid consent alone; schools ask the parent or guardian.)
    // Date of birth is set at sign-up and cannot be edited later, so age cannot be changed to skip this step.
    ageFromDob: function (dob) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || ''));
      if (!m) return null;
      var y = +m[1], mo = +m[2], d = +m[3], now = new Date();
      var age = now.getFullYear() - y;
      if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
      return age;
    },
    getRecord: function (userId) {
      return readStorage(USERS_KEY, []).filter(function (u) { return String(u.id) === String(userId); })[0] || null;
    },
    isMinor: function (userId) {
      var r = HB_AUTH.getRecord(userId), a = r ? HB_AUTH.ageFromDob(r.dob) : null;
      return a !== null && a < 18;
    },
    needsGuardian: function (userId) {
      var r = HB_AUTH.getRecord(userId);
      return !!r && HB_AUTH.isMinor(userId) && r.guardianStatus !== 'approved';
    },
    // a message if this student may not request a room yet, otherwise an empty string
    requestBlock: function (userId) {
      return HB_AUTH.needsGuardian(userId)
        ? 'You are under 18, so a parent or legal guardian must approve your account before you can request a room. You can still browse, compare and save rooms. The approval code is on your Home page.'
        : '';
    },
    guardianCode: function (userId) {
      var r = HB_AUTH.getRecord(userId);
      return r && r.guardianStatus === 'pending' ? (r.guardianCode || '') : '';
    },
    // The student asks for a fresh code. Resolves to the new code, or '' when it could not be made.
    newGuardianCode: function (userId) {
      if (!db()) return Promise.resolve('');
      return db().rpc('new_guardian_code').then(function (r) {
        if (r.error || !r.data) return '';
        return loadProfile(userId).then(function (pr) { if (pr.data) cacheProfile(pr.data); return r.data; });
      }, function () { return ''; });
    },
    // Called from the parent approval page (no login). Resolves to { ok, studentName } or { ok: false, error }.
    approveGuardian: function (email, code, guardianName) {
      var generic = { ok: false, error: 'That email, code and name do not match a pending approval. Please check them with the student and try again.' };
      if (!db()) return Promise.resolve({ ok: false, error: NO_DB });
      return db().rpc('approve_guardian', { p_email: String(email || '').trim(), p_code: String(code || '').trim(), p_name: String(guardianName || '') }).then(function (r) {
        if (r.error) return { ok: false, error: 'Something went wrong. Please try again in a moment.' };
        var v = String(r.data || '');
        if (v.indexOf('ok|') === 0) return { ok: true, studentName: v.slice(3) };
        if (v === 'locked') return { ok: false, locked: true, error: 'Too many wrong tries. The student must get a new code on their Home page.' };
        return generic;
      }, function () { return { ok: false, error: NO_DB }; });
    },

    // Safe helpers for text that comes from users. Never put user text into innerHTML: build elements instead.
    // An <img> for a profile photo, or null when the photo is not a real image data URL.
    safeImg: function (photo, alt) {
      if (typeof photo !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]*$/.test(photo)) return null;
      var img = document.createElement('img');
      img.src = photo; img.alt = String(alt || ''); img.className = 'h-full w-full object-cover rounded-full';
      return img;
    },
    // keep only the characters a phone link can safely hold
    safeTel: function (phone) { return String(phone || '').replace(/[^0-9+*#]/g, ''); },

    // Render avatar into element (either image if photo set, or initial)
    renderAvatar: function (el, user) {
      if (!el) return;
      var u = user || HB_AUTH.getUser();
      if (!u) return;
      var uid = HB_AUTH.getUserId(u);
      var prof = uid ? HB_AUTH.getProfile(uid) : {};
      var name = String((u && u.name) || prof.name || (u && u.email) || prof.email || 'User');
      var initial = name.charAt(0).toUpperCase();

      var photoImg = (prof && prof.photo) ? HB_AUTH.safeImg(prof.photo, name) : null;
      if (photoImg) {
        el.textContent = '';
        el.appendChild(photoImg);
        el.classList.add('overflow-hidden');
      } else {
        el.textContent = initial;
        el.classList.remove('overflow-hidden');
      }
    }
  };

  global.HB_AUTH = HB_AUTH;

  // On every page load: confirm the Supabase session is still valid, and refresh the cached profile.
  // If something important changed (guardian approval, role), reload once so the page shows it.
  (function () {
    var cached = readStorage(CURRENT_KEY, null);
    if (!cached || !cached.id || !db()) return;
    db().auth.getSession().then(function (r) {
      var sess = r && r.data && r.data.session;
      if (!sess) {
        clearStorage(CURRENT_KEY);
        if (!/(^|\/)(index\.html)?$/.test(global.location.pathname)) global.location.replace('index.html');
        return;
      }
      var before = HB_AUTH.getRecord(cached.id);
      loadProfile(sess.user.id).then(function (pr) {
        if (!pr.data) return;
        cacheProfile(pr.data);
        if (before && (before.guardianStatus !== pr.data.guardian_status || before.role !== pr.data.role)) global.location.reload();
      });
    }).catch(function () {});
  })();
})(window);
