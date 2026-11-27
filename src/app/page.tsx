import { redirect } from 'next/navigation';
import LoginPage from '@/components/auth/LoginPage';
import { createClient } from '@/lib/supabase/server';

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in → library
  if (user) redirect('/library');

  const { error } = await searchParams;
  return <LoginPage failed={error === 'auth'} />;
}
