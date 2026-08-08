import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginPage from '@/components/auth/LoginPage';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Already logged in → go to library
  if (user) redirect('/library');

  return <LoginPage />;
}
