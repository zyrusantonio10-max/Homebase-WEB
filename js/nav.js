// Pill navbar shared by every student page. Set built:true once a page exists.
(() => {
  const links = [
    { id: 'home', label: 'Home', href: 'home.html', built: true },
    { id: 'matches', label: 'My Matches', href: 'my-matches.html', built: false },
    { id: 'explore', label: 'Explore Rooms', href: 'explore-rooms.html', built: false },
    { id: 'floor', label: 'Floor Plan', href: 'floor-plan.html', built: false }
  ];
  const active = document.body.dataset.page;
  const base = 'block rounded-full px-4 py-2 text-sm font-semibold transition-colors ';
  const item = l => l.built
    ? `<a href="${l.href}" ${l.id === active ? 'aria-current="page"' : ''} class="${base}${l.id === active ? 'bg-accentSoft text-accent' : 'text-ink hover:bg-cream'}">${l.label}</a>`
    : `<span aria-disabled="true" class="${base}text-muted cursor-not-allowed">${l.label} <span class="ml-1 rounded border border-line px-1 text-[11px] font-medium">Soon</span></span>`;

  const host = document.getElementById('site-nav');
  host.innerHTML = `
  <div class="mx-auto max-w-6xl px-4 pt-4">
    <nav aria-label="Main" class="flex items-center justify-between gap-3 rounded-full border border-line bg-white px-3 py-2 shadow-lift">
      <a href="home.html" class="flex items-center gap-2 rounded-full pl-1 pr-2">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9H4z"/></svg>
        </span>
        <span class="font-bold">Homebase</span>
        <span class="hidden text-sm text-muted lg:inline" id="nav-dorm"></span>
      </a>
      <ul class="hidden items-center gap-1 md:flex">${links.map(l => `<li>${item(l)}</li>`).join('')}</ul>
      <div class="flex items-center gap-2">
        <span id="nav-user" class="hidden text-sm font-semibold sm:inline"></span>
        <span id="nav-avatar" class="grid h-8 w-8 place-items-center rounded-lg bg-accent text-xs font-bold text-white" aria-hidden="true"></span>
        <button id="nav-toggle" class="grid h-9 w-9 place-items-center rounded-full border border-line md:hidden" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </nav>
    <ul id="nav-menu" class="mt-2 hidden rounded-2xl border border-line bg-white p-2 shadow-lift md:hidden">${links.map(l => `<li>${item(l)}</li>`).join('')}</ul>
  </div>`;

  const btn = document.getElementById('nav-toggle'), menu = document.getElementById('nav-menu');
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.classList.contains('hidden')) { menu.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });

  Promise.all([api.getDormitory(), api.getStudent()]).then(([d, s]) => {
    document.getElementById('nav-dorm').textContent = d.dorm_name;
    document.getElementById('nav-user').textContent = s.name.split(' ')[0];
    document.getElementById('nav-avatar').textContent = s.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  });
})();
