/*
 * This file defines the tailwind.config module.
 */

import type { Config } from 'tailwindcss';
import sharedConfig from '@repo/config/tailwind/web';

const config: Config = {
  ...sharedConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      ...((sharedConfig.theme as Record<string, unknown>)?.extend ?? {}),
      // Hex values (matching the CSS variables in styles/globals.css) so opacity modifiers
      // such as bg-primary/10 work. The grey scale is the full Tailwind grey palette.
      colors: {
        primary: '#2D6A4F',
        'primary-dark': '#1B4332',
        'primary-light': '#B7E4C7',
        'primary-muted': '#F0FAF4',
        gold: '#C9A84C',
        'gold-light': '#FDF3DC',
        silver: '#9BA4B4',
        bronze: '#CD7F32',
        black: '#0A0A0A',
        'grey-50': '#F9FAFB',
        'grey-100': '#F3F4F6',
        'grey-200': '#E5E7EB',
        'grey-300': '#D1D5DB',
        'grey-400': '#9CA3AF',
        'grey-500': '#6B7280',
        'grey-600': '#4B5563',
        'grey-700': '#374151',
        'grey-800': '#1F2937',
        'grey-900': '#111827',
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default config;
