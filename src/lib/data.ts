/**
 * 데이터 단일 소스와 계산 헬퍼.
 *   site.json             사이트 설정 (도메인, 애드센스, 연락처)
 *   data/services.json    서비스별 요금·할인·해지 정보  ← 가격은 여기만 고치면 전 페이지 반영
 *   data/affiliates.json  제휴 링크·프로모션 코드       ← 제휴 가입 후 여기만 채우면 됨
 *   data/copy.json        여러 페이지가 함께 쓰는 문구
 */
import site from '../../site.json';
import servicesData from '../../data/services.json';
import affiliates from '../../data/affiliates.json';
import copy from '../../data/copy.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Plan = { name: string; price?: number | null; usd?: number | null; app_price?: number; app_higher?: boolean; ads?: boolean; feat?: string; kind?: string; check?: boolean };
export type Discount = { type: string; title: string; cost?: string; cond?: string; stab?: string; desc: string; source?: string };
export type Service = Record<string, any> & { id: string; cat: string; name: string; plans: Plan[]; discounts: Discount[] };
export type Bundle = { id: string; name: string; price: number; href: string; cond: string; parts: [string, string][] };
export type Affiliate = Record<string, any>;
export type FaqItem = { q: string; a: string };

export const SITE: Record<string, any> = site;
export const SERVICES: Service[] = (servicesData as any).services;
export const BUNDLE_LIST: Bundle[] = (servicesData as any).bundles ?? [];
export const BUNDLES: Record<string, Bundle> = Object.fromEntries(BUNDLE_LIST.map((b) => [b.id, b]));
export const AFF: Record<string, Affiliate> = affiliates as any;
export const COPY: Record<string, any> = copy;
export const SVC: Record<string, Service> = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
export const BASE: string = SITE.base_url.replace(/\/+$/, '');
export const BRAND: string = SITE.brand;
export const TODAY: string = SITE.last_reviewed;
export const VER = TODAY.replaceAll('-', '');

// ---------------------------------------------------------------- 주간 점검 상태
/**
 * price_hidden: 홈서버 주간 점검(gudok-watch)이 공식 페이지에서 이 서비스의 금액을 확인하지 못한 날짜.
 *   그 서비스의 요금표·카드·비교표·계산기에서는 금액을 빼고 '공식 요금 확인'으로 보여 준다.
 *   문장 속 가격 토큰은 문장이 깨지지 않도록 마지막으로 확인한 금액을 쓰고, 페이지 안내(app.js initHiddenNote)가 결제 전 확인을 권한다.
 * price_check:'none': 자동 점검 대상이 아니다(쿠팡플레이). 여러 서비스 페이지의 확인일 계산에서 뺀다.
 */
export const HIDDEN: Service[] = SERVICES.filter((s) => s.price_hidden);
export const HIDDEN_NAMES: string[] = HIDDEN.map((s) => s.name);
const LAST_CHECKED = new Map<Plan, Plan>();
for (const s of HIDDEN) {
  for (const p of s.plans) {
    LAST_CHECKED.set(p, { ...p });
    p.price = null;
    p.usd = null;
  }
  for (const d of s.discounts) if (d.cost && /\d/.test(d.cost)) d.cost = '공식 요금 확인';
}
/** 여러 서비스 가격이 함께 나오는 페이지의 기준일: 자동 점검 중인 서비스 가운데 가장 오래된 verified_at. 오래된 요금 안전장치(app.js initStale)가 쓴다. */
export const verifiedOf = (list: Service[]): string => list.filter((s) => s.price_check !== 'none' && !s.price_hidden)
  .map((s) => s.verified_at).filter(Boolean).sort()[0] ?? TODAY;
export const OLDEST_VERIFIED: string = verifiedOf(SERVICES);
/** 결합 상품 표에 보여 줄 묶음: 가린 서비스가 들어간 묶음은 뺀다. */
export const BUNDLES_SHOWN: Bundle[] = BUNDLE_LIST.filter((b) => !b.parts.some(([sid]) => SVC[sid]?.price_hidden));

