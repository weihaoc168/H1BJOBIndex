/* ============================================================================
 * news-ui.js — 新闻面板的渲染与交互,并把情感汇总接回指数模型
 * 依赖:lexicon.js、news.js、app-core.js(window.H1BIndex)
 * ==========================================================================*/
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var state = { items: [], agg: null, applied: false };

  function $(id) { return document.getElementById(id); }
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }

  var msgTimer;
  function say(t, bad) {
    var m = $('newsMsg');
    if (!m) return;
    m.textContent = t;
    m.className = 'rfmsg' + (bad ? ' err' : '');
    clearTimeout(msgTimer);
    if (t) msgTimer = setTimeout(function () { m.textContent = ''; }, 6000);
  }

  /* ---------- 按月汇总的情感柱状图 ---------- */
  function drawNewsChart(items) {
    var host = $('chNews');
    if (!host) return;
    host.innerHTML = '';
    if (!items.length) return;
    host.style.position = 'relative';

    var buckets = {};
    items.forEach(function (it) {
      var m = (it.date || '').slice(0, 7);
      if (!m) return;
      if (!buckets[m]) buckets[m] = { sum: 0, n: 0, pos: 0, neg: 0 };
      var b = buckets[m];
      b.sum += it.grade.score; b.n++;
      if (it.grade.score >= 20) b.pos++;
      if (it.grade.score <= -20) b.neg++;
    });
    var months = Object.keys(buckets).sort();
    if (!months.length) return;

    var W = Math.max(320, host.clientWidth || 640), H = 190;
    var mT = 14, mB = 34, mL = 42, mR = 14;
    var pw = W - mL - mR, ph = H - mT - mB;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img' }, host);

    // 自适应纵轴:固定 ±100 会把真实差异压成一条线
    var peak = 0;
    months.forEach(function (m) { peak = Math.max(peak, Math.abs(buckets[m].sum / buckets[m].n)); });
    var lim = Math.min(100, Math.max(40, Math.ceil(peak * 1.35 / 10) * 10));
    var Y = function (v) { return mT + (1 - (v + lim) / (2 * lim)) * ph; };

    [-lim, -lim / 2, 0, lim / 2, lim].forEach(function (t) {
      sv('line', { x1: mL, x2: mL + pw, y1: Y(t), y2: Y(t), 'class': t === 0 ? 'axisln' : 'grid-h' }, svg);
      var lb = sv('text', { x: mL - 7, y: Y(t) + 4, 'text-anchor': 'end', 'class': 'tick' }, svg);
      lb.textContent = (t > 0 ? '+' : '') + Math.round(t);
    });

    var slot = pw / months.length, bw = Math.min(24, slot - 6);
    var tip = document.createElement('div');
    tip.className = 'tip';
    host.appendChild(tip);

    months.forEach(function (m, i) {
      var b = buckets[m];
      var avg = b.sum / b.n;
      var cx = mL + slot * i + slot / 2, x0 = cx - bw / 2;
      var y0 = Y(Math.max(0, avg)), y1 = Y(Math.min(0, avg));
      var h = Math.max(1, Math.abs(y1 - y0));
      var rect = sv('rect', {
        x: x0, y: Math.min(y0, y1), width: bw, height: h, rx: 3,
        'class': avg >= 0 ? 'bar-pos' : 'bar-neg'
      }, svg);
      var hit = sv('rect', { x: mL + slot * i, y: mT, width: slot, height: ph, fill: 'transparent' }, svg);
      hit.style.pointerEvents = 'all';
      hit.setAttribute('tabindex', '0');
      function show() {
        rect.style.opacity = .8;
        tip.innerHTML = '';
        var t1 = document.createElement('div'); t1.className = 'yr';
        t1.textContent = m + ' · 平均 ' + Math.round(avg);
        var t2 = document.createElement('div'); t2.className = 'evline';
        t2.textContent = b.n + ' 条 · 利好 ' + b.pos + ' · 利空 ' + b.neg;
        tip.appendChild(t1); tip.appendChild(t2);
        tip.style.display = 'block';
        var tw = tip.offsetWidth;
        tip.style.left = Math.max(4, Math.min(cx - tw / 2, W - tw - 4)) + 'px';
        tip.style.top = Math.max(4, Math.min(y0, y1) - tip.offsetHeight - 8) + 'px';
      }
      function hide() { rect.style.opacity = 1; tip.style.display = 'none'; }
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', show);
      hit.addEventListener('blur', hide);

      if (months.length <= 14 || i % 2 === 0) {
        var lb = sv('text', { x: cx, y: H - mB + 20, 'text-anchor': 'middle', 'class': 'tick' }, svg);
        lb.textContent = m.slice(2);
      }
    });
  }

  /* ---------- 条目列表 ---------- */
  function renderList(items) {
    var host = $('newsList');
    if (!host) return;
    host.innerHTML = '';
    items.slice(0, 40).forEach(function (it) {
      var g = it.grade;
      var li = document.createElement('li');
      li.className = 'nwitem';

      var sc = document.createElement('span');
      sc.className = 'nwscore ' + (g.score >= 20 ? 'pos' : g.score <= -20 ? 'neg' : 'neu');
      sc.textContent = (g.score > 0 ? '+' : '') + g.score;

      var main = document.createElement('div');
      main.className = 'nwmain';

      var a = document.createElement('a');
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'nwtitle'; a.textContent = it.title;

      var meta = document.createElement('div');
      meta.className = 'nwmeta';
      var bits = [it.date, it.kind, it.source];
      if (it.meta && it.meta.rin) bits.push('RIN ' + it.meta.rin);
      if (it.meta && it.meta.commentsClose) bits.push('评论截止 ' + it.meta.commentsClose);
      meta.textContent = bits.filter(Boolean).join(' · ');

      var terms = document.createElement('div');
      terms.className = 'nwterms';
      g.hits.slice(0, 8).forEach(function (h) {
        var t = document.createElement('span');
        t.className = 'nwterm ' + (h.polarity === 'positive' ? 'pos' : 'neg');
        t.textContent = (h.polarity === 'positive' ? '+' : '−') + h.term;
        if (h.negated) t.title = '检测到否定,极性已翻转';
        terms.appendChild(t);
      });

      main.appendChild(a); main.appendChild(meta);
      if (g.hits.length) main.appendChild(terms);
      li.appendChild(sc); li.appendChild(main);
      host.appendChild(li);
    });
  }

  function renderSummary(items, agg, fetchedAt, cached) {
    var pos = items.filter(function (i) { return i.grade.score >= 20; }).length;
    var neg = items.filter(function (i) { return i.grade.score <= -20; }).length;
    $('newsSummary').hidden = false;
    $('nwCount').textContent = items.length;
    $('nwPos').textContent = pos;
    $('nwNeg').textContent = neg;
    $('nwWeighted').textContent = (agg.weighted > 0 ? '+' : '') + agg.weighted;
    $('nwDelta').textContent = (agg.delta > 0 ? '+' : '') + agg.delta + ' 分';
    var L = global.H1BLexicon.counts();
    $('nwFoot').textContent = '词典规模:利好词 ' + L.positive + ' · 利空词 ' + L.negative +
      ' · 主题词 ' + L.topics + ' | 抓取时间 ' + fetchedAt.toLocaleString('zh-CN') +
      (cached ? '(缓存,30 分钟内复用)' : '') +
      ' | 每条的命中词已列出,可自行判断打分是否合理。';
  }

  function load(force) {
    var days = parseInt(($('selDays') || {}).value || '180', 10);
    say('正在抓取 Federal Register…');
    $('btnNews').disabled = true;
    return global.H1BNews.load({ lookbackDays: days, perPage: 25, force: force })
      .then(function (r) {
        state.items = r.items;
        state.agg = global.H1BLexicon.aggregate(r.items);
        renderSummary(r.items, state.agg, r.fetchedAt, r.cached);
        drawNewsChart(r.items);
        renderList(r.items);
        $('btnApplyNews').disabled = !r.items.length;
        say(r.errors.length
          ? ('已载入 ' + r.items.length + ' 条,部分源失败:' + r.errors.join('; '))
          : ('已载入 ' + r.items.length + ' 条政策条目'), r.errors.length > 0);
      })
      .catch(function (e) {
        say('抓取失败:' + e.message + ' — 若从 file:// 打开,请改用本地 HTTP 服务。', true);
      })
      .then(function () { $('btnNews').disabled = false; });
  }

  function applyToModel() {
    var M = global.H1BIndex;
    if (!M || !state.agg) return;
    var before = M.policyScore();
    var after = M.clamp(before + state.agg.delta, -100, 100);
    M.policyScore(after);

    // 把最强的一条利空/利好作为事件节点加入外推(仅当足够强且尚未加入)
    var strongest = state.items.slice().sort(function (a, b) {
      return Math.abs(b.grade.score) - Math.abs(a.grade.score);
    })[0];
    if (strongest && Math.abs(strongest.grade.score) >= 55 && !strongest.__added) {
      var impact = strongest.grade.score / 100 * 4;   // ±4 指数点封顶
      M.addEvent({
        d: new Date(strongest.date + 'T00:00:00'),
        label: '[新闻] ' + strongest.title.slice(0, 46),
        base: Math.round(impact * 10) / 10,
        bull: Math.round(impact * 0.4 * 10) / 10,
        bear: Math.round(impact * 1.6 * 10) / 10,
        state: 'landed',
        note: '由实时新闻导入自动生成:情感评分 ' + strongest.grade.score +
              ',命中词 ' + strongest.grade.hits.slice(0, 5).map(function (h) { return h.term; }).join('、'),
        links: [['原文', strongest.url]]
      });
      strongest.__added = true;
    }
    M.refresh();
    state.applied = true;
    say('已应用:政策评分 ' + before + ' → ' + after + ',指数与外推已重算');
  }

  function init() {
    if (!$('btnNews')) return;
    $('btnNews').addEventListener('click', function () { load(true); });
    $('btnApplyNews').addEventListener('click', applyToModel);
    var t;
    global.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { drawNewsChart(state.items); }, 160);
    });
    load(false);   // 首屏自动载入(命中缓存则不发请求)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})(window);
