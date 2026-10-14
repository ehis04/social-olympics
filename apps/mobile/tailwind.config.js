/*
 * This file defines the tailwind.config module.
 */

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6A4F',
          dark: '#1B4332',
          light: '#B7E4C7',
          muted: '#F0FAF4',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#FDF3DC',
        },
        silver: '#9BA4B4',
        bronze: '#CD7F32',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        success: '#10B981',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
};
