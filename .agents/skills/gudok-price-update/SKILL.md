---
name: gudok-price-update
description: '구독다이어트 사이트(gudok.enjoy-onepage.com, gudok-hub 저장소)의 서비스 요금을 공식 요금에 맞게 고치고 가려진 금액(price_hidden)을 푼다. 할 일은 저장소 맨 위 PRICE_TODO.md에 서버가 적어 둔다. 홈서버 주간 점검이 텔레그램으로 금액을 가린 서비스를 알렸을 때, 또는 "구독다이어트 요금 반영해줘", "요금 반영해줘", "요금이 바뀌었어", "price_hidden 풀어줘"라고 할 때 사용한다 (gudok price update).'
---

# 구독다이어트 요금 반영

## 구조
- 요금은 모두 `data/services.json` 한 파일에 있다. 이 파일만 고치면 요금표·카드·비교표·계산기와 글(`src/content/**/*.mdx`의 `<Price t="..."/>`)이 함께 바뀐다. 글에는 금액을 직접 쓴 곳이 없다.
- 홈서버(somsoo@192.168.200.138)가 매주 월요일 10시에 공식 페이지를 읽고, 이 파일의 `verified_at`(확인일)과 `price_hidden`(금액 가림)만 고쳐 main에 push한다. 금액이 안 보이면 가리고, 다시 보이면 스스로 푼다. 새 금액을 적는 일은 이 절차로 한다.
- 서버는 금액을 가릴 때 저장소 맨 위 `PRICE_TODO.md`에 서비스별 할 일을 적는다. 서버가 읽은 공식 페이지 주소, 그 페이지에 보이지 않은 사이트 금액, 그날 새로 보인 금액(힌트)이 들어 있다. 텔레그램 메시지를 전달받지 않아도 이 파일만 보면 된다. 사이트에는 나가지 않는 파일이다.
- 원칙: 공식 페이지에서 매주 확인할 수 있는 금액만 적는다. 카드·통신사·멤버십·프로모션이 정하는 금액, 앱 결제 금액, 공유 플랫폼 할인율은 적지 않는다(`scripts/check.mjs`가 빌드를 멈춘다).

## 절차
1. 최신 받기: 저장소 폴더에서 `git pull origin main`. 서버가 올린 커밋(price_hidden 등)을 먼저 받아야 한다.
2. 대상 찾기: 저장소 맨 위 `PRICE_TODO.md`를 연다. "지금 가려 둔 서비스가 없습니다"면 할 일이 없으니 그대로 끝내고 그렇게 보고한다. 항목(`## 서비스 이름 (`id`): 상태`)마다 아래처럼 한다. 기준은 services.json의 `"price_hidden"` 줄이다. 항목이 있어도 그 서비스에 `price_hidden` 줄이 없으면 이미 끝난 일이니 항목만 지운다.
   - "요금이 바뀐 것 같음" → 3~6번을 한다. "공식 페이지에 보이지 않은 사이트 금액"이 고칠 금액이고, "새로 보인 금액"은 힌트다.
   - "공식 페이지를 읽지 못함" → 페이지 접속 문제다. 공식 페이지를 직접 열어 "확인할 사이트 금액"이 모두 그대로면 4번의 마지막 항목(가림 해제)과 5~6번만 한다. 다르면 3~6번.
   - "가린 까닭 기록 없음" → "확인할 사이트 금액"을 공식 페이지와 하나씩 대조하고, 다른 것만 3~6번으로 고친다.
3. 공식 요금 확인: `PRICE_TODO.md` 항목의 "공식 페이지"를 브라우저로 열어 요금제별 금액을 확인한다. 눌러야 요금이 보이는 페이지는 누를 버튼도 적혀 있다. "함께 보는 페이지"가 있으면 그 페이지도 본다(디즈니+·웨이브의 결합 상품 금액은 티빙 페이지에도 있다). 주소는 아래 표와 같다.

   | id | 서버가 읽는 공식 페이지 |
   |---|---|
   | netflix | https://help.netflix.com/ko/node/24926 |
   | youtube-premium | https://www.youtube.com/premium |
   | youtube-music | https://music.youtube.com/musicpremium |
   | tving | https://www.tving.com/membership/tving |
   | disney-plus | https://www.disneyplus.com/ko-kr (첫 화면은 번들 탭이고, 단독 요금은 요금표와 FAQ에 있다) |
   | wavve | https://www.wavve.com/voucher |
   | spotify | https://www.spotify.com/kr-ko/premium/ |
   | chatgpt | https://chatgpt.com/ko-KR/pricing/ |
   | claude | https://claude.com/pricing |
   | gemini | https://one.google.com/intl/ko/about/google-ai-plans/ |
   | perplexity | https://www.perplexity.ai/hub/pricing |
   | midjourney | https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans |

   쿠팡플레이(`coupang-play`)는 `price_check: "none"`이라 점검하지 않고 금액도 적지 않는다.
