import { describe, expect, it } from 'vitest';
import { shortcutFor } from './shortcuts';

const key = (code: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>>) =>
  ({ code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods }) as KeyboardEvent;

describe('shortcutFor', () => {
  it('Mac: ⌃⌘S toggles the sidebar, ⌃⌘I the right panel', () => {
    expect(shortcutFor(key('KeyS', { metaKey: true, ctrlKey: true }))).toBe('toggleSidebar');
    expect(shortcutFor(key('KeyI', { metaKey: true, ctrlKey: true }))).toBe('togglePanel');
  });
  it('Windows/Linux: Ctrl+Alt+S and Ctrl+Alt+I', () => {
    expect(shortcutFor(key('KeyS', { ctrlKey: true, altKey: true }))).toBe('toggleSidebar');
    expect(shortcutFor(key('KeyI', { ctrlKey: true, altKey: true }))).toBe('togglePanel');
  });
  it('leaves ordinary shortcuts alone (⌘S save, ⌘I italic, Ctrl+S)', () => {
    expect(shortcutFor(key('KeyS', { metaKey: true }))).toBeNull();
    expect(shortcutFor(key('KeyI', { metaKey: true }))).toBeNull();
    expect(shortcutFor(key('KeyS', { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(key('KeyX', { metaKey: true, ctrlKey: true }))).toBeNull();
  });
});
