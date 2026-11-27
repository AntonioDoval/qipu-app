import { redirect } from 'next/navigation';
import { LibraryProvider } from '@/components/library/LibraryProvider';
import { LibraryUIProvider } from '@/components/library/LibraryUIProvider';
import { AppShell } from '@/components/shell/AppShell';
import { ShellProvider } from '@/components/shell/ShellProvider';
import { SAMPLE_MODE } from '@/lib/sampleMode';
import { createClient } from '@/lib/supabase/server';

// Everything inside (app)/ shares this frame: top bar, sidebar, and the loaded library.
// The layout stays mounted while moving between the library and an item, so nothing reloads.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!SAMPLE_MODE) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/');
  }

  return (
    <ShellProvider>
      <LibraryProvider>
        <LibraryUIProvider>
          <AppShell>{children}</AppShell>
        </LibraryUIProvider>
      </LibraryProvider>
    </ShellProvider>
  );
}
