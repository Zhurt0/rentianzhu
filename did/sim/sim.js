/*
 * Difference-in-differences simulator.
 *
 * A noise-free staggered-adoption panel: y = cohort level + year effect + effect,
 * with parallel trends true by construction. Everything shown is computed
 * exactly from that panel:
 *   - true ATT (average effect over treated cohort-years, equal cohort sizes)
 *   - static TWFE, and the weight it puts on every treated cohort-year
 *     (de Chaisemartin & D'Haultfoeuille 2020: TWFE = sum of w * effect)
 *   - Callaway & Sant'Anna ATT(g,t) with not-yet-treated controls, aggregated
 *   - a pooled TWFE event study (all relative-time dummies except -1)
 */
(function () {
  'use strict';
  var T = 12;

  var STR = {
    en: {
      title: 'Your design', cohorts: 'Treated cohorts', cohort: 'Cohort', adopts: 'adopts in year', off: 'off',
      never: 'Include a never-treated group', effects: 'Treatment effects', base: 'Effect in the first year',
      growth: 'Extra effect per year since adoption', het: 'Early cohorts gain more', presets: 'Try a preset',
      p1: 'Constant effect', p2: 'Growing effects', p3: 'No never-treated group', p4: 'Cohorts differ',
      truth: 'True ATT', twfe: 'Static TWFE', cs: 'Callaway & Sant’Anna', bias: 'bias',
      exact: 'matches the truth', csNote: 'over the cohort-years that have a not-yet-treated control',
      weights: 'Weight TWFE puts on each treated cohort-year', weightsNote: 'Red cells get negative weight: their effects are subtracted. Numbers in cells are the true effects.',
      year: 'Year', es: 'Event study', esTruth: 'true effect', esTwfe: 'pooled TWFE', esCs: 'Callaway & Sant’Anna',
      rel: 'Years relative to adoption', paths: 'Outcomes by cohort', neverLab: 'never treated', negCount: function (n, m) { return n + ' of ' + m + ' treated cohort-years get negative weight'; },
      noTreated: 'Turn on at least one cohort.', esNote: function (n) { return n + ' event-time coefficients are not identified in a fully dynamic TWFE regression with this design (no never-treated group; evenly spaced cohorts make it worse) and are left out.'; }, na: 'not identified', noCtrl: 'Without a never-treated group, effects after the last cohort adopts have no clean control and are left out.'
    },
    zh: {
      title: '你的研究设计', cohorts: '处理批次', cohort: '批次', adopts: '处理年份', off: '关闭',
      never: '包含从未处理组', effects: '处理效应', base: '处理第一年的效应',
      growth: '此后每年增加的效应', het: '早处理批次效应更大', presets: '试试预设情形',
      p1: '效应不变', p2: '效应逐年增长', p3: '没有从未处理组', p4: '批次间效应不同',
      truth: '真实 ATT', twfe: '静态 TWFE', cs: 'Callaway & Sant’Anna', bias: '偏误',
      exact: '与真实值一致', csNote: '只计算有尚未处理对照的批次-年份',
      weights: 'TWFE 对每个已处理批次-年份赋予的权重', weightsNote: '红色格子的权重为负：它们的效应被减掉了。格子中的数字是真实效应。',
      year: '年份', es: '事件研究', esTruth: '真实效应', esTwfe: '混合 TWFE', esCs: 'Callaway & Sant’Anna',
      rel: '相对于处理的年份', paths: '各批次的结果变量', neverLab: '从未处理', negCount: function (n, m) { return m + ' 个已处理批次-年份中有 ' + n + ' 个权重为负'; },
      noTreated: '请至少开启一个批次。', esNote: function (n) { return '在这一设计下，完全动态的 TWFE 回归中有 ' + n + ' 个事件时间系数无法识别（没有从未处理组；批次间隔相等时更严重），因此未画出。'; }, na: '无法识别', noCtrl: '没有从未处理组时，最后一个批次处理之后的效应没有干净的对照，因此不计入。'
    }
  };

  var PRESETS = {
    p1: { g: [4, 7, 10], on: [1, 1, 0], never: 1, base: 1, growth: 0, het: 0 },
    p2: { g: [4, 7, 10], on: [1, 1, 0], never: 1, base: 0.5, growth: 0.5, het: 0 },
    p3: { g: [4, 6, 9], on: [1, 1, 1], never: 0, base: 0.5, growth: 0.5, het: 0 },
    p4: { g: [3, 8, 10], on: [1, 1, 0], never: 1, base: 1, growth: 0.3, het: 1 }
  };
  var LEVEL = [3.2, 2.4, 1.6], NEVER_LEVEL = 0.8;
  function lam(t) { return 0.2 * t + 0.3 * Math.sin(t); }

  // ---------- model ----------
  function model(st) {
    var groups = [];
    for (var k = 0; k < 3; k++) if (st.on[k]) groups.push({ g: st.g[k], a: LEVEL[k], k: k });
    groups.sort(function (x, y) { return x.g - y.g; });
    var K = groups.length;
    groups.forEach(function (G, i) { G.mult = K > 1 ? 1 + 2 * st.het * (K - 1 - i) / (K - 1) : 1; });
    if (st.never) groups.push({ g: 0, a: NEVER_LEVEL, k: 3, mult: 0 });
    function tau(G, t) { return G.g && t >= G.g ? G.mult * (st.base + st.growth * (t - G.g)) : 0; }
    function y0(G, t) { return G.a + lam(t); }
    function y(G, t) { return y0(G, t) + tau(G, t); }
    var rows = [];
    groups.forEach(function (G, gi) { for (var t = 1; t <= T; t++) rows.push({ gi: gi, G: G, t: t, d: tau(G, t) !== 0 || (G.g && t >= G.g) ? 1 : 0, y: y(G, t), tau: tau(G, t) }); });
    return { groups: groups, rows: rows, tau: tau, y: y, y0: y0, K: K };
  }

  function demean(M, v) {
    var x = v.slice(), ng = M.groups.length;
    for (var it = 0; it < 200; it++) {
      var gm = new Array(ng).fill(0), tm = new Array(T + 1).fill(0);
      M.rows.forEach(function (r, i) { gm[r.gi] += x[i] / T; });
      x = x.map(function (val, i) { return val - gm[M.rows[i].gi]; });
      M.rows.forEach(function (r, i) { tm[r.t] += x[i] / ng; });
      x = x.map(function (val, i) { return val - tm[M.rows[i].t]; });
    }
    return x;
  }

  function solve(A, b) {
    var n = A.length, i, j, r, c;
    var M = A.map(function (row, k) { return row.concat([b[k]]); });
    for (c = 0; c < n; c++) {
      var p = c;
      for (r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-9) return null;
      var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c] / M[c][c]; for (j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(function (row, k) { return row[n] / row[k]; });
  }

  function analyse(st) {
    var M = model(st), out = { M: M };
    var treated = M.rows.filter(function (r) { return r.d; });
    if (!treated.length) return out;
    out.truth = treated.reduce(function (s, r) { return s + r.tau; }, 0) / treated.length;
    // static TWFE and its weights
    var dd = demean(M, M.rows.map(function (r) { return r.d; }));
    var yy = demean(M, M.rows.map(function (r) { return r.y; }));
    var num = 0, den = 0, sumT = 0;
    M.rows.forEach(function (r, i) { num += dd[i] * yy[i]; den += dd[i] * dd[i]; if (r.d) sumT += dd[i]; });
    out.twfe = den > 1e-9 ? num / den : NaN;
    out.w = {};
    M.rows.forEach(function (r, i) { if (r.d) out.w[r.gi + ':' + r.t] = dd[i] / sumT; });
    // Callaway & Sant'Anna with not-yet-treated (incl. never) controls
    out.att = {};
    var s = 0, n = 0, sTrue = 0;
    M.groups.forEach(function (G, gi) {
      if (!G.g) return;
      for (var t = G.g; t <= T; t++) {
        var base = G.g - 1, ctrl = M.groups.filter(function (H) { return !H.g || H.g > t; });
        if (base < 1 || !ctrl.length) { out.att[gi + ':' + t] = null; continue; }
        var dC = ctrl.reduce(function (acc, H) { return acc + M.y(H, t) - M.y(H, base); }, 0) / ctrl.length;
        var v = (M.y(G, t) - M.y(G, base)) - dC;
        out.att[gi + ':' + t] = v; s += v; n++; sTrue += M.tau(G, t);
      }
    });
    out.cs = n ? s / n : NaN;
    out.csTruth = n ? sTrue / n : NaN;
    out.csCells = n; out.cells = treated.length;
    // pooled TWFE event study
    var es = [];
    M.groups.forEach(function (G) { if (G.g) for (var t = 1; t <= T; t++) { var e = t - G.g; if (es.indexOf(e) < 0) es.push(e); } });
    es.sort(function (a, b) { return a - b; });
    var E = es.filter(function (e) { return e !== -1; });
    if (!st.never && E.length) E = E.slice(1); // one more normalisation without a never-treated group
    // Fit by least squares twice with tiny, different ridge penalties: coefficients that are
    // identified come out the same, those that are not (e.g. long horizons without a
    // never-treated group, or periodic patterns when cohorts are evenly spaced) differ.
    function fitOnce(E, pen) {
      var ng = M.groups.length, k = ng + (T - 1) + E.length;
      var A = [], b = [], i, j;
      for (i = 0; i < k; i++) { A.push(new Array(k).fill(0)); b.push(0); }
      M.rows.forEach(function (r) {
        var x = new Array(k).fill(0);
        x[r.gi] = 1;
        if (r.t > 1) x[ng + r.t - 2] = 1;
        if (r.G.g) { var ix = E.indexOf(r.t - r.G.g); if (ix >= 0) x[ng + T - 1 + ix] = 1; }
        for (i = 0; i < k; i++) { if (!x[i]) continue; b[i] += r.y; for (j = 0; j < k; j++) A[i][j] += x[i] * x[j]; }
      });
      for (i = 0; i < k; i++) A[i][i] += 1e-7 * pen(i);
      var beta = solve(A, b);
      if (!beta) return null;
      var o = {}; E.forEach(function (e, ix) { o[e] = beta[ng + T - 1 + ix]; }); return o;
    }
    function fit(E) {
      var a = fitOnce(E, function () { return 1; });
      var b2 = fitOnce(E, function (i) { return 1 + (i * 7919 % 13) / 6; });
      if (!a || !b2) return null;
      var o = {}, dropped = 0;
      E.forEach(function (e) { if (Math.abs(a[e] - b2[e]) < 1e-3) o[e] = a[e]; else dropped++; });
      out.esDropped = dropped;
      return o;
    }
    out.esTwfe = fit(E);
    out.esTwfe && (out.esTwfe[-1] = 0);
    // truth and CS by event time (equal cohort weights over cohorts observed at e)
    out.esTrue = {}; out.esCs = {};
    es.forEach(function (e) {
      var st1 = 0, n1 = 0, st2 = 0, n2 = 0;
      M.groups.forEach(function (G, gi) {
        if (!G.g) return; var t = G.g + e; if (t < 1 || t > T) return;
        st1 += M.tau(G, t); n1++;
        if (e >= 0) { var v = out.att[gi + ':' + t]; if (v != null) { st2 += v; n2++; } }
        else { st2 += 0; n2++; }
      });
      if (n1) out.esTrue[e] = st1 / n1;
      if (n2) out.esCs[e] = st2 / n2;
    });
    out.es = es;
    return out;
  }

  // ---------- svg helpers ----------
  function el(tag, attrs, kids) {
    var s = '<' + tag;
    for (var k in attrs) if (attrs[k] != null) s += ' ' + k + '="' + attrs[k] + '"';
    return s + '>' + (kids || '') + '</' + tag + '>';
  }
  function fmt(v, d) { if (v == null || isNaN(v)) return '–'; d = d == null ? 2 : d; return (v < -0.0005 ? '−' : '') + Math.abs(v).toFixed(d); }
  var COL = ['#e07a4f', '#9b84e0', '#3fb6a8', '#5aa2e0'];

  function linePlot(o) {
    var W = o.w || 520, H = o.h || 260, pl = 46, pr = 14, pt = 16, pb = 40;
    var X = function (v) { return pl + (v - o.x0) / (o.x1 - o.x0) * (W - pl - pr); };
    var Y = function (v) { return pt + (1 - (v - o.y0) / (o.y1 - o.y0)) * (H - pt - pb); };
    var g = '';
    o.yt.filter(function (v) { return v >= o.y0 - 1e-9 && v <= o.y1 + 1e-9; }).forEach(function (v) { g += el('line', { x1: pl, x2: W - pr, y1: Y(v), y2: Y(v), class: 'sim-grid' }) + el('text', { x: pl - 8, y: Y(v) + 4, class: 'sim-tick', 'text-anchor': 'end' }, fmt(v, o.yd == null ? 0 : o.yd)); });
    o.xt.forEach(function (v) { g += el('text', { x: X(v), y: H - pb + 18, class: 'sim-tick', 'text-anchor': 'middle' }, v < 0 ? '−' + Math.abs(v) : String(v)); });
    g += el('line', { x1: pl, x2: pl, y1: pt, y2: H - pb, class: 'sim-axis' }) + el('line', { x1: pl, x2: W - pr, y1: H - pb, y2: H - pb, class: 'sim-axis' });
    if (o.zero) g += el('line', { x1: pl, x2: W - pr, y1: Y(0), y2: Y(0), class: 'sim-zero' });
    if (o.vline != null) g += el('line', { x1: X(o.vline), x2: X(o.vline), y1: pt, y2: H - pb, class: 'sim-zero' });
    g += el('text', { x: pl + (W - pl - pr) / 2, y: H - 6, class: 'sim-lab', 'text-anchor': 'middle' }, o.xlabel || '');
    o.series.forEach(function (s) {
      var pts = s.pts.filter(function (p) { return p[1] != null && !isNaN(p[1]); });
      if (!pts.length) return;
      if (s.line !== false) g += el('polyline', { points: pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' '), fill: 'none', stroke: s.color, 'stroke-width': s.width || 2.5, 'stroke-dasharray': s.dash || null, 'stroke-linejoin': 'round' });
      if (s.dots) pts.forEach(function (p) { g += el('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.r || 4, fill: s.hollow ? 'var(--card)' : s.color, stroke: s.color, 'stroke-width': 2 }); });
    });
    return el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sim-svg', role: 'img', 'aria-label': o.label || '' }, g);
  }
  function range(lo, hi, step) { var a = []; for (var v = lo; v <= hi + 1e-9; v += step) a.push(+v.toFixed(6)); return a; }
  function niceTicks(lo, hi) {
    var span = hi - lo, step = span > 8 ? 2 : span > 4 ? 1 : span > 2 ? 0.5 : 0.25;
    return range(Math.floor(lo / step) * step, Math.ceil(hi / step) * step, step);
  }

  // ---------- UI ----------
  function mount(root) {
    var lang = /^zh/i.test(root.getAttribute('data-lang') || document.documentElement.lang || '') ? 'zh' : 'en';
    var S = STR[lang];
    var st = JSON.parse(JSON.stringify(PRESETS.p2));
    root.innerHTML =
      '<div class="sim-controls">' +
        '<fieldset><legend>' + S.cohorts + '</legend>' +
          [0, 1, 2].map(function (k) {
            return '<div class="sim-row"><label class="sim-check"><input type="checkbox" id="sim-on-' + k + '"> <span class="sim-sw" style="background:' + COL[k] + '"></span>' + S.cohort + ' ' + 'ABC'[k] + '</label>' +
              '<label class="sim-slide"><span>' + S.adopts + ' <b id="sim-gv-' + k + '"></b></span><input type="range" id="sim-g-' + k + '" min="2" max="' + T + '" step="1"></label></div>';
          }).join('') +
          '<label class="sim-check sim-never"><input type="checkbox" id="sim-never"> <span class="sim-sw" style="background:' + COL[3] + '"></span>' + S.never + '</label>' +
        '</fieldset>' +
        '<fieldset><legend>' + S.effects + '</legend>' +
          '<label class="sim-slide"><span>' + S.base + ' <b id="sim-bv"></b></span><input type="range" id="sim-base" min="0" max="2" step="0.1"></label>' +
          '<label class="sim-slide"><span>' + S.growth + ' <b id="sim-grv"></b></span><input type="range" id="sim-growth" min="0" max="1" step="0.05"></label>' +
          '<label class="sim-slide"><span>' + S.het + ' <b id="sim-hv"></b></span><input type="range" id="sim-het" min="0" max="1" step="0.05"></label>' +
        '</fieldset>' +
        '<div class="sim-presets"><span>' + S.presets + '</span>' +
          ['p1', 'p2', 'p3', 'p4'].map(function (p) { return '<button type="button" data-p="' + p + '">' + S[p] + '</button>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="sim-out">' +
        '<div class="sim-nums" aria-live="polite"></div>' +
        '<div class="sim-panel"><h4>' + S.weights + '</h4><div class="sim-heat"></div><p class="sim-note sim-negs"></p></div>' +
        '<div class="sim-panel"><h4>' + S.es + '</h4><div class="sim-es"></div><div class="sim-legend sim-es-leg"></div><p class="sim-note sim-es-note"></p></div>' +
        '<div class="sim-panel"><h4>' + S.paths + '</h4><div class="sim-paths"></div></div>' +
      '</div>';
    var $ = function (id) { return root.querySelector('#' + id); };

    function writeControls() {
      for (var k = 0; k < 3; k++) { $('sim-on-' + k).checked = !!st.on[k]; $('sim-g-' + k).value = st.g[k]; $('sim-g-' + k).disabled = !st.on[k]; $('sim-gv-' + k).textContent = st.on[k] ? st.g[k] : S.off; }
      $('sim-never').checked = !!st.never;
      $('sim-base').value = st.base; $('sim-growth').value = st.growth; $('sim-het').value = st.het;
      $('sim-bv').textContent = st.base.toFixed(1); $('sim-grv').textContent = st.growth.toFixed(2); $('sim-hv').textContent = st.het.toFixed(2);
    }
    function readControls() {
      for (var k = 0; k < 3; k++) { st.on[k] = $('sim-on-' + k).checked ? 1 : 0; st.g[k] = +$('sim-g-' + k).value; }
      st.never = $('sim-never').checked ? 1 : 0;
      st.base = +$('sim-base').value; st.growth = +$('sim-growth').value; st.het = +$('sim-het').value;
    }

    function render() {
      var R = analyse(st), M = R.M;
      var nums = root.querySelector('.sim-nums');
      if (R.truth == null) {
        nums.innerHTML = '<p class="sim-note">' + S.noTreated + '</p>';
        root.querySelector('.sim-heat').innerHTML = ''; root.querySelector('.sim-es').innerHTML = ''; root.querySelector('.sim-negs').textContent = ''; root.querySelector('.sim-es-leg').innerHTML = '';
        root.querySelector('.sim-paths').innerHTML = '';
        return;
      }
      var bias = R.truth ? (R.twfe - R.truth) / Math.abs(R.truth) * 100 : 0;
      var csOk = Math.abs(R.cs - R.csTruth) < 1e-6;
      var bad = Math.abs(bias) > 5;
      nums.innerHTML =
        '<div class="sim-num"><span>' + S.truth + '</span><b>' + fmt(R.truth) + '</b></div>' +
        '<div class="sim-num ' + (bad ? 'is-bad' : 'is-ok') + '"><span>' + S.twfe + '</span><b>' + fmt(R.twfe) + '</b><small>' + S.bias + ' ' + (bias >= 0 ? '+' : '−') + Math.abs(bias).toFixed(0) + '%</small></div>' +
        '<div class="sim-num is-ok"><span>' + S.cs + '</span><b>' + fmt(R.cs) + '</b><small>' + (csOk ? (R.csCells === R.cells ? S.exact : S.exact + ', ' + S.csNote) : '') + '</small></div>' +
        (R.csCells < R.cells ? '<p class="sim-note">' + S.noCtrl + '</p>' : '');

      // weight heatmap
      var cw = 38, ch = 34, lx = 70, ty = 26, rowsG = M.groups.filter(function (G) { return G.g; });
      var Wd = lx + T * cw + 8, Hd = ty + rowsG.length * ch + 8, h = '', negs = 0, tot = 0;
      var maxW = 0; for (var key in R.w) maxW = Math.max(maxW, Math.abs(R.w[key]));
      for (var t = 1; t <= T; t++) h += el('text', { x: lx + (t - 0.5) * cw, y: 16, class: 'sim-tick', 'text-anchor': 'middle' }, t);
      rowsG.forEach(function (G, ri) {
        var gi = M.groups.indexOf(G), y = ty + ri * ch;
        h += el('text', { x: lx - 10, y: y + ch / 2 + 4, class: 'sim-tick', 'text-anchor': 'end', fill: COL[G.k] }, S.cohort + ' ' + 'ABC'[G.k]);
        for (var t2 = 1; t2 <= T; t2++) {
          var x = lx + (t2 - 1) * cw;
          if (t2 < G.g) { h += el('rect', { x: x + 2, y: y + 2, width: cw - 4, height: ch - 4, rx: 4, class: 'sim-cell-pre' }); continue; }
          var w = R.w[gi + ':' + t2]; tot++; if (w < -1e-9) negs++;
          var a = Math.min(1, Math.abs(w) / (maxW || 1));
          h += el('rect', { x: x + 2, y: y + 2, width: cw - 4, height: ch - 4, rx: 4, fill: w < 0 ? 'rgba(220,70,70,' + (0.25 + 0.75 * a).toFixed(2) + ')' : 'rgba(70,160,110,' + (0.2 + 0.8 * a).toFixed(2) + ')' }, el('title', {}, S.cohort + ' ' + 'ABC'[G.k] + ', ' + S.year + ' ' + t2 + ': w = ' + fmt(w, 3) + ', τ = ' + fmt(M.tau(G, t2), 2)));
          h += el('text', { x: x + cw / 2, y: y + ch / 2 + 4, class: 'sim-cell-txt', 'text-anchor': 'middle' }, fmt(M.tau(G, t2), 1));
        }
      });
      root.querySelector('.sim-heat').innerHTML = el('svg', { viewBox: '0 0 ' + Wd + ' ' + Hd, class: 'sim-svg', role: 'img', 'aria-label': S.weights }, h);
      root.querySelector('.sim-negs').textContent = S.negCount(negs, tot) + '. ' + S.weightsNote;

      // event study
      var es = R.es.filter(function (e) { return e >= -6 && e <= 8; });
      var vals = [0];
      es.forEach(function (e) { [R.esTrue[e], R.esCs[e], R.esTwfe && R.esTwfe[e]].forEach(function (v) { if (v != null && !isNaN(v)) vals.push(v); }); });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var pad = Math.max(0.25, (hi - lo) * 0.1);
      root.querySelector('.sim-es').innerHTML = linePlot({
        x0: es[0] - 0.5, x1: es[es.length - 1] + 0.5, y0: lo - pad, y1: hi + pad, xt: es, yt: niceTicks(lo - pad, hi + pad), yd: 1, zero: true, vline: -0.5, xlabel: S.rel, label: S.es,
        series: [
          { pts: es.map(function (e) { return [e, R.esTrue[e]]; }), color: 'var(--sim-gold)', width: 5 },
          { pts: es.map(function (e) { return [e, R.esTwfe ? R.esTwfe[e] : null]; }), color: 'var(--muted)', dots: true, r: 3.5, width: 2, dash: '5 4' },
          { pts: es.map(function (e) { return [e, R.esCs[e]]; }), color: 'var(--accent)', dots: true, line: false, r: 4.5, hollow: true }
        ]
      });
      root.querySelector('.sim-es-leg').innerHTML =
        '';
      root.querySelector('.sim-es-note').textContent = R.esDropped ? S.esNote(R.esDropped) : '';
      root.querySelector('.sim-es-leg').innerHTML += '<span><i style="background:var(--sim-gold)"></i>' + S.esTruth + '</span><span><i style="background:var(--muted)"></i>' + S.esTwfe + '</span><span><i class="o" style="border-color:var(--accent)"></i>' + S.esCs + '</span>';

      // outcome paths
      var series = [], ys = [];
      M.groups.forEach(function (G) {
        var pts = []; for (var t3 = 1; t3 <= T; t3++) { var v = M.y(G, t3); pts.push([t3, v]); ys.push(v); }
        series.push({ pts: pts, color: COL[G.k], width: 3 });
      });
      var ylo = Math.min.apply(null, ys), yhi = Math.max.apply(null, ys);
      root.querySelector('.sim-paths').innerHTML = linePlot({ x0: 0.5, x1: T + 0.5, y0: Math.floor(ylo), y1: Math.ceil(yhi), xt: range(1, T, 1), yt: niceTicks(Math.floor(ylo), Math.ceil(yhi)), xlabel: S.year, label: S.paths, series: series, h: 220 });
    }

    root.addEventListener('input', function () { readControls(); writeControls(); render(); });
    root.addEventListener('change', function () { readControls(); writeControls(); render(); });
    root.querySelectorAll('.sim-presets button').forEach(function (b) {
      b.addEventListener('click', function () { st = JSON.parse(JSON.stringify(PRESETS[b.getAttribute('data-p')])); writeControls(); render(); });
    });
    writeControls(); render();
  }

  window.DIDSim = { mount: mount, analyse: analyse, PRESETS: PRESETS };
})();