export const CAT_ORDER = ['ott', 'music', 'ai'];
export const TYPE_LABEL: Record<string, string> = {
  official: '공식 요금제', annual: '연간 결제', web: '웹 결제', bundle: '결합 상품',
  membership: '멤버십 혜택', carrier: '통신사 제휴', card: '카드 제휴', promo: '프로모션',
  team: '팀 요금제', sharing_official: '공식 공유', sharing_platform: '공유 플랫폼',
  warning: '비추천',
};
export const DEAL_TYPES = ['membership', 'bundle', 'carrier', 'card', 'annual', 'web', 'promo'];
export const PARTNER_TYPES = ['membership', 'bundle', 'carrier', 'card'];
export const STAB: Record<string, [string, string]> = { high: ['안정적', 'ok'], mid: ['조건부', 'mid'], low: ['주의', 'low'] };
export const NAV: [string, string][] = [['OTT', '/ott/'], ['음악', '/music/'], ['AI', '/ai/'], ['결합할인', '/deals/'],
  ['도구', '/tools/'], ['가이드', '/guides/']];

export const DISCLOSURE_TEXT = '이 페이지에는 제휴 링크가 포함될 수 있으며, 링크를 통해 가입·구매하면 운영자가 수수료를 받을 수 있습니다. '
  + '수수료 여부는 추천 순서와 내용에 영향을 주지 않습니다.';

// ---------------------------------------------------------------- 숫자
/** Python 3 round() 와 같은 반올림(0.5 는 짝수 쪽). 이전 생성기와 금액이 1원도 다르지 않게 한다. */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
const NF = new Intl.NumberFormat('en-US');
export const nf = (v: number): string => NF.format(v);
export const won = (v: number): string => `${nf(v)}원`;
export const vatKrw = (v: number): number => pyRound(v * 1.1 / 100.0) * 100;
/** Python f"{x:g}" (유효숫자 6자리) */
export const fmtG = (x: number): string => String(Number(x.toPrecision(6)));

// ---------------------------------------------------------------- 가격
export function planKrw(p: Plan): number | null {
  if (p.price != null) return p.price;
  if (p.usd != null) return pyRound(p.usd * SITE.usd_krw / 100.0) * 100;
  return null;
}

export function fmtPrice(p: Plan): string {
  let s: string;
  if (p.price != null) s = p.price === 0 ? '무료' : `월 ${nf(p.price)}원`;
  else if (p.usd != null) s = `월 $${fmtG(p.usd)} (약 ${nf(planKrw(p)!)}원)`;
  else s = '공식 페이지 확인';
  return s;
}

export const officialPlans = (s: Service): Plan[] => s.plans.filter((p) => p.kind !== 'bundle');

export function cheapest(s: Service, { paid = true, noAds = false } = {}): Plan | null {
  let best: Plan | null = null;
  for (const p of officialPlans(s)) {
    const v = planKrw(p);
    if (v == null || (paid && v === 0) || (noAds && p.ads)) continue;
    if (best == null || v < planKrw(best)!) best = p;
  }
  return best;
}

export const cellPrice = (p: Plan | null): string => (p ? `${p.name} · ${fmtPrice(p)}` : '—');

/** 비교표·홈 표의 '공식 최저' 칸. 가린 서비스는 '공식 요금 확인', 금액을 적지 않은 유료 요금제만 있으면 '요금제 · 공식 페이지 확인'. */
export function cheapestCell(s: Service, opts: { paid?: boolean; noAds?: boolean } = {}): string {
  if (s.price_hidden) return '공식 요금 확인';
  const low = cheapest(s, opts);
  if (low) return cellPrice(low);
  const unpriced = officialPlans(s).find((p) => p.price == null && p.usd == null && (!opts.noAds || !p.ads));
  return unpriced ? `${unpriced.name} · 공식 페이지 확인` : '—';
}

