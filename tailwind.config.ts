import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { C, cssVar, type ColorToken } from './src/lib/tokens';

const tokens = Object.keys(C) as ColorToken[];

const config: Config = {
  content: ['./src/components/**/*.{ts,tsx}', './src/app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // bg-paper, text-ink, border-dust, text-kind-note…: all read the CSS variables below
      colors: Object.fromEntries(
        tokens.map((t) => [cssVar(t).slice(2), `var(${cssVar(t)})`]),
      ),
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [
    // Writes every token as a CSS variable on :root, so tokens.ts stays the only place with hex values.
    plugin(({ addBase }) => {
      addBase({ ':root': Object.fromEntries(tokens.map((t) => [cssVar(t), C[t]])) });
    }),
  ],
};

export default config;
