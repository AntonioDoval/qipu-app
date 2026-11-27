'use client';

// The left sidebar, the same everywhere:
//   search everything · All items (A–Z) · Projects (tree with their items) · Tags (tree) · Trash · Settings

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Folder, Hash, Search, Trash2 } from 'lucide-react';
import { useLibrary } from '@/components/library/LibraryProvider';
import { useLibraryUI } from '@/components/library/LibraryUIProvider';
import type { Item, Project } from '@/data';
import { authorsShort, foldText } from '@/lib/format';
import { tagAndParents } from '@/lib/tags';
import { useStored } from '@/lib/useStored';
import { KindIcon } from './KindIcon';
import { SettingsMenu } from './SettingsMenu';
import { useShell } from './ShellProvider';

type Section = 'all' | 'projects' | 'tags';

const DEFAULT_SECTIONS: Record<Section, boolean> = { all: false, projects: true, tags: true };

function useOpenSections() {
  const [open, setOpen] = useStored<Record<Section, boolean>>('qipu.sidebar.sections', DEFAULT_SECTIONS);
  const [openProjects, setOpenProjects] = useStored<Record<string, boolean>>('qipu.sidebar.projects', {});
  return {
    open,
    openProjects,
    toggleSection: (s: Section) => setOpen({ ...open, [s]: !open[s] }),
    toggleProject: (id: string) => setOpenProjects({ ...openProjects, [id]: !openProjects[id] }),
  };
}

