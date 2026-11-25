# Qipu — product & UI spec (agreed, not yet implemented)

Status: agreed in design reviews on 2026-11-24 and 2026-11-25. Nothing below is built yet.
This replaces the old design references (`qipu-workspace-v3.jsx`, `qipu-viewer-v2.jsx`), which are lost.

- `docs/design/mockup-v3.html`: the clickable mockup for this spec. Open it in a browser.
- `docs/design/mockup-v1.html` and `mockup-v2.html`: earlier, outdated mockups, kept for history.
- Where a mockup disagrees with this document, this document wins. The mockup has known small bugs; it only shows layout and flow.

Scope for now: text items only (PDFs and pasted text). Images, video and audio come later.

---

## 1. Core model

### Three kinds of item
| Kind | ES | Types inside |
|---|---|---|
| **Bibliography** | Bibliografía | CSL types: book, chapter, article, thesis, report / working paper, conference paper |
| **Sources** | Fuentes | interview, document, archival record, webpage, image… **plus user-defined types** |
| **Notes** | Notas | note |

- There is **no "fieldnote" type**. Existing field notes are uploaded or pasted as a Source. Notes written inside Qipu are Notes.
- Each kind is shown with **one icon** (3 icons), with the type in small grey text next to it.
- "Library" means Bibliography + Sources. **Notes are not listed in the Library**; they have their own tab.

### Three tabs, one browser window
- **Library:** list of Bibliography and Sources.
- **Reader:** opens a Bibliography item or a Source (PDF or pasted text).
- **Notes:** list of notes, or the note editor.

Every item has its own URL (`/item/[uuid]`), so Cmd/Ctrl+click opens anything in a new browser tab.

---

## 2. Top bar (always visible)

```
[◧]  Qipu      Library · Reader · Malinowski, 1922 · Notes · Kula as circul…            [◨]
```

From left to right:
1. **Left sidebar toggle** (Cmd+\). Fixed position whether the sidebar is open or closed.
2. **Qipu logo/name.** Goes to the Library home: no filters, no search.
3. After a gap, the **tabs**:
   - **Library**
   - **Reader**, labelled with what is open: `author, year`. The author is cut at 15 characters, with "…" **only if it was cut** (e.g. "Malinowski, 1922", "Municipalidad P…, 2019"). If there is no author, the title is used.
   - **Notes**, labelled with the open note's title, cut at 15 characters with "…" only if cut.
4. Far right: **right panel toggle** (Cmd+.). Fixed position whether the panel is open or closed.

- On a phone, the tabs show **icons only**.
- There are no Finder or Shortcuts buttons. **Cmd+K** is a keyboard shortcut only. The shortcut list lives in Settings.

---

## 3. Left sidebar (the same in every tab)

```
[ 🔍 Search everything… ]
▸ All items                (collapsible, every item and note, A to Z)
▾ Projects            +
   ▸ Thesis
       ▾ Ch. 2 — The Huancayo feria
           📕 The Articulated Peasant
           🗃 Entrevista a Doña R.
           ✎ Notes on the interview…
▸ Tags
Trash · Settings
```

- **Search everything:** typing shows matching items, notes, projects and tags, grouped. Enter opens the first result. It is independent of the Library search.
- **All items:** collapsible list of every item and note, alphabetical. Collapsed by default.
- **Projects:**
  - **+** creates a project. Hover a project and press its **+** to create a subproject (max depth 20).
  - **▸ / ▾** opens a project in place, showing its subprojects and its items and notes.
  - **Clicking a project's name** opens the Library tab filtered to that project (shown as a removable badge in the Library search bar).
- **Tags:** tree by path (`andes` → `ayni`). Clicking a tag opens the Library filtered to that tag. Tags have no +; they are created by typing them.
- Items in the sidebar can be dragged into a note to insert a `[[link]]`.
- The sidebar has **no filter button**. There is **no global "Working in" project mode**: projects filter the Library only.
- Each section collapses. The open/closed state is remembered.

---

## 4. Library tab

### Search bar (independent from the sidebar)
- Typing filters by **title and author** instantly. **Enter** searches the **full text**, including PDF text, and shows the matching passage under each title.
- **All · Bibliography · Sources** switch.
- **Filter** button: project, tag, type, year, has PDF / annotations / notes. Active filters show as removable badges.
- **+ Add** button and **Columns** picker.
- When notes also match the current search or filter, a line under the list says "Also 2 notes match" and opens them in the Notes tab.

### List
| Column | Details |
|---|---|
| Kind | Icon plus type in small grey text |
| Title | |
| Authors | "Malinowski" · "Alberti & Mayer" · "Mayer et al."; sorts by first author's surname |
| Year | |
| Created | Smart dates; **default sort: newest first** |
| Modified | Smart dates |
| Tags | |
| Has | Number of annotations, number of notes, PDF |

