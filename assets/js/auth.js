/*
  Homebase Authentication & Session Management
  Shared across all pages: index.html, home.html, landlord.html, matches.html, rooms.html, floorplan.html, profile.html.

  Storage keys:
    homebase_users        List of registered user accounts: [{ id, name, email, role, password }]
    homebase_currentUser Currently active user session: { id, name, email, role }
        landlord account: manager@ariatedorm.com 
        password        : ariate-office-2026
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
          password: 'sha256:324edabe4fea58d0f91f5f8fc20af8ef9df416b2f14ff262216ae5a6a5617fbc'
        }
      ]);
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
      var cleanRole = role === 'landlord' ? 'landlord' : 'student';
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

    // Get extra profile data enriched with user identity
    getProfile: function (userId) {
      var uid = userId;
      if (!uid) {
        var u = HB_AUTH.getUser();
        uid = (u && u.id) ? u.id : null;
      }
      if (!uid) return {};
      var prof = readStorage('homebase_profile_' + uid, {}) || {};

      // Merge with user record from homebase_users
      var users = readStorage(USERS_KEY, []);
      var match = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === uid) { match = users[i]; break; }
      }
      if (match) {
        if (!prof.name) prof.name = match.name;
        if (!prof.email) prof.email = match.email;
        if (!prof.role) prof.role = match.role;
      } else {
        var cur = readStorage(CURRENT_KEY, null);
        if (cur && cur.id === uid) {
          if (!prof.name) prof.name = cur.name;
          if (!prof.email) prof.email = cur.email;
          if (!prof.role) prof.role = cur.role;
        }
      }
      return prof;
    },

    // Save extra profile data
    saveProfile: function (data, userId) {
      var u = userId ? { id: userId } : HB_AUTH.getUser();
      if (!u || !u.id) return false;
      return writeStorage('homebase_profile_' + u.id, data || {});
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

    // Render avatar into element (either image if photo set, or initial)
    renderAvatar: function (el, user) {
      if (!el) return;
      var u = user || HB_AUTH.getUser();
      if (!u) return;
      var uid = (typeof u === 'object') ? u.id : (typeof u === 'string' ? u : null);
      var prof = uid ? HB_AUTH.getProfile(uid) : {};
      var name = String((u && u.name) || prof.name || (u && u.email) || prof.email || 'User');
      var initial = name.charAt(0).toUpperCase();

      if (prof && prof.photo) {
        el.innerHTML = '<img src="' + prof.photo + '" alt="' + name + '" class="h-full w-full object-cover rounded-full">';
        el.classList.add('overflow-hidden');
      } else {
        el.textContent = initial;
        el.classList.remove('overflow-hidden');
      }
    }
  };

  global.HB_AUTH = HB_AUTH;
})(window);
