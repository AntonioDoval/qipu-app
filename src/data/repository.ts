// The contract between Qipu's screens and its storage.
// Screens only call these methods. Today they are implemented with Supabase (./supabase.ts);
// a future offline desktop version would implement the same interface with local storage.

import type {
  Annotation,
  AnnotationDraft,
  AnnotationPatch,
  AnnotationTag,
  Item,
  ItemDraft,
  ItemLink,
  ItemPatch,
  ItemProject,
  ItemTag,
  NoteVersion,
  PaletteSlot,
  Profile,
  Project,
  RecentItem,
  SearchHit,
  Tag,
} from './types';

export interface QipuData {
  // ── Profile and settings ──────────────────────────────────────────────────
  getProfile(): Promise<Profile>;
  /** Five slots (keys 1–5). */
  updatePalette(palette: PaletteSlot[]): Promise<void>;
  /** Remember a source type the user created ("Price list"). */
  addSourceType(label: string): Promise<void>;

  // ── Items (bibliography, sources, notes) ──────────────────────────────────
  /** Everything not in the trash, or only what is in the trash. */
  listItems(options?: { trash?: boolean }): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  createItem(draft: ItemDraft): Promise<Item>;
  /** Pass `expectedRevision` to refuse the save if the item changed elsewhere (throws ConflictError). */
  updateItem(id: string, patch: ItemPatch, expectedRevision?: number): Promise<Item>;
  /** Changes the title and rewrites [[Old title]] in every note that links to the item. */
  renameItem(id: string, title: string): Promise<Item>;
  /** Move to the trash (kept 30 days). Never touches Google Drive. */
  trashItems(ids: string[]): Promise<void>;
  restoreItems(ids: string[]): Promise<void>;

  // ── Notes ─────────────────────────────────────────────────────────────────
  /**
   * Save a note's title and Markdown. Refuses (ConflictError) if the note changed elsewhere.
   * Also brings the note's tags and [[links]] in line with its text.
   */
  saveNote(id: string, content: { title: string; body: string }, expectedRevision: number): Promise<Item>;
  listNoteVersions(noteId: string): Promise<NoteVersion[]>;

  // ── Tags ──────────────────────────────────────────────────────────────────
  listTags(): Promise<Tag[]>;
  /** All item ↔ tag pairs (notes' tags come from their text). */
  listItemTags(): Promise<ItemTag[]>;
  /** Replace an item's tags (not for notes: their tags come from the text). Creates missing tags. */
  setItemTags(itemId: string, paths: string[]): Promise<void>;
  /** Add one tag to several items (multi-select). Notes get "#path" appended to their text. */
  addTagToItems(itemIds: string[], path: string): Promise<void>;
  /** Rename a tag and everything under it, also inside note text. */
  renameTag(oldPath: string, newPath: string): Promise<void>;
  setTagColor(tagId: string, color: string | null): Promise<void>;

  // ── Projects ──────────────────────────────────────────────────────────────
  listProjects(): Promise<Project[]>;
  createProject(input: { name: string; parentId?: string | null; description?: string | null; color?: string }): Promise<Project>;
  updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'parentId' | 'description' | 'color' | 'archived'>>): Promise<Project>;
  /** Deletes the project only: its items stay, subprojects move up a level. */
  deleteProject(id: string): Promise<void>;
  listItemProjects(): Promise<ItemProject[]>;
  setItemProjects(itemId: string, projectIds: string[]): Promise<void>;
  addItemsToProject(itemIds: string[], projectId: string): Promise<void>;

  // ── Links between items ───────────────────────────────────────────────────
  listLinks(): Promise<ItemLink[]>;
  addLink(fromItemId: string, toItemId: string): Promise<void>;
  removeLink(fromItemId: string, toItemId: string): Promise<void>;

  // ── Annotations ───────────────────────────────────────────────────────────
  /** One item's annotations, or all of them (for the Annotations view). Not including deleted ones. */
  listAnnotations(itemId?: string): Promise<Annotation[]>;
  createAnnotation(draft: AnnotationDraft): Promise<Annotation>;
  updateAnnotation(id: string, patch: AnnotationPatch): Promise<Annotation>;
  /** Soft delete, so Undo can bring it back. */
  deleteAnnotation(id: string): Promise<void>;
  restoreAnnotation(id: string): Promise<void>;
  /** Own and inherited (from the item) tags of every annotation. */
  listAnnotationTags(): Promise<AnnotationTag[]>;
  setAnnotationTags(annotationId: string, paths: string[]): Promise<void>;
  /** Attach a note to highlights; returns the note's attached highlight ids. */
  attachNoteToAnnotations(noteId: string, annotationIds: string[]): Promise<string[]>;
  listNoteAnnotations(noteId: string): Promise<string[]>;

  // ── Text of PDFs and search ───────────────────────────────────────────────
  /** Store the text of each PDF page (index 0 = page 1), extracted in the browser at upload. */
  savePageTexts(itemId: string, pages: string[]): Promise<void>;
  /** Full-text search: titles, authors, notes, pasted text and PDF pages. Accent-insensitive. */
  search(query: string): Promise<SearchHit[]>;

  // ── Recently opened ───────────────────────────────────────────────────────
  markOpened(itemId: string): Promise<void>;
  listRecent(limit?: number): Promise<RecentItem[]>;
}
