import { redirect } from 'next/navigation';
import { LibraryProvider } from '@/components/library/LibraryProvider';
import { AppShell } from '@/components/shell/AppShell';
import { ShellProvider } from '@/components/shell/ShellProvider';
import { createClient } from '@/lib/supabase/server';

// Everything inside (app)/ shares this frame: top bar, sidebar, and the loaded library.
// The layout stays mounted while moving between the library and an item, so nothing reloads.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  return (
    <ShellProvider>
      <LibraryProvider>
        <AppShell>{children}</AppShell>
      </LibraryProvider>
    </ShellProvider>
  );
}
