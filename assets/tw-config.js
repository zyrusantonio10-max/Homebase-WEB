/* Shared Tailwind theme for index.html and dashboard.html. Change the green here once. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#0B4A2F', deep: '#083A25', body: '#0E5435' },
        lime: '#C6F24E',
        ink: '#14211A',
        muted: '#46564D',
        line: '#CBD5CF',
        danger: '#B42318',
        tint: '#F4F8F5',
        track: '#E8EEEA'
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"Public Sans"', 'system-ui', 'sans-serif']
      }
    }
  }
}
