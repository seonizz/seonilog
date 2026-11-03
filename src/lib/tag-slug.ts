import { createHash } from 'node:crypto';

/** Keep labels such as C/C++, C#, and Korean out of filesystem paths. */
export function tagSlug(tag: string): string {
  return `t-${createHash('sha256').update(tag.normalize('NFC')).digest('hex').slice(0, 32)}`;
}
