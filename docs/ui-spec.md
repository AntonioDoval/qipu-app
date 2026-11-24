# Qipu — UI/UX spec (agreed, not yet implemented)

Status: agreed in design review, 2026-11-24. Nothing below is built yet.
This replaces the old design references (`qipu-workspace-v3.jsx`, `qipu-viewer-v2.jsx`), which are lost.

`docs/design/mockup-v1.html` is the first clickable mockup (colors, fonts, general feel).
It is **outdated** in structure. Where it disagrees with this document, this document wins.

Scope for now: text items only (PDFs and pasted text). Images, video and audio come later.

---

## 1. Core model

### Three kinds of item
| Kind | ES | Types inside |
|---|---|---|
| **Bibliography** | Bibliografía | book, chapter, article, thesis, working paper, conference paper |
| **Sources** | Fuentes | interview, document, archival record, webpage, image… **plus user-defined types** |
| **Notes** | Notas | note |

- There is **no "fieldnote" type**. Existing field notes are uploaded or pasted as a Source. Notes written inside Qipu are Notes.
- Kind is shown as **one icon per kind** (3 icons), with the type in small grey text next to it.

### Three views (all in one browser window)
- **Library:** the item list.
- **Reader:** opens Bibliography items and Sources (PDF or pasted text).
- **Notes:** the note editor.

Every item has its own URL (`/item/[uuid]`), so Cmd/Ctrl+click opens anything in a new browser tab.
This replaces the earlier decision "viewer opens in a new tab". Reasons: back button works, no tab pile-up, no stale data between tabs.

---

## 2. Left sidebar (universal, identical in every view)

```
[ 🔍 Search…              ⚲ filter ]
▾ Library            +    → same menu as "+ Add"
    Bibliography  (n)     → expands to items, most recently opened first, ~15 + "Show all in library →"
    Sources       (n)
▾ Projects           +    → new project; hover a project → + adds a subproject
▾ Tags                    → (no +; tags are created by typing them)
▾ Notes              +    → new note, opens straight in the editor
    recent notes…
```

- Each section collapses; the whole sidebar can be hidden (Cmd+\). Layout is remembered.
- **Search:** typing shows instant title/author matches grouped by kind. **Enter** runs full-text search (including PDF text) and shows results with snippets in the main area.
- **Filter button:** project, tag, kind, type, year, has PDF / highlights / notes. **The same filters are used by the library list.**
- **Project filter is global.** Choosing a project scopes the sidebar, the library list and Cmd+K at once, shown as a visible "Working in: Ch. 2 ×" bar.
- **Cmd+K:** a finder overlay in the middle of the screen (works with the sidebar hidden). Jumps to any item, note, tag or project, and runs actions such as "New note" or "Upload".

---

## 3. Adding items ("+ Add" and the + next to Library)

| Option | Kind |
|---|---|
| Upload file (or drag & drop anywhere) | Bibliography or Source |
| Paste text | Source |
| Add by DOI / ISBN / link | Bibliography |
| Import BibTeX / RIS (with preview) | Bibliography |
| Add reference by hand (no PDF) | **Bibliography only** |

New notes are **not** in this menu. They come from the + next to Notes, or from Cmd+K.

### Upload dialog
- **Multiple files:** file list on the left, form for the selected file on the right. **Every file is set up individually.** Each shows complete / missing info. Each can be saved on its own. Optional "Copy settings from previous file" button (it pre-fills only; nothing applies to all files at once).
- **Per file:** Bibliography or Source · project(s) · tags.
- **Bibliography:** details detected from DOI/ISBN shown for checking.
- **Source:**
  - type (default list, plus custom types the user adds)
  - **source date** (when the interview took place, when the document was issued); partial dates allowed ("1987", "March 2019"); separate from the automatic creation date
  - author / creator
  - type-specific fields:
    - Interview: **interviewee alias (alias only, never real names)**, interviewer, place, language, length
    - Document / archival: issuing body, archive, catalogue reference
    - Webpage: URL, date accessed

---

## 4. Library list

| Column | Details |
|---|---|
| Kind | Icon plus type in small grey text |
| Title | |
| Authors | "Malinowski" · "Alberti & Mayer" · "Mayer et al."; sorts by first author's surname |
| Year | |
| Created | Smart dates; **default sort: newest first** |
| Modified | Smart dates |
| Tags | |
| Has | Number of highlights, number of notes, PDF |

