-comparison-tool/tailwind.config.js
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
            color: 'hsl(var(--base-content) / 1)',
            '--tw-prose-headings': 'hsl(var(--base-content) / 1)',
            '--tw-prose-body': 'hsl(var(--base-content) / 0.8)',
            code: {
              backgroundColor: 'hsl(var(--base-200) / 1)',
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
              backgroundColor: 'hsl(var(--base-200) / 1)',
              borderRadius: '0.375rem',
              padding: '1rem',
              overflowX: 'auto',
            },
            // Improve spacing
            h1: {
              marginTop: '2em',
              marginBottom: '0.8em',
            },
            h2: {
              marginTop: '1.75em',
              marginBottom: '0.8em',
            },
            h3: {
              marginTop: '1.5em',
              marginBottom: '0.8em',
            },
            p: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            ul: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            ol: {
              marginTop: '1.25em',
              marginBottom: '1.25em',
            },
            li: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            blockquote: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            }
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('daisyui'),
  ],
  daisyui: {
    themes: true, // This enables all themes
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  }
}