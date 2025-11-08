// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Work Sans', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      },
      // Extend typography styles
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // --- Unstyle default code blocks to prevent "box-in-box" ---
            pre: {
              backgroundColor: null,
              padding: null,
              margin: null,
              borderRadius: null,
              border: null,
            },
            'pre code': {
              backgroundColor: 'transparent',
              borderWidth: '0',
              borderRadius: '0',
              padding: '0',
              fontWeight: '400',
              color: 'inherit',
              fontFamily: 'inherit',
            },
            // --- Define a consistent style for inline code ---
            ':not(pre) > code': {
              backgroundColor: 'var(--color-border)',
              padding: '0.2em 0.4em',
              margin: '0 0.1em',
              fontSize: '0.9em',
              borderRadius: '0.25rem',
              color: 'var(--color-text-secondary)',
              fontWeight: '500',
            },
            // --- Reset pseudo-elements that prose adds ---
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};
