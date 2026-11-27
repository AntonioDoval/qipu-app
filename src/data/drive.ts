// Google Drive calls used by the data layer (never by screens directly).
// Qipu uses the `drive.file` permission: it only sees files and folders it created,
// or that the user picked in Google's picker.

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const FOLDER_MIME = 'application/vnd.google-apps.folder';

export class DriveError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'DriveError';
  }
}

async function fail(res: Response, what: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  throw new DriveError(`Could not ${what} in Google Drive: ${body?.error?.message ?? res.statusText} (${res.status})`, res.status);
}

/** Create a NEW folder. Drive never replaces a folder with the same name: it makes another one. */
export async function createFolder(token: string, name: string, parentId: string | null): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API}/files?fields=id,name`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId ?? 'root'] }),
  });
  if (!res.ok) await fail(res, 'create the folder');
  return (await res.json()) as { id: string; name: string };
}

/**
 * Upload a file into a folder with a resumable upload (works for large books and reports progress).
 * Returns Drive's id, name and size.
 */
export async function uploadFile(
  token: string,
  folderId: string,
  file: Blob,
  name: string,
  onProgress?: (fraction: number) => void,
): Promise<{ id: string; name: string; size: number }> {
  const type = file.type || 'application/octet-stream';
  const start = await fetch(`${UPLOAD}/files?uploadType=resumable&fields=id,name,size`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': type,
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify({ name, parents: [folderId] }),
  });
  if (!start.ok) await fail(start, 'start the upload');
  const session = start.headers.get('Location');
  if (!session) throw new DriveError('Google Drive did not return an upload address.', 500);

  const parse = (raw: { id: string; name: string; size?: string }) => ({ id: raw.id, name: raw.name, size: Number(raw.size ?? file.size) });

  // In the browser, XMLHttpRequest reports upload progress; fetch does not.
  if (typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', session);
      xhr.setRequestHeader('Content-Type', type);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(parse(JSON.parse(xhr.responseText)));
        else reject(new DriveError(`Could not upload the file to Google Drive (${xhr.status}).`, xhr.status));
      };
      xhr.onerror = () => reject(new DriveError('The upload to Google Drive was interrupted.', 0));
      xhr.send(file);
    });
  }
  const res = await fetch(session, { method: 'PUT', headers: { 'Content-Type': type }, body: file });
  if (!res.ok) await fail(res, 'upload the file');
  onProgress?.(1);
  return parse((await res.json()) as { id: string; name: string; size?: string });
}

/** Download a file's content (e.g. a PDF for the reader). */
export async function downloadFile(token: string, fileId: string): Promise<Blob> {
  const res = await fetch(`${API}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await fail(res, 'download the file');
  return res.blob();
}
