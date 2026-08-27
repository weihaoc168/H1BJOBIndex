/* ============================================================================
 * lexicon.js — 政策文本情感词典与打分器
 * Domain-specific sentiment lexicon for US immigration / international-student
 * policy text. Grades a headline + abstract on a -100..+100 scale from the
 * point of view of an international student who wants to work in the US.
 *
 * Weight scale: 1 = mild, 2 = moderate, 3 = decisive.
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* 利好词:扩大资格、恢复权利、司法阻却限制性措施 */
  var POSITIVE = {
    'vacate': 3, 'vacated': 3, 'vacatur': 3,
    'enjoin': 3, 'enjoined': 3, 'injunction': 2, 'restraining order': 2,
    'struck down': 3, 'strike down': 3, 'set aside': 2,
    'overturn': 3, 'overturned': 3, 'invalidate': 3, 'invalidated': 3,
    'unlawful': 2, 'blocked': 2, 'stay denied': 3, 'denied the stay': 3,
    'rescind': 2, 'rescinded': 2, 'withdraw': 2, 'withdrawn': 2, 'withdrawal': 2,
    'reinstate': 3, 'reinstated': 3, 'restore': 3, 'restored': 3,
    'resume': 2, 'resumed': 2, 'reverse': 2, 'reversed': 2, 'lifted': 2,
    'repeal': 3, 'repealed': 3,
    'expand': 3, 'expanded': 3, 'expansion': 3,
    'extend': 2, 'extended': 2, 'extension': 2,
    'eligible': 2, 'eligibility': 2, 'exempt': 2, 'exemption': 2, 'exemptions': 2,
    'waive': 2, 'waiver': 2, 'flexibility': 2, 'streamline': 2, 'streamlined': 2,
    'modernize': 2, 'modernizing': 2, 'facilitate': 2, 'simplify': 2, 'expedite': 2,
    'premium processing': 1, 'automatic extension': 3, 'cap-gap': 1, 'grace period': 1,
    'increase the number': 3, 'additional visas': 3, 'relief': 2,
    'approve': 1, 'approved': 1, 'grant': 1, 'granted': 2,
    'authorize': 1, 'authorized': 1, 'pathway': 2, 'work authorization': 1
  };

  /* 利空词:限制、收费、终止、执法收紧 */
  var NEGATIVE = {
    'restrict': 3, 'restricted': 3, 'restriction': 3, 'restrictions': 3,
    'revoke': 3, 'revoked': 3, 'revocation': 3,
    'terminate': 3, 'terminated': 3, 'termination': 3,
    'suspend': 3, 'suspended': 3, 'suspension': 3,
    'eliminate': 3, 'eliminated': 3, 'elimination': 3,
    'ban': 3, 'banned': 3, 'bar': 2, 'barred': 2,
    'prohibit': 3, 'prohibited': 3, 'curtail': 3, 'curtailed': 3,
    'deny': 2, 'denied': 2, 'denial': 2, 'reject': 2, 'rejected': 2,
    'cap': 1, 'limit': 2, 'limitation': 2, 'limiting': 2,
    'reduce': 2, 'reduction': 2, 'tighten': 3, 'tightened': 3,
    'narrow': 2, 'narrowed': 2, 'phase out': 3, 'wind down': 3,
    'remove': 2, 'removal': 2, 'sunset': 2,
    'fee': 2, 'fees': 2, 'surcharge': 3, 'cost recovery': 2,
    'fee increase': 3, 'additional fee': 3, 'biometrics': 1,
    'fixed period of admission': 3, 'duration of status': 2,
    'weighted selection': 2, 'wage level': 1, 'prevailing wage': 1,
    'enforcement': 2, 'vetting': 3, 'scrutiny': 2, 'screening': 2,
    'fraud': 2, 'abuse': 2, 'integrity': 1, 'compliance': 1,
    'site visit': 1, 'investigation': 2, 'crackdown': 3,
    'penalty': 2, 'penalties': 2,
    'deport': 3, 'deportation': 3, 'removal proceedings': 3,
    'unlawful presence': 3, 'overstay': 2, 'out of status': 3,
    'national security': 1, 'protect american workers': 3, 'displacement': 2,
    'stay granted': 3, 'upheld the fee': 3
  };

  /* 第三人称单数与其他常见变位(标题多用现在时:"Court vacates …") */
  var EXTRA_POSITIVE = {
    'vacates': 3, 'enjoins': 3, 'blocks': 2, 'strikes down': 3, 'overturns': 3,
    'invalidates': 3, 'rescinds': 2, 'withdraws': 2, 'reinstates': 3,
    'restores': 3, 'resumes': 2, 'reverses': 2, 'repeals': 3,
    'expands': 3, 'extends': 2, 'waives': 2, 'grants': 2, 'authorizes': 1,
    'denied the stay': 3, 'denies the stay': 3, 'denied a stay': 3,
    'denied the government': 3, 'denied the motion': 3, 'denying the stay': 3,
    'halts': 2, 'halted': 2, 'paused the rule': 2
  };
  var EXTRA_NEGATIVE = {
    'restricts': 3, 'revokes': 3, 'terminates': 3, 'suspends': 3,
    'eliminates': 3, 'prohibits': 3, 'curtails': 3, 'bars': 2,
    'tightens': 3, 'reduces': 2, 'removes': 2, 'imposes': 2, 'imposed': 2,
    'establishes a fee': 3, 'proposes to establish': 2
  };
  for (var _k in EXTRA_POSITIVE) { POSITIVE[_k] = EXTRA_POSITIVE[_k]; }
  for (var _k2 in EXTRA_NEGATIVE) { NEGATIVE[_k2] = EXTRA_NEGATIVE[_k2]; }

  /* --- 依据 Federal Register 实际行文校准(而非凭空构造的示例句) ---
     机构摘要用词与新闻标题差别很大,以下调整来自真实语料:
     1. 裸词 "extension/extend" 在 "extension of status petitions must pay the fee"
        这类句子里其实是负担而非利好,权重下调,改由具体短语承载利好;
     2. 终止 D/S 的最终规则实际写作 "fixed time period",而非 "fixed period of admission";
     3. "oversight""bond" 等在本领域是限制信号。 */
  POSITIVE['extension'] = 1;
  POSITIVE['extend'] = 1;
  POSITIVE['extended'] = 1;
  POSITIVE['stem opt extension'] = 3;
  POSITIVE['cap-gap extension'] = 3;
  POSITIVE['24-month extension'] = 3;
  POSITIVE['additional protections'] = 0;

  NEGATIVE['fixed time period'] = 3;
  NEGATIVE['from duration of status'] = 3;
  NEGATIVE['admission period'] = 1;
  NEGATIVE['oversight'] = 2;
  NEGATIVE['bond'] = 2;
  NEGATIVE['visa bond'] = 3;
  NEGATIVE['revocation of'] = 3;
  NEGATIVE['ineligible'] = 3;
  NEGATIVE['must submit'] = 1;

  /* 中性短语:遮蔽其跨度,避免内部词被误判
     例:"eligible for the advanced degree exemption" 只是在描述适用范围,
     不应因 eligible / exemption 记为利好 */
  var NEUTRAL_SPANS = [
    'advanced degree exemption', 'cap-subject petitions', 'cap-subject petition',
    'eligible for the advanced degree exemption', 'those eligible for',
    'employment authorization document', 'notice of proposed rulemaking',
    'department of homeland security', 'request for comments',
    'extension of stay', 'duration of status rule',
    'extension of status', 'extension requirements', 'extension of status petitions',
    'fraud prevention and detection fee', 'information collection'
  ];

  /* 否定前缀:命中词前若干词内出现则翻转极性 */
  var NEGATORS = ['not', 'no', 'never', 'without', 'declined to', 'refused to',
                  'failed to', 'denies', 'denied', 'rejects', 'rejected'];
  var NEG_WINDOW = 4;

  /* 主题词:用于相关性过滤与加权 */
  var TOPICS = {
    'h-1b': 3, 'h1b': 3, 'f-1': 3, 'optional practical training': 3,
    'stem opt': 3, 'sevis': 3, 'sevp': 3, 'student visa': 3,
    'international student': 3, 'specialty occupation': 3,
    'cap-subject': 3, 'advanced degree exemption': 3,
    'nonimmigrant': 2, 'opt': 2, 'i-765': 2, 'i-129': 2,
    'exchange visitor': 2, 'j-1': 2, 'employment authorization': 2,
    'uscis': 1, 'visa': 1, 'immigration': 1
  };

  function normalize(text) {
    return (' ' + String(text || '').toLowerCase() + ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ');
  }

  function occurrences(hay, needle) {
    var out = [], i = 0, n = needle.length, wordish = /[a-z0-9]/;
    for (;;) {
      var k = hay.indexOf(needle, i);
      if (k === -1) break;
      if (!wordish.test(hay.charAt(k - 1)) && !wordish.test(hay.charAt(k + n))) out.push(k);
      i = k + n;
    }
    return out;
  }

  function isNegated(hay, at) {
    // 必须按整词匹配:"nonimmigrant" 含有 "no",子串匹配会造成误翻转
    var words = hay.slice(Math.max(0, at - 60), at)
                   .replace(/[^a-z0-9' ]/g, ' ').trim().split(/\s+/);
    var tail = words.slice(-NEG_WINDOW);
    for (var i = 0; i < NEGATORS.length; i++) {
      var neg = NEGATORS[i];
      if (neg.indexOf(' ') === -1) {
        if (tail.indexOf(neg) !== -1) return true;      // 单词:整词比较
      } else if (tail.join(' ').indexOf(neg) !== -1) {
        return true;                                     // 短语:允许子串
      }
    }
    return false;
  }

  /* 遮蔽表:true = 该字符已被更长的短语占用,短词不得重复计分 */
  function maskSpans(hay, phrases, mask) {
    phrases.forEach(function (p) {
      occurrences(hay, p).forEach(function (at) {
        for (var i = at; i < at + p.length; i++) mask[i] = true;
      });
    });
  }

  /* 司法救济词:出现时说明金额是被推翻的对象,不应按原样记为利空 */
  var RELIEF = ['vacate', 'vacated', 'vacates', 'vacatur', 'enjoin', 'enjoined',
                'enjoins', 'struck down', 'strikes down', 'invalidated',
                'unlawful', 'blocked', 'blocks', 'set aside', 'repealed'];

  /* 金额规则:大额收费是决定性利空,按量级加权 */
  function moneyPenalty(hay, hits) {
    var re = /\$\s?([\d][\d,]{2,})/g, m, worst = 0;
    while ((m = re.exec(hay)) !== null) {
      var v = parseInt(m[1].replace(/,/g, ''), 10);
      if (isNaN(v)) continue;
      var w = v >= 100000 ? 6 : v >= 10000 ? 4 : v >= 1000 ? 2 : 0;
      if (w > worst) worst = w;
    }
    if (!worst) return 0;
    var relieved = RELIEF.some(function (r) { return occurrences(hay, r).length > 0; });
    if (relieved) worst = worst / 4;   // 该收费正被司法推翻,惩罚大幅衰减
    hits.push({ term: 'large dollar amount' + (relieved ? ' (被司法阻却)' : ''),
                weight: Math.round(worst * 10) / 10, count: 1,
                polarity: 'negative', negated: false });
    return -worst;
  }

  /* 统一扫描:所有词条按长度降序匹配,长短语优先并遮蔽其跨度 */
  function scanAll(hay, hits) {
    var mask = new Array(hay.length);
    maskSpans(hay, NEUTRAL_SPANS, mask);

    var terms = [];
    for (var p in POSITIVE) {
      if (Object.prototype.hasOwnProperty.call(POSITIVE, p)) terms.push({ t: p, w: POSITIVE[p], s: 1 });
    }
    for (var n in NEGATIVE) {
      if (Object.prototype.hasOwnProperty.call(NEGATIVE, n)) terms.push({ t: n, w: NEGATIVE[n], s: -1 });
    }
    terms.sort(function (a, b) { return b.t.length - a.t.length; });

    var pos = 0, neg = 0;
    terms.forEach(function (e) {
      var at = occurrences(hay, e.t), taken = [];
      for (var i = 0; i < at.length; i++) {
        var blocked = false;
        for (var c = at[i]; c < at[i] + e.t.length; c++) {
          if (mask[c]) { blocked = true; break; }
        }
        if (blocked) continue;
        for (var c2 = at[i]; c2 < at[i] + e.t.length; c2++) mask[c2] = true;
        taken.push(at[i]);
      }
      if (!taken.length) return;
      var mult = 0, step = 1;
      for (var j = 0; j < taken.length && j < 4; j++) { mult += step; step /= 2; }
      var flip = isNegated(hay, taken[0]);
      var eff = flip ? -e.s : e.s;
      var val = e.w * mult * eff;
      if (val >= 0) pos += val; else neg += val;
      hits.push({ term: e.t, weight: e.w, count: taken.length,
                  polarity: eff > 0 ? 'positive' : 'negative', negated: flip });
    });

    neg += moneyPenalty(hay, hits);
    return { pos: pos, neg: neg };
  }

  function relevance(hay) {
    var r = 0, topics = [];
    for (var t in TOPICS) {
      if (!Object.prototype.hasOwnProperty.call(TOPICS, t)) continue;
      if (occurrences(hay, t).length) { r += TOPICS[t]; topics.push(t); }
    }
    return { score: r, topics: topics };
  }

  /**
   * grade(title, body) -> {score,label,hits,positive,negative,relevance,topics}
   * score: -100 (最不利) .. +100 (最有利);0 = 中性或与留学生无关
   */
  function grade(title, body) {
    var hay = normalize((title || '') + '. ' + (title || '') + '. ' + (body || ''));
    var hits = [];
    var s = scanAll(hay, hits);
    var pos = s.pos, neg = s.neg;
    var raw = pos + neg;
    var rel = relevance(hay);
    var squashed = 100 * (2 / (1 + Math.exp(-raw / 6)) - 1);
    var relFactor = Math.min(1, rel.score / 4);
    var score = Math.round(squashed * relFactor);
    var label = score <= -55 ? '强利空' : score <= -20 ? '利空'
              : score >= 55 ? '强利好' : score >= 20 ? '利好' : '中性';
    hits.sort(function (a, b) { return b.weight - a.weight; });
    return {
      score: score, label: label, raw: Math.round(raw * 10) / 10,
      positive: Math.round(pos * 10) / 10, negative: Math.round(neg * 10) / 10,
      relevance: rel.score, topics: rel.topics, hits: hits.slice(0, 12)
    };
  }

  /** 汇总已打分条目 -> 建议的政策评分调整量(指数点) */
  function aggregate(items) {
    if (!items || !items.length) return { delta: 0, weighted: 0, n: 0 };
    var sum = 0, wsum = 0;
    items.forEach(function (it) {
      var w = Math.min(1, (it.grade.relevance || 0) / 4);
      sum += it.grade.score * w;
      wsum += w;
    });
    var weighted = wsum ? sum / wsum : 0;
    return { delta: Math.round(weighted / 5), weighted: Math.round(weighted), n: items.length };
  }

  global.H1BLexicon = {
    grade: grade,
    aggregate: aggregate,
    POSITIVE: POSITIVE,
    NEGATIVE: NEGATIVE,
    TOPICS: TOPICS,
    counts: function () {
      return {
        positive: Object.keys(POSITIVE).length,
        negative: Object.keys(NEGATIVE).length,
        topics: Object.keys(TOPICS).length
      };
    }
  };
})(window);
