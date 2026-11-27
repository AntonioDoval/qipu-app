// Tag paths: "andes/ayni". Same rule as the database check on tags.path.

const TAG_PATH = /^[^\s/#]+(\/[^\s/#]+)*$/;

export function isValidTagPath(path: string): boolean {
  return path.length > 0 && path.length <= 200 && TAG_PATH.test(path);
}

/** "#Andes/ayni " → "Andes/ayni". Returns null if it is not a valid path. */
export function normalizeTagPath(input: string): string | null {
  const path = input.trim().replace(/^#+/, '');
  return isValidTagPath(path) ? path : null;
}

/** "a/b/c" → ["a", "a/b", "a/b/c"]: the tag and all its parents. */
export function tagAndParents(path: string): string[] {
  const parts = path.split('/');
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}

/** True when `path` is `ancestor` itself or lies under it ("andes/ayni" is under "andes"). */
export function isTagUnder(path: string, ancestor: string): boolean {
  const p = path.toLowerCase();
  const a = ancestor.toLowerCase();
  return p === a || p.startsWith(a + '/');
}
