'use client';

// Google's own folder picker, so the user can choose where the Qipu folder goes.
// With the drive.file permission, picking a folder here is what lets Qipu create its folder inside it.
// Needs NEXT_PUBLIC_GOOGLE_API_KEY (a browser key limited to the Picker API) and
// NEXT_PUBLIC_GOOGLE_APP_ID (the Google Cloud project number).

import { getDriveAccessToken } from './driveAuth';

interface PickerDoc { id: string; name: string }
interface PickerData { action: string; docs?: PickerDoc[] }
interface GooglePicker {
  picker: {
    DocsView: new (viewId: string) => {
      setSelectFolderEnabled(v: boolean): unknown;
      setIncludeFolders(v: boolean): unknown;
      setMimeTypes(m: string): unknown;
      setParent(id: string): unknown;
    };
    PickerBuilder: new () => PickerBuilderApi;
    ViewId: { FOLDERS: string };
    Action: { PICKED: string; CANCEL: string };
  };
}
interface PickerBuilderApi {
  addView(view: unknown): PickerBuilderApi;
  setOAuthToken(t: string): PickerBuilderApi;
  setDeveloperKey(k: string): PickerBuilderApi;
  setAppId(id: string): PickerBuilderApi;
  setTitle(t: string): PickerBuilderApi;
  setLocale(l: string): PickerBuilderApi;
  setCallback(cb: (data: PickerData) => void): PickerBuilderApi;
  build(): { setVisible(v: boolean): void };
}
declare global {
  interface Window {
    gapi?: { load(name: string, cb: () => void): void };
    google?: GooglePicker;
  }
}

export class PickerNotConfiguredError extends Error {
  constructor() {
    super('The Google folder picker is not configured yet (NEXT_PUBLIC_GOOGLE_API_KEY / NEXT_PUBLIC_GOOGLE_APP_ID).');
    this.name = 'PickerNotConfiguredError';
  }
}

let loading: Promise<void> | null = null;
function loadPicker(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const done = () => window.gapi!.load('picker', () => resolve());
    if (window.gapi) return done();
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = done;
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load the Google folder picker.'));
    };
    document.head.append(script);
  });
  return loading;
}

/** Let the user pick a folder in their Drive. Resolves with it, or null if they cancel. */
export async function pickDriveFolder(options: { title: string; locale: string }): Promise<PickerDoc | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  if (!apiKey || !appId) throw new PickerNotConfiguredError();
  const [token] = await Promise.all([getDriveAccessToken(), loadPicker()]);
  const g = window.google!;
  const view = new g.picker.DocsView(g.picker.ViewId.FOLDERS);
  view.setSelectFolderEnabled(true);
  view.setIncludeFolders(true);
  view.setMimeTypes('application/vnd.google-apps.folder');
  view.setParent('root');
  return new Promise((resolve) => {
    new g.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setTitle(options.title)
      .setLocale(options.locale)
      .setCallback((data) => {
        if (data.action === g.picker.Action.PICKED && data.docs?.[0]) resolve({ id: data.docs[0].id, name: data.docs[0].name });
        else if (data.action === g.picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