export function Sidebar() {
  const t = useTranslations('sidebar');
  const { items, projects, tags, itemProjects, itemTags } = useLibrary();
  const { closeSidebarIfNarrow } = useShell();
  const ui = useLibraryUI();
  const { open, openProjects, toggleSection, toggleProject } = useOpenSections();
  const [query, setQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const currentId = pathname.startsWith('/item/') ? pathname.split('/')[2] : null;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => foldText(a.title).localeCompare(foldText(b.title))),
    [items],
  );

  // Items directly in each project, A–Z.
  const itemsByProject = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const map = new Map<string, Item[]>();
    for (const { itemId, projectId } of itemProjects) {
      const item = byId.get(itemId);
      if (item) map.set(projectId, [...(map.get(projectId) ?? []), item]);
    }
    for (const list of map.values()) list.sort((a, b) => foldText(a.title).localeCompare(foldText(b.title)));
    return map;
  }, [items, itemProjects]);

  // Every tag path plus its parents ("andes/ayni" also shows "andes"), with item counts.
  const tagTree = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    const pathById = new Map(tags.map((tg) => [tg.id, tg.path]));
    for (const tg of tags) for (const p of tagAndParents(tg.path)) if (!counts.has(p)) counts.set(p, new Set());
    for (const { itemId, tagId } of itemTags) {
      const path = pathById.get(tagId);
      if (path) for (const p of tagAndParents(path)) counts.get(p)?.add(itemId);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, ids]) => ({ path, depth: path.split('/').length - 1, count: ids.size }));
  }, [tags, itemTags]);

  // Search everything: items and notes, projects, tags.
  const results = useMemo(() => {
    const q = foldText(query);
    if (!q) return null;
    const match = (s: string) => foldText(s).includes(q);
    return {
      items: items.filter((i) => match(`${i.title} ${i.creatorsText} ${i.citekey ?? ''}`)).slice(0, 12),
      projects: projects.filter((p) => match(p.name)).slice(0, 6),
      tags: tagTree.filter((tg) => match(tg.path)).slice(0, 6),
    };
  }, [query, items, projects, tagTree]);

  const go = (href: string) => {
    router.push(href);
    closeSidebarIfNarrow();
  };
  const showProject = (id: string) => {
    ui.setProject(id);
    go('/library');
  };
  const showTag = (path: string) => {
    ui.setTag(path);
    go('/library');
  };
  const showTrash = () => {
    void ui.showTrash();
    go('/library');
  };
  const inLibrary = pathname === '/library';

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setQuery('');
    if (e.key !== 'Enter' || !results) return;
    const first = results.items[0];
    if (first) go(`/item/${first.id}`);
    else if (results.projects[0]) showProject(results.projects[0].id);
    else if (results.tags[0]) showTag(results.tags[0].path);
  };

  return (
    <nav aria-label="Qipu" className="flex h-full min-h-0 flex-col bg-cream">
      <div className="p-3 pb-2">
        <label className="flex items-center gap-2 rounded-md border border-dust bg-surface px-2.5 py-1.5 focus-within:border-accent2">
          <Search size={15} strokeWidth={1.7} className="shrink-0 text-sage" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t('search')}
            aria-label={t('search')}
            className="w-full min-w-0 bg-transparent text-[13.5px] outline-none placeholder:text-stone"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {results ? (
          <div className="flex flex-col gap-3 pt-1">
            {results.items.map((i) => (
              <ItemRow key={i.id} item={i} current={i.id === currentId} onOpen={go} indent={8} />
            ))}
            {results.projects.map((p) => (
              <button key={p.id} type="button" onClick={() => showProject(p.id)} className={rowClass}>
                <Folder size={14} strokeWidth={1.7} className="text-sage" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {results.tags.map((tg) => (
              <button key={tg.path} type="button" onClick={() => showTag(tg.path)} className={rowClass}>
                <Hash size={14} strokeWidth={1.7} className="text-sage" />
                <span className="truncate">{tg.path}</span>
              </button>
            ))}
            {!results.items.length && !results.projects.length && !results.tags.length && (
              <p className="px-2 text-[12.5px] italic text-sage">—</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <SectionHeader label={t('allItems')} count={items.length} open={open.all} onToggle={() => toggleSection('all')} />
            {open.all && (
              <div className="-mt-2">
                {sortedItems.map((i) => (
                  <ItemRow key={i.id} item={i} current={i.id === currentId} onOpen={go} indent={22} />
                ))}
              </div>
            )}

            <div>
              <SectionHeader label={t('projects')} open={open.projects} onToggle={() => toggleSection('projects')} />
              {open.projects &&
                (projects.length ? (
                  <ProjectTree
                    parentId={null}
                    depth={0}
                    projects={projects}
                    itemsByProject={itemsByProject}
                    openProjects={openProjects}
                    onToggle={toggleProject}
                    onGo={go}
                    onShowProject={showProject}
                    currentProjectId={inLibrary && !ui.trash ? ui.query.projectId : null}
                    currentId={currentId}
                  />
                ) : (
                  <p className="px-2 py-1 text-[12.5px] italic text-sage">{t('noProjects')}</p>
                ))}
            </div>

            <div>
              <SectionHeader label={t('tags')} open={open.tags} onToggle={() => toggleSection('tags')} />
              {open.tags &&
                (tagTree.length ? (
                  tagTree.map((tg) => (
                    <button
                      key={tg.path}
                      type="button"
                      onClick={() => showTag(tg.path)}
                      aria-current={(inLibrary && !ui.trash && ui.query.tag === tg.path) || undefined}
                      className={`${rowClass} aria-[current]:bg-soft aria-[current]:text-accent`}
                      style={{ paddingLeft: 8 + tg.depth * 14 }}
                    >
                      <span className="truncate">{tg.path.split('/').pop()}</span>
                      <span className="ml-auto font-mono text-[10.5px] text-stone">{tg.count}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-1 text-[12.5px] italic text-sage">{t('noTags')}</p>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-t border-dust p-2">
        <button
          type="button"
          onClick={showTrash}
          aria-current={(inLibrary && ui.trash) || undefined}
          className="flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-[13px] text-ink hover:bg-sand aria-[current]:bg-soft aria-[current]:text-accent"
        >
          <Trash2 size={15} strokeWidth={1.7} className="text-sage" />
          {t('trash')}
        </button>
        <div className="flex-1">
          <SettingsMenu />
        </div>
      </div>
    </nav>
  );
}

const rowClass =
  'flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-[3px] text-left text-[13px] text-ink hover:bg-sand';

function SectionHeader(props: { label: string; count?: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-expanded={props.open}
      className="group flex w-full items-center gap-1 px-1 py-0.5 text-left font-mono text-[10.5px] uppercase tracking-wider text-sage hover:text-ink"
    >
      <ChevronRight size={12} strokeWidth={2} className="transition-transform group-aria-expanded:rotate-90" />
      {props.label}
      {props.count !== undefined && <span className="ml-1 normal-case text-stone">{props.count}</span>}
    </button>
  );
}

function ItemRow(props: { item: Item; current: boolean; onOpen: (href: string) => void; indent: number }) {
  const { item } = props;
  const author = item.kind === 'note' ? '' : authorsShort(item.csl);
  return (
    <button
      type="button"
      onClick={() => props.onOpen(`/item/${item.id}`)}
      aria-current={props.current || undefined}
      title={author ? `${item.title} — ${author}` : item.title}
      className={`${rowClass} aria-[current]:bg-soft aria-[current]:text-accent`}
      style={{ paddingLeft: props.indent }}
    >
      <KindIcon kind={item.kind} size={13} />
      <span className="truncate">{item.title}</span>
    </button>
  );
}

function ProjectTree(props: {
  parentId: string | null;
  depth: number;
  projects: Project[];
  itemsByProject: Map<string, Item[]>;
  openProjects: Record<string, boolean>;
  onToggle: (id: string) => void;
  onGo: (href: string) => void;
  onShowProject: (id: string) => void;
  currentProjectId: string | null;
  currentId: string | null;
}) {
  const children = props.projects.filter((p) => p.parentId === props.parentId);
  return (
    <>
      {children.map((p) => {
        const isOpen = !!props.openProjects[p.id];
        const directItems = props.itemsByProject.get(p.id) ?? [];
        const hasContent = directItems.length > 0 || props.projects.some((c) => c.parentId === p.id);
        const indent = 2 + props.depth * 14;
        return (
          <div key={p.id}>
            <div className="flex items-center" style={{ paddingLeft: indent }}>
              <button
                type="button"
                onClick={() => props.onToggle(p.id)}
                aria-expanded={isOpen}
                aria-label={p.name}
                className={`group grid h-6 w-5 shrink-0 place-items-center rounded text-stone hover:bg-sand hover:text-ink ${hasContent ? '' : 'invisible'}`}
              >
                <ChevronRight size={12} strokeWidth={2} className="transition-transform group-aria-expanded:rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => props.onShowProject(p.id)}
                aria-current={props.currentProjectId === p.id || undefined}
                className={`${rowClass} aria-[current]:bg-soft aria-[current]:text-accent`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: p.color, opacity: props.depth ? 0.55 : 1 }}
                  aria-hidden
                />
                <span className="truncate">{p.name}</span>
              </button>
            </div>
            {isOpen && (
              <>
                <ProjectTree {...props} parentId={p.id} depth={props.depth + 1} />
                {directItems.map((i) => (
                  <ItemRow key={i.id} item={i} current={i.id === props.currentId} onOpen={props.onGo} indent={indent + 36} />
                ))}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
