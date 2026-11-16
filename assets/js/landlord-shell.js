/*
  The landlord's navigation, shared by every landlord page so they all look and behave the same.
  Pages that use it: landlord.html, landlord-rooms.html, landlord-messages.html, landlord-reviews.html, and profile.html (landlord only).

  What it draws (the styles are in assets/css/components.css, the ".ll-" section):
    laptops (768px and wider)  a sidebar on the left: logo, six links, then the landlord's name and Log out
    phones                     a slim top bar (logo, profile, Log out) and a bottom tab bar with the first five links (Profile is the avatar)

  How to use it: put <script src="assets/js/landlord-shell.js"></script> as the FIRST thing inside <body>, and do not add a navbar to the page.
  It does nothing for students, so profile.html can load it for everyone.

  It keeps the ids the pages already use (nav-avatar, nav-name, logout, logout-m), so each page's own script still works.
  The Messages link carries the unread badge (data-msg-badge), which assets/js/messages.js fills in.
*/
(function () {
  'use strict';

  var user = {};
  try { user = JSON.parse(localStorage.getItem('homebase_currentUser') || '{}') || {}; } catch (e) {}
  if (user.role !== 'landlord') return;

  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0B4A2F"/><rect x="7" y="8" width="7" height="8" rx="1.5" fill="#083A25"/><rect x="18" y="8" width="7" height="8" rx="1.5" fill="#C6F24E"/><rect x="7" y="19" width="7" height="8" rx="1.5" fill="#083A25"/><rect x="18" y="19" width="7" height="8" rx="1.5" fill="#083A25"/></svg>';
  function icon(paths) { return '<svg class="ll-ico" viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>'; }
  var ICONS = {
    dashboard: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
    rooms: icon('<path d="M3 21h18"/><path d="M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2"/><path d="M10 21v-4h4v4"/>'),
    messages: icon('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
    reviews: icon('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    concerns: icon('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z"/>'),
    profile: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')
  };
  var NAV = [
    { href: 'landlord.html', label: 'Dashboard', icon: 'dashboard' },
    { href: 'landlord-rooms.html', label: 'Rooms', icon: 'rooms' },
    { href: 'landlord-messages.html', label: 'Messages', icon: 'messages', badge: true },
    { href: 'landlord-concerns.html', label: 'Concerns', icon: 'concerns', concerns: true },
    { href: 'landlord-reviews.html', label: 'Reviews', icon: 'reviews' },
    { href: 'profile.html', label: 'Profile', icon: 'profile', noTab: true } // phones open it from the avatar in the top bar
  ];
  var here = (location.pathname.split('/').pop() || '').toLowerCase();

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function badge(attr) { var b = el('span', 'chip chip-warn hidden'); b.setAttribute(attr || 'data-msg-badge', ''); return b; }
  function avatar(id) {
    var a = el('span', 'll-avatar'); if (id) a.id = id; a.setAttribute('aria-hidden', 'true');
    if (window.HB_AUTH && HB_AUTH.renderAvatar) HB_AUTH.renderAvatar(a, user);
    else a.textContent = String(user.name || user.email || 'M').charAt(0).toUpperCase();
    return a;
  }
  function logout() { try { localStorage.removeItem('homebase_currentUser'); } catch (e) {} window.location.href = 'index.html'; }
  function brand() {
    var a = el('a', 'll-brand'); a.href = 'landlord.html'; a.setAttribute('aria-label', 'Homebase dashboard');
    a.innerHTML = LOGO; a.appendChild(el('span', null, 'Homebase')); return a;
  }
  function mark(a, item) { if (here === item.href) a.setAttribute('aria-current', 'page'); }

  document.body.classList.add('ll-body');
  document.documentElement.style.scrollPaddingTop = '5rem'; // so #links do not land under the phone top bar

  // ---- skip link ----
  var skip = el('a', 'll-skip', 'Skip to main content'); skip.href = '#main';

  // ---- sidebar (laptops) ----
  var side = el('aside', 'll-side');
  side.appendChild(brand());
  side.appendChild(el('p', 'll-sub', 'Ariate Dormitory \u00B7 Landlord'));
  var sideNav = el('nav', 'll-nav'); sideNav.setAttribute('aria-label', 'Main');
  var ul = el('ul');
  NAV.forEach(function (item) {
    var li = el('li'), a = el('a', 'll-link'); a.href = item.href; mark(a, item);
    a.innerHTML = ICONS[item.icon]; a.appendChild(el('span', null, item.label));
    if (item.badge) a.appendChild(badge());
    if (item.concerns) a.appendChild(badge('data-concern-badge'));
    li.appendChild(a); ul.appendChild(li);
  });
  sideNav.appendChild(ul); side.appendChild(sideNav);
  var me = el('div', 'll-user');
  var meLink = el('a', 'll-user-link'); meLink.href = 'profile.html'; meLink.setAttribute('aria-label', 'My profile');
  meLink.appendChild(avatar('nav-avatar'));
  var who = el('span', 'll-who'); var nm = el('span', 'll-name', String(user.name || user.email || '')); nm.id = 'nav-name';
  who.appendChild(nm); who.appendChild(el('span', 'll-role', 'Landlord')); meLink.appendChild(who);
  var out = el('button', 'btn btn-logout', 'Log out'); out.type = 'button'; out.id = 'logout'; out.addEventListener('click', logout);
  me.appendChild(meLink); me.appendChild(out); side.appendChild(me);

  // ---- top bar (phones) ----
  var top = el('header', 'll-top');
  top.appendChild(brand());
  var right = el('div', 'll-top-right');
  var pl = el('a', 'rounded-full'); pl.href = 'profile.html'; pl.setAttribute('aria-label', 'My profile'); pl.className = 'll-user-link'; pl.style.padding = '0'; pl.appendChild(avatar(null));
  var out2 = el('button', 'btn btn-logout', 'Log out'); out2.type = 'button'; out2.id = 'logout-m'; out2.addEventListener('click', logout);
  right.appendChild(pl); right.appendChild(out2); top.appendChild(right);

  // ---- bottom tabs (phones) ----
  var tabs = el('nav', 'll-tabs'); tabs.setAttribute('aria-label', 'Main');
  var tul = el('ul');
  NAV.forEach(function (item) {
    if (item.noTab) return;
    var li = el('li'), a = el('a', 'll-tab'); a.href = item.href; mark(a, item);
    var pill = el('span', 'll-pill'); pill.innerHTML = ICONS[item.icon]; if (item.badge) pill.appendChild(badge()); if (item.concerns) pill.appendChild(badge('data-concern-badge'));
    a.appendChild(pill); a.appendChild(el('span', null, item.label));
    li.appendChild(a); tul.appendChild(li);
  });
  tabs.appendChild(tul);

  var frag = document.createDocumentFragment();
  [skip, side, top, tabs].forEach(function (n) { frag.appendChild(n); });
  document.body.insertBefore(frag, document.body.firstChild);

  // the Concerns badge: how many are new (status "received", same rule as HB_CONCERNS.newCount)
  function paintConcerns() {
    var n = 0; try { n = JSON.parse(localStorage.getItem('homebase_concerns') || '[]').filter(function (c) { return c.status === 'received'; }).length; } catch (e) {}
    document.querySelectorAll('[data-concern-badge]').forEach(function (b) { b.textContent = n + ' new'; b.classList.toggle('hidden', n === 0); });
  }
  paintConcerns();
  window.addEventListener('storage', function (e) { if (!e.key || e.key === 'homebase_concerns') paintConcerns(); });
  window.addEventListener('hb-concerns', paintConcerns);

  // the skip link needs somewhere to land
  document.addEventListener('DOMContentLoaded', function () {
    var old = document.querySelectorAll('body > header:not(.ll-top)');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]); // its ids would clash with the sidebar's
    var main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
    if (main) main.setAttribute('tabindex', '-1');
  });
})();