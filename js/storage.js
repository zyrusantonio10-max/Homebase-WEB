// Data access layer. Every page talks to `api`, never to HB or localStorage directly.
// Moving to PHP + MySQL later: replace each body with fetch('api/<name>.php').then(r => r.json()).
(() => {
  const K = 'homebase.v1.';
  const read = (k, d) => { try { const v = localStorage.getItem(K + k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const raw = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch { /* storage blocked: state lives for this page only */ } };
  window.api = {
    async getDormitory() { return HB.dormitory; },
    async getRooms() { return read('rooms', HB.rooms); },
    async getUtilities() { return HB.utilities; },
    async getReviews() { return read('reviews', HB.reviews); },
    // A logged-in student (from index.html) overrides the demo profile's identity; preferences stay as saved.
    async getStudent() { const s = read('student', HB.students[0]), u = raw('homebase_currentUser'); return u && u.role === 'student' ? { ...s, name: u.name, course: '', university: '' } : s; },
    async updateStudent(patch) { const s = { ...(await api.getStudent()), ...patch }; write('student', s); return s; },
    async getSaved() { return read('saved', HB.seed.saved); },
    async toggleSaved(id) { const s = await api.getSaved(); const n = s.includes(id) ? s.filter(x => x !== id) : [...s, id]; write('saved', n); return n; },
    async getComparisons() { return read('comparisons', HB.seed.comparisons); },
    async getViewed() { return read('viewed', []); },
    async markViewed(id) { const v = await api.getViewed(); if (!v.includes(id)) write('viewed', [...v, id]); },
    logout() { try { localStorage.removeItem('homebase_currentUser'); } catch { /* ignore */ } },
    resetDemo() { Object.keys(localStorage).filter(k => k.startsWith(K)).forEach(k => localStorage.removeItem(k)); }
  };
})();
