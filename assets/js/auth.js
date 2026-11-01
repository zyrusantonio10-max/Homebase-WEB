/*
  Homebase Authentication & Session Management
  Shared across all pages: index.html, home.html, landlord.html, matches.html, rooms.html, floorplan.html.

  Storage keys:
    homebase_users        List of registered user accounts: [{ id, name, email, role, password }]
    homebase_currentUser Currently active user session: { id, name, email, role }
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
    userKey: function (baseKey) {
      var u = HB_AUTH.getUser();
      return (u && u.id) ? (baseKey + '_' + u.id) : baseKey;
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
    }
  };

  global.HB_AUTH = HB_AUTH;
})(window);