- **Smart dates:** "14:32" (today) → "Yesterday" → "Mon" → "12 Mar" (this year) → "12 Mar 2024". Full timestamp on hover. Dates follow the ES/EN setting.
- Click a header to sort; click again to flip the order. A column picker shows/hides columns (remembered).
- **Every badge is clickable:** tag → Library filtered by that tag; project → Library filtered by that project; item or note → opens it. In list rows, clicking a badge filters instead of selecting the row.
- **Multi-select actions:** add tags, add to project, move to trash. For Bibliography items only:
  - **Copy citations** (APA 6/7, Chicago, MLA, any CSL style), formatted with italics, sorted alphabetically, ready to paste into a paper's bibliography
  - export BibTeX / RIS
- Right panel: details of the selected item.
- **Empty library (first run):** a clear empty state: drop your first PDF, or import from Zotero / BibTeX.

### Adding items (+ Add)
| Option | Kind |
|---|---|
| Upload files (or drag & drop anywhere) | Bibliography or Source |
| Add by DOI / ISBN / link | Bibliography |
| Import BibTeX / RIS (with preview) | Bibliography |
| Add reference by hand (no PDF) | **Bibliography only** |
| Paste text | Source |

New notes come from the Notes tab (+ New note) or Cmd+K, not from this menu.

### Upload dialog
- **Multiple files:** file list on the left, form for the selected file on the right. **Every file is set up individually.** Each shows complete / missing info and can be saved on its own. Optional "Copy settings from previous file" (it pre-fills only; nothing applies to all files at once).
- **Per file:** Bibliography or Source · project(s) · tags.
- **Bibliography:** details detected from DOI/ISBN, shown for checking.
- **Source:**
  - type (default list, plus custom types the user adds)
  - **source date** (when the interview took place, when the document was issued); partial dates allowed ("1987", "2019-03"); separate from the automatic creation date
  - author / creator
  - type-specific fields:
    - Interview: **interviewee alias (alias only, never real names)**, interviewer, place, language, length
    - Document / archival: issuing body, archive, catalogue reference
    - Webpage: URL, date accessed

---

## 5. Reader tab

- With nothing open: **recently opened** items.
- A ✕ in the reader closes the current text and returns to that list.

### Right panel
Tabs: **Info · Annotations · Search**.
- **Info:** metadata, tags, projects, links/backlinks, notes on this item, and **+ Note on the whole text**.
- **Annotations:** every highlight / shape / drawing, filterable by color (and color name). Clicking one scrolls the page to it, and the reverse. Tick several → "Note on these".
- **Search:** search within this text; clicking a hit jumps to it and selects it, so 1–5 highlights it.

### Annotation (Paperpile-style, one highlighting mode)
- **5 colors**, mapped to keys **1–5**. Each color is customizable and has an **optional name** (e.g. 1 = "Key argument", 3 = "Disagree"), which works as light thematic coding. Default colors must be distinguishable for colorblind users.
- **Highlight:** select text, then press 1–5, or click a color dot next to the selection. **The dots are the main path on touch screens** (tablet later).
- With nothing selected, 1–5 sets the active color for shapes and pen.
- **Toolbar:** Select · Square · Circle · Star · Pen · Eraser · 5 colors · edit colors. Esc returns to Select. Pen must work with a stylus later (pointer events).
- **Shapes and pen work on PDFs only**, not on pasted text.
- **Clicking an annotation:** change color · tags · add note · copy (with citation) · delete.
- Cmd+Z undoes. Every delete shows an Undo message.
- **Every highlight is a quote:** text, automatic locator (page, or paragraph for pasted text; editable) and tags.
- **Notes from reading** are full, independent notes (Notes tab, `[[links]]`, `#tags`). They open in the right panel next to the text, with "Open in Notes →". A note can be attached to the whole text or to one or more highlights, and jumps back to them.
- Changing a palette color recolors all annotations that use it (they store the color slot, not the hex value).

### Download
- **"Download annotated PDF"** writes standard, **editable** PDF annotations (Highlight, Square, Circle, Polygon for star, Ink for pen) with the exact colors. Each color name goes in the annotation subject. Notes become comments attached to their highlight.
- The original file in Drive is **never modified**.

### Other
- Pasted-text sources are **read-only** for now.
- A Bibliography reference without a PDF opens its details with an "Attach PDF" drop area.
- Scanned PDFs without a text layer are marked "no text layer": shapes and pen work, highlighting and search don't.

### Build order
1. highlights + keys + notes
2. shapes + pen
3. annotated PDF export
4. (later) import annotations from already-annotated PDFs

---

## 6. Notes tab

- With no note open: **list of notes** with its own search (title and text), newest edited first, and **+ New note**.
- Clicking the Notes tab while a note is open goes back to the list.
- Editor:
  - Obsidian-style free text, Edit / Read modes.
  - **Tags exist only in the text** as `#tag` (nested: `#andes/ayni`). Plain while editing; clickable badges in Read mode.
  - Typing `#` suggests tags; typing `[[` suggests items and notes. Clicking a link to a missing note creates it.
  - **Autosave**, with grey "Saved 2 minutes ago" under the title.
  - Right panel: links, backlinks, tags, projects, what the note is attached to.

