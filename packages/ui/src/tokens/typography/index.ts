// Typography tokens — Inter for UI, JetBrains Mono for values/data.

export const FONT_FAMILY = {
  sans: 'Inter',
  mono: 'JetBrains Mono',
} as const;

export const FONT_SIZE = {
  display: 32,
  h1: 24,
  h2: 20,
  h3: 16,
  bodyLg: 16,
  body: 14,
  bodySm: 12,
  label: 12,
  mono: 14,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const LINE_HEIGHT = {
  display: 40,
  h1: 32,
  h2: 28,
  h3: 24,
  bodyLg: 24,
  body: 20,
  bodySm: 16,
  label: 16,
  mono: 20,
} as const;
