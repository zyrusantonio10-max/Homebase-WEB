// Scoring engine. Pure functions: rooms + utilities + reviews + preferences in, ranked rooms out.
// Same code can later run on the server; nothing here touches the DOM.
window.Reco = (() => {
  const php = n => '₱' + Math.round(n).toLocaleString('en-PH');
  const typeOf = c => (c === 1 ? 'single' : c === 2 ? 'double' : c <= 4 ? 'shared' : 'dorm');
  const bedsLeft = r => r.capacity - r.occupied_beds;
  const billsOf = u => ['electricity', 'water', 'internet'].reduce((s, k) => s + (u.included.includes(k) ? 0 : u[k + '_cost']), 0);

  function reviewStats(roomId, reviews) {
    const r = reviews.filter(x => x.room_id === roomId);
    if (!r.length) return null;
    const avg = k => r.reduce((s, x) => s + x[k], 0) / r.length;
    return { n: r.length, rating: avg('rating'), internet: avg('internet'), noise: avg('noise'), cleanliness: avg('cleanliness') };
  }

  function rank(rooms, utilities, reviews, p) {
    const uMap = Object.fromEntries(utilities.map(u => [u.room_id, u]));
    const costs = rooms.map(r => r.monthly_price + billsOf(uMap[r.room_id]));
    const lo = Math.min(...costs), hi = Math.max(...costs);
    const wsum = Object.values(p.weights).reduce((a, b) => a + b, 0) || 1;
    const w = k => p.weights[k] / wsum;

    const out = rooms.map(r => {
      const u = uMap[r.room_id], bills = billsOf(u), cost = r.monthly_price + bills, st = reviewStats(r.room_id, reviews);
      const flags = { full: bedsLeft(r) <= 0 || !r.available, overBudget: cost > p.budget_max };
      const miss = [];
      let fit = 100;
      if (p.room_type !== 'any' && typeOf(r.capacity) !== p.room_type) { fit -= 30; miss.push('room type'); }
      if (p.bathroom !== 'any' && (p.bathroom === 'own') !== r.own_bathroom) { fit -= 25; miss.push('bathroom'); }
      if (p.cooling !== 'any' && (p.cooling === 'aircon') !== r.aircon) { fit -= 20; miss.push('cooling'); }
      if (p.furnished !== 'any' && (p.furnished === 'yes') !== r.furnished) { fit -= 10; miss.push('furnishing'); }
      if (r.capacity - 1 > p.max_roommates) { fit -= 35; miss.push('roommate count'); }
      const parts = {
        affordability: flags.overBudget ? 0 : 100 - 80 * ((cost - lo) / ((hi - lo) || 1)),
        room_fit: Math.max(fit, 0),
        amenities: 100 * r.amenities.length / Object.keys(HB.amenityLabels).length,
        quiet: st ? st.noise / 5 * 100 : Math.max(35, 100 - 12 * (r.capacity - 1)),
        internet: st ? st.internet / 5 * 100 : 60,
        reviews: st ? st.rating / 5 * 100 : 60
      };
      const score = Math.round(Object.keys(parts).reduce((s, k) => s + parts[k] * w(k), 0));

      const reasons = [];
      reasons.push(flags.overBudget
        ? { ok: false, text: `True monthly cost ${php(cost)} is over your ${php(p.budget_max)} budget` }
        : { ok: true, text: `Within your ${php(p.budget_max)} budget at ${php(cost)} a month` });
      reasons.push(bills === 0
        ? { ok: true, text: 'Electricity, water and internet are covered by the rent' }
        : { ok: false, text: `Adds about ${php(bills)} a month in bills on top of rent` });
      reasons.push(miss.length
        ? { ok: false, text: `Does not match your ${miss.join(', ')} preference` }
        : { ok: true, text: 'Matches your room preferences' });
      if (r.own_bathroom && r.aircon) reasons.push({ ok: true, text: 'Aircon and own bathroom' });
      if (st && st.noise >= 4) reasons.push({ ok: true, text: `Reviewed as quiet (${st.noise.toFixed(1)} out of 5)` });
      if (!st) reasons.push({ ok: false, text: 'No reviews yet, so review, internet and quiet scores are estimates' });
      if (r.floor >= 3 && !HB.dormitory.has_elevator) reasons.push({ ok: false, text: `Floor ${r.floor}, no elevator` });
      if (flags.full) reasons.push({ ok: false, text: 'No beds available right now' });

      return { room: r, util: u, cost, bills, st, flags, parts, score, reasons, type: typeOf(r.capacity), bedsLeft: bedsLeft(r) };
    });
    const eligible = x => !x.flags.full && !x.flags.overBudget;
    return out.sort((a, b) => (eligible(b) - eligible(a)) || (b.score - a.score));
  }

  // Insight cards derived from the ranked list. Each returns null when there is nothing honest to say.
  function insights(ranked) {
    const ok = ranked.filter(x => !x.flags.full && !x.flags.overBudget);
    const cards = [];
    const free = ok.filter(x => x.bills === 0), paid = ok.filter(x => x.bills > 0);
    if (free.length && paid.length) {
      const avg = paid.reduce((s, x) => s + x.bills, 0) / paid.length;
      cards.push({ tone: 'warm', title: 'Budget insight', text: `Rooms with utilities included save you about ${php(avg)} a month in bills compared with the average of the others in your budget.` });
    }
    const top = ok.slice(0, 5);
    if (top.length) {
      const own = top.filter(x => x.room.own_bathroom).length;
      cards.push({ tone: 'good', title: 'Room insight', text: `${own} of your top ${top.length} matches ${own === 1 ? "has" : "have"} their own bathroom${own < top.length ? `, ${top.length - own} share one` : ''}.` });
    }
    if (ok.length < 3 || (ok[0] && ok[0].score < 60)) {
      cards.push({ tone: 'warm', title: 'Preference conflict', text: `Only ${ok.length} room${ok.length === 1 ? '' : 's'} fit your budget and filters with beds open. Loosening room type, bathroom or roommate limit would widen the list.` });
    }
    return cards;
  }

  return { php, rank, insights, typeOf };
})();
