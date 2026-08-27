/* ============================================================================
 * news.js — 实时政策新闻导入
 *
 * 主数据源:Federal Register 官方 API。该 API 返回 `access-control-allow-origin: *`,
 * 因此纯静态页面(含 file:// 打开)可直接抓取,无需服务器、无需代理、无需密钥。
 * 备用数据源:任意 RSS/Atom 源,需要一个 CORS 代理才能读取。
 * ==========================================================================*/
(function (global) {
  'use strict';

  var FR_API = 'https://www.federalregister.gov/api/v1/documents.json';

  /* 检索式:覆盖留学生就业相关的核心法规主题。
     注意 Federal Register 的 term 检索把 "A OR B" 当作更严格的匹配而非并集
     (实测 "H-1B" 单独 26 条,加上 OR 子句反而降到 6 条),
     因此这里对每个词分别发一次请求,再在前端合并去重。 */
  var FR_TERMS = [
    'H-1B',
    'optional practical training',
    'student and exchange visitor',
    'specialty occupation',
    'nonimmigrant student'
  ];

  var DEFAULT_FEEDS = [
    { id: 'uscis',  name: 'USCIS Newsroom',  url: 'https://www.uscis.gov/news/rss.xml', enabled: false },
    { id: 'gnews',  name: 'Google News: H-1B / OPT',
      url: 'https://news.google.com/rss/search?q=%22H-1B%22+OR+%22OPT%22+international+students+visa&hl=en-US&gl=US&ceid=US:en',
      enabled: false }
  ];

  var CACHE_KEY = 'h1b-news-cache-v1';
  var CACHE_TTL = 30 * 60 * 1000;  // 30 分钟

  function iso(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return iso(d);
  }

  function jsonp(url) { return fetch(url, { mode: 'cors' }); }

  /* ---------- Federal Register ---------- */
  function buildFRUrl(term, opts) {
    var since = opts.since || daysAgo(opts.lookbackDays || 180);
    var q = [
      'per_page=' + (opts.perPage || 25),
      'order=newest',
      'conditions%5Bpublication_date%5D%5Bgte%5D=' + since,
      'conditions%5Bterm%5D=' + encodeURIComponent(term)
    ];
    ['title', 'abstract', 'publication_date', 'type', 'html_url',
     'agencies', 'docket_ids', 'regulation_id_numbers', 'comments_close_on',
     'action', 'document_number'].forEach(function (f) {
      q.push('fields%5B%5D=' + f);
    });
    return FR_API + '?' + q.join('&');
  }

  function mapFRDoc(x) {
    var agency = (x.agencies || []).map(function (a) { return a.name || a.raw_name; })
                                   .filter(Boolean).join(', ');
    return {
      source: 'Federal Register',
      sourceId: 'fr',
      title: x.title || '',
      body: [x.abstract || '', x.action || '', agency].filter(Boolean).join(' '),
      date: x.publication_date || '',
      url: x.html_url || '',
      kind: x.type || '',
      meta: {
        rin: (x.regulation_id_numbers || []).join(', '),
        docket: (x.docket_ids || []).join(', '),
        commentsClose: x.comments_close_on || '',
        agency: agency
      }
    };
  }

  /* 每个检索词一次请求,失败的词不拖垮整体 */
  function fetchFederalRegister(opts) {
    opts = opts || {};
    var jobs = FR_TERMS.map(function (term) {
      return jsonp(buildFRUrl(term, opts))
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (d) { return (d.results || []).map(mapFRDoc); })
        .catch(function () { return []; });
    });
    return Promise.all(jobs).then(function (lists) {
      var all = [];
      lists.forEach(function (l) { all = all.concat(l); });
      if (!all.length) throw new Error('无结果(检查网络或 CORS)');
      return all;
    });
  }

  /* ---------- RSS / Atom(需要 CORS 代理) ---------- */
  function proxied(url, proxy) {
    if (!proxy) return url;
    return proxy.indexOf('{url}') !== -1
      ? proxy.replace('{url}', encodeURIComponent(url))
      : proxy + encodeURIComponent(url);
  }

  function textOf(node, tag) {
    var el = node.getElementsByTagName(tag)[0];
    return el ? (el.textContent || '').trim() : '';
  }

  function stripTags(s) {
    return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ')
                          .replace(/\s+/g, ' ').trim();
  }

  function fetchFeed(feed, proxy) {
    return jsonp(proxied(feed.url, proxy)).then(function (r) {
      if (!r.ok) throw new Error(feed.name + ' HTTP ' + r.status);
      return r.text();
    }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error(feed.name + ': XML 解析失败');
      var nodes = doc.getElementsByTagName('item');
      if (!nodes.length) nodes = doc.getElementsByTagName('entry');
      var out = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var link = textOf(n, 'link');
        if (!link) {
          var la = n.getElementsByTagName('link')[0];
          if (la) link = la.getAttribute('href') || '';
        }
        var date = textOf(n, 'pubDate') || textOf(n, 'updated') || textOf(n, 'published');
        var d = date ? new Date(date) : null;
        out.push({
          source: feed.name,
          sourceId: feed.id,
          title: stripTags(textOf(n, 'title')),
          body: stripTags(textOf(n, 'description') || textOf(n, 'summary') || textOf(n, 'content')),
          date: d && !isNaN(+d) ? iso(d) : '',
          url: link,
          kind: 'News',
          meta: {}
        });
      }
      return out;
    });
  }

  /* ---------- 汇总:抓取 + 打分 ---------- */
  function dedupe(items) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      var k = (it.url || it.title).toLowerCase().slice(0, 160);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(it);
    });
    return out;
  }

  function gradeAll(items) {
    var L = global.H1BLexicon;
    items.forEach(function (it) {
      it.grade = L ? L.grade(it.title, it.body) : { score: 0, label: 'n/a', hits: [], relevance: 0 };
    });
    return items.filter(function (it) { return it.grade.relevance > 0; })
                .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || (Date.now() - c.at) > CACHE_TTL) return null;
      return c;
    } catch (e) { return null; }
  }

  function writeCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: items }));
    } catch (e) { /* 配额或隐私模式,忽略 */ }
  }

  /**
   * load(opts) -> Promise<{items, errors, cached, fetchedAt}>
   * opts: {lookbackDays, feeds, proxy, force}
   */
  function load(opts) {
    opts = opts || {};
    if (!opts.force) {
      var c = readCache();
      if (c) {
        return Promise.resolve({ items: gradeAll(c.items), errors: [],
                                 cached: true, fetchedAt: new Date(c.at) });
      }
    }
    var jobs = [fetchFederalRegister(opts).catch(function (e) {
      return { __error: 'Federal Register: ' + e.message };
    })];
    (opts.feeds || []).forEach(function (f) {
      if (!f.enabled) return;
      jobs.push(fetchFeed(f, opts.proxy).catch(function (e) {
        return { __error: e.message };
      }));
    });
    return Promise.all(jobs).then(function (res) {
      var items = [], errors = [];
      res.forEach(function (r) {
        if (r && r.__error) errors.push(r.__error);
        else if (Array.isArray(r)) items = items.concat(r);
      });
      items = dedupe(items);
      writeCache(items);
      return { items: gradeAll(items), errors: errors, cached: false, fetchedAt: new Date() };
    });
  }

  global.H1BNews = {
    load: load,
    fetchFederalRegister: fetchFederalRegister,
    fetchFeed: fetchFeed,
    DEFAULT_FEEDS: DEFAULT_FEEDS,
    clearCache: function () { try { localStorage.removeItem(CACHE_KEY); } catch (e) {} },
    _buildFRUrl: buildFRUrl
  };
})(window);
