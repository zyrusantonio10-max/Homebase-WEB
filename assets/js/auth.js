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
  seedDefaultUsers();

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

  var HB_AUTH = {
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

    // Login with email and password
    login: function (email, password) {
      var cleanEmail = String(email || '').trim().toLowerCase();
      var cleanPw = String(password || '');

      return hashPassword(cleanPw).then(function (hash) {
        var users = readStorage(USERS_KEY, []);
        var match = users.filter(function (u) {
          return u.email === cleanEmail && u.password === hash;
        })[0];

        if (!match) {
          return {
            ok: false,
            error: 'That email and password do not match. Check both and try again, or create an account.'
          };
        }

        var sessionUser = { id: match.id, name: match.name, email: match.email, role: match.role };
        if (!writeStorage(CURRENT_KEY, sessionUser)) {
          return {
            ok: false,
            error: 'Your browser is blocking local storage, so we cannot keep you logged in. Allow site data and try again.'
          };
        }

        return { ok: true, user: sessionUser };
      });
    },

    // Register a new account
    register: function (name, email, password, role) {
      var cleanName = String(name || '').trim();
      var cleanEmail = String(email || '').trim().toLowerCase();
      // Only students can register. There is one dormitory, so the landlord (office) account is created by the system, never by sign-up.
      var cleanRole = 'student';
      var cleanPw = String(password || '');

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
          password: hash
        };

        users.push(newUser);
        if (!writeStorage(USERS_KEY, users)) {
          return {
            ok: false,
            error: 'Your browser is blocking local storage, so we cannot save your account. Allow site data and try again.'
          };
        }

        var sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
        writeStorage(CURRENT_KEY, sessionUser);
        return { ok: true, user: sessionUser };
      });
    },

    // Log out and clear session
    logout: function (redirectUrl) {
      clearStorage(CURRENT_KEY);
      if (redirectUrl !== false) {
        global.location.href = redirectUrl || 'index.html';
      }
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
    newGuardianCode: function (userId) {
      var users = readStorage(USERS_KEY, []), code;
      var arr = global.crypto && global.crypto.getRandomValues ? global.crypto.getRandomValues(new Uint32Array(1)) : [Math.floor(Math.random() * 4294967295)];
      code = String(100000 + (arr[0] % 900000));
      for (var i = 0; i < users.length; i++) {
        if (String(users[i].id) === String(userId) && users[i].guardianStatus === 'pending') {
          users[i].guardianCode = code; users[i].guardianAttempts = 0;
          writeStorage(USERS_KEY, users);
          return code;
        }
      }
      return '';
    },
    // Called from the parent approval page. Three things must match: the student's email, the code, and the guardian's name.
    approveGuardian: function (email, code, guardianName) {
      var generic = { ok: false, error: 'That email, code and name do not match a pending approval. Please check them with the student and try again.' };
      var norm = function (s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); };
      var users = readStorage(USERS_KEY, []), e = norm(email), rec = null;
      for (var i = 0; i < users.length; i++) if (users[i].email === e) { rec = users[i]; break; }
      if (!rec || rec.guardianStatus !== 'pending' || !rec.guardianCode) return generic;
      if ((rec.guardianAttempts || 0) >= 5) return { ok: false, locked: true, error: 'Too many wrong tries. The student must get a new code on their Home page.' };
      if (String(code || '').trim() !== rec.guardianCode || norm(guardianName) !== norm(rec.guardian && rec.guardian.name)) {
        rec.guardianAttempts = (rec.guardianAttempts || 0) + 1;
        writeStorage(USERS_KEY, users);
        return generic;
      }
      rec.guardianStatus = 'approved'; rec.guardianApprovedAt = new Date().toISOString();
      delete rec.guardianCode; delete rec.guardianAttempts;
      writeStorage(USERS_KEY, users);
      return { ok: true, studentName: rec.name };
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
})(window);