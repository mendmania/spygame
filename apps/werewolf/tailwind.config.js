/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Werewolf theme colors
        werewolf: {
          blood: '#8B0000',
          night: '#0a0a1a',
          moon: '#f4e99b',
          forest: '#1a472a',
        },
      },
    },
  },
  plugins: [],
};
