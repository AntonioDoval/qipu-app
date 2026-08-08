// Qipu design tokens — single source of truth for all colors
// Never hardcode colors in components. Always import from here.

export const C = {
  paper:   '#faf8f4',
  cream:   '#f0ebdd',
  sand:    '#e8e2d5',
  dust:    '#d8cfba',
  stone:   '#a89b85',
  sage:    '#7a7060',
  ink:     '#1a1a1a',
  accent:  '#4a5b78',
  accent2: '#6b7d99',
  soft:    '#e6ebf3',
  softer:  '#eef2f8',
} as const;

export type ColorToken = keyof typeof C;