4. `data/services.json` 고치기
   - `plans[].price`: 원화 월 요금(쉼표 없는 숫자). 달러 요금제는 `usd`에 부가세 전 금액을 적는다. 공식 페이지가 부가세 10% 포함가만 보여 주면 1.1로 나눈 값이다(서버는 두 값 모두 인정한다). `0`은 무료, `null`은 금액을 적지 않는 요금제다.
   - 요금제가 새로 생기거나 없어지면 `plans`에 넣거나 뺀다. 요금제 이름을 바꾸면 그 이름을 쓰는 토큰(`p:서비스id:요금제이름` 등)도 고친다. 빠뜨리면 빌드가 오류 메시지로 알려 준다.
   - 문장 속 금액: 옛 금액(예: `13,500`)을 파일 전체에서 검색해 모두 고친다. summary, quick, discounts의 cost·desc, plans의 feat, plans_note, faq, 다른 서비스 블록, `bundles`까지 본다. 차액·합계·"월 ~원꼴"·"약 ~%"처럼 계산한 숫자도 다시 계산한다. faq 문장에는 `{{p:서비스id:요금제이름}}`, `{{d:서비스id:요금제A:요금제B}}`(B−A) 토큰을 쓰면 금액이 자동으로 따라간다(토큰은 faq에서만 동작한다).
   - `watch`(원)·`watch_usd`(달러): 요금제 금액이 아니면서 문장에 적은 금액(연간 이용권, 결합 상품, 추가 회원 등) 가운데 공식 페이지에 그대로 보이는 것을 넣는다. 새로 적은 금액은 추가하고 없어진 금액은 뺀다. 페이지에 없는 계산값은 넣지 않는다(넣으면 매주 안 보인다며 가려진다).
   - `bundles[].price`: 결합 상품 금액이 바뀌면 고친다.
   - 끝으로 그 서비스의 `"price_hidden": "…",` 줄을 지우고 `"verified_at"`을 오늘 날짜(한국 시간, YYYY-MM-DD)로 바꾼다.
   - `PRICE_TODO.md`에서 그 서비스 항목(`##` 줄부터 다음 `##` 줄 앞까지)을 지운다. 남은 항목이 없으면 머리말 아래에 `지금 가려 둔 서비스가 없습니다.` 한 줄만 둔다. 모양이 조금 달라도 다음 점검 때 서버가 다시 맞춘다.
5. 빌드 점검: 저장소 폴더에서 `npm run build`(PowerShell에서 막히면 `npm.cmd run build`). 출력 끝에 `ERROR`나 `BROKEN LINK` 줄이 없어야 하고, `WARN 금액 가림 중`이 사라져야 한다. 오류가 나면 고친 뒤 다시 빌드한다.
6. 올리기: 바꾼 파일만 add 한다(보통 `data/services.json`과 `PRICE_TODO.md`). `git commit -m "Update <서비스> prices"` → `git push origin main`. 1~2분 뒤 GitHub Actions가 배포한다. 다음 월요일 점검에서 공식 페이지와 맞으면 그대로 유지된다.

## 하지 말 것
- force push나 `git reset --hard`로 서버가 올린 커밋을 지우지 않는다. push가 거절되면 `git pull --rebase origin main` 후 다시 push한다(월요일 10시 무렵에는 서버도 push한다).
- `data/affiliates.json`(겜스고 링크·코드), `site.json`의 `usd_krw`(원화 환산 기준 환율), 쿠팡플레이 금액은 이 절차에서 건드리지 않는다.
- 홈서버 파일(`/home/somsoo/gudok-watch/`)은 고치지 않는다. 공식 페이지 주소가 바뀐 경우, 위 표에서 tving·wavve·youtube-music·chatgpt·perplexity·midjourney가 아니면 그 서비스의 `source_url`만 새 주소로 바꾸면 된다. 이 6개는 서버 설정을 바꿔야 하므로 Kiro에게 넘긴다(서버가 계속 못 읽는 문제도 마찬가지다).

## 끝나면 보고
바꾼 금액(옛 금액 → 새 금액), 확인한 공식 페이지, 빌드 결과, push한 커밋.
