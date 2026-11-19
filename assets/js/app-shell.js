/*
  The navigation for every signed-in page, for students AND the landlord. It replaces assets/js/landlord-shell.js.

  Laptops (768px and wider): a dark green sidebar on the left (logo, links, your name, Log out).
  Phones: a slim top bar with a menu to access all pages and Log out.
    Students:  Home, Matches, Rooms, Messages, Concerns, Profile and Log out.
    Landlord:  Dashboard, Rooms, Messages, Concerns, Reviews, Profile and Log out.

  How to use it: put <script src="assets/js/app-shell.js"></script> as the FIRST thing inside <body>.
  It loads assets/css/shell.css by itself and removes the page's old navbar, if there is one.

  It keeps the ids and attributes the pages' own scripts already use, so those scripts keep working:
    nav-initial / nav-avatar, nav-name, menu-btn, menu, menu-label, logout, logout-m, [data-logout],
    [data-msg-badge] (unread count, filled by messages.js), [data-concerns-nav] (students see it only while they live here, shown by messages.js).
*/
(function () {
  'use strict';

  var user = {};
  try { user = JSON.parse(localStorage.getItem('homebase_currentUser') || '{}') || {}; } catch (e) {}
  if (!user.email) return; // signed out: the page sends the person to the login itself
  var isLL = user.role === 'landlord';

  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'assets/css/shell.css';
  document.head.appendChild(css);

  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0B4A2F"/><rect x="7" y="8" width="7" height="8" rx="1.5" fill="#083A25"/><rect x="18" y="8" width="7" height="8" rx="1.5" fill="#C6F24E"/><rect x="7" y="19" width="7" height="8" rx="1.5" fill="#083A25"/><rect x="18" y="19" width="7" height="8" rx="1.5" fill="#083A25"/></svg>';
  function icon(p) { return '<svg class="hb-ico" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  var ICONS = {
    home: icon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    matches: icon('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    explore: icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    dashboard: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
    rooms: icon('<path d="M3 21h18"/><path d="M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2"/><path d="M10 21v-4h4v4"/>'),
    messages: icon('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    reviews: icon('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    concerns: icon('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z"/>'),
    profile: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    menu: icon('<path d="M4 7h16M4 12h16M4 17h16"/>')
  };

  // concerns: students see it only when messages.js says so.
  var NAV = isLL ? [
    { href: 'landlord.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'landlord-rooms.html', label: 'Rooms', icon: 'rooms' },
    { href: 'landlord-messages.html', label: 'Messages', icon: 'messages', badge: 'data-msg-badge' },
    { href: 'landlord-concerns.html', label: 'Concerns', icon: 'concerns', badge: 'data-concern-badge' },
    { href: 'landlord-reviews.html', label: 'Reviews', icon: 'reviews' },
    { href: 'profile.html', label: 'Profile', icon: 'profile' }
  ] : [
    { href: 'home.html', label: 'Home', icon: 'home' },
    { href: 'matches.html', label: 'My Matches', short: 'Matches', icon: 'matches' },
    { href: 'rooms.html', label: 'Explore Rooms', short: 'Rooms', icon: 'explore' },
    { href: 'messages.html', label: 'Messages', icon: 'messages', badge: 'data-msg-badge' },
    { href: 'concerns.html', label: 'Concerns', icon: 'concerns', studentConcerns: true },
    { href: 'profile.html', label: 'Profile', icon: 'profile' }
  ];
  var home = NAV[0].href;
  // Vercel serves /home as well as /home.html, so compare without the extension
  function bare(s) { return String(s).toLowerCase().replace(/\.html$/, ''); }
  var here = bare(location.pathname.split('/').pop() || '');

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function badge(attr) { var b = el('span', 'chip chip-warn hidden'); b.setAttribute(attr, ''); return b; }
  function current(a, item) { if (here === bare(item.href)) a.setAttribute('aria-current', 'page'); }
  function logout() { try { localStorage.removeItem('homebase_currentUser'); } catch (e) {} window.location.href = 'index.html'; }
  function avatar(id) {
    var a = el('span', 'hb-avatar'); if (id) a.id = id; a.setAttribute('aria-hidden', 'true');
    if (window.HB_AUTH && HB_AUTH.renderAvatar) HB_AUTH.renderAvatar(a, user);
    else a.textContent = String(user.name || user.email || '?').charAt(0).toUpperCase();
    return a;
  }
  function brand() {
    var a = el('a', 'hb-brand'); a.href = home; a.setAttribute('aria-label', 'Homebase home');
    a.innerHTML = LOGO; a.appendChild(el('span', null, 'Homebase')); return a;
  }
  function link(item, cls) {
    var a = el('a', cls); a.href = item.href; current(a, item);
    a.innerHTML = ICONS[item.icon]; a.appendChild(el('span', null, item.label));
    if (item.badge) a.appendChild(badge(item.badge));
    return a;
  }
  function li(a, item) {
    var n = el('li'); n.appendChild(a);
    if (item && item.studentConcerns) { n.setAttribute('data-concerns-nav', ''); n.style.display = 'none'; }
    return n;
  }

  document.body.classList.add('hb-body');
  document.documentElement.style.scrollPaddingTop = '5rem'; // #links should not land under the phone top bar

  var skip = el('a', 'hb-skip', 'Skip to main content'); skip.href = '#main';

  // ---- sidebar (laptops) ----
  var side = el('aside', 'hb-side');
  side.appendChild(brand());
  side.appendChild(el('p', 'hb-sub', isLL ? 'Ariate Dormitory \u00B7 Landlord' : 'Ariate Dormitory \u00B7 Student'));
  var nav = el('nav', 'hb-nav'); nav.setAttribute('aria-label', 'Main');
  var ul = el('ul');
  NAV.forEach(function (item) { ul.appendChild(li(link(item, 'hb-link'), item)); });
  nav.appendChild(ul); side.appendChild(nav);
  var me = el('div', 'hb-user');
  var meLink = el('a', 'hb-user-link flex-1'); meLink.href = 'profile.html'; meLink.setAttribute('aria-label', 'My profile');
  meLink.appendChild(avatar(isLL ? 'nav-avatar' : 'nav-initial'));
  var who = el('span', 'hb-who');
  var first = String(user.name || user.email || '').split(/\s+/)[0];
  var nm = el('span', 'hb-name', isLL ? String(user.name || user.email) : first); nm.id = 'nav-name';
  who.appendChild(nm); who.appendChild(el('span', 'hb-role', isLL ? 'Landlord' : 'Student')); meLink.appendChild(who);

  var themeToggle = (window.HB_THEME && HB_THEME.createButton) ? HB_THEME.createButton() : el('button', 'hb-theme-toggle');
  themeToggle.setAttribute('data-theme-toggle', '');
  if (!themeToggle.innerHTML) themeToggle.innerHTML = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

  var meRow = el('div', 'flex items-center justify-between gap-2 mb-2');
  meRow.appendChild(meLink);
  meRow.appendChild(themeToggle);

  var out = el('button', 'btn btn-logout', 'Log out'); out.type = 'button'; out.id = 'logout'; out.setAttribute('data-logout', '');
  out.addEventListener('click', logout);
  me.appendChild(meRow); me.appendChild(out); side.appendChild(me);

  // ---- top bar (phones) ----
  var top = el('header', 'hb-top');
  top.appendChild(brand());
  var right = el('div', 'hb-top-right');
  
  var mThemeToggle = (window.HB_THEME && HB_THEME.createButton) ? HB_THEME.createButton() : el('button', 'hb-theme-toggle');
  mThemeToggle.setAttribute('data-theme-toggle', '');
  if (!mThemeToggle.innerHTML) mThemeToggle.innerHTML = themeToggle.innerHTML;
  right.appendChild(mThemeToggle);

  var pl = el('a', 'hb-user-link'); pl.href = 'profile.html'; pl.setAttribute('aria-label', 'My profile'); pl.appendChild(avatar(null));
  right.appendChild(pl);
  var mb = el('button', 'btn btn-outline text-sm !min-h-[38px] !px-3', 'Menu');
  mb.type = 'button'; mb.id = 'menu-btn'; mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-controls', 'menu');
  right.appendChild(mb);
  top.appendChild(right);

  // ---- mobile menu dropdown (phones) ----
  var sheet = el('div', 'hb-sheet'); sheet.id = 'menu'; sheet.hidden = true;
  var sul = el('ul'); sul.id = 'menu-links';
  NAV.forEach(function (item) { sul.appendChild(li(link(item, 'hb-link'), item)); });
  sheet.appendChild(sul);
  var out3 = el('button', 'btn btn-logout', 'Log out'); out3.type = 'button'; out3.id = 'logout-m'; out3.setAttribute('data-logout', '');
  out3.addEventListener('click', logout); sheet.appendChild(out3);

  mb.addEventListener('click', function () {
    sheet.hidden = !sheet.hidden;
    mb.setAttribute('aria-expanded', String(!sheet.hidden));
    mb.textContent = sheet.hidden ? 'Menu' : 'Close';
  });

  document.addEventListener('click', function (e) {
    if (!sheet.hidden && !sheet.contains(e.target) && !mb.contains(e.target)) {
      sheet.hidden = true;
      mb.setAttribute('aria-expanded', 'false');
      mb.textContent = 'Menu';
    }
  });

  var parts = [skip, side, top, sheet];

  var frag = document.createDocumentFragment();
  parts.forEach(function (n) { frag.appendChild(n); });
  document.body.insertBefore(frag, document.body.firstChild);

  // landlord: how many concerns are new (status "received", same rule as HB_CONCERNS.newCount)
  function paintConcerns() {
    var n = 0; try { n = JSON.parse(localStorage.getItem('homebase_concerns') || '[]').filter(function (c) { return c.status === 'received'; }).length; } catch (e) {}
    document.querySelectorAll('[data-concern-badge]').forEach(function (b) { b.textContent = n + ' new'; b.classList.toggle('hidden', n === 0); });
  }
  if (isLL) {
    paintConcerns();
    window.addEventListener('storage', function (e) { if (!e.key || e.key === 'homebase_concerns') paintConcerns(); });
    window.addEventListener('hb-concerns', paintConcerns);
  }

  // the skip link needs somewhere to land, and the old navbar would repeat the ids
  document.addEventListener('DOMContentLoaded', function () {
    var old = document.querySelectorAll('body > header:not(.hb-top)');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
    if (main) main.setAttribute('tabindex', '-1');
  });
})();