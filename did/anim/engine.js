/*
 * Difference-in-differences animated guides: drawing engine and player.
 *
 * Every scene is a pure function of time: draw(ctx, t) paints the frame at
 * t seconds on a 1280x720 logical canvas. The same code drives the in-page
 * player and the MP4 renderer (tools/render_did_videos.mjs), so the videos
 * and the page always match.
 */
(function () {
  'use strict';

  var W = 1280, H = 720;

  // Video palette: the animations live in their own navy world in both page themes.
  var C = {
    bg: '#141c33', panel: '#1b2542', panel2: '#222d4f',
    grid: 'rgba(195,205,230,0.10)', axis: 'rgba(195,205,230,0.55)',
    text: '#f3eee2', muted: '#9aa6c4', faint: '#5d6888',
    treat: '#f08a5d', ctrl: '#6cb4ee', cf: '#f6c4a8',
    effect: '#ffd166', good: '#7bd389', bad: '#ef6f6c',
    purple: '#b9a3f0', teal: '#5fd0c3'
  };

  var LANG = 'en';
  var FAM = {
    serif: '"Lora", Georgia, "Times New Roman", serif',
    zh: '"Lora", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "WenQuanYi Zen Hei", sans-serif',
    mono: '"JetBrains Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace'
  };

  // ---------- small maths ----------
  function clamp(x, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, x)); }
  function ease(x) { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function prog(t, a, b) { return ease((t - a) / (b - a)); }
  function lin(t, a, b) { return clamp((t - a) / (b - a)); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  // fade in over [a, a+d], out over [b-d, b]
  function win(t, a, b, d) { d = d || 0.4; return Math.min(prog(t, a, a + d), b === undefined ? 1 : 1 - prog(t, b - d, b)); }

  function tr(o) { if (o == null) return ''; if (typeof o === 'string') return o; return o[LANG] != null ? o[LANG] : o.en; }
  function L(en, zh) { return LANG === 'zh' && zh != null ? zh : en; }

  // ---------- text ----------
  function font(size, o) {
    o = o || {};
    var fam = o.mono ? FAM.mono : (LANG === 'zh' ? FAM.zh : FAM.serif);
    return (o.italic ? 'italic ' : '') + (o.weight || 400) + ' ' + size + 'px ' + fam;
  }
  function text(ctx, s, x, y, o) {
    o = o || {};
    if (o.a === 0) return;
    ctx.save();
    ctx.globalAlpha *= (o.a === undefined ? 1 : o.a);
    ctx.font = font(o.size || 22, o);
    ctx.fillStyle = o.color || C.text;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(tr(s), x, y);
    ctx.restore();
  }
  function measure(ctx, s, size, o) { ctx.save(); ctx.font = font(size, o); var w = ctx.measureText(tr(s)).width; ctx.restore(); return w; }

  var CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/;
  var NO_START = /^[，。、；：！？）》」』,.;:!?)\]]/;
  function wrap(ctx, s, maxW) {
    var tokens = s.match(/[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/g) || [];
    var lines = [], cur = '';
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (/^\s+$/.test(tk)) { if (cur) cur += ' '; continue; }
      var test = cur + tk;
      if (ctx.measureText(test).width > maxW && cur.trim() && !NO_START.test(tk)) {
        // never end a line with an opening bracket
        var carry = '';
        while (/[（《「『(\[]$/.test(cur)) { carry = cur.slice(-1) + carry; cur = cur.slice(0, -1); }
        lines.push(cur.trim());
        cur = carry + tk;
      } else {
        cur = test;
      }
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }
  function para(ctx, s, x, y, maxW, o) {
    o = o || {};
    var size = o.size || 22, lh = o.lh || size * 1.4;
    ctx.save();
    ctx.font = font(size, o);
    var lines = wrap(ctx, tr(s), maxW);
    ctx.restore();
    for (var i = 0; i < lines.length; i++) text(ctx, lines[i], x, y + i * lh, o);
    return lines.length * lh;
  }

  // ---------- shapes ----------
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function box(ctx, x, y, w, h, o) {
    o = o || {};
    if (o.a === 0) return;
    ctx.save();
    ctx.globalAlpha *= (o.a === undefined ? 1 : o.a);
    rrect(ctx, x, y, w, h, o.r === undefined ? 10 : o.r);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  }
  function dot(ctx, x, y, r, o) {
    o = o || {};
    if (o.a === 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= (o.a === undefined ? 1 : o.a);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (o.hollow) { ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = o.color || C.text; ctx.lineWidth = o.lw || 2.5; ctx.stroke(); }
    else { ctx.fillStyle = o.color || C.text; ctx.fill(); }
    ctx.restore();
  }
  // polyline drawn up to fraction p of its length
  function path(ctx, pts, p, o) {
    o = o || {};
    if (p === undefined) p = 1;
    if (p <= 0 || pts.length < 2 || o.a === 0) return;
    var segs = [], total = 0, i;
    for (i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); total += d; }
    var goal = total * clamp(p);
    ctx.save();
    ctx.globalAlpha *= (o.a === undefined ? 1 : o.a);
    ctx.strokeStyle = o.color || C.text;
    ctx.lineWidth = o.lw || 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    var acc = 0;
    for (i = 1; i < pts.length; i++) {
      if (acc + segs[i - 1] >= goal) {
        var f = segs[i - 1] ? (goal - acc) / segs[i - 1] : 0;
        ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
        break;
      }
      ctx.lineTo(pts[i][0], pts[i][1]);
      acc += segs[i - 1];
    }
    ctx.stroke();
    ctx.restore();
  }
  function line(ctx, x1, y1, x2, y2, o) { path(ctx, [[x1, y1], [x2, y2]], o && o.p !== undefined ? o.p : 1, o); }
  function arrow(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    var p = o.p === undefined ? 1 : o.p;
    if (p <= 0 || o.a === 0) return;
    var ex = lerp(x1, x2, p), ey = lerp(y1, y2, p);
    line(ctx, x1, y1, ex, ey, o);
    var ang = Math.atan2(ey - y1, ex - x1), hs = o.head || 12;
    ctx.save();
    ctx.globalAlpha *= (o.a === undefined ? 1 : o.a);
    ctx.fillStyle = o.color || C.text;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - hs * Math.cos(ang - 0.45), ey - hs * Math.sin(ang - 0.45));
    ctx.lineTo(ex - hs * Math.cos(ang + 0.45), ey - hs * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // vertical curly brace from y1 to y2 at x, opening to the left (side=-1) or right (side=1)
  function brace(ctx, x, y1, y2, o) {
    o = o || {};
    var p = o.p === undefined ? 1 : o.p;
    if (p <= 0) return;
    var s = o.side || 1, k = 12 * s, top = Math.min(y1, y2), bot = Math.max(y1, y2), mid = (top + bot) / 2;
    var pts = [], n = 40, i;
    for (i = 0; i <= n; i++) {
      var u = i / n, yy = lerp(top, bot, u);
      var bump = Math.pow(Math.abs(Math.sin(Math.PI * u)), 0.15) * 0.6 + (Math.abs(u - 0.5) < 0.04 ? (0.04 - Math.abs(u - 0.5)) / 0.04 * 0.6 : 0);
      pts.push([x + k * bump, yy]);
    }
    path(ctx, pts, p, { color: o.color || C.effect, lw: o.lw || 2.5, a: o.a });
    return [x + k * 1.6, mid];
  }
  function shade(ctx, x, y, w, h, color, a) {
    if (a === 0) return;
    ctx.save(); ctx.globalAlpha *= (a === undefined ? 1 : a); ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  function chip(ctx, s, x, y, o) {
    o = o || {};
    var size = o.size || 18;
    var w = measure(ctx, s, size, { mono: true }) + 22;
    var hgt = size + 14;
    var x0 = o.align === 'right' ? x - w : (o.align === 'center' ? x - w / 2 : x);
    box(ctx, x0, y - hgt / 2, w, hgt, { r: hgt / 2, fill: o.fill || 'rgba(240,138,93,0.16)', a: o.a });
    text(ctx, s, x0 + 11, y + 1, { size: size, mono: true, color: o.color || C.treat, base: 'middle', a: o.a });
    return w;
  }

  // ---------- plots ----------
  function Plot(x, y, w, h, xmin, xmax, ymin, ymax) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.xmin = xmin; this.xmax = xmax; this.ymin = ymin; this.ymax = ymax;
  }
  Plot.prototype.X = function (v) { return this.x + (v - this.xmin) / (this.xmax - this.xmin) * this.w; };
  Plot.prototype.Y = function (v) { return this.y + this.h - (v - this.ymin) / (this.ymax - this.ymin) * this.h; };
  Plot.prototype.P = function (pts) { var s = this; return pts.map(function (q) { return [s.X(q[0]), s.Y(q[1])]; }); };
  Plot.prototype.axes = function (ctx, o) {
    o = o || {};
    var a = o.a === undefined ? 1 : o.a, s = this, i;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    (o.yt || []).forEach(function (v) {
      var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : String(v);
      var yy = s.Y(val);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x, yy); ctx.lineTo(s.x + s.w, yy); ctx.stroke();
      text(ctx, lab, s.x - 12, yy, { size: 16, color: C.muted, align: 'right', base: 'middle', mono: true });
    });
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y + s.h); ctx.lineTo(s.x + s.w, s.y + s.h); ctx.stroke();
    (o.xt || []).forEach(function (v) {
      var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : String(v);
      var xx = s.X(val);
      ctx.beginPath(); ctx.moveTo(xx, s.y + s.h); ctx.lineTo(xx, s.y + s.h + 6); ctx.stroke();
      text(ctx, lab, xx, s.y + s.h + 26, { size: o.xsize || 17, color: C.muted, align: 'center', mono: o.xmono !== false && typeof lab === 'string' && /^[-−\d.]+$/.test(lab) });
    });
    if (o.xlabel) text(ctx, o.xlabel, s.x + s.w / 2, s.y + s.h + 56, { size: 17, color: C.muted, align: 'center', italic: LANG !== 'zh' });
    if (o.ylabel) text(ctx, o.ylabel, s.x, s.y - 16, { size: 17, color: C.muted, align: 'left', italic: LANG !== 'zh' });
    ctx.restore();
  };
  Plot.prototype.zero = function (ctx, a) {
    if (a === 0) return;
    line(ctx, this.x, this.Y(0), this.x + this.w, this.Y(0), { color: C.axis, lw: 1.5, dash: [6, 6], a: a });
  };

  function fmt(v, d) { d = d === undefined ? 1 : d; var s = Math.abs(v).toFixed(d); return (v < -1e-9 ? '−' : '') + s; }

  // ---------- scenes ----------
  var SCENES = [];
  function scene(def) { SCENES.push(def); }
  // put scenes in a given order (ids not listed keep their relative order at the end)
  function order(ids) {
    var rest = SCENES.filter(function (sc) { return ids.indexOf(sc.id) < 0; });
    var sorted = ids.map(find).filter(Boolean).concat(rest);
    SCENES.length = 0; sorted.forEach(function (sc) { SCENES.push(sc); });
  }

  // ---------- frame ----------
  var CAPTION_Y = 616;
  function captionAt(sc, t) {
    var b = sc.beats, idx = -1;
    for (var i = 0; i < b.length; i++) if (t >= b[i].t) idx = i;
    if (idx < 0) return null;
    var start = b[idx].t, end = idx + 1 < b.length ? b[idx + 1].t : sc.dur + 1;
    return { s: tr(b[idx]), a: Math.min(prog(t, start, start + 0.35), 1 - prog(t, end - 0.25, end)), i: idx };
  }

  function frame(ctx, sc, t, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // faint paper grid
    ctx.strokeStyle = 'rgba(195,205,230,0.035)'; ctx.lineWidth = 1;
    for (var gx = 40; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 40; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    var intro = sc.intro === undefined ? 2.6 : sc.intro;
    var bodyA = o.poster ? 1 : prog(t, intro - 0.5, intro + 0.1);

    // body
    ctx.save();
    ctx.globalAlpha = bodyA;
    if (bodyA > 0) sc.draw(ctx, t);
    ctx.restore();

    // header
    var hA = bodyA;
    if (hA > 0) {
      var idx = SCENES.indexOf(sc) + 1;
      text(ctx, L('DiD · ', 'DiD · ') + idx + '/' + SCENES.length, 40, 46, { size: 15, mono: true, color: C.faint, a: hA });
      text(ctx, tr(sc.title), 40 + measure(ctx, 'DiD · ' + idx + '/' + SCENES.length, 15, { mono: true }) + 14, 47, { size: 21, weight: 600, color: C.text, a: hA });
      var cx = W - 40;
      for (var k = sc.stata.length - 1; k >= 0; k--) {
        var wch = chip(ctx, sc.stata[k], cx, 40, { size: 15, align: 'right', a: hA });
        cx -= wch + 8;
      }
    }

    // caption band
    var cap = captionAt(sc, t);
    if (cap && t >= intro - 0.2) {
      ctx.save();
      var grd = ctx.createLinearGradient(0, CAPTION_Y - 24, 0, H);
      grd.addColorStop(0, 'rgba(20,28,51,0)');
      grd.addColorStop(0.25, 'rgba(20,28,51,0.92)');
      grd.addColorStop(1, 'rgba(20,28,51,0.98)');
      ctx.fillStyle = grd; ctx.fillRect(0, CAPTION_Y - 24, W, H - CAPTION_Y + 24);
      ctx.restore();
      var size = LANG === 'zh' ? 25 : 24;
      ctx.save(); ctx.font = font(size);
      var lines = wrap(ctx, cap.s, 1120);
      // balance: the narrowest width that keeps the same number of lines
      if (lines.length > 1) {
        for (var bw = 1100; bw > 500; bw -= 20) { var tryL = wrap(ctx, cap.s, bw); if (tryL.length > lines.length) break; lines = tryL; }
      }
      ctx.restore();
      var lh = size * 1.45, y0 = CAPTION_Y + 30 + (lines.length === 1 ? lh / 2 : 0);
      for (var li = 0; li < lines.length && li < 3; li++) text(ctx, lines[li], W / 2, y0 + li * lh, { size: size, align: 'center', a: cap.a });
    }

    // title card
    if (!o.poster && t < intro + 0.2) {
      var ta = 1 - prog(t, intro - 0.6, intro);
      text(ctx, L('Difference-in-Differences · animated guide', '双重差分法 · 动画讲解'), W / 2, 270, { size: 18, mono: LANG !== 'zh', color: C.treat, align: 'center', a: ta * prog(t, 0, 0.5) });
      text(ctx, tr(sc.title), W / 2, 340, { size: 52, weight: 700, align: 'center', a: ta * prog(t, 0.1, 0.7) });
      text(ctx, tr(sc.sub), W / 2, 396, { size: 25, color: C.muted, align: 'center', italic: LANG !== 'zh', a: ta * prog(t, 0.4, 1.0) });
    }

    // progress hairline
    if (!o.poster && !o.noProgress) shade(ctx, 0, H - 4, W * clamp(t / sc.dur), 4, C.treat, 0.8);
    ctx.restore();
  }

  // ---------- render API (used by the MP4 renderer) ----------
  function setLang(l) { LANG = /^zh/i.test(l || '') ? 'zh' : 'en'; }
  function find(id) { for (var i = 0; i < SCENES.length; i++) if (SCENES[i].id === id) return SCENES[i]; return null; }
  function renderFrame(canvas, id, t, lang) {
    if (lang) setLang(lang);
    var sc = find(id), ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    frame(ctx, sc, t);
  }

  // ---------- player ----------
  function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  function mount(root) {
    setLang(root.getAttribute('data-lang') || document.documentElement.lang || 'en');
    var mp4Base = root.getAttribute('data-mp4') || '';
    var T = {
      play: L('Play', '播放'), pause: L('Pause', '暂停'), replay: L('Replay', '重播'),
      next: L('Next', '下一个'), mp4: L('MP4', 'MP4 视频'), full: L('Full screen', '全屏'),
      scrub: L('Position in the animation', '动画进度'), chapters: L('Choose an animation', '选择动画'),
      transcript: L('Transcript', '文字稿'), jump: L('Jump to', '跳转到')
    };
    root.innerHTML =
      '<div class="anim-stage">' +
        '<canvas class="anim-canvas" role="img"></canvas>' +
        '<button type="button" class="anim-big" aria-label="' + T.play + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>' +
      '</div>' +
      '<div class="anim-controls">' +
        '<button type="button" class="anim-btn anim-toggle" aria-label="' + T.play + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="ic-play" d="M8 5v14l11-7z"/><path class="ic-pause" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></button>' +
        '<input type="range" class="anim-scrub" id="anim-scrub" min="0" max="1000" value="0" aria-label="' + T.scrub + '">' +
        '<span class="anim-time">0:00 / 0:00</span>' +
        '<button type="button" class="anim-btn anim-next" aria-label="' + T.next + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l9-7zM16 5h3v14h-3z"/></svg></button>' +
        '<a class="anim-mp4" href="#">' + T.mp4 + '</a>' +
        '<button type="button" class="anim-btn anim-fs" aria-label="' + T.full + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/></svg></button>' +
      '</div>' +
      '<p class="anim-cap" aria-live="polite"></p>' +
      '<details class="anim-transcript"><summary>' + T.transcript + '</summary><ol></ol></details>' +
      '<ol class="anim-chapters" aria-label="' + T.chapters + '"></ol>';

    var stage = root.querySelector('.anim-stage');
    var canvas = root.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var big = root.querySelector('.anim-big');
    var toggle = root.querySelector('.anim-toggle');
    var scrub = root.querySelector('.anim-scrub');
    var timeEl = root.querySelector('.anim-time');
    var nextBtn = root.querySelector('.anim-next');
    var mp4 = root.querySelector('.anim-mp4');
    var fsBtn = root.querySelector('.anim-fs');
    var sr = root.querySelector('.anim-cap');
    var list = root.querySelector('.anim-chapters');
    var trList = root.querySelector('.anim-transcript ol');

    var cur = SCENES[0], t = 0, playing = false, last = 0, poster = true, lastCap = -1;

    SCENES.forEach(function (sc, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'anim-chapter';
      b.setAttribute('data-id', sc.id);
      b.innerHTML = '<span class="anim-num">' + String(i + 1).padStart(2, '0') + '</span><span class="anim-ttl"></span><span class="anim-dur">' + fmtTime(sc.dur) + '</span>';
      b.querySelector('.anim-ttl').textContent = tr(sc.title);
      b.addEventListener('click', function () { select(sc.id, true); try { history.replaceState(null, '', '#anim-' + sc.id); } catch (e) {} });
      li.appendChild(b);
      list.appendChild(li);
    });

    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.width * 9 / 16 * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      draw();
    }
    function draw() {
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      if (poster) frame(ctx, cur, cur.poster || cur.dur - 0.05, { poster: true });
      else frame(ctx, cur, t);
      scrub.value = String(Math.round(t / cur.dur * 1000));
      timeEl.textContent = fmtTime(t) + ' / ' + fmtTime(cur.dur);
      var cap = poster ? null : captionAt(cur, t);
      var key = poster ? 'poster-' + cur.id : (cap ? cap.i : -1);
      if (key !== lastCap) { lastCap = key; sr.textContent = poster ? tr(cur.title) + ': ' + tr(cur.sub) : (cap ? cap.s : tr(cur.title)); }
    }
    function setPlaying(p) {
      playing = p;
      root.classList.toggle('is-playing', p);
      toggle.setAttribute('aria-label', p ? T.pause : T.play);
      if (p) { poster = false; last = performance.now(); requestAnimationFrame(tick); }
    }
    function tick(now) {
      if (!playing) return;
      t += (now - last) / 1000; last = now;
      if (t >= cur.dur) { t = cur.dur; setPlaying(false); root.classList.add('is-ended'); }
      draw();
      if (playing) requestAnimationFrame(tick);
    }
    function select(id, autoplay) {
      var sc = find(id) || SCENES[0];
      cur = sc; t = 0; lastCap = -1; poster = !autoplay;
      root.classList.remove('is-ended');
      canvas.setAttribute('aria-label', tr(sc.title) + ' — ' + tr(sc.sub));
      mp4.href = mp4Base + String(SCENES.indexOf(sc) + 1).padStart(2, '0') + '-' + sc.id + '.mp4';
      list.querySelectorAll('.anim-chapter').forEach(function (b) {
        var on = b.getAttribute('data-id') === sc.id;
        b.classList.toggle('is-current', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      trList.innerHTML = '';
      sc.beats.forEach(function (b) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'anim-ts'; btn.textContent = fmtTime(b.t);
        btn.setAttribute('aria-label', T.jump + ' ' + fmtTime(b.t));
        btn.addEventListener('click', function () { t = b.t; poster = false; root.classList.remove('is-ended'); setPlaying(true); });
        var span = document.createElement('span'); span.textContent = tr(b);
        li.appendChild(btn); li.appendChild(span); trList.appendChild(li);
      });
      setPlaying(false);
      draw();
      if (autoplay) setPlaying(true);
    }
    function playPause() {
      if (playing) { setPlaying(false); return; }
      if (poster || t >= cur.dur - 0.01) { t = 0; poster = false; root.classList.remove('is-ended'); }
      setPlaying(true);
    }
    big.addEventListener('click', playPause);
    toggle.addEventListener('click', playPause);
    canvas.addEventListener('click', playPause);
    nextBtn.addEventListener('click', function () {
      var i = SCENES.indexOf(cur);
      var nx = SCENES[(i + 1) % SCENES.length];
      select(nx.id, true);
      try { history.replaceState(null, '', '#anim-' + nx.id); } catch (e) {}
    });
    scrub.addEventListener('input', function () {
      poster = false;
      t = Number(scrub.value) / 1000 * cur.dur;
      root.classList.remove('is-ended');
      if (!playing) draw();
    });
    root.addEventListener('keydown', function (e) {
      if (e.target === scrub) return;
      if (e.key === ' ' && (e.target === canvas || e.target === root)) { e.preventDefault(); playPause(); }
    });
    fsBtn.addEventListener('click', function () {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
      } catch (e) {}
    });
    document.addEventListener('fullscreenchange', function () { setTimeout(size, 50); });

    function fromHash() {
      var h = (location.hash || '').replace(/^#/, '');
      if (h.indexOf('anim-') === 0 && find(h.slice(5))) {
        select(h.slice(5), false);
        return true;
      }
      return false;
    }
    window.addEventListener('hashchange', function () {
      if (fromHash()) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (!fromHash()) select(SCENES[0].id, false);
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas); else window.addEventListener('resize', size);
    size();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', draw);
  }

  window.DIDAnim = {
    W: W, H: H, C: C, SCENES: SCENES, scene: scene, order: order,
    h: {
      clamp: clamp, ease: ease, prog: prog, lin: lin, lerp: lerp, win: win, tr: tr, L: L,
      text: text, para: para, measure: measure, font: font, box: box, dot: dot, path: path,
      line: line, arrow: arrow, brace: brace, shade: shade, chip: chip, Plot: Plot, fmt: fmt
    },
    setLang: setLang, renderFrame: renderFrame, mount: mount, find: find,
    lang: function () { return LANG; }
  };
})();
