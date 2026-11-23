#!/usr/bin/env node
// One-page A4 cheat sheet for difference-in-differences, in English and Chinese:
// did/cheatsheet-en.pdf and did/cheatsheet-zh.pdf.  node tools/make_did_cheatsheet.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lora = fs.readFileSync(path.join(ROOT, 'fonts/lora-normal-latin.woff2')).toString('base64');

const T = {
  en: {
    title: 'Difference-in-differences cheat sheet', url: 'zhurt0.github.io/rentianzhu/did · 19 animated guides, a simulator and the full reference list',
    idea: 'The idea', ideaTxt: 'Compare the change over time in the treated group with the change in the control group. The second difference removes shocks both groups share.',
    ass: 'Assumptions', assL: ['<b>Parallel trends</b>: without treatment, the groups would have moved in parallel. Untestable after treatment.', '<b>No anticipation</b>: no response before treatment starts.', '<b>No spillovers</b>: one unit’s treatment does not affect another’s outcome.'],
    warn: 'When plain TWFE misleads', warnTxt: 'Staggered adoption + effects that differ across cohorts or grow over time. TWFE then uses already-treated units as controls ("forbidden comparisons"); some weights can be negative. Event-study leads and lags are contaminated too.',
    tab: 'Your design → estimator → Stata', cols: ['Design', 'Estimator', 'Stata'],
    rows: [
      ['One treatment date', 'Canonical DiD, TWFE event study', 'didregress · reghdfe'],
      ['Parallel trends needs covariates', 'Doubly robust DiD', 'drdid · csdid, method(dripw)'],
      ['Staggered adoption', 'Callaway & Sant’Anna · imputation · Sun & Abraham · extended TWFE · stacked · local projections', 'csdid · did_imputation · eventstudyinteract · jwdid · stackedev · lpdid'],
      ['Diagnose plain TWFE', 'Goodman-Bacon decomposition · negative weights', 'bacondecomp · twowayfeweights'],
      ['Treatment switches off or varies', 'de Chaisemartin & D’Haultfœuille', 'did_multiplegt_dyn'],
      ['Everyone gets some dose', 'Heterogeneous adoption design', 'did_had'],
      ['Only the share treated changes', 'Fuzzy DiD (Wald-DiD)', 'fuzzydid'],
      ['Effects across the distribution', 'Changes-in-changes', 'cic'],
      ['One or a few treated units', 'Synthetic DiD · synthetic control', 'sdid · synth'],
      ['Doubts about parallel trends', 'Honest DiD · power of pre-tests', 'honestdid · pretrends']
    ],
    inf: 'Inference', infL: ['Cluster at the level at which treatment is assigned: vce(cluster state).', 'Few clusters or few treated clusters: wild cluster bootstrap, boottest.', 'No never-treated units: effects after the last cohort adopts are not identified.'],
    wf: 'Workflow', wfL: ['Describe the design: timing, type of treatment, control units.', 'Plot raw means by cohort before any regression.', 'Staggered: TWFE as a baseline, diagnose it, then report at least one robust estimator.', 'Show the event study with Honest DiD bounds.', 'Cluster correctly; bootstrap with few clusters.'],
    read: 'Start here', readL: ['Roth, Sant’Anna, Bilinski & Poe (2023), J. Econometrics', 'de Chaisemartin & D’Haultfœuille (2023), Econometrics J.', 'Baker, Callaway, Cunningham, Goodman-Bacon & Sant’Anna (2025), practitioner’s guide'],
    note: 'Check option names with help after installing; never-treated units are coded 0 in csdid and jwdid but missing in did_imputation and eventstudyinteract.'
  },
  zh: {
    title: '双重差分法速查表', url: 'zhurt0.github.io/rentianzhu/zh/did · 19 个动画讲解、交互式模拟器和完整参考文献',
    idea: '基本思路', ideaTxt: '把处理组随时间的变化与对照组的变化相比较。第二次差分去掉了两组共同受到的冲击。',
    ass: '识别假设', assL: ['<b>平行趋势</b>：如果没有处理，两组会平行变化。处理后无法检验。', '<b>无预期效应</b>：处理开始前个体不会作出反应。', '<b>无溢出效应</b>：一个个体是否处理不影响其他个体的结果。'],
    warn: '普通 TWFE 何时会误导', warnTxt: '交错处理，且效应在批次间不同或随时间增长。此时 TWFE 会把已处理个体当作对照（“禁止的比较”），部分权重可能为负；事件研究的前导项和滞后项也会被污染。',
    tab: '研究设计 → 估计量 → Stata', cols: ['研究设计', '估计量', 'Stata'],
    rows: [
      ['单一处理时点', '经典双重差分、TWFE 事件研究', 'didregress · reghdfe'],
      ['平行趋势需控制协变量', '双重稳健双重差分', 'drdid · csdid, method(dripw)'],
      ['交错处理', 'Callaway & Sant’Anna · 插补法 · Sun & Abraham · 扩展 TWFE · 堆叠 · 局部投影', 'csdid · did_imputation · eventstudyinteract · jwdid · stackedev · lpdid'],
      ['诊断普通 TWFE', 'Goodman-Bacon 分解 · 负权重检验', 'bacondecomp · twowayfeweights'],
      ['处理会关闭或强度变化', 'de Chaisemartin & D’Haultfœuille', 'did_multiplegt_dyn'],
      ['所有个体都接受一定剂量', '异质采纳设计', 'did_had'],
      ['只有处理比例变化', '模糊双重差分（Wald-DiD）', 'fuzzydid'],
      ['关心整个分布上的效应', '变化中的变化', 'cic'],
      ['处理个体只有一个或少数几个', '合成双重差分 · 合成控制', 'sdid · synth'],
      ['对平行趋势有疑虑', 'Honest DiD · 预检验功效', 'honestdid · pretrends']
    ],
    inf: '统计推断', infL: ['在处理分配的层级聚类：vce(cluster state)。', '聚类数或处理组聚类较少：野聚类自助法，boottest。', '没有从未处理个体时，最后一个批次处理后的效应无法识别。'],
    wf: '实证流程', wfL: ['描述研究设计：处理时点、处理类型、对照个体。', '回归之前先画各批次的原始均值。', '交错处理：以 TWFE 为基准并诊断，再至少报告一个稳健估计量。', '展示事件研究图并报告 Honest DiD 区间。', '正确聚类；聚类数较少时用自助法。'],
    read: '入门文献', readL: ['Roth, Sant’Anna, Bilinski & Poe (2023), J. Econometrics', 'de Chaisemartin & D’Haultfœuille (2023), Econometrics J.', 'Baker, Callaway, Cunningham, Goodman-Bacon & Sant’Anna (2025)，实践指南'],
    note: '安装后请用 help 核对选项名称；从未处理个体在 csdid 和 jwdid 中编码为 0，在 did_imputation 和 eventstudyinteract 中为缺失值。'
  }
};

