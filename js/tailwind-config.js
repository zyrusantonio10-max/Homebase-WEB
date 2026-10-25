// Design tokens. Loaded right after the Tailwind CDN script on every page.
tailwind.config = {
  theme: { extend: {
    fontFamily: { sans: ['Figtree', 'system-ui', 'sans-serif'] },
    colors: {
      ink: '#14302B', cream: '#FAF8F4', line: '#E6E1D8', muted: '#5E6B67',
      accent: '#A33F22', accentSoft: '#F7E4DC',
      good: '#2E7650', goodSoft: '#E2EFE6'
    },
    boxShadow: { lift: '0 6px 24px -10px rgba(20,48,43,.25)' }
  } }
};
