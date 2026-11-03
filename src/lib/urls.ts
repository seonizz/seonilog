import { SITE } from '../config';

/** Accept a path relative to the blog, never an already-prefixed URL. */
export function withBase(path = ''): string {
  return `${SITE.base.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function absoluteUrl(path = ''): string {
  return new URL(withBase(path), SITE.url).href;
}
