/**
 * 페이지 목록과 제목·설명의 단일 소스. 각 페이지 템플릿과 sitemap.xml·rss.xml 이 모두 여기서 읽는다.
 * 순서는 sitemap·RSS 에 그대로 쓰인다.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { BRAND, COPY, SERVICES, affItems, couponLive, type Affiliate, type Service } from './data';

export type Meta = { path: string; title: string; desc: string };
export type PageInfo = Meta & { indexable: boolean; rss: boolean; priority: string };

export const META = {
  home: { path: '/', title: `${BRAND} - 구독료 절약 가이드`, desc: COPY.home.desc },
  compareIndex: { path: '/compare/', title: `구독 서비스 비교 모음 | ${BRAND}`,
    desc: '넷플릭스·티빙·유튜브 프리미엄·AI 구독을 요금과 용도 기준으로 비교한 글 모음입니다.' },
  deals: { path: '/deals/', title: `OTT·음악·AI 결합·제휴 할인 모음 | ${BRAND}`,
    desc: '멤버십·통신사·카드·결합 이용권으로 구독료를 줄이는 방법을 서비스별로 모았습니다.' },
  calc: { path: '/tools/subscription-calculator/', title: `내 구독료 계산기 (OTT·음악·AI) | ${BRAND}`,
    desc: '넷플릭스·유튜브 프리미엄·티빙·ChatGPT 등 매달 나가는 구독료 합계와 절약 방법을 계산합니다.' },
  finder: { path: '/tools/ott-finder/', title: `나에게 맞는 OTT 찾기 | ${BRAND}`,
    desc: '보는 콘텐츠·광고·인원·예산 4가지로 맞는 OTT와 가장 싼 요금제를 추천합니다.' },
  tools: { path: '/tools/', title: `구독료 절약 도구 모음 | ${BRAND}`,
    desc: '구독료 계산기, OTT 추천 도구 등 구독료를 줄이는 무료 도구 모음입니다.' },
  guidesIndex: { path: '/guides/', title: `구독료 절약 가이드 | ${BRAND}`,
    desc: '웹 결제, 앱스토어 해지·환불, 해외 AI 결제, 공유 플랫폼 체크리스트 등 가이드 모음입니다.' },
  couponsIndex: { path: '/coupons/', title: `구독 할인 코드 모음 | ${BRAND}`, desc: '구독 서비스 프로모션 코드와 적용 방법 모음입니다.' },
  notFound: { path: '/404.html', title: `페이지를 찾을 수 없습니다 | ${BRAND}`, desc: '요청하신 페이지를 찾을 수 없습니다.' },
} satisfies Record<string, Meta>;

export function serviceMeta(s: Service): Meta {
  let desc = `${s.name} 요금제별 가격과 조건, 결합·제휴로 더 싸게 쓰는 방법, 해지 방법까지 한 번에 정리했습니다.`;
  if (desc.length > 80) desc = `${s.name} 요금제 가격과 더 싸게 쓰는 방법, 해지 방법을 정리했습니다.`;
  return { path: `/${s.cat}/${s.id}/`, title: `${s.name} 요금제·할인 총정리 | ${BRAND}`, desc };
}

export function cancelMeta(s: Service): Meta {
  let desc = `${s.name} 해지 방법을 웹·앱스토어·구글플레이·제휴사 결제 경로별로 정리하고 환불 기준을 안내합니다.`;
  if (desc.length > 80) desc = `${s.name} 해지 방법을 결제 경로별로 정리하고 환불 기준을 안내합니다.`;
  return { path: `/${s.cat}/${s.id}/cancel/`, title: `${s.name} 해지·환불 방법 | ${BRAND}`, desc };
}

export function couponMeta(key: string, a: Affiliate): Meta {
  return { path: `/coupons/${key}/`, title: `${a.name} 프로모션 코드·할인 | ${BRAND}`,
    desc: `${a.name} 프로모션 코드 적용 방법, 코드 오류 해결, 이용 전 리스크를 정리했습니다.` };
}

/** 쿠폰 페이지를 만드는 제휴 프로그램 (kind=sharing_platform) */
export const couponPrograms = (): [string, Affiliate][] => affItems().filter(([, a]) => a.kind === 'sharing_platform');

type Ordered = 'categories' | 'compare' | 'guides' | 'pages';
export async function sorted<C extends Ordered>(name: C): Promise<CollectionEntry<C>[]> {
  return (await getCollection(name)).sort((a, b) => a.data.order - b.data.order);
}

export async function categoryName(cat: string): Promise<string> {
  const entry = (await getCollection('categories')).find((e) => e.id === cat);
  if (!entry) throw new Error(`src/content/categories/${cat}.mdx 가 없습니다`);
  return entry.data.name;
}

export async function allPages(): Promise<PageInfo[]> {
  const out: PageInfo[] = [];
  const add = (m: Meta, { rss = false, priority = '0.6', indexable = true } = {}) => out.push({ ...m, rss, priority, indexable });
  for (const s of SERVICES) {
    add(serviceMeta(s), { rss: true, priority: '0.8' });
    add(cancelMeta(s), { rss: true });
  }
  for (const c of await sorted('categories')) add({ path: `/${c.id}/`, title: c.data.title, desc: c.data.desc }, { priority: '0.8' });
  for (const c of await sorted('compare')) add({ path: `/compare/${c.id}/`, title: c.data.title, desc: c.data.desc }, { rss: true });
  add(META.compareIndex, { priority: '0.5' });
  add(META.deals, { rss: true, priority: '0.7' });
  add(META.calc, { priority: '0.8' });
  add(META.finder, { priority: '0.7' });
  add(META.tools, { priority: '0.5' });
  for (const g of await sorted('guides')) add({ path: `/guides/${g.id}/`, title: g.data.title, desc: g.data.desc }, { rss: true });
  add(META.guidesIndex, { priority: '0.5' });
  const programs = couponPrograms();
  for (const [key, a] of programs) add(couponMeta(key, a), { indexable: couponLive(key) });
  add(META.couponsIndex, { priority: '0.4', indexable: programs.some(([key]) => couponLive(key)) });
  for (const t of await sorted('pages')) add({ path: `/${t.id}/`, title: t.data.title, desc: t.data.desc }, { priority: '0.3' });
  add(META.home, { priority: '1.0' });
  add(META.notFound, { indexable: false });
  return out;
}
