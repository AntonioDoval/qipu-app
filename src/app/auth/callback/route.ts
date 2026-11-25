import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(`${origin}/?error=auth`);
}
