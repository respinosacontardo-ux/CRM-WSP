import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6d28d9', // violet-700
          light: '#8b5cf6',
          dark: '#5b21b6',
        },
        whatsapp: '#25D366',
      },
    },
  },
  plugins: [],
};

export default config;
