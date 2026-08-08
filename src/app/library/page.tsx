import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: 24,
      color: '#1a1a1a',
    }}>
      Bienvenido, {user.email} — la biblioteca viene pronto.
    </div>
  );
}
