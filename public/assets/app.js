/* 구독다이어트 — 코드 복사·토스트, 구독료 계산기, OTT 찾기 (외부 라이브러리 없음) */
(function () {
  'use strict';

  function won(n) { return Math.round(n).toLocaleString('ko-KR') + '원'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function brand() {
    var m = document.querySelector('meta[property="og:site_name"]');
    return m ? m.getAttribute('content') : '';
  }
  function canonicalUrl() {
    var link = document.querySelector('link[rel="canonical"]');
    return link ? link.href : location.href.split('#')[0].split('?')[0];
  }

  // ---------------------------------------------------------------- 토스트 (2.2초)
  var showTimer = null;
  var hideTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    el.textContent = msg;
    el.hidden = false;
    void el.offsetWidth; // 트랜지션 재시작
    el.classList.add('show');
    showTimer = setTimeout(function () {
      el.classList.remove('show');
      hideTimer = setTimeout(function () { el.hidden = true; }, 250);
    }, 2200);
  }

  // ---------------------------------------------------------------- 복사
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-copy]') : null;
    if (!btn) return;
    var code = btn.getAttribute('data-copy') || '';
    if (!code) return;
    copyText(code).then(function (ok) {
      toast(ok ? '코드를 복사했어요: ' + code + ' · 결제 화면 코드 입력란에 붙여 넣으세요.'
               : '복사하지 못했어요. 코드를 길게 눌러 직접 복사해 주세요.');
    });
  });

  // ---------------------------------------------------------------- 구독료 계산기
  function initCalc() {
    var root = document.getElementById('calc');
    var data = window.__CALC;
    if (!root || !data || !data.length) return;
    var KEY = 'gudok-calc-v1';
    var byId = {};
    data.forEach(function (d) { byId[d.id] = d; });
    var boxes = root.querySelectorAll('input[type="checkbox"][data-sid]');
    var boxById = {};
    var selects = {};
    each(boxes, function (b) { boxById[b.getAttribute('data-sid')] = b; });
    each(root.querySelectorAll('select[data-sid]'), function (s) { selects[s.getAttribute('data-sid')] = s; });
    var elMonth = document.getElementById('calc-month');
    var elYear = document.getElementById('calc-year');
    var elCount = document.getElementById('calc-count');
    var elLines = document.getElementById('calc-lines');
    var elTips = document.getElementById('calc-tips');
    var elTipsTitle = document.getElementById('calc-tips-title');

    function picked() {
      var out = [];
      each(boxes, function (b) {
        if (!b.checked) return;
        var id = b.getAttribute('data-sid');
        var idx = selects[id] ? parseInt(selects[id].value, 10) || 0 : 0;
        if (byId[id] && byId[id].plans[idx]) out.push({ id: id, idx: idx });
      });
      return out;
    }
    function encode(list) { return list.map(function (p) { return p.id + '.' + p.idx; }).join(','); }
    function apply(str) {
      var any = false;
      String(str || '').split(',').forEach(function (part) {
        var bits = part.split('.');
        var id = bits[0];
        var idx = parseInt(bits[1], 10);
        if (!byId[id] || !boxById[id]) return; // 모르는 값은 무시 (조작된 주소 방어)
        if (!(idx >= 0 && idx < byId[id].plans.length)) idx = 0;
        boxById[id].checked = true;
        if (selects[id]) selects[id].value = String(idx);
        any = true;
      });
      return any;
    }
    function save(str) { try { localStorage.setItem(KEY, str); } catch (e) { /* 저장 불가 환경: 무시 */ } }
    function load() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
    function forget() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } }

    function render() {
      var list = picked();
      var total = 0;
      var lines = [];
      var tips = [];
      list.forEach(function (p) {
        var d = byId[p.id];
        var plan = d.plans[p.idx];
        total += plan.v;
        lines.push('<li><span>' + esc(d.name) + ' · ' + esc(plan.n) + '</span><span>' + won(plan.v) + '</span></li>');
        tips.push('<li><a href="' + esc(d.href) + '">' + esc(d.name) + '</a>: ' + esc(d.tip) + '</li>');
      });
      if (elMonth) elMonth.textContent = won(total);
      if (elYear) elYear.textContent = won(total * 12);
      if (elCount) elCount.textContent = String(list.length);
      if (elLines) {
        elLines.innerHTML = lines.length ? lines.join('')
          : '<li><span>쓰고 있는 구독을 체크하면 여기에 항목별로 표시됩니다.</span><span></span></li>';
      }
      if (elTips) elTips.innerHTML = tips.join('');
      if (elTipsTitle) elTipsTitle.hidden = !tips.length;
      save(encode(list));
      return { total: total, count: list.length, code: encode(list) };
    }

    root.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t && t.tagName === 'SELECT') { // 요금제를 고르면 그 서비스도 자동 체크
        var id = t.getAttribute('data-sid');
        if (boxById[id]) boxById[id].checked = true;
      }
      render();
    });

    function copyResult(text) {
      copyText(text).then(function (ok) {
        toast(ok ? '결과와 링크를 복사했어요.' : '복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.');
      });
    }
    var shareBtn = document.getElementById('calc-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var r = render();
        if (!r.count) { toast('먼저 쓰고 있는 구독을 하나 이상 체크해 주세요.'); return; }
        var url = canonicalUrl() + '?s=' + r.code;
        var summary = '내 구독료: 한 달 ' + won(r.total) + ' · 1년 ' + won(r.total * 12) + ' (구독 ' + r.count + '개)';
        var full = summary + '\n👉 ' + brand() + ' 구독료 계산기 바로가기: ' + url;
        if (navigator.share) {
          navigator.share({ title: document.title, text: summary, url: url }).catch(function (e) {
            if (!e || e.name !== 'AbortError') copyResult(full);
          });
        } else {
          copyResult(full);
        }
      });
    }
    var resetBtn = document.getElementById('calc-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        each(boxes, function (b) { b.checked = false; });
        Object.keys(selects).forEach(function (k) { selects[k].selectedIndex = 0; });
        forget();
        if (window.history && history.replaceState) history.replaceState(null, '', location.pathname);
        render();
        toast('선택을 모두 지웠어요.');
      });
    }

    var fromUrl = '';
    try { fromUrl = new URLSearchParams(location.search).get('s') || ''; } catch (e) { fromUrl = ''; }
    if (!apply(fromUrl)) apply(load());
    render();
  }

  // ---------------------------------------------------------------- OTT 찾기
  function initFinder() {
    var form = document.getElementById('finder');
    var data = window.__FINDER;
    var out = document.getElementById('finder-result');
    var go = document.getElementById('finder-go');
    if (!form || !data || !data.length || !out || !go) return;

    function values(name) {
      var list = [];
      each(form.querySelectorAll('input[name="' + name + '"]'), function (i) { if (i.checked) list.push(i.value); });
      return list;
    }

    go.addEventListener('click', function () {
      var content = values('content');
      if (!content.length) { toast('보고 싶은 콘텐츠를 하나 이상 골라 주세요.'); return; }
      var noAds = values('ads')[0] === 'no';
      var people = parseInt(values('people')[0] || '1', 10);
      var budget = parseInt(values('budget')[0] || '99999', 10);

      var ranked = data.map(function (s) {
        var tags = s.tags || [];
        var match = content.filter(function (c) { return tags.indexOf(c) !== -1; }).length;
        var price = noAds ? s.noads : s.low;
        var plan = noAds ? s.noadsName : s.lowName;
        var score = match * 10;
        var warns = [];
        var notes = [];
        if (price === null || price === undefined) {
          score -= 20;
          price = null;
          warns.push('광고 없는 요금제 정보가 없습니다.');
        } else if (price <= budget) {
          score += 5;
        } else {
          score -= 8;
          warns.push('고른 예산보다 비쌉니다.');
        }
        if (people > (s.streams || 1)) {
          score -= 6;
          warns.push(people >= 4 ? '3~4명이 동시에 보기 어렵습니다.' : people + '명이 동시에 보기 어렵습니다.');
        } else if (people > 1) {
          notes.push('동시 시청 대수는 요금제마다 달라 서비스 페이지에서 확인하세요.');
        }
        if (s.free && !noAds) notes.push('광고형 무료 이용도 있습니다.');
        return { s: s, match: match, price: price, plan: plan, score: score, warns: warns, notes: notes };
      }).sort(function (a, b) {
        var pa = a.price === null ? 1e9 : a.price;
        var pb = b.price === null ? 1e9 : b.price;
        return (b.score - a.score) || (pa - pb);
      });

      var picks = ranked.filter(function (r) { return r.match > 0; }).slice(0, 3);
      if (!picks.length) picks = ranked.slice(0, 2);
      out.innerHTML = '<div class="picks">' + picks.map(function (r, i) {
        var s = r.s;
        var why = (r.match ? '고른 콘텐츠 ' + r.match + '개와 맞아요. ' : '') + esc(s.why);
        var price = r.price === null ? '요금은 서비스 페이지에서 확인하세요.'
          : '가장 싼 선택: ' + esc(r.plan) + ' 월 ' + won(r.price);
        return '<article class="pick' + (i === 0 ? ' top' : '') + '">' +
          '<h3><span class="rank">' + (i + 1) + '위</span>' + esc(s.name) + '</h3>' +
          '<p>' + why + '</p><p><strong>' + price + '</strong></p>' +
          (r.warns.length ? '<p class="warn">' + r.warns.map(esc).join(' ') + '</p>' : '') +
          (r.notes.length ? '<p class="muted">' + r.notes.map(esc).join(' ') + '</p>' : '') +
          '<p><a class="btn" href="' + esc(s.href) + '">' + esc(s.name) + ' 요금제·할인 보기</a></p></article>';
      }).join('') + '</div>';
      var top = out.getBoundingClientRect().top;
      if (top > window.innerHeight - 120 && out.scrollIntoView) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var reset = document.getElementById('finder-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        form.reset();
        out.innerHTML = '';
        toast('선택을 초기화했어요.');
      });
    }
  }

  function init() { initCalc(); initFinder(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
