/*
 * Bilingual glossary and self-check quiz for the difference-in-differences page.
 * Both render in the page language (html lang="zh..." gives Chinese).
 */
(function () {
  'use strict';
  var ZH = /^zh/i.test(document.documentElement.lang || '');

  // [English term, Chinese term, English definition, Chinese definition, animation id or '']
  var GLOSSARY = [
    ['Difference-in-differences (DiD)', '双重差分（DiD）', 'Compares the change over time in a treated group with the change in an untreated group; the second difference removes shocks both share.', '把处理组随时间的变化与未处理组的变化相比较；第二次差分去掉两组共同受到的冲击。', 'classic'],
    ['Treated group / control group', '处理组 / 对照组', 'Units exposed to the policy, and the units used to estimate what would have happened to them without it.', '受到政策影响的个体，以及用来推断其未受政策影响时会怎样的个体。', 'classic'],
    ['Counterfactual', '反事实', 'The outcome the treated group would have had without treatment. Never observed; DiD builds it from the control group’s change.', '处理组若未接受处理时的结果。它无法观测，双重差分用对照组的变化来构造它。', 'classic'],
    ['ATT', '处理组平均处理效应（ATT）', 'Average treatment effect on the treated: the average effect among the units that actually received treatment.', '实际接受处理的个体的平均处理效应。', 'classic'],
    ['Parallel trends', '平行趋势', 'Without treatment, treated and control outcomes would have moved in parallel on average. The key, and untestable, assumption.', '如果没有处理，处理组与对照组的平均结果会平行变化。这是核心假设，且无法直接检验。', 'event'],
    ['No anticipation', '无预期效应', 'Units do not react to the treatment before it starts.', '个体在处理开始前不会对其作出反应。', ''],
    ['SUTVA / spillovers', 'SUTVA / 溢出效应', 'One unit’s treatment does not change another unit’s outcome. Spillovers to the control group bias DiD.', '一个个体是否接受处理不影响其他个体的结果。对照组受到溢出影响会使双重差分产生偏误。', ''],
    ['Two-way fixed effects (TWFE)', '双向固定效应（TWFE）', 'Regression of the outcome on a treatment dummy with unit and time fixed effects. Fine with one treatment date; can mislead with staggered timing.', '把结果变量对处理虚拟变量以及个体和时间固定效应回归。单一处理时点时没有问题，交错处理时可能误导。', 'bacon'],
    ['Event study', '事件研究', 'Estimates a separate coefficient for each period relative to treatment, showing pre-trends and how the effect evolves.', '为相对于处理的每个时期分别估计系数，展示处理前趋势以及效应的变化过程。', 'event'],
    ['Leads and lags', '前导项与滞后项', 'Event-study coefficients for periods before (leads) and after (lags) treatment starts.', '事件研究中处理开始之前（前导项）和之后（滞后项）各期的系数。', 'event'],
    ['Pre-trends', '处理前趋势', 'Differences in trends before treatment. Flat pre-trends are suggestive, not proof, of parallel trends.', '处理前的趋势差异。平坦的处理前趋势只能作为平行趋势的参考证据，而非证明。', 'event'],
    ['Staggered adoption', '交错处理', 'Units start treatment at different dates.', '不同个体在不同时间开始接受处理。', 'bacon'],
    ['Cohort (timing group)', '处理批次（队列）', 'All units that start treatment in the same period, often written g.', '在同一时期开始接受处理的所有个体，常记为 g。', 'csdid'],
    ['Never-treated / not-yet-treated', '从未处理 / 尚未处理', 'Units never treated in the sample, and units whose treatment starts later. Both can serve as clean controls.', '样本期内从未接受处理的个体，以及较晚才接受处理的个体。两者都可以作为干净的对照。', 'csdid'],
    ['Absorbing treatment', '吸收型处理', 'Once a unit is treated it stays treated.', '个体一旦接受处理就一直处于处理状态。', 'dcdh'],
    ['Heterogeneous treatment effects', '异质性处理效应', 'Effects that differ across cohorts or change with time since treatment. The source of TWFE’s problems.', '在不同批次之间不同、或随处理时间变化的效应。这是 TWFE 出现问题的根源。', 'bacon'],
    ['Forbidden comparison', '禁止的比较', 'A 2×2 comparison inside TWFE that uses already-treated units as controls.', 'TWFE 内部把已处理个体当作对照的 2×2 比较。', 'bacon'],
    ['Negative weights', '负权重', 'Some treated cohort-years enter the TWFE estimate with negative weight, so their effects are subtracted.', '部分已处理的批次-年份在 TWFE 估计中权重为负，其效应被减掉了。', 'bacon'],
    ['Group-time ATT, ATT(g,t)', '分组-时期 ATT，ATT(g,t)', 'The average effect for cohort g in period t, estimated from a clean 2×2 comparison.', '批次 g 在时期 t 的平均效应，由一次干净的 2×2 比较估计。', 'csdid'],
    ['Aggregation', '加总', 'Combining many ATT(g,t) into an event study or a single summary effect, with chosen weights.', '用选定的权重把多个 ATT(g,t) 合成为事件研究或一个总体效应。', 'csdid'],
    ['Imputation estimator', '插补估计量', 'Fits unit and time effects on untreated observations, predicts Y(0) for treated ones, and averages the gaps.', '用未处理观测值估计个体和时间效应，预测处理观测值的 Y(0)，再对差距取平均。', 'imputation'],
    ['Stacked DiD', '堆叠双重差分', 'Builds a clean dataset for each adoption date and stacks them into one regression.', '为每个处理时点构造干净的数据集，再堆叠起来做一个回归。', 'stacked'],
    ['Local projections', '局部投影', 'One long-difference regression for each horizon after treatment.', '处理后的每个时期各做一次长差分回归。', 'lpdid'],
    ['Triple differences (DDD)', '三重差分（DDD）', 'Subtracts a second DiD for an unaffected group to remove group-specific shocks.', '再减去不受影响群体的双重差分，以去掉组别特有的冲击。', 'ddd'],
    ['Doubly robust', '双重稳健', 'Combines an outcome model and propensity-score weights; consistent if either is correctly specified.', '结合结果模型与倾向得分加权；只要其中一个设定正确，估计就是一致的。', 'drdid'],
    ['Propensity score', '倾向得分', 'The probability of being treated given covariates.', '给定协变量时接受处理的概率。', 'drdid'],
    ['Synthetic control', '合成控制', 'A weighted average of control units chosen to match the treated unit before treatment.', '对照个体的加权平均，权重的选择使其在处理前与处理个体相匹配。', 'sdid'],
    ['Changes-in-changes (CiC)', '变化中的变化（CiC）', 'A nonlinear DiD that recovers the whole counterfactual distribution and quantile effects.', '一种非线性双重差分，能还原整个反事实分布和分位数效应。', 'cic'],
    ['Fuzzy DiD', '模糊双重差分', 'Used when groups differ only in how much the treatment rate changes; a Wald-type ratio of two DiDs.', '用于各组只是处理比例变化程度不同的情形；是两个双重差分之比（Wald 型）。', 'fuzzy'],
    ['Continuous treatment (dose)', '连续处理（剂量）', 'Treatment that varies in intensity. Identifying a dose-response curve needs stronger assumptions.', '强度连续变化的处理。识别剂量反应曲线需要更强的假设。', 'dose'],
    ['Switchers', '切换者', 'Units whose treatment changes between two periods.', '在两个时期之间处理状态发生变化的个体。', 'dcdh'],
    ['Honest DiD', 'Honest DiD', 'Confidence sets that remain valid when parallel trends is violated by a bounded amount.', '在平行趋势偏离幅度有界时仍然有效的置信集。', 'honest'],
    ['Breakdown value', '临界值', 'The size of violation at which the robust confidence interval first includes zero.', '稳健置信区间首次包含零时对应的偏离幅度。', 'honest'],
    ['Serial correlation', '序列相关', 'Correlation of a unit’s outcomes or errors over time. Makes conventional standard errors too small.', '同一个体的结果或误差在时间上的相关性。它会使常规标准误偏小。', 'cluster'],
    ['Clustered standard errors', '聚类标准误', 'Standard errors that allow arbitrary correlation within clusters, such as states.', '允许聚类（如州）内部任意相关的标准误。', 'cluster'],
    ['Wild cluster bootstrap', '野聚类自助法', 'Resamples by flipping the signs of whole clusters’ residuals; reliable inference with few clusters.', '通过整体翻转各聚类残差的符号来重抽样；聚类数较少时推断更可靠。', 'wildboot'],
    ['Placebo test', '安慰剂检验', 'Applying the method where there should be no effect, such as a fake treatment date, to check for spurious results.', '在本不应有效应的地方（如虚构的处理时点）应用该方法，检查是否会得到虚假结果。', 'cluster']
  ];

  // question, options, correct index, explanation, animation id
  var QUIZ = [
    { en: 'In a 2×2 design, the control group’s average outcome rises from 4 to 5 and the treated group’s from 6 to 8.5. What is the DiD estimate?', zh: '在 2×2 设计中，对照组的平均结果从 4 升到 5，处理组从 6 升到 8.5。双重差分估计值是多少？',
      opts: [['2.5', '2.5'], ['1.5', '1.5'], ['1.0', '1.0'], ['3.5', '3.5']], ok: 1,
      why: ['(8.5 − 6) − (5 − 4) = 2.5 − 1 = 1.5.', '(8.5 − 6) − (5 − 4) = 2.5 − 1 = 1.5。'], anim: 'classic' },
    { en: 'Which assumption can never be tested directly?', zh: '下列哪个假设永远无法直接检验？',
      opts: [['Parallel trends after treatment', '处理后的平行趋势'], ['That the panel is balanced', '面板是否平衡'], ['That treatment is binary', '处理是否为二元变量'], ['That there are never-treated units', '是否存在从未处理的个体']], ok: 0,
      why: ['It concerns what treated units would have done without treatment after it started, which is never observed. Pre-trends are only indirect evidence.', '它涉及处理开始后处理组在没有处理时会怎样，而这永远观测不到。处理前趋势只是间接证据。'], anim: 'event' },
    { en: 'Units adopt at different dates and effects grow over time. What is the main problem with static TWFE?', zh: '个体在不同时间接受处理，且效应随时间增长。静态 TWFE 的主要问题是什么？',
      opts: [['It needs covariates', '它需要协变量'], ['Already-treated units serve as controls, so growing effects get subtracted', '已处理个体被当作对照，增长中的效应被减掉了'], ['It cannot be clustered', '它不能聚类'], ['It only works with two periods', '它只适用于两期']], ok: 1,
      why: ['Goodman-Bacon (2021): TWFE averages all 2×2 comparisons, including ones that use already-treated units as controls. Some weights can be negative.', 'Goodman-Bacon（2021）：TWFE 是所有 2×2 比较的平均，其中包括把已处理个体当作对照的比较，部分权重可能为负。'], anim: 'bacon' },
    { en: 'Your event study shows flat, insignificant pre-treatment coefficients. What can you conclude?', zh: '事件研究中处理前的系数平坦且不显著。你能得出什么结论？',
      opts: [['Parallel trends holds', '平行趋势成立'], ['The effect is causal', '效应是因果的'], ['Pre-trends large enough to matter may still go undetected', '足以影响结论的处理前趋势仍可能未被发现'], ['Clustering is unnecessary', '不需要聚类']], ok: 2,
      why: ['Pre-tests often have low power, and conditioning on passing them distorts inference (Roth 2022). Report Honest DiD bounds as well.', '预检验的功效往往很低，而以通过预检验为条件会扭曲推断（Roth 2022）。还应报告 Honest DiD 区间。'], anim: 'honest' },
    { en: 'Which estimator builds a separate clean comparison for each cohort and period, then aggregates them?', zh: '哪个估计量为每个批次和时期分别构造干净的比较，再加总？',
      opts: [['Callaway & Sant’Anna', 'Callaway & Sant’Anna'], ['Goodman-Bacon decomposition', 'Goodman-Bacon 分解'], ['Changes-in-changes', '变化中的变化'], ['Static TWFE', '静态 TWFE']], ok: 0,
      why: ['It estimates ATT(g,t) against never- or not-yet-treated units and lets you choose how to aggregate.', '它以从未处理或尚未处理的个体为对照估计 ATT(g,t)，并允许选择加总方式。'], anim: 'csdid' },
    { en: 'One state adopts a policy; 40 states do not, and their simple average tracks it poorly before treatment. What fits best?', zh: '一个州实施了政策，另外 40 个州没有，而它们的简单平均在处理前与该州走势差别很大。哪种方法最合适？',
      opts: [['Static TWFE', '静态 TWFE'], ['Synthetic control or synthetic DiD', '合成控制或合成双重差分'], ['Fuzzy DiD', '模糊双重差分'], ['Triple differences', '三重差分']], ok: 1,
      why: ['Re-weighting the control states to match the treated state’s pre-treatment path is more credible than an unweighted comparison.', '对对照州重新加权，使其匹配处理州的处理前走势，比不加权的比较更可信。'], anim: 'sdid' },
    { en: 'With 50 states and serially correlated outcomes, how should standard errors be computed?', zh: '有 50 个州且结果变量存在序列相关时，应如何计算标准误？',
      opts: [['Conventional OLS standard errors', '常规 OLS 标准误'], ['Robust to heteroskedasticity only', '只对异方差稳健'], ['Clustered by state', '按州聚类'], ['Clustered by state-year', '按州-年聚类']], ok: 2,
      why: ['Cluster at the level at which treatment is assigned. Bertrand, Duflo & Mullainathan (2004) found conventional standard errors reject far too often.', '应在处理分配的层级聚类。Bertrand, Duflo & Mullainathan（2004）发现常规标准误的拒绝率过高。'], anim: 'cluster' },
    { en: 'You have 10 clusters, only 2 of them treated. Which inference is most reliable?', zh: '你有 10 个聚类，其中只有 2 个接受处理。哪种推断最可靠？',
      opts: [['Conventional standard errors', '常规标准误'], ['Clustered standard errors with normal critical values', '使用正态临界值的聚类标准误'], ['Wild cluster bootstrap or randomisation inference', '野聚类自助法或随机化推断'], ['Clustering by unit-year', '按个体-年份聚类']], ok: 2,
      why: ['Clustered standard errors are too small with few (treated) clusters; the wild cluster bootstrap (boottest) or randomisation inference does better.', '聚类数（尤其是处理组聚类）较少时，聚类标准误偏小；野聚类自助法（boottest）或随机化推断表现更好。'], anim: 'wildboot' },
    { en: 'Treatment sometimes switches off again. Which estimator is designed for that?', zh: '处理有时会再次关闭。哪个估计量是为此设计的？',
      opts: [['did_multiplegt_dyn', 'did_multiplegt_dyn'], ['csdid', 'csdid'], ['bacondecomp', 'bacondecomp'], ['synth', 'synth']], ok: 0,
      why: ['de Chaisemartin & D’Haultfœuille compare switchers with units that had the same treatment at baseline and have not switched yet.', 'de Chaisemartin & D’Haultfœuille 把切换者与期初处理相同且尚未切换的个体相比较。'], anim: 'dcdh' },
    { en: 'What does a triple-differences design need to be parallel?', zh: '三重差分设计需要什么保持平行？',
      opts: [['Trends in every group separately', '每一组各自的趋势'], ['The gap in trends between the affected and unaffected groups', '受影响组与不受影响组之间的趋势差距'], ['Levels of the outcome', '结果变量的水平'], ['Treatment shares', '处理比例']], ok: 1,
      why: ['DDD differences out shocks that hit a state for everyone, so only the relative trend between the two groups has to be parallel.', '三重差分去掉了对整个州所有人都有影响的冲击，因此只要求两组之间的相对趋势保持平行。'], anim: 'ddd' },
    { en: 'Everyone is eventually treated (no never-treated units). Which effects cannot be estimated?', zh: '所有个体最终都会接受处理（没有从未处理的个体）。哪些效应无法估计？',
      opts: [['Effects in the first year of treatment', '处理第一年的效应'], ['Effects after the last cohort adopts', '最后一个批次处理之后的效应'], ['Any effect at all', '任何效应'], ['Effects for the last cohort', '最后一个批次的效应']], ok: 1,
      why: ['Once every unit is treated there is no clean control left, so later periods are not identified. Try it in the simulator above.', '一旦所有个体都已接受处理，就没有干净的对照了，因此之后的时期无法识别。可以在上面的模拟器中试试。'], anim: 'csdid' },
    { en: 'John Snow compared two water companies before and after one moved its intake. What did he find?', zh: '约翰·斯诺比较了两家自来水公司在其中一家迁移取水口前后的情况。他发现了什么？',
      opts: [['No difference in cholera deaths', '霍乱死亡人数没有差别'], ['Cholera fell sharply for the company that moved upstream', '迁往上游的公司供水区霍乱死亡率大幅下降'], ['Cholera rose for both equally', '两家公司供水区的霍乱死亡率同样上升'], ['He did not compare over time', '他没有做跨期比较']], ok: 1,
      why: ['Deaths per 10,000 households fell from 62 to 14 for Lambeth and rose from 565 to 614 for Southwark & Vauxhall: a DiD of −97.', '每万户死亡人数：Lambeth 从 62 降到 14，Southwark & Vauxhall 从 565 升到 614：双重差分为 −97。'], anim: 'snow' }
  ];

  var T = ZH
    ? { term: '术语', other: 'English', def: '含义', watch: '动画', score: function (a, b, n) { return '已答 ' + b + ' / ' + n + ' 题，答对 ' + a + ' 题'; }, right: '答对了。', wrong: '不对。', reset: '重新作答', filter: '搜索术语' }
    : { term: 'Term', other: '中文', def: 'Meaning', watch: 'Animation', score: function (a, b, n) { return a + ' correct out of ' + b + ' answered (' + n + ' questions)'; }, right: 'Correct.', wrong: 'Not quite.', reset: 'Start again', filter: 'Search terms' };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function mountGlossary(root) {
    var rows = GLOSSARY.map(function (g) {
      var a = ZH ? [g[1], g[0], g[3]] : [g[0], g[1], g[2]];
      return '<tr><th scope="row">' + esc(a[0]) + '</th><td lang="' + (ZH ? 'en' : 'zh-Hans') + '">' + esc(a[1]) + '</td><td>' + esc(a[2]) +
        (g[4] ? ' <a class="gl-anim" href="#anim-' + g[4] + '" aria-label="' + T.watch + '">▶</a>' : '') + '</td></tr>';
    }).join('');
    root.innerHTML = '<label class="gl-search"><span>' + T.filter + '</span><input type="search" id="gl-q" autocomplete="off"></label>' +
      '<div class="tablewrap gl-wrap" tabindex="0" role="region" aria-label="' + T.term + '">'<table class="gl"><thead><tr><th>' + T.term + '</th><th>' + T.other + '</th><th>' + T.def + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    var q = root.querySelector('#gl-q');
    q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      root.querySelectorAll('tbody tr').forEach(function (tr) { tr.hidden = v && tr.textContent.toLowerCase().indexOf(v) < 0; });
    });
  }

  function mountQuiz(root) {
    var answered = {}, n = QUIZ.length;
    root.innerHTML = '<p class="qz-score" aria-live="polite"></p><ol class="qz">' + QUIZ.map(function (q, i) {
      return '<li class="qz-q"><fieldset><legend>' + esc(ZH ? q.zh : q.en) + '</legend>' + q.opts.map(function (o, j) {
        var id = 'qz-' + i + '-' + j;
        return '<label for="' + id + '"><input type="radio" name="qz-' + i + '" id="' + id + '" value="' + j + '"> <span>' + esc(ZH ? o[1] : o[0]) + '</span></label>';
      }).join('') + '</fieldset><p class="qz-fb" hidden></p></li>';
    }).join('') + '</ol><button type="button" class="guide-reset qz-reset">' + T.reset + '</button>';
    var score = root.querySelector('.qz-score');
    function upd() {
      var a = 0, b = 0; for (var k in answered) { b++; if (answered[k]) a++; }
      score.textContent = T.score(a, b, n);
    }
    root.addEventListener('change', function (e) {
      var m = /^qz-(\d+)$/.exec(e.target.name || ''); if (!m) return;
      var i = +m[1], q = QUIZ[i], ok = +e.target.value === q.ok;
      answered[i] = ok;
      var li = root.querySelectorAll('.qz-q')[i], fb = li.querySelector('.qz-fb');
      li.classList.toggle('is-right', ok); li.classList.toggle('is-wrong', !ok);
      li.querySelectorAll('label').forEach(function (l, j) { l.classList.toggle('is-answer', j === q.ok); });
      fb.innerHTML = '<b>' + (ok ? T.right : T.wrong) + '</b> ' + esc(ZH ? q.why[1] : q.why[0]) + (q.anim ? ' <a class="anim-link" href="#anim-' + q.anim + '">' + (ZH ? '观看动画' : 'Watch the animation') + '</a>' : '');
      fb.hidden = false;
      upd();
    });
    root.querySelector('.qz-reset').addEventListener('click', function () {
      answered = {};
      root.querySelectorAll('input[type=radio]').forEach(function (r) { r.checked = false; });
      root.querySelectorAll('.qz-q').forEach(function (li) { li.classList.remove('is-right', 'is-wrong'); li.querySelector('.qz-fb').hidden = true; li.querySelectorAll('label').forEach(function (l) { l.classList.remove('is-answer'); }); });
      upd();
    });
    upd();
  }

  window.DIDLearn = { mountGlossary: mountGlossary, mountQuiz: mountQuiz, GLOSSARY: GLOSSARY, QUIZ: QUIZ };
})();
