import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).max(240),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string().trim().min(1).max(40).transform((tag) => tag.normalize('NFC')))
      .default([]).transform((tags) => [...new Set(tags)]),
    draft: z.boolean().default(true),
  }).refine((post) => !post.updatedDate || post.updatedDate >= post.pubDate, {
    message: 'updatedDate는 pubDate보다 빠를 수 없습니다.',
    path: ['updatedDate'],
  }),
});

export const collections = { blog };