export function svc(id: string): Service {
  const s = SVC[id];
  if (!s) throw new Error(`services.json 에 서비스가 없습니다: ${id}`);
  return s;
}

export function planOf(sid: string, name: string): Plan {
  const p = svc(sid).plans.find((x) => x.name === name);
  if (!p) throw new Error(`services.json 에 요금제가 없습니다: ${sid} / ${name}`);
  return p;
}

export function bundle(id: string): Bundle {
  const b = BUNDLES[id];
  if (!b) throw new Error(`services.json bundles 에 묶음이 없습니다: ${id}`);
  return b;
}

export const bundleSep = (b: Bundle): number => b.parts.reduce((sum, [sid, pn]) => sum + planKrw(planOf(sid, pn))!, 0);

// 문장 속 토큰은 가린 서비스라도 마지막으로 확인한 금액을 쓴다(문장이 깨지지 않게, 페이지 안내가 결제 전 확인을 권함).
const tokPlan = (sid: string, name: string): Plan => {
  const p = planOf(sid, name);
  return LAST_CHECKED.get(p) ?? p;
};
const tokBundleSep = (b: Bundle): number => b.parts.reduce((sum, [sid, pn]) => sum + planKrw(tokPlan(sid, pn))!, 0);

// ---------------------------------------------------------------- 가격 토큰
/**
 * 문장 속 가격을 services.json 에서 가져온다 (가격이 바뀌면 문장도 같이 바뀜).
 * MDX 본문에서는 <Price t="p:netflix:광고형 스탠다드" />, 머리말(frontmatter) 문자열에서는 {{p:netflix:광고형 스탠다드}}.
 *   p:서비스:요금제 웹 요금 · d:서비스:요금제A:요금제B B−A
 *   b:묶음 묶음 요금 · bs:묶음 따로 결제 합계 · bsave:묶음 차액
 *   fx 기준 환율 · krw:달러 원화 환산 · 끝에 :x12 를 붙이면 12배(1년 환산)
 *   a:·ad:(앱 결제 요금·차액)는 앱 결제 금액을 매주 확인할 수 없어 더 이상 적지 않는다(쓰면 빌드가 멈춤).
 */
export function tokenValue(token: string): number {
  const i = token.indexOf(':');
  const kind = i < 0 ? token : token.slice(0, i);
  let a = (i < 0 ? '' : token.slice(i + 1)).split(':');
  let mult = 1;
  if (a.length > 1 && /^x\d+$/.test(a[a.length - 1])) {
    mult = Number(a[a.length - 1].slice(1));
    a = a.slice(0, -1);
  }
  let v: number | null | undefined;
  switch (kind) {
    case 'p': v = planKrw(tokPlan(a[0], a[1])); break;
    case 'a': v = tokPlan(a[0], a[1]).app_price; break;
    case 'ad': v = tokPlan(a[0], a[1]).app_price! - planKrw(tokPlan(a[0], a[1]))!; break;
    case 'd': v = planKrw(tokPlan(a[0], a[2]))! - planKrw(tokPlan(a[0], a[1]))!; break;
    case 'b': v = bundle(a[0]).price; break;
    case 'bs': v = tokBundleSep(bundle(a[0])); break;
    case 'bsave': v = tokBundleSep(bundle(a[0])) - bundle(a[0]).price; break;
    case 'fx': v = SITE.usd_krw; break;
    case 'krw': v = pyRound(Number.parseFloat(a[0]) * SITE.usd_krw); break;
    default: throw new Error(`알 수 없는 가격 토큰: ${token}`);
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`가격 토큰 값을 계산할 수 없습니다: ${token}`);
  return v * mult;
}

