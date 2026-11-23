/*
  Color palette and theme configuration.
  1. Extends Tailwind CSS theme with application colors and typography.
  2. Injects equivalent CSS custom properties into :root.
  3. Pre-initializes dark mode class to prevent flash of unstyled content.
*/
(function () {
  // Prevent light flash: apply saved dark theme immediately
  try {
    var savedTheme = localStorage.getItem('homebase_theme');
    var isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}

  var colors = {
    forest: { DEFAULT: '#0B4A2F', deep: '#083A25', body: '#0E5435' },
    lime:   { DEFAULT: '#C6F24E', deep: '#B5E03F' },
    paper:  '#F7F5EE',
    mint:   { DEFAULT: '#E3EEE7', deep: '#CFE3D6' },
    ink: '#14211A',
    muted: '#46564D',
    line: '#CBD5CF',
    edge: '#8FA397',
    tint: '#F4F8F5',
    track: '#E8EEEA',
    danger: { DEFAULT: '#B42318', deep: '#912018', soft: '#FEF3F2', line: '#FDA29B' },
    warn:   { DEFAULT: '#B54708', deep: '#93370D', soft: '#FFFAEB', line: '#FEDF89' }
  };

  if (typeof tailwind !== 'undefined') {
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: colors,
          fontFamily: {
            display: ['Sora', 'system-ui', 'sans-serif'],
            body: ['"Public Sans"', 'system-ui', 'sans-serif']
          }
        }
      }
    };
  }

  // Export color values as CSS custom properties
  var css = ':root{';
  Object.keys(colors).forEach(function (name) {
    var v = colors[name];
    if (typeof v === 'string') css += '--' + name + ':' + v + ';';
    else Object.keys(v).forEach(function (shade) { css += '--' + (shade === 'DEFAULT' ? name : name + '-' + shade) + ':' + v[shade] + ';'; });
  });
  css += '}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Auto-inject dark.css if not present
  if (!document.querySelector('link[href*="dark.css"]')) {
    var darkLink = document.createElement('link');
    darkLink.rel = 'stylesheet';
    darkLink.href = 'assets/css/dark.css';
    document.head.appendChild(darkLink);
  }

  // Auto-inject theme.js if not present
  if (!window.HB_THEME && !document.querySelector('script[src*="theme.js"]')) {
    var themeScript = document.createElement('script');
    themeScript.src = 'assets/js/theme.js';
    themeScript.defer = true;
    document.head.appendChild(themeScript);
  }
})();
