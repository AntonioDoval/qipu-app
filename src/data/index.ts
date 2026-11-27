// Entry point for screens: `getData()` gives the data layer for the signed-in user.
// Screens import from '@/data' only, never from Supabase or Google Drive directly.

import { createClient } from '@/lib/supabase/client';
import type { QipuData } from './repository';
import { createSupabaseData } from './supabase';

let instance: QipuData | null = null;

/** The data layer in the browser (one shared instance). */
export function getData(): QipuData {
  instance ??= createSupabaseData(createClient());
  return instance;
}

export type { QipuData } from './repository';
export * from './types';
