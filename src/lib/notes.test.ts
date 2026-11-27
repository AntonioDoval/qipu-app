import { describe, expect, it } from 'vitest';
import { parseNoteLinks, parseNoteTags, renameLinks, renameTagInText } from './notes';
import { isTagUnder, isValidTagPath, normalizeTagPath, tagAndParents } from './tags';

describe('parseNoteTags', () => {
  it('finds tags, including nested ones, without the #', () => {
    expect(parseNoteTags('Notas sobre el #ayni y la minga. #andes/ayni #to-revisit')).toEqual([
      'ayni',
      'andes/ayni',
      'to-revisit',
    ]);
  });
  it('drops sentence punctuation after a tag', () => {
    expect(parseNoteTags('Ver #feria. Y también (#minga), #método: listo')).toEqual(['feria', 'minga', 'método']);
  });
  it('ignores headings, ## and words with # inside', () => {
    expect(parseNoteTags('# Heading\n## Sub\nissue#12 and C# code')).toEqual([]);
  });
  it('ignores tags inside code', () => {
    expect(parseNoteTags('real #tag and `#not-a-tag` and\n```\n#nope\n```')).toEqual(['tag']);
  });
  it('removes duplicates regardless of case, keeping the first spelling', () => {
    expect(parseNoteTags('#Feria #feria #FERIA')).toEqual(['Feria']);
  });
});

describe('parseNoteLinks', () => {
  it('finds [[links]] and [[link|shown text]]', () => {
    expect(parseNoteLinks('See [[Essai sur le don]] and [[The Gender of the Gift|Strathern]].')).toEqual([
      'Essai sur le don',
      'The Gender of the Gift',
    ]);
  });
  it('trims, removes duplicates and ignores empty links and code', () => {
    expect(parseNoteLinks('[[ Ayni ]] [[ayni]] [[]] `[[code]]`')).toEqual(['Ayni']);
  });
});

describe('renameLinks', () => {
  it('rewrites every link to the renamed item, keeping shown text', () => {
    const before = 'A [[Old title]], b [[old title|short]], c [[Other]].';
    expect(renameLinks(before, 'Old title', 'New title')).toBe('A [[New title]], b [[New title|short]], c [[Other]].');
  });
  it('treats special characters in titles literally', () => {
    expect(renameLinks('[[Value (2001)?]]', 'Value (2001)?', 'Value')).toBe('[[Value]]');
  });
});

describe('renameTagInText', () => {
  it('renames the tag and its children, not similar tags', () => {
    const before = '#andes #andes/ayni #andesmo #Andes. (#andes)';
    expect(renameTagInText(before, 'andes', 'peru')).toBe('#peru #peru/ayni #andesmo #peru. (#peru)');
  });
});

describe('tag paths', () => {
  it('validates like the database does', () => {
    expect(isValidTagPath('andes/ayni')).toBe(true);
    expect(isValidTagPath('bad tag')).toBe(false);
    expect(isValidTagPath('#andes')).toBe(false);
    expect(isValidTagPath('andes//ayni')).toBe(false);
    expect(isValidTagPath('/andes')).toBe(false);
  });
  it('normalizes user input', () => {
    expect(normalizeTagPath('  #andes/ayni ')).toBe('andes/ayni');
    expect(normalizeTagPath('two words')).toBeNull();
  });
  it('lists a tag and its parents', () => {
    expect(tagAndParents('a/b/c')).toEqual(['a', 'a/b', 'a/b/c']);
  });
  it('knows which tags lie under another', () => {
    expect(isTagUnder('andes/ayni', 'andes')).toBe(true);
    expect(isTagUnder('Andes', 'andes')).toBe(true);
    expect(isTagUnder('andesmo', 'andes')).toBe(false);
  });
});
