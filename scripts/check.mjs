// 빌드 후 점검 (npm run build 가 astro build 다음에 실행). 깨진 내부 링크가 있으면 실패(exit 1)한다.
// 경고: H1 1개 · 광고 ins 0/2개 · 색인 콘텐츠 페이지 본문 1,200자 이상 · title 40자 · description 80자 · 연락처
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const site = JSON.parse(readFileSync(join(ROOT, 'site.json'), 'utf8'));
const BASE = site.base_url.replace(/\/+$/, '');
const warn = [];

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const rel = (f) => relative(DIST, f).split(sep).join('/');
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const unescape = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return NAMED[e.toLowerCase()] ?? m;
});
const len = (s) => [...s].length;

const html = walk(DIST).filter((f) => f.endsWith('.html'));

// 깨진 내부 링크
const missing = new Set();
for (const f of html) {
  for (const [, href] of readFileSync(f, 'utf8').matchAll(/(?:href|src)=["'](\/(?!\/)[^"'#?]*)/g)) {
    const t = join(DIST, ...href.split('/').filter(Boolean));
    const ok = href.endsWith('/') ? existsSync(join(t, 'index.html')) : existsSync(t) || existsSync(join(t, 'index.html'));
    if (!ok) missing.add(`${href}  (in ${rel(f)})`);
  }
}

// 페이지 품질 (/go/ 이동 페이지 제외)
const pages = html.filter((f) => !rel(f).startsWith('go/'));
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const indexed = new Map([...sitemap.matchAll(/<loc>([^<]+)<\/loc>.*?<priority>([^<]+)<\/priority>/g)].map(([, loc, pr]) => [unescape(loc), pr]));
for (const f of pages) {
  const doc = readFileSync(f, 'utf8');
  const r = rel(f);
  const path = r === 'index.html' ? '/' : r.endsWith('/index.html') ? `/${r.slice(0, -'index.html'.length)}` : `/${r}`;
  const h1 = (doc.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) warn.push(`h1 ${h1}개: ${path}`);
  const ins = (doc.match(/<ins class="adsbygoogle"/g) ?? []).length;
  if (ins !== 0 && ins !== 2) warn.push(`광고 ins ${ins}개: ${path}`);
  const title = unescape(doc.match(/<title>(.*?)<\/title>/s)?.[1] ?? '');
  if (len(title) > 40) warn.push(`title ${len(title)}자>40: ${path} ${title}`);
  const desc = unescape(doc.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  if (len(desc) > 80) warn.push(`description ${len(desc)}자>80: ${path}`);
  const pr = indexed.get(BASE + path);
  if (pr && !['0.3', '0.4', '0.5'].includes(pr)) {
    const main = doc.match(/<main[^>]*>(.*)<\/main>/s)?.[1] ?? '';
    const text = unescape(main.replace(/<script.*?<\/script>|<style.*?<\/style>|<[^>]+>/gs, ' ')).replace(/\s+/g, ' ').trim();
    if (len(text) < 1200) warn.push(`본문 ${len(text)}자<1200: ${path}`);
  }
}
if (!site.contact_email) warn.push("site.json contact_email 이 비어 있음 → 소개·개인정보처리방침 페이지에 연락처가 '준비 중'으로 표시됩니다.");

console.log(`pages: ${pages.length} (indexable ${indexed.size}, noindex ${pages.length - indexed.size}) → ${DIST}`);
for (const w of warn) console.log('WARN', w);
for (const m of [...missing].sort()) console.log('BROKEN LINK', m);
if (missing.size) process.exit(1);
