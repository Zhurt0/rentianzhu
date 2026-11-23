/*
 * Scenes for the difference-in-differences animated guides.
 * Each scene: id, title, sub, stata (commands shown in the corner), dur (s),
 * beats (timed captions in English and Chinese) and draw(ctx, t).
 * The scene order here is the order on the page and in the video files.
 */
(function () {
  'use strict';
  var D = window.DIDAnim, h = D.h, C = D.C, L = h.L, prog = h.prog, fmt = h.fmt;
  var scene = D.scene;

  function check(ctx, x, y, s, color, p, a) {
    h.path(ctx, [[x - s, y], [x - s * 0.3, y + s * 0.7], [x + s, y - s * 0.8]], p, { color: color || C.good, lw: 3.5, a: a });
  }
  function cross(ctx, x, y, s, color, p, a) {
    h.line(ctx, x - s, y - s, x + s, y + s, { color: color || C.bad, lw: 3.5, p: Math.min(1, p * 2), a: a });
    h.line(ctx, x + s, y - s, x - s, y + s, { color: color || C.bad, lw: 3.5, p: Math.max(0, p * 2 - 1), a: a });
  }
  function num(ctx, v, x, y, o) {
    o = o || {};
    h.text(ctx, typeof v === 'number' ? fmt(v, o.d === undefined ? 1 : o.d) : v, x, y,
      { size: o.size || 22, mono: true, color: o.color || C.text, align: o.align || 'center', a: o.a, weight: o.weight, base: o.base });
  }
  function legend(ctx, items, x, y, a) {
    var cx = x;
    items.forEach(function (it) {
      if (it.dash) h.line(ctx, cx, y, cx + 26, y, { color: it.color, lw: 3, dash: [6, 5], a: a });
      else h.line(ctx, cx, y, cx + 26, y, { color: it.color, lw: 4, a: a });
      h.text(ctx, it.label, cx + 34, y + 6, { size: 17, color: C.muted, a: a });
      cx += 34 + h.measure(ctx, it.label, 17) + 28;
    });
  }

  // Shared staggered-adoption world used by several scenes:
  // early cohort adopts in year 4, late cohort in year 7, one group never treated.
  var STAG = {
    groups: [
      { key: 'E', g: 4, a: 4.0, color: C.treat, label: { en: 'Early (year 4)', zh: '早处理组（第 4 年）' } },
      { key: 'Lt', g: 7, a: 2.5, color: C.purple, label: { en: 'Late (year 7)', zh: '晚处理组（第 7 年）' } },
      { key: 'N', g: 0, a: 1.0, color: C.ctrl, label: { en: 'Never treated', zh: '从未处理组' } }
    ],
    T: 10,
    lam: function (t) { return 0.25 * t; },
    tau: function (g, t) { return g && t >= g ? 0.5 * (t - g + 1) : 0; },
    y0: function (G, t) { return G.a + this.lam(t); },
    y: function (G, t) { return this.y0(G, t) + this.tau(G.g, t); }
  };
  // 2x2 DiD of group A against group B on window [t0, t1], "post" from year s
  function twoByTwo(A, B, t0, t1, s) {
    function m(G, post) { var sum = 0, n = 0; for (var t = t0; t <= t1; t++) if ((t >= s) === post) { sum += STAG.y(G, t); n++; } return sum / n; }
    return (m(A, true) - m(A, false)) - (m(B, true) - m(B, false));
  }
  // static TWFE coefficient and true ATT in the staggered world (equal group sizes)
  var TWFE = (function () {
    var rows = [];
    STAG.groups.forEach(function (G, gi) { for (var t = 1; t <= STAG.T; t++) rows.push({ gi: gi, t: t, d: G.g && t >= G.g ? 1 : 0, y: STAG.y(G, t), tau: STAG.tau(G.g, t) }); });
    function demean(v) {
      var x = v.slice();
      for (var it = 0; it < 100; it++) {
        var gm = {}, tm = {};
        rows.forEach(function (r, i) { gm[r.gi] = (gm[r.gi] || 0) + x[i] / STAG.T; });
        x = x.map(function (val, i) { return val - gm[rows[i].gi]; });
        rows.forEach(function (r, i) { tm[r.t] = (tm[r.t] || 0) + x[i] / STAG.groups.length; });
        x = x.map(function (val, i) { return val - tm[rows[i].t]; });
      }
      return x;
    }
    var dd = demean(rows.map(function (r) { return r.d; })), yy = demean(rows.map(function (r) { return r.y; }));
    var num = 0, den = 0, s = 0, n = 0;
    rows.forEach(function (r, i) { num += dd[i] * yy[i]; den += dd[i] * dd[i]; if (r.d) { s += r.tau; n++; } });
    return { b: num / den, att: s / n };
  })();
  D.STAG = STAG; D.TWFE = TWFE;

  // ------------------------------------------------------------------ 1
  scene({
    id: 'classic', stata: ['didregress', 'reghdfe'], dur: 43,
    title: { en: 'The 2×2 design', zh: '经典 2×2 双重差分' },
    sub: { en: 'Compare changes, not levels', zh: '比较变化，而不是水平' },
    beats: [
      { t: 2.6, en: 'A policy reaches one group (treated) but not another (control). We observe both groups before and after it starts.', zh: '一项政策只影响一组（处理组），不影响另一组（对照组）。我们观察两组在政策前后的结果。' },
      { t: 7.5, en: 'The control group rises from 4.0 to 5.0. That +1.0 reflects everything that changed over time for both groups.', zh: '对照组从 4.0 升到 5.0。这 +1.0 反映了两组共同经历的时间变化。' },
      { t: 13.5, en: 'The treated group rises from 6.0 to 8.5. Part of that +2.5 is the common time trend, part is the policy.', zh: '处理组从 6.0 升到 8.5。这 +2.5 中，一部分是共同的时间趋势，一部分是政策效应。' },
      { t: 19.5, en: 'Parallel trends: without the policy, the treated group would have risen by the same +1.0 as the control group.', zh: '平行趋势假设：如果没有政策，处理组会和对照组一样上升 +1.0。' },
      { t: 26.5, en: 'The gap between what happened (8.5) and that counterfactual (7.0) is the average effect on the treated: δ = 1.5.', zh: '实际结果（8.5）与反事实（7.0）之间的差距，就是处理组的平均处理效应：δ = 1.5。' },
      { t: 32.5, en: 'In numbers: (8.5 − 6.0) − (5.0 − 4.0) = 1.5. The same δ is the interaction coefficient in the regression below.', zh: '用数字表示：(8.5 − 6.0) − (5.0 − 4.0) = 1.5。这个 δ 也就是下面回归中交互项的系数。' },
      { t: 39, en: 'Stata: didregress (y) (D), group(id) time(t), or reghdfe y D, absorb(id t).', zh: 'Stata：didregress (y) (D), group(id) time(t)，或 reghdfe y D, absorb(id t)。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(130, 120, 500, 380, -0.3, 1.3, 3, 9.5);
      var axA = prog(t, 2.6, 3.4);
      P.axes(ctx, { a: axA, xt: [[0, L('Before', '政策前')], [1, L('After', '政策后')]], yt: [3, 4, 5, 6, 7, 8, 9], ylabel: L('Average outcome', '平均结果') });
      h.line(ctx, P.X(0.5), P.y + 10, P.X(0.5), P.y + P.h, { color: C.faint, lw: 1.5, dash: [4, 6], a: prog(t, 3.2, 4) });
      h.text(ctx, L('policy starts', '政策开始'), P.X(0.5), P.y, { size: 15, color: C.muted, align: 'center', a: prog(t, 3.2, 4) });

      // control
      h.path(ctx, P.P([[0, 4], [1, 5]]), prog(t, 8.0, 9.4), { color: C.ctrl, lw: 4 });
      h.dot(ctx, P.X(0), P.Y(4), 8, { color: C.ctrl, a: prog(t, 7.6, 8.1) });
      h.dot(ctx, P.X(1), P.Y(5), 8, { color: C.ctrl, a: prog(t, 9.2, 9.6) });
      num(ctx, '4.0', P.X(0) - 18, P.Y(4) + 7, { align: 'right', size: 19, color: C.ctrl, a: prog(t, 7.8, 8.3) });
      num(ctx, '5.0', P.X(1) + 18, P.Y(5) + 7, { align: 'left', size: 19, color: C.ctrl, a: prog(t, 9.3, 9.8) });
      h.text(ctx, L('Control', '对照组'), P.X(0.5), P.Y(4.5) + 30, { size: 19, color: C.ctrl, align: 'center', weight: 600, a: prog(t, 8.6, 9.2) });

      // treated
      h.path(ctx, P.P([[0, 6], [1, 8.5]]), prog(t, 14.0, 15.4), { color: C.treat, lw: 4 });
      h.dot(ctx, P.X(0), P.Y(6), 8, { color: C.treat, a: prog(t, 13.6, 14.1) });
      h.dot(ctx, P.X(1), P.Y(8.5), 8, { color: C.treat, a: prog(t, 15.2, 15.6) });
      num(ctx, '6.0', P.X(0) - 18, P.Y(6) + 7, { align: 'right', size: 19, color: C.treat, a: prog(t, 13.8, 14.3) });
      num(ctx, '8.5', P.X(1) + 18, P.Y(8.5) + 7, { align: 'left', size: 19, color: C.treat, a: prog(t, 15.3, 15.8) });
      h.text(ctx, L('Treated', '处理组'), P.X(0.5), P.Y(7.25) - 22, { size: 19, color: C.treat, align: 'center', weight: 600, a: prog(t, 14.6, 15.2) });

      // counterfactual: the control segment slides up to start at the treated level
      var off = 2 * prog(t, 20.2, 22.2);
      h.path(ctx, P.P([[0, 4 + off], [1, 5 + off]]), 1, { color: C.cf, lw: 3, dash: [9, 7], a: prog(t, 19.7, 20.2) });
      h.dot(ctx, P.X(1), P.Y(7), 6, { hollow: true, color: C.cf, a: prog(t, 22.0, 22.4) });
      num(ctx, '7.0', P.X(1) + 18, P.Y(7) + 7, { align: 'left', size: 19, color: C.cf, a: prog(t, 22.2, 22.7) });
      h.text(ctx, L('counterfactual', '反事实'), P.X(0.62), P.Y(6.62) + 30, { size: 17, color: C.cf, align: 'center', italic: true, a: prog(t, 22.4, 23) });

      // effect brace
      var bp = prog(t, 26.6, 27.6);
      h.brace(ctx, P.X(1) + 62, P.Y(8.5), P.Y(7), { side: 1, p: bp });
      h.text(ctx, 'δ = 1.5', P.X(1) + 86, P.Y(7.75) + 8, { size: 26, color: C.effect, weight: 700, a: prog(t, 27.2, 27.8) });

      // 2x2 table
      var tx = 820, cw = [120, 92, 92, 100], ty = 170, rh = 54;
      var cols = [tx, tx + cw[0], tx + cw[0] + cw[1], tx + cw[0] + cw[1] + cw[2]];
      var tA = prog(t, 3.2, 4.0);
      h.box(ctx, tx - 16, ty - 44, 420, 250, { fill: C.panel, a: tA * 0.9, r: 12 });
      [L('Before', '政策前'), L('After', '政策后'), L('Change', '变化')].forEach(function (s, i) {
        h.text(ctx, s, cols[i + 1] + cw[i + 1] / 2, ty - 12, { size: 17, color: C.muted, align: 'center', a: tA });
      });
      h.text(ctx, L('Treated', '处理组'), cols[0], ty + rh - 18, { size: 19, color: C.treat, weight: 600, a: tA });
      h.text(ctx, L('Control', '对照组'), cols[0], ty + 2 * rh - 18, { size: 19, color: C.ctrl, weight: 600, a: tA });
      h.line(ctx, tx, ty + 2 * rh + 4, tx + 392, ty + 2 * rh + 4, { color: C.axis, lw: 1, a: prog(t, 32.6, 33) });
      h.text(ctx, L('Difference', '组间差'), cols[0], ty + 3 * rh - 10, { size: 19, color: C.effect, weight: 600, a: prog(t, 32.6, 33.1) });
      function cell(v, c, r, a, col) { num(ctx, v, cols[c] + cw[c] / 2, ty + r * rh - 18 + (r === 3 ? 8 : 0), { size: 21, color: col, a: a }); }
      cell('6.0', 1, 1, prog(t, 14.0, 14.5)); cell('8.5', 2, 1, prog(t, 15.4, 15.9)); cell('+2.5', 3, 1, prog(t, 17.0, 17.5), C.treat);
      cell('4.0', 1, 2, prog(t, 8.0, 8.5)); cell('5.0', 2, 2, prog(t, 9.4, 9.9)); cell('+1.0', 3, 2, prog(t, 11.0, 11.5), C.ctrl);
      cell('2.0', 1, 3, prog(t, 33.2, 33.7), C.muted); cell('3.5', 2, 3, prog(t, 33.6, 34.1), C.muted);
      cell('1.5', 3, 3, prog(t, 34.4, 34.9), C.effect);
      h.box(ctx, cols[3] + 18, ty + 3 * rh - 42, 64, 40, { stroke: C.effect, lw: 2, r: 8, a: prog(t, 34.6, 35.1) });

      // equation and regression
      var eA = prog(t, 35.2, 35.8);
      h.text(ctx, '(8.5 − 6.0) − (5.0 − 4.0) = 1.5', tx + 196, 470, { size: 22, mono: true, color: C.text, align: 'center', a: eA });
      h.text(ctx, 'y = α + β·Treat + γ·Post + δ·(Treat×Post)', tx + 196, 520, { size: 17, mono: true, color: C.muted, align: 'center', a: prog(t, 36.2, 36.8) });
    }
  });

  // ------------------------------------------------------------------ 2
  var ES = {
    k: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
    b: [-0.12, -0.18, 0.02, -0.05, 0, 0.45, 0.9, 1.25, 1.55, 1.75, 1.9],
    se: [0.17, 0.16, 0.16, 0.15, 0, 0.16, 0.17, 0.18, 0.19, 0.2, 0.21]
  };
  scene({
    id: 'event', stata: ['reghdfe', 'eventdd'], dur: 42,
    title: { en: 'Event studies and parallel trends', zh: '事件研究法与平行趋势' },
    sub: { en: 'One coefficient for every year around treatment', zh: '为处理前后的每一年估计一个系数' },
    beats: [
      { t: 2.6, en: 'With many periods, estimate one coefficient for each year relative to treatment. Year −1 is the reference and is set to zero.', zh: '有多个时期时，可以为相对于处理时点的每一年估计一个系数。第 −1 年作为基准期，系数设为零。' },
      { t: 9, en: 'Leads, the years before treatment, should hover around zero: treated and control units moved together before the policy.', zh: '处理前各年的系数（前导项）应在零附近波动：政策前处理组与对照组同步变化。' },
      { t: 16, en: 'Lags, the years after treatment, trace out how the effect builds up over time.', zh: '处理后各年的系数（滞后项）描绘出效应随时间累积的过程。' },
      { t: 23, en: 'Caution: flat leads do not prove parallel trends. A small trend like this one passes the pre-test (Roth 2022).', zh: '注意：前导项平坦并不能证明平行趋势成立。像这样的小趋势也能通过预检验（Roth 2022）。' },
      { t: 30, en: 'If that trend continued after treatment, part of the estimated effect would be bias rather than policy.', zh: '如果这种趋势在处理后继续存在，估计出的效应中就有一部分是偏误，而不是政策效应。' },
      { t: 36, en: 'Report the event study, then check how robust it is with Honest DiD bounds (Rambachan & Roth 2023).', zh: '报告事件研究图，再用 Honest DiD 的稳健区间检验结论有多可靠（Rambachan & Roth 2023）。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(150, 110, 980, 400, -5.6, 5.6, -1, 2.6);
      var axA = prog(t, 2.6, 3.4);
      P.axes(ctx, { a: axA, xt: ES.k.map(function (k) { return [k, k < 0 ? '−' + Math.abs(k) : String(k)]; }), yt: [[-1, '−1.0'], [0, '0.0'], [1, '1.0'], [2, '2.0']], xlabel: L('Years relative to treatment', '相对于处理的年份'), ylabel: L('Estimated effect', '估计效应') });
      P.zero(ctx, axA);
      h.shade(ctx, P.X(-5.6), P.y, P.X(-0.5) - P.X(-5.6), P.h, 'rgba(108,180,238,0.06)', prog(t, 9, 10));
      h.text(ctx, L('before treatment', '处理前'), P.X(-3), P.y + 26, { size: 16, color: C.ctrl, align: 'center', a: prog(t, 9.2, 10) });
      h.line(ctx, P.X(-0.5), P.y, P.X(-0.5), P.y + P.h, { color: C.faint, lw: 1.5, dash: [4, 6], a: axA });
      h.text(ctx, L('treatment starts', '开始处理'), P.X(-0.5) + 8, P.y + 26, { size: 16, color: C.muted, a: axA });

      // reference
      h.dot(ctx, P.X(-1), P.Y(0), 8, { hollow: true, color: C.text, a: prog(t, 4.5, 5) });
      h.text(ctx, L('reference', '基准期'), P.X(-1), P.Y(0) + 34, { size: 15, color: C.muted, align: 'center', a: prog(t, 5, 5.5) * (1 - prog(t, 22.5, 23)) });

      // leads and lags
      var postPts = [];
      ES.k.forEach(function (k, i) {
        if (k === -1) return;
        var a = k < 0 ? prog(t, 9.5 + (k + 5) * 0.4, 10 + (k + 5) * 0.4) : prog(t, 16.4 + k * 0.55, 16.9 + k * 0.55);
        var col = k < 0 ? C.ctrl : C.treat, x = P.X(k);
        h.line(ctx, x, P.Y(ES.b[i] - 1.96 * ES.se[i]), x, P.Y(ES.b[i] + 1.96 * ES.se[i]), { color: col, lw: 2.5, a: a * 0.75 });
        h.line(ctx, x - 7, P.Y(ES.b[i] - 1.96 * ES.se[i]), x + 7, P.Y(ES.b[i] - 1.96 * ES.se[i]), { color: col, lw: 2.5, a: a * 0.75 });
        h.line(ctx, x - 7, P.Y(ES.b[i] + 1.96 * ES.se[i]), x + 7, P.Y(ES.b[i] + 1.96 * ES.se[i]), { color: col, lw: 2.5, a: a * 0.75 });
        h.dot(ctx, x, P.Y(ES.b[i]), 8, { color: col, a: a });
        if (k >= 0) postPts.push([x, P.Y(ES.b[i])]);
      });
      h.path(ctx, [[P.X(-1), P.Y(0)]].concat(postPts), prog(t, 16.4, 20), { color: C.treat, lw: 2, a: 0.5 });

      // undetected pre-trend
      var slope = 0.07, trA = prog(t, 23.3, 24);
      h.path(ctx, P.P([[-5.4, slope * (-4.4)], [5.4, slope * 6.4]]), prog(t, 23.3, 25.5), { color: C.bad, lw: 2.5, dash: [10, 7], a: trA });
      h.text(ctx, L('a pre-trend the test cannot detect', '预检验无法察觉的趋势'), P.X(-5.3), P.Y(-0.62), { size: 16, color: C.bad, a: prog(t, 24.5, 25.2) });
      // bias area after treatment
      var bA = prog(t, 30.3, 31.3);
      if (bA > 0) {
        ctx.save(); ctx.globalAlpha *= bA * 0.28; ctx.fillStyle = C.bad; ctx.beginPath();
        ctx.moveTo(P.X(-0.5), P.Y(0)); ctx.lineTo(P.X(5.4), P.Y(0)); ctx.lineTo(P.X(5.4), P.Y(slope * 6.4)); ctx.lineTo(P.X(-0.5), P.Y(slope * 0.5)); ctx.closePath(); ctx.fill(); ctx.restore();
        h.text(ctx, L('possible bias', '可能的偏误'), P.X(4.5), P.Y(0) + 26, { size: 16, color: C.bad, align: 'center', a: bA });
      }
    }
  });

  // ------------------------------------------------------------------ 3
  scene({
    id: 'ddd', stata: ['didregress', 'reghdfe'], dur: 39,
    title: { en: 'Triple differences', zh: '三重差分' },
    sub: { en: 'Difference out a shock that hits the treated states', zh: '剔除处理地区自身受到的冲击' },
    beats: [
      { t: 2.6, en: 'Worry: the treated states may have had their own shock, unrelated to the policy, that a plain DiD would mistake for an effect.', zh: '担忧：处理地区可能同时经历了与政策无关的自身冲击，普通双重差分会把它误认为政策效应。' },
      { t: 9, en: 'Step 1: a standard DiD for the group the policy targets. Treated vs. control states, before vs. after: 3.0 − 1.0 = 2.0.', zh: '第一步：对政策针对的人群做普通双重差分。处理地区对比对照地区、政策前对比政策后：3.0 − 1.0 = 2.0。' },
      { t: 17, en: 'Step 2: the same DiD for a group in the same states that the policy does not touch. Its 0.5 measures the state-specific shock.', zh: '第二步：对同一批地区中不受政策影响的人群做同样的双重差分。得到的 0.5 衡量的是地区自身的冲击。' },
      { t: 25, en: 'Step 3: subtract. The shock cancels and the policy effect remains: 2.0 − 0.5 = 1.5.', zh: '第三步：相减。地区冲击被抵消，剩下的就是政策效应：2.0 − 0.5 = 1.5。' },
      { t: 32, en: 'Only the gap in trends between the two groups has to be parallel, a weaker assumption (Gruber 1994; Olden & Møen 2022).', zh: '只需假设两组人群之间的趋势差异保持平行，这一假设更弱（Gruber 1994；Olden & Møen 2022）。' }
    ],
    draw: function (ctx, t) {
      function panel(x, title, vals, t0, label, col) {
        var P = new h.Plot(x + 60, 150, 380, 270, -0.3, 1.3, 2, 9);
        var a = prog(t, t0, t0 + 0.8);
        h.text(ctx, title, x + 60 + 190, 112, { size: 19, weight: 600, align: 'center', color: col, a: prog(t, 2.8, 3.6) });
        P.axes(ctx, { a: prog(t, 2.8, 3.6), xt: [[0, L('Before', '政策前')], [1, L('After', '政策后')]], yt: [2, 4, 6, 8] });
        h.path(ctx, P.P([[0, vals[0]], [1, vals[1]]]), prog(t, t0 + 0.3, t0 + 1.6), { color: C.ctrl, lw: 4 });
        h.path(ctx, P.P([[0, vals[2]], [1, vals[3]]]), prog(t, t0 + 1.2, t0 + 2.5), { color: C.treat, lw: 4 });
        [[0, vals[0], C.ctrl, t0 + 0.3], [1, vals[1], C.ctrl, t0 + 1.5], [0, vals[2], C.treat, t0 + 1.2], [1, vals[3], C.treat, t0 + 2.4]].forEach(function (d) {
          h.dot(ctx, P.X(d[0]), P.Y(d[1]), 7, { color: d[2], a: prog(t, d[3], d[3] + 0.3) });
        });
        // counterfactual for treated states
        var cf = vals[2] + (vals[1] - vals[0]);
        h.path(ctx, P.P([[0, vals[2]], [1, cf]]), prog(t, t0 + 2.8, t0 + 3.6), { color: C.cf, lw: 2.5, dash: [8, 6] });
        h.brace(ctx, P.X(1) + 22, P.Y(vals[3]), P.Y(cf), { side: 1, p: prog(t, t0 + 3.6, t0 + 4.4) });
        h.text(ctx, label, P.X(1) + 46, P.Y((vals[3] + cf) / 2) + 8, { size: 22, mono: true, weight: 700, color: C.effect, a: prog(t, t0 + 4.2, t0 + 4.8) });
        return a;
      }
      panel(70, L('Group the policy targets', '政策针对的人群'), [4.0, 5.0, 5.0, 8.0], 9.3, '2.0', C.text);
      panel(650, L('Group the policy does not affect', '不受政策影响的人群'), [3.0, 3.8, 4.0, 5.3], 17.3, '0.5', C.muted);
      legend(ctx, [{ color: C.treat, label: L('treated states', '处理地区') }, { color: C.ctrl, label: L('control states', '对照地区') }, { color: C.cf, dash: true, label: L('parallel-trend counterfactual', '平行趋势反事实') }], 300, 500, prog(t, 3, 3.8));
      var eA = prog(t, 25.3, 26);
      h.box(ctx, 390, 524, 500, 56, { fill: C.panel, r: 12, a: eA });
      h.text(ctx, 'DDD = 2.0 − 0.5 = 1.5', 640, 562, { size: 28, mono: true, weight: 700, align: 'center', color: C.effect, a: eA });
    }
  });

  // ------------------------------------------------------------------ 4
  scene({
    id: 'drdid', stata: ['drdid'], dur: 39,
    title: { en: 'Conditional parallel trends', zh: '条件平行趋势' },
    sub: { en: 'When the groups differ in who they contain', zh: '当两组的人员构成不同时' },
    beats: [
      { t: 2.6, en: 'Sometimes trends are only parallel within comparable units. Here young workers’ outcomes grow faster than older workers’, policy or not.', zh: '有时平行趋势只在可比的个体之间成立。这里年轻员工的结果本来就比年长员工增长更快，与政策无关。' },
      { t: 9.5, en: 'The treated group is 80% young; the control group is only 20% young.', zh: '处理组中 80% 是年轻人，而对照组中只有 20% 是年轻人。' },
      { t: 15, en: 'A raw DiD compares groups with different mixes, so it mistakes the faster young trend for an effect: 2.7 − 0.8 = 1.9.', zh: '直接做双重差分，比较的是构成不同的两组，于是把年轻人更快的增长误当成政策效应：2.7 − 0.8 = 1.9。' },
      { t: 22.5, en: 'Instead compare treated and control units within each age group, then average with the treated group’s mix: the effect is 1.0.', zh: '更好的做法是在每个年龄组内部比较处理组与对照组，再按处理组的构成加权平均：效应为 1.0。' },
      { t: 30.5, en: 'Doubly robust DiD combines an outcome model with propensity-score weights and is consistent if either one is right (Sant’Anna & Zhao 2020).', zh: '双重稳健双重差分把结果模型与倾向得分加权结合起来，只要其中一个设定正确，估计就是一致的（Sant’Anna & Zhao 2020）。' }
    ],
    draw: function (ctx, t) {
      var YC = C.teal, OC = C.purple;
      // composition bars
      var bx = 90, bw = 360, a0 = prog(t, 9.6, 10.4);
      h.text(ctx, L('Who is in each group', '各组的人员构成'), bx, 140, { size: 19, weight: 600, a: prog(t, 2.8, 3.6) });
      [[L('Treated', '处理组'), 0.8, C.treat, 200], [L('Control', '对照组'), 0.2, C.ctrl, 290]].forEach(function (r, i) {
        var yy = r[3], p = prog(t, 9.8 + i * 0.6, 11 + i * 0.6);
        h.text(ctx, r[0], bx, yy - 12, { size: 18, color: r[2], weight: 600, a: a0 });
        h.box(ctx, bx, yy, bw, 40, { fill: C.panel2, r: 6, a: a0 });
        h.box(ctx, bx, yy, bw * r[1] * p, 40, { fill: YC, r: 6, a: a0 * 0.9 });
        h.box(ctx, bx + bw * r[1], yy, bw * (1 - r[1]) * p, 40, { fill: OC, r: 6, a: a0 * 0.9 * p });
        h.text(ctx, Math.round(r[1] * 100) + '%', bx + 12, yy + 27, { size: 17, mono: true, color: C.bg, weight: 600, a: p });
        h.text(ctx, Math.round((1 - r[1]) * 100) + '%', bx + bw - 12, yy + 27, { size: 17, mono: true, color: C.bg, weight: 600, align: 'right', a: p });
      });
      h.box(ctx, bx, 370, 18, 18, { fill: YC, r: 4, a: a0 }); h.text(ctx, L('young', '年轻'), bx + 28, 385, { size: 17, color: C.muted, a: a0 });
      h.box(ctx, bx + 120, 370, 18, 18, { fill: OC, r: 4, a: a0 }); h.text(ctx, L('older', '年长'), bx + 148, 385, { size: 17, color: C.muted, a: a0 });

      // trend sketch: untreated growth by age
      var P = new h.Plot(bx + 10, 440, 340, 110, -0.1, 1.1, 0, 2.4), sA = prog(t, 3, 4);
      h.text(ctx, L('Growth without the policy', '无政策时的增长'), bx, 425, { size: 16, color: C.muted, a: sA });
      h.path(ctx, P.P([[0, 0.1], [1, 2.1]]), prog(t, 3.5, 5), { color: YC, lw: 3.5, a: sA });
      h.path(ctx, P.P([[0, 0.1], [1, 0.6]]), prog(t, 4, 5.5), { color: OC, lw: 3.5, a: sA });
      h.text(ctx, '+2.0', P.X(1) + 12, P.Y(2.1) + 6, { size: 16, mono: true, color: YC, a: prog(t, 5, 5.5) });
      h.text(ctx, '+0.5', P.X(1) + 12, P.Y(0.6) + 6, { size: 16, mono: true, color: OC, a: prog(t, 5.5, 6) });

      // change table
      var tx = 560, ty = 170, cw = [190, 120, 120, 170], rh = 62, tA = prog(t, 15.2, 16);
      var cx = [tx, tx + cw[0], tx + cw[0] + cw[1], tx + cw[0] + cw[1] + cw[2]];
      h.box(ctx, tx - 20, ty - 50, 630, 320, { fill: C.panel, r: 12, a: tA * 0.9 });
      h.text(ctx, L('Change from before to after', '政策前后的变化'), tx, ty - 18, { size: 17, color: C.muted, a: tA });
      [[L('young', '年轻'), YC], [L('older', '年长'), OC], [L('whole group', '整组'), C.text]].forEach(function (c, i) {
        h.text(ctx, c[0], cx[i + 1] + cw[i + 1] / 2, ty + 18, { size: 17, color: c[1], align: 'center', weight: 600, a: tA });
      });
      h.text(ctx, L('Treated', '处理组'), cx[0], ty + rh + 14, { size: 19, color: C.treat, weight: 600, a: tA });
      h.text(ctx, L('Control', '对照组'), cx[0], ty + 2 * rh + 14, { size: 19, color: C.ctrl, weight: 600, a: tA });
      h.line(ctx, tx, ty + 2 * rh + 34, tx + 590, ty + 2 * rh + 34, { color: C.axis, lw: 1, a: tA });
      h.text(ctx, L('Difference', '差值'), cx[0], ty + 3 * rh + 22, { size: 19, weight: 600, a: tA });
      function cell(v, c, r, a, col, w) { num(ctx, v, cx[c] + cw[c] / 2, ty + r * rh + 14 + (r === 3 ? 8 : 0), { size: 22, color: col, a: a, weight: w }); }
      cell('3.0', 1, 1, prog(t, 22.8, 23.3)); cell('1.5', 2, 1, prog(t, 23.0, 23.5)); cell('2.7', 3, 1, prog(t, 15.6, 16.1));
      cell('2.0', 1, 2, prog(t, 22.8, 23.3)); cell('0.5', 2, 2, prog(t, 23.0, 23.5)); cell('0.8', 3, 2, prog(t, 15.8, 16.3));
      cell('1.9', 3, 3, prog(t, 17.2, 17.7), C.bad, 700);
      cross(ctx, cx[3] + cw[3] / 2 + 48, ty + 3 * rh + 14, 8, C.bad, prog(t, 18, 18.6));
      cell('1.0', 1, 3, prog(t, 24.4, 24.9), C.good, 700); cell('1.0', 2, 3, prog(t, 24.6, 25.1), C.good, 700);
      var fA = prog(t, 26, 26.7);
      h.text(ctx, 'ATT = 0.8 × 1.0 + 0.2 × 1.0 = 1.0', tx + 295, 540, { size: 23, mono: true, align: 'center', color: C.good, weight: 700, a: fA });
      check(ctx, tx + 560, 532, 10, C.good, prog(t, 26.6, 27.2));
    }
  });

  // ------------------------------------------------------------------ 5
  scene({
    id: 'bacon', stata: ['bacondecomp', 'twowayfeweights'], dur: 57,
    title: { en: 'Staggered adoption: why TWFE breaks', zh: '交错处理：TWFE 为何失灵' },
    sub: { en: 'Already-treated units make bad controls', zh: '已处理的个体不是好的对照' },
    beats: [
      { t: 2.6, en: 'Now units adopt at different dates: an early cohort in year 4, a late cohort in year 7, and a group that is never treated.', zh: '现在个体在不同时间接受处理：早处理组在第 4 年，晚处理组在第 7 年，还有一组从未接受处理。' },
      { t: 9, en: 'Effects build up after adoption (gold). Static two-way fixed effects (TWFE) uses all of these data and returns one number.', zh: '处理后效应逐年累积（金色部分）。静态双向固定效应（TWFE）使用全部数据，只给出一个数字。' },
      { t: 15, en: 'Goodman-Bacon (2021): that number is a weighted average of every 2×2 comparison hidden in the data.', zh: 'Goodman-Bacon（2021）指出：这个数字是数据中所有 2×2 比较的加权平均。' },
      { t: 20, en: 'Early vs. never treated, and late vs. never treated: clean comparisons.', zh: '早处理组对比从未处理组、晚处理组对比从未处理组：都是干净的比较。' },
      { t: 26, en: 'Early vs. late, before the late cohort is treated: also clean, because the late cohort is still untreated.', zh: '晚处理组接受处理之前，早处理组对比晚处理组：同样干净，因为晚处理组此时尚未处理。' },
      { t: 31, en: 'Late vs. early, after year 4: the early cohort serves as the control while its own effect is still growing.', zh: '第 4 年之后，晚处理组对比早处理组：早处理组被当作对照，而它自身的效应仍在增长。' },
      { t: 38, en: 'Its growth gets subtracted, so this comparison gives −0.50 even though every true effect is positive.', zh: '早处理组效应的增长被减掉了，所以这个比较得到 −0.50，尽管每一个真实效应都是正的。' },
      { t: 44, en: 'Result: TWFE reports ' + TWFE.b.toFixed(2) + ', while the true average effect on the treated is ' + TWFE.att.toFixed(2) + '.', zh: '结果：TWFE 估计为 ' + TWFE.b.toFixed(2) + '，而处理组的真实平均效应是 ' + TWFE.att.toFixed(2) + '。' },
      { t: 50, en: 'Diagnose with bacondecomp or twowayfeweights. Fix it with estimators that only use clean controls, as in the next scenes.', zh: '可以用 bacondecomp 或 twowayfeweights 诊断问题；解决办法是只使用干净对照的估计量，见接下来几节。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(100, 110, 600, 380, 0.5, 10.5, 0, 11);
      var axA = prog(t, 2.6, 3.4);
      P.axes(ctx, { a: axA, xt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (v) { return [v, String(v)]; }), yt: [0, 2, 4, 6, 8, 10], xlabel: L('Year', '年份'), ylabel: L('Outcome', '结果变量') });

      // which comparison is highlighted
      var phase = t < 20 ? 0 : t < 23 ? 1 : t < 26 ? 2 : t < 31 ? 3 : t < 44 ? 4 : 0;
      var on = { 0: [1, 1, 1], 1: [1, 0, 1], 2: [0, 1, 1], 3: [1, 1, 0], 4: [1, 1, 0] }[phase];
      var winShade = { 1: [0.5, 10.5, C.good], 2: [0.5, 10.5, C.good], 3: [0.5, 6.5, C.good], 4: [3.5, 10.5, C.bad] }[phase];
      if (winShade) h.shade(ctx, P.X(winShade[0]), P.y, P.X(winShade[1]) - P.X(winShade[0]), P.h, winShade[2], 0.07);

      STAG.groups.forEach(function (G, gi) {
        var dim = on[gi] ? 1 : 0.18;
        var pts = [], pts0 = [];
        for (var yr = 1; yr <= STAG.T; yr++) { pts.push([yr, STAG.y(G, yr)]); if (G.g && yr >= G.g - 1) pts0.push([yr, STAG.y0(G, yr)]); }
        // effect area
        if (G.g) {
          var eA = prog(t, 9.4, 10.4) * dim;
          if (eA > 0) {
            ctx.save(); ctx.globalAlpha *= eA * 0.45; ctx.fillStyle = C.effect; ctx.beginPath();
            var s = G.g - 1;
            ctx.moveTo(P.X(s), P.Y(STAG.y0(G, s)));
            for (var y1 = s; y1 <= STAG.T; y1++) ctx.lineTo(P.X(y1), P.Y(STAG.y(G, y1)));
            for (var y2 = STAG.T; y2 >= s; y2--) ctx.lineTo(P.X(y2), P.Y(STAG.y0(G, y2)));
            ctx.closePath(); ctx.fill(); ctx.restore();
            h.path(ctx, P.P(pts0), prog(t, 9.4, 10.6), { color: G.color, lw: 2, dash: [6, 6], a: dim * 0.8 });
          }
          h.line(ctx, P.X(G.g - 0.5), P.y + 8, P.X(G.g - 0.5), P.y + P.h, { color: G.color, lw: 1.5, dash: [3, 6], a: axA * dim * 0.8 });
        }
        h.path(ctx, P.P(pts), prog(t, 3.2 + gi * 0.9, 5 + gi * 0.9), { color: G.color, lw: 4, a: dim });
        var ly = STAG.y(G, STAG.T);
        h.text(ctx, G.label, P.X(10.5) - 4, P.Y(ly) + (gi === 2 ? 28 : -14), { size: 16, color: G.color, align: 'right', weight: 600, a: prog(t, 5 + gi * 0.9, 5.6 + gi * 0.9) * Math.max(dim, 0.4) });
      });

      // comparison list
      var rx = 760, ry = 140, rh = 64;
      var rows = [
        { s: L('Early vs. never', '早处理 vs 从未处理'), v: twoByTwo(STAG.groups[0], STAG.groups[2], 1, 10, 4), ok: true, t: 20.3 },
        { s: L('Late vs. never', '晚处理 vs 从未处理'), v: twoByTwo(STAG.groups[1], STAG.groups[2], 1, 10, 7), ok: true, t: 23.3 },
        { s: L('Early vs. late, years 1–6', '早处理 vs 晚处理，第 1–6 年'), v: twoByTwo(STAG.groups[0], STAG.groups[1], 1, 6, 4), ok: true, t: 26.3 },
        { s: L('Late vs. early, years 4–10', '晚处理 vs 早处理，第 4–10 年'), v: twoByTwo(STAG.groups[1], STAG.groups[0], 4, 10, 7), ok: false, t: 38.3 }
      ];
      var lA = prog(t, 15.2, 16);
      h.text(ctx, L('2×2 comparisons inside TWFE', 'TWFE 内含的 2×2 比较'), rx, ry - 14, { size: 18, color: C.muted, a: lA });
      rows.forEach(function (r, i) {
        var a = prog(t, 15.4 + i * 0.4, 16 + i * 0.4), yy = ry + i * rh;
        var hi = (phase === 1 && i === 0) || (phase === 2 && i === 1) || (phase === 3 && i === 2) || (phase === 4 && i === 3);
        h.box(ctx, rx, yy, 460, rh - 10, { fill: hi ? (r.ok ? 'rgba(123,211,137,0.14)' : 'rgba(239,111,108,0.16)') : C.panel, r: 10, a: a });
        h.text(ctx, r.s, rx + 18, yy + 34, { size: 18, a: a });
        var va = prog(t, r.t, r.t + 0.5);
        num(ctx, r.v, rx + 390, yy + 35, { d: 2, align: 'right', size: 20, color: r.ok ? C.text : C.bad, weight: r.ok ? 400 : 700, a: va });
        if (r.ok) check(ctx, rx + 428, yy + 27, 9, C.good, prog(t, r.t + 0.2, r.t + 0.7));
        else cross(ctx, rx + 428, yy + 27, 8, C.bad, prog(t, 31.5, 32.2));
      });

      // TWFE vs truth
      var bA = prog(t, 44.2, 45), by = 430, scale = 120;
      h.text(ctx, L('TWFE estimate', 'TWFE 估计'), rx, by + 22, { size: 18, color: C.bad, a: bA });
      h.box(ctx, rx + 170, by + 4, scale * TWFE.b * prog(t, 44.4, 45.6), 26, { fill: C.bad, r: 5, a: bA });
      num(ctx, TWFE.b, rx + 182 + scale * TWFE.b, by + 25, { d: 2, align: 'left', size: 19, color: C.bad, a: prog(t, 45.4, 45.9) });
      h.text(ctx, L('True ATT', '真实 ATT'), rx, by + 70, { size: 18, color: C.good, a: bA });
      h.box(ctx, rx + 170, by + 52, scale * TWFE.att * prog(t, 44.8, 46), 26, { fill: C.good, r: 5, a: bA });
      num(ctx, TWFE.att, rx + 182 + scale * TWFE.att, by + 73, { d: 2, align: 'left', size: 19, color: C.good, a: prog(t, 45.8, 46.3) });
    }
  });

  // ------------------------------------------------------------------ 6
  scene({
    id: 'csdid', stata: ['csdid', 'xthdidregress'], dur: 50,
    title: { en: 'Callaway & Sant’Anna', zh: 'Callaway & Sant’Anna 估计量' },
    sub: { en: 'Many clean 2×2s, one for each cohort and year', zh: '为每个处理批次和年份做一次干净的 2×2 比较' },
    beats: [
      { t: 2.6, en: 'Callaway & Sant’Anna (2021) split the problem into many clean 2×2 comparisons: one for each cohort g and year t.', zh: 'Callaway & Sant’Anna（2021）把问题拆成许多干净的 2×2 比较：每个处理批次 g 和每个年份 t 各一个。' },
      { t: 9, en: 'ATT(g,t) compares cohort g’s change since its last untreated year, g−1, with the same change for never-treated or not-yet-treated units.', zh: 'ATT(g,t) 把批次 g 从最后一个未处理年份 g−1 起的变化，与从未处理或尚未处理个体的同期变化相比较。' },
      { t: 17, en: 'Example: ATT(4,6) takes cohort 4’s change from year 3 to year 6, minus the never-treated group’s change: 2.25 − 0.75 = 1.5.', zh: '例如 ATT(4,6)：批次 4 从第 3 年到第 6 年的变化，减去从未处理组同期的变化：2.25 − 0.75 = 1.5。' },
      { t: 24, en: 'Repeat for every cohort and year. An already-treated unit is never used as a control.', zh: '对每个批次和年份重复这一步。已经接受处理的个体从不被用作对照。' },
      { t: 31, en: 'Then aggregate. Averaging the cells with the same time since adoption gives an event study…', zh: '然后加总。把处理后时间相同的格子取平均，就得到事件研究图……' },
      { t: 39, en: '…or a single overall ATT that weights cohorts by size: ' + TWFE.att.toFixed(2) + ', exactly the true average effect.', zh: '……或者按批次规模加权得到一个总体 ATT：' + TWFE.att.toFixed(2) + '，恰好等于真实平均效应。' },
      { t: 45, en: 'Stata: csdid (doubly robust by default), or the official xthdidregress in Stata 18 and later.', zh: 'Stata：csdid（默认双重稳健），或 Stata 18 及以后版本自带的 xthdidregress。' }
    ],
    draw: function (ctx, t) {
      var gx = 190, gy = 180, cs = 50, gap = 5, cohorts = [4, 7];
      var hA = prog(t, 2.8, 3.6);
      h.text(ctx, L('Year t', '年份 t'), gx + 5 * (cs + gap), gy - 50, { size: 17, color: C.muted, align: 'center', italic: true, a: hA });
      for (var yr = 1; yr <= 10; yr++) h.text(ctx, String(yr), gx + (yr - 1) * (cs + gap) + cs / 2, gy - 14, { size: 16, mono: true, color: C.muted, align: 'center', a: hA });
      cohorts.forEach(function (g, ri) {
        h.text(ctx, 'g = ' + g, gx - 18, gy + ri * (cs + gap) + cs / 2 + 6, { size: 18, mono: true, color: ri ? C.purple : C.treat, align: 'right', a: hA });
      });
      var order = 0, total = 11;
      cohorts.forEach(function (g, ri) {
        for (var yr = 1; yr <= 10; yr++) {
          var x = gx + (yr - 1) * (cs + gap), y = gy + ri * (cs + gap);
          if (yr < g) {
            h.box(ctx, x, y, cs, cs, { stroke: C.faint, lw: 1, dash: [3, 4], r: 6, a: hA * 0.8 });
            continue;
          }
          var v = STAG.tau(g, yr);
          var isEx = g === 4 && yr === 6;
          var fillT = isEx ? 19.5 : 24.4 + (order++) * (4.2 / total);
          var a = prog(t, fillT, fillT + 0.4);
          var e = yr - g;
          var diag = t >= 31 && t < 39 ? prog(t, 31.4 + e * 1.0, 31.8 + e * 1.0) * (1 - prog(t, 32.2 + e * 1.0, 32.6 + e * 1.0)) : 0;
          h.box(ctx, x, y, cs, cs, { fill: C.effect, r: 6, a: a * (0.25 + 0.6 * v / 3.5) });
          h.text(ctx, v.toFixed(1), x + cs / 2, y + cs / 2 + 6, { size: 16, mono: true, align: 'center', color: v > 2 ? C.bg : C.text, a: a });
          if (diag > 0) h.box(ctx, x - 3, y - 3, cs + 6, cs + 6, { stroke: C.text, lw: 2.5, r: 8, a: diag });
        }
      });
      // formula
      var fA = prog(t, 9.3, 10);
      h.box(ctx, gx - 120, 352, 670, 92, { fill: C.panel, r: 12, a: fA });
      h.text(ctx, 'ATT(g,t) = Δ' + L('cohort g', '批次 g') + ' − Δ' + L('controls', '对照组'), gx + 215, 388, { size: 22, mono: LANG_mono(), align: 'center', a: fA });
      h.text(ctx, L('Δ = change from year g−1 to year t', 'Δ = 从第 g−1 年到第 t 年的变化'), gx + 215, 424, { size: 17, color: C.muted, align: 'center', a: fA });
      // worked example
      var exA = prog(t, 17.3, 18) * (1 - prog(t, 30.5, 31));
      var bx = gx + 2 * (cs + gap), tx = gx + 5 * (cs + gap);
      h.box(ctx, bx - 3, gy - 3, cs + 6, cs + 6, { stroke: C.ctrl, lw: 3, r: 8, a: exA });
      h.box(ctx, tx - 3, gy - 3, cs + 6, cs + 6, { stroke: C.effect, lw: 3, r: 8, a: exA });
      ctx.save(); ctx.globalAlpha *= exA;
      var ay = gy + 2 * (cs + gap) + 12;
      h.line(ctx, bx + cs / 2, ay - 8, bx + cs / 2, ay + 8, { color: C.ctrl, lw: 2 });
      h.arrow(ctx, bx + cs / 2, ay, tx + cs / 2, ay, { color: C.text, lw: 2, head: 9, p: prog(t, 17.6, 18.6) });
      ctx.restore();
      h.text(ctx, L('from base year g−1 = 3 to year 6', '从基期 g−1 = 3 到第 6 年'), bx, ay + 26, { size: 16, color: C.ctrl, a: exA });
      h.text(ctx, '(2.25) − (0.75) = 1.5', gx + 215, 484, { size: 22, mono: true, color: C.effect, align: 'center', a: exA });
      h.text(ctx, L('cohort 4: year 3 → 6     never treated: year 3 → 6', '批次 4：第 3 → 6 年     从未处理组：第 3 → 6 年'), gx + 215, 516, { size: 16, color: C.muted, align: 'center', a: exA });

      // event-study aggregation
      var P = new h.Plot(800, 150, 400, 300, -0.6, 6.6, 0, 4);
      var pA = prog(t, 31, 31.8);
      P.axes(ctx, { a: pA, xt: [0, 1, 2, 3, 4, 5, 6].map(function (v) { return [v, String(v)]; }), yt: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], xlabel: L('Years since adoption', '处理后的年数'), ylabel: 'ATT' });
      var pts = [];
      for (var e = 0; e <= 6; e++) {
        var v = 0.5 * (e + 1), a = prog(t, 31.6 + e * 1.0, 32.1 + e * 1.0);
        h.dot(ctx, P.X(e), P.Y(v), 8, { color: C.effect, a: a });
        if (a > 0) pts.push([P.X(e), P.Y(v)]);
      }
      h.path(ctx, pts, 1, { color: C.effect, lw: 2, a: 0.6 });
      var oA = prog(t, 39.3, 40);
      h.box(ctx, 800, 500, 400, 64, { fill: 'rgba(123,211,137,0.14)', r: 12, a: oA });
      h.text(ctx, L('Overall ATT = ', '总体 ATT = ') + TWFE.att.toFixed(2), 830, 541, { size: 24, mono: LANG_mono(), color: C.good, weight: 700, a: oA });
      check(ctx, 1170, 532, 10, C.good, prog(t, 40, 40.6));
      h.text(ctx, L('TWFE gave ', 'TWFE 为 ') + TWFE.b.toFixed(2), 1000, 590, { size: 16, color: C.muted, align: 'center', a: oA * 0.8 * (1 - prog(t, 44.5, 45)) });
    }
  });
  function LANG_mono() { return D.lang() !== 'zh'; }

  // ------------------------------------------------------------------ 7
  // Pooled event-study regression on a panel with heterogeneous cohort effects, solved exactly.
  var SA = (function () {
    var groups = [
      { g: 5, a: 3, s: 0.8, n: 0.4 },
      { g: 7, a: 2, s: 0.3, n: 0.6 },
      { g: 0, a: 1, s: 0, n: 0.5 }
    ];
    var T = 10, E = [-6, -5, -4, -3, -2, 0, 1, 2, 3, 4, 5];
    var rows = [];
    groups.forEach(function (G) {
      for (var t = 1; t <= T; t++) {
        var e = G.g ? t - G.g : null;
        rows.push({ G: G, t: t, e: e, y: G.a + 0.3 * t + (G.g && t >= G.g ? G.s * (e + 1) : 0) });
      }
    });
    var X = rows.map(function (r) {
      var v = groups.map(function (G) { return r.G === G ? 1 : 0; });
      for (var t = 2; t <= T; t++) v.push(r.t === t ? 1 : 0);
      E.forEach(function (e) { v.push(r.e === e ? 1 : 0); });
      return v;
    });
    var k = X[0].length, A = [], b = [], i, j, r;
    for (i = 0; i < k; i++) { A.push(new Array(k).fill(0)); b.push(0); }
    rows.forEach(function (row, n) {
      var w = row.G.n;
      for (i = 0; i < k; i++) { b[i] += w * X[n][i] * row.y; for (j = 0; j < k; j++) A[i][j] += w * X[n][i] * X[n][j]; }
    });
    for (i = 0; i < k; i++) A[i].push(b[i]);
    for (var c = 0; c < k; c++) {
      var p = c;
      for (r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      var tmp = A[c]; A[c] = A[p]; A[p] = tmp;
      for (r = 0; r < k; r++) if (r !== c) { var f = A[r][c] / A[c][c]; for (j = c; j <= k; j++) A[r][j] -= f * A[c][j]; }
    }
    var beta = A.map(function (row, n) { return row[k] / row[n]; });
    var pooled = {};
    E.forEach(function (e, n) { pooled[e] = beta[k - E.length + n]; });
    pooled[-1] = 0;
    return { pooled: pooled, sA: 0.4 / (0.4 + 0.6), sB: 0.6 / (0.4 + 0.6) };
  })();
  D.SA = SA;
  scene({
    id: 'sunab', stata: ['eventstudyinteract'], dur: 40,
    title: { en: 'Sun & Abraham', zh: 'Sun & Abraham 估计量' },
    sub: { en: 'Event studies one cohort at a time', zh: '分批次估计事件研究' },
    beats: [
      { t: 2.6, en: 'A pooled event-study regression mixes cohorts. With heterogeneous effects, leads and lags pick up effects from other horizons (Sun & Abraham 2021).', zh: '混合各批次的事件研究回归，在效应异质时，前导项和滞后项会混入其他时期的效应（Sun & Abraham 2021）。' },
      { t: 10, en: 'Here the pooled regression (grey) shows a pre-trend, although nobody anticipated the policy, and it distorts the effects after adoption.', zh: '这里混合回归（灰色）显示出处理前趋势，尽管没有人预期到政策；处理后的效应也被扭曲了。' },
      { t: 17, en: 'Fix: estimate a separate event study for each cohort, using only a clean control cohort such as the never treated.', zh: '解决办法：为每个批次单独估计事件研究，只用干净的对照批次，例如从未处理组。' },
      { t: 24, en: 'Then average across cohorts at each horizon, weighting by each cohort’s share of the units observed at that horizon: here 40% and 60%.', zh: '然后在每个时期对各批次取平均，权重是该批次在这一时期观测个体中的占比：这里分别为 40% 和 60%。' },
      { t: 31, en: 'The interaction-weighted estimate (gold) is flat before adoption and recovers the average effect after it.', zh: '交互加权估计（金色）在处理前保持平坦，处理后则还原出平均效应。' },
      { t: 36, en: 'Stata: eventstudyinteract.', zh: 'Stata：eventstudyinteract。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(130, 110, 760, 390, -4.6, 3.6, -0.5, 3.5);
      var axA = prog(t, 2.6, 3.4), ks = [-4, -3, -2, -1, 0, 1, 2, 3];
      P.axes(ctx, { a: axA, xt: ks.map(function (k) { return [k, k < 0 ? '−' + Math.abs(k) : String(k)]; }), yt: [[0, '0.0'], [1, '1.0'], [2, '2.0'], [3, '3.0']], xlabel: L('Years relative to adoption', '相对于处理的年份'), ylabel: L('Estimated effect', '估计效应') });
      P.zero(ctx, axA);
      h.line(ctx, P.X(-0.5), P.y, P.X(-0.5), P.y + P.h, { color: C.faint, lw: 1.5, dash: [4, 6], a: axA });
      // pooled
      var gA = prog(t, 4, 5) * (1 - 0.65 * prog(t, 31, 32));
      var gp = P.P(ks.map(function (k) { return [k, SA.pooled[k]]; }));
      h.path(ctx, gp, prog(t, 4, 7), { color: C.muted, lw: 3, a: gA });
      ks.forEach(function (k, i) { h.dot(ctx, gp[i][0], gp[i][1], 6, { color: C.muted, a: gA * prog(t, 4 + i * 0.35, 4.4 + i * 0.35) }); });
      h.shade(ctx, P.X(-4.5), P.Y(0.35), P.X(-1.2) - P.X(-4.5), P.Y(-0.12) - P.Y(0.35), C.bad, 0.14 * prog(t, 10.3, 11) * (1 - prog(t, 30, 31)));
      h.text(ctx, L('spurious pre-trend', '虚假的处理前趋势'), P.X(-2.85), P.Y(0.35) - 10, { size: 16, color: C.bad, align: 'center', a: prog(t, 10.5, 11.2) * (1 - prog(t, 30, 31)) });
      // cohort-specific
      function cohort(sl, col, t0, lab, ly) {
        var pts = ks.map(function (k) { return [k, k < 0 ? 0 : sl * (k + 1)]; });
        h.path(ctx, P.P(pts), prog(t, t0, t0 + 2.5), { color: col, lw: 3, a: 0.9 });
        pts.forEach(function (q, i) { h.dot(ctx, P.X(q[0]), P.Y(q[1]), 6, { color: col, a: prog(t, t0 + i * 0.3, t0 + 0.3 + i * 0.3) }); });
        h.text(ctx, lab, P.X(3) + 16, P.Y(ly) + 6, { size: 17, color: col, weight: 600, a: prog(t, t0 + 2.3, t0 + 2.8) });
      }
      cohort(0.8, C.treat, 17.4, L('cohort A', '批次 A'), 3.2);
      cohort(0.3, C.purple, 18.6, L('cohort B', '批次 B'), 1.2);
      // weights
      var wA = prog(t, 24.3, 25);
      h.box(ctx, 940, 150, 280, 150, { fill: C.panel, r: 12, a: wA });
      h.text(ctx, L('Cohort shares', '批次占比'), 960, 182, { size: 17, color: C.muted, a: wA });
      [[L('cohort A', '批次 A'), SA.sA, C.treat], [L('cohort B', '批次 B'), SA.sB, C.purple]].forEach(function (r, i) {
        var y = 210 + i * 42;
        h.text(ctx, r[0], 960, y + 18, { size: 17, color: r[2], a: wA });
        h.box(ctx, 1060, y + 2, 110 * r[1] * prog(t, 24.6 + i * 0.3, 25.6 + i * 0.3), 22, { fill: r[2], r: 4, a: wA });
        h.text(ctx, Math.round(r[1] * 100) + '%', 1060 + 110 * r[1] + 8, y + 19, { size: 16, mono: true, color: C.text, a: prog(t, 25.4, 25.9) });
      });
      // interaction-weighted average
      var iw = ks.map(function (k) { return [k, k < 0 ? 0 : (SA.sA * 0.8 + SA.sB * 0.3) * (k + 1)]; });
      h.path(ctx, P.P(iw), prog(t, 26.5, 29.5), { color: C.effect, lw: 5 });
      iw.forEach(function (q, i) { h.dot(ctx, P.X(q[0]), P.Y(q[1]), 8, { color: C.effect, a: prog(t, 26.5 + i * 0.35, 26.9 + i * 0.35) }); });
      var lgA = prog(t, 27, 28);
      h.box(ctx, 940, 320, 280, 96, { fill: C.panel, r: 12, a: lgA });
      h.line(ctx, 960, 354, 990, 354, { color: C.muted, lw: 3, a: lgA });
      h.text(ctx, L('pooled TWFE', '混合 TWFE'), 1002, 360, { size: 17, color: C.muted, a: lgA });
      h.line(ctx, 960, 390, 990, 390, { color: C.effect, lw: 5, a: lgA });
      h.text(ctx, L('interaction-weighted', '交互加权'), 1002, 396, { size: 17, color: C.effect, a: lgA });
    }
  });

  // ------------------------------------------------------------------ 8
  var IMP = {
    lam: function (t) { return 0.25 * t + 0.35 * Math.sin(1.3 * t); }
  };
  IMP.y0 = function (G, t) { return G.a + IMP.lam(t); };
  IMP.y = function (G, t) { return IMP.y0(G, t) + STAG.tau(G.g, t); };
  scene({
    id: 'imputation', stata: ['did_imputation', 'did2s', 'jwdid'], dur: 44,
    title: { en: 'Imputation and two-stage DiD', zh: '插补法与两阶段双重差分' },
    sub: { en: 'Predict the untreated outcome, then compare', zh: '先预测未处理时的结果，再作比较' },
    beats: [
      { t: 2.6, en: 'Imputation estimators (Borusyak, Jaravel & Spiess 2024) start from the observations that are not yet treated: the filled dots.', zh: '插补估计量（Borusyak, Jaravel & Spiess 2024）从尚未接受处理的观测值出发，也就是实心点。' },
      { t: 9, en: 'Step 1: fit unit and year fixed effects using only those untreated observations.', zh: '第一步：只用这些未处理的观测值，估计个体固定效应和年份固定效应。' },
      { t: 16, en: 'Step 2: extend the fit into the treated years to impute each unit’s outcome without treatment, Y(0).', zh: '第二步：把拟合结果延伸到处理后的年份，插补出每个个体未接受处理时的结果 Y(0)。' },
      { t: 23, en: 'Step 3: each treated observation’s effect is its observed outcome minus the imputed Y(0).', zh: '第三步：每个处理后观测值的效应，等于观测结果减去插补的 Y(0)。' },
      { t: 30, en: 'Average these gaps by years since adoption, or overall. Treated observations never serve as controls.', zh: '按处理后的年数或整体对这些差距取平均。处理后的观测值从不充当对照。' },
      { t: 37, en: 'Gardner’s two-stage DiD (did2s) and Wooldridge’s extended TWFE (jwdid) give the same point estimates in this setting.', zh: '在这一设定下，Gardner 的两阶段双重差分（did2s）和 Wooldridge 的扩展 TWFE（jwdid）给出相同的点估计。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(100, 110, 620, 390, 0.5, 10.5, 0, 11.5);
      var axA = prog(t, 2.6, 3.4);
      P.axes(ctx, { a: axA, xt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (v) { return [v, String(v)]; }), yt: [0, 2, 4, 6, 8, 10], xlabel: L('Year', '年份'), ylabel: L('Outcome', '结果变量') });
      STAG.groups.forEach(function (G, gi) {
        var last = G.g ? G.g - 1 : 10;
        var fit = [], ext = [];
        for (var yr = 1; yr <= 10; yr++) { if (yr <= last) fit.push([yr, IMP.y0(G, yr)]); if (G.g && yr >= last) ext.push([yr, IMP.y0(G, yr)]); }
        h.path(ctx, P.P(fit), prog(t, 9.4 + gi * 0.6, 11.5 + gi * 0.6), { color: G.color, lw: 2.5, a: 0.9 });
        h.path(ctx, P.P(ext), prog(t, 16.4 + gi * 0.6, 18.4 + gi * 0.6), { color: G.color, lw: 2.5, dash: [7, 6], a: 0.9 });
        for (yr = 1; yr <= 10; yr++) {
          var treated = G.g && yr >= G.g, x = P.X(yr), y = P.Y(IMP.y(G, yr));
          var a = prog(t, 3.2 + gi * 0.5 + yr * 0.08, 3.6 + gi * 0.5 + yr * 0.08);
          if (treated) {
            var gapA = prog(t, 23.3 + (yr - G.g) * 0.25 + gi * 0.4, 23.8 + (yr - G.g) * 0.25 + gi * 0.4);
            h.line(ctx, x, P.Y(IMP.y0(G, yr)), x, y, { color: C.effect, lw: 4, p: gapA });
            h.dot(ctx, x, y, 6, { hollow: gapA < 0.5, color: G.color, a: a * (0.45 + 0.55 * prog(t, 23, 24)) });
          } else {
            h.dot(ctx, x, y, 6, { color: G.color, a: a });
          }
        }
        h.text(ctx, G.label, P.X(10.5) + 10, P.Y(IMP.y(G, 10)) + 6, { size: 15, color: G.color, a: prog(t, 4.5, 5.2) });
      });
      // horizon averages
      var B = new h.Plot(880, 170, 320, 260, -0.6, 6.6, 0, 4), bA = prog(t, 30.3, 31);
      B.axes(ctx, { a: bA, xt: [0, 1, 2, 3, 4, 5, 6].map(function (v) { return [v, String(v)]; }), yt: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], xlabel: L('Years since adoption', '处理后的年数'), ylabel: L('Average gap', '平均差距') });
      for (var e = 0; e <= 6; e++) {
        var v = 0.5 * (e + 1), p = prog(t, 30.6 + e * 0.3, 31.4 + e * 0.3);
        h.box(ctx, B.X(e) - 14, B.Y(v * p), 28, B.Y(0) - B.Y(v * p), { fill: C.effect, r: 3, a: bA * 0.9 });
      }
      h.text(ctx, L('overall ', '总体 ') + TWFE.att.toFixed(2), 1040, 520, { size: 22, mono: LANG_mono(), color: C.effect, weight: 700, align: 'center', a: prog(t, 33, 33.6) });
    }
  });

  // ------------------------------------------------------------------ 9
  var STK = {
    rows: [
      { g: 4, c: C.treat }, { g: 4, c: C.treat }, { g: 6, c: C.purple }, { g: 6, c: C.purple },
      { g: 8, c: C.teal }, { g: 8, c: C.teal }, { g: 0, c: C.ctrl }, { g: 0, c: C.ctrl }
    ],
    rowLabel: function (g) { return g ? L('cohort ', '批次 ') + g : L('never', '从未处理'); }
  };
  STK.stack = function (g) {
    var rows = [];
    STK.rows.forEach(function (r, i) { if (r.g === g || r.g === 0 || r.g > g + 2) rows.push(i); });
    return rows;
  };
  scene({
    id: 'stacked', stata: ['stackedev'], dur: 42,
    title: { en: 'Stacked DiD', zh: '堆叠双重差分' },
    sub: { en: 'One clean experiment per adoption date', zh: '每个处理时点构造一个干净的实验' },
    beats: [
      { t: 2.6, en: 'Stacked DiD builds one clean experiment for each adoption date, then pools them. Coloured cells are treated years.', zh: '堆叠双重差分为每个处理时点构造一个干净的实验，再把它们合并。彩色格子表示已接受处理的年份。' },
      { t: 8, en: 'Take the year-4 cohort and a window from 2 years before to 2 years after adoption.', zh: '选取第 4 年接受处理的批次，以及从处理前 2 年到处理后 2 年的时间窗口。' },
      { t: 13, en: 'Add controls that stay untreated throughout that window: the year-8 cohort and the never treated. The year-6 cohort is dropped.', zh: '加入在整个窗口内都未接受处理的对照：第 8 年批次和从未处理组。第 6 年批次被剔除。' },
      { t: 20, en: 'Do the same for the year-6 and year-8 cohorts, each with its own clean controls.', zh: '对第 6 年和第 8 年批次做同样的处理，各自配上干净的对照。' },
      { t: 27, en: 'Align the stacks on event time and pile them into one dataset.', zh: '按事件时间对齐这些子数据集，堆叠成一个数据集。' },
      { t: 33, en: 'Estimate one regression with stack-specific unit and time fixed effects (Cengiz et al. 2019). Wing, Freedman & Hollingsworth (2024) add weights so it targets a clear average.', zh: '用含有子数据集特定个体和时间固定效应的回归一次估计（Cengiz 等 2019）。Wing, Freedman & Hollingsworth（2024）加入权重，使其对应明确的平均效应。' }
    ],
    draw: function (ctx, t) {
      var gx = 210, gy = 150, cw = 42, rh = 32, aA = prog(t, 2.8, 3.6);
      for (var yr = 1; yr <= 10; yr++) h.text(ctx, String(yr), gx + (yr - 1) * cw + cw / 2, gy - 14, { size: 15, mono: true, color: C.muted, align: 'center', a: aA });
      h.text(ctx, L('Year', '年份'), gx + 5 * cw, gy - 44, { size: 16, color: C.muted, align: 'center', italic: true, a: aA });
      var stacks = [{ g: 4, t0: 8.3, c: C.treat }, { g: 6, t0: 20.3, c: C.purple }, { g: 8, t0: 23.3, c: C.teal }];
      var dropped = function (i) {
        if (t < 13.3 || t >= 20) return false;
        return STK.stack(4).indexOf(i) < 0;
      };
      STK.rows.forEach(function (r, i) {
        var y = gy + i * rh, dim = dropped(i) ? 0.25 : 1;
        h.text(ctx, STK.rowLabel(r.g), gx - 14, y + rh / 2 + 6, { size: 15, color: r.c, align: 'right', a: aA * dim });
        for (var yr = 1; yr <= 10; yr++) {
          var tr = r.g && yr >= r.g;
          h.box(ctx, gx + (yr - 1) * cw + 2, y + 2, cw - 4, rh - 4, { fill: tr ? r.c : C.panel2, r: 4, a: aA * dim * (tr ? 0.85 : 1) });
        }
        if (dropped(i)) cross(ctx, gx - 128, y + rh / 2, 7, C.bad, prog(t, 14.5, 15.2));
      });
      // window boxes on the grid
      stacks.forEach(function (S, si) {
        var on = si === 0 ? prog(t, S.t0, S.t0 + 0.6) * (1 - prog(t, 19.6, 20.2)) : prog(t, S.t0, S.t0 + 0.6) * (1 - prog(t, S.t0 + 2.6, S.t0 + 3));
        var x0 = gx + (S.g - 3) * cw, w = 5 * cw;
        STK.stack(S.g).forEach(function (i) {
          var isT = STK.rows[i].g === S.g;
          var a = isT ? on : on * (si === 0 ? prog(t, 13.4, 14) : 1);
          h.box(ctx, x0 - 1, gy + i * rh, w + 2, rh, { stroke: isT ? S.c : C.text, lw: 2.5, r: 5, a: a });
        });
      });
      // stacked dataset
      var sx = 820, sy = 150, scw = 46, srh = 16, sgap = 18, yCur = sy;
      var hA = prog(t, 27.3, 28);
      ['−2', '−1', '0', '1', '2'].forEach(function (s, i) { h.text(ctx, s, sx + i * scw + scw / 2, sy - 14, { size: 15, mono: true, color: C.muted, align: 'center', a: hA }); });
      h.text(ctx, L('Event time', '事件时间'), sx + 2.5 * scw, sy - 44, { size: 16, color: C.muted, align: 'center', italic: true, a: hA });
      stacks.forEach(function (S, si) {
        var rows = STK.stack(S.g), p = prog(t, 27.4 + si * 0.8, 29 + si * 0.8);
        var srcX = gx + (S.g - 3) * cw, srcY = gy + rows[0] * rh;
        rows.forEach(function (i, k) {
          var r = STK.rows[i];
          for (var e = -2; e <= 2; e++) {
            var yr = S.g + e, tr = r.g && yr >= r.g;
            var x = h.lerp(srcX + (e + 2) * cw + 2, sx + (e + 2) * scw + 2, p);
            var y = h.lerp(gy + i * rh + 2, yCur + k * srh + 1, p);
            var w = h.lerp(cw - 4, scw - 4, p), hh = h.lerp(rh - 4, srh - 2, p);
            h.box(ctx, x, y, w, hh, { fill: tr ? r.c : C.panel2, r: 3, a: p > 0 ? Math.min(1, p * 3) : 0 });
          }
        });
        h.text(ctx, L('stack ', '子样本 ') + (si + 1) + ' · g = ' + S.g, sx + 5 * scw + 14, yCur + rows.length * srh / 2 + 6, { size: 15, color: S.c, a: prog(t, 29 + si * 0.8, 29.5 + si * 0.8) });
        yCur += rows.length * srh + sgap;
      });
      var rA = prog(t, 33.3, 34);
      h.box(ctx, sx - 10, yCur + 6, 400, 64, { fill: C.panel, r: 10, a: rA });
      h.text(ctx, L('one regression with stack × unit', '一个回归：子样本 × 个体'), sx + 10, yCur + 32, { size: 16, color: C.text, a: rA });
      h.text(ctx, L('and stack × time fixed effects', '以及子样本 × 时间固定效应'), sx + 10, yCur + 56, { size: 16, color: C.text, a: rA });
    }
  });

  // ------------------------------------------------------------------ 10
  var DC = [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1]
  ];
  scene({
    id: 'dcdh', stata: ['did_multiplegt_dyn', 'did_had'], dur: 40,
    title: { en: 'Treatments that switch on, off or change', zh: '可开可关、强度可变的处理' },
    sub: { en: 'de Chaisemartin & D’Haultfœuille', zh: 'de Chaisemartin & D’Haultfœuille 估计量' },
    beats: [
      { t: 2.6, en: 'Many treatments are not one-time, on-forever switches. They can turn off, or change in intensity. Each row is a unit, each column a year.', zh: '许多处理并不是一次开启、永久持续的。它们可能被关闭，强度也可能变化。每一行是一个个体，每一列是一年。' },
      { t: 9.5, en: 'de Chaisemartin & D’Haultfœuille compare switchers with units that had the same treatment at the start and have not switched yet.', zh: 'de Chaisemartin & D’Haultfœuille 把发生切换的个体，与期初处理状态相同且尚未切换的个体相比较。' },
      { t: 16, en: 'Example: unit 1 switches on in year 4. Its controls are the units still at its starting level, 0: units 2, 3, 5 and 6. Unit 4 started treated, so it is excluded.', zh: '例如：个体 1 在第 4 年开启处理。它的对照是仍处于其期初水平 0 的个体：个体 2、3、5、6。个体 4 期初就已接受处理，因此被排除。' },
      { t: 24, en: 'Effects are traced ℓ = 1, 2, … periods after the first switch, as long as not-yet-switched controls remain. The control set shrinks as units switch.', zh: '效应在首次切换后的第 ℓ = 1, 2, … 期逐期估计，只要还有尚未切换的对照。随着个体陆续切换，对照组会变小。' },
      { t: 32, en: 'Placebos compare the same groups before the switch. Stata: did_multiplegt_dyn; for designs where everyone gets some dose, did_had.', zh: '安慰剂检验在切换前比较同样的组。Stata：did_multiplegt_dyn；所有个体都接受一定剂量的设计可用 did_had。' }
    ],
    draw: function (ctx, t) {
      var gx = 190, gy = 150, cw = 46, rh = 44, aA = prog(t, 2.8, 3.6);
      for (var yr = 1; yr <= 10; yr++) h.text(ctx, String(yr), gx + (yr - 1) * cw + cw / 2, gy - 14, { size: 15, mono: true, color: C.muted, align: 'center', a: aA });
      h.text(ctx, L('Year', '年份'), gx + 5 * cw, gy - 44, { size: 16, color: C.muted, align: 'center', italic: true, a: aA });
      // controls for unit 1 at each horizon
      var ell = t < 24.5 ? 1 : Math.min(5, 1 + Math.floor((t - 24.5) / 1.5));
      var year = 3 + ell;
      var exA = prog(t, 16.3, 17) * (1 - prog(t, 31.6, 32));
      var ctrl = [1, 2, 4, 5].filter(function (r) { for (var y = 0; y < year; y++) if (DC[r][y] !== DC[r][0]) return false; return DC[r][0] === 0; });
      DC.forEach(function (row, r) {
        var y = gy + r * rh;
        var isCtrl = ctrl.indexOf(r) >= 0, dim = exA > 0 && r !== 0 && !isCtrl ? 1 - 0.65 * exA : 1;
        h.text(ctx, L('unit ', '个体 ') + (r + 1), gx - 14, y + rh / 2 + 6, { size: 16, color: C.text, align: 'right', a: aA * dim });
        row.forEach(function (d, c) {
          var fill = d === 0 ? C.panel2 : d === 1 ? 'rgba(240,138,93,0.75)' : C.bad;
          var x = gx + c * cw;
          h.box(ctx, x + 2, y + 2, cw - 4, rh - 4, { fill: fill, r: 5, a: aA * dim });
          h.text(ctx, String(d), x + cw / 2, y + rh / 2 + 6, { size: 15, mono: true, color: d ? C.bg : C.faint, align: 'center', a: aA * dim });
          // switch markers
          if (c > 0 && d !== row[c - 1]) {
            var up = d > row[c - 1], mA = prog(t, 10 + r * 0.3, 10.5 + r * 0.3) * dim;
            ctx.save(); ctx.globalAlpha *= mA; ctx.fillStyle = up ? C.effect : C.ctrl; ctx.beginPath();
            var mx = x + 4, my = y + 10;
            if (up) { ctx.moveTo(mx, my + 6); ctx.lineTo(mx + 6, my - 3); ctx.lineTo(mx + 12, my + 6); }
            else { ctx.moveTo(mx, my - 3); ctx.lineTo(mx + 6, my + 6); ctx.lineTo(mx + 12, my - 3); }
            ctx.closePath(); ctx.fill(); ctx.restore();
          }
        });
      });
      if (exA > 0) {
        var x0 = gx + 2 * cw, w = (year - 2) * cw;
        h.box(ctx, x0 - 2, gy - 2, w + 4, rh + 4, { stroke: C.effect, lw: 3, r: 7, a: exA });
        ctrl.forEach(function (r) { h.box(ctx, x0 - 2, gy + r * rh - 2, w + 4, rh + 4, { stroke: C.ctrl, lw: 2.5, r: 7, a: exA }); });
        h.text(ctx, L('different start', '期初不同'), gx + 10 * cw + 14, gy + 3 * rh + rh / 2 + 6, { size: 15, color: C.bad, a: exA * prog(t, 19, 19.6) });
        h.text(ctx, 'ℓ = ' + ell, x0 + w - 4, gy + 6 * rh + 26, { size: 18, mono: true, color: C.effect, align: 'right', a: exA * prog(t, 24.5, 25) });
      }
      // control list
      var lx = 900, lA = prog(t, 24.5, 25.2) * (1 - prog(t, 31.6, 32));
      h.box(ctx, lx - 20, 140, 340, 290, { fill: C.panel, r: 12, a: lA });
      h.text(ctx, L('Controls for unit 1', '个体 1 的对照'), lx, 174, { size: 17, color: C.muted, a: lA });
      for (var k = 1; k <= 5; k++) {
        var yrK = 3 + k, cs = [1, 2, 4, 5].filter(function (r) { for (var y = 0; y < yrK; y++) if (DC[r][y] !== 0) return false; return true; });
        var a = lA * prog(t, 24.5 + (k - 1) * 1.5, 25 + (k - 1) * 1.5);
        h.text(ctx, 'ℓ = ' + k, lx, 212 + (k - 1) * 44, { size: 18, mono: true, color: k === ell ? C.effect : C.text, a: a });
        h.text(ctx, cs.map(function (r) { return r + 1; }).join(', '), lx + 90, 212 + (k - 1) * 44, { size: 18, mono: true, color: C.ctrl, a: a });
        h.text(ctx, L('year ', '第 ') + yrK + L('', ' 年'), lx + 230, 212 + (k - 1) * 44, { size: 15, color: C.muted, a: a });
      }
      // placebo
      var pA = prog(t, 32.3, 33);
      h.box(ctx, gx + 0 * cw - 2, gy - 2, 3 * cw + 4, rh + 4, { stroke: C.purple, lw: 3, r: 7, dash: [6, 5], a: pA });
      h.text(ctx, L('placebo years', '安慰剂年份'), gx + 1.5 * cw, gy + 6 * rh + 26, { size: 16, color: C.purple, align: 'center', a: pA });
    }
  });

  // ------------------------------------------------------------------ 11
  function npdf(x, m, s) { var z = (x - m) / s; return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI)); }
  function ncdf(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)); var d = 0.3989423 * Math.exp(-z * z / 2); var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  var Zq = { 0.1: -1.2816, 0.5: 0, 0.9: 1.2816 };
  var CIC = { c0: [4, 1], c1: [5, 1.3], t0: [5, 1.2] };
  CIC.cf = [CIC.c1[0] + CIC.c1[1] / CIC.c0[1] * (CIC.t0[0] - CIC.c0[0]), CIC.c1[1] / CIC.c0[1] * CIC.t0[1]];
  CIC.actual = function (z) { return CIC.cf[0] + CIC.cf[1] * z + 0.5 + ncdf(z); };
  scene({
    id: 'cic', stata: ['cic'], dur: 39,
    title: { en: 'Changes-in-changes', zh: '变化中的变化（CiC）' },
    sub: { en: 'The whole counterfactual distribution, not just the mean', zh: '还原整个反事实分布，而不只是均值' },
    beats: [
      { t: 2.6, en: 'DiD compares averages. Changes-in-changes (Athey & Imbens 2006) recovers the whole counterfactual distribution.', zh: '双重差分比较的是均值。变化中的变化（Athey & Imbens 2006）可以还原整个反事实分布。' },
      { t: 9, en: 'In the control group, see how each rank of the distribution moved over time: the 10th, 50th and 90th percentiles.', zh: '在对照组中，观察分布的每个分位如何随时间移动：第 10、50、90 百分位。' },
      { t: 16, en: 'Give each treated unit the change that a control unit with the same before-period outcome experienced.', zh: '让每个处理组个体经历与“政策前结果相同的对照组个体”一样的变化。' },
      { t: 23.5, en: 'Compare the actual treated distribution with this counterfactual: there is an effect at every quantile, larger at the top.', zh: '把处理组的实际分布与这一反事实分布比较：每个分位上都有效应，高分位的效应更大。' },
      { t: 31, en: 'Unlike DiD, the answer does not depend on whether the outcome is measured in levels or logs. Stata: cic.', zh: '与双重差分不同，这一结论不依赖于结果变量取水平值还是对数。Stata：cic。' }
    ],
    draw: function (ctx, t) {
      function dens(P, m, s, o) {
        var pts = []; for (var x = P.xmin; x <= P.xmax + 1e-9; x += 0.08) pts.push([x, npdf(x, m, s)]);
        if (o.fill) {
          ctx.save(); ctx.globalAlpha *= (o.a === undefined ? 1 : o.a) * 0.22; ctx.fillStyle = o.color; ctx.beginPath();
          ctx.moveTo(P.X(P.xmin), P.Y(0)); pts.forEach(function (q) { ctx.lineTo(P.X(q[0]), P.Y(q[1])); }); ctx.lineTo(P.X(P.xmax), P.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        h.path(ctx, P.P(pts), o.p === undefined ? 1 : o.p, { color: o.color, lw: o.lw || 3, dash: o.dash, a: o.a });
      }
      var A = new h.Plot(90, 130, 500, 300, 0, 11, 0, 0.45), B = new h.Plot(690, 130, 500, 300, 0, 11, 0, 0.45);
      var aA = prog(t, 2.8, 3.6);
      [[A, L('Control group', '对照组'), C.ctrl], [B, L('Treated group', '处理组'), C.treat]].forEach(function (r) {
        r[0].axes(ctx, { a: aA, xt: [0, 2, 4, 6, 8, 10].map(function (v) { return [v, String(v)]; }), xlabel: L('Outcome', '结果变量') });
        h.text(ctx, r[1], r[0].x, r[0].y - 18, { size: 19, color: r[2], weight: 600, a: aA });
      });
      dens(A, CIC.c0[0], CIC.c0[1], { color: C.ctrl, fill: true, a: prog(t, 3.4, 4.2), p: prog(t, 3.4, 5) });
      dens(A, CIC.c1[0], CIC.c1[1], { color: C.ctrl, lw: 3.5, a: prog(t, 9.3, 10), p: prog(t, 9.3, 11) });
      h.text(ctx, L('before', '政策前'), A.X(CIC.c0[0]), A.Y(npdf(CIC.c0[0], CIC.c0[0], CIC.c0[1])) - 12, { size: 15, color: C.muted, align: 'center', a: prog(t, 4.5, 5) });
      h.text(ctx, L('after', '政策后'), A.X(CIC.c1[0] + 1.4), A.Y(npdf(CIC.c1[0] + 1.4, CIC.c1[0], CIC.c1[1])) - 14, { size: 15, color: C.ctrl, align: 'left', a: prog(t, 10.5, 11) });
      [0.1, 0.5, 0.9].forEach(function (q, i) {
        var x0 = CIC.c0[0] + CIC.c0[1] * Zq[q], x1 = CIC.c1[0] + CIC.c1[1] * Zq[q], yy = A.Y(0.03 + i * 0.045);
        h.arrow(ctx, A.X(x0), yy, A.X(x1), yy, { color: C.text, lw: 2, head: 8, p: prog(t, 11.5 + i * 0.6, 12.5 + i * 0.6) });
        h.text(ctx, 'q' + Math.round(q * 100), A.X(x0) - 6, yy + 5, { size: 13, mono: true, color: C.muted, align: 'right', a: prog(t, 11.5 + i * 0.6, 12 + i * 0.6) });
        var x2 = CIC.t0[0] + CIC.t0[1] * Zq[q], x3 = CIC.cf[0] + CIC.cf[1] * Zq[q], y2 = B.Y(0.03 + i * 0.045);
        h.arrow(ctx, B.X(x2), y2, B.X(x3), y2, { color: C.cf, lw: 2, head: 8, p: prog(t, 17.5 + i * 0.6, 18.5 + i * 0.6) });
        h.text(ctx, 'q' + Math.round(q * 100), B.X(x2) - 6, y2 + 5, { size: 13, mono: true, color: C.muted, align: 'right', a: prog(t, 17.5 + i * 0.6, 18 + i * 0.6) });
      });
      dens(B, CIC.t0[0], CIC.t0[1], { color: C.treat, fill: true, a: prog(t, 3.8, 4.6), p: prog(t, 3.8, 5.4) });
      h.text(ctx, L('before', '政策前'), B.X(CIC.t0[0]), B.Y(npdf(CIC.t0[0], CIC.t0[0], CIC.t0[1])) - 12, { size: 15, color: C.muted, align: 'center', a: prog(t, 5, 5.5) });
      dens(B, CIC.cf[0], CIC.cf[1], { color: C.cf, lw: 2.5, dash: [8, 6], a: prog(t, 19.5, 20.2), p: prog(t, 19.5, 21.5) });
      h.text(ctx, L('counterfactual', '反事实'), B.X(CIC.cf[0] - 2.2), B.Y(npdf(CIC.cf[0] - 2.2, CIC.cf[0], CIC.cf[1])) - 30, { size: 15, color: C.cf, align: 'right', italic: true, a: prog(t, 21, 21.6) });
      // actual treated after: transformed normal
      var pts = [];
      for (var z = -3.2; z <= 3.2; z += 0.05) { var x = CIC.actual(z), dx = CIC.cf[1] + npdf(z, 0, 1); pts.push([x, npdf(z, 0, 1) / dx]); }
      h.path(ctx, B.P(pts), prog(t, 24, 26), { color: C.treat, lw: 3.5, a: prog(t, 23.8, 24.4) });
      h.text(ctx, L('actual after', '实际（政策后）'), B.X(CIC.actual(1.3)) + 8, B.Y(npdf(1.3, 0, 1) / (CIC.cf[1] + npdf(1.3, 0, 1))) - 8, { size: 15, color: C.treat, a: prog(t, 25.5, 26) });
      var qA = prog(t, 26.5, 27.2);
      h.box(ctx, 690, 506, 500, 50, { fill: C.panel, r: 10, a: qA });
      [0.1, 0.5, 0.9].forEach(function (q, i) {
        h.text(ctx, 'q' + Math.round(q * 100) + '  +' + (0.5 + ncdf(Zq[q])).toFixed(1), 760 + i * 160, 538, { size: 19, mono: true, color: C.effect, weight: 600, a: prog(t, 26.8 + i * 0.4, 27.3 + i * 0.4) });
      });
    }
  });

  // ------------------------------------------------------------------ 12
  var SY = {
    a: [3, 6, 2, 7, 4.5], b: [0.10, 0.35, 0.45, -0.05, 0.25], w: [0, 0.5, 0.3, 0, 0.2], T0: 8, T: 12,
    c: function (j, t) { return SY.a[j] + SY.b[j] * t + 0.3 * Math.sin(0.8 * t) + 0.15 * Math.sin(1.1 * t + 1.7 * j); },
    eff: function (t) { return t >= SY.T0 ? 0.45 * (t - SY.T0 + 1) : 0; }
  };
  SY.treated = function (t) { var s = 0; for (var j = 0; j < 5; j++) s += SY.w[j] * SY.c(j, t); return s + SY.eff(t); };
  SY.synth = function (t, wts) { var s = 0; for (var j = 0; j < 5; j++) s += wts[j] * SY.c(j, t); return s; };
  scene({
    id: 'sdid', stata: ['sdid', 'synth'], dur: 40,
    title: { en: 'Synthetic control and synthetic DiD', zh: '合成控制法与合成双重差分' },
    sub: { en: 'Build a comparison unit that tracks the treated one', zh: '构造一个与处理个体走势一致的对照' },
    beats: [
      { t: 2.6, en: 'One treated unit and a pool of potential controls. Their simple average (dashed) does not follow the treated unit before treatment.', zh: '一个处理个体和一组潜在对照。对照的简单平均（虚线）在处理前与处理个体的走势并不一致。' },
      { t: 9.5, en: 'Synthetic control chooses weights on control units so that their weighted average tracks the treated unit before treatment (Abadie et al. 2010).', zh: '合成控制法为对照个体选择权重，使其加权平均在处理前紧跟处理个体（Abadie 等 2010）。' },
      { t: 18, en: 'After treatment, the gap between the treated unit and its synthetic twin is the estimated effect.', zh: '处理后，处理个体与其“合成孪生体”之间的差距就是估计的效应。' },
      { t: 25, en: 'Synthetic DiD (Arkhangelsky et al. 2021) also weights the pre-treatment years and allows a level shift, so it only has to match trends, not levels.', zh: '合成双重差分（Arkhangelsky 等 2021）还对处理前各年加权，并允许水平平移，因此只需匹配趋势，而不必匹配水平。' },
      { t: 33, en: 'Useful with few treated units when no comparison group has parallel trends on its own. Stata: sdid, synth.', zh: '适用于处理个体很少、且没有现成对照组满足平行趋势的情形。Stata：sdid、synth。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(100, 110, 660, 380, 0.5, 12.5, 0, 12.5);
      var aA = prog(t, 2.6, 3.4), yrs = [];
      for (var y = 1; y <= SY.T; y++) yrs.push(y);
      P.axes(ctx, { a: aA, xt: yrs.map(function (v) { return [v, String(v)]; }), yt: [0, 2, 4, 6, 8, 10, 12], xlabel: L('Year', '年份'), ylabel: L('Outcome', '结果变量') });
      h.line(ctx, P.X(SY.T0 - 0.5), P.y + 10, P.X(SY.T0 - 0.5), P.y + P.h, { color: C.faint, lw: 1.5, dash: [4, 6], a: aA });
      h.text(ctx, L('treatment', '处理开始'), P.X(SY.T0 - 0.5) + 8, P.y + 20, { size: 15, color: C.muted, a: aA });
      var wp = prog(t, 10, 15), wts = SY.w.map(function (w) { return h.lerp(0.2, w, wp); });
      for (var j = 0; j < 5; j++) {
        var cw = wts[j];
        h.path(ctx, P.P(yrs.map(function (yy) { return [yy, SY.c(j, yy)]; })), prog(t, 3.2 + j * 0.3, 5 + j * 0.3), { color: C.muted, lw: 1.5 + 4 * cw * wp, a: 0.35 + 0.6 * (wp > 0 ? cw * 1.6 : 0.2) });
      }
      h.path(ctx, P.P(yrs.map(function (yy) { return [yy, SY.synth(yy, [0.2, 0.2, 0.2, 0.2, 0.2])]; })), prog(t, 5.5, 7.5), { color: C.text, lw: 2.5, dash: [8, 6], a: 0.8 * (1 - prog(t, 16, 17)) });
      // gap after treatment
      var gA = prog(t, 18.3, 19.2);
      if (gA > 0) {
        ctx.save(); ctx.globalAlpha *= gA * 0.4; ctx.fillStyle = C.effect; ctx.beginPath();
        var post = yrs.filter(function (yy) { return yy >= SY.T0 - 1; });
        post.forEach(function (yy, i) { var X = P.X(yy), Y = P.Y(SY.treated(yy)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        post.slice().reverse().forEach(function (yy) { ctx.lineTo(P.X(yy), P.Y(SY.synth(yy, SY.w))); });
        ctx.closePath(); ctx.fill(); ctx.restore();
        h.text(ctx, L('effect', '效应'), P.X(11.2), P.Y((SY.treated(11.2) + SY.synth(11.2, SY.w)) / 2) + 6, { size: 17, color: C.effect, weight: 700, align: 'center', a: gA });
      }
      var sA = prog(t, 10, 11);
      h.path(ctx, P.P(yrs.map(function (yy) { return [yy, SY.synth(yy, wts)]; })), 1, { color: C.ctrl, lw: 3.5, a: sA });
      h.path(ctx, P.P(yrs.map(function (yy) { return [yy, SY.treated(yy)]; })), prog(t, 4, 6.5), { color: C.treat, lw: 4.5 });
      h.text(ctx, L('treated', '处理个体'), P.X(12.5) + 8, P.Y(SY.treated(12)) + 6, { size: 15, color: C.treat, weight: 600, a: prog(t, 6, 6.5) });
      h.text(ctx, L('synthetic', '合成对照'), P.X(12.5) + 8, P.Y(SY.synth(12, wts)) + 6, { size: 15, color: C.ctrl, weight: 600, a: sA });
      // weights panel
      var wA = prog(t, 9.8, 10.5), wx = 900;
      h.box(ctx, wx - 20, 130, 330, 230, { fill: C.panel, r: 12, a: wA });
      h.text(ctx, L('Unit weights', '个体权重'), wx, 162, { size: 17, color: C.muted, a: wA });
      for (j = 0; j < 5; j++) {
        var yy2 = 182 + j * 34;
        h.text(ctx, L('control ', '对照 ') + (j + 1), wx, yy2 + 18, { size: 16, a: wA });
        h.box(ctx, wx + 100, yy2 + 4, 140 * wts[j] / 0.5, 18, { fill: C.ctrl, r: 4, a: wA });
        h.text(ctx, wts[j].toFixed(2), wx + 100 + 140 * wts[j] / 0.5 + 8, yy2 + 19, { size: 15, mono: true, color: C.text, a: wA });
      }
      // time weights (SDID)
      var tA = prog(t, 25.3, 26), lam = [0, 0, 0, 0, 0.2, 0.3, 0.5];
      h.box(ctx, wx - 20, 380, 330, 170, { fill: C.panel, r: 12, a: tA });
      h.text(ctx, L('Time weights (SDID)', '时间权重（SDID）'), wx, 412, { size: 17, color: C.muted, a: tA });
      lam.forEach(function (l, i) {
        var bh = 90 * l / 0.5 * prog(t, 25.6 + i * 0.15, 26.4 + i * 0.15);
        h.box(ctx, wx + i * 40, 530 - bh, 28, bh, { fill: C.purple, r: 3, a: tA });
        h.text(ctx, String(i + 1), wx + i * 40 + 14, 546, { size: 13, mono: true, color: C.muted, align: 'center', a: tA });
      });
      // level shift illustration
      var lA = prog(t, 27, 27.7) * (1 - prog(t, 32.5, 33));
      var off = -2 * (1 - prog(t, 28.5, 30));
      h.path(ctx, P.P(yrs.map(function (yy) { return [yy, SY.synth(yy, SY.w) + off]; })), 1, { color: C.purple, lw: 2.5, dash: [5, 5], a: lA });
      h.arrow(ctx, P.X(3), P.Y(SY.synth(3, SY.w) - 2), P.X(3), P.Y(SY.synth(3, SY.w) - 0.2), { color: C.purple, lw: 2, head: 9, a: lA * (1 - prog(t, 30, 30.5)), p: prog(t, 28.3, 29.2) });
      h.text(ctx, L('level shift', '水平平移'), P.X(3) + 10, P.Y(SY.synth(3, SY.w) - 1.4), { size: 15, color: C.purple, a: lA });
    }
  });

  // ------------------------------------------------------------------ 13
  var HD = { pre: { '-4': 0.10, '-3': -0.08, '-2': 0.12, '-1': 0 }, post: [0.6, 0.8, 0.9, 1.0], se: 0.15, jump: 0.2 };
  HD.theta = (HD.post[0] + HD.post[1] + HD.post[2] + HD.post[3]) / 4;
  HD.ci = function (M) { var hw = 1.96 * HD.se + M * HD.jump * 2.5; return [HD.theta - hw, HD.theta + hw]; };
  HD.breakdown = (HD.theta - 1.96 * HD.se) / (HD.jump * 2.5);
  scene({
    id: 'honest', stata: ['honestdid', 'pretrends'], dur: 38,
    title: { en: 'Honest DiD', zh: 'Honest DiD 敏感性分析' },
    sub: { en: 'How big a violation would overturn the result?', zh: '多大的偏离会推翻结论？' },
    beats: [
      { t: 2.6, en: 'Parallel trends cannot be tested after treatment. Honest DiD asks how large a violation would overturn the result (Rambachan & Roth 2023).', zh: '处理后的平行趋势无法检验。Honest DiD 追问：多大的偏离才会推翻结论（Rambachan & Roth 2023）？' },
      { t: 9.5, en: 'Start from the largest jump between consecutive pre-treatment coefficients: here 0.20.', zh: '先找出处理前相邻两期系数之间的最大跳动：这里是 0.20。' },
      { t: 15.5, en: 'Allow each post-treatment jump in the violation to be up to M̄ times that size. The cone shows what M̄ = 1 permits.', zh: '允许处理后每期偏离的跳动最多为它的 M̄ 倍。图中的锥形区域是 M̄ = 1 时允许的范围。' },
      { t: 22.5, en: 'As M̄ grows, the robust confidence interval for the average effect widens. In this illustration it first includes zero near M̄ = ' + HD.breakdown.toFixed(1) + ': the breakdown value.', zh: '随着 M̄ 增大，平均效应的稳健置信区间变宽。在这个示例中，它在 M̄ ≈ ' + HD.breakdown.toFixed(1) + ' 时首次包含零，这就是临界值。' },
      { t: 31.5, en: 'Report this sensitivity plot next to the event study. Stata: honestdid; pretrends checks the power of pre-tests.', zh: '把这张敏感性图与事件研究图一同报告。Stata：honestdid；pretrends 用于检验预检验的统计功效。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(110, 120, 560, 370, -4.6, 3.6, -1.2, 1.8);
      var aA = prog(t, 2.6, 3.4), ks = [-4, -3, -2, -1, 0, 1, 2, 3];
      P.axes(ctx, { a: aA, xt: ks.map(function (k) { return [k, k < 0 ? '−' + Math.abs(k) : String(k)]; }), yt: [[-1, '−1.0'], [0, '0.0'], [1, '1.0']], xlabel: L('Years relative to treatment', '相对于处理的年份'), ylabel: L('Estimated effect', '估计效应') });
      P.zero(ctx, aA);
      h.line(ctx, P.X(-0.5), P.y, P.X(-0.5), P.y + P.h, { color: C.faint, lw: 1.5, dash: [4, 6], a: aA });
      // cone of allowed violations, M = 1
      var cA = prog(t, 16, 17) * (1 - 0.5 * prog(t, 30, 31));
      if (cA > 0) {
        ctx.save(); ctx.globalAlpha *= cA * 0.22; ctx.fillStyle = C.bad; ctx.beginPath();
        ctx.moveTo(P.X(-1), P.Y(0));
        for (var k = 0; k <= 3; k++) ctx.lineTo(P.X(k), P.Y(HD.jump * (k + 1)));
        for (k = 3; k >= 0; k--) ctx.lineTo(P.X(k), P.Y(-HD.jump * (k + 1)));
        ctx.closePath(); ctx.fill(); ctx.restore();
        h.text(ctx, L('allowed violation, M̄ = 1', '允许的偏离，M̄ = 1'), P.X(1.5), P.Y(-0.98), { size: 15, color: C.bad, align: 'center', a: cA });
      }
      ks.forEach(function (k, i) {
        var v = k < 0 ? HD.pre[String(k)] : HD.post[k], col = k < 0 ? C.ctrl : C.treat;
        var a = prog(t, 3.4 + i * 0.35, 3.8 + i * 0.35);
        if (k !== -1) {
          h.line(ctx, P.X(k), P.Y(v - 1.96 * HD.se), P.X(k), P.Y(v + 1.96 * HD.se), { color: col, lw: 2.5, a: a * 0.7 });
          h.dot(ctx, P.X(k), P.Y(v), 7, { color: col, a: a });
        } else h.dot(ctx, P.X(k), P.Y(0), 7, { hollow: true, color: C.text, a: a });
      });
      // largest pre jump
      var jA = prog(t, 9.8, 10.5);
      h.line(ctx, P.X(-3), P.Y(HD.pre['-3']), P.X(-2), P.Y(HD.pre['-2']), { color: C.effect, lw: 4, a: jA, p: prog(t, 9.8, 10.8) });
      h.text(ctx, L('largest jump 0.20', '最大跳动 0.20'), P.X(-2.5), P.Y(0.5), { size: 16, color: C.effect, align: 'center', a: jA });
      // sensitivity plot
      var S = new h.Plot(820, 120, 380, 370, -0.3, 2.3, -1.2, 2.4), sA = prog(t, 22.8, 23.5);
      S.axes(ctx, { a: sA, xt: [0, 0.5, 1, 1.5, 2].map(function (v) { return [v, v.toFixed(1)]; }), yt: [[-1, '−1.0'], [0, '0.0'], [1, '1.0'], [2, '2.0']], xlabel: 'M̄', ylabel: L('Robust 95% CI, average effect', '平均效应的稳健 95% 置信区间') });
      S.zero(ctx, sA);
      [0, 0.5, 1, 1.5, 2].forEach(function (M, i) {
        var ci = HD.ci(M), a = prog(t, 23.4 + i * 0.9, 24 + i * 0.9), bad = ci[0] <= 0;
        var col = bad ? C.bad : C.good;
        h.line(ctx, S.X(M), S.Y(HD.theta), S.X(M), S.Y(ci[0]), { color: col, lw: 4, a: a, p: prog(t, 23.4 + i * 0.9, 24.2 + i * 0.9) });
        h.line(ctx, S.X(M), S.Y(HD.theta), S.X(M), S.Y(ci[1]), { color: col, lw: 4, a: a, p: prog(t, 23.4 + i * 0.9, 24.2 + i * 0.9) });
        h.dot(ctx, S.X(M), S.Y(HD.theta), 6, { color: C.text, a: a });
      });
      var bA = prog(t, 28.5, 29.2);
      h.line(ctx, S.X(HD.breakdown), S.y + 10, S.X(HD.breakdown), S.y + S.h, { color: C.effect, lw: 2, dash: [5, 5], a: bA });
      h.text(ctx, L('breakdown ≈ ', '临界值 ≈ ') + HD.breakdown.toFixed(1), S.X(HD.breakdown) + 8, S.y + 24, { size: 16, color: C.effect, a: bA });
    }
  });

  // ================================================================== extra scenes
  function lazy(fn) { var v, done = false; return function () { if (!done) { v = fn(); done = true; } return v; }; }
  // beat whose text is computed on first use
  function lbeat(t, fn) { var o = { t: t }; Object.defineProperty(o, 'en', { get: function () { return fn().en; } }); Object.defineProperty(o, 'zh', { get: function () { return fn().zh; } }); return o; }
  function pct(v) { return (v * 100).toFixed(1).replace(/\.0$/, '') + '%'; }

  // ------------------------------------------------------------------ John Snow 1855
  // Cholera deaths per 10,000 households: Snow's (1855) Table XII as presented in Cunningham (2021), The Mixtape, Table 9.2.
  var SNOW = { sv: [565, 614], lb: [62, 14] }; // deaths per 10,000 households
  scene({
    id: 'snow', stata: ['didregress'], dur: 36,
    title: { en: 'John Snow, 1855: the first DiD', zh: '约翰·斯诺，1855：最早的双重差分' },
    sub: { en: 'Cholera, the Thames and two water companies', zh: '霍乱、泰晤士河与两家自来水公司' },
    beats: [
      { t: 2.6, en: 'London, 1849 and 1854. Two water companies, Southwark & Vauxhall and Lambeth, supplied households in the same districts.', zh: '伦敦，1849 年和 1854 年。Southwark & Vauxhall 和 Lambeth 两家自来水公司为同一片街区的住户供水。' },
      { t: 8.5, en: 'In 1852 Lambeth moved its intake upstream, above the city’s sewage. Southwark & Vauxhall kept drawing water from the polluted stretch.', zh: '1852 年，Lambeth 把取水口迁到上游，避开了城市污水；Southwark & Vauxhall 仍从受污染的河段取水。' },
      { t: 15, en: 'Cholera deaths per 10,000 households: Southwark & Vauxhall went from 565 to 614, Lambeth from 62 to 14.', zh: '每万户霍乱死亡人数：Southwark & Vauxhall 从 565 升到 614，Lambeth 从 62 降到 14。' },
      { t: 22, en: 'Lambeth’s change (−48) minus Southwark & Vauxhall’s change (+49) is −97 deaths per 10,000 households: a difference in differences.', zh: 'Lambeth 的变化（−48）减去 Southwark & Vauxhall 的变化（+49），等于每万户 −97 人：这就是双重差分。' },
      { t: 29, en: 'Snow (1855) used this comparison to argue that cholera spreads through water, long before germ theory was accepted. Figures: Snow’s Table XII as presented in Cunningham (2021, Table 9.2).', zh: '斯诺（1855）用这一比较论证霍乱经水传播，而那时细菌理论尚未被接受。数据：斯诺的 Table XII，引自 Cunningham（2021，表 9.2）。' }
    ],
    draw: function (ctx, t) {
      // river
      var rA = prog(t, 2.8, 3.6), ry = 140;
      ctx.save(); ctx.globalAlpha *= rA;
      ctx.fillStyle = 'rgba(108,180,238,0.22)'; ctx.beginPath();
      for (var x = 70; x <= 1210; x += 10) ctx.lineTo(x, ry - 16 + 4 * Math.sin(x / 40 + t * 1.2));
      for (x = 1210; x >= 70; x -= 10) ctx.lineTo(x, ry + 16 + 4 * Math.sin(x / 40 + t * 1.2 + 1));
      ctx.closePath(); ctx.fill(); ctx.restore();
      h.text(ctx, L('River Thames', '泰晤士河'), 80, ry - 26, { size: 16, color: C.ctrl, italic: true, a: rA });
      h.arrow(ctx, 560, ry, 640, ry, { color: C.ctrl, lw: 2, head: 9, a: rA * 0.8 });
      h.text(ctx, L('flow', '水流'), 600, ry - 24, { size: 14, color: C.ctrl, align: 'center', a: rA });
      // sewage downstream
      for (var k = 0; k < 18; k++) { var sx = 820 + (k * 53) % 380, sy = ry - 10 + (k * 37) % 20; h.dot(ctx, sx, sy, 3, { color: '#a07a4a', a: rA * 0.9 }); }
      h.text(ctx, L('central London: sewage', '伦敦市中心：污水'), 1010, ry - 26, { size: 15, color: '#c49a6a', align: 'center', a: rA });
      // intakes
      var lx = h.lerp(840, 260, prog(t, 9.2, 12));
      function intake(x, label, col, a) {
        h.line(ctx, x, ry, x, ry + 70, { color: col, lw: 4, a: a });
        h.dot(ctx, x, ry, 7, { color: col, a: a });
        h.box(ctx, x - 92, ry + 70, 184, 36, { fill: C.panel, stroke: col, lw: 2, r: 8, a: a });
        h.text(ctx, label, x, ry + 94, { size: 16, color: col, align: 'center', weight: 600, a: a });
      }
      intake(1100, 'Southwark & Vauxhall', C.ctrl, prog(t, 3.4, 4.2));
      intake(lx, 'Lambeth', C.treat, prog(t, 3.8, 4.6));
      h.text(ctx, L('1852: Lambeth moves upstream', '1852 年：Lambeth 迁往上游'), lx, ry + 132, { size: 15, color: C.treat, align: 'center', a: prog(t, 11, 11.6) });
      // DiD plot
      var P = new h.Plot(130, 330, 440, 200, -0.3, 1.3, 0, 700), pA = prog(t, 15, 15.8);
      P.axes(ctx, { a: pA, xt: [[0, '1849'], [1, '1854']], yt: [0, 200, 400, 600], ylabel: L('Cholera deaths per 10,000 households', '每万户霍乱死亡人数') });
      h.path(ctx, P.P([[0, SNOW.sv[0]], [1, SNOW.sv[1]]]), prog(t, 15.4, 16.6), { color: C.ctrl, lw: 4 });
      h.path(ctx, P.P([[0, SNOW.lb[0]], [1, SNOW.lb[1]]]), prog(t, 16.4, 17.6), { color: C.treat, lw: 4 });
      [[0, SNOW.sv[0], C.ctrl, 15.4], [1, SNOW.sv[1], C.ctrl, 16.5], [0, SNOW.lb[0], C.treat, 16.4], [1, SNOW.lb[1], C.treat, 17.5]].forEach(function (d) {
        h.dot(ctx, P.X(d[0]), P.Y(d[1]), 7, { color: d[2], a: prog(t, d[3], d[3] + 0.3) });
        num(ctx, String(d[1]), P.X(d[0]) + (d[0] ? 16 : -16), P.Y(d[1]) + 6, { size: 17, color: d[2], align: d[0] ? 'left' : 'right', a: prog(t, d[3] + 0.2, d[3] + 0.6) });
      });
      var cf = SNOW.lb[0] + SNOW.sv[1] - SNOW.sv[0];
      h.path(ctx, P.P([[0, SNOW.lb[0]], [1, cf]]), prog(t, 22.3, 23.3), { color: C.cf, lw: 2.5, dash: [8, 6] });
      h.brace(ctx, P.X(1) + 56, P.Y(cf), P.Y(SNOW.lb[1]), { side: 1, p: prog(t, 23.3, 24.2) });
      h.text(ctx, '−97', P.X(1) + 80, P.Y((cf + SNOW.lb[1]) / 2) + 8, { size: 24, mono: true, weight: 700, color: C.effect, a: prog(t, 24, 24.6) });
      // table
      var tx = 780, ty = 350, cw = [200, 90, 90, 100], cx = [tx, tx + 200, tx + 290, tx + 380], tA = prog(t, 15.2, 16);
      h.box(ctx, tx - 16, ty - 40, 500, 210, { fill: C.panel, r: 12, a: tA });
      ['1849', '1854', L('Change', '变化')].forEach(function (s, i) { h.text(ctx, s, cx[i + 1] + cw[i + 1] / 2, ty - 10, { size: 16, color: C.muted, align: 'center', a: tA }); });
      h.text(ctx, 'Southwark & Vauxhall', tx, ty + 34, { size: 17, color: C.ctrl, weight: 600, a: tA });
      h.text(ctx, 'Lambeth', tx, ty + 80, { size: 17, color: C.treat, weight: 600, a: tA });
      num(ctx, '565', cx[1] + 45, ty + 34, { size: 19, a: prog(t, 15.6, 16) }); num(ctx, '614', cx[2] + 45, ty + 34, { size: 19, a: prog(t, 16.6, 17) }); num(ctx, '+49', cx[3] + 50, ty + 34, { size: 19, color: C.ctrl, a: prog(t, 18.5, 19) });
      num(ctx, '62', cx[1] + 45, ty + 80, { size: 19, a: prog(t, 16.6, 17) }); num(ctx, '14', cx[2] + 45, ty + 80, { size: 19, a: prog(t, 17.6, 18) }); num(ctx, '−48', cx[3] + 50, ty + 80, { size: 19, color: C.treat, a: prog(t, 19, 19.5) });
      h.line(ctx, tx, ty + 100, tx + 470, ty + 100, { color: C.axis, lw: 1, a: prog(t, 22, 22.5) });
      h.text(ctx, L('Difference in differences', '双重差分'), tx, ty + 140, { size: 17, color: C.effect, weight: 600, a: prog(t, 22.3, 22.8) });
      num(ctx, '−97', cx[3] + 50, ty + 140, { size: 22, color: C.effect, weight: 700, a: prog(t, 22.6, 23.1) });
    }
  });

  // ------------------------------------------------------------------ local projections DiD
  scene({
    id: 'lpdid', stata: ['lpdid'], dur: 38,
    title: { en: 'Local-projections DiD', zh: '局部投影双重差分' },
    sub: { en: 'One long-difference regression per horizon', zh: '每个时期做一次长差分回归' },
    beats: [
      { t: 2.6, en: 'Local-projections DiD (Dube, Girardi, Jordà & Taylor 2023) runs one simple regression for each horizon h after adoption.', zh: '局部投影双重差分（Dube, Girardi, Jordà & Taylor 2023）为处理后的每个时期 h 各做一次简单回归。' },
      { t: 9, en: 'For horizon h, take the long difference from the year before adoption to h years after: y(t+h) − y(t−1).', zh: '对于时期 h，取从处理前一年到处理后第 h 年的长差分：y(t+h) − y(t−1)。' },
      { t: 16, en: 'Compare newly treated units with clean controls: units not yet treated by year t+h. The late cohort drops out once it adopts in year 7.', zh: '把新处理的个体与干净的对照比较：到第 t+h 年仍未接受处理的个体。晚处理组在第 7 年接受处理后就被剔除。' },
      { t: 24, en: 'Each regression adds one point to the event study, and no already-treated unit is ever used as a control.', zh: '每次回归为事件研究图增加一个点，已处理的个体从不被用作对照。' },
      { t: 31, en: 'It is fast on large data and easy to extend with covariates and non-absorbing treatments. Stata: lpdid.', zh: '它在大数据上运算快，也便于加入协变量和处理非吸收型处理。Stata：lpdid。' }
    ],
    draw: function (ctx, t) {
      var P = new h.Plot(100, 110, 600, 390, 0.5, 10.5, 0, 11);
      var axA = prog(t, 2.6, 3.4);
      P.axes(ctx, { a: axA, xt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (v) { return [v, String(v)]; }), yt: [0, 2, 4, 6, 8, 10], xlabel: L('Year', '年份'), ylabel: L('Outcome', '结果变量') });
      var hz = t < 16 ? 0 : Math.min(3, Math.floor((t - 16) / 3.2));
      var on = prog(t, 9.3, 10), base = 3, end = 4 + hz;
      STAG.groups.forEach(function (G, gi) {
        var pts = []; for (var yr = 1; yr <= 10; yr++) pts.push([yr, STAG.y(G, yr)]);
        var valid = !G.g || G.g === 4 || G.g > end;
        h.path(ctx, P.P(pts), prog(t, 3.2 + gi * 0.8, 5 + gi * 0.8), { color: G.color, lw: 3.5, a: on > 0 && !valid ? 0.25 : 1 });
        h.text(ctx, G.label, P.X(10.5) - 4, P.Y(STAG.y(G, 10)) + (gi === 2 ? 28 : -14), { size: 16, color: G.color, align: 'right', weight: 600, a: prog(t, 5, 5.6) });
        if (on > 0) {
          var x0 = P.X(base), x1 = P.X(end), y0 = P.Y(STAG.y(G, base)), y1 = P.Y(STAG.y(G, end));
          h.dot(ctx, x0, y0, 6, { color: G.color, a: on * (valid ? 1 : 0.3) });
          h.dot(ctx, x1, y1, 6, { color: G.color, a: on * (valid ? 1 : 0.3) });
          h.line(ctx, x1 + 10, y0, x1 + 10, y1, { color: valid ? C.effect : C.faint, lw: 3, a: on });
          if (!valid) cross(ctx, x1 + 26, (y0 + y1) / 2, 7, C.bad, prog(t, 16 + 3 * 3.2 + 0.2, 16 + 3 * 3.2 + 0.8));
        }
      });
      if (on > 0) {
        h.line(ctx, P.X(base), P.y + 8, P.X(base), P.y + P.h, { color: C.faint, lw: 1.5, dash: [4, 6], a: on });
        h.line(ctx, P.X(end), P.y + 8, P.X(end), P.y + P.h, { color: C.effect, lw: 1.5, dash: [4, 6], a: on });
        h.text(ctx, 't−1', P.X(base), P.y + 2, { size: 15, mono: true, color: C.muted, align: 'center', a: on });
        h.text(ctx, 't+' + hz, P.X(end), P.y + 2, { size: 15, mono: true, color: C.effect, align: 'center', a: on });
      }
      // estimates by horizon
      var B = new h.Plot(860, 170, 330, 270, -0.6, 3.6, 0, 2.4), bA = prog(t, 9.6, 10.3);
      B.axes(ctx, { a: bA, xt: [0, 1, 2, 3].map(function (v) { return [v, 'h=' + v]; }), xmono: false, yt: [[0, '0'], [1, '1'], [2, '2']], xlabel: L('Horizon', '时期'), ylabel: L('LP-DiD estimate', 'LP-DiD 估计') });
      for (var k = 0; k <= 3; k++) {
        var shown = k < hz || (k === hz && t >= 10) || t >= 24;
        if (k > 0 && t < 16) shown = false;
        var endK = 4 + k, ctrl = STAG.groups.filter(function (G) { return !G.g || G.g > endK; });
        var dE = STAG.y(STAG.groups[0], endK) - STAG.y(STAG.groups[0], 3);
        var dC = ctrl.reduce(function (s, G) { return s + STAG.y(G, endK) - STAG.y(G, 3); }, 0) / ctrl.length;
        var v = dE - dC, a = shown ? 1 : 0;
        h.box(ctx, B.X(k) - 20, B.Y(v), 40, B.Y(0) - B.Y(v), { fill: C.effect, r: 4, a: bA * a * 0.9 });
        num(ctx, v, B.X(k), B.Y(v) - 10, { size: 16, a: bA * a });
      }
    }
  });

  // ------------------------------------------------------------------ continuous dose
  var DOSE = { dy: [1.0, 2.2, 3.0, 3.9], own3: [0, 1.5, 2.3, 2.9] };
  scene({
    id: 'dose', stata: ['did_had', 'did_multiplegt_dyn'], dur: 39,
    title: { en: 'Continuous treatment', zh: '连续处理' },
    sub: { en: 'When units get different doses', zh: '当个体接受不同剂量时' },
    beats: [
      { t: 2.6, en: 'With a continuous treatment, units receive different doses: here 0, 1, 2 or 3. Bars show each dose group’s change in the outcome.', zh: '在连续处理下，个体接受不同剂量：这里是 0、1、2 或 3。柱子表示各剂量组结果变量的变化。' },
      { t: 9, en: 'Under ordinary parallel trends, each dose group’s change minus the untreated group’s change identifies the effect of that dose on the units that received it.', zh: '在普通平行趋势下，各剂量组的变化减去未处理组的变化，识别的是该剂量对实际接受它的个体的效应。' },
      { t: 17, en: 'Comparing across doses is harder. The jump from dose 2 to dose 3 (0.9) also reflects differences between the units that ended up with those doses.', zh: '跨剂量比较更难。从剂量 2 到剂量 3 的增幅（0.9）还反映了最终接受不同剂量的个体之间的差异。' },
      { t: 25, en: 'For the dose-3 units themselves the marginal gain is only 0.6. Reading the curve as a causal dose-response needs “strong” parallel trends (Callaway, Goodman-Bacon & Sant’Anna 2024).', zh: '对剂量 3 的个体本身而言，边际收益只有 0.6。要把这条曲线解读为因果剂量反应，需要更强的平行趋势假设（Callaway, Goodman-Bacon & Sant’Anna 2024）。' },
      { t: 33, en: 'If every unit gets some dose there is no untreated group at all; did_had uses units with small doses instead (de Chaisemartin et al. 2024).', zh: '如果所有个体都接受一定剂量，就根本没有未处理组；did_had 改用剂量很小的个体作为对照（de Chaisemartin 等 2024）。' }
    ],
    draw: function (ctx, t) {
      var B = new h.Plot(110, 130, 440, 360, -0.6, 3.6, 0, 4.4), aA = prog(t, 2.8, 3.6);
      B.axes(ctx, { a: aA, xt: [0, 1, 2, 3].map(function (d) { return [d, L('dose ', '剂量 ') + d]; }), xmono: false, yt: [0, 1, 2, 3, 4], ylabel: L('Change in outcome', '结果变量的变化') });
      DOSE.dy.forEach(function (v, d) {
        var p = prog(t, 3.2 + d * 0.4, 4.2 + d * 0.4);
        h.box(ctx, B.X(d) - 32, B.Y(v * p), 64, B.Y(0) - B.Y(v * p), { fill: d ? 'rgba(240,138,93,' + (0.35 + 0.18 * d) + ')' : C.ctrl, r: 4, a: aA });
        num(ctx, v, B.X(d), B.Y(v) - 10, { size: 16, a: prog(t, 4.2 + d * 0.4, 4.6 + d * 0.4) });
      });
      var gA = prog(t, 9.3, 10);
      h.line(ctx, B.x, B.Y(DOSE.dy[0]), B.x + B.w, B.Y(DOSE.dy[0]), { color: C.ctrl, lw: 2, dash: [6, 5], a: gA });
      for (var d = 1; d <= 3; d++) {
        var att = DOSE.dy[d] - DOSE.dy[0];
        h.line(ctx, B.X(d) + 40, B.Y(DOSE.dy[0]), B.X(d) + 40, B.Y(DOSE.dy[d]), { color: C.effect, lw: 4, p: prog(t, 10 + d * 0.5, 10.6 + d * 0.5) });
        num(ctx, '+' + att.toFixed(1), B.X(d), B.y + B.h + 50, { size: 16, color: C.effect, weight: 600, a: prog(t, 10.4 + d * 0.5, 10.9 + d * 0.5) });
      }
      // dose-response panel
      var P = new h.Plot(700, 130, 420, 360, -0.3, 3.3, 0, 3.4), pA = prog(t, 12.5, 13.3);
      P.axes(ctx, { a: pA, xt: [0, 1, 2, 3].map(function (v) { return [v, String(v)]; }), yt: [0, 1, 2, 3], xlabel: L('Dose', '剂量'), ylabel: L('Effect of the dose received', '所受剂量的效应') });
      var pts = [0, 1, 2, 3].map(function (dd) { return [dd, DOSE.dy[dd] - DOSE.dy[0]]; });
      h.path(ctx, P.P(pts), prog(t, 13, 15), { color: C.effect, lw: 3.5 });
      pts.forEach(function (q, i) { h.dot(ctx, P.X(q[0]), P.Y(q[1]), 7, { color: C.effect, a: prog(t, 13 + i * 0.4, 13.4 + i * 0.4) }); });
      h.text(ctx, L('across dose groups', '跨剂量组比较'), P.X(1.55), P.Y(1.15), { size: 15, color: C.effect, a: prog(t, 15, 15.6) });
      // naive slope 2->3
      var sA = prog(t, 17.3, 18);
      h.line(ctx, P.X(2), P.Y(2.0), P.X(3), P.Y(2.0), { color: C.faint, lw: 1.5, dash: [4, 4], a: sA });
      h.line(ctx, P.X(3) + 18, P.Y(2.0), P.X(3) + 18, P.Y(2.9), { color: C.effect, lw: 3, a: sA });
      h.text(ctx, '0.9', P.X(3) + 26, P.Y(2.45) + 6, { size: 16, mono: true, color: C.effect, a: sA });
      // own curve of dose-3 units
      var oA = prog(t, 25.3, 26);
      h.path(ctx, P.P(DOSE.own3.map(function (v, i) { return [i, v]; })), prog(t, 25.3, 27), { color: C.purple, lw: 3, dash: [8, 6] });
      h.text(ctx, L('dose-3 units at each dose', '剂量 3 的个体在各剂量下'), P.X(0.4), P.Y(2.7), { size: 15, color: C.purple, a: oA });
      h.line(ctx, P.X(3) + 70, P.Y(2.3), P.X(3) + 70, P.Y(2.9), { color: C.purple, lw: 3, a: oA * prog(t, 26.5, 27) });
      h.text(ctx, '0.6', P.X(3) + 78, P.Y(2.6) + 6, { size: 16, mono: true, color: C.purple, a: oA * prog(t, 26.5, 27) });
    }
  });

  // ------------------------------------------------------------------ fuzzy DiD
  var FZ = { dA: [0.2, 0.6], dB: [0.2, 0.3], yA: [5.2, 6.8], yB: [4.6, 5.0] };
  scene({
    id: 'fuzzy', stata: ['fuzzydid'], dur: 38,
    title: { en: 'Fuzzy DiD', zh: '模糊双重差分' },
    sub: { en: 'When only the share treated changes', zh: '当变化的只是处理比例时' },
    beats: [
      { t: 2.6, en: 'Sometimes no group is fully treated or untreated. Take-up just rises faster in one group than in another.', zh: '有时没有哪一组是完全处理或完全未处理的，只是某一组的处理比例上升得更快。' },
      { t: 9, en: 'Share treated: group A goes from 20% to 60%, group B from 20% to 30%. The first-stage DiD is 40 − 10 = 30 percentage points.', zh: '处理比例：A 组从 20% 升到 60%，B 组从 20% 升到 30%。第一阶段的双重差分为 40 − 10 = 30 个百分点。' },
      { t: 16.5, en: 'Outcomes: group A rises by 1.6, group B by 0.4. The outcome DiD is 1.2.', zh: '结果变量：A 组上升 1.6，B 组上升 0.4。结果变量的双重差分为 1.2。' },
      { t: 23, en: 'Divide them: the Wald-DiD is 1.2 / 0.30 = 4.0, the effect per unit of treatment, much like an instrumental-variables ratio.', zh: '两者相除：Wald-DiD = 1.2 / 0.30 = 4.0，即每单位处理的效应，类似工具变量的比率。' },
      { t: 30, en: 'It needs more than parallel trends; de Chaisemartin & D’Haultfœuille (2018) also propose time-corrected and changes-in-changes versions. Stata: fuzzydid.', zh: '它需要的不只是平行趋势；de Chaisemartin & D’Haultfœuille（2018）还提出了时间修正版和变化中的变化版。Stata：fuzzydid。' }
    ],
    draw: function (ctx, t) {
      var B = new h.Plot(110, 120, 430, 310, 0, 5, 0, 1), aA = prog(t, 2.8, 3.6);
      B.axes(ctx, { a: aA, xt: [[1, L('before', '政策前')], [2, L('after', '政策后')], [3, L('before', '政策前')], [4, L('after', '政策后')]], xmono: false, yt: [[0, '0%'], [0.2, '20%'], [0.4, '40%'], [0.6, '60%'], [0.8, '80%']], ylabel: L('Share treated', '处理比例') });
      h.text(ctx, L('group A', 'A 组'), B.X(1.5), B.y + B.h + 54, { size: 17, color: C.treat, weight: 600, align: 'center', a: aA });
      h.text(ctx, L('group B', 'B 组'), B.X(3.5), B.y + B.h + 54, { size: 17, color: C.purple, weight: 600, align: 'center', a: aA });
      [[1, FZ.dA[0], C.treat], [2, FZ.dA[1], C.treat], [3, FZ.dB[0], C.purple], [4, FZ.dB[1], C.purple]].forEach(function (b, i) {
        var p = prog(t, 9.3 + i * 0.4, 10.3 + i * 0.4);
        h.box(ctx, B.X(b[0]) - 30, B.Y(b[1] * p), 60, B.Y(0) - B.Y(b[1] * p), { fill: b[2], r: 4, a: aA * (i % 2 ? 0.95 : 0.5) });
        h.text(ctx, Math.round(b[1] * 100) + '%', B.X(b[0]), B.Y(b[1]) - 10, { size: 16, mono: true, align: 'center', a: prog(t, 10 + i * 0.4, 10.4 + i * 0.4) });
      });
      var P = new h.Plot(680, 120, 460, 310, -0.3, 1.3, 4, 7.4), pA = prog(t, 16.6, 17.4);
      P.axes(ctx, { a: pA, xt: [[0, L('before', '政策前')], [1, L('after', '政策后')]], yt: [4, 5, 6, 7], ylabel: L('Average outcome', '平均结果') });
      [[FZ.yA, C.treat, 17], [FZ.yB, C.purple, 18]].forEach(function (g) {
        h.path(ctx, P.P([[0, g[0][0]], [1, g[0][1]]]), prog(t, g[2], g[2] + 1.2), { color: g[1], lw: 4 });
        h.dot(ctx, P.X(0), P.Y(g[0][0]), 7, { color: g[1], a: prog(t, g[2], g[2] + 0.3) });
        h.dot(ctx, P.X(1), P.Y(g[0][1]), 7, { color: g[1], a: prog(t, g[2] + 1.1, g[2] + 1.4) });
        num(ctx, '+' + (g[0][1] - g[0][0]).toFixed(1), P.X(1) + 18, P.Y(g[0][1]) + 6, { size: 17, color: g[1], align: 'left', a: prog(t, g[2] + 1.3, g[2] + 1.7) });
      });
      var fA = prog(t, 23.3, 24);
      h.box(ctx, 250, 516, 780, 60, { fill: C.panel, r: 12, a: fA });
      h.text(ctx, 'Wald-DiD = (1.6 − 0.4) / (0.40 − 0.10) = 4.0', 640, 555, { size: 24, mono: true, weight: 700, color: C.effect, align: 'center', a: fA });
    }
  });

  // ------------------------------------------------------------------ inference simulations
  function mulberry(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var q = s; q = Math.imul(q ^ q >>> 15, q | 1); q ^= q + Math.imul(q ^ q >>> 7, q | 61); return ((q ^ q >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function dm2(x, G, T) {
    var y = x.slice(), gm = new Array(G).fill(0), tm = new Array(T).fill(0), m = 0, g, t;
    for (g = 0; g < G; g++) for (t = 0; t < T; t++) { gm[g] += y[g * T + t] / T; tm[t] += y[g * T + t] / G; m += y[g * T + t] / (G * T); }
    for (g = 0; g < G; g++) for (t = 0; t < T; t++) y[g * T + t] = y[g * T + t] - gm[g] - tm[t] + m;
    return y;
  }
  function ols(yd, dd, G, T) {
    var sdd = 0, sdy = 0, i, g, t;
    for (i = 0; i < yd.length; i++) { sdd += dd[i] * dd[i]; sdy += dd[i] * yd[i]; }
    var b = sdy / sdd, ss = 0, sc = new Array(G).fill(0);
    for (g = 0; g < G; g++) for (t = 0; t < T; t++) { i = g * T + t; var e = yd[i] - b * dd[i]; ss += e * e; sc[g] += dd[i] * e; }
    var n = G * T, k = G + T, s2 = 0; sc.forEach(function (v) { s2 += v * v; });
    return { b: b, seN: Math.sqrt(ss / (n - k) / sdd), seC: Math.sqrt(s2 * G / (G - 1) * (n - 1) / (n - k)) / sdd };
  }
  function ar1Panel(r, G, T, rho) {
    var y = new Array(G * T);
    for (var g = 0; g < G; g++) { var e = gauss(r) / Math.sqrt(1 - rho * rho); for (var t = 0; t < T; t++) { e = rho * e + gauss(r); y[g * T + t] = e; } }
    return y;
  }
  var BDM = lazy(function () {
    var r = mulberry(1), G = 50, T = 20, nsim = 200, res = [], example = null;
    for (var s = 0; s < nsim; s++) {
      var y = ar1Panel(r, G, T, 0.8);
      if (!example) example = y.slice(0, 5 * T);
      var idx = []; for (var g = 0; g < G; g++) idx.push(g);
      for (var i = G - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
      var t0 = 5 + Math.floor(r() * 11), d = new Array(G * T).fill(0);
      idx.slice(0, 25).forEach(function (gg) { for (var tt = t0; tt < T; tt++) d[gg * T + tt] = 1; });
      var o = ols(dm2(y, G, T), dm2(d, G, T), G, T);
      res.push({ n: Math.abs(o.b / o.seN) > 1.96, c: Math.abs(o.b / o.seC) > 2.01 });
    }
    var rn = res.filter(function (q) { return q.n; }).length / nsim, rc = res.filter(function (q) { return q.c; }).length / nsim;
    return { res: res, rn: rn, rc: rc, example: example, T: T };
  });
  var FEW = lazy(function () {
    var r = mulberry(29), G = 12, NT = 3, T = 10, nsim = 300, B = 199, rejC = 0, rejW = 0, ex = null;
    var crit = 2.201; // t(11), 5% two-sided
    for (var s = 0; s < nsim; s++) {
      var y = ar1Panel(r, G, T, 0.8), d = new Array(G * T).fill(0);
      for (var g = 0; g < NT; g++) for (var t = 5; t < T; t++) d[g * T + t] = 1;
      var yd = dm2(y, G, T), dd = dm2(d, G, T), o = ols(yd, dd, G, T), tt = o.b / o.seC;
      if (Math.abs(tt) > crit) rejC++;
      var cnt = 0, tstars = [];
      for (var bb = 0; bb < B; bb++) {
        var v = []; for (g = 0; g < G; g++) v.push(r() < 0.5 ? -1 : 1);
        var ys = yd.map(function (e, i) { return e * v[Math.floor(i / T)]; });
        var ob = ols(ys, dd, G, T), ts = ob.b / ob.seC;
        if (Math.abs(ts) >= Math.abs(tt)) cnt++;
        tstars.push(ts);
      }
      var pw = (cnt + 1) / (B + 1);
      if (pw < 0.05) rejW++;
      if (!ex && Math.abs(tt) > crit && pw >= 0.05) {
        var res = []; for (g = 0; g < G; g++) { var sum = 0; for (t = 0; t < T; t++) sum += yd[g * T + t]; res.push(sum); }
        var resT = []; for (g = 0; g < G; g++) { var s2 = 0; for (t = 0; t < T; t++) s2 += yd[g * T + t] * dd[g * T + t]; resT.push(s2); }
        ex = { t: tt, p: pw, tstars: tstars, res: resT, sim: s + 1 };
      }
    }
    return { rejC: rejC / nsim, rejW: rejW / nsim, ex: ex, G: G, NT: NT, nsim: nsim };
  });
  D.BDM = BDM; D.FEW = FEW;

  // ------------------------------------------------------------------ serial correlation and clustering
  scene({
    id: 'cluster', stata: ['vce(cluster)'], dur: 38,
    title: { en: 'Serial correlation and clustering', zh: '序列相关与聚类标准误' },
    sub: { en: 'How often does DiD find a law that does not exist?', zh: '双重差分有多常“发现”一项并不存在的政策效应？' },
    beats: [
      { t: 2.6, en: 'Bertrand, Duflo & Mullainathan (2004) asked how often DiD finds an effect of a law that does not exist.', zh: 'Bertrand, Duflo & Mullainathan（2004）提出的问题是：双重差分有多常为一项并不存在的政策找到“效应”？' },
      { t: 9, en: 'Here outcomes in each of 50 states drift slowly over 20 years (serial correlation 0.8). Each dot will be one placebo law, given at random to 25 states.', zh: '这里 50 个州的结果变量在 20 年里缓慢漂移（序列相关系数 0.8）。每个点代表一项随机分配给 25 个州的安慰剂政策。' },
      lbeat(16, function () { var R = BDM(); return { en: 'With conventional standard errors, ' + pct(R.rn) + ' of the 200 placebo laws look significant at the 5% level.', zh: '使用常规标准误时，200 项安慰剂政策中有 ' + pct(R.rn) + ' 在 5% 水平上显著。' }; }),
      lbeat(24, function () { var R = BDM(); return { en: 'Clustering standard errors by state allows for correlation over time within a state. The rejection rate falls to ' + pct(R.rc) + '.', zh: '按州聚类的标准误允许同一州内跨期相关。拒绝率降到 ' + pct(R.rc) + '。' }; }),
      { t: 31.5, en: 'Rule: cluster at the level at which treatment is assigned, for example vce(cluster state) in Stata.', zh: '原则：在处理分配的层级聚类，例如在 Stata 中用 vce(cluster state)。' }
    ],
    draw: function (ctx, t) {
      var R = BDM();
      var P = new h.Plot(100, 140, 460, 300, 0.5, R.T + 0.5, -5, 5), aA = prog(t, 9.3, 10);
      P.axes(ctx, { a: aA, xt: [1, 5, 10, 15, 20].map(function (v) { return [v, String(v)]; }), yt: [[-4, '−4'], [0, '0'], [4, '4']], xlabel: L('Year', '年份'), ylabel: L('Outcome, five example states', '结果变量（五个示例州）') });
      var cols = [C.ctrl, C.treat, C.purple, C.teal, C.effect];
      for (var g = 0; g < 5; g++) {
        var pts = []; for (var tt = 0; tt < R.T; tt++) pts.push([tt + 1, Math.max(-4.9, Math.min(4.9, R.example[g * R.T + tt]))]);
        h.path(ctx, P.P(pts), prog(t, 9.6 + g * 0.4, 11.6 + g * 0.4), { color: cols[g], lw: 2.5, a: 0.9 });
      }
      // dot grid
      var gx = 680, gy = 150, cs = 26, per = 20;
      var phase2 = t >= 24.2;
      var shownN = Math.floor(200 * h.lin(t, 16.3, 22)), shownC = Math.floor(200 * h.lin(t, 24.3, 29));
      var cntN = 0, cntC = 0;
      R.res.forEach(function (q, i) {
        var x = gx + (i % per) * cs, y = gy + Math.floor(i / per) * cs;
        var vis = i < shownN || t >= 22;
        if (!vis) { h.dot(ctx, x, y, 8, { color: C.panel2, a: prog(t, 9.4, 10) }); return; }
        var sig = phase2 && i < shownC ? q.c : q.n;
        if (q.n && (i < shownN || t >= 22)) cntN++;
        if (phase2 && i < shownC && q.c) cntC++;
        h.dot(ctx, x, y, 8, { color: sig ? C.bad : C.faint });
      });
      var lx = gx, ly = gy + 10 * cs + 30;
      h.dot(ctx, lx + 6, ly - 6, 7, { color: C.bad, a: aA }); h.text(ctx, L('significant at 5%', '在 5% 水平显著'), lx + 22, ly, { size: 16, color: C.muted, a: aA });
      h.dot(ctx, lx + 226, ly - 6, 7, { color: C.faint, a: aA }); h.text(ctx, L('not significant', '不显著'), lx + 242, ly, { size: 16, color: C.muted, a: aA });
      var nA = prog(t, 16.3, 17);
      h.text(ctx, L('conventional SE: ', '常规标准误：') + pct(cntN / 200), lx, ly + 44, { size: 20, mono: LANG_mono(), color: C.bad, weight: 600, a: nA });
      h.text(ctx, L('clustered by state: ', '按州聚类：') + pct(cntC / 200), lx, ly + 76, { size: 20, mono: LANG_mono(), color: C.good, weight: 600, a: prog(t, 24.3, 25) });
    }
  });

  // ------------------------------------------------------------------ few clusters: wild cluster bootstrap
  scene({
    id: 'wildboot', stata: ['boottest'], dur: 40,
    title: { en: 'Few clusters: the wild cluster bootstrap', zh: '聚类数较少：野聚类自助法' },
    sub: { en: 'When even clustered standard errors are too small', zh: '当聚类标准误也偏小时' },
    beats: [
      { t: 2.6, en: 'With few clusters, or few treated clusters, even clustered standard errors are too small. Here: 12 states, 3 of them treated.', zh: '聚类数较少或处理组聚类很少时，连聚类标准误也会偏小。这里有 12 个州，其中 3 个接受处理。' },
      { t: 9, en: 'The wild cluster bootstrap redraws the data many times. Each state’s residuals are kept or flipped in sign as one block.', zh: '野聚类自助法多次重新生成数据：每个州的残差作为一个整体，要么保持不变，要么整体翻转符号。' },
      lbeat(16.5, function () { var R = FEW(); return { en: 'Take one placebo dataset where the two tests disagree: the clustered t-statistic is ' + fmt(R.ex.t, 2) + ', “significant” by the usual rule, but the share of bootstrap t-statistics at least as extreme gives p = ' + R.ex.p.toFixed(3) + '.', zh: '看一个两种检验结论不同的安慰剂数据集：聚类 t 统计量为 ' + fmt(R.ex.t, 2) + '，按常规标准是“显著”的，但自助法 t 统计量中至少同样极端的比例给出 p = ' + R.ex.p.toFixed(3) + '。' }; }),
      lbeat(24, function () { var R = FEW(); return { en: 'Across ' + R.nsim + ' simulated placebo laws, clustered standard errors reject ' + pct(R.rejC) + ' of the time instead of 5%; the wild cluster bootstrap rejects ' + pct(R.rejW) + '.', zh: '在 ' + R.nsim + ' 项模拟的安慰剂政策中，聚类标准误的拒绝率为 ' + pct(R.rejC) + '，而不是 5%；野聚类自助法的拒绝率为 ' + pct(R.rejW) + '。' }; }),
      { t: 32, en: 'Stata: boottest right after your regression (Roodman et al. 2019). See Cameron, Gelbach & Miller (2008) and MacKinnon & Webb (2017).', zh: 'Stata：回归后直接运行 boottest（Roodman 等 2019）。参见 Cameron, Gelbach & Miller（2008）和 MacKinnon & Webb（2017）。' }
    ],
    draw: function (ctx, t) {
      var R = FEW(), ex = R.ex;
      // cluster residual blocks with sign flips
      var P = new h.Plot(100, 150, 460, 220, 0.3, R.G + 0.7, -1, 1), aA = prog(t, 2.8, 3.6);
      var maxR = Math.max.apply(null, ex.res.map(Math.abs)) || 1;
      h.text(ctx, L('Treatment-weighted residual by state', '各州按处理加权的残差'), P.x, P.y - 18, { size: 16, color: C.muted, italic: LANG_mono(), a: aA });
      P.zero(ctx, aA);
      var step = t < 9.3 ? -1 : Math.floor((Math.min(t, 23) - 9.3) / 0.6);
      var rr = mulberry(1000 + step);
      for (var g = 0; g < R.G; g++) {
        var flip = step >= 0 ? (rr() < 0.5 ? -1 : 1) : 1;
        var v = ex.res[g] / maxR * flip, x = P.X(g + 1);
        h.box(ctx, x - 13, Math.min(P.Y(0), P.Y(v)), 26, Math.abs(P.Y(v) - P.Y(0)), { fill: g < R.NT ? C.treat : C.ctrl, r: 3, a: aA * (flip < 0 ? 0.6 : 0.95) });
        h.text(ctx, String(g + 1), x, P.y + P.h + 22, { size: 13, mono: true, color: C.muted, align: 'center', a: aA });
      }
      h.text(ctx, L('treated states', '处理州'), P.X(2), P.y + P.h + 46, { size: 14, color: C.treat, align: 'center', a: aA });
      // bootstrap histogram
      var Hh = new h.Plot(680, 150, 500, 180, -5, 5, 0, 1), hA = prog(t, 16.6, 17.3);
      Hh.axes(ctx, { a: hA, xt: [-4, -2, 0, 2, 4].map(function (v) { return [v, v < 0 ? '−' + Math.abs(v) : String(v)]; }), xlabel: L('Bootstrap t-statistics', '自助法 t 统计量') });
      var bins = new Array(25).fill(0), nShow = Math.floor(ex.tstars.length * h.lin(t, 16.8, 22.5));
      for (var i = 0; i < nShow; i++) { var b = Math.floor((ex.tstars[i] + 5) / 0.4); if (b >= 0 && b < 25) bins[b]++; }
      var mx = Math.max(8, Math.max.apply(null, bins));
      bins.forEach(function (c, k) {
        var x0 = Hh.X(-5 + k * 0.4), x1 = Hh.X(-5 + (k + 1) * 0.4), mid = -5 + (k + 0.5) * 0.4;
        var ext = Math.abs(mid) >= Math.abs(ex.t);
        h.box(ctx, x0 + 1, Hh.Y(c / mx), x1 - x0 - 2, Hh.Y(0) - Hh.Y(c / mx), { fill: ext ? C.bad : C.muted, r: 2, a: hA * 0.85 });
      });
      var tA = prog(t, 17, 17.6);
      [ex.t, -ex.t].forEach(function (v, k) { h.line(ctx, Hh.X(v), Hh.y, Hh.X(v), Hh.y + Hh.h, { color: C.effect, lw: k ? 1.5 : 3, dash: k ? [4, 4] : null, a: tA }); });
      h.text(ctx, 't = ' + fmt(ex.t, 2), Hh.X(ex.t) + (ex.t > 0 ? 8 : -8), Hh.y + 18, { size: 16, mono: true, color: C.effect, align: ex.t > 0 ? 'left' : 'right', a: tA });
      h.text(ctx, 'p = ' + ex.p.toFixed(3), Hh.X(ex.t) + (ex.t > 0 ? 8 : -8), Hh.y + 42, { size: 16, mono: true, color: C.effect, align: ex.t > 0 ? 'left' : 'right', a: prog(t, 22.5, 23) });
      // rejection rates
      var Rr = new h.Plot(860, 430, 320, 120, 0, 0.2, 0, 2), rA = prog(t, 24.2, 25);
      var lab = [[L('clustered SE', '聚类标准误'), R.rejC, C.bad], [L('wild bootstrap', '野聚类自助法'), R.rejW, C.good]];
      h.text(ctx, L('Rejection rate under the null', '原假设成立时的拒绝率'), 680, 420, { size: 16, color: C.muted, a: rA });
      lab.forEach(function (q, k) {
        var y = 450 + k * 50;
        h.text(ctx, q[0], 680, y + 20, { size: 17, color: q[2], a: rA });
        h.box(ctx, 860, y, 1400 * q[1] * prog(t, 24.4 + k * 0.4, 25.6 + k * 0.4), 28, { fill: q[2], r: 4, a: rA });
        h.text(ctx, pct(q[1]), 868 + 1400 * q[1], y + 21, { size: 17, mono: true, a: prog(t, 25.4 + k * 0.4, 25.9 + k * 0.4) });
      });
      h.line(ctx, 860 + 1400 * 0.05, 440, 860 + 1400 * 0.05, 540, { color: C.text, lw: 1.5, dash: [4, 4], a: rA });
      h.text(ctx, '5%', 860 + 1400 * 0.05, 560, { size: 14, mono: true, color: C.muted, align: 'center', a: rA });
    }
  });

  D.order(['snow', 'classic', 'event', 'ddd', 'drdid', 'bacon', 'csdid', 'sunab', 'imputation', 'stacked', 'lpdid', 'dcdh', 'dose', 'fuzzy', 'cic', 'sdid', 'honest', 'cluster', 'wildboot']);
})();
