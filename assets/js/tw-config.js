/*
  The ONE place for the palette. Change a color here and every page follows.

  1) Tailwind reads it, so classes like bg-forest, text-danger, border-warn-line, hover:bg-lime-deep, bg-paper work.
  2) The same colors are also published as CSS variables (--forest, --danger-soft, --paper, ...) for the CSS files.

  How the colors are used:
    forest   brand green: primary buttons, focus, the sidebar, "good" states
    lime     the single accent: the lit window in the logo, the current page in the sidebar, the best-match button
    paper    warm off-white page ground (new). Cards stay white on top of it, so they read as cards
    mint     soft greens used on the landing page
    ink      main text           muted    secondary text
    line     borders             edge     hover border on fields
    tint     quiet cards         track    hover backgrounds and picture placeholders
    danger   red: Log out, Decline, Delete, Hide, errors, "bad" statuses (declined, expired)
    warn     amber: "needs attention" (pending, payment due, over budget)
  Every status also says what it is in words. Color never carries meaning alone.
*/
(function () {
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

  // the same colors as CSS variables
  var css = ':root{';
  Object.keys(colors).forEach(function (name) {
    var v = colors[name];
    if (typeof v === 'string') css += '--' + name + ':' + v + ';';
    else Object.keys(v).forEach(function (shade) { css += '--' + (shade === 'DEFAULT' ? name : name + '-' + shade) + ':' + v[shade] + ';'; });
  });
  var style = document.createElement('style');
  style.textContent = css + '}';
  document.head.appendChild(style);
})();