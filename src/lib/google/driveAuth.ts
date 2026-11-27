'use client';

// Google sign-in and Drive access from the browser. The browser only ever holds a
// short-lived access token (about an hour), fetched from our server when needed.

import { createClient } from '@/lib/supabase/client';

/** Drive access limited to files Qipu creates or the user picks (not the whole Drive). */
export const GOOGLE_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';

export class DriveNotConnectedError extends Error {
  constructor() {
    super('Google Drive is not connected.');
    this.name = 'DriveNotConnectedError';
  }
}

let cached: { token: string; expiresAt: number } | null = null;

/** A valid Google access token for Drive, renewed through the server when it runs out. */
export async function getDriveAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const res = await fetch('/api/google/token', { cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as { accessToken?: string; expiresAt?: number; error?: string; message?: string };
  if (res.status === 409 || res.status === 401) throw new DriveNotConnectedError();
  if (!res.ok || !body.accessToken) throw new Error(body.message ?? body.error ?? `Drive token request failed (${res.status})`);
  cached = { token: body.accessToken, expiresAt: body.expiresAt ?? Date.now() + 50 * 60 * 1000 };
  return cached.token;
}

export async function isDriveConnected(): Promise<boolean> {
  try {
    await getDriveAccessToken();
    return true;
  } catch (e) {
    if (e instanceof DriveNotConnectedError) return false;
    throw e;
  }
}

// Supabase only returns to addresses on its approved list (Authentication → URL Configuration),
// matched exactly, so the callback address never carries extra parameters. Where to go
// afterwards travels in a short-lived cookie instead (read by /auth/callback).
export const RETURN_COOKIE = 'qipu-return-to';

function redirectTo(returnTo: string) {
  document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(returnTo)}; path=/; max-age=600; samesite=lax`;
  return `${window.location.origin}/auth/callback`;
}

/** Sign in with Google, asking for offline Drive access (Google then sends the long-lived key). */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await createClient().auth.signInWithOAuth({
    provider: 'google',
    options: { scopes: GOOGLE_SCOPES, redirectTo: redirectTo('/library'), queryParams: { access_type: 'offline' } },
  });
  if (error) throw error;
}

/**
 * Connect (or reconnect) Drive for a signed-in user. `prompt: consent` makes Google send a
 * new long-lived key even if the user approved Qipu before without offline access.
 */
export async function connectDrive(returnTo: string): Promise<void> {
  cached = null;
  const { error } = await createClient().auth.signInWithOAuth({
    provider: 'google',
    options: { scopes: GOOGLE_SCOPES, redirectTo: redirectTo(returnTo), queryParams: { access_type: 'offline', prompt: 'consent' } },
  });
  if (error) throw error;
}
