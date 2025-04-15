tester/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            code: {
              backgroundColor: 'var(--tw-prose-pre-bg)',
              borderRadius: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
            },
            'code::before': {
              content: 'none',
            },
            'code::after': {
              content: 'none',
            },
            pre: {
              backgroundColor: 'var(--tw-prose-pre-bg)',
              borderRadius: '0.375rem',
              padding: '1rem',
              overflowX: 'auto',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
            },
            'thead th': {
              borderBottom: '1px solid var(--tw-prose-th-borders)',
              paddingBottom: '0.5rem',
            },
            'tbody td, tfoot td': {
              padding: '0.5rem',
              borderBottom: '1px solid var(--tw-prose-td-borders)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}