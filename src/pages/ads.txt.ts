import type { APIRoute } from 'astro';
import { SITE } from '../lib/data';

export const GET: APIRoute = () => new Response(`${SITE.ads_txt}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
