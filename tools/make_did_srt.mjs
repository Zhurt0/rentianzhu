#!/usr/bin/env node
// Write SRT subtitle files for the DiD animation videos, from the same captions
// the videos show: did/videos/<lang>/NN-<scene>.srt and did/videos/<lang>/all.srt.
// Run after tools/render_did_videos.mjs:  node tools/make_did_srt.mjs
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;
const ctx = { window: {}, Math, Object, Array, String, Number, JSON, console };
vm.createContext(ctx);
for (const f of ['did/anim/engine.js', 'did/anim/scenes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const D = ctx.window.DIDAnim;

function ts(s) {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
for (const lang of ['en', 'zh']) {
  D.setLang(lang);
  const dir = path.join(ROOT, 'did/videos', lang);
  fs.mkdirSync(dir, { recursive: true });
  let all = [], offset = 0, n = 0;
  D.SCENES.forEach((sc, i) => {
    const lines = [];
    const title = D.h.tr(sc.title) + ' — ' + D.h.tr(sc.sub);
    const cues = [{ a: 0, b: sc.beats[0].t, s: title }].concat(sc.beats.map((b, k) => ({ a: b.t, b: k + 1 < sc.beats.length ? sc.beats[k + 1].t : sc.dur, s: D.h.tr(b) })));
    cues.forEach((c, k) => {
      lines.push(`${k + 1}\n${ts(c.a)} --> ${ts(c.b - 0.05)}\n${c.s}\n`);
      all.push(`${++n}\n${ts(offset + c.a)} --> ${ts(offset + c.b - 0.05)}\n${c.s}\n`);
    });
    const name = String(i + 1).padStart(2, '0') + '-' + sc.id + '.srt';
    fs.writeFileSync(path.join(dir, name), lines.join('\n'));
    offset += sc.dur + 1 / FPS; // each video has dur * FPS + 1 frames
  });
  fs.writeFileSync(path.join(dir, 'all.srt'), all.join('\n'));
  console.log(lang, D.SCENES.length + 1, 'subtitle files, total', offset.toFixed(2) + 's');
}