export const tokenText = (token: string): string => nf(tokenValue(token));
const TOKEN_RE = /\{\{(\w+(?::[^{}]+)?)\}\}/g;
export const tok = (text: string): string => text.replace(TOKEN_RE, (_m, t: string) => tokenText(t));
export const faqItems = (items: FaqItem[] = []): FaqItem[] => items.map((i) => ({ q: tok(i.q), a: tok(i.a) }));

// ---------------------------------------------------------------- URL·제휴
export const svcUrl = (s: Service, sub = ''): string => `/${s.cat}/${s.id}/${sub}`;

/** affiliates.json 항목 ('_' 로 시작하는 키는 설명용이라 건너뜀) */
export const affItems = (): [string, Affiliate][] => Object.entries(AFF).filter(([k]) => !k.startsWith('_'));

export function couponLive(key: string): boolean {
  const a = AFF[key] ?? {};
  return Boolean(a.promo_code || a.affiliate_url);
}

export type Placement = { key: string; a: Affiliate; pl: Record<string, any> };
/** 제휴 링크가 채워진 프로그램 중 이 서비스·할인 유형에 붙이기로 한 것 */
export function placementsFor(sid: string, dtype: string): Placement[] {
  const out: Placement[] = [];
  for (const [key, a] of affItems()) {
    if (!a.affiliate_url) continue;
    for (const pl of a.placements ?? []) {
      if ((pl.service === sid || pl.service === '*') && pl.type === dtype) out.push({ key, a, pl });
    }
  }
  return out;
}

export function trustValue(field: string): string {
  switch (field) {
    case 'brand': return BRAND;
    case 'domain': return SITE.domain;
    case 'contact': return SITE.contact_email || '(연락처 준비 중)';
    case 'operator': return SITE.operator_name || `${BRAND} 편집팀`;
    case 'today': return TODAY;
    default: throw new Error(`알 수 없는 사이트 값: ${field}`);
  }
}

// ---------------------------------------------------------------- 구조화 데이터
export function articleLd(headline: string, desc: string, path: string): object[] {
  const org = { '@type': 'Organization', name: BRAND, url: `${BASE}/` };
  return [{ '@context': 'https://schema.org', '@type': 'Article', headline, description: desc, dateModified: TODAY,
    datePublished: TODAY, mainEntityOfPage: BASE + path, author: org, publisher: org }];
}

export function faqLd(items: FaqItem[] = []): object[] {
  const list = faqItems(items);
  if (!list.length) return [];
  return [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map((i) => (
    { '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })) }];
}

export function webAppLd(name: string, path: string, category: string): object[] {
  return [{ '@context': 'https://schema.org', '@type': 'WebApplication', name, url: BASE + path,
    applicationCategory: category, operatingSystem: 'All', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } }];
}

/** <script> 안에 넣어도 안전한 JSON */
export const safeJson = (x: unknown): string => JSON.stringify(x).replace(/</g, '\\u003c');

/** XML/HTML 텍스트 이스케이프 (Python html.escape 와 같은 규칙) */
export const esc = (s: string): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

// ---------------------------------------------------------------- 도구 데이터
export function calcData() {
  const out = [];
  for (const s of SERVICES) {
    const plans = officialPlans(s).filter((p) => planKrw(p)).map((p) => ({ n: p.name, v: planKrw(p)! }));
    if (plans.length) out.push({ id: s.id, name: s.name, cat: s.cat, href: svcUrl(s), tip: s.quick.cheapest, plans });
  }
  return out;
}

export function finderData() {
  return SERVICES.filter((s) => s.cat === 'ott').map((s) => {
    const low = cheapest(s);
    const noads = cheapest(s, { noAds: true });
    return {
      id: s.id, name: s.name, href: svcUrl(s), tags: s.tags ?? [], streams: s.streams_max ?? 1,
      low: low ? planKrw(low) : null, lowName: low ? low.name : '', noads: noads ? planKrw(noads) : null,
      noadsName: noads ? noads.name : '', free: s.plans.some((p) => p.price === 0), why: s.short,
    };
  });
}
