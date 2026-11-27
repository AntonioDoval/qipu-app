import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken, serverTokenKey } from '@/lib/server/tokenCrypto';

// Only allow redirects to a path on this site. Anything else ("//evil.com",
// "@evil.com", "https://…", "/\evil.com") would let a crafted login link send
// the user to another website after signing in.
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/library';
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Google sends a long-lived refresh token only here, and only when the user granted
      // offline access. Keep it (encrypted) so Drive keeps working after the first hour.
      const refreshToken = data.session?.provider_refresh_token;
      const key = serverTokenKey();
      if (refreshToken && key) {
        const { error: saveError } = await supabase.rpc('save_google_credentials', {
          p_refresh_token_encrypted: encryptToken(refreshToken, key),
          p_scopes: 'drive.file',
        });
        if (saveError) console.error('Could not save Google credentials:', saveError.message);
      } else if (refreshToken && !key) {
        console.error('QIPU_TOKEN_KEY is not set: the Google Drive key was not saved.');
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sign-in failed: back to the login page with a message.
  return NextResponse.redirect(`${origin}/?error=auth`);
}
