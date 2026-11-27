// Reading and rewriting the #tags and [[links]] written inside a note's Markdown.

import { isValidTagPath } from './tags';

// "#tag" at the start of the text or after whitespace or an opening bracket.
// "# Heading" (space after #) and "##" are not tags.
const TAG_IN_TEXT = /(^|[\s(\[])#([^\s#()[\]{},;:!?"'«»“”]+)/g;
// Trailing characters that end a sentence rather than belonging to the tag ("#feria." → "feria").
const TRAILING = /[./]+$/;

// [[Title]] or [[Title|shown text]] (Obsidian style).
const LINK_IN_TEXT = /\[\[([^\[\]\n|]+?)(\|[^\[\]\n]*)?\]\]/g;

function stripCode(markdown: string): string {
  // Ignore anything inside `inline code` or ``` code blocks ```, keeping the same length.
  return markdown
    .replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

/** Tag paths written in the note, without "#", in order of first appearance, no duplicates (case-insensitive). */
export function parseNoteTags(markdown: string): string[] {
  const seen = new Map<string, string>();
  for (const m of stripCode(markdown).matchAll(TAG_IN_TEXT)) {
    const path = m[2].replace(TRAILING, '');
    if (!isValidTagPath(path)) continue;
    const key = path.toLowerCase();
    if (!seen.has(key)) seen.set(key, path);
  }
  return [...seen.values()];
}

/** Titles linked with [[...]], trimmed, in order, no duplicates (case-insensitive). */
export function parseNoteLinks(markdown: string): string[] {
  const seen = new Map<string, string>();
  for (const m of stripCode(markdown).matchAll(LINK_IN_TEXT)) {
    const title = m[1].trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (!seen.has(key)) seen.set(key, title);
  }
  return [...seen.values()];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** After a rename: [[Old title]] → [[New title]], keeping any "|shown text". Case-insensitive. */
export function renameLinks(markdown: string, oldTitle: string, newTitle: string): string {
  const re = new RegExp(`\\[\\[\\s*${escapeRegExp(oldTitle.trim())}\\s*(\\|[^\\[\\]\\n]*)?\\]\\]`, 'gi');
  return markdown.replace(re, (_m, alias: string | undefined) => `[[${newTitle}${alias ?? ''}]]`);
}

/** After a tag rename: #old → #new and #old/child → #new/child. Case-insensitive. */
export function renameTagInText(markdown: string, oldPath: string, newPath: string): string {
  const re = new RegExp(`(^|[\\s(\\[])#${escapeRegExp(oldPath)}(?=$|[\\s/#()\\[\\]{},;:!?.\"'«»“”])`, 'gim');
  return markdown.replace(re, (_m, before: string) => `${before}#${newPath}`);
}
