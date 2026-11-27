import { describe, expect, it } from 'vitest';
import { createMemoryData } from './memory';
import { ConflictError, StorageNotSetUpError } from './types';

// The in-memory data layer follows the same contract as the Supabase one.
describe('memory data layer', () => {
  it('loads the sample library with citekeys and derived fields', async () => {
    const data = createMemoryData();
    const items = await data.listItems();
    const argonauts = items.find((i) => i.title === 'Argonauts of the Western Pacific')!;
    expect(argonauts.citekey).toBe('malinowski1922');
    expect(argonauts.year).toBe(1922);
    expect(items.filter((i) => i.kind === 'note')).toHaveLength(2);
  });

  it('keeps note tags and links in sync with the text, and detects conflicts', async () => {
    const data = createMemoryData();
    const note = await data.createItem({ kind: 'note', type: 'note', title: 'Draft', body: 'About [[Essai sur le don]] #feria' });
    const tags = await data.listTags();
    const itemTags = await data.listItemTags();
    const feria = tags.find((t) => t.path === 'feria')!;
    expect(itemTags.some((r) => r.itemId === note.id && r.tagId === feria.id)).toBe(true);
    expect((await data.listLinks()).some((l) => l.fromItemId === note.id && l.origin === 'text')).toBe(true);

    const saved = await data.saveNote(note.id, { title: 'Draft', body: 'Nothing linked now' }, note.revision);
    expect((await data.listLinks()).some((l) => l.fromItemId === note.id)).toBe(false);
    await expect(data.saveNote(note.id, { title: 'Draft', body: 'x' }, note.revision)).rejects.toBeInstanceOf(ConflictError);
    expect(saved.revision).toBe(note.revision + 1);
  });

  it('rewrites links when an item is renamed', async () => {
    const data = createMemoryData();
    const mauss = (await data.listItems()).find((i) => i.title === 'Essai sur le don')!;
    await data.renameItem(mauss.id, 'The Gift');
    const ayni = (await data.listItems()).find((i) => i.title === 'Ayni vs. the Maussian gift')!;
    expect(ayni.body).toContain('[[The Gift]]');
  });

  it('searches without accents and moves items to the trash and back', async () => {
    const data = createMemoryData();
    expect((await data.search('reciprocidád')).length).toBeGreaterThan(0);
    const [first] = await data.listItems();
    await data.trashItems([first.id]);
    expect((await data.listItems({ trash: true })).map((i) => i.id)).toEqual([first.id]);
    await data.restoreItems([first.id]);
    expect(await data.listItems({ trash: true })).toHaveLength(0);
  });

  it('stores files only after a folder was chosen, and reads them back', async () => {
    const data = createMemoryData();
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    await expect(data.storeFile(pdf, 'x.pdf')).rejects.toBeInstanceOf(StorageNotSetUpError);
    const location = await data.createStorageFolder('Qipu (tesis)', null);
    expect(location.folderName).toBe('Qipu (tesis)');
    expect((await data.getProfile()).storage).toEqual(location);
    const stored = await data.storeFile(pdf, 'x.pdf');
    expect(await (await data.readFile(stored)).text()).toBe('%PDF-1.7');
  });
});
