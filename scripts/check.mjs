// 빌드 후 점검 (npm run build 가 astro build 다음에 실행). 깨진 내부 링크나 가격 원칙 위반(제휴·앱 결제 금액)이 있으면 실패(exit 1)한다.
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

// 가격 원칙: 매주 확인할 수 있는 금액만 적는다. 제휴처(카드·통신사·멤버십·프로모션)가 정하는 금액과
// 앱 결제 금액(app_price)은 홈서버 점검이 확인할 수 없으므로 들어오면 빌드를 멈춘다.
const services = JSON.parse(readFileSync(join(ROOT, 'data', 'services.json'), 'utf8')).services;
const AMOUNT = /\d[\d,]*\s?원|\$\s?\d|\d+(?:\.\d+)?\s?%/;
const errors = [];
for (const s of services) {
  for (const d of s.discounts ?? []) {
    if (['membership', 'card', 'carrier', 'promo'].includes(d.type) && (AMOUNT.test(d.cost ?? '') || AMOUNT.test(d.desc ?? ''))) {
      errors.push(`제휴·프로모션 금액은 적지 않습니다: ${s.id} / ${d.title}`);
    }
  }
  for (const p of s.plans ?? []) if (p.app_price != null) errors.push(`앱 결제 금액(app_price)은 적지 않습니다(app_higher 사용): ${s.id} / ${p.name}`);
  if (s.price_hidden) warn.push(`금액 가림 중(price_hidden ${s.price_hidden}): ${s.id} → 공식 요금을 확인해 고친 뒤 price_hidden 을 지우세요.`);
}

console.log(`pages: ${pages.length} (indexable ${indexed.size}, noindex ${pages.length - indexed.size}) → ${DIST}`);
for (const w of warn) console.log('WARN', w);
for (const m of [...missing].sort()) console.log('BROKEN LINK', m);
for (const e of errors) console.log('ERROR', e);
if (missing.size || errors.length) process.exit(1);
