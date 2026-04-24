/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Geist', 'system-ui', 'sans-serif'],
        serif:   ['Fraunces', 'Georgia', 'serif'],
        sans:    ['Geist', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:       '#0A0A0A',
        ink2:      '#171717',
        muted:     '#737373',
        line:      '#E5E5E5',
        lineSoft:  '#F5F5F5',
        paper:     '#FFFFFF',
        surface:   '#FAFAFA',
        green:     '#10B981',
        greenHi:   '#059669',
        greenSoft: '#ECFDF5',
        red:       '#EF4444',
      },
      keyframes: {
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        fadeUp: { '0%':      { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        dot:    { '0%,100%': { opacity: '1' }, '50%': { opacity: '.3' } },
      },
      animation: {
        floatY: 'floatY 5s ease-in-out infinite',
        fadeUp: 'fadeUp 0.9s ease-out forwards',
        dot:    'dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
