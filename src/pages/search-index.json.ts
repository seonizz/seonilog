import type { APIRoute } from 'astro';
import { getPosts, postUrl } from '../lib/posts';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  return new Response(JSON.stringify(posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    body: post.body ?? '',
    url: postUrl(post),
    pubDate: post.data.pubDate.toISOString().slice(0, 10),
  }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
