/* EDIT THESE IF DUMPED*/
const NAME   = "TINA";                 // shown inside the heart 4 letters looks best(DON'T REMOVE!!!)
const LINE_1 = "Happy Birthday Tina";  // falls and writes itself below the heart
const LINE_2 = "from Victor";

const card  = document.getElementById('card');
const flap  = document.getElementById('flap');
const btn   = document.getElementById('open');
const stage = document.getElementById('stage');
const cv    = document.getElementById('c');
const ctx   = cv.getContext('2d');

/* Peel the card away, then go black  */
btn.addEventListener('click', () => {
  btn.disabled = true;
  const dur = 950, s = performance.now();
  const ease = p => p * p * (3 - 2 * p);

  function step(now) {
    const p = Math.min((now - s) / dur, 1);
    const a = 100 - 100 * ease(p);
    card.style.clipPath = `polygon(0 0, 100% 0, 100% ${a}%, ${a}% 100%, 0 100%)`;
    flap.style.clipPath = `polygon(100% ${a}%, ${a}% 100%, ${a}% ${a}%)`;
    if (p < 1) requestAnimationFrame(step); else finish();
  }
  requestAnimationFrame(step);

  function finish() {
    card.style.transition = 'opacity .25s';
    card.style.opacity = 0;
    stage.classList.add('on');
    setTimeout(() => { card.style.display = 'none'; start(); }, 800);
  }
});

