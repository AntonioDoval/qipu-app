// GET /api/google/token → a short-lived Google access token for the signed-in user's Drive.
// The long-lived refresh token never leaves the server unencrypted.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleRevokedError, refreshGoogleAccessToken } from '@/lib/server/googleOAuth';
import { decryptToken, serverTokenKey } from '@/lib/server/tokenCrypto';

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'signed_out' }, 401);

  const key = serverTokenKey();
  if (!key) return json({ error: 'server_not_configured' }, 500);

  const { data, error } = await supabase.rpc('my_google_credentials');
  if (error) return json({ error: 'database', message: error.message }, 500);
  const row = data?.[0];
  if (!row) return json({ error: 'drive_not_connected' }, 409);

  try {
    const { accessToken, expiresIn } = await refreshGoogleAccessToken(decryptToken(row.refresh_token_encrypted, key));
    // Expire a minute early so the browser never uses a token that is about to run out.
    return json({ accessToken, expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000 });
  } catch (e) {
    if (e instanceof GoogleRevokedError) {
      await supabase.rpc('forget_google_credentials');
      return json({ error: 'drive_not_connected' }, 409);
    }
    return json({ error: 'google', message: e instanceof Error ? e.message : String(e) }, 502);
  }
}
