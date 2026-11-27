// Qipu's own data shapes. Screens use these, never database rows.
// They do not depend on Supabase, so a future local (offline) backend can produce them too.

export type ItemKind = 'bibliography' | 'source' | 'note';

/** Bibliography types offered in the UI (CSL names). The database accepts every CSL type, for imports. */
export const BIBLIOGRAPHY_TYPES = [
  'book',
  'chapter',
  'article-journal',
  'thesis',
  'report',
  'paper-conference',
] as const;

/** Built-in source types (translated in the UI). Users can add their own labels. */
export const BUILTIN_SOURCE_TYPES = ['interview', 'document', 'archival', 'webpage', 'image'] as const;

export type ContentSource = 'none' | 'drive_pdf' | 'pasted';

/** A person in CSL: either family/given or a single literal name (e.g. an alias "Doña R."). */
export interface CslName {
  family?: string;
  given?: string;
  literal?: string;
}

/** CSL date: [[year, month?, day?]]. Partial dates are normal ("1987", "2019-03"). */
export interface CslDate {
  'date-parts'?: (number | string)[][];
  literal?: string;
}

/** CSL-JSON fields Qipu uses. Title and type live on the item itself. Unknown fields are kept. */
export interface CslData {
  author?: CslName[];
  editor?: CslName[];
  interviewer?: CslName[];
  issued?: CslDate;
  accessed?: CslDate;
  'container-title'?: string;
  publisher?: string;
  'publisher-place'?: string;
  volume?: string;
  issue?: string;
  page?: string;
  edition?: string;
  DOI?: string;
  ISBN?: string;
  URL?: string;
  archive?: string;
  archive_location?: string;
  medium?: string;
  language?: string;
  abstract?: string;
  [field: string]: unknown;
}

export interface DriveFile {
  fileId: string;
  fileName: string | null;
  fileSize: number | null;
  sha256: string | null;
}

export interface Item {
  id: string;
  kind: ItemKind;
  /** bibliography: CSL type · source: built-in key or the user's label · note: 'note' */
  type: string;
  title: string;
  /** Bibliography only; generated automatically (malinowski1922, malinowski1922b…) and stable. */
  citekey: string | null;
  csl: CslData;
  metadata: Record<string, unknown>;
  /** Notes: Markdown. Pasted-text sources: the text. */
  body: string | null;
  contentSource: ContentSource;
  drive: DriveFile | null;
  pageCount: number | null;
  hasTextLayer: boolean | null;
  /** Notes only: the text this note comments on. */
  anchorItemId: string | null;
  // Derived by the database from csl:
  year: number | null;
  datePrecision: 'year' | 'month' | 'day' | null;
  creatorsText: string;
  sortCreator: string;
  /** Increases on every save; used to detect two tabs editing the same item. */
  revision: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What is needed to create an item. Everything else is filled in by the database. */
export interface ItemDraft {
  kind: ItemKind;
  type: string;
  title: string;
  csl?: CslData;
  metadata?: Record<string, unknown>;
  body?: string | null;
  contentSource?: ContentSource;
  drive?: DriveFile | null;
  pageCount?: number | null;
  hasTextLayer?: boolean | null;
  anchorItemId?: string | null;
  citekey?: string | null;
}

/** Fields that can be changed with updateItem (title changes go through renameItem). */
export type ItemPatch = Partial<
  Pick<ItemDraft, 'type' | 'csl' | 'metadata' | 'drive' | 'pageCount' | 'hasTextLayer' | 'anchorItemId' | 'citekey'>
>;

export interface Tag {
  id: string;
  /** Full path: "andes/ayni". */
  path: string;
  color: string | null;
}

export interface Project {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AnnotationKind = 'highlight' | 'square' | 'circle' | 'star' | 'ink';
export type ColorSlot = 1 | 2 | 3 | 4 | 5;

/** Rectangles, a box, or pen paths, in PDF user-space points (not screen pixels). */
export type AnnotationPosition =
  | { rects: [number, number, number, number][] }
  | { box: [number, number, number, number] }
  | { paths: [number, number][][] };

/** W3C TextQuoteSelector plus character offsets in the page (PDF) or whole text (pasted). */
export interface TextQuote {
  exact: string;
  prefix: string;
  suffix: string;
  start?: number;
  end?: number;
}

export interface Annotation {
  id: string;
  itemId: string;
  kind: AnnotationKind;
  color: ColorSlot;
  /** PDF page; null for pasted text. */
  page: number | null;
  position: AnnotationPosition | null;
  quote: TextQuote | null;
  /** The highlighted text, for lists and search. */
  text: string | null;
  /** "p. 81", editable. */
  locator: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationDraft {
  itemId: string;
  kind: AnnotationKind;
  color: ColorSlot;
  page?: number | null;
  position?: AnnotationPosition | null;
  quote?: TextQuote | null;
  text?: string | null;
  locator?: string | null;
}

export type AnnotationPatch = Partial<Pick<AnnotationDraft, 'color' | 'position' | 'locator'>>;

/** A tag on an annotation: its own, or inherited from its item. */
export interface AnnotationTag {
  annotationId: string;
  tagId: string;
  inherited: boolean;
}

export interface ItemTag {
  itemId: string;
  tagId: string;
}

export interface ItemProject {
  itemId: string;
  projectId: string;
}

export interface ItemLink {
  fromItemId: string;
  toItemId: string;
  /** 'text': created by a [[link]] in a note (kept in sync automatically) · 'manual': added by hand. */
  origin: 'manual' | 'text';
}

export interface SearchHit {
  itemId: string;
  /** PDF page where the words were found; null for titles, authors, notes and pasted text. */
  page: number | null;
  rank: number;
  /** Text around the match; matched words are wrapped in ⟦ ⟧ (see splitSnippet). */
  snippet: string;
}

export interface PaletteSlot {
  color: string;
  name: string | null;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  locale: 'es' | 'en';
  palette: PaletteSlot[];
  /** The user's own source types (built-in ones are not stored). */
  sourceTypes: string[];
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  body: string | null;
  savedAt: string;
}

export interface RecentItem {
  itemId: string;
  openedAt: string;
}

/** The item changed somewhere else (e.g. another tab) since it was loaded. */
export class ConflictError extends Error {
  constructor(public readonly itemId: string) {
    super('This item was changed somewhere else since you opened it.');
    this.name = 'ConflictError';
  }
}

/** Anything else that went wrong while reading or saving. */
export class DataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DataError';
  }
}
