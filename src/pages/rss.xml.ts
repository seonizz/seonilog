import rss from '@astrojs/rss';
import { SITE } from '../config';
import { getPosts, postUrl } from '../lib/posts';
import { absoluteUrl } from '../lib/urls';

export async function GET() {
  const posts = await getPosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: absoluteUrl(),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: new URL(postUrl(post), SITE.url).href,
    })),
    customData: '<language>ko-kr</language>',
  });
}