function html(L) {
  const t = T[L];
  const ul = a => '<ul>' + a.map(x => `<li>${x}</li>`).join('') + '</ul>';
  const ol = a => '<ol>' + a.map(x => `<li>${x}</li>`).join('') + '</ol>';
  return `<!DOCTYPE html><html lang="${L === 'zh' ? 'zh-Hans' : 'en'}"><head><meta charset="utf-8"><style>
@font-face{font-family:Lora;font-weight:400 700;src:url(data:font/woff2;base64,${lora}) format('woff2')}
@page{size:A4 landscape;margin:11mm 12mm}
*{box-sizing:border-box}
body{margin:0;font-family:Lora,"WenQuanYi Zen Hei","Noto Sans CJK SC","PingFang SC",serif;color:#1f2937;font-size:${L === 'zh' ? 9.6 : 9.4}pt;line-height:1.42}
header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2.5pt solid #1a2340;padding-bottom:4pt;margin-bottom:8pt}
h1{font-size:19pt;margin:0;color:#1a2340}
.url{font-size:8.5pt;color:#5b6475}
.grid{display:grid;grid-template-columns:1fr 1.85fr 1fr;gap:12pt}
h2{font-size:10.5pt;margin:0 0 3pt;color:#b4552d;text-transform:${L === 'zh' ? 'none' : 'uppercase'};letter-spacing:${L === 'zh' ? '0' : '.06em'}}
section{margin-bottom:9pt}
p{margin:0}
ul,ol{margin:0;padding-left:13pt}
li{margin-bottom:2pt}
.eq{font-family:"DejaVu Sans Mono",monospace;font-size:8.2pt;background:#f3f4f8;border-left:2.5pt solid #b4552d;padding:4pt 6pt;margin:5pt 0}
table{border-collapse:collapse;width:100%;font-size:8.6pt}
th{background:#1a2340;color:#f5f1e6;text-align:left;padding:4pt 5pt;font-weight:600}
td{border-bottom:.6pt solid #e2e5ec;padding:4pt 5pt;vertical-align:top}
td:last-child{font-family:"DejaVu Sans Mono",monospace;font-size:7.6pt;color:#b4552d}
tr:nth-child(even) td{background:#faf9f6}
.note{font-size:7.8pt;color:#5b6475;margin-top:5pt}
</style></head><body>
<header><h1>${t.title}</h1><span class="url">${t.url}</span></header>
<div class="grid">
<div>
<section><h2>${t.idea}</h2><p>${t.ideaTxt}</p>
<div class="eq">δ = (Ȳ<sub>T,post</sub> − Ȳ<sub>T,pre</sub>) − (Ȳ<sub>C,post</sub> − Ȳ<sub>C,pre</sub>)</div>
<div class="eq">Y<sub>it</sub> = α<sub>i</sub> + λ<sub>t</sub> + Σ<sub>k≠−1</sub> β<sub>k</sub>·1{t − G<sub>i</sub> = k} + ε<sub>it</sub></div></section>
<section><h2>${t.ass}</h2>${ul(t.assL)}</section>
<section><h2>${t.warn}</h2><p>${t.warnTxt}</p></section>
</div>
<div><section><h2>${t.tab}</h2><table><thead><tr>${t.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table><p class="note">${t.note}</p></section></div>
<div>
<section><h2>${t.inf}</h2>${ul(t.infL)}</section>
<section><h2>${t.wf}</h2>${ol(t.wfL)}</section>
<section><h2>${t.read}</h2>${ul(t.readL)}</section>
</div></div></body></html>`;
}

const b = await chromium.launch();
for (const L of ['en', 'zh']) {
  const p = await b.newPage();
  await p.setContent(html(L), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(ROOT, `did/cheatsheet-${L}.pdf`), format: 'A4', landscape: true, printBackground: true, margin: { top: '11mm', bottom: '11mm', left: '12mm', right: '12mm' } });
  await p.setViewportSize({ width: 1123, height: 794 });
  await p.screenshot({ path: `/tmp/cheat-${L}.png`, fullPage: true });
  const pages = (fs.readFileSync(path.join(ROOT, `did/cheatsheet-${L}.pdf`), 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(L, 'pages:', pages, (fs.statSync(path.join(ROOT, `did/cheatsheet-${L}.pdf`)).size / 1024).toFixed(0) + ' KB');
}
await b.close();
