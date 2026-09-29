// /rss.xml : 네이버 서치어드바이저 제출용. rss:true 인 색인 페이지만 (src/lib/registry.ts)
import type { APIRoute } from 'astro';
import { BASE, BRAND, COPY, TODAY, esc } from '../lib/data';
import { allPages } from '../lib/registry';

export const GET: APIRoute = async () => {
  const pub = new Date(`${TODAY}T09:00:00Z`).toUTCString().replace(/ GMT$/, ' +0000');
  const items = (await allPages()).filter((p) => p.indexable && p.rss).map((p) => {
    const link = esc(BASE + p.path);
    return `<item><title>${esc(p.title)}</title><link>${link}</link><guid>${link}</guid><description>${esc(p.desc)}</description><pubDate>${pub}</pubDate></item>`;
  }).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(BRAND)}</title>`
    + `<link>${BASE}/</link><description>${esc(COPY.home.desc)}</description><language>ko</language>${items}</channel></rss>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
