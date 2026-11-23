// Generate the link-preview images did/og-en.png and did/og-zh.png from a frame of the TWFE animation.
// Run from anywhere: node tools/make_did_og.mjs (needs Playwright with Chromium).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file://' + ROOT + '/did/anim/render.html'); await p.evaluate(() => document.fonts.ready);
for (const lang of ['en', 'zh']) {
  const img = await p.evaluate(([lang]) => { const c = document.getElementById('c'); c.width = 1280; c.height = 720; DIDAnim.renderFrame(c, 'bacon', 47, lang); return c.toDataURL('image/png'); }, [lang]);
  const t = lang === 'en'
    ? { h: 'Difference-in-Differences', s: 'The Story of the Economists’ Workhorse', f: '21 animated guides · an interactive simulator · Stata commands · papers' }
    : { h: '双重差分法', s: '经济学家的主力方法', f: '21 个动画讲解 · 交互式模拟器 · Stata 命令 · 文献' };
  const q = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await q.setContent(`<html><head><style>@font-face{font-family:Lora;font-weight:400 700;src:url(data:font/woff2;base64,${require('fs').readFileSync(ROOT + '/fonts/lora-normal-latin.woff2').toString('base64')}) format('woff2')}</style></head><body style="margin:0;width:1200px;height:630px;background:#1a2340;color:#f5f1e6;font-family:Lora,'WenQuanYi Zen Hei',serif;position:relative;overflow:hidden">
    <img src="${img}" style="position:absolute;right:-6px;top:205px;width:650px;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.45)">
    <div style="position:absolute;left:64px;top:64px;width:470px">
      <div style="font-size:${lang === 'en' ? 54 : 76}px;font-weight:700;line-height:1.08">${t.h}</div>
      <div style="font-size:27px;color:#c3cde6;margin-top:14px;line-height:1.3">${t.s}</div>
      <div style="font-size:21px;color:#f08a5d;margin-top:28px;line-height:1.5;width:360px">${t.f}</div>
      <div style="font-size:18px;color:#9aa6c4;margin-top:90px">zhurt0.github.io/rentianzhu/${lang === 'en' ? 'did' : 'zh/did'}</div>
    </div></body></html>`);
  await q.waitForTimeout(500);
  await q.screenshot({ path: `${ROOT}/did/og-${lang}.png` });
}
await b.close();
