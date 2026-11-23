/*
 * "Which estimator should I use?" — answers to a few design questions are
 * mapped to recommended estimators, Stata code and diagnostics.
 * The rules follow the practitioner guides of Roth et al. (2023) and
 * Baker et al. (2025); they are a starting point, not a substitute for reading them.
 */
(function () {
  'use strict';

  var Q = [
    { id: 'timing', en: 'When does treatment start?', zh: '处理何时开始？', opts: [
      ['one', 'At the same date for every treated unit', '所有处理个体在同一时间开始'],
      ['stag', 'At different dates (staggered adoption)', '不同个体在不同时间开始（交错处理）']] },
    { id: 'type', en: 'What kind of treatment is it?', zh: '处理属于哪种类型？', opts: [
      ['abs', 'Binary, and once on it stays on', '二元的，一旦开启就一直持续'],
      ['rev', 'Binary, but it can switch off again', '二元的，但可能再次关闭'],
      ['dose', 'Continuous or multi-valued intensity', '连续或多值的处理强度'],
      ['fuzzy', 'Only the share treated changes between groups', '组间只是处理比例的变化不同']] },
    { id: 'never', en: 'Are there units that are never treated during the sample?', zh: '样本期内是否有从未接受处理的个体？', opts: [
      ['yes', 'Yes', '有'], ['no', 'No, everyone is treated eventually', '没有，所有个体最终都会接受处理']] },
    { id: 'cov', en: 'Is parallel trends only plausible after controlling for covariates?', zh: '是否只有在控制协变量后，平行趋势才可信？', opts: [
      ['no', 'No', '否'], ['yes', 'Yes', '是']] },
    { id: 'ntreat', en: 'How many treated units are there?', zh: '处理个体有多少？', opts: [
      ['many', 'Many', '很多'], ['few', 'One or a handful', '一个或少数几个']] },
    { id: 'clusters', en: 'How many clusters (units at which treatment is assigned)?', zh: '聚类（处理分配的单位）有多少个？', opts: [
      ['many', 'About 40 or more', '约 40 个或更多'], ['few', 'Fewer than about 40, or very few treated clusters', '少于约 40 个，或处理组聚类很少']] },
    { id: 'y', en: 'What is the outcome?', zh: '结果变量是什么类型？', opts: [
      ['cont', 'Continuous', '连续变量'], ['nonlin', 'Binary or a count', '二元变量或计数变量']] },
    { id: 'target', en: 'What do you want to learn?', zh: '你想了解什么？', opts: [
      ['mean', 'The average effect', '平均效应'], ['dist', 'Effects across the distribution', '整个分布上的效应']] }
  ];

  var T = {
    en: { rec: 'Recommended', also: 'Also report', diag: 'Diagnostics', code: 'Stata', watch: 'Watch the animation', start: 'Main estimator', why: 'Why', reset: 'Reset answers',
      note: 'A starting point based on Roth et al. (2023) and Baker et al. (2025), not a substitute for reading them. Check option names with help after installing.' },
    zh: { rec: '推荐', also: '同时报告', diag: '诊断', code: 'Stata', watch: '观看动画', start: '主要估计量', why: '理由', reset: '重置答案',
      note: '这些建议基于 Roth 等（2023）和 Baker 等（2025）的实践指南，只是一个起点，不能代替阅读原文。安装后请用 help 核对选项名称。' }
  };

  function recommend(a, L) {
    var t = function (en, zh) { return L === 'zh' ? zh : en; };
    var main = [], extra = [], diag = [];
    var ctrl = a.never === 'yes' ? '' : ' notyet';
    if (a.type === 'fuzzy') {
      main.push({ name: 'Fuzzy DiD (de Chaisemartin & D’Haultfœuille 2018)', anim: null,
        why: t('Groups differ in how much the treatment rate rises, not in who is treated, so a Wald-type ratio is needed.', '各组的差别在于处理比例上升多少，而非谁接受处理，因此需要 Wald 型比率估计量。'),
        code: 'fuzzydid y G T D, did tc cic' });
    } else if (a.ntreat === 'few') {
      main.push({ name: t('Synthetic DiD or synthetic control', '合成双重差分或合成控制'), anim: 'sdid',
        why: t('With one or a handful of treated units, re-weighting controls to match the treated pre-trend is more credible than an unweighted comparison group.', '处理个体只有一个或少数几个时，对对照个体重新加权以匹配处理前趋势，比不加权的对照组更可信。'),
        code: 'sdid y id year D, vce(placebo) graph\nsynth y y(2000) y(2005) x1, trunit(3) trperiod(2006)' });
    } else if (a.type === 'rev' || a.type === 'dose') {
      main.push({ name: 'de Chaisemartin & D’Haultfœuille (2024)', anim: 'dcdh',
        why: t('Treatment switches off or varies in intensity; compare switchers with units that had the same treatment at baseline and have not switched yet.', '处理会关闭或强度变化；把切换者与期初处理相同、尚未切换的个体相比较。'),
        code: 'did_multiplegt_dyn y id year D, effects(5) placebo(3) cluster(id)' });
      if (a.type === 'dose' && a.never === 'no') main.push({ name: t('Heterogeneous adoption design', '异质采纳设计'), anim: 'dcdh',
        why: t('Everyone receives some dose, so there is no untreated comparison group; did_had uses units with small doses instead.', '所有个体都接受一定剂量，没有未处理的对照组；did_had 改用剂量很小的个体作为对照。'),
        code: 'did_had y id year D, effects(3) placebo(2)' });
      if (a.type === 'dose') extra.push({ name: t('Read on continuous treatments', '连续处理的延伸阅读'), anim: null,
        why: t('Parallel trends alone does not identify a dose-response curve; see Callaway, Goodman-Bacon & Sant’Anna (2024).', '仅靠平行趋势无法识别剂量反应曲线；见 Callaway, Goodman-Bacon & Sant’Anna（2024）。'), code: '' });
    } else if (a.timing === 'one') {
      if (a.cov === 'yes') main.push({ name: t('Doubly robust DiD', '双重稳健双重差分'), anim: 'drdid',
        why: t('One treatment date with covariate-conditional parallel trends: combine an outcome model with propensity-score weights.', '单一处理时点且平行趋势以协变量为条件：把结果模型与倾向得分加权结合。'),
        code: 'drdid y x1 x2, ivar(id) time(year) tr(treat) dripw' });
      main.push({ name: t('Canonical DiD / TWFE event study', '经典双重差分 / TWFE 事件研究'), anim: 'classic',
        why: t('With a single treatment date, TWFE compares treated units only with never-treated ones, so it is not affected by the staggered-adoption problems.', '只有一个处理时点时，TWFE 只把处理个体与从未处理个体比较，不受交错处理问题的影响。'),
        code: 'didregress (y' + (a.cov === 'yes' ? ' x1 x2' : '') + ') (D), group(id) time(year)\nestat trendplots\nreghdfe y lead* lag*, absorb(id year) vce(cluster id)' });
    } else {
      if (a.y === 'nonlin') main.push({ name: t('Extended TWFE (Wooldridge)', '扩展 TWFE（Wooldridge）'), anim: 'imputation',
        why: t('Saturated cohort × time interactions handle staggered timing and extend directly to logit and Poisson for binary or count outcomes.', '完整的批次 × 时间交互项能处理交错处理，并可直接推广到适用于二元或计数结果的 logit 和泊松模型。'),
        code: '* method(logit) for a binary outcome\njwdid y, ivar(id) tvar(year) gvar(g) method(poisson)\nestat event' });
      main.push({ name: 'Callaway & Sant’Anna (2021)', anim: 'csdid',
        why: t('Clean group-time comparisons with flexible aggregation' + (a.cov === 'yes' ? ', and doubly robust covariate adjustment.' : '.') + (a.never === 'no' ? ' Without never-treated units, use not-yet-treated units as controls.' : ''),
               '干净的分组-时期比较，聚合方式灵活' + (a.cov === 'yes' ? '，并可做双重稳健的协变量调整。' : '。') + (a.never === 'no' ? '没有从未处理个体时，以尚未处理的个体为对照。' : '')),
        code: 'csdid y' + (a.cov === 'yes' ? ' x1 x2' : '') + ', ivar(id) time(year) gvar(g) method(dripw)' + ctrl + '\nestat event\ncsdid_plot' });
      main.push({ name: 'Borusyak, Jaravel & Spiess (2024)', anim: 'imputation',
        why: t('The imputation estimator is efficient when errors are roughly homoskedastic and gives a full event study.', '误差大致同方差时，插补估计量是有效的，并能给出完整的事件研究。'),
        code: 'did_imputation y id year Ei, horizons(0/5) pretrends(4) autosample' });
      extra.push({ name: 'Sun & Abraham (2021)', anim: 'sunab',
        why: t('A familiar event-study regression made robust to heterogeneous effects' + (a.never === 'no' ? '; use the last-treated cohort as the control cohort.' : '.'), '对异质效应稳健的常规事件研究回归' + (a.never === 'no' ? '；以最后接受处理的批次作为对照批次。' : '。')),
        code: (a.never === 'yes' ? '* never = 1 for never-treated units' : '* lastcohort = 1 for the last-treated cohort') + '\neventstudyinteract y lead* lag*, cohort(Ei) control_cohort(' + (a.never === 'yes' ? 'never' : 'lastcohort') + ') absorb(i.id i.year) vce(cluster id)' });
      diag.push({ name: t('Diagnose the plain TWFE estimate', '诊断普通 TWFE 估计'), anim: 'bacon',
        why: t('Show how much of TWFE comes from comparisons with already-treated units, and whether any weights are negative.', '展示 TWFE 有多少来自与已处理个体的比较，以及是否存在负权重。'),
        code: 'bacondecomp y D, ddetail\ntwowayfeweights y id year D, type(feTR)' });
      if (a.never === 'no') diag.push({ name: t('Mind the horizons you can estimate', '注意可估计的时期范围'), anim: null,
        why: t('Without never-treated units, effects after the last cohort adopts have no clean control and are not identified.', '没有从未处理个体时，最后一个批次处理之后的效应没有干净的对照，无法识别。'), code: '' });
    }
    if (a.target === 'dist') extra.push({ name: t('Changes-in-changes', '变化中的变化'), anim: 'cic',
      why: t('Recovers the whole counterfactual distribution and quantile effects, and does not depend on the scale of the outcome.', '还原整个反事实分布和分位数效应，且不依赖结果变量的尺度。'),
      code: 'cic continuous y treat post, at(10(10)90)' });
    diag.push({ name: t('Check how robust parallel trends is', '检验平行趋势的稳健性'), anim: 'honest',
      why: t('Report Honest DiD bounds and the power of your pre-test rather than relying on an insignificant pre-trend.', '报告 Honest DiD 区间和预检验的功效，而不是只依赖不显著的处理前趋势。'),
      code: 'honestdid, pre(1/4) post(5/10) mvec(0(0.5)2)' });
    diag.push(a.clusters === 'few'
      ? { name: t('Inference with few clusters', '聚类数较少时的推断'), anim: null,
          why: t('Conventional clustered standard errors are too small with few clusters; use the wild cluster bootstrap or randomisation inference.', '聚类数较少时，常规聚类标准误偏小；应使用野聚类自助法或随机化推断。'),
          code: 'boottest D, cluster(state) reps(9999)' }
      : { name: t('Cluster at the level of treatment', '在处理层级聚类'), anim: null,
          why: t('Outcomes are serially correlated within units (Bertrand, Duflo & Mullainathan 2004).', '同一个体的结果存在序列相关（Bertrand, Duflo & Mullainathan 2004）。'),
          code: 'vce(cluster id)' });
    return { main: main, extra: extra, diag: diag };
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function mount(root) {
    var L = /^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
    var S = T[L];
    var DEFAULT = { timing: 'stag', type: 'abs', never: 'yes', cov: 'no', ntreat: 'many', clusters: 'many', y: 'cont', target: 'mean' };
    var a = JSON.parse(JSON.stringify(DEFAULT));
    root.innerHTML = '<form class="guide-q" onsubmit="return false">' + Q.map(function (q) {
      return '<fieldset><legend>' + esc(q[L]) + '</legend>' + q.opts.map(function (o) {
        var id = 'guide-' + q.id + '-' + o[0];
        return '<label for="' + id + '"><input type="radio" name="guide-' + q.id + '" id="' + id + '" value="' + o[0] + '"> <span>' + esc(L === 'zh' ? o[2] : o[1]) + '</span></label>';
      }).join('') + '</fieldset>';
    }).join('') + '<button type="button" class="guide-reset">' + S.reset + '</button></form><div class="guide-out" aria-live="polite"></div>';
    var out = root.querySelector('.guide-out');
    function sync() { Q.forEach(function (q) { var r = root.querySelector('#guide-' + q.id + '-' + a[q.id]); if (r) r.checked = true; }); }
    function block(title, items, cls) {
      if (!items.length) return '';
      return '<h4>' + title + '</h4><ol class="guide-list ' + cls + '">' + items.map(function (it) {
        return '<li><b>' + esc(it.name) + '</b><p>' + esc(it.why) + '</p>' + (it.code ? '<pre><code>' + esc(it.code) + '</code></pre>' : '') +
          (it.anim ? '<a class="anim-link" href="#anim-' + it.anim + '">' + S.watch + '</a>' : '') + '</li>';
      }).join('') + '</ol>';
    }
    function render() {
      var R = recommend(a, L);
      out.innerHTML = block(S.rec, R.main, 'is-main') + block(S.also, R.extra, '') + block(S.diag, R.diag, '') + '<p class="sim-note">' + S.note + '</p>';
    }
    root.addEventListener('change', function (e) {
      if (e.target.name && e.target.name.indexOf('guide-') === 0) { a[e.target.name.slice(6)] = e.target.value; render(); }
    });
    root.querySelector('.guide-reset').addEventListener('click', function () { a = JSON.parse(JSON.stringify(DEFAULT)); sync(); render(); });
    sync(); render();
  }

  window.DIDGuide = { mount: mount, recommend: recommend };
})();
