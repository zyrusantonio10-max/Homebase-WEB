/*
  Theme manager for light and dark mode.
  Handles theme state persistence, UI toggles, and system preference changes.
*/

(function (global) {
  'use strict';

  var STORAGE_KEY = 'homebase_theme';

  // Moon SVG (shown in light mode to switch to dark)
  var MOON_SVG = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  
  // Sun SVG (shown in dark mode to switch to light)
  var SUN_SVG = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

  // Read saved theme
  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    // Fallback to system preference
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Apply theme class to <html>
  function applyTheme(theme) {
    var isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update aria labels on all mounted toggles
    var toggles = document.querySelectorAll('[data-theme-toggle]');
    toggles.forEach(function (btn) {
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });

    // Dispatch event for any custom listeners
    window.dispatchEvent(new CustomEvent('hb-theme-change', { detail: { theme: theme, isDark: isDark } }));
  }

  // Public API
  var HB_THEME = {
    get: function () {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    },
    isDark: function () {
      return document.documentElement.classList.contains('dark');
    },
    set: function (theme) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
      applyTheme(theme);
    },
    toggle: function () {
      var current = HB_THEME.get();
      var next = current === 'dark' ? 'light' : 'dark';
      HB_THEME.set(next);
      return next;
    },
    createButton: function (extraClass) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hb-theme-toggle ' + (extraClass || '');
      btn.setAttribute('data-theme-toggle', '');
      var isDark = HB_THEME.isDark();
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.innerHTML = MOON_SVG + SUN_SVG;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        HB_THEME.toggle();
      });
      return btn;
    }
  };

  // Immediate init before DOM finishes loading to eliminate white flash
  applyTheme(getSavedTheme());

  // Listen to system changes if user hasn't explicitly set a preference
  if (global.matchMedia) {
    global.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      } catch (err) {}
    });
  }

  // Auto-mount toggles when DOM is ready
  function autoMountToggles() {
    // Landlord sidebar toggle
    var llUser = document.querySelector('.ll-user, .hb-user');
    if (llUser && !llUser.querySelector('[data-theme-toggle]')) {
      var userLink = llUser.querySelector('.ll-user-link, .hb-user-link');
      if (userLink) {
        var btn = HB_THEME.createButton('ml-auto');
        userLink.style.display = 'flex';
        userLink.style.alignItems = 'center';
        userLink.style.justifyContent = 'space-between';
        userLink.style.width = '100%';
        userLink.appendChild(btn);
      }
    }

    // Landlord mobile top bar toggle
    var llTopRight = document.querySelector('.ll-top-right, .hb-top-right');
    if (llTopRight && !llTopRight.querySelector('[data-theme-toggle]')) {
      var mBtn = HB_THEME.createButton();
      llTopRight.insertBefore(mBtn, llTopRight.firstChild);
    }

    // Student navbar toggle
    var navUserArea = document.querySelector('header nav .flex.items-center.gap-2');
    if (navUserArea && !navUserArea.querySelector('[data-theme-toggle]')) {
      var sBtn = HB_THEME.createButton();
      var profileLink = navUserArea.querySelector('a[href="profile.html"]');
      if (profileLink) {
        navUserArea.insertBefore(sBtn, profileLink);
      } else {
        navUserArea.insertBefore(sBtn, navUserArea.firstChild);
      }
    }

    // Student mobile menu dropdown toggle
    var mobileMenu = document.querySelector('#menu, .hb-sheet, .ll-menu');
    if (mobileMenu && !mobileMenu.querySelector('[data-theme-toggle-mobile]')) {
      var row = document.createElement('div');
      row.className = 'mt-3 pt-3 border-t border-line flex items-center justify-between px-3 text-sm font-medium text-ink';
      row.setAttribute('data-theme-toggle-mobile', '');
      row.innerHTML = '<span>Appearance</span>';
      row.appendChild(HB_THEME.createButton());
      mobileMenu.appendChild(row);
    }

    // Bind click events on static theme toggles
    document.querySelectorAll('[data-theme-toggle]').forEach(function (el) {
      if (!el._bound) {
        el._bound = true;
        el.addEventListener('click', function (e) {
          e.preventDefault();
          HB_THEME.toggle();
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountToggles);
  } else {
    autoMountToggles();
  }

  global.HB_THEME = HB_THEME;

})(window);
