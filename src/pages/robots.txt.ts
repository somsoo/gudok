import type { APIRoute } from 'astro';
import { BASE } from '../lib/data';

export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\nDisallow: /go/\nSitemap: ${BASE}/sitemap.xml\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
