'use client';

// An opened item: notes open in the note editor; texts in the reader (step 6, placeholder for now).

import { useParams } from 'next/navigation';
import { useLibrary } from '@/components/library/LibraryProvider';
import { NoteEditor } from '@/components/note/NoteEditor';
import { ItemPlaceholder } from './ItemPlaceholder';

export function ItemView() {
  const { id } = useParams<{ id: string }>();
  const { itemById, status } = useLibrary();
  const item = itemById(id);
  if (status === 'loading' && !item) return null;
  // key: a different note gets a fresh editor (no text carried over)
  return item?.kind === 'note' ? <NoteEditor key={id} id={id} /> : <ItemPlaceholder />;
}
