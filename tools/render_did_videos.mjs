#!/usr/bin/env node
// Render the difference-in-differences animations (did/anim/) to MP4.
//
//   node tools/render_did_videos.mjs                  all scenes, both languages
//   node tools/render_did_videos.mjs --lang zh        one language
//   node tools/render_did_videos.mjs --scene bacon    one scene
//   node tools/render_did_videos.mjs --sheet bacon --lang en --out sheet.png
//                                                     contact sheet of 12 frames, for checking
//
// Needs Playwright with Chromium and ffmpeg on the PATH. Output goes to
// did/videos/<lang>/NN-<scene>.mp4 plus did/videos/<lang>/all.mp4.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const FPS = Number(opt('fps', 30));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(ROOT, 'did/anim/render.html')).href);
await page.evaluate(() => document.fonts.ready);
const scenes = await page.evaluate(() => DIDAnim.SCENES.map(s => ({ id: s.id, dur: s.dur })));

async function frame(id, t, lang, w = 1280, h = 720) {
  const b64 = await page.evaluate(([id, t, lang, w, h]) => {
    const c = document.getElementById('c');
    if (c.width !== w) { c.width = w; c.height = h; }
    DIDAnim.renderFrame(c, id, t, lang);
    return c.toDataURL('image/png').split(',')[1];
  }, [id, t, lang, w, h]);
  return Buffer.from(b64, 'base64');
}

if (opt('sheet')) {
  const id = opt('sheet'), lang = opt('lang', 'en');
  const sc = scenes.find(s => s.id === id);
  const times = opt('times') ? opt('times').split(',').map(Number)
    : Array.from({ length: 12 }, (_, i) => +(1 + i * (sc.dur - 1.05) / 11).toFixed(2));
  const imgs = [];
  for (const t of times) imgs.push((await frame(id, t, lang, 640, 360)).toString('base64'));
  await page.setViewportSize({ width: 1920, height: 360 * Math.ceil(times.length / 3) });
  await page.setContent('<body style="margin:0;display:grid;grid-template-columns:repeat(3,640px);background:#000">' +
    imgs.map((b, i) => `<div style="position:relative"><img src="data:image/png;base64,${b}" style="display:block"><span style="position:absolute;left:6px;top:4px;color:#ff0;font:14px monospace">${times[i]}s</span></div>`).join('') + '</body>');
  await page.screenshot({ path: opt('out', 'sheet.png'), fullPage: true });
  await browser.close();
  process.exit(0);
}

const langs = opt('lang') ? [opt('lang')] : ['en', 'zh'];
const only = opt('scene');
for (const lang of langs) {
  const dir = path.join(ROOT, 'did/videos', lang);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [i, sc] of scenes.entries()) {
    const name = String(i + 1).padStart(2, '0') + '-' + sc.id + '.mp4';
    files.push(name);
    if (only && sc.id !== only) continue;
    const out = path.join(dir, name);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(sc.dur * FPS);
    for (let f = 0; f <= n; f++) {
      const buf = await frame(sc.id, f / FPS, lang);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
    console.log(lang, name, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
  }
  if (!only) {
    const list = path.join(dir, 'list.txt');
    fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
    await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(dir, 'all.mp4')], { stdio: 'inherit' })
      .on('close', c => c === 0 ? res() : rej(new Error('concat ' + c))));
    fs.unlinkSync(list);
    console.log(lang, 'all.mp4', (fs.statSync(path.join(dir, 'all.mp4')).size / 1e6).toFixed(2) + ' MB');
  }
}
await browser.close();
