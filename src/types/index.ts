// ─── Item types ───────────────────────────────────────────────────────────────

export const ITEM_TYPES = [
  'book', 'book_chapter', 'journal_article', 'thesis', 'working_paper', 'conference_paper',
  'interview', 'fieldnote', 'document',
  'note',
  'webpage', 'image', 'video', 'audio', 'social_media_post',
  'dataset', 'statistic',
  'custom',
] as const;

export type ItemType = typeof ITEM_TYPES[number];

export const FAMILIES = ['bibliography', 'fieldwork', 'notes', 'multimedia', 'data', 'other'] as const;
export type Family = typeof FAMILIES[number];

export const FAMILY_MAP: Record<ItemType, Family> = {
  book:               'bibliography',
  book_chapter:       'bibliography',
  journal_article:    'bibliography',
  thesis:             'bibliography',
  working_paper:      'bibliography',
  conference_paper:   'bibliography',
  interview:          'fieldwork',
  fieldnote:          'fieldwork',
  document:           'fieldwork',
  note:               'notes',
  webpage:            'multimedia',
  image:              'multimedia',
  video:              'multimedia',
  audio:              'multimedia',
  social_media_post:  'multimedia',
  dataset:            'data',
  statistic:          'data',
  custom:             'other',
};

export const CONTENT_SOURCES = ['drive_file', 'url', 'inline_text', 'none'] as const;
export type ContentSource = typeof CONTENT_SOURCES[number];

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  content_source: ContentSource;
  drive_file_id?: string | null;
  external_url?: string | null;
  inline_content?: string | null;
  content_text?: string | null;       // extracted text for full-text search
  year?: number | null;               // extracted column for sorting
  creators?: string[] | null;         // extracted column for filtering
  anchor_item_id?: string | null;     // notes only: the item this note comments on
  metadata: Record<string, unknown>;  // all other type-specific fields (notes: metadata.anchor)
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;         // hex, default '#a89b85'
  parent_id?: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;         // hex
  parent_id?: string | null;
  archived: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  item_id: string;
  original_text: string;
  edited_text?: string | null;
  locator?: string | null;   // auto-generated (page, timecode, paragraph)
  position?: TextPosition | null;
  context_note?: string | null;
  created_at: string;
  // relations
  tags?: Tag[];
}

// Where a quote or an anchored note sits inside a text item.
export interface TextPosition {
  page?: number;
  paragraph?: number;
  rects?: [number, number, number, number][];  // x, y, w, h on the page
  text?: string;                                // the selected passage
}

// Simple, untyped link. Shown in both directions (links + backlinks).
export interface ItemLink {
  from_item_id: string;
  to_item_id: string;
  note?: string | null;
  created_at: string;
}

// ─── Join tables (enriched) ───────────────────────────────────────────────────

export interface ItemWithRelations extends Item {
  tags?: Tag[];
  projects?: Project[];
  quotes?: Quote[];
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  drive_connected: boolean;
  created_at: string;
}
