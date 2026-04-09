/**
 * theme-control.js  — Universal Dashboard Theme Control Panel
 * Drop <script src="theme-control.js"></script> at the end of <body>.
 * Persists to localStorage; syncs across tabs via BroadcastChannel.
 */
(function () {
  'use strict';
  if (document.getElementById('tc-root')) return;

  // ─── Config ────────────────────────────────────────────────────────────────
  const LS_STATE   = 'tc_state_v1';
  const LS_PRESETS = 'tc_presets_v1';
  const LS_HIST    = 'tc_hist_v1';
  const BC_NAME    = 'tc_broadcast';
  const MAX_HIST   = 30;
  const SVG_CX     = 130;
  const SVG_CY     = 130;
  const SVG_R      = 95;  // max axis radius

  const AXES = [
    { id:'light',    label:'Light',    neg:'Dark',    deg:-90  },
    { id:'warm',     label:'Warm',     neg:'Cool',    deg:-30  },
    { id:'vivid',    label:'Vivid',    neg:'Mono',    deg: 30  },
    { id:'airy',     label:'Airy',     neg:'Dense',   deg: 90  },
    { id:'contrast', label:'Contrast', neg:'Soft',    deg: 150 },
    { id:'rich',     label:'Rich',     neg:'Minimal', deg: 210 },
  ];

  const SLIDERS = [
    { id:'serif',    label:'Typeface', lo:'Sans',   hi:'Serif',  min:0,   max:100, def:0   },
    { id:'tracking', label:'Spacing',  lo:'Tight',  hi:'Loose',  min:0,   max:100, def:50  },
    { id:'scale',    label:'Scale',    lo:'Small',  hi:'Large',  min:70,  max:130, def:100 },
    { id:'radius',   label:'Corners',  lo:'Sharp',  hi:'Round',  min:0,   max:100, def:60  },
    { id:'hue',      label:'Hue',      lo:'0°',     hi:'360°',   min:0,   max:359, def:217 },
    { id:'colors',   label:'Accents',  lo:'1',      hi:'6',      min:1,   max:6,   def:2   },
    { id:'shadow',   label:'Depth',    lo:'Flat',   hi:'Deep',   min:0,   max:100, def:50  },
    { id:'motion',   label:'Motion',   lo:'Still',  hi:'Lively', min:0,   max:100, def:30  },
  ];

  const DEFAULTS = {
    axes:    { light:5, warm:35, vivid:70, airy:45, contrast:68, rich:52 },
    sliders: { serif:0, tracking:50, scale:100, radius:60, hue:217, colors:2, shadow:50, motion:30 },
  };

  const BUILTIN_PRESETS = {
    'Dark Blue':     { axes:{light:5,  warm:35, vivid:70, airy:45, contrast:68, rich:52}, sliders:{serif:0, tracking:50,scale:100,radius:60,hue:217,colors:2,shadow:50,motion:30} },
    'Light':         { axes:{light:95, warm:40, vivid:55, airy:55, contrast:72, rich:42}, sliders:{serif:0, tracking:50,scale:100,radius:60,hue:217,colors:2,shadow:30,motion:30} },
    'High Contrast': { axes:{light:8,  warm:35, vivid:92, airy:50, contrast:95, rich:65}, sliders:{serif:0, tracking:50,scale:100,radius:40,hue:217,colors:2,shadow:70,motion:20} },
    'Monokai':       { axes:{light:10, warm:75, vivid:85, airy:45, contrast:75, rich:55}, sliders:{serif:0, tracking:50,scale:100,radius:30,hue:45, colors:3,shadow:60,motion:25} },
    'Solarized':     { axes:{light:28, warm:65, vivid:52, airy:55, contrast:62, rich:48}, sliders:{serif:0, tracking:55,scale:100,radius:50,hue:192,colors:3,shadow:40,motion:30} },
    'Classic Print': { axes:{light:93, warm:50, vivid:35, airy:60, contrast:82, rich:38}, sliders:{serif:85,tracking:55,scale:100,radius:18,hue:210,colors:1,shadow:20,motion:15} },
    'Dusk':          { axes:{light:18, warm:60, vivid:65, airy:50, contrast:70, rich:58}, sliders:{serif:0, tracking:50,scale:100,radius:55,hue:280,colors:3,shadow:60,motion:35} },
    'Terminal':      { axes:{light:5,  warm:50, vivid:80, airy:40, contrast:88, rich:45}, sliders:{serif:0, tracking:50,scale:100,radius:4, hue:140,colors:1,shadow:35,motion:10} },
  };

  // ─── Math ──────────────────────────────────────────────────────────────────
  const lerp  = (a,b,t) => a + (b-a) * Math.max(0, Math.min(1, t));
  const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));
  const rad   = d => d * Math.PI / 180;
  const hsl   = (h,s,l) => `hsl(${Math.round(((h%360)+360)%360)},${Math.round(clamp(s,0,100))}%,${Math.round(clamp(l,0,100))}%)`;
  const dot   = (ax,ay,bx,by) => ax*bx + ay*by;

  // ─── CSS Computation ───────────────────────────────────────────────────────
  function computeTheme(st) {
    const { axes:ax, sliders:sl } = st;
    const L = ax.light    / 100;
    const W = ax.warm     / 100;
    const V = ax.vivid    / 100;
    const A = ax.airy     / 100;
    const C = ax.contrast / 100;
    const R = ax.rich     / 100;

    const bgH  = lerp(222, 210, L);
    const bgS  = lerp(42,  18, L);
    const bgLv = lerp(6,   98, L);
    const sfLv = lerp(11, 100, L);
    const s2Lv = lerp(14,  97, L);
    const dpLv = lerp(4,   95, L);

    // Borders get more visible with more R
    const borLv  = lerp(lerp(13, 20, R), lerp(82, 90, R), L);
    const bor2Lv = lerp(lerp(17, 26, R), lerp(78, 88, R), L);

    // Text
    const hiLv  = lerp(lerp(88, 96, C), lerp(4, 14, C), L);
    const txLv  = lerp(lerp(74, 86, C), lerp(12, 22, C), L);
    const t2Lv  = lerp(lerp(56, 70, C), lerp(26, 38, C), L);
    const muLv  = lerp(lerp(40, 52, C), lerp(38, 48, C), L);
    const diLv  = lerp(lerp(28, 40, C), lerp(46, 56, C), L);
    const ghLv  = lerp(lerp(18, 30, C), lerp(55, 68, C), L);

    // Accent
    const hueShift = lerp(-28, 28, W);
    const accH  = sl.hue + hueShift;
    const accS  = lerp(20, 96, V);
    const accLv = lerp(lerp(38, 52, V), lerp(44, 58, V), L);
    const abgLv = lerp(lerp(9,  18, V), lerp(78, 88, V), L);
    const ahiLv = lerp(lerp(62, 80, V), lerp(18, 32, V), L);

    // Spacing
    const spXs = `${lerp(4,  10, A).toFixed(1)}px`;
    const spSm = `${lerp(8,  16, A).toFixed(1)}px`;
    const spMd = `${lerp(14, 28, A).toFixed(1)}px`;
    const spLg = `${lerp(20, 40, A).toFixed(1)}px`;

    // Radius
    const rv    = sl.radius / 100;
    const rSmV  = lerp(2,  8,  rv);
    const rMdV  = lerp(4,  14, rv);
    const rLgV  = lerp(6,  22, rv);
    const pillV = lerp(8,  32, rv);

    // Font
    const serifF = sl.serif / 100;
    const fontFamily = serifF > 0.5
      ? `Georgia, 'Times New Roman', serif`
      : `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const letterSpacing = `${lerp(-0.02, 0.06, sl.tracking / 100).toFixed(3)}em`;
    const fontSizePx    = `${Math.round(sl.scale * 0.16)}px`;   // scale/100 * 16px

    // Shadow
    const shA = lerp(0.06, 0.55, (R * 0.4 + (sl.shadow / 100) * 0.6));
    const shB = Math.round(lerp(2, 36, sl.shadow / 100));
    const shadow = `0 ${Math.round(shB*0.35)}px ${shB}px rgba(0,0,0,${shA.toFixed(2)})`;
    const shadowHover = `0 ${Math.round(shB*0.6)}px ${Math.round(shB*1.5)}px rgba(0,0,0,${(shA*1.3).toFixed(2)})`;

    // Motion
    const motionMs = Math.round(lerp(0, 320, sl.motion / 100));
    const transition = `${motionMs}ms ease`;

    const bg      = hsl(bgH, bgS,      bgLv);
    const surface = hsl(bgH, bgS*0.95, sfLv);
    const surf2   = hsl(bgH, bgS*0.9,  s2Lv);
    const deep    = hsl(bgH, bgS*1.1,  dpLv);
    const border  = hsl(bgH, bgS*0.85, borLv);
    const border2 = hsl(bgH, bgS*0.8,  bor2Lv);
    const hi      = hsl(bgH, bgS*0.4,  hiLv);
    const text    = hsl(bgH, bgS*0.5,  txLv);
    const text2   = hsl(bgH, bgS*0.45, t2Lv);
    const muted   = hsl(bgH, bgS*0.35, muLv);
    const dim     = hsl(bgH, bgS*0.3,  diLv);
    const ghost   = hsl(bgH, bgS*0.25, ghLv);
    const accent  = hsl(accH, accS,       accLv);
    const accBg   = hsl(accH, accS*0.75,  abgLv);
    const accHi   = hsl(accH, accS*0.85,  ahiLv);

    return {
      bg, surface, surf2, deep, border, border2,
      hi, text, text2, muted, dim, ghost,
      accent, accBg, accHi,
      fontFamily, letterSpacing, fontSizePx,
      spXs, spSm, spMd, spLg,
      rSmV, rMdV, rLgV, pillV,
      shadow, shadowHover, transition, motionMs,
    };
  }

  function buildCSS(t) {
    return `
:root {
  --bg:${t.bg}; --surface:${t.surface}; --surface-2:${t.surf2}; --deep:${t.deep};
  --border:${t.border}; --border-2:${t.border2};
  --hi:${t.hi}; --text:${t.text}; --text-2:${t.text2};
  --muted:${t.muted}; --dim:${t.dim}; --ghost:${t.ghost};
  --accent:${t.accent}; --acc-bg:${t.accBg}; --acc-hi:${t.accHi};
  --r-sm:${t.rSmV.toFixed(1)}px; --r:${t.rMdV.toFixed(1)}px;
  --r-lg:${t.rLgV.toFixed(1)}px; --pill:${t.pillV.toFixed(1)}px;
  --sp-xs:${t.spXs}; --sp-sm:${t.spSm}; --sp-md:${t.spMd}; --sp-lg:${t.spLg};
  --shadow:${t.shadow}; --shadow-hover:${t.shadowHover};
  --transition:${t.transition};
  font-size:${t.fontSizePx};
}
body {
  background:${t.bg} !important;
  color:${t.text} !important;
  font-family:${t.fontFamily};
  letter-spacing:${t.letterSpacing};
  transition:background ${t.transition},color ${t.transition};
}
`;
  }

  // ─── State & Storage ───────────────────────────────────────────────────────
  let state    = loadState();
  let history  = loadHistory();
  let histIdx  = history.length - 1;
  let userPresets = loadUserPresets();

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function loadState() {
    try { const s = JSON.parse(localStorage.getItem(LS_STATE)); if (s?.axes) return s; } catch {}
    return deepClone(DEFAULTS);
  }
  function saveState() { try { localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch {} }
  function loadHistory() {
    try { const h = JSON.parse(localStorage.getItem(LS_HIST)); if (Array.isArray(h)) return h; } catch {}
    return [deepClone(DEFAULTS)];
  }
  function saveHistory() { try { localStorage.setItem(LS_HIST, JSON.stringify(history)); } catch {} }
  function loadUserPresets() {
    try { const p = JSON.parse(localStorage.getItem(LS_PRESETS)); if (p) return p; } catch {}
    return {};
  }
  function saveUserPresets() { try { localStorage.setItem(LS_PRESETS, JSON.stringify(userPresets)); } catch {} }

  function pushHistory(snapshot) {
    if (histIdx < history.length - 1) history = history.slice(0, histIdx + 1);
    if (!deepEq(snapshot, history[history.length - 1])) {
      history.push(deepClone(snapshot));
      if (history.length > MAX_HIST) history.shift();
      histIdx = history.length - 1;
      saveHistory();
    }
  }
  function undo() { if (histIdx > 0) { histIdx--; state = deepClone(history[histIdx]); applyAndSync(false); } }
  function redo() { if (histIdx < history.length - 1) { histIdx++; state = deepClone(history[histIdx]); applyAndSync(false); } }

  // ─── Apply ─────────────────────────────────────────────────────────────────
  let styleEl = null;
  function applyTheme(st) {
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'tc-override'; document.head.appendChild(styleEl); }
    styleEl.textContent = buildCSS(computeTheme(st));
  }

  let bc = null;
  try { bc = new BroadcastChannel(BC_NAME); bc.onmessage = e => { if (e.data?.type === 'theme') { state = e.data.state; applyTheme(state); saveState(); syncUI(); } }; } catch {}

  function applyAndSync(broadcast = true) {
    applyTheme(state);
    saveState();
    syncUI();
    if (broadcast && bc) bc.postMessage({ type:'theme', state: deepClone(state) });
  }

  // ─── Initial apply ─────────────────────────────────────────────────────────
  applyTheme(state);

  // ─── Panel styles ──────────────────────────────────────────────────────────
  const panelCSS = `
#tc-fab {
  position:fixed; bottom:22px; right:22px; z-index:99998;
  width:44px; height:44px; border-radius:50%;
  background:var(--surface,#131929); border:1.5px solid var(--border-2,#1e2a45);
  box-shadow:0 4px 18px rgba(0,0,0,.45);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; font-size:19px; transition:transform .15s,box-shadow .15s;
  user-select:none; color:var(--text,#cbd5e1);
}
#tc-fab:hover { transform:scale(1.08); box-shadow:0 6px 24px rgba(0,0,0,.55); }
#tc-fab.open { background:var(--accent,#2563eb); color:#fff; border-color:transparent; }

#tc-root {
  position:fixed; bottom:76px; right:22px; z-index:99999;
  width:370px; background:var(--surface,#131929);
  border:1px solid var(--border-2,#1e2a45);
  border-radius:14px; box-shadow:0 8px 40px rgba(0,0,0,.6);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:12px; color:var(--text,#cbd5e1);
  display:none; flex-direction:column; overflow:hidden;
  max-height:calc(100vh - 110px);
  resize:both; min-width:320px; min-height:300px;
}
#tc-root.visible { display:flex; }
#tc-root.dock-right {
  bottom:0; right:0; top:0; width:380px; height:100vh; max-height:100vh;
  border-radius:0; border-right:none; border-top:none; border-bottom:none;
  resize:horizontal;
}
#tc-root.dock-bottom {
  bottom:0; left:0; right:0; width:100vw; height:300px; max-height:40vh;
  border-radius:0; border-left:none; border-right:none; border-bottom:none;
  resize:vertical; min-width:100vw;
}

#tc-header {
  display:flex; align-items:center; gap:6px; padding:10px 12px 8px;
  border-bottom:1px solid var(--border,#1a2236);
  background:var(--surface-2,#1a2035); cursor:move; flex-shrink:0;
}
#tc-header .tc-title { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--hi,#f1f5f9); flex:1; }
.tc-icon-btn {
  background:none; border:none; color:var(--dim,#475569); cursor:pointer;
  font-size:13px; padding:3px 5px; border-radius:5px; line-height:1;
  transition:color .12s,background .12s;
}
.tc-icon-btn:hover { color:var(--text,#cbd5e1); background:var(--surface,#131929); }
.tc-icon-btn.active { color:var(--accent,#2563eb); }

#tc-body { overflow-y:auto; flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:12px; }
#tc-body::-webkit-scrollbar { width:4px; }
#tc-body::-webkit-scrollbar-track { background:transparent; }
#tc-body::-webkit-scrollbar-thumb { background:var(--ghost,#334155); border-radius:2px; }

/* ─ Section labels ─ */
.tc-section-label {
  font-size:9.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--dim,#475569); margin-bottom:6px;
}

/* ─ Starburst ─ */
#tc-starburst-wrap {
  display:flex; flex-direction:column; align-items:center; gap:4px;
}
#tc-svg { overflow:visible; }
.tc-axis-line { stroke:var(--border-2,#1e2a45); stroke-width:1; }
.tc-axis-ring { fill:none; stroke:var(--border,#1a2236); stroke-width:.5; }
.tc-poly {
  fill:var(--accent,#2563eb); fill-opacity:.18; stroke:var(--accent,#2563eb);
  stroke-width:1.5; stroke-linejoin:round;
  transition:d .08s;
}
.tc-handle {
  fill:var(--accent,#2563eb); stroke:var(--surface,#131929); stroke-width:2;
  cursor:grab; r:6;
  transition:r .12s;
}
.tc-handle:hover { r:8; }
.tc-handle:active { cursor:grabbing; }
.tc-axis-label {
  font-size:9.5px; fill:var(--dim,#475569); text-anchor:middle; dominant-baseline:central;
  pointer-events:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
.tc-axis-label.outer { fill:var(--muted,#64748b); font-weight:600; }

/* ─ Sliders ─ */
.tc-slider-row {
  display:grid; grid-template-columns:56px 1fr 46px; align-items:center; gap:6px;
}
.tc-slider-label { font-size:10px; color:var(--dim,#475569); white-space:nowrap; }
.tc-slider-ends  { display:flex; justify-content:space-between; font-size:9px; color:var(--ghost,#334155); }
.tc-range-wrap   { position:relative; }
.tc-range {
  width:100%; height:4px; cursor:pointer;
  -webkit-appearance:none; appearance:none;
  background: linear-gradient(to right, var(--accent,#2563eb) 0%, var(--accent,#2563eb) var(--pct,50%), var(--border-2,#1e2a45) var(--pct,50%));
  border-radius:2px; outline:none;
}
.tc-range::-webkit-slider-thumb {
  -webkit-appearance:none; width:13px; height:13px; border-radius:50%;
  background:var(--accent,#2563eb); border:2px solid var(--surface,#131929);
  cursor:grab; transition:transform .12s;
}
.tc-range::-webkit-slider-thumb:active { cursor:grabbing; transform:scale(1.2); }
.tc-range::-moz-range-thumb {
  width:11px; height:11px; border-radius:50%;
  background:var(--accent,#2563eb); border:2px solid var(--surface,#131929); cursor:grab;
}
.tc-slider-val { font-size:10px; color:var(--muted,#64748b); text-align:right; font-variant-numeric:tabular-nums; }
/* hue slider special gradient */
.tc-range.hue-range {
  background: linear-gradient(to right,
    hsl(0,80%,50%),hsl(45,80%,50%),hsl(90,80%,50%),hsl(135,80%,50%),
    hsl(180,80%,50%),hsl(225,80%,50%),hsl(270,80%,50%),hsl(315,80%,50%),hsl(360,80%,50%)
  ) !important;
}
.tc-range.hue-range::-webkit-slider-thumb { background:hsl(var(--hue-h,217),80%,60%); }

/* ─ Presets ─ */
.tc-presets-grid { display:flex; flex-wrap:wrap; gap:5px; }
.tc-preset-pill {
  font-size:10px; padding:3px 9px; border-radius:20px; cursor:pointer;
  background:var(--surface-2,#1a2035); color:var(--muted,#64748b);
  border:1px solid var(--border-2,#1e2a45);
  transition:all .12s; white-space:nowrap; font-family:inherit;
}
.tc-preset-pill:hover { color:var(--text,#cbd5e1); border-color:var(--ghost,#334155); }
.tc-preset-pill.active { background:var(--acc-bg,#1e3a8a); color:var(--acc-hi,#93c5fd); border-color:var(--accent,#2563eb); }
.tc-preset-pill.user { border-style:dashed; }
.tc-preset-pill .tc-del { margin-left:5px; opacity:.4; font-size:10px; }
.tc-preset-pill:hover .tc-del { opacity:.8; }

/* ─ Swatch preview ─ */
#tc-swatch {
  display:grid; grid-template-columns:repeat(8,1fr); gap:3px;
  border-radius:6px; overflow:hidden; height:18px; flex-shrink:0;
}
#tc-swatch span { display:block; height:100%; }

/* ─ Footer ─ */
#tc-footer {
  display:flex; align-items:center; gap:6px; padding:8px 12px;
  border-top:1px solid var(--border,#1a2236); flex-shrink:0; flex-wrap:wrap;
}
.tc-btn {
  font-size:10px; padding:4px 10px; border-radius:6px; cursor:pointer;
  background:var(--surface-2,#1a2035); color:var(--muted,#64748b);
  border:1px solid var(--border-2,#1e2a45); font-family:inherit;
  transition:all .12s; white-space:nowrap;
}
.tc-btn:hover { color:var(--text,#cbd5e1); border-color:var(--ghost,#334155); }
.tc-btn.primary { background:var(--accent,#2563eb); color:#fff; border-color:transparent; }
.tc-btn.primary:hover { filter:brightness(1.1); }
.tc-btn.danger  { color:#f87171; border-color:#7f1d1d; }
.tc-btn.danger:hover  { background:#450a0a; }
.tc-spacer { flex:1; }

/* ─ History bar ─ */
#tc-hist-bar {
  display:flex; align-items:center; gap:4px; flex-shrink:0;
}
.tc-hist-dot {
  width:6px; height:6px; border-radius:50%; background:var(--ghost,#334155);
  cursor:pointer; flex-shrink:0; transition:background .1s;
}
.tc-hist-dot.cur { background:var(--accent,#2563eb); }
.tc-hist-dot:hover { background:var(--muted,#64748b); }
`;

  const styleTag = document.createElement('style');
  styleTag.textContent = panelCSS;
  document.head.appendChild(styleTag);

  // ─── Build Panel DOM ───────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'tc-fab';
  fab.title = 'Theme Controls';
  fab.textContent = '🎨';
  document.body.appendChild(fab);

  const root = document.createElement('div');
  root.id = 'tc-root';
  root.innerHTML = `
<div id="tc-header">
  <span class="tc-title">Theme</span>
  <button class="tc-icon-btn" id="tc-undo" title="Undo">↩</button>
  <button class="tc-icon-btn" id="tc-redo" title="Redo">↪</button>
  <button class="tc-icon-btn" id="tc-ldtoggle" title="Light/Dark toggle">☀</button>
  <button class="tc-icon-btn" id="tc-dock-float" title="Float">⊡</button>
  <button class="tc-icon-btn" id="tc-dock-right" title="Dock right">▶</button>
  <button class="tc-icon-btn" id="tc-dock-bottom" title="Dock bottom">▼</button>
  <button class="tc-icon-btn" id="tc-close" title="Close">✕</button>
</div>
<div id="tc-body">
  <div>
    <div class="tc-section-label">Style Axes</div>
    <div id="tc-starburst-wrap">
      <svg id="tc-svg" viewBox="0 0 260 260" width="220" height="220"></svg>
    </div>
  </div>
  <div id="tc-sliders-section">
    <div class="tc-section-label">Fine Tune</div>
    <div id="tc-sliders"></div>
  </div>
  <div>
    <div class="tc-section-label">Presets</div>
    <div class="tc-presets-grid" id="tc-presets"></div>
  </div>
  <div>
    <div class="tc-section-label">History</div>
    <div id="tc-hist-bar"></div>
  </div>
  <div id="tc-swatch"></div>
</div>
<div id="tc-footer">
  <button class="tc-btn" id="tc-reset">Reset</button>
  <button class="tc-btn" id="tc-save-preset">Save Preset</button>
  <button class="tc-btn" id="tc-export">Export</button>
  <label class="tc-btn" style="cursor:pointer">Import<input type="file" accept=".json" id="tc-import-file" style="display:none"></label>
  <span class="tc-spacer"></span>
  <button class="tc-btn primary" id="tc-apply-all" title="Broadcast to all open dashboards">Apply All</button>
</div>
`;
  document.body.appendChild(root);

  // ─── Starburst SVG ─────────────────────────────────────────────────────────
  const svg = root.querySelector('#tc-svg');

  function axisXY(ax, frac) {
    const a = rad(ax.deg);
    return [SVG_CX + frac * SVG_R * Math.cos(a), SVG_CY + frac * SVG_R * Math.sin(a)];
  }

  function buildStarburst() {
    svg.innerHTML = '';
    // Concentric guide rings at 25%, 50%, 75%, 100%
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const p = AXES.map(ax => axisXY(ax, f).join(',')).join(' ');
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points', p);
      poly.setAttribute('class','tc-axis-ring');
      svg.appendChild(poly);
    });
    // Axis lines
    AXES.forEach(ax => {
      const [x1, y1] = axisXY(ax, 0);
      const [x2, y2] = axisXY(ax, 1);
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('class','tc-axis-line');
      svg.appendChild(line);
      // Outer label (high end)
      const [lx, ly] = axisXY(ax, 1.18);
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', lx); txt.setAttribute('y', ly);
      txt.setAttribute('class','tc-axis-label outer');
      txt.textContent = ax.label;
      svg.appendChild(txt);
      // Inner label (low end) near center
      const [ix, iy] = axisXY(ax, -0.18);
      const txt2 = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt2.setAttribute('x', ix); txt2.setAttribute('y', iy);
      txt2.setAttribute('class','tc-axis-label');
      txt2.setAttribute('font-size','8');
      txt2.textContent = ax.neg;
      svg.appendChild(txt2);
    });
    // Polygon
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.id = 'tc-poly'; poly.setAttribute('class','tc-poly');
    svg.appendChild(poly);
    // Handles
    AXES.forEach(ax => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      circle.setAttribute('class','tc-handle');
      circle.setAttribute('data-axis', ax.id);
      circle.setAttribute('tabindex','0');
      circle.setAttribute('role','slider');
      circle.setAttribute('aria-label', ax.label);
      svg.appendChild(circle);
    });
    updateStarburst();
    attachStarburstDrag();
  }

  function updateStarburst() {
    const pts = AXES.map(ax => {
      const frac = state.axes[ax.id] / 100;
      return axisXY(ax, frac);
    });
    const poly = svg.querySelector('#tc-poly');
    poly.setAttribute('points', pts.map(p => p.join(',')).join(' '));
    svg.querySelectorAll('.tc-handle').forEach(h => {
      const ax = AXES.find(a => a.id === h.dataset.axis);
      const [x, y] = axisXY(ax, state.axes[ax.id] / 100);
      h.setAttribute('cx', x); h.setAttribute('cy', y);
    });
  }

  function attachStarburstDrag() {
    let dragging = null;
    svg.addEventListener('pointerdown', e => {
      const h = e.target.closest('.tc-handle');
      if (!h) return;
      dragging = h.dataset.axis;
      h.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener('pointermove', e => {
      if (!dragging) return;
      const ax = AXES.find(a => a.id === dragging);
      const svgRect = svg.getBoundingClientRect();
      const scaleX = 260 / svgRect.width;
      const scaleY = 260 / svgRect.height;
      const mx = (e.clientX - svgRect.left) * scaleX;
      const my = (e.clientY - svgRect.top) * scaleY;
      const dx = mx - SVG_CX, dy = my - SVG_CY;
      const a = rad(ax.deg);
      const proj = dot(dx, dy, Math.cos(a), Math.sin(a));
      state.axes[dragging] = clamp(Math.round(proj / SVG_R * 100), 0, 100);
      updateStarburst();
      applyAndSync();
    });
    svg.addEventListener('pointerup', e => {
      if (dragging) { pushHistory(state); dragging = null; }
    });
    // Keyboard
    svg.querySelectorAll('.tc-handle').forEach(h => {
      h.addEventListener('keydown', e => {
        const axId = h.dataset.axis;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          state.axes[axId] = clamp(state.axes[axId] + (e.shiftKey ? 10 : 1), 0, 100);
          updateStarburst(); applyAndSync(); pushHistory(state);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          state.axes[axId] = clamp(state.axes[axId] - (e.shiftKey ? 10 : 1), 0, 100);
          updateStarburst(); applyAndSync(); pushHistory(state);
        } else if (e.key === 'Home') {
          state.axes[axId] = 0; updateStarburst(); applyAndSync(); pushHistory(state);
        } else if (e.key === 'End') {
          state.axes[axId] = 100; updateStarburst(); applyAndSync(); pushHistory(state);
        }
      });
    });
  }

  // ─── Linear Sliders ────────────────────────────────────────────────────────
  const slidersDiv = root.querySelector('#tc-sliders');

  function buildSliders() {
    slidersDiv.innerHTML = '';
    SLIDERS.forEach(sl => {
      const row = document.createElement('div');
      row.className = 'tc-slider-row';
      row.style.marginBottom = '7px';

      const label = document.createElement('div');
      label.className = 'tc-slider-label';
      label.textContent = sl.label;

      const wrap = document.createElement('div');
      const ends = document.createElement('div');
      ends.className = 'tc-slider-ends';
      const input = document.createElement('input');
      input.type = 'range'; input.min = sl.min; input.max = sl.max; input.step = 1;
      input.className = 'tc-range' + (sl.id === 'hue' ? ' hue-range' : '');
      input.dataset.sid = sl.id;

      if (sl.lo || sl.hi) {
        ends.innerHTML = `<span>${sl.lo}</span><span>${sl.hi}</span>`;
        wrap.appendChild(ends);
      }
      wrap.className = 'tc-range-wrap';
      wrap.appendChild(input);

      const val = document.createElement('div');
      val.className = 'tc-slider-val';
      val.dataset.sid = sl.id;

      row.appendChild(label); row.appendChild(wrap); row.appendChild(val);
      slidersDiv.appendChild(row);

      input.addEventListener('input', () => {
        state.sliders[sl.id] = Number(input.value);
        updateSliderDisplay(sl, input, val);
        applyAndSync();
      });
      input.addEventListener('change', () => pushHistory(state));
    });
    updateAllSliders();
  }

  function updateSliderDisplay(sl, input, valEl) {
    const v = state.sliders[sl.id];
    const pct = ((v - sl.min) / (sl.max - sl.min) * 100).toFixed(1);
    input.style.setProperty('--pct', pct + '%');
    if (sl.id === 'hue') { input.style.setProperty('--hue-h', v); valEl.textContent = v + '°'; }
    else if (sl.id === 'scale') valEl.textContent = v + '%';
    else if (sl.id === 'colors') valEl.textContent = v;
    else valEl.textContent = Math.round(pct) + '%';
  }

  function updateAllSliders() {
    SLIDERS.forEach(sl => {
      const input = slidersDiv.querySelector(`input[data-sid="${sl.id}"]`);
      const valEl = slidersDiv.querySelector(`.tc-slider-val[data-sid="${sl.id}"]`);
      if (!input) return;
      input.value = state.sliders[sl.id];
      updateSliderDisplay(sl, input, valEl);
    });
  }

  // ─── Presets ───────────────────────────────────────────────────────────────
  const presetsDiv = root.querySelector('#tc-presets');

  function buildPresets() {
    presetsDiv.innerHTML = '';
    const all = { ...BUILTIN_PRESETS, ...userPresets };
    Object.entries(all).forEach(([name, preset]) => {
      const pill = document.createElement('button');
      pill.className = 'tc-preset-pill' + (userPresets[name] ? ' user' : '');
      pill.dataset.name = name;
      const isUser = !!userPresets[name];
      pill.innerHTML = name + (isUser ? `<span class="tc-del" data-del="${name}" title="Delete">×</span>` : '');
      pill.addEventListener('click', e => {
        if (e.target.dataset.del) {
          delete userPresets[e.target.dataset.del];
          saveUserPresets(); buildPresets(); return;
        }
        state = deepClone(all[name]);
        pushHistory(state); applyAndSync();
      });
      presetsDiv.appendChild(pill);
    });
    updatePresetHighlight();
  }

  function updatePresetHighlight() {
    presetsDiv.querySelectorAll('.tc-preset-pill').forEach(p => {
      const all = { ...BUILTIN_PRESETS, ...userPresets };
      const preset = all[p.dataset.name];
      p.classList.toggle('active', preset && deepEq(preset, state));
    });
  }

  // ─── History dots ──────────────────────────────────────────────────────────
  const histBar = root.querySelector('#tc-hist-bar');

  function updateHistBar() {
    histBar.innerHTML = '';
    const show = history.slice(-20);
    const offset = history.length - show.length;
    show.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'tc-hist-dot' + (i + offset === histIdx ? ' cur' : '');
      dot.title = `History step ${i + offset + 1}`;
      dot.addEventListener('click', () => {
        histIdx = i + offset;
        state = deepClone(history[histIdx]);
        applyAndSync(false);
      });
      histBar.appendChild(dot);
    });
  }

  // ─── Color swatch ──────────────────────────────────────────────────────────
  const swatchDiv = root.querySelector('#tc-swatch');

  function updateSwatch() {
    const t = computeTheme(state);
    const colors = [t.bg, t.surface, t.surf2, t.text, t.muted, t.accent, t.accBg, t.accHi];
    swatchDiv.innerHTML = colors.map(c => `<span style="background:${c}"></span>`).join('');
  }

  // ─── syncUI ────────────────────────────────────────────────────────────────
  function syncUI() {
    updateStarburst();
    updateAllSliders();
    updatePresetHighlight();
    updateHistBar();
    updateSwatch();
  }

  // ─── Dock / drag ──────────────────────────────────────────────────────────
  let dockMode = 'float';

  function setDock(mode) {
    dockMode = mode;
    root.classList.remove('dock-right', 'dock-bottom');
    if (mode === 'right')  root.classList.add('dock-right');
    if (mode === 'bottom') root.classList.add('dock-bottom');
    // Float reset position
    if (mode === 'float') { root.style.bottom='76px'; root.style.right='22px'; root.style.top=''; root.style.left=''; }
    root.querySelector('#tc-dock-float').classList.toggle('active', mode === 'float');
    root.querySelector('#tc-dock-right').classList.toggle('active', mode === 'right');
    root.querySelector('#tc-dock-bottom').classList.toggle('active', mode === 'bottom');
  }

  // Drag-to-move header (float mode only)
  const header = root.querySelector('#tc-header');
  let draggingPanel = false, dragOX = 0, dragOY = 0;
  header.addEventListener('pointerdown', e => {
    if (dockMode !== 'float') return;
    if (e.target.tagName === 'BUTTON') return;
    draggingPanel = true;
    header.setPointerCapture(e.pointerId);
    const rect = root.getBoundingClientRect();
    dragOX = e.clientX - rect.left;
    dragOY = e.clientY - rect.top;
    root.style.bottom = 'auto'; root.style.right = 'auto';
  });
  document.addEventListener('pointermove', e => {
    if (!draggingPanel) return;
    root.style.left = (e.clientX - dragOX) + 'px';
    root.style.top  = (e.clientY - dragOY) + 'px';
  });
  document.addEventListener('pointerup', () => { draggingPanel = false; });

  // ─── Event wiring ──────────────────────────────────────────────────────────
  fab.addEventListener('click', () => {
    const visible = root.classList.toggle('visible');
    fab.classList.toggle('open', visible);
  });
  root.querySelector('#tc-close').addEventListener('click', () => {
    root.classList.remove('visible'); fab.classList.remove('open');
  });
  root.querySelector('#tc-undo').addEventListener('click', undo);
  root.querySelector('#tc-redo').addEventListener('click', redo);
  root.querySelector('#tc-dock-float').addEventListener('click', () => setDock('float'));
  root.querySelector('#tc-dock-right').addEventListener('click', () => setDock('right'));
  root.querySelector('#tc-dock-bottom').addEventListener('click', () => setDock('bottom'));

  root.querySelector('#tc-ldtoggle').addEventListener('click', () => {
    const prev = state.axes.light;
    state.axes.light = prev < 50 ? 92 : 5;
    pushHistory(state); applyAndSync();
  });

  root.querySelector('#tc-reset').addEventListener('click', () => {
    state = deepClone(DEFAULTS);
    pushHistory(state); applyAndSync();
  });

  root.querySelector('#tc-save-preset').addEventListener('click', () => {
    const name = prompt('Preset name:', 'My Preset');
    if (!name?.trim()) return;
    userPresets[name.trim()] = deepClone(state);
    saveUserPresets(); buildPresets();
  });

  root.querySelector('#tc-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ state, userPresets }, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'theme-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
  });

  root.querySelector('#tc-import-file').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.state?.axes) { state = data.state; pushHistory(state); applyAndSync(); }
        if (data.userPresets) { Object.assign(userPresets, data.userPresets); saveUserPresets(); buildPresets(); }
      } catch { alert('Invalid theme file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  root.querySelector('#tc-apply-all').addEventListener('click', () => {
    saveState();
    if (bc) bc.postMessage({ type:'theme', state: deepClone(state) });
    // Flash button feedback
    const btn = root.querySelector('#tc-apply-all');
    btn.textContent = 'Sent ✓'; setTimeout(() => { btn.textContent = 'Apply All'; }, 1200);
  });

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === 'Escape' && root.classList.contains('visible')) {
      root.classList.remove('visible'); fab.classList.remove('open');
    }
  });

  // ─── Init ──────────────────────────────────────────────────────────────────
  buildStarburst();
  buildSliders();
  buildPresets();
  updateHistBar();
  updateSwatch();
  setDock('float');

  // Initial history seed
  if (history.length === 1 && deepEq(history[0], DEFAULTS) && !deepEq(state, DEFAULTS)) {
    pushHistory(state);
  }
})();
