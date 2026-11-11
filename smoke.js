/* Roadster cold-gas thruster vapor — canvas particle system.
   Modeled on the Oct 2026 Roadster demo: short supersonic white jets from nozzles
   around the car's underside / rear, hitting the ground and rolling outward as a
   thick white vapor carpet that builds up low around the car.
   Thrust strength follows the sound's own loudness envelope (window.LAUNCH_ENVELOPE),
   so every burst you hear is a burst you see. */
(function () {
  const IMG_W = 1500, IMG_H = 730;          // assets/roadster.jpg
  const FLOOR = 714;                          // ground line under the tyres (image px)
  const DOWN = Math.PI / 2;
  // Nozzles in image pixels. kind 'down' = ventral thrusters, 'rear' = main rear thrusters.
  const NOZZLES = [
    { x: 100,  y: 598, a: Math.PI * 0.97, kind: 'rear', w: 1.1 },
    { x: 108,  y: 640, a: Math.PI * 0.90, kind: 'rear', w: 1.1 },
    { x: 250,  y: 652, a: DOWN + 0.10, kind: 'down', w: 1 },
    { x: 455,  y: 660, a: DOWN - 0.05, kind: 'down', w: 1 },
    { x: 760,  y: 682, a: DOWN + 0.05, kind: 'down', w: 1 },
    { x: 990,  y: 684, a: DOWN - 0.04, kind: 'down', w: 1 },
    { x: 1185, y: 670, a: DOWN - 0.12, kind: 'down', w: 0.9 },
  ];
  const MAX_P = 300;
  const rand = (a, b) => a + Math.random() * (b - a);

  function fallbackEnvelope(t) {
    // Used only if the audio envelope is unavailable: herky-jerky bursts then full thrust.
    const bursts = [[0.55, 0.75], [0.95, 1.12], [1.3, 1.45]];
    for (const [s, e] of bursts) if (t >= s && t <= e) return 0.9;
    if (t >= 1.6 && t < 4.6) return 0.85 + 0.15 * Math.sin(t * 40);
    if (t >= 4.6 && t < 5.6) return 1 - (t - 4.6);
    return 0;
  }

  function makeJetSprite() {
    // soft supersonic cone: bright narrow core widening and fading away from the nozzle
    const w = 48, h = 160, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const v = y / h, spread = 0.12 + 0.38 * v, fall = Math.pow(1 - v, 1.4);
      for (let x = 0; x < w; x++) {
        const u = (x / (w - 1) - 0.5) / spread, a = Math.exp(-u * u * 2.2) * fall;
        const i = (y * w + x) * 4; im.data[i] = 235; im.data[i + 1] = 243; im.data[i + 2] = 255; im.data[i + 3] = Math.min(255, a * 255);
      }
    }
    g.putImageData(im, 0, 0); return c;
  }

  class RoadsterSmoke {
    constructor(canvas, photo, audio) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.photo = photo; this.img = photo.querySelector('img'); this.audio = audio;
      this.p = []; this.running = false; this.t0 = 0; this.launched = false; this.visible = true;
      this.sprites = new Image(); this.sprites.src = 'assets/smoke-sheet.png';
      this.resize = this.resize.bind(this); this.frame = this.frame.bind(this);
      window.addEventListener('resize', this.resize);
      if ('ResizeObserver' in window) new ResizeObserver(this.resize).observe(photo);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this.kick(); }).observe(photo);
      }
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick(); });
      this.resize();
    }
    resize() {
      const r = this.photo.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.W = r.width; this.H = r.height;
      this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // object-fit: cover mapping image px → CSS px
      this.s = Math.max(r.width / IMG_W, r.height / IMG_H);
      this.ox = (r.width - IMG_W * this.s) / 2; this.oy = (r.height - IMG_H * this.s) / 2;
    }
    X(x) { return this.ox + x * this.s; }
    Y(y) { return this.oy + y * this.s; }
    now() {
      const a = this.audio;
      if (a && !a.paused && a.currentTime > 0) return a.currentTime;
      return (performance.now() - this.t0) / 1000;
    }
    strength(t) {
      const env = window.LAUNCH_ENVELOPE;
      if (env && env.data && env.data.length) {
        const i = t * env.rate, i0 = Math.floor(i);
        if (i0 < 0 || i0 >= env.data.length - 1) return 0;
        const f = i - i0; return env.data[i0] * (1 - f) + env.data[i0 + 1] * f;
      }
      return fallbackEnvelope(t);
    }
    launch() {
      this.resize();
      this.t0 = performance.now(); this.launched = true; this.lastStr = 0;
      this.photo.classList.add('thrusting');
      this.kick();
    }
    reset() {
      this.launched = false; this.p.length = 0;
      this.ctx.clearRect(0, 0, this.W || 0, this.H || 0);
      if (this.img) this.img.style.transform = '';
      this.photo.classList.remove('thrusting');
    }
    kick() { if (!this.running && this.launched && this.visible && !document.hidden) { this.running = true; this.last = performance.now(); requestAnimationFrame(this.frame); } }

    emitJet(n, str) {
      const sp = rand(1300, 1900) * (n.kind === 'rear' ? 1.2 : 1);
      const a = n.a + rand(-0.12, 0.12);
      this.p.push({ type: 'jet', x: n.x + rand(-6, 6), y: n.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(16, 28), grow: 260, life: 0, max: n.kind === 'rear' ? rand(0.22, 0.38) : rand(0.08, 0.16),
        alpha: 0.55 + 0.4 * str, rot: rand(0, 6.28), vr: rand(-2, 2), sp: (Math.random() * 4) | 0, kind: n.kind });
    }
    toFog(q, spreadDir) {
      q.type = 'fog'; q.life = 0; q.max = rand(4.5, 9);
      const side = spreadDir || (Math.random() < 0.5 ? -1 : 1);
      q.vx = side * rand(250, 950) + q.vx * 0.15; q.vy = -rand(15, 90);
      q.y = Math.min(q.y, FLOOR - rand(0, 20));
      q.size = rand(60, 110); q.grow = rand(35, 85); q.cap = rand(240, 360); q.alpha = rand(0.28, 0.5); q.vr = rand(-0.25, 0.25); q.rot = rand(-0.4, 0.4);
    }
    ambient() {
      // lingering ground fog after the launch
      this.p.push({ type: 'fog', x: rand(-60, 1500), y: FLOOR - rand(-20, 80), vx: rand(-45, 45), vy: -rand(3, 12),
        size: rand(170, 280), grow: rand(10, 30), cap: 340, life: 0, max: rand(8, 12), alpha: rand(0.3, 0.45),
        rot: rand(-0.4, 0.4), vr: rand(-0.1, 0.1), sp: (Math.random() * 4) | 0 });
    }
    frame(ts) {
      if (!this.launched || !this.visible || document.hidden) { this.running = false; return; }
      const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts;
      const t = this.now();
      const str = Math.max(0, Math.min(1, this.strength(t)));
      const P = this.p;

      // --- emit ---
      if (str > 0.06 && P.length < MAX_P) {
        const onset = str - (this.lastStr || 0) > 0.25;   // burst start → extra puff
        for (const n of NOZZLES) {
          const rate = (n.kind === 'rear' ? 55 : 42) * str * n.w;
          let k = rate * dt + (onset ? 3 : 0);
          while (k > 0 && P.length < MAX_P) { if (k >= 1 || Math.random() < k) this.emitJet(n, str); k -= 1; }
        }
      }
      this.lastStr = str;
      if (t > 4 && Math.random() < dt * (t < 9 ? 7 : 5) && P.length < MAX_P) this.ambient();

      // --- update ---
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i]; q.life += dt;
        if (q.type === 'jet') {
          q.x += q.vx * dt; q.y += q.vy * dt; q.size += q.grow * dt;
          if (q.y >= FLOOR - 4) { q.y = FLOOR - 4; this.toFog(q); }
          else if (q.life > q.max) { this.toFog(q, q.kind === 'rear' ? -1 : 0); q.vy = -rand(20, 70); q.size = Math.min(q.size * 2, 200); }
        } else {
          const drag = Math.exp(-1.7 * dt);
          q.vx *= drag; q.vy = q.vy * Math.exp(-0.6 * dt) - 6 * dt;  // gentle buoyancy
          if (q.y < FLOOR - 150) q.vy = Math.max(q.vy, 0) * 0.5 + 4 * dt; // vapor stays low on the floor
          q.x += q.vx * dt; q.y += q.vy * dt; q.size = Math.min(q.cap || 340, q.size + q.grow * dt); q.rot += q.vr * dt;
          if (q.life > q.max) { P.splice(i, 1); continue; }
        }
      }

      // --- draw ---
      const ctx = this.ctx, s = this.s, sh = this.sprites;
      ctx.clearRect(0, 0, this.W, this.H);
      // ground light from the jets
      if (str > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        const gx = this.X(620), gy = this.Y(FLOOR), gr = 620 * s;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, `rgba(205,225,255,${0.22 * str})`); g.addColorStop(1, 'rgba(205,225,255,0)');
        ctx.fillStyle = g; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      if (sh.complete && sh.naturalWidth) {
        const S = sh.naturalHeight;
        for (const q of P) {
          let a;
          if (q.type === 'jet') a = q.alpha * (1 - q.life / q.max * 0.5);
          else { const u = q.life / q.max; a = q.alpha * Math.min(1, q.life / 0.35) * (u > 0.6 ? (1 - u) / 0.4 : 1); }
          if (a <= 0.01) continue;
          const d = q.size * s;
          ctx.globalAlpha = Math.min(1, a);
          ctx.save(); ctx.translate(this.X(q.x), this.Y(q.y)); ctx.rotate(q.rot);
          ctx.drawImage(sh, q.sp * S, 0, S, S, -d / 2, -d / 2, d, d);
          ctx.restore();
        }
      }
      // supersonic jet cores (soft cones) + shock diamonds
      if (str > 0.12) {
        ctx.globalCompositeOperation = 'lighter';
        const J = this.jetSprite || (this.jetSprite = makeJetSprite());
        for (const n of NOZZLES) {
          const len = (n.kind === 'rear' ? 260 : Math.max(26, FLOOR - n.y + 14)) * (0.8 + 0.25 * str);
          const wid = (n.kind === 'rear' ? 46 : 34) * (0.85 + 0.3 * str);
          const flick = 0.75 + Math.random() * 0.25;
          ctx.save();
          ctx.translate(this.X(n.x), this.Y(n.y)); ctx.rotate(n.a - Math.PI / 2);
          ctx.globalAlpha = Math.min(1, 0.95 * str * flick);
          ctx.drawImage(J, -wid * s / 2, -4 * s, wid * s, len * s);
          if (n.kind === 'rear') {            // Mach diamonds in the main rear jets
            ctx.fillStyle = '#fff';
            for (let k = 1; k <= 3; k++) {
              ctx.globalAlpha = 0.5 * str * (1 - k / 4) * flick;
              ctx.beginPath(); ctx.ellipse(0, len * s * k / 4.4, 5 * s, 10 * s, 0, 0, 6.283); ctx.fill();
            }
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // thruster rattle
      if (this.img) this.img.style.transform = str > 0.2 ? `translate(${rand(-1.3, 1.3) * str}px,${rand(-1, 1) * str}px)` : '';
      if (t > 40 && P.length === 0) { this.running = false; return; }
      requestAnimationFrame(this.frame);
    }
  }
  window.RoadsterSmoke = RoadsterSmoke;
})();
