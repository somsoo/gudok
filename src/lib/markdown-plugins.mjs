// Sätteri(Astro 7 기본 Markdown 처리기) 플러그인. astro.config.mjs 에서 등록한다.
import { defineHastPlugin, defineMdastPlugin } from 'satteri';

/**
 * 한국어 범위 표시 보호: GFM 은 '~' 하나짜리 쌍도 취소선으로 만든다 (예: "1~2주, 3~4개월" → 1<del>2주, 3</del>4개월).
 * '~~취소선~~'(물결 두 개)만 취소선으로 두고, 물결 하나짜리는 글자 그대로 되돌린다.
 */
export function koreanRangeTilde() {
  return defineMdastPlugin({
    name: 'gudok-korean-range-tilde',
    options: { position: true },
    delete(node, ctx) {
      const start = node.position?.start?.offset;
      if (start == null || ctx.source.startsWith('~~', start)) return;
      ctx.replaceNode(node, [{ type: 'text', value: '~' }, ...node.children, { type: 'text', value: '~' }]);
    },
  });
}

const kids = (node, tag) => (node?.children ?? []).filter((c) => c.type === 'element' && c.tagName === tag);
const rightAligned = (cell) => {
  const p = cell.properties ?? {};
  return p.align === 'right' || /text-align:\s*right/i.test(String(p.style ?? ''));
};

/**
 * Markdown 표(| 표 |)를 사이트 표 스타일로 바꾼다.
 *   - <div class="table-wrap"> 로 감싸고 class="cmp stack" (640px 이하에서 카드형)
 *   - 첫 열은 행 제목(<th scope="row">), 오른쪽 정렬 열(|---:|)은 숫자 칸(class="num")
 *   - 머리글을 각 칸의 data-label 로 복사 (모바일 카드에 표시)
 * 직접 쓴 HTML 표(<table class=...>)는 MDX JSX 노드라 여기서 건드리지 않는다.
 */
export function cmpTables() {
  return defineHastPlugin({
    name: 'gudok-cmp-tables',
    element: {
      filter: ['table'],
      visit(table, ctx) {
        const headCells = kids(kids(kids(table, 'thead')[0], 'tr')[0], 'th');
        const labels = headCells.map((c) => ctx.textContent(c).trim());
        const num = headCells.map(rightAligned);
        headCells.forEach((c, i) => {
          if (num[i]) ctx.setProperty(c, 'style', undefined);
        });
        for (const tr of kids(kids(table, 'tbody')[0], 'tr')) {
          kids(tr, 'td').forEach((td, i) => {
            if (i === 0) {
              ctx.replaceNode(td, { type: 'element', tagName: 'th', properties: { scope: 'row' }, children: td.children });
              return;
            }
            if (num[i]) {
              ctx.setProperty(td, 'style', undefined);
              ctx.setProperty(td, 'className', ['num']);
            }
            if (labels[i]) ctx.setProperty(td, 'dataLabel', labels[i]);
          });
        }
        ctx.setProperty(table, 'className', ['cmp', 'stack']);
        ctx.wrapNode(table, { type: 'element', tagName: 'div', properties: { className: ['table-wrap'] }, children: [] });
      },
    },
  });
}
