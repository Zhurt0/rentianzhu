#!/usr/bin/env python3
"""Build the Chinese difference-in-differences page (zh/did/index.html) from did/index.html.

Run from the repository root after editing the English page:

    python3 tools/build_did_zh.py

(tools/build_zh.py runs this too.) Each English text block below is replaced
by its Chinese version. A block that no longer appears in the English page
stops the build, which is the cue to update the table. Citations in the
reference list stay in English. The animations translate themselves: their
captions live in did/anim/scenes.js and follow the page's lang attribute.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "did" / "index.html"
OUT = ROOT / "zh" / "did" / "index.html"

# Exact replacements of whole pieces of markup (head, paths, switches).
MARKUP = [
    ('<html lang="en">', '<html lang="zh-Hans">'),
    ("<title>Difference-in-Differences: The Story of the Economists' Workhorse</title>",
     "<title>双重差分法：经济学家的主力方法</title>"),
    ('<meta name="description" content="A collection on difference-in-differences: what it is, its modern variants, the Stata command for each, the papers behind them, and 13 animated guides.">',
     '<meta name="description" content="双重差分法（DiD）资料合集：基本原理、各种新版本、对应的 Stata 命令、相关文献，以及 13 个动画讲解。">'),
    ('<link rel="canonical" href="https://zhurt0.github.io/rentianzhu/did/">',
     '<link rel="canonical" href="https://zhurt0.github.io/rentianzhu/zh/did/">'),
    ("<meta property=\"og:title\" content=\"Difference-in-Differences: The Story of the Economists' Workhorse\">",
     '<meta property="og:title" content="双重差分法：经济学家的主力方法">'),
    ('<meta property="og:description" content="What difference-in-differences is, its modern versions, the Stata command for each, and 13 animated guides.">',
     '<meta property="og:description" content="双重差分法的基本原理、各种新版本、对应的 Stata 命令，以及 13 个动画讲解。">'),
    ('<meta property="og:url" content="https://zhurt0.github.io/rentianzhu/did/">',
     '<meta property="og:url" content="https://zhurt0.github.io/rentianzhu/zh/did/">'),
    # self-hosted Lora instead of Google Fonts, as on the other Chinese pages
    ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', ''),
    ('<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">',
     '<link rel="stylesheet" href="../../css/fonts-local.css">'),
    ('body{margin:0;background:var(--bg);color:var(--ink);font-family:Lora,Georgia,"Times New Roman",serif;font-size:17px;line-height:1.65}',
     'body{margin:0;background:var(--bg);color:var(--ink);font-family:Lora,"Songti SC","STSong","Source Han Serif SC","Noto Serif CJK SC","Noto Serif SC","SimSun",serif;font-size:17px;line-height:1.85}'),
    ('<div class="lang-switch"><span>EN</span><a href="../zh/did/" lang="zh-Hans" hreflang="zh-Hans">中文</a></div>',
     '<div class="lang-switch"><a href="../../did/" lang="en" hreflang="en">EN</a><span>中文</span></div>'),
    ('<div class="anim-player" data-mp4="videos/en/">', '<div class="anim-player" data-mp4="../../did/videos/zh/">'),
    ('<script src="anim/engine.js"></script>', '<script src="../../did/anim/engine.js"></script>'),
    ('<script src="anim/scenes.js"></script>', '<script src="../../did/anim/scenes.js"></script>'),
    ('<script src="sim/sim.js"></script>', '<script src="../../did/sim/sim.js"></script>'),
    ('<span class="tag">built-in</span>', '<span class="tag">Stata 内置</span>'),
    ('<span class="tag">built-in: xthdidregress</span>', '<span class="tag">内置：xthdidregress</span>'),
    ('<span class="tag">covariates</span>', '<span class="tag">协变量</span>'),
    ('<span class="tag">dose</span>', '<span class="tag">剂量</span>'),
    ('<span class="tag">distributional</span>', '<span class="tag">分布效应</span>'),
]

# (English inner HTML, Chinese inner HTML) for text blocks.
TEXT = [
    # hero and menu
    ('Difference-in-Differences', '双重差分法'),
    ('The Story of the Economists&rsquo; Workhorse', '经济学家的主力方法'),
    ('What it is &middot; every major version &middot; the Stata command for each &middot; the papers behind them &middot; 13 animated guides',
     '基本原理 &middot; 各种主要版本 &middot; 对应的 Stata 命令 &middot; 相关文献 &middot; 13 个动画讲解'),
    ('Compiled by <a href="https://zhurt0.github.io/rentianzhu/">Rentian Zhu</a> &middot; <a href="https://github.com/Zhurt0/rentianzhu/tree/main/did">Source on GitHub</a>',
     '整理：<a href="https://zhurt0.github.io/rentianzhu/zh/">朱任天</a> &middot; <a href="https://github.com/Zhurt0/rentianzhu/tree/main/did">GitHub 源代码</a>'),
    ('Watch the animated guides', '观看动画讲解'),
    ('What it is', '基本原理'),
    ('Animations', '动画讲解'),
    ('The story', '发展历程'),
    ('The TWFE problem', 'TWFE 的问题'),
    ('Versions', '各种版本'),
    ('Stata cheat sheet', 'Stata 速查表'),
    ('Workflow', '实证流程'),
    ('References', '参考文献'),

    # 1
    ('What is difference-in-differences?', '什么是双重差分法？'),
    ('Compare the change over time in a treated group with the change over time in an untreated group. The second difference removes whatever both groups share.',
     '把处理组随时间的变化与未处理组随时间的变化相比较。第二次差分去掉了两组共同经历的一切。'),
    ('In the canonical 2&times;2 design there are two groups (treated, control) and two periods (before, after). The estimator is',
     '在经典的 2&times;2 设计中，有两个组（处理组、对照组）和两个时期（政策前、政策后）。估计量为'),
    ('which is numerically the coefficient on the interaction in', '它在数值上等于下面回归中交互项的系数'),
    ('and identifies the <b>average treatment effect on the treated (ATT)</b> under three assumptions:',
     '在以下三个假设下，它识别的是<b>处理组的平均处理效应（ATT）</b>：'),
    ('Parallel trends', '平行趋势'),
    ('Absent treatment, the treated group&rsquo;s average outcome would have moved in parallel with the control group&rsquo;s. Untestable for the post period; pre-trends are only suggestive evidence.',
     '如果没有处理，处理组的平均结果会与对照组平行变化。处理后的这一假设无法检验；处理前趋势只能作为参考证据。'),
    ('No anticipation', '无预期效应'),
    ('Units do not respond to the treatment before it starts, so pre-period outcomes are untreated potential outcomes.',
     '个体在处理开始前不会对其作出反应，因此处理前的结果就是未处理状态下的潜在结果。'),
    ('SUTVA / no spillovers', 'SUTVA / 无溢出效应'),
    ('One unit&rsquo;s treatment does not change another unit&rsquo;s outcome, and the composition of the groups is stable.',
     '一个个体是否接受处理不影响其他个体的结果，且各组的构成保持稳定。'),
    ('With many units and periods, the 2&times;2 regression generalises to <b>two-way fixed effects (TWFE)</b> and its dynamic sibling, the <b>event study</b>:',
     '当个体和时期较多时，2&times;2 回归推广为<b>双向固定效应（TWFE）</b>模型，以及它的动态版本<b>事件研究</b>：'),
    ('static TWFE', '静态 TWFE'),
    ('event study, G<sub>i</sub> = first treated period', '事件研究，G<sub>i</sub> = 首次接受处理的时期'),

    # 2
    ('Animated guides', '动画讲解'),
    ('Thirteen short animations, one for each idea, built on simulated data. In the TWFE and Sun &amp; Abraham scenes the estimates come from actual regressions on the simulated panels, so the bias you see there is real.',
     '十三个短动画，每个讲一个方法，使用模拟数据。TWFE 和 Sun &amp; Abraham 两节中的估计值来自对模拟面板的真实回归，所以其中看到的偏误是真实存在的。'),
    ('The animations need JavaScript. You can watch them as videos instead: <a href="videos/en/all.mp4">all 13 in one MP4</a>.',
     '动画需要 JavaScript。也可以直接观看视频：<a href="../../did/videos/zh/all.mp4">13 个动画合集（MP4）</a>。'),
    ('Prefer a file? Each animation has an MP4 link under the player, or download <a href="videos/en/all.mp4">all 13 as one video</a> (about 9 minutes).',
     '想下载视频？播放器下方有每个动画的 MP4 链接，也可以下载<a href="../../did/videos/zh/all.mp4">全部 13 个动画的合集</a>（约 9 分钟）。'),

    # simulator
    ('Simulator', '模拟器'),
    ('Try it: a DiD simulator', '动手试试：双重差分模拟器'),
    ('Choose when cohorts adopt and how effects behave. The panel has no noise and parallel trends hold exactly, so any gap between an estimate and the truth is pure bias.',
     '选择各批次的处理时间和效应的变化方式。模拟面板没有噪声，平行趋势严格成立，所以估计值与真实值之间的任何差距都纯粹是偏误。'),
    ('The simulator needs JavaScript.', '模拟器需要 JavaScript。'),
    ('The weights follow de Chaisemartin &amp; D&rsquo;Haultf&oelig;uille (2020): static TWFE equals the weighted sum of the true effects in the cells above. Callaway &amp; Sant&rsquo;Anna uses not-yet-treated units (including the never treated) as controls.',
     '权重的算法来自 de Chaisemartin &amp; D&rsquo;Haultf&oelig;uille（2020）：静态 TWFE 等于上面各格真实效应的加权和。Callaway &amp; Sant&rsquo;Anna 以尚未处理的个体（包括从未处理的个体）作为对照。'),

    # 3
    ('The story', '发展历程'),
    ('From a London water pump to the &ldquo;credibility revolution&rdquo; and the post-2018 rewrite of the textbook.',
     '从伦敦的一台水泵，到“可信性革命”，再到 2018 年后教科书的改写。'),
    ('<b class="y">1855</b>John Snow compares cholera deaths across London households served by two water companies before and after one moved its intake upstream &mdash; DiD logic before the name existed.',
     '<b class="y">1855</b>约翰·斯诺比较了伦敦由两家自来水公司供水的家庭在其中一家把取水口迁往上游前后的霍乱死亡人数。这名字出现之前，双重差分的思路就已经有了。'),
    ('<b class="y">1915</b>Obenauer and von der Nienburg study Oregon&rsquo;s minimum wage for women by comparing affected and unaffected groups before and after, an early use in labour economics.',
     '<b class="y">1915</b>Obenauer 和 von der Nienburg 比较了受影响与不受影响群体在政策前后的变化，研究俄勒冈州的女性最低工资，这是劳动经济学中的早期应用。'),
    ('<b class="y">1978&ndash;85</b>Ashenfelter, then Ashenfelter &amp; Card, evaluate training programmes with before/after comparisons against a comparison group, and find the &ldquo;Ashenfelter dip&rdquo;.',
     '<b class="y">1978&ndash;85</b>Ashenfelter 以及后来的 Ashenfelter &amp; Card 用与对照组的前后比较评估职业培训项目，并发现了“Ashenfelter 下沉”现象。'),
    ('<b class="y">1990&ndash;94</b>Card&rsquo;s Mariel boatlift study and Card &amp; Krueger&rsquo;s New Jersey&ndash;Pennsylvania minimum-wage study make DiD the signature design of the credibility revolution. Gruber (1994) adds the triple difference.',
     '<b class="y">1990&ndash;94</b>Card 关于马里埃尔偷渡潮的研究，以及 Card &amp; Krueger 关于新泽西州与宾夕法尼亚州最低工资的研究，使双重差分成为可信性革命的标志性设计。Gruber（1994）提出了三重差分。'),
    ('<b class="y">2004</b>Bertrand, Duflo &amp; Mullainathan show serial correlation makes conventional DiD standard errors far too small; clustering at the treatment level becomes standard.',
     '<b class="y">2004</b>Bertrand, Duflo &amp; Mullainathan 指出序列相关会使常规双重差分的标准误严重偏小；此后在处理层级聚类成为标准做法。'),
    ('<b class="y">2005&ndash;06</b>Abadie&rsquo;s semiparametric DiD (conditional parallel trends) and Athey &amp; Imbens&rsquo; changes-in-changes extend DiD beyond the linear model.',
     '<b class="y">2005&ndash;06</b>Abadie 的半参数双重差分（条件平行趋势）和 Athey &amp; Imbens 的变化中的变化方法，把双重差分推广到线性模型之外。'),
    ('<b class="y">2018&ndash;21</b>The staggered-adoption literature: Goodman-Bacon, de Chaisemartin &amp; D&rsquo;Haultf&oelig;uille, Callaway &amp; Sant&rsquo;Anna, Sun &amp; Abraham and Borusyak, Jaravel &amp; Spiess show that TWFE can mislead when effects are heterogeneous, and propose replacements.',
     '<b class="y">2018&ndash;21</b>交错处理文献：Goodman-Bacon、de Chaisemartin &amp; D&rsquo;Haultf&oelig;uille、Callaway &amp; Sant&rsquo;Anna、Sun &amp; Abraham 以及 Borusyak, Jaravel &amp; Spiess 指出，在效应异质时 TWFE 可能给出误导性结果，并提出了替代方法。'),
    ('<b class="y">2022&ndash;</b>Attention shifts to the credibility of parallel trends itself (Roth; Rambachan &amp; Roth), continuous and non-absorbing treatments, and hybrids with synthetic control.',
     '<b class="y">2022&ndash;</b>研究重点转向平行趋势本身的可信度（Roth；Rambachan &amp; Roth）、连续和非吸收型处理，以及与合成控制法的结合。'),

    # 4
    ('Why the textbook estimator broke', '教科书估计量为何失灵'),
    ('When units adopt treatment at different dates, the static TWFE coefficient is a weighted average of every possible 2&times;2 comparison in the data (Goodman-Bacon 2021). Some of those comparisons use <b>already-treated units as controls</b>. If treatment effects grow or differ across cohorts, those &ldquo;forbidden comparisons&rdquo; subtract earlier effects from later ones; the weights can be negative, and the TWFE estimate can even have the opposite sign to every underlying effect (de Chaisemartin &amp; D&rsquo;Haultf&oelig;uille 2020). Event-study leads and lags are contaminated in the same way (Sun &amp; Abraham 2021), so flat pre-trends from a TWFE event study are not reliable evidence.',
     '当个体在不同时间接受处理时，静态 TWFE 系数是数据中所有可能的 2&times;2 比较的加权平均（Goodman-Bacon 2021）。其中一些比较把<b>已经接受处理的个体当作对照</b>。如果处理效应随时间增长或在批次之间不同，这些“禁止的比较”会用后期效应减去早期效应；权重可能为负，TWFE 估计值甚至可能与每一个真实效应符号相反（de Chaisemartin &amp; D&rsquo;Haultf&oelig;uille 2020）。事件研究的前导项和滞后项也会以同样方式被污染（Sun &amp; Abraham 2021），因此 TWFE 事件研究中平坦的处理前趋势并不是可靠的证据。'),
    ('TWFE is still fine when there is a single treatment date, or when effects are homogeneous across cohorts and time. Otherwise, use one of the heterogeneity-robust estimators below. They all share one idea: <b>only compare treated units to not-yet-treated or never-treated units</b>, then aggregate with sensible weights.',
     '当只有一个处理时点，或效应在批次和时间上同质时，TWFE 仍然适用。否则应使用下面这些对异质性稳健的估计量。它们的共同思路是：<b>只把处理个体与尚未处理或从未处理的个体相比较</b>，再用合理的权重加总。'),

    # 5
    ('The versions', '各种版本'),
    # the tag inside was already translated by MARKUP
    ('Grouped by the problem each one solves. Commands marked <span class="tag">Stata 内置</span> ship with Stata 17+; the rest are community-contributed.',
     '按所解决的问题分类。标有<span class="tag">Stata 内置</span>的命令随 Stata 17 及以上版本提供，其余为用户编写的命令。'),
    ('A. Classic designs', 'A. 经典设计'),
    ('B. Diagnosing TWFE', 'B. 诊断 TWFE'),
    ('C. Staggered adoption: heterogeneity-robust estimators', 'C. 交错处理：对异质性稳健的估计量'),
    ('D. Treatments that are not binary and absorbing', 'D. 非二元、非吸收型处理'),
    ('E. When parallel trends is doubtful', 'E. 平行趋势存疑时'),
    ('F. Inference', 'F. 统计推断'),
    ('Watch the animation', '观看动画'),
    ('Canonical DiD', '经典双重差分'),
    ('Two groups, two periods, or a single treatment date.', '两组两期，或只有一个处理时点。'),
    ('Two-way fixed effects &amp; event study', '双向固定效应与事件研究'),
    ('The traditional workhorse. Safe with one treatment date or homogeneous effects.', '传统的主力方法。只有一个处理时点或效应同质时可以放心使用。'),
    ('Correia (2017); Miller (2023); plotting: <code>eventdd</code> (Clarke &amp; Tapia-Schythe 2021), <code>xtevent</code> (Freyaldenhoven et al. 2019)',
     'Correia (2017); Miller (2023)；作图：<code>eventdd</code>（Clarke &amp; Tapia-Schythe 2021）、<code>xtevent</code>（Freyaldenhoven et al. 2019）'),
    ('Triple differences', '三重差分'),
    ('Adds a within-group unaffected subgroup to difference out group-specific shocks. Needs only that the <i>gap</i> in trends is parallel.',
     '加入组内不受影响的子群体，以差分掉组别特有的冲击。只要求趋势的<i>差距</i>保持平行。'),
    ('Conditional parallel trends', '条件平行趋势'),
    ('Parallel trends holds only after conditioning on covariates. Outcome regression, inverse-probability weighting, or doubly robust combinations.',
     '平行趋势只在控制协变量后成立。可用结果回归、逆概率加权，或两者结合的双重稳健方法。'),
    ('Goodman-Bacon decomposition', 'Goodman-Bacon 分解'),
    ('Splits the TWFE coefficient into all 2&times;2 comparisons and their weights; shows how much comes from &ldquo;later vs. already treated&rdquo;.',
     '把 TWFE 系数拆分为所有 2&times;2 比较及其权重，显示有多少来自“晚处理组对比已处理组”的比较。'),
    ('Negative-weights check', '负权重检验'),
    ('Counts how many ATTs receive negative weight in the TWFE regression and how sensitive the estimate is to heterogeneity.',
     '统计 TWFE 回归中有多少个 ATT 被赋予负权重，以及估计值对异质性有多敏感。'),
    ('Callaway &amp; Sant&rsquo;Anna', 'Callaway &amp; Sant&rsquo;Anna'),
    ('Estimates group-time ATT(g,t) for each cohort and period against never- or not-yet-treated units, then aggregates. Handles covariates (doubly robust).',
     '以从未处理或尚未处理的个体为对照，为每个批次和时期估计 ATT(g,t)，再加总。可以纳入协变量（双重稳健）。'),
    ('Sun &amp; Abraham', 'Sun &amp; Abraham'),
    ('Interaction-weighted event study: cohort-specific leads and lags, averaged with cohort-share weights. Closest to the familiar regression.',
     '交互加权事件研究：分批次估计前导项和滞后项，再按批次占比加权平均。与常用的回归形式最接近。'),
    ('Imputation estimator', '插补估计量'),
    ('Fit unit and time effects on untreated observations only, impute Y(0) for treated ones, average the differences. Efficient under homoskedasticity.',
     '只用未处理的观测值估计个体效应和时间效应，为处理后的观测值插补 Y(0)，再对差值取平均。在同方差下是有效的。'),
    ('Two-stage DiD', '两阶段双重差分'),
    ('Same imputation idea in two regressions: residualise on fixed effects from untreated observations, then regress on treatment. GMM standard errors.',
     '用两步回归实现同样的插补思路：先用未处理观测值估计的固定效应求残差，再对处理变量回归。使用 GMM 标准误。'),
    ('Extended TWFE', '扩展 TWFE'),
    ('Wooldridge&rsquo;s point: TWFE is not the problem, the restrictive specification is. Saturate with cohort &times; time interactions; extends naturally to logit and Poisson.',
     'Wooldridge 的观点：问题不在 TWFE 本身，而在过于受限的设定。加入完整的批次 &times; 时间交互项即可；还能自然推广到 logit 和泊松模型。'),
    ('Stacked DiD', '堆叠双重差分'),
    ('Build a clean 2&times;2 dataset for each adoption event (treated cohort plus clean controls), stack them, and run one regression with stack-specific fixed effects.',
     '为每个处理事件构造一个干净的 2&times;2 数据集（处理批次加干净对照），把它们堆叠起来，用含有子数据集特定固定效应的回归一次估计。'),
    ('Local-projections DiD', '局部投影双重差分'),
    ('Horizon-by-horizon long-difference regressions restricted to newly treated and clean control observations. Fast, flexible with covariates and non-absorbing treatment.',
     '逐期做长差分回归，样本只保留新处理的观测值和干净的对照。计算快，便于加入协变量和处理非吸收型处理。'),
    ('Efficient estimator under random timing', '随机处理时点下的有效估计量'),
    ('If treatment timing is (quasi-)random, pre-period outcomes can be used like covariates in an experiment for a more precise estimate.',
     '如果处理时点（近似）随机，可以像实验中的协变量一样利用处理前结果，得到更精确的估计。'),
    ('Switching on and off, any intensity', '可开可关、任意强度的处理'),
    ('Compares &ldquo;switchers&rdquo; to units with the same baseline treatment that have not switched yet. Works with binary, discrete or continuous, non-absorbing treatments.',
     '把“切换者”与期初处理状态相同、尚未切换的个体相比较。适用于二元、离散或连续的非吸收型处理。'),
    ('Continuous treatment / dose', '连续处理 / 剂量'),
    ('With a continuous dose, parallel trends alone does not identify a dose-response curve; a stronger assumption is needed. <code>did_had</code> covers designs where everyone gets some dose.',
     '处理剂量连续时，仅靠平行趋势无法识别剂量反应曲线，需要更强的假设。<code>did_had</code> 适用于所有个体都接受一定剂量的设计。'),
    ('Fuzzy DiD', '模糊双重差分'),
    ('Treatment rate rises more in one group than the other, but no group is fully treated or untreated. Wald-DiD, time-corrected Wald, and changes-in-changes Wald.',
     '一组的处理比例比另一组上升得更多，但没有哪一组完全处理或完全未处理。可用 Wald-DiD、时间修正 Wald 以及变化中的变化 Wald 估计量。'),
    ('Changes-in-changes', '变化中的变化'),
    ('Nonlinear generalisation: identifies the whole counterfactual distribution (quantile effects), invariant to monotone transformations of the outcome.',
     '非线性推广：识别整个反事实分布（分位数效应），且对结果变量的单调变换保持不变。'),
    ('Honest DiD (sensitivity)', 'Honest DiD（敏感性分析）'),
    ('Reports confidence sets that stay valid if the post-period violation of parallel trends is at most M times the largest pre-period violation, or bounded in smoothness.',
     '报告在以下条件下仍然有效的置信集：处理后对平行趋势的偏离不超过处理前最大偏离的 M 倍，或其平滑程度有界。'),
    ('Power of pre-trend tests', '预趋势检验的统计功效'),
    ('Pre-tests have low power and conditioning on passing them distorts inference. Computes the trend your pre-test would detect with given power.',
     '预检验的功效往往很低，而以通过预检验为条件会扭曲推断。该方法计算在给定功效下预检验能发现多大的趋势。'),
    ('Synthetic control &amp; synthetic DiD', '合成控制与合成双重差分'),
    ('Re-weight control units (and, in SDID, pre-periods) so the comparison group matches the treated group&rsquo;s pre-trend, then difference.',
     '对对照个体（在 SDID 中还包括处理前各期）重新加权，使对照组与处理组的处理前趋势相匹配，再做差分。'),
    ('Factor models / matrix completion', '因子模型 / 矩阵补全'),
    ('Replace additive unit and time effects with interactive fixed effects (latent factors) to allow unit-specific responses to common shocks.',
     '用交互固定效应（潜在因子）替代可加的个体和时间效应，允许不同个体对共同冲击有不同反应。'),
    ('Cluster at the level of treatment', '在处理层级聚类'),
    ('Outcomes are serially correlated within units, so cluster by the unit at which treatment is assigned (state, firm), not unit-year.',
     '同一个体的结果存在序列相关，因此应按处理分配的单位（州、企业）聚类，而不是按个体-年份聚类。'),
    ('Few clusters', '聚类数较少'),
    ('With fewer than roughly 40 clusters, or very few treated clusters, use the wild cluster bootstrap or randomisation inference.',
     '当聚类数少于约 40 个，或处理组的聚类很少时，应使用野聚类自助法或随机化推断。'),

    # 6
    ('Stata cheat sheet', 'Stata 速查表'),
    ('One row per command. A runnable simulation that calls most of them is in <a href="did_examples.do"><code>did_examples.do</code></a>.',
     '每行一个命令。<a href="../../did/did_examples.do"><code>did_examples.do</code></a> 是一个可直接运行的模拟示例，调用了其中大部分命令。'),
    ('Command', '命令'),
    ('Method', '方法'),
    ('Use it when', '适用情形'),
    ('Install', '安装'),
    ('Paper', '文献'),
    ('Single treatment date', '单一处理时点'),
    ('Group-time ATTs (RA, IPW, AIPW, TWFE)', '分组-时期 ATT（RA、IPW、AIPW、TWFE）'),
    ('Staggered, official command', '交错处理，官方命令'),
    ('TWFE with many fixed effects', '含大量固定效应的 TWFE'),
    ('Baseline and custom specifications', '基准模型和自定义设定'),
    ('2&times;2 with kernel matching, quantile DiD', '2&times;2，可结合核匹配、分位数双重差分'),
    ('Quick classic DiD', '快速估计经典双重差分'),
    ('Doubly robust 2&times;2', '双重稳健 2&times;2'),
    ('Covariate-conditional parallel trends', '以协变量为条件的平行趋势'),
    ('TWFE decomposition', 'TWFE 分解'),
    ('Diagnose staggered TWFE', '诊断交错处理下的 TWFE'),
    ('TWFE weights', 'TWFE 权重'),
    ('Check for negative weights', '检查负权重'),
    ('Group-time ATT', '分组-时期 ATT'),
    ('Staggered, covariates, never/not-yet controls', '交错处理，可加协变量，从未/尚未处理对照'),
    ('Interaction-weighted event study', '交互加权事件研究'),
    ('Staggered, regression-style', '交错处理，回归形式'),
    ('Imputation', '插补'),
    ('Staggered, efficiency, long panels', '交错处理，有效性，长面板'),
    ('Staggered, simple to explain', '交错处理，易于解释'),
    ('Staggered, nonlinear outcomes', '交错处理，非线性结果变量'),
    ('Stacked event study', '堆叠事件研究'),
    ('Staggered with clean-control windows', '交错处理，使用干净对照窗口'),
    ('Staggered, large data, non-absorbing', '交错处理，大数据，非吸收型处理'),
    ('Efficient estimator', '有效估计量'),
    ('Random treatment timing', '处理时点随机'),
    ('Switchers vs. not-yet-switchers', '切换者对比尚未切换者'),
    ('Non-binary or reversible treatment', '非二元或可逆的处理'),
    ('Heterogeneous adoption design', '异质采纳设计'),
    ('Everyone treated, varying dose', '所有个体都接受处理，剂量不同'),
    ('Fuzzy designs', '模糊设计'),
    ('Distributional effects', '分布效应'),
    ('Event-study estimation and plots', '事件研究估计与作图'),
    ('Plotting, combining estimators', '作图，组合多个估计量'),
    ('<code>ssc install</code> each', '分别 <code>ssc install</code>'),
    ('Sensitivity to parallel-trends violations', '对平行趋势偏离的敏感性'),
    ('After any event study', '任何事件研究之后'),
    ('Interpreting flat pre-trends', '解读平坦的处理前趋势'),
    ('Synthetic DiD', '合成双重差分'),
    ('Few treated units, poor pre-trend fit', '处理个体少，处理前趋势拟合差'),
    ('Synthetic control', '合成控制'),
    ('One or few treated units', '一个或少数几个处理个体'),
    ('Interactive FE, matrix completion', '交互固定效应，矩阵补全'),
    ('Latent factors, treatment reversals', '潜在因子，处理可逆'),
    ('Wild cluster bootstrap', '野聚类自助法'),
    ('Few clusters', '聚类数较少'),
    ('Option names in community-contributed packages change between versions. Check <code>help &lt;command&gt;</code> after installing; coding of never-treated units in particular differs (0 for <code>csdid</code> and <code>jwdid</code>, missing for <code>did_imputation</code> and <code>eventstudyinteract</code>).',
     '用户编写命令的选项名称会随版本变化。安装后请查看 <code>help &lt;命令名&gt;</code>；尤其要注意从未处理个体的编码方式不同（<code>csdid</code> 和 <code>jwdid</code> 用 0，<code>did_imputation</code> 和 <code>eventstudyinteract</code> 用缺失值）。'),

    # 7
    ('A practical workflow', '实证流程'),
    ('<b>Describe the design.</b> One treatment date or staggered? Absorbing or reversible? Binary or continuous? Are there never-treated units? Plot the rollout (<code>panelview</code>).',
     '<b>描述研究设计。</b>单一处理时点还是交错处理？吸收型还是可逆？二元还是连续？是否有从未处理的个体？画出处理的推进过程（<code>panelview</code>）。'),
    ('<b>Plot raw means</b> by cohort over time before running any regression.', '在做任何回归之前，先<b>画出各批次随时间变化的原始均值</b>。'),
    ('<b>Single date:</b> <code>didregress</code> or <code>reghdfe</code> with an event study is fine.',
     '<b>单一处理时点：</b>用 <code>didregress</code> 或 <code>reghdfe</code> 加事件研究即可。'),
    ('<b>Staggered:</b> run TWFE as a baseline, diagnose it with <code>bacondecomp</code> / <code>twowayfeweights</code>, then report at least one robust estimator (<code>csdid</code>, <code>did_imputation</code>, <code>eventstudyinteract</code>, <code>jwdid</code>, <code>lpdid</code>). They usually agree; if they do not, find out which comparison drives the gap.',
     '<b>交错处理：</b>先以 TWFE 作为基准，用 <code>bacondecomp</code> / <code>twowayfeweights</code> 诊断，再至少报告一个稳健估计量（<code>csdid</code>、<code>did_imputation</code>、<code>eventstudyinteract</code>、<code>jwdid</code>、<code>lpdid</code>）。它们通常结论一致；如果不一致，要找出是哪类比较造成了差异。'),
    ('<b>Choose the control group deliberately:</b> never-treated versus not-yet-treated changes the parallel-trends assumption you are making.',
     '<b>慎重选择对照组：</b>用从未处理组还是尚未处理组，对应的平行趋势假设并不相同。'),
    ('<b>Assess parallel trends honestly:</b> show the event study, report <code>honestdid</code> bounds and <code>pretrends</code> power instead of relying on an insignificant pre-test.',
     '<b>如实评估平行趋势：</b>展示事件研究图，报告 <code>honestdid</code> 区间和 <code>pretrends</code> 功效，而不是只依赖一个不显著的预检验。'),
    ('<b>Cluster</b> at the level of treatment assignment; use <code>boottest</code> with few clusters.',
     '在处理分配的层级<b>聚类</b>；聚类数较少时使用 <code>boottest</code>。'),

    # 8
    ('References', '参考文献'),
    ('Surveys and textbooks (start here)', '综述与教材（建议从这里开始）'),
    ('Origins and classics', '起源与经典'),
    ('Covariates, nonlinear and fuzzy designs', '协变量、非线性与模糊设计'),
    ('Staggered adoption and heterogeneous effects', '交错处理与异质效应'),
    ('Pre-trends, sensitivity and synthetic methods', '预趋势、敏感性分析与合成方法'),
    ('Inference', '统计推断'),
    ('Stata software papers', 'Stata 软件论文'),
]

FOOTER = ('Compiled as a reading and coding companion. Corrections welcome via the repository&rsquo;s issue tracker.',
          '作为阅读与编程的参考资料整理。如有错误，欢迎在代码仓库的 issue 中指出。')


def build():
    s = SRC.read_text(encoding="utf-8")
    missing = []
    for old, new in MARKUP:
        if old not in s:
            missing.append(old)
        s = s.replace(old, new)
    seen = set()
    for old, new in TEXT:
        if old in seen:
            continue
        seen.add(old)
        pat = re.compile(r'(?<=>)(\d+\. )?' + re.escape(old) + r'(?=<)')
        s, n = pat.subn(lambda m: (m.group(1) or '') + new, s)
        if n == 0:
            missing.append(old)
    if FOOTER[0] not in s:
        missing.append(FOOTER[0])
    s = s.replace(FOOTER[0], FOOTER[1])
    if missing:
        sys.exit("build_did_zh: these English pieces were not found; update tools/build_did_zh.py:\n  " + "\n  ".join(m[:100] for m in missing))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(s, encoding="utf-8")
    return OUT


if __name__ == "__main__":
    print("wrote", build().relative_to(ROOT))