---

## 7. Foundations (agreed in the review of 2026-11-25)

### Tooling and process
- Next.js 16 (not 14 as the old handoff said). Upgrade to the versions Next 16 expects (React 19, ESLint 9 flat config). Remove `legacy-peer-deps`. Rename `middleware.ts` → `proxy.ts`.
- Every push runs a GitHub check: type-check, lint, build, and all migrations on a throwaway Postgres.
- Two Supabase projects: **staging** (branch `develop`) and **production** (branch `main`).
- Migrations through the Supabase CLI; never edit a migration that has been applied anywhere.
- TypeScript database types are **generated** from the database, not written by hand.
- One source for design tokens (`tokens.ts` → CSS variables). No hardcoded colors. Every UI string goes through the ES/EN message files.
- A `CLAUDE.md` in the repo with the working rules, so every session follows them.

### Security and access
- Login callback only redirects to same-site paths (fix the open redirect).
- Row-level security checks **both sides** of every join table (item_tags, quote/annotation tags, item_links).
- **Google login only.** Remove email/password. Request Drive access with offline access so Qipu keeps a refresh token (stored securely) and Drive keeps working after the first hour.

### Data model
- **References in CSL-JSON** (the format citation styles use), stored in JSONB, with types aligned to CSL. Authors with family/given names. Citations rendered with citeproc and CSL styles. BibTeX/RIS import/export through the same format.
- **Citekeys:** every Bibliography item gets a stable key `surnameyear` (lowercase, no accents), with a letter when duplicated: `malinowski1922`, `malinowski1922b`. Used for links and, later, for citations in the writing space.
- `items.kind` is a real column (`bib` / `source` / `note`). Source types are free text (user-defined); Bibliography types stay a fixed CSL list.
- Source date with precision (year / month / day), next to `year`.
- **Links stored by ID.** Notes show `[[Title]]`; when anything is renamed, Qipu rewrites the `[[...]]` text in every note that links to it. Suggestions disambiguate duplicate titles (author, year).
- **Tags stored as full paths** (`andes/ayni`), plus a small table for colors. Renaming or merging a tag rewrites it in note text too.
- **Annotations** replace quotes: type (highlight / square / circle / star / ink), color slot (1–5), tags, locator, and two anchors:
  - position: page + rectangles or path in **PDF coordinates** (not screen pixels)
  - text quote: exact text + a few words before and after (W3C Web Annotation style)
- Note ↔ annotation link table (a note can attach to several highlights); `anchor_item_id` for whole-text notes.
- **PDF text stored per page** in its own table (avoids the Postgres search-index size limit for long books; search can report the page). Text is extracted in the browser at upload.
- Per-user palette (5 slots: hex + name) and custom source types.
- Migration plan: migration 002 was never applied, so it is **rewritten as one clean 002** containing everything above.

### Files and your data
- PDFs live in your Google Drive, in `Qipu/`.
- **Notes are mirrored as Markdown files** in `Drive/Qipu/Notes/`, automatically, a few seconds after you stop typing. Renaming a note renames its file. Each file starts with a header (Qipu ID, dates, projects, attachment such as `malinowski1922, p. 81`) so two-way sync can be added later. The database stays the working copy.
- **Backups** of everything else (library as CSL-JSON + BibTeX, annotations, projects, tags) go to `Drive/Qipu/Backups/` on a schedule, keeping the last few.
- **Note version history** with restore.
- Two tabs editing the same note: detect it and warn instead of overwriting.
- Trash keeps items 30 days. Qipu never deletes a Drive file unless you explicitly ask.

---

## 8. Future directions (not built now, but designed for)

### Desktop app, offline, with local files
Not a separate project, as long as the code follows four rules from the start:
1. Screens never call Supabase or Drive directly. They go through one data layer ("save note", "load annotations", "store file"). Today it uses Supabase + Drive; later a second version uses a local database + a local folder.
2. App logic runs in the browser, not on the server. Server code only for small jobs (e.g. refreshing Google access). The desktop wrapper (probably Tauri) runs browser code.
3. IDs are generated by Qipu; notes stay plain Markdown files (a local folder works like an Obsidian vault). Search goes through the data layer too.
4. PDF display, highlighting and export happen in the browser.

### Browser extension (Paperpile-style capture)
- Reads the standard citation tags in academic pages (title, authors, DOI, PDF link), shows a preview, saves to Qipu with the PDF. Can also save a page as a Source (text + URL + date accessed).
- Uses the same way in as the + Add dialog, CSL-JSON and citekeys.
- With the desktop app it would talk to a small local connection inside Qipu.
- **Licensing:** do not copy Zotero's site translators (AGPL; using them would require Qipu's code to be public under AGPL). Start with our own reader of the standard tags. Decide later whether to go open source.
