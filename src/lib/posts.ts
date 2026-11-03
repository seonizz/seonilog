import { getCollection, type CollectionEntry } from 'astro:content';
import { withBase } from './urls';
import { isPublished } from './post-utils';
import { tagSlug } from './tag-slug';

export { formatDate, readingMinutes } from './post-utils';
export { tagSlug } from './tag-slug';
export type Post = CollectionEntry<'blog'>;

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || isPublished(data));
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || a.id.localeCompare(b.id));
}

export function getTags(posts: Post[]): string[] {
  return [...new Set(posts.flatMap((post) => post.data.tags))].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function postUrl(post: Post): string {
  return withBase(`posts/${post.id.split('/').map(encodeURIComponent).join('/')}/`);
}

export function tagUrl(tag: string): string {
  return withBase(`tags/${tagSlug(tag)}/`);
}
