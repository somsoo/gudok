import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import servicesData from '../data/services.json';

// 머리말(frontmatter)에 필수 항목이 빠지거나 없는 서비스 id를 쓰면 빌드가 멈춘다.
const serviceIds = new Set(servicesData.services.map((s: { id: string }) => s.id));
const faq = z.array(z.object({ q: z.string(), a: z.string() })).default([]);
const base = { h1: z.string(), title: z.string(), desc: z.string(), order: z.number() };
const mdx = (dir: string) => glob({ pattern: '*.mdx', base: `./src/content/${dir}` });

export const collections = {
  categories: defineCollection({
    loader: mdx('categories'),
    schema: z.object({ ...base, name: z.string(), intro: z.string() }),
  }),
  compare: defineCollection({
    loader: mdx('compare'),
    schema: z.object({
      ...base,
      intro: z.string(),
      services: z.array(z.string().refine((id) => serviceIds.has(id), { message: 'services.json 에 없는 서비스 id' })).min(2),
      faq,
    }),
  }),
  guides: defineCollection({
    loader: mdx('guides'),
    schema: z.object({ ...base, intro: z.string(), disclosure: z.boolean().default(false), faq }),
  }),
  pages: defineCollection({
    loader: mdx('pages'),
    schema: z.object(base),
  }),
};
