import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFolder, downloadFile, DriveError, FOLDER_MIME, uploadFile } from './drive';
import { sha256Hex } from '@/lib/fileHash';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });

afterEach(() => vi.unstubAllGlobals());

describe('Google Drive calls (Google simulated)', () => {
  it('creates a new folder at the top of Drive or inside a chosen folder', async () => {
    const fetchMock = vi.fn(async () => json({ id: 'f1', name: 'Qipu' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await createFolder('tok', 'Qipu', null)).toEqual({ id: 'f1', name: 'Qipu' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string; headers: Record<string, string> }];
    expect(JSON.parse(init.body)).toEqual({ name: 'Qipu', mimeType: FOLDER_MIME, parents: ['root'] });
    expect(init.headers.Authorization).toBe('Bearer tok');
    await createFolder('tok', 'Qipu (tesis)', 'parent-9');
    expect(JSON.parse((fetchMock.mock.calls[1] as unknown as [string, { body: string }])[1].body).parents).toEqual(['parent-9']);
  });

  it('uploads with a resumable session into the Qipu folder', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { Location: 'https://upload.example/session-1' } }))
      .mockResolvedValueOnce(json({ id: 'file-1', name: 'mauss-1925.pdf', size: '4' }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new Blob(['%PDF'], { type: 'application/pdf' });
    const progress: number[] = [];
    const result = await uploadFile('tok', 'folder-1', file, 'mauss-1925.pdf', (f) => progress.push(f));
    expect(result).toEqual({ id: 'file-1', name: 'mauss-1925.pdf', size: 4 });
    const [startUrl, start] = fetchMock.mock.calls[0];
    expect(startUrl).toContain('uploadType=resumable');
    expect(JSON.parse(start.body)).toEqual({ name: 'mauss-1925.pdf', parents: ['folder-1'] });
    expect(start.headers['X-Upload-Content-Type']).toBe('application/pdf');
    expect(fetchMock.mock.calls[1][0]).toBe('https://upload.example/session-1');
    expect(progress.at(-1)).toBe(1);
  });

  it('explains Drive errors (e.g. the Drive API not enabled)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { message: 'Google Drive API has not been used in project' } }, { status: 403 })));
    await expect(createFolder('tok', 'Qipu', null)).rejects.toThrow(DriveError);
    await expect(createFolder('tok', 'Qipu', null)).rejects.toThrow(/has not been used/);
  });

  it('downloads a file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('%PDF-1.7')));
    expect(await (await downloadFile('tok', 'file-1')).text()).toBe('%PDF-1.7');
  });
});

describe('sha256Hex', () => {
  it('identifies identical files', async () => {
    const a = await sha256Hex(new Blob(['same content']));
    expect(a).toHaveLength(64);
    expect(await sha256Hex(new Blob(['same content']))).toBe(a);
    expect(await sha256Hex(new Blob(['other']))).not.toBe(a);
  });
});
