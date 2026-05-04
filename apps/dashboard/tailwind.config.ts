import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: '#6ee7b7',
        accent2: '#818cf8',
        surface: '#12121a',
        'surface-2': '#1a1a26',
      },
    },
  },
  plugins: [],
};
export default config;