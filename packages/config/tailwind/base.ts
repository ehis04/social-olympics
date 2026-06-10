import type { Config } from 'tailwindcss';

export const baseConfig: Partial<Config> = {
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        tag: '16px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.08)',
        md: '0 4px 12px rgba(0,0,0,0.10)',
        lg: '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
};
