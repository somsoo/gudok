// @ts-check
import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { cmpTables, koreanRangeTilde } from './src/lib/markdown-plugins.mjs';

const readJson = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf-8'));
const site = readJson('./site.json');
const affiliates = readJson('./data/affiliates.json');

/**
 * 라우트로 만들 수 없는 호스팅 파일(밑줄·점으로 시작하거나 확장자 없음)을 빌드 결과에 쓴다.
 *   _redirects  Cloudflare Pages: /go/<키> 를 서버 302 로 제휴 링크에 보냄 (affiliates.json)
 *   CNAME, .nojekyll  GitHub Pages 용
 */
function hostingFiles() {
  return {
    name: 'gudok-hosting-files',
    hooks: {
      /** @param {{ dir: URL }} options */
      'astro:build:done': ({ dir }) => {
        const out = (name, text) => writeFileSync(new URL(name, dir), text, 'utf-8');
        const lines = [];
        for (const [key, a] of Object.entries(affiliates)) {
          if (key.startsWith('_')) continue;
          const target = a.affiliate_url || a.official_url;
          lines.push(`/go/${key} ${target} 302`, `/go/${key}/ ${target} 302`);
        }
        out('_redirects', `${lines.join('\n')}\n`);
        out('CNAME', `${site.domain}\n`);
        out('.nojekyll', '');
      },
    },
  };
}

export default defineConfig({
  site: site.base_url,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Astro 7 기본값('jsx')은 줄바꿈 사이 공백을 지워 '버튼 버튼' 사이 띄어쓰기가 사라질 수 있어 HTML 규칙(true)을 쓴다.
  compressHTML: true,
  markdown: {
    // 작은따옴표를 둥근 따옴표로 바꾸지 않는다 ('설정' 같은 메뉴 이름을 그대로 보여 주기 위해)
    // 물결 하나(1~2주)는 취소선이 아니라 글자로, Markdown 표는 사이트 표 스타일로 (src/lib/markdown-plugins.mjs)
    processor: satteri({
      features: { smartPunctuation: false },
      mdastPlugins: [koreanRangeTilde()],
      hastPlugins: [cmpTables()],
    }),
  },
  integrations: [mdx(), hostingFiles()],
  vite: {
    build: {
      rolldownOptions: {
        // Astro 7 MDX 가 붙이는 내부 지시문("use astro:head-inject")에 대한 번들러 경고만 숨긴다.
        // 이 사이트는 MDX 안 컴포넌트에 스타일·스크립트가 없어 동작에 영향이 없다.
        onwarn(warning, handler) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && String(warning.message).includes('astro:head-inject')) return;
          handler(warning);
        },
      },
    },
  },
});