- **Smart dates:** "14:32" (today) → "Yesterday" → "Mon" → "12 Mar" (this year) → "12 Mar 2024". The full timestamp shows on hover. Dates follow the ES/EN setting.
- Click a header to sort by it; click again to flip the order. A column picker lets you show/hide columns (remembered).
- **Every badge is clickable:** tag → library filtered by that tag; project → library filtered by that project; item/note → opens it. In list rows, clicking a badge filters instead of selecting the row.
- **Multi-select actions:** add tags, add to project, move to trash. For Bibliography items only:
  - **Copy citations** (APA 6/7, Chicago, MLA, custom), formatted with italics, sorted alphabetically, ready to paste into a paper's bibliography
  - export BibTeX / RIS

---

## 5. Reader

### Right panel
Collapsible (Cmd+.). Tabs: **Info · Annotations · Search**.
- **Info:** metadata, tags, projects, links/backlinks, notes on this item, and a button to add a **note on the whole text**.
- **Annotations:** every highlight / shape / drawing, filterable by color (and color name). Clicking one scrolls the page to it, and the reverse.
- **Search:** search within this text, with a list of hits; clicking a hit jumps to it.

### Annotation (Paperpile-style, one highlighting mode, no Quote/Note split)
- **5 colors**, mapped to keys **1–5**. Each color is customizable and has an **optional name** (e.g. 1 = "Key argument", 3 = "Disagree"), which works as light thematic coding.
- **Highlight:** select text, then press 1–5 (or click a color dot near the selection).
- With nothing selected, pressing 1–5 sets the active color for shapes and pen.
- **Toolbar:** Select · Shapes (hollow square, hollow circle, star) · Pen (freehand) · Eraser · 5 colors. Esc returns to Select. **No heart.**
- **Shapes and pen work on PDFs only**, not on pasted-text sources.
- **Clicking a highlight** lets you: change color · tags · add note · copy text · delete.
- Cmd+Z undoes.
- **Every highlight is a quote:** it has text, an automatic locator (page, or paragraph for pasted text; editable) and tags. The old separate "quotes" concept is merged into highlights.
- **Notes:**
  - on the whole text (Info tab), or
  - on one or more highlights (click a highlight → Add note; or multi-select in the Annotations tab → "Note on these").
  
  Either way it is a full, independent note (Notes view, `[[links]]`, `#tags`). It shows which highlights it belongs to and jumps to them.
- Changing a palette color recolors all highlights that use it (highlights store the color slot, not the hex value).

### Download
- **"Download annotated PDF"** writes standard, **editable** PDF annotations (Highlight, Square, Circle, Polygon for star, Ink for pen) with the exact colors. Each color name goes in the annotation subject. Notes become comments attached to their highlight.
- The original file in Drive is **never modified**.
- The database is the master copy of all annotations.

### Other
- Pasted-text sources are **not editable** for now (may change later; anchors would then need re-matching).
- A Bibliography reference without a PDF opens its details page with an "Attach PDF" drop area.

### Build order
1. highlights + keys + notes
2. shapes + pen
3. annotated PDF export
4. (later) import annotations from already-annotated PDFs

---

## 6. Notes

- Obsidian-style free text.
- **Tags exist only in the text** as `#tag` (nested: `#andes/ayni`). Plain text while editing; clickable badges in read mode. No separate tag chip row.
- Typing `#` suggests existing tags. Typing `[[` suggests items and notes. Clicking a link to a missing note creates it.
- Dragging an item from the sidebar into the text inserts a `[[link]]` to it.
- **Autosave**, with grey "Saved 2 minutes ago" text under the title (Google Docs style).
- Right panel (collapsible): links, backlinks, projects, the item/highlights it is attached to.

---

## 7. Database changes this implies (migration 003, to be written)

Migration 002 (notes as items, untyped links, project-depth trigger, bilingual search, quote position) is committed on `develop` but **not yet applied in Supabase**. Review whether to apply 002 as-is or fold it into 003.

Changes for 003:
- `items.kind` as a real column (`bibliography` / `source` / `note`). Needed because source types can be user-defined, so kind can no longer be derived from type. This replaces "family derived in code".
- `items.type`: free text for sources (bibliography types stay a fixed list, because citation styles need them). Drop or relax the `type` check constraint. Remove `fieldnote`.
- Source date with precision (e.g. `item_date date` + `date_precision` year/month/day), next to `year`.
- `quotes` → `annotations`: kind (highlight / square / circle / star / ink), color slot (1–5), position (page, rects or path), text, locator, tags.
- Note ↔ annotation link table (a note can attach to several highlights), plus the existing `anchor_item_id` for whole-text notes.
- Per-user highlight palette (5 slots: hex + optional name), e.g. a JSONB column on `profiles`.
- Per-user custom source types (or derive suggestions from existing values).
