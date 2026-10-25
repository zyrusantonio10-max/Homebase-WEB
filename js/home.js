// Student Home: renders profile, summary, insights, saved rooms and recent comparisons.
(() => {
  const $ = id => document.getElementById(id);
  const php = Reco.php;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TYPES = { any: 'Any', single: 'Single', double: 'Double', shared: 'Shared (3 to 4 beds)', dorm: 'Dorm-style (5+ beds)' };
  const PARTS = { affordability: 'Affordability', room_fit: 'Room fit', amenities: 'Amenities', quiet: 'Quiet', internet: 'Internet', reviews: 'Reviews' };
  let S = {};

  const pips = r => Array.from({ length: r.capacity }, (_, i) => `<i class="pip ${i >= r.occupied_beds ? 'free' : ''}"></i>`).join('');
  const scoreCls = n => (n >= 80 ? 'bg-goodSoft text-good' : 'bg-accentSoft text-accent');
  const roomLabel = x => `Room ${x.room.room_number} · ${x.room.capacity}-bed${x.room.capacity > 2 ? ' shared' : ''}`;

  async function load() {
    const [student, rooms, utils, reviews, saved, comps, viewed] = await Promise.all([
      api.getStudent(), api.getRooms(), api.getUtilities(), api.getReviews(), api.getSaved(), api.getComparisons(), api.getViewed()]);
    S = { student, saved, comps, viewed, ranked: Reco.rank(rooms, utils, reviews, student.preferences) };
  }

  function render() {
    const { student: s, ranked, saved, comps, viewed } = S, p = s.preferences;
    $('welcome').textContent = `Welcome back, ${s.name.split(' ')[0]}`;
    $('subtitle').textContent = `Your housing hub for ${HB.dormitory.dorm_name}.`;
    $('avatar').textContent = s.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    $('h-profile').textContent = s.name;
    $('course').textContent = [s.course, s.university].filter(Boolean).join(' · ');

    const wsum = Object.values(p.weights).reduce((a, b) => a + b, 0) || 1;
    const topKey = Object.keys(p.weights).sort((a, b) => p.weights[b] - p.weights[a])[0];
    const rows = [['Budget', `${php(p.budget_min)} to ${php(p.budget_max)}`], ['Top priority', `${PARTS[topKey]} (${Math.round(p.weights[topKey] / wsum * 100)}%)`],
      ['Room type', TYPES[p.room_type]], ['Max roommates', p.max_roommates]];
    $('prefs').innerHTML = rows.map(([k, v]) => `<dt class="text-muted">${k}</dt><dd class="font-semibold">${esc(v)}</dd>`).join('');

    const ok = ranked.filter(x => !x.flags.full && !x.flags.overBudget);
    const strong = ok.filter(x => x.score > 85).length;
    $('summary').innerHTML = `You viewed <b class="text-ink">${viewed.length}</b> ${viewed.length === 1 ? 'room' : 'rooms'}. <b class="text-ink">${plural(ok.length, 'room')}</b> fit your budget with beds open. <b class="text-ink">${plural(strong, 'room')}</b> ${strong === 1 ? 'scores' : 'score'} above 85%.` +
      (ok[0] ? ` Your best match is <b class="text-accent">Room ${ok[0].room.room_number}</b> at <b class="text-accent">${ok[0].score}%</b>.` : ' No room fits your budget and filters right now.');

    const tones = { warm: 'bg-accentSoft', good: 'bg-goodSoft' };
    const cards = Reco.insights(ranked);
    $('insights').innerHTML = cards.length ? cards.map(c => `<div class="rounded-xl p-4 ${tones[c.tone]}"><h3 class="text-sm font-bold">${c.title}</h3><p class="mt-1 text-sm">${esc(c.text)}</p></div>`).join('')
      : '<p class="text-sm text-muted sm:col-span-2">Insights appear once at least one room fits your budget.</p>';

    $('h-saved').textContent = `Saved rooms (${saved.length})`;
    const savedRooms = saved.map(id => ranked.find(x => x.room.room_id === id)).filter(Boolean);
    $('saved').innerHTML = savedRooms.length ? savedRooms.map(x => `
      <li class="flex items-center gap-3 rounded-xl border border-line p-2">
        <button data-open="${x.room.room_id}" class="flex flex-1 items-center gap-3 rounded-lg text-left">
          <span class="flex h-12 w-16 shrink-0 items-end justify-center gap-0.5 rounded-lg bg-cream p-2" aria-hidden="true">${pips(x.room)}</span>
          <span class="min-w-0 flex-1"><span class="block text-sm font-bold">${roomLabel(x)}</span><span class="block text-sm text-muted">${php(x.cost)} true cost</span></span>
          <span class="rounded-full px-3 py-1 text-sm font-bold ${scoreCls(x.score)}">${x.score}%</span>
        </button>
        <button data-unsave="${x.room.room_id}" class="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:text-accent" aria-label="Remove Room ${x.room.room_number} from saved">Remove</button>
      </li>`).join('')
      : '<li class="text-sm text-muted">No saved rooms yet. Rooms you save from My Matches or Explore Rooms will show up here.</li>';

    $('comps').innerHTML = comps.length ? comps.map(c => `
      <li class="rounded-xl border border-line p-3"><p class="text-sm font-bold">${c.rooms.map(n => 'Room ' + n).join(' vs ')}</p>
      <p class="text-sm text-muted">${new Date(c.at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}</p></li>`).join('')
      : '<li class="text-sm text-muted">You have not compared any rooms yet. Pick up to 3 rooms in Explore Rooms to compare them side by side.</li>';
  }

  function openRoom(id) {
    const x = S.ranked.find(r => r.room.room_id === id), r = x.room, u = x.util, isSaved = S.saved.includes(id);
    api.markViewed(id).then(async () => { S.viewed = await api.getViewed(); render(); });
    const line = (k, label) => `<tr><td class="py-1 text-muted">${label}</td><td class="py-1 text-right font-semibold">${u.included.includes(k) ? 'Included' : php(u[k + '_cost'])}</td></tr>`;
    $('rd-body').innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div><h2 id="rd-title" class="text-xl font-bold">${roomLabel(x)}</h2>
          <p class="mt-1 flex items-center gap-2 text-sm text-muted">Floor ${r.floor} · ${plural(x.bedsLeft, 'bed')} left <span class="flex gap-0.5" aria-hidden="true">${pips(r)}</span></p></div>
        <span class="rounded-full px-3 py-1 text-lg font-bold ${scoreCls(x.score)}">${x.score}%</span>
      </div>
      <h3 class="mt-5 text-sm font-bold">True monthly cost</h3>
      <table class="mt-1 w-full text-sm"><tbody>
        <tr><td class="py-1 text-muted">Rent</td><td class="py-1 text-right font-semibold">${php(r.monthly_price)}</td></tr>
        ${line('electricity', 'Electricity')}${line('water', 'Water')}${line('internet', 'Internet')}
        <tr class="border-t border-line"><td class="pt-2 font-bold">Total</td><td class="pt-2 text-right text-base font-bold text-accent">${php(x.cost)}</td></tr></tbody></table>
      <h3 class="mt-5 text-sm font-bold">Why this room?</h3>
      <ul class="mt-2 space-y-1 text-sm">${x.reasons.map(t => `<li class="flex gap-2"><b class="${t.ok ? 'text-good' : 'text-accent'}">${t.ok ? 'Yes' : 'Check'}</b><span>${esc(t.text)}</span></li>`).join('')}</ul>
      <h3 class="mt-5 text-sm font-bold">Match breakdown</h3>
      <div class="mt-2 space-y-2">${Object.keys(PARTS).map(k => `<div class="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm"><span class="text-muted">${PARTS[k]}</span><div class="bar"><i style="width:${Math.round(x.parts[k])}%"></i></div><span class="text-right font-semibold">${Math.round(x.parts[k])}</span></div>`).join('')}</div>
      <div class="mt-6 flex justify-end gap-3">
        <button class="btn btn-ghost" data-close>Close</button>
        <button class="btn btn-primary" data-toggle="${id}">${isSaved ? 'Remove from saved' : 'Save room'}</button>
      </div>`;
    $('room-dialog').showModal();
  }

  async function init() {
    try { await load(); render(); } catch (e) { $('content').classList.add('hidden'); $('error').classList.remove('hidden'); return; }

    document.addEventListener('click', async e => {
      const t = e.target.closest('[data-open],[data-unsave],[data-toggle],[data-close]');
      if (!t) return;
      if (t.dataset.open) openRoom(+t.dataset.open);
      if (t.dataset.unsave || t.dataset.toggle) { S.saved = await api.toggleSaved(+(t.dataset.unsave || t.dataset.toggle)); render(); if (t.dataset.toggle) $('room-dialog').close(); }
      if (t.hasAttribute('data-close')) $('room-dialog').close();
    });

    const form = $('prefs-form'), p = () => S.student.preferences;
    $('open-prefs').addEventListener('click', () => {
      for (const k of ['budget_min', 'budget_max', 'room_type', 'bathroom', 'cooling', 'furnished', 'max_roommates']) form.elements[k].value = p()[k];
      $('rm-out').textContent = p().max_roommates; $('prefs-error').classList.add('hidden'); $('prefs-dialog').showModal();
    });
    form.elements.max_roommates.addEventListener('input', e => { $('rm-out').textContent = e.target.value; });
    $('prefs-cancel').addEventListener('click', () => $('prefs-dialog').close());
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = form.elements, min = +f.budget_min.value, max = +f.budget_max.value;
      if (min > max) { $('prefs-error').textContent = 'Your minimum budget is higher than your maximum. Adjust one of them.'; $('prefs-error').classList.remove('hidden'); return; }
      await api.updateStudent({ preferences: { ...p(), budget_min: min, budget_max: max, room_type: f.room_type.value, bathroom: f.bathroom.value, cooling: f.cooling.value, furnished: f.furnished.value, max_roommates: +f.max_roommates.value } });
      await load(); render(); $('prefs-dialog').close();
    });
    $('logout').addEventListener('click', () => { api.logout(); location.href = 'index.html'; });
    $('reset').addEventListener('click', () => { api.resetDemo(); location.reload(); });
  }
  init();
})();
