// Qipu design tokens — single source of truth for all colors.
// Never hardcode colors in components: use Tailwind classes (bg-paper, text-ink, border-dust…),
// which are generated from these values, or import C for inline styles.

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
  surface: '#ffffff',
  danger:  '#a4462f',
  // one color per kind of item
  kindBibliography: '#4a5b78',
  kindSource:       '#7a6a3e',
  kindNote:         '#8a5a7a',
} as const;

export type ColorToken = keyof typeof C;

/** CSS variable name for a token: paper → --paper, kindNote → --kind-note. */
export const cssVar = (token: ColorToken) => `--${token.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;
