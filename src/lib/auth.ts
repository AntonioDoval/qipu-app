// Session actions used by screens (they never call Supabase directly).
import { createClient } from '@/lib/supabase/client';

export async function signOut(): Promise<void> {
  await createClient().auth.signOut();
}