/* Matrix and heart */
const CHARS = NAME; // every letter on screen (heart + rain) only shifts between these
const rc    = () => CHARS[(Math.random() * CHARS.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeIO = q => q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;

// timeline (ms)
const TC = 2800;   // letters start gathering into the heart
const TS = 5600;   // heart formed -> heavier rain starts
const TM = 6300;   // birthday message starts falling in

let W, H, dpr, fs, cw, ch, S, cx, cy;
let parts, grid, cols, rows, rain, msg, msgTop, msgBot;
let t0 = 0, last = 0, running = false;

function insideHeart(px, py, m = 0) {
  const x = (px - cx) / S, y = (cy - py) / S;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= m;
}

function build() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  S  = Math.min(W * 0.4, H * 0.2);
  fs = clamp(S / 9, 12, 20);
  cw = fs * 0.65; ch = fs * 1.1;
  cx = W / 2;
  cy = H * 0.40 + 0.125 * S;

  // heart particles
  parts = [];
  const nI = Math.floor(W / cw), nJ = Math.floor(H / ch);
  for (let i = 0; i < nI; i++) {
    for (let j = 0; j < nJ; j++) {
      const px = (i + .5) * cw, py = (j + .5) * ch;
      if (!insideHeart(px, py)) continue;
      const edge = !insideHeart(px - cw, py) || !insideHeart(px + cw, py) ||
                   !insideHeart(px, py - ch) || !insideHeart(px, py + ch);
      const dir = Math.random() < .5 ? -1 : 1;
      parts.push({
        tx: px, ty: py,
        c: rc(),
        interval: 300 + Math.random() * 900,
        col: edge ? '#d8b4fe' : '#a855f7',
        alpha: edge ? 1 : 0.6 + Math.random() * 0.4,
        delay: Math.random() * 900,
        a: Math.random() * 6.283, b: Math.random() * 6.283,
        R: Math.sqrt(Math.random()),
        w: dir * (0.0004 + Math.random() * 0.0008),
        w2: -dir * (0.0004 + Math.random() * 0.0008),
        lastFlip: Math.random() * 70
      });
    }
  }

  // falling rain
  cols = Math.floor(W / cw); rows = Math.ceil(H / ch);
  grid = Array.from({ length: cols }, () => Array.from({ length: rows + 2 }, rc));
  rain = Array.from({ length: cols }, () => {
    const early = Math.random() < 0.22;
    return {
      head: -Math.random() * rows,
      speed: 6 + Math.random() * 14,
      len: 6 + Math.random() * 16,
      start: early ? Math.random() * 2500 : TS + Math.random() * 2500,
      dim: early ? 0.55 : 1
    };
  });

  // birthday message
  msg = [];
  const mfs = Math.min(34, W * 0.92 / (LINE_1.length * 0.62));
  const y1 = H * 0.76, y2 = y1 + mfs * 1.7;
  msgTop = y1 - mfs * 1.2; msgBot = y2 + mfs;
  let idx = 0;
  const addLine = (text, size, y, col) => {
    const n = text.length;
    for (let k = 0; k < n; k++) {
      if (text[k] === ' ') continue;
      msg.push({
        c: text[k], fs: size, col, y,
        x: W / 2 + (k - (n - 1) / 2) * size * 0.62,
        start: TM + idx * 110,
        dur: 750 + y * 0.35,
        trail: [rc(), rc(), rc(), rc()]
      });
      idx++;
    }
  };
  addLine(LINE_1, mfs, y1, '#e9d5ff');
  addLine(LINE_2, mfs * 0.8, y2, '#f5d0fe');
}

function draw(t, dt) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fs}px "Courier New", monospace`;

  //rain
  for (let n = 0; n < 30; n++) grid[(Math.random() * cols) | 0][(Math.random() * rows) | 0] = rc();
  const maskHeart = t > TC + 1500, maskMsg = t > TM - 300;
  for (let c = 0; c < cols; c++) {
    const d = rain[c];
    if (t < d.start) continue;
    d.head += d.speed * dt;
    if (d.head - d.len > rows) {
      d.head = -Math.random() * rows * 0.6;
      d.speed = 6 + Math.random() * 14;
      d.len = 6 + Math.random() * 16;
    }
    const px = (c + .5) * cw, h = Math.floor(d.head);
    for (let k = 0; k <= d.len; k++) {
      const r = h - k;
      if (r < 0 || r >= rows) continue;
      const py = (r + .5) * ch;
      if (maskMsg && py > msgTop && py < msgBot) continue;
      if (maskHeart && insideHeart(px, py, 0.12)) continue;
      if (k === 0) { ctx.fillStyle = '#f3e8ff'; ctx.globalAlpha = d.dim; }
      else { ctx.fillStyle = '#8b5cf6'; ctx.globalAlpha = Math.pow(1 - k / d.len, 1.5) * 0.85 * d.dim; }
      ctx.fillText(grid[c][r], px, py);
    }
  }

  //heart letters

  const bf = clamp((t - TS) / 800, 0, 1);
  const beat = 1 + bf * 0.025 * Math.pow(Math.max(0, Math.sin(t / 230)), 4);
  const oy0 = H * 0.42;
  for (const p of parts) {
    const q = clamp((t - TC - p.delay) / 1700, 0, 1);
    const e = easeIO(q);
    const ox = cx + Math.cos(p.a + p.w * t) * p.R * W * 0.5;
    const oy = oy0 + Math.sin(p.b + p.w2 * t) * p.R * H * 0.4;
    const bx = cx + (p.tx - cx) * beat, by = cy + (p.ty - cy) * beat;
    const x = ox + (bx - ox) * e, y = oy + (by - oy) * e;

    if (q < 1) {
      if (t - p.lastFlip > 70) { p.c = rc(); p.lastFlip = t; }
      ctx.fillStyle = '#c084fc'; ctx.globalAlpha = 0.9;
    } else {
      if (t - p.lastFlip > p.interval) {
        p.c = rc(); p.lastFlip = t;
        p.interval = 300 + Math.random() * 900;
      }
      ctx.fillStyle = p.col; ctx.globalAlpha = p.alpha;
    }
    ctx.fillText(p.c, x, y);
  }

  // ----- birthday message -----
  for (const m of msg) {
    const p = (t - m.start) / m.dur;
    if (p < 0) continue;
    ctx.font = `bold ${m.fs}px "Courier New", monospace`;
    if (p < 1) {
      const y = -m.fs + (m.y + m.fs) * p * p;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#a855f7';
      for (let k = 0; k < 4; k++) {
        ctx.globalAlpha = 0.4 / (k + 1);
        ctx.fillText(m.trail[k], m.x, y - (k + 1) * m.fs * 1.1);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12;
      ctx.fillText(m.c, m.x, y);
    } else {
      const age = t - (m.start + m.dur);
      ctx.globalAlpha = 1;
      ctx.fillStyle = age < 500 ? '#ffffff' : m.col;
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = age < 500 ? 22 : 12;
      ctx.fillText(m.c, m.x, m.y);
    }
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  draw(now - t0, dt);
  requestAnimationFrame(frame);
}

function start() {
  if (running) return;
  running = true;
  build();
  t0 = last = performance.now();
  requestAnimationFrame(frame);
}

addEventListener('resize', () => { if (running) build(); });