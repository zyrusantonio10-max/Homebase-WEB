/*
  Landlord navigation shell component.
  Renders responsive navigation for landlord management pages:
    Desktop (>= 768px): fixed left sidebar with navigation links and profile.
    Mobile (< 768px): top header with expandable navigation dropdown.
  Supports badge indicators for incoming messages and pending maintenance tickets.
*/
(function () {
  'use strict';

  var user = {};
  try { user = JSON.parse(localStorage.getItem('homebase_currentUser') || '{}') || {}; } catch (e) {}
  if (user.role !== 'landlord') return;

  var LOGO = '<img src="/assets/images/logo.png" alt="Homebase" class="h-9 w-9 rounded-full object-contain shrink-0">';
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
    { href: '/pages/landlord/landlord.html', label: 'Dashboard', icon: 'dashboard' },
    { href: '/pages/landlord/landlord-rooms.html', label: 'Rooms', icon: 'rooms' },
    { href: '/pages/landlord/landlord-messages.html', label: 'Messages', icon: 'messages', badge: true },
    { href: '/pages/landlord/landlord-concerns.html', label: 'Concerns', icon: 'concerns', concerns: true },
    { href: '/pages/landlord/landlord-reviews.html', label: 'Reviews', icon: 'reviews' },
    { href: '/pages/student/profile.html', label: 'Profile', icon: 'profile' }
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
  function logout() { if (window.HB_AUTH && HB_AUTH.logout) { HB_AUTH.logout(); return; } try { localStorage.removeItem('homebase_currentUser'); } catch (e) {} window.location.href = '/index.html'; }
  function brand() {
    var a = el('a', 'll-brand'); a.href = '/pages/landlord/landlord.html'; a.setAttribute('aria-label', 'Homebase dashboard');
    a.innerHTML = LOGO; a.appendChild(el('span', null, 'Homebase')); return a;
  }
  function mark(a, item) { if (here === item.href) a.setAttribute('aria-current', 'page'); }

  document.body.classList.add('ll-body');
  document.documentElement.style.scrollPaddingTop = '5rem'; // Offset anchor links below mobile header

  // Skip link
  var skip = el('a', 'll-skip', 'Skip to main content'); skip.href = '#main';

  // Desktop sidebar
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
  var meLink = el('a', 'll-user-link flex-1'); meLink.href = '/pages/student/profile.html'; meLink.setAttribute('aria-label', 'My profile');
  meLink.appendChild(avatar('nav-avatar'));
  var who = el('span', 'll-who'); var nm = el('span', 'll-name', String(user.name || user.email || '')); nm.id = 'nav-name';
  who.appendChild(nm); who.appendChild(el('span', 'll-role', 'Landlord')); meLink.appendChild(who);
  
  // Theme toggle button
  var themeToggle = (window.HB_THEME && HB_THEME.createButton) ? HB_THEME.createButton() : el('button', 'hb-theme-toggle');
  themeToggle.setAttribute('data-theme-toggle', '');
  if (!themeToggle.innerHTML) themeToggle.innerHTML = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  
  var meRow = el('div', 'flex items-center justify-between gap-2 mb-2');
  meRow.appendChild(meLink);
  meRow.appendChild(themeToggle);

  var out = el('button', 'btn btn-logout', 'Log out'); out.type = 'button'; out.id = 'logout'; out.setAttribute('data-logout', '');
  out.addEventListener('click', logout);
  me.appendChild(meRow); me.appendChild(out); side.appendChild(me);

  // Mobile top navigation bar
  var top = el('header', 'll-top');
  top.appendChild(brand());
  var right = el('div', 'll-top-right');
  
  var mThemeToggle = (window.HB_THEME && HB_THEME.createButton) ? HB_THEME.createButton() : el('button', 'hb-theme-toggle');
  mThemeToggle.setAttribute('data-theme-toggle', '');
  if (!mThemeToggle.innerHTML) mThemeToggle.innerHTML = themeToggle.innerHTML;
  right.appendChild(mThemeToggle);

  var pl = el('a', 'rounded-full'); pl.href = '/pages/student/profile.html'; pl.setAttribute('aria-label', 'My profile'); pl.className = 'll-user-link'; pl.style.padding = '0'; pl.appendChild(avatar(null));
  var menuBtn = el('button', 'btn btn-outline text-sm !min-h-[38px] !px-3', 'Menu');
  menuBtn.type = 'button'; menuBtn.id = 'menu-btn'; menuBtn.setAttribute('aria-expanded', 'false');
  right.appendChild(pl); right.appendChild(menuBtn); top.appendChild(right);

  // Mobile dropdown menu
  var menu = el('div', 'll-menu');
  menu.id = 'menu'; menu.hidden = true;
  var mul = el('ul');
  NAV.forEach(function (item) {
    var li = el('li'), a = el('a', 'll-link'); a.href = item.href; mark(a, item);
    a.innerHTML = ICONS[item.icon]; a.appendChild(el('span', null, item.label));
    if (item.badge) a.appendChild(badge());
    if (item.concerns) a.appendChild(badge('data-concern-badge'));
    li.appendChild(a); mul.appendChild(li);
  });
  menu.appendChild(mul);
  var out2 = el('button', 'btn btn-logout', 'Log out'); out2.type = 'button'; out2.id = 'logout-m'; out2.setAttribute('data-logout', '');
  out2.addEventListener('click', logout);
  menu.appendChild(out2);

  menuBtn.addEventListener('click', function () {
    menu.hidden = !menu.hidden;
    menuBtn.setAttribute('aria-expanded', String(!menu.hidden));
    menuBtn.textContent = menu.hidden ? 'Menu' : 'Close';
  });

  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = 'Menu';
    }
  });

  var frag = document.createDocumentFragment();
  [skip, side, top, menu].forEach(function (n) { frag.appendChild(n); });
  document.body.insertBefore(frag, document.body.firstChild);

  // Pending maintenance ticket count badge
  function paintConcerns() {
    var n = 0; try { n = JSON.parse(localStorage.getItem('homebase_concerns') || '[]').filter(function (c) { return c.status === 'received'; }).length; } catch (e) {}
    document.querySelectorAll('[data-concern-badge]').forEach(function (b) { b.textContent = n + ' new'; b.classList.toggle('hidden', n === 0); });
  }
  paintConcerns();
  window.addEventListener('storage', function (e) { if (!e.key || e.key === 'homebase_concerns') paintConcerns(); });
  window.addEventListener('hb-concerns', paintConcerns);

  // Ensure skip link target exists and remove legacy header elements
  document.addEventListener('DOMContentLoaded', function () {
    var old = document.querySelectorAll('body > header:not(.ll-top)');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
    if (main) main.setAttribute('tabindex', '-1');
  });
})();