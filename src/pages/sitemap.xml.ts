// /sitemap.xml : 색인 페이지만, 페이지별 priority 포함 (src/lib/registry.ts 가 목록의 단일 소스)
import type { APIRoute } from 'astro';
import { BASE, TODAY, esc } from '../lib/data';
import { allPages } from '../lib/registry';

export const GET: APIRoute = async () => {
  const urls = (await allPages()).filter((p) => p.indexable).map((p) => (
    `<url><loc>${esc(BASE + p.path)}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>${p.priority}</priority></url>`
  )).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
