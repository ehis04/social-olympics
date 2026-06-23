import type { Config } from 'tailwindcss';
import sharedConfig from '@repo/config/tailwind/web';

const config: Config = {
  ...sharedConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      ...((sharedConfig.theme as Record<string, unknown>)?.extend ?? {}),
      colors: {
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',
        'primary-light': 'var(--color-primary-light)',
        'primary-muted': 'var(--color-primary-muted)',
        gold: 'var(--color-gold)',
        'gold-light': 'var(--color-gold-light)',
        silver: 'var(--color-silver)',
        bronze: 'var(--color-bronze)',
        black: 'var(--color-black)',
        'grey-800': 'var(--color-grey-800)',
        'grey-600': 'var(--color-grey-600)',
        'grey-400': 'var(--color-grey-400)',
        'grey-200': 'var(--color-grey-200)',
        'grey-100': 'var(--color-grey-100)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default config;
