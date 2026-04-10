/**
 * theme-control.js  — Universal Dashboard Theme Control Panel v3
 * Drop <script src="theme-control.js"></script> at the end of <body>.
 * Persists to localStorage; syncs across tabs via BroadcastChannel.
 */
(function () {
  'use strict';
  if (document.getElementById('tc-root')) return;

  const LS_STATE   = 'tc_state_v1';
  const LS_PRESETS = 'tc_presets_v1';
  const LS_HIST    = 'tc_hist_v1';
  const LS_PREFS   = 'tc_prefs_v1';  // panel UI preferences (separate from theme state)
  const BC_NAME    = 'tc_broadcast';
  const MAX_HIST   = 40;   // major milestones kept
  const HIST_MINOR = 6;    // minor tweaks stored per major
  const HIST_DIST  = 120;  // distance threshold for new major entry
  const SVG_CX = 130, SVG_CY = 130, SVG_R = 95;

  const AXES = [
    { id:'light',    label:'Light',    neg:'Dark',    deg:-90  },
    { id:'warm',     label:'Warm',     neg:'Cool',    deg:-30  },
    { id:'vivid',    label:'Vivid',    neg:'Mono',    deg: 30  },
    { id:'airy',     label:'Airy',     neg:'Dense',   deg: 90  },
    { id:'contrast', label:'Contrast', neg:'Soft',    deg: 150 },
    { id:'rich',     label:'Rich',     neg:'Minimal', deg: 210 },
  ];

  // Font family presets
  const FONT_PRESETS = [
    { label:'System',    family:`-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif` },
    { label:'Serif',     family:`Georgia,'Times New Roman',serif` },
    { label:'Mono',      family:`'SF Mono','Fira Code','Consolas',monospace` },
    { label:'Geometric', family:`'Futura','Century Gothic','Trebuchet MS',sans-serif` },
    { label:'Humanist',  family:`'Optima','Gill Sans','Segoe UI',sans-serif` },
    { label:'Custom',    family:null },
  ];

  // Slider groups
  const SLIDERS_TYPE = [
    { id:'scale',    label:'Scale',      lo:'Small',   hi:'Large',   min:70, max:130, def:100 },
    { id:'weight',   label:'Weight',     lo:'Thin',    hi:'Heavy',   min:0,  max:100, def:40  },
    { id:'leading',  label:'Line ht',    lo:'Compact', hi:'Airy',    min:0,  max:100, def:50  },
    { id:'tracking', label:'Spacing',    lo:'Tight',   hi:'Loose',   min:0,  max:100, def:50  },
    { id:'hRatio',   label:'H1 ratio',   lo:'1.2×',    hi:'3×',      min:0,  max:100, def:55  },
    { id:'h2Ratio',  label:'H2 ratio',   lo:'1.0×',    hi:'2×',      min:0,  max:100, def:50  },
    { id:'h1Leading',label:'H1 lead',    lo:'Tight',   hi:'Loose',   min:0,  max:100, def:40  },
    { id:'h2Leading',label:'H2 lead',    lo:'Tight',   hi:'Loose',   min:0,  max:100, def:45  },
    { id:'txOpacity',label:'Tx opacity', lo:'Dim',     hi:'Full',    min:0,  max:100, def:85  },
    { id:'muOpacity',label:'Mu opacity', lo:'Ghost',   hi:'Clear',   min:0,  max:100, def:50  },
  ];
  const SLIDERS_COLOR = [
    { id:'hue',      label:'Hue',        lo:'0°',      hi:'360°',    min:0,  max:359, def:217 },
    { id:'accSat',   label:'Acc sat',    lo:'Muted',   hi:'Vivid',   min:0,  max:100, def:70  },
    { id:'colors',   label:'Accents',    lo:'1',       hi:'6',       min:1,  max:6,   def:2   },
    { id:'tint',     label:'Surf tint',  lo:'Neutral', hi:'Tinted',  min:0,  max:100, def:30  },
    { id:'accHueSplit', label:'Split',   lo:'Mono',    hi:'Split',   min:0,  max:180, def:0   },
  ];
  const SLIDERS_LAYOUT = [
    { id:'radius',       label:'Corners',      lo:'Sharp',   hi:'Round',   min:0,  max:100, def:60  },
    { id:'border',       label:'Borders',      lo:'None',    hi:'Bold',    min:0,  max:100, def:40  },
    { id:'shadow',       label:'Depth',        lo:'Flat',    hi:'Deep',    min:0,  max:100, def:50  },
    { id:'motion',       label:'Motion',       lo:'Still',   hi:'Lively',  min:0,  max:100, def:30  },
    { id:'density',      label:'Density',      lo:'Compact', hi:'Spacious',min:0,  max:100, def:50  },
    { id:'iconScale',    label:'Icon scale',   lo:'Small',   hi:'Large',   min:0,  max:100, def:50  },
    { id:'surfaceAlpha', label:'Surf opacity', lo:'Glass',   hi:'Solid',   min:0,  max:100, def:100 },
    { id:'glassBlur',    label:'Glass blur',   lo:'None',    hi:'Heavy',   min:0,  max:100, def:0   },
    { id:'ctrlScale',    label:'Control size', lo:'Compact', hi:'Large',   min:60, max:140, def:100 },
  ];
  const SLIDERS_VIBE = [
    { id:'organic',  label:'Organic',    lo:'Tech',    hi:'Nature',  min:0,  max:100, def:20  },
    { id:'polish',   label:'Polish',     lo:'Raw',     hi:'Refined', min:0,  max:100, def:65  },
    { id:'energy',   label:'Energy',     lo:'Calm',    hi:'Electric',min:0,  max:100, def:40  },
    { id:'bgHue',    label:'BG hue',     lo:'−60°',    hi:'+60°',    min:-60,max:60,  def:0   },
    { id:'sfSep',    label:'SF depth',   lo:'Flat',    hi:'Layered', min:0,  max:100, def:50  },
    { id:'sfSat',    label:'SF color',   lo:'Grey',    hi:'Tinted',  min:0,  max:100, def:30  },
    { id:'bgSat',    label:'BG sat',     lo:'Neutral', hi:'Colored', min:0,  max:100, def:50  },
    { id:'popAccent',label:'Acc pop',    lo:'Subtle',  hi:'Bold',    min:0,  max:100, def:50  },
  ];

  const SLIDERS = [...SLIDERS_TYPE, ...SLIDERS_COLOR, ...SLIDERS_LAYOUT, ...SLIDERS_VIBE];

  const DEFAULTS = {
    axes:    { light:5, warm:35, vivid:70, airy:45, contrast:68, rich:52 },
    sliders: { ...Object.fromEntries(SLIDERS.map(s => [s.id, s.def])), fontPreset:0 },
    colorOverrides: {},
    customFont: '',
  };
  // Vibe defaults shorthand for preset definitions
  const VD = { organic:20, polish:65, energy:40, bgHue:0, sfSep:50, sfSat:30, bgSat:50, popAccent:50 };

  const BUILTIN_PRESETS = {
    'Dark Blue':     { axes:{light:5, warm:35,vivid:70,airy:45,contrast:68,rich:52},  sliders:{serif:0,scale:100,weight:40,leading:50,tracking:50,hRatio:55,h2Ratio:50,txOpacity:85,muOpacity:50,hue:217,accSat:70,colors:2,tint:30,accHueSplit:0,  radius:60,border:40,shadow:50,motion:30,density:50,iconScale:50, ...VD} },
    'Light':         { axes:{light:95,warm:40,vivid:55,airy:55,contrast:72,rich:42},  sliders:{serif:0,scale:100,weight:40,leading:50,tracking:50,hRatio:55,h2Ratio:50,txOpacity:92,muOpacity:55,hue:217,accSat:65,colors:2,tint:20,accHueSplit:0,  radius:60,border:35,shadow:30,motion:30,density:50,iconScale:50, ...VD,polish:70} },
    'High Contrast': { axes:{light:8, warm:35,vivid:92,airy:50,contrast:95,rich:65},  sliders:{serif:0,scale:100,weight:55,leading:50,tracking:50,hRatio:65,h2Ratio:55,txOpacity:100,muOpacity:65,hue:217,accSat:90,colors:2,tint:10,accHueSplit:0, radius:40,border:60,shadow:70,motion:20,density:45,iconScale:50, ...VD,polish:85,energy:60,popAccent:80} },
    'Monokai':       { axes:{light:10,warm:75,vivid:85,airy:45,contrast:75,rich:55},  sliders:{serif:0,scale:100,weight:40,leading:50,tracking:50,hRatio:55,h2Ratio:50,txOpacity:88,muOpacity:52,hue:45, accSat:80,colors:3,tint:40,accHueSplit:120,radius:30,border:35,shadow:60,motion:25,density:48,iconScale:50, ...VD,organic:15,energy:65,bgSat:55,popAccent:70} },
    'Solarized':     { axes:{light:28,warm:65,vivid:52,airy:55,contrast:62,rich:48},  sliders:{serif:0,scale:100,weight:40,leading:55,tracking:55,hRatio:50,h2Ratio:45,txOpacity:82,muOpacity:48,hue:192,accSat:60,colors:3,tint:35,accHueSplit:60, radius:50,border:30,shadow:40,motion:30,density:52,iconScale:50, ...VD,bgHue:-15,sfSat:40,bgSat:40} },
    'Classic Print': { axes:{light:93,warm:50,vivid:35,airy:60,contrast:82,rich:38},  sliders:{serif:85,scale:100,weight:45,leading:65,tracking:55,hRatio:60,h2Ratio:52,txOpacity:90,muOpacity:50,hue:210,accSat:40,colors:1,tint:10,accHueSplit:0,  radius:18,border:50,shadow:20,motion:15,density:55,iconScale:45, ...VD,organic:55,polish:80,energy:15,sfSat:5,bgSat:10} },
    'Dusk':          { axes:{light:18,warm:60,vivid:65,airy:50,contrast:70,rich:58},  sliders:{serif:0,scale:100,weight:40,leading:50,tracking:50,hRatio:55,h2Ratio:50,txOpacity:85,muOpacity:50,hue:280,accSat:75,colors:3,tint:45,accHueSplit:90, radius:55,border:35,shadow:60,motion:35,density:50,iconScale:50, ...VD,organic:35,energy:55,bgHue:20,sfSat:45,bgSat:45} },
    'Terminal':      { axes:{light:5, warm:50,vivid:80,airy:40,contrast:88,rich:45},  sliders:{serif:0,scale:100,weight:40,leading:48,tracking:50,hRatio:45,h2Ratio:42,txOpacity:88,muOpacity:45,hue:140,accSat:85,colors:1,tint:5, accHueSplit:0,  radius:4, border:55,shadow:35,motion:10,density:42,iconScale:48, ...VD,organic:5,polish:40,energy:30,bgSat:15,sfSat:10,popAccent:75} },
    'Notion':        { axes:{light:96,warm:42,vivid:38,airy:62,contrast:78,rich:35},  sliders:{serif:0,scale:100,weight:35,leading:65,tracking:48,hRatio:48,h2Ratio:44,txOpacity:90,muOpacity:52,hue:205,accSat:55,colors:1,tint:5, accHueSplit:0,  radius:8, border:30,shadow:18,motion:20,density:58,iconScale:45, ...VD,organic:25,polish:88,energy:20,bgSat:8,sfSat:8} },
    'Ocean':         { axes:{light:12,warm:25,vivid:68,airy:52,contrast:72,rich:55},  sliders:{serif:0,scale:100,weight:40,leading:52,tracking:50,hRatio:55,h2Ratio:50,txOpacity:85,muOpacity:50,hue:198,accSat:78,colors:2,tint:50,accHueSplit:45, radius:70,border:35,shadow:55,motion:40,density:50,iconScale:50, ...VD,organic:60,energy:45,bgHue:-10,sfSat:55,bgSat:55} },
    'Forest':        { axes:{light:14,warm:55,vivid:58,airy:55,contrast:68,rich:50},  sliders:{serif:0,scale:100,weight:40,leading:58,tracking:48,hRatio:52,h2Ratio:48,txOpacity:85,muOpacity:50,hue:145,accSat:65,colors:2,tint:45,accHueSplit:30, radius:65,border:30,shadow:50,motion:35,density:52,iconScale:50, organic:80,polish:55,energy:30,bgHue:10,sfSat:50,bgSat:48,popAccent:55} },
    'Neon City':     { axes:{light:5, warm:45,vivid:95,airy:42,contrast:85,rich:60},  sliders:{serif:0,scale:100,weight:50,leading:46,tracking:52,hRatio:58,h2Ratio:52,txOpacity:90,muOpacity:55,hue:295,accSat:95,colors:4,tint:15,accHueSplit:150,radius:35,border:45,shadow:75,motion:55,density:44,iconScale:55, organic:5,polish:60,energy:95,bgHue:15,sfSat:20,bgSat:25,popAccent:95} },
    'Parchment':     { axes:{light:88,warm:62,vivid:32,airy:58,contrast:70,rich:40},  sliders:{serif:75,scale:98, weight:40,leading:68,tracking:52,hRatio:58,h2Ratio:50,txOpacity:88,muOpacity:48,hue:38, accSat:45,colors:1,tint:25,accHueSplit:0,  radius:12,border:40,shadow:22,motion:18,density:55,iconScale:45, organic:70,polish:72,energy:12,bgHue:5,sfSat:35,bgSat:30,popAccent:40} },
  };

  // ─── Math ──────────────────────────────────────────────────────────────────
  const lerp  = (a,b,t) => a + (b-a)*Math.max(0,Math.min(1,t));
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const rad   = d => d*Math.PI/180;
  const hsl   = (h,s,l) => `hsl(${Math.round(((h%360)+360)%360)},${Math.round(clamp(s,0,100))}%,${Math.round(clamp(l,0,100))}%)`;
  const hsla  = (h,s,l,a) => a >= 0.995 ? hsl(h,s,l) : `hsla(${Math.round(((h%360)+360)%360)},${Math.round(clamp(s,0,100))}%,${Math.round(clamp(l,0,100))}%,${a.toFixed(2)})`;
  const dot   = (ax,ay,bx,by) => ax*bx+ay*by;

  function hslToHex(hslStr) {
    const m = hslStr.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%/);
    if (!m) return '#000000';
    let h = parseInt(m[1])/360, s = parseFloat(m[2])/100, l = parseFloat(m[3])/100;
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
      const h2 = (v,t) => { if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
      r=h2(p,h+1/3); g=h2(p,h); b=h2(p,h-1/3);
    }
    return '#'+[r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
  }

  // Extract hue (0-359) from a hex color string
  function hexToHue(hex) {
    const h = hex.replace('#','');
    let r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
    if (d === 0) return 0;
    let hue = max === r ? (g-b)/d % 6 : max === g ? (b-r)/d + 2 : (r-g)/d + 4;
    return ((hue * 60) + 360) % 360;
  }

  // Build a 16px hue-ring indicator with a dot at the given hue angle
  function makeHueRing(hue) {
    const wrap = document.createElement('div'); wrap.className = 'tc-token-hue-ring';
    wrap.title = `Hue ≈ ${Math.round(hue)}°`;
    const dot = document.createElement('div'); dot.className = 'tc-token-hue-dot';
    const a = (hue - 90) * Math.PI / 180, R = 5;
    dot.style.left = (8 + R * Math.cos(a) - 2) + 'px';
    dot.style.top  = (8 + R * Math.sin(a) - 2) + 'px';
    wrap.appendChild(dot); return wrap;
  }

  // ─── CSS Computation ───────────────────────────────────────────────────────
  function computeTheme(st) {
    const { axes:ax, sliders:sl } = st;
    const L  = ax.light    / 100;
    const W  = ax.warm     / 100;
    const V  = ax.vivid    / 100;
    const A  = ax.airy     / 100;
    const C  = ax.contrast / 100;
    const R  = ax.rich     / 100;

    // Vibe modifiers
    const organic   = (sl.organic   ?? 20)  / 100;
    const polish    = (sl.polish    ?? 65)  / 100;
    const energy    = (sl.energy    ?? 40)  / 100;
    const bgHueShift= (sl.bgHue     ?? 0);           // degrees, raw
    const sfSep     = (sl.sfSep     ?? 50)  / 100;
    const sfSatMod  = (sl.sfSat     ?? 30)  / 100;
    const bgSatMod  = (sl.bgSat     ?? 50)  / 100;
    const popAccent = (sl.popAccent ?? 50)  / 100;

    // Organic shifts hue toward green-brown range, polish tightens saturation
    const baseHueOffset = lerp(0, 18, organic) - lerp(0, 8, polish);
    const bgH  = lerp(222, 210, L) + baseHueOffset + bgHueShift;
    // bgSat: bgSatMod scales overall BG saturation, organic adds warmth
    const bgSBase = lerp(42, 18, L);
    const bgS  = bgSBase * lerp(0.5, 1.4, bgSatMod) * lerp(1.0, 1.15, organic);
    const bgLv = lerp(6,98,L);
    // Surface separation: sfSep controls how much lighter surface is vs bg
    const sfLift = lerp(2, 8, sfSep);
    const sfLv = lerp(11,100,L) + (L < 0.5 ? sfLift : -sfLift*0.4);
    const s2Lv = lerp(14,97,L) + (L < 0.5 ? sfLift*1.6 : -sfLift*0.7);
    const dpLv = lerp(4,95,L)  - (L < 0.5 ? sfLift*0.4 : sfLift*0.2);
    const tint = (sl.tint/100) * lerp(0.5, 1.5, sfSatMod);  // sfSat amplifies tint
    const bw   = sl.border/100;

    const borLv  = lerp(lerp(lerp(11,18,tint),lerp(16,26,tint),R), lerp(lerp(80,85,tint),lerp(86,93,tint),R), L);
    const bor2Lv = lerp(lerp(lerp(14,22,tint),lerp(20,30,tint),R), lerp(lerp(76,82,tint),lerp(82,90,tint),R), L);
    const borderW = lerp(0.5,2.5,bw);

    // Text — opacity-driven for hi/text/muted/dim/ghost
    const txOp  = sl.txOpacity  / 100;
    const muOp  = sl.muOpacity  / 100;
    const hiLv  = lerp(lerp(88,96,C), lerp(4,14,C),  L) * lerp(0.9,1.0,txOp);
    const txLv  = lerp(lerp(74,86,C), lerp(12,22,C), L) * lerp(0.7,1.0,txOp);
    const t2Lv  = lerp(lerp(56,70,C), lerp(26,38,C), L) * lerp(0.6,1.0,txOp);
    const muLv  = lerp(lerp(40,52,C), lerp(38,48,C), L) * lerp(0.4,1.0,muOp);
    const diLv  = lerp(lerp(28,40,C), lerp(46,56,C), L) * lerp(0.3,1.0,muOp);
    const ghLv  = lerp(lerp(18,30,C), lerp(55,68,C), L) * lerp(0.25,0.9,muOp);

    const hueShift  = lerp(-28,28,W);
    const accH      = sl.hue + hueShift;
    const splitH    = accH + sl.accHueSplit;
    const accSatS   = sl.accSat/100;
    // popAccent amplifies saturation + contrast; energy pushes brightness extremes
    const accSatBoost = lerp(0.8, 1.25, popAccent);
    const accS      = lerp(20,96,V*accSatS) * accSatBoost;
    const accLvBase = lerp(lerp(38,52,V),lerp(44,58,V),L);
    const accLv     = accLvBase + lerp(-4, 6, energy) * (L < 0.5 ? 1 : -1);
    const abgLv     = lerp(lerp(9,18,V),lerp(78,88,V),L);
    const ahiLv     = lerp(lerp(62,80,V),lerp(18,32,V),L);
    const split2    = hsl(splitH, accS*0.85, lerp(lerp(42,56,V),lerp(40,54,V),L));

    const density   = sl.density/100;
    const spXs = `${lerp(lerp(3,5,density),lerp(6,12,density),A).toFixed(1)}px`;
    const spSm = `${lerp(lerp(6,10,density),lerp(10,20,density),A).toFixed(1)}px`;
    const spMd = `${lerp(lerp(10,16,density),lerp(16,32,density),A).toFixed(1)}px`;
    const spLg = `${lerp(lerp(16,24,density),lerp(24,48,density),A).toFixed(1)}px`;

    const rv = sl.radius/100;
    const rSmV  = lerp(0,6,rv);
    const rMdV  = lerp(0,18,rv);
    const rLgV  = lerp(0,32,rv);
    const pillV = lerp(0,50,rv);

    const fpIdx        = Math.round(clamp(sl.fontPreset ?? 0, 0, FONT_PRESETS.length-1));
    const fontFamily   = FONT_PRESETS[fpIdx].family || (st.customFont || FONT_PRESETS[0].family);
    const letterSpacing= `${lerp(-0.02,0.06,sl.tracking/100).toFixed(3)}em`;
    const lineHeight   = `${lerp(1.3,1.9,sl.leading/100).toFixed(2)}`;
    const fontSizePx   = `${Math.round(sl.scale*0.16)}px`;
    const fontWeight   = Math.round(lerp(300,800,sl.weight/100)/100)*100;

    // Heading ratios + per-heading line heights
    const h1Em       = lerp(1.2,3.0,sl.hRatio/100).toFixed(2);
    const h2Em       = lerp(1.0,2.0,sl.h2Ratio/100).toFixed(2);
    const h3Em       = (parseFloat(h2Em)*0.78).toFixed(2);
    const h1Leading  = lerp(0.9,1.5,(sl.h1Leading ?? 40)/100).toFixed(2);
    const h2Leading  = lerp(0.95,1.5,(sl.h2Leading ?? 45)/100).toFixed(2);

    // Icon scale
    const iconEm = lerp(0.85,1.35,sl.iconScale/100).toFixed(2);

    const shA = lerp(0.06,0.55,(R*0.4+(sl.shadow/100)*0.6));
    const shB = Math.round(lerp(2,36,sl.shadow/100));
    const shadow      = `0 ${Math.round(shB*0.35)}px ${shB}px rgba(0,0,0,${shA.toFixed(2)})`;
    const shadowHover = `0 ${Math.round(shB*0.6)}px ${Math.round(shB*1.5)}px rgba(0,0,0,${(shA*1.3).toFixed(2)})`;
    const motionMs    = Math.round(lerp(0,320,sl.motion/100));
    const transition  = `${motionMs}ms ease`;

    const surfA      = (sl.surfaceAlpha ?? 100) / 100;
    const glassBlurPx = lerp(0, 32, (sl.glassBlur ?? 0) / 100);
    const ctrlScaleV  = lerp(0.6, 1.4, ((sl.ctrlScale ?? 100) - 60) / 80);

    const bg      = hsl(bgH,bgS,bgLv);
    const surface = hsla(bgH,bgS*0.95,sfLv, surfA);
    const surf2   = hsla(bgH,bgS*0.9,s2Lv,  surfA);
    const deep    = hsla(bgH,bgS*1.1,dpLv,  Math.max(0, surfA - 0.08));
    const border  = hsl(bgH,bgS*0.85,borLv);
    const border2 = hsl(bgH,bgS*0.8,bor2Lv);
    const hi      = hsl(bgH,bgS*0.4,hiLv);
    const text    = hsl(bgH,bgS*0.5,txLv);
    const text2   = hsl(bgH,bgS*0.45,t2Lv);
    const muted   = hsl(bgH,bgS*0.35,muLv);
    const dim     = hsl(bgH,bgS*0.3,diLv);
    const ghost   = hsl(bgH,bgS*0.25,ghLv);
    const accent  = hsl(accH,accS,accLv);
    const accBg   = hsl(accH,accS*0.75,abgLv);
    const accHi   = hsl(accH,accS*0.85,ahiLv);

    return {
      bg,surface,surf2,deep,border,border2,hi,text,text2,muted,dim,ghost,
      accent,accBg,accHi,split2,
      fontFamily,letterSpacing,lineHeight,fontSizePx,fontWeight,
      h1Em,h2Em,h3Em,h1Leading,h2Leading,iconEm,
      spXs,spSm,spMd,spLg,
      rSmV,rMdV,rLgV,pillV,borderW,
      shadow,shadowHover,transition,motionMs,
      glassBlurPx, surfA, ctrlScaleV,
    };
  }

  function buildCSS(t, overrides) {
    const ov = overrides || {};
    const g  = (k, v) => ov[k] || v;
    return `
:root {
  --bg:${g('--bg',t.bg)}; --surface:${g('--surface',t.surface)}; --surface-2:${g('--surface-2',t.surf2)}; --deep:${g('--deep',t.deep)};
  --border:${g('--border',t.border)}; --border-2:${g('--border-2',t.border2)};
  --hi:${g('--hi',t.hi)}; --text:${g('--text',t.text)}; --text-2:${g('--text-2',t.text2)};
  --muted:${g('--muted',t.muted)}; --dim:${t.dim}; --ghost:${t.ghost};
  --accent:${g('--accent',t.accent)}; --acc-bg:${g('--acc-bg',t.accBg)}; --acc-hi:${g('--acc-hi',t.accHi)}; --accent-2:${g('--accent-2',t.split2)};
  --r-sm:${t.rSmV.toFixed(1)}px; --r:${t.rMdV.toFixed(1)}px;
  --r-lg:${t.rLgV.toFixed(1)}px; --pill:${t.pillV.toFixed(1)}px;
  --border-w:${t.borderW.toFixed(2)}px;
  --sp-xs:${t.spXs}; --sp-sm:${t.spSm}; --sp-md:${t.spMd}; --sp-lg:${t.spLg};
  --shadow:${t.shadow}; --shadow-hover:${t.shadowHover};
  --transition:${t.transition}; --line-height:${t.lineHeight};
  --h1-size:${t.h1Em}em; --h2-size:${t.h2Em}em; --h3-size:${t.h3Em}em;
  --h1-leading:${t.h1Leading}; --h2-leading:${t.h2Leading};
  --icon-scale:${t.iconEm}em;
  --glass-blur:${t.glassBlurPx.toFixed(1)}px;
  --ctrl-scale:${t.ctrlScaleV.toFixed(3)};
  font-size:${t.fontSizePx};
}
body {
  background:${g('--bg',t.bg)} !important;
  color:${g('--text',t.text)} !important;
  font-family:${t.fontFamily};
  letter-spacing:${t.letterSpacing};
  line-height:${t.lineHeight};
  font-weight:${t.fontWeight};
  transition:background ${t.transition},color ${t.transition};
}
h1,[style*="--h1"]:is(h1,.h1) { line-height:var(--h1-leading,1.1); }
h2,[style*="--h2"]:is(h2,.h2) { line-height:var(--h2-leading,1.2); }
`;
  }

  // ─── State & Storage ───────────────────────────────────────────────────────
  let state       = loadState();
  let history     = loadHistory();
  let histIdx     = history.length-1;
  let userPresets = loadUserPresets();
  let prefs       = loadPrefs();

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function deepEq(a,b)  { return JSON.stringify(a)===JSON.stringify(b); }

  function ensureDefaults(st) {
    if (!st.axes)           st.axes           = {};
    if (!st.sliders)        st.sliders        = {};
    if (!st.colorOverrides) st.colorOverrides = {};
    if (st.customFont === undefined) st.customFont = '';
    AXES.forEach(a => { if (st.axes[a.id]    === undefined) st.axes[a.id]    = DEFAULTS.axes[a.id]; });
    SLIDERS.forEach(s => { if (st.sliders[s.id] === undefined) st.sliders[s.id] = s.def; });
    if (st.sliders.fontPreset === undefined) st.sliders.fontPreset = 0;
    return st;
  }

  function loadState()       { try { const s=JSON.parse(localStorage.getItem(LS_STATE));   if (s?.axes) return ensureDefaults(s); } catch {} return deepClone(DEFAULTS); }
  function saveState()       { try { localStorage.setItem(LS_STATE,   JSON.stringify(state));       } catch {} }
  function loadHistory()     { try { const h=JSON.parse(localStorage.getItem(LS_HIST)); if (Array.isArray(h) && h.length) { // migrate old flat format
    if (!h[0].state) return h.map(s=>({ state:ensureDefaults(s), minors:[] }));
    return h.map(e=>({ state:ensureDefaults(e.state), minors:(e.minors||[]).map(ensureDefaults) })); } } catch {} return [{ state:deepClone(DEFAULTS), minors:[] }]; }
  function saveHistory()     { try { localStorage.setItem(LS_HIST,    JSON.stringify(history));     } catch {} }
  function loadUserPresets() { try { const p=JSON.parse(localStorage.getItem(LS_PRESETS)); if (p) return p; } catch {} return {}; }
  function saveUserPresets() { try { localStorage.setItem(LS_PRESETS, JSON.stringify(userPresets)); } catch {} }
  // Panel UI prefs — independent of theme state, never broadcast
  function loadPrefs()  { try { const p=JSON.parse(localStorage.getItem(LS_PREFS)); if (p) return p; } catch {} return { panelScale: 1 }; }
  function savePrefs()  { try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); } catch {} }

  // Distance between two states (sum of axis deltas + normalised slider deltas)
  function stateDist(a, b) {
    let d = 0;
    AXES.forEach(ax => { d += Math.abs((a.axes[ax.id]||0) - (b.axes[ax.id]||0)); });
    SLIDERS.forEach(sl => { d += Math.abs(((a.sliders[sl.id]||sl.def) - (b.sliders[sl.id]||sl.def)) / (sl.max-sl.min)) * 30; });
    return d;
  }

  // Each entry: { state, minors:[] }
  // history is now an array of major entries; histIdx points into it
  function pushHistory(snapshot) {
    if (histIdx < history.length-1) history = history.slice(0,histIdx+1);
    const snap = deepClone(snapshot);
    if (!history.length) { history.push({ state:snap, minors:[] }); histIdx=0; saveHistory(); return; }
    const cur = history[history.length-1];
    if (deepEq(cur.state, snap)) return; // no change
    const dist = stateDist(cur.state, snap);
    if (dist >= HIST_DIST) {
      // Major step
      history.push({ state:snap, minors:[] });
      if (history.length>MAX_HIST) history.shift();
      histIdx = history.length-1;
    } else {
      // Minor tweak — store in current major's minors, cap at HIST_MINOR
      cur.minors.push(snap);
      if (cur.minors.length > HIST_MINOR) cur.minors.shift();
      // Update current major's state so distance is measured from the latest minor
      cur.state = snap;
    }
    saveHistory();
  }
  function undo() { if (histIdx>0)               { histIdx--; state=deepClone(history[histIdx].state); applyAndSync(false); } }
  function redo() { if (histIdx<history.length-1) { histIdx++; state=deepClone(history[histIdx].state); applyAndSync(false); } }

  // ─── Apply ─────────────────────────────────────────────────────────────────
  let styleEl = null;
  function applyTheme(st) {
    if (!styleEl) { styleEl=document.createElement('style'); styleEl.id='tc-override'; document.head.appendChild(styleEl); }
    styleEl.textContent = buildCSS(computeTheme(st), st.colorOverrides);
  }

  let bc = null;
  try {
    bc = new BroadcastChannel(BC_NAME);
    bc.onmessage = e => { if (e.data?.type==='theme') { state=ensureDefaults(e.data.state); applyTheme(state); saveState(); syncUI(); } };
  } catch {}

  function applyAndSync(broadcast=true) {
    applyTheme(state); saveState(); syncUI();
    if (broadcast && bc) bc.postMessage({type:'theme',state:deepClone(state)});
  }
  applyTheme(state);

  // ─── Panel scale preference ────────────────────────────────────────────────
  function applyPanelScale() {
    root.style.setProperty('--tc-ps', prefs.panelScale ?? 1);
    root.querySelectorAll('.tc-ps-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.ps) === (prefs.panelScale ?? 1));
    });
  }
  applyPanelScale();

  // ─── Swatch mini (for history tooltip) ────────────────────────────────────
  function miniSwatchHTML(st) {
    const t = computeTheme(st);
    return [t.bg,t.surface,t.surf2,t.text,t.muted,t.accent,t.accBg,t.accHi]
      .map(c=>`<span style="flex:1;background:${c};height:100%"></span>`).join('');
  }

  function histLabel(st) {
    const all = {...BUILTIN_PRESETS,...userPresets};
    for (const [name,p] of Object.entries(all)) { if (deepEq(p,st)) return name; }
    return null;
  }

  // ─── Panel CSS ─────────────────────────────────────────────────────────────
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
#tc-fab.open  { background:#3a5a78; color:#dce9f5; border-color:transparent; }

#tc-root {
  position:fixed; bottom:76px; right:22px; z-index:99999;
  width:384px; background:var(--surface,#131929);
  border:1px solid var(--border-2,#1e2a45);
  border-radius:14px; box-shadow:0 8px 40px rgba(0,0,0,.6);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:12px; color:var(--text,#cbd5e1);
  display:none; flex-direction:column; overflow:hidden;
  max-height:calc(100vh - 110px);
  resize:both; min-width:330px; min-height:300px;
  /* Neutral panel accent — fixed, not theme-driven */
  --pa:#4e7a9b; --pa-dim:#152232; --pa-lit:#8ab4cc;
}
#tc-root.visible { display:flex; }
/* Prevent text selection during drag */
#tc-root * { user-select:none; -webkit-user-select:none; }
#tc-root input, #tc-root textarea { user-select:text; -webkit-user-select:text; }
#tc-root.dock-right  { bottom:0;right:0;top:0;width:390px;height:100vh;max-height:100vh;border-radius:0;border-right:none;border-top:none;border-bottom:none;resize:horizontal; }
#tc-root.dock-bottom { bottom:0;left:0;right:0;width:100vw;height:320px;max-height:40vh;border-radius:0;border-left:none;border-right:none;border-bottom:none;resize:vertical;min-width:100vw; }

/* ─ Mobile sheet ─ */
@media (max-width:600px) {
  #tc-fab { bottom:16px; right:16px; width:48px; height:48px; font-size:22px; }
  #tc-root {
    /* Bottom sheet — full width, slides up */
    bottom:0 !important; left:0 !important; right:0 !important; top:auto !important;
    width:100vw !important; max-width:100vw !important; min-width:0 !important;
    border-radius:18px 18px 0 0 !important;
    border-left:none !important; border-right:none !important; border-bottom:none !important;
    max-height:82vh !important; resize:none !important;
    transform:translateY(100%); transition:transform .28s cubic-bezier(.4,0,.2,1);
  }
  #tc-root.visible { transform:translateY(0); }
  /* Drag pill at top of sheet */
  #tc-sheet-pill {
    display:flex; justify-content:center; padding:10px 0 4px; cursor:grab; flex-shrink:0;
  }
  #tc-sheet-pill::after {
    content:''; width:36px; height:4px; border-radius:2px; background:#2a3a54;
  }
  /* Hide dock/resize controls on mobile */
  #tc-dock-float, #tc-dock-right, #tc-dock-bottom { display:none !important; }
  /* Bigger tap targets for sliders */
  .tc-range { height:6px !important; }
  .tc-range::-webkit-slider-thumb { width:18px !important; height:18px !important; }
  /* Bigger accordion headers */
  .tc-acc-hd { padding:12px 16px !important; font-size:11px !important; }
  .tc-acc-body { padding:10px 16px 14px !important; }
  /* Bigger slider rows */
  .tc-slider-row { margin-bottom:10px !important; }
  .tc-slider-label { font-size:11px !important; }
  .tc-slider-val { font-size:11px !important; }
  /* Tighter header */
  #tc-header { padding:8px 14px !important; }
  /* Hide starburst on mobile to save space */
  #tc-svg-wrap { display:none !important; }
  /* Swatch strip taller for easier reading */
  #tc-swatch span { height:18px !important; }
}
/* Sheet pill hidden on desktop */
@media (min-width:601px) { #tc-sheet-pill { display:none; } }

#tc-header {
  display:flex; align-items:center; gap:5px; padding:9px 12px 8px;
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
.tc-icon-btn.active { color:var(--pa-lit,#8ab4cc); }
#tc-unsaved {
  font-size:8.5px; font-weight:700; padding:1px 6px; border-radius:10px;
  background:#451a03; color:#fbbf24; letter-spacing:.05em; opacity:0; transition:opacity .2s;
}
#tc-unsaved.visible { opacity:1; }

#tc-body { overflow-y:auto; flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:12px; }
#tc-body::-webkit-scrollbar { width:4px; }
#tc-body::-webkit-scrollbar-thumb { background:var(--ghost,#334155); border-radius:2px; }

.tc-section-label {
  font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--dim,#475569); margin-bottom:5px;
}

/* ─ Starburst ─ */
#tc-starburst-wrap { display:flex; flex-direction:column; align-items:center; position:relative; }
#tc-svg { overflow:visible; cursor:crosshair; user-select:none; -webkit-user-select:none; }
.tc-axis-line  { stroke:var(--border-2,#1e2a45); stroke-width:1; }
.tc-axis-hit   { stroke:transparent; stroke-width:14; cursor:pointer; }
.tc-axis-ring  { fill:none; stroke:var(--border,#1a2236); stroke-width:.5; }
.tc-poly       { fill:var(--accent,#2563eb); fill-opacity:.15; stroke:var(--accent,#2563eb); stroke-width:1.5; stroke-linejoin:round; }
.tc-handle     { fill:var(--accent,#2563eb); stroke:var(--surface,#131929); stroke-width:2; cursor:grab; r:6; transition:r .1s; }
.tc-handle:hover { r:9; }
.tc-handle:active { cursor:grabbing; }
.tc-axis-label { font-size:9.5px; fill:var(--dim,#475569); text-anchor:middle; dominant-baseline:central; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
.tc-axis-label.outer { fill:var(--muted,#64748b); font-weight:600; cursor:pointer; pointer-events:all; }
.tc-axis-label.outer:hover { fill:var(--accent,#2563eb); }
/* Axis value display per axis */
.tc-axis-val {
  font-size:8px; fill:var(--muted,#64748b); text-anchor:middle; dominant-baseline:central;
  pointer-events:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  transition:opacity .15s;
}
/* Drag value popup */
#tc-axis-tip {
  position:absolute; top:2px; left:50%; transform:translateX(-50%);
  font-size:10px; font-weight:700; color:var(--hi,#f1f5f9);
  background:var(--acc-bg,#1e3a8a); border:1px solid var(--accent,#2563eb);
  border-radius:6px; padding:2px 9px; pointer-events:none;
  opacity:0; transition:opacity .1s; white-space:nowrap;
}
#tc-axis-tip.visible { opacity:1; }

/* ─ Tabs ─ */
.tc-tabs { display:flex; gap:4px; margin-bottom:8px; }
.tc-tab {
  font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  padding:3px 10px; border-radius:20px; cursor:pointer;
  background:var(--surface-2,#1a2035); color:var(--dim,#475569);
  border:1px solid var(--border-2,#1e2a45); font-family:inherit; transition:all .12s;
}
.tc-tab.active { background:var(--pa-dim,#152232); color:var(--pa-lit,#8ab4cc); border-color:var(--pa,#4e7a9b); }

/* ─ Sliders — scale via --tc-ps (panel scale pref, default 1) ─ */
.tc-slider-row {
  display:grid; grid-template-columns:calc(62px * var(--tc-ps,1)) 1fr calc(38px * var(--tc-ps,1));
  align-items:center; gap:6px; margin-bottom:calc(6px * var(--tc-ps,1));
}
.tc-slider-label { font-size:calc(9.5px * var(--tc-ps,1)); color:var(--text-2,#94a3b8); white-space:nowrap; cursor:pointer; }
.tc-slider-label:hover { color:var(--hi,#f1f5f9); }
.tc-slider-ends  { display:flex; justify-content:space-between; font-size:calc(8px * var(--tc-ps,1)); color:var(--dim,#475569); }
.tc-range-wrap   { position:relative; }
.tc-range {
  width:100%; height:calc(4px * var(--tc-ps,1)); cursor:pointer; touch-action:none;
  -webkit-appearance:none; appearance:none;
  background:linear-gradient(to right,var(--pa,#4e7a9b) 0%,var(--pa,#4e7a9b) var(--pct,50%),var(--border-2,#1e2a45) var(--pct,50%));
  border-radius:2px; outline:none;
}
.tc-range::-webkit-slider-thumb {
  -webkit-appearance:none;
  width:calc(12px * var(--tc-ps,1)); height:calc(12px * var(--tc-ps,1));
  border-radius:50%; background:var(--pa-lit,#8ab4cc); border:2px solid var(--surface,#131929);
  cursor:grab; transition:transform .12s;
}
.tc-range::-webkit-slider-thumb:active { cursor:grabbing; transform:scale(1.25); }
.tc-range::-moz-range-thumb {
  width:calc(10px * var(--tc-ps,1)); height:calc(10px * var(--tc-ps,1));
  border-radius:50%; background:var(--pa-lit,#8ab4cc); border:2px solid var(--surface,#131929); cursor:grab;
}
.tc-slider-val { font-size:calc(9.5px * var(--tc-ps,1)); color:var(--muted,#64748b); text-align:right; font-variant-numeric:tabular-nums; }
.tc-range.hue-range {
  background:linear-gradient(to right,hsl(0,80%,50%),hsl(45,80%,50%),hsl(90,80%,50%),hsl(135,80%,50%),hsl(180,80%,50%),hsl(225,80%,50%),hsl(270,80%,50%),hsl(315,80%,50%),hsl(360,80%,50%)) !important;
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
.tc-preset-pill.active { background:var(--pa-dim,#152232); color:var(--pa-lit,#8ab4cc); border-color:var(--pa,#4e7a9b); }
.tc-preset-pill.user { border-style:dashed; }
.tc-preset-pill .tc-del { margin-left:5px; opacity:.4; }
.tc-preset-pill:hover .tc-del { opacity:.8; }

/* ─ Swatch ─ */
#tc-swatch { display:grid; grid-template-columns:repeat(8,1fr); gap:3px; border-radius:6px; overflow:hidden; height:16px; flex-shrink:0; }
#tc-swatch span { display:block; height:100%; }

/* ─ History ─ */
#tc-hist-scroll {
  overflow-x:auto; overflow-y:hidden; padding-bottom:4px;
  scrollbar-width:thin; scrollbar-color:var(--ghost,#334155) transparent;
}
#tc-hist-scroll::-webkit-scrollbar { height:3px; }
#tc-hist-scroll::-webkit-scrollbar-thumb { background:var(--ghost,#334155); border-radius:2px; }
#tc-hist-bar { display:flex; align-items:center; gap:6px; padding:6px 2px; min-width:max-content; }
/* Major dot */
.tc-hist-major {
  display:flex; flex-direction:column; align-items:center; gap:2px;
  cursor:pointer; flex-shrink:0; position:relative;
}
.tc-hist-major-dot {
  width:11px; height:11px; border-radius:50%;
  border:2px solid transparent;
  transition:transform .12s, box-shadow .12s;
  box-shadow:0 0 0 0 transparent;
}
.tc-hist-major:hover .tc-hist-major-dot { transform:scale(1.35); }
.tc-hist-major.cur .tc-hist-major-dot {
  border-color:var(--pa,#4e7a9b);
  box-shadow:0 0 0 3px rgba(78,122,155,.25);
  transform:scale(1.2);
}
/* Minor dots row beneath major */
.tc-hist-minors { display:flex; gap:2px; align-items:center; }
.tc-hist-minor-dot {
  width:4px; height:4px; border-radius:50%; background:var(--ghost,#334155);
  cursor:pointer; transition:background .1s, transform .1s;
}
.tc-hist-minor-dot:hover { transform:scale(1.5); }
/* Fixed-position hover preview card */
#tc-hist-preview {
  position:fixed; z-index:99999; pointer-events:none;
  background:#141820; border:1px solid #2a3a54;
  border-radius:9px; padding:8px 10px;
  display:none; flex-direction:column; gap:5px;
  width:140px; box-shadow:0 6px 24px rgba(0,0,0,.7);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:10px;
}
#tc-hist-preview.visible { display:flex; }
.tc-hist-swatch { display:flex; height:14px; border-radius:4px; overflow:hidden; gap:1px; }
.tc-hist-name   { font-size:8.5px; font-weight:700; color:#8ab4cc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tc-hist-axes   { display:grid; grid-template-columns:1fr 1fr; gap:2px; }
.tc-hist-ax     { font-size:7.5px; color:#3d4f68; display:flex; justify-content:space-between; gap:4px; }
.tc-hist-ax span{ color:#64748b; font-variant-numeric:tabular-nums; }
.tc-hist-step   { font-size:7px; color:#2a3a54; }

/* ─ Footer ─ */
#tc-footer { display:flex; align-items:center; gap:6px; padding:8px 12px; border-top:1px solid var(--border,#1a2236); flex-shrink:0; flex-wrap:wrap; }
#tc-prefs-bar {
  display:flex; align-items:center; gap:5px; padding:5px 12px 7px;
  border-top:1px solid var(--border,#1a2236);
}
.tc-prefs-lbl { font-size:8.5px; color:var(--dim,#475569); margin-right:4px; flex-shrink:0; }
.tc-ps-btn {
  font-size:9px; font-weight:700; padding:2px 8px; border-radius:4px; cursor:pointer;
  background:var(--surface-2,#1a2035); color:var(--muted,#64748b);
  border:1px solid var(--border-2,#1e2a45); font-family:inherit; transition:all .1s;
}
.tc-ps-btn:hover { color:var(--hi,#f1f5f9); border-color:var(--ghost,#334155); }
.tc-ps-btn.active { background:var(--pa-dim,#152232); color:var(--pa-lit,#8ab4cc); border-color:var(--pa,#4e7a9b); }
.tc-btn {
  font-size:10px; padding:4px 10px; border-radius:6px; cursor:pointer;
  background:var(--surface-2,#1a2035); color:var(--muted,#64748b);
  border:1px solid var(--border-2,#1e2a45); font-family:inherit; transition:all .12s; white-space:nowrap;
}
.tc-btn:hover   { color:var(--text,#cbd5e1); border-color:var(--ghost,#334155); }
.tc-btn.primary { background:var(--pa,#4e7a9b); color:#dce9f5; border-color:transparent; }
.tc-btn.primary:hover { filter:brightness(1.15); }
.tc-btn.danger  { color:#f87171; border-color:#7f1d1d; }
.tc-btn.danger:hover { background:#450a0a; }
.tc-spacer { flex:1; }

/* ─ Accordion ─ */
#tc-accordion { display:flex; flex-direction:column; }
.tc-acc-hd {
  display:flex; align-items:center; gap:6px; padding:7px 14px;
  cursor:pointer; border-bottom:1px solid var(--border,#1a2236);
  background:var(--surface-2,#1a2035);
  font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  color:var(--dim,#475569); user-select:none; transition:color .12s;
}
.tc-acc-hd:hover { color:var(--muted,#64748b); background:var(--surface,#131929); }
.tc-acc-hd.open  { color:var(--text,#cbd5e1); background:var(--surface,#131929); }
.tc-acc-arrow { font-size:7px; transition:transform .15s; margin-left:auto; }
.tc-acc-hd.open .tc-acc-arrow { transform:rotate(90deg); }
.tc-acc-body { display:none; padding:8px 14px 10px; border-bottom:1px solid var(--border,#1a2236); }
.tc-acc-hd.open ~ .tc-acc-body { display:block; }
.tc-sub-lbl {
  font-size:8px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--muted,#64748b); margin:10px 0 5px; display:flex; align-items:center; gap:6px;
}
.tc-sub-lbl::after { content:''; flex:1; height:1px; background:var(--border,#1a2236); }

/* ─ Font picker ─ */
.tc-font-picks { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
.tc-font-pill {
  font-size:9.5px; padding:3px 8px; border-radius:20px; cursor:pointer;
  background:var(--surface-2,#1a2035); color:var(--muted,#64748b);
  border:1px solid var(--border-2,#1e2a45); font-family:inherit; transition:all .12s;
}
.tc-font-pill:hover { color:var(--text,#cbd5e1); border-color:var(--ghost,#334155); }
.tc-font-pill.active { background:var(--pa-dim,#152232); color:var(--pa-lit,#8ab4cc); border-color:var(--pa,#4e7a9b); }
#tc-custom-font-row { display:none; margin-bottom:6px; }
#tc-custom-font-row.visible { display:flex; }
#tc-custom-font {
  flex:1; background:var(--surface-2,#1a2035); border:1px solid var(--border-2,#1e2a45);
  border-radius:5px; padding:4px 8px; color:var(--muted,#64748b);
  font-size:10px; font-family:inherit; outline:none; user-select:text; -webkit-user-select:text;
}
#tc-custom-font:focus { border-color:var(--pa,#4e7a9b); color:var(--text,#cbd5e1); }

/* ─ Harmony wheel ─ */
.tc-hw-wrap { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
.tc-hw-ring {
  width:72px; height:72px; border-radius:50%; flex-shrink:0; position:relative;
  background:conic-gradient(hsl(0,65%,50%),hsl(60,65%,50%),hsl(120,65%,50%),hsl(180,65%,50%),hsl(240,65%,50%),hsl(300,65%,50%),hsl(360,65%,50%));
}
.tc-hw-hole {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:46px; height:46px; border-radius:50%; background:var(--surface-2,#1a2035);
}
.tc-hw-dot {
  position:absolute; width:9px; height:9px; border-radius:50%;
  transform:translate(-50%,-50%); border:2px solid var(--surface,#131929); pointer-events:none;
}
.tc-hw-legend { display:flex; flex-direction:column; gap:5px; flex:1; min-width:0; }
.tc-hw-legend-item { display:flex; align-items:center; gap:5px; font-size:8.5px; color:var(--dim,#475569); }
.tc-hw-legend-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.tc-hw-legend-lbl { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tc-hw-legend-hex { font-size:8px; font-family:monospace; color:var(--ghost,#334155); }

/* ─ Harmony suggestions ─ */
.tc-harm-sugg { display:flex; flex-wrap:wrap; gap:4px; margin:8px 0 12px; }
.tc-harm-chip {
  display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:4px 7px; border-radius:6px; cursor:pointer;
  border:1px solid var(--border-2,#1e2a45);
  background:var(--surface-2,#1a2035); transition:all .12s;
}
.tc-harm-chip:hover { border-color:var(--ghost,#334155); }
.tc-harm-chip.active { border-color:var(--pa,#4e7a9b); background:var(--pa-dim,#152232); }
.tc-harm-dots { display:flex; gap:2px; align-items:center; }
.tc-harm-dot  { width:7px; height:7px; border-radius:50%; }
.tc-harm-lbl  { font-size:7.5px; color:var(--dim,#475569); }
.tc-harm-chip:hover .tc-harm-lbl { color:var(--muted,#64748b); }
.tc-harm-chip.active .tc-harm-lbl { color:var(--pa-lit,#8ab4cc); }

/* ─ Token hue ring (inline wayfinding indicator) ─ */
.tc-token-hue-ring {
  width:16px; height:16px; border-radius:50%; flex-shrink:0; position:relative;
  background:conic-gradient(from -90deg,hsl(0,65%,50%),hsl(60,65%,50%),hsl(120,65%,50%),hsl(180,65%,50%),hsl(240,65%,50%),hsl(300,65%,50%),hsl(360,65%,50%));
  cursor:help;
}
.tc-token-hue-ring::before {
  content:''; position:absolute; inset:3px; border-radius:50%;
  background:var(--surface-2,#1a2035); z-index:0;
}
.tc-token-hue-dot {
  position:absolute; width:4px; height:4px; border-radius:50%; z-index:1;
  background:#fff; box-shadow:0 0 2px rgba(0,0,0,.8);
}
/* Ghost dot on main harmony wheel (shown on token hover) */
#tc-hw-ghost {
  position:absolute; width:7px; height:7px; border-radius:50%;
  transform:translate(-50%,-50%); pointer-events:none;
  border:2px solid rgba(255,255,255,0.7); background:rgba(255,255,255,0.15);
  display:none; z-index:2;
}

/* ─ Color tokens ─ */
.tc-color-token { display:flex; align-items:center; gap:5px; margin-bottom:4px; }
.tc-token-chip {
  width:24px; height:24px; border-radius:4px; flex-shrink:0; cursor:pointer;
  border:2px solid transparent; outline:1px solid var(--border-2,#1e2a45);
  outline-offset:1px; transition:outline-color .1s, transform .1s;
  position:relative;
}
.tc-token-chip:hover { outline-color:var(--pa,#4e7a9b); transform:scale(1.1); }
.tc-token-chip.open  { outline-color:var(--pa-lit,#8ab4cc); outline-width:2px; }
/* Hidden native picker — triggered programmatically for clipboard copy only */
.tc-token-chip-native { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.tc-token-name { font-size:8.5px; color:var(--text-2,#94a3b8); width:60px; flex-shrink:0; }
.tc-token-hex {
  flex:1; min-width:0; background:var(--surface-2,#1a2035); border:1px solid var(--border-2,#1e2a45);
  border-radius:4px; padding:2px 5px; color:var(--muted,#64748b);
  font-size:9px; font-family:monospace; outline:none; cursor:text;
  user-select:text; -webkit-user-select:text;
}
.tc-token-hex:focus { border-color:var(--pa,#4e7a9b); color:var(--text,#cbd5e1); }
.tc-token-hex.ov { border-color:var(--pa,#4e7a9b); color:var(--pa-lit,#8ab4cc); }
.tc-token-lock {
  background:none; border:none; cursor:pointer; padding:2px; font-size:11px;
  color:var(--ghost,#334155); transition:color .1s; flex-shrink:0; line-height:1;
}
.tc-token-lock.locked { color:var(--pa-lit,#8ab4cc); }

/* ─ H/S/L + wheel expand panel ─ */
.tc-token-hsl { display:none; margin:2px 0 8px; border-radius:6px;
  border:1px solid var(--border-2,#1e2a45); overflow:hidden; }
.tc-token-hsl.open { display:flex; flex-direction:row; }
/* Left: mini wheel */
.tc-hsl-wheel-col {
  flex-shrink:0; width:62px; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:4px; padding:8px 6px;
  background:var(--deep,#0f1520); border-right:1px solid var(--border-2,#1e2a45);
}
.tc-hsl-wheel {
  width:48px; height:48px; border-radius:50%; position:relative; cursor:crosshair;
  background:conic-gradient(from -90deg,hsl(0,80%,50%),hsl(60,80%,50%),hsl(120,80%,50%),hsl(180,80%,50%),hsl(240,80%,50%),hsl(300,80%,50%),hsl(360,80%,50%));
  flex-shrink:0;
}
.tc-hsl-wheel::after {
  /* Radial white→transparent overlay for saturation */
  content:''; position:absolute; inset:0; border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.85) 0%,rgba(255,255,255,0) 70%);
  pointer-events:none;
}
.tc-hsl-wheel-cursor {
  position:absolute; width:8px; height:8px; border-radius:50%;
  border:2px solid #fff; box-shadow:0 0 3px rgba(0,0,0,.7);
  transform:translate(-50%,-50%); pointer-events:none;
  transition:left .05s,top .05s;
}
.tc-hsl-lightness {
  width:48px; height:6px; border-radius:3px; -webkit-appearance:none; appearance:none;
  cursor:pointer; outline:none; touch-action:none;
}
.tc-hsl-lightness::-webkit-slider-thumb {
  -webkit-appearance:none; width:10px; height:10px; border-radius:50%;
  background:#fff; border:1.5px solid rgba(0,0,0,.4); cursor:grab;
}
/* Right: sliders */
.tc-hsl-sliders-col { flex:1; padding:7px 8px; display:flex; flex-direction:column; gap:5px; background:var(--surface-2,#1a2035); }
.tc-hsl-row { display:grid; grid-template-columns:10px 1fr 28px; align-items:center; gap:4px; }
.tc-hsl-lbl { font-size:8px; color:var(--dim,#475569); font-weight:700; }
.tc-hsl-range {
  width:100%; height:3px; -webkit-appearance:none; appearance:none;
  border-radius:2px; outline:none; cursor:pointer; touch-action:none;
}
.tc-hsl-range::-webkit-slider-thumb {
  -webkit-appearance:none; width:10px; height:10px; border-radius:50%;
  background:var(--pa-lit,#8ab4cc); border:1.5px solid var(--surface,#131929); cursor:grab;
}
.tc-hsl-range.h-range {
  background:linear-gradient(to right,hsl(0,80%,50%),hsl(60,80%,50%),hsl(120,80%,50%),hsl(180,80%,50%),hsl(240,80%,50%),hsl(300,80%,50%),hsl(360,80%,50%));
}
.tc-hsl-val { font-size:8px; color:var(--muted,#64748b); text-align:right; font-variant-numeric:tabular-nums; }

/* ─ Help overlay ─ */
#tc-help-overlay {
  position:absolute; inset:0; z-index:10; background:rgba(9,12,18,.88);
  display:flex; align-items:center; justify-content:center; border-radius:14px;
}
#tc-help-box {
  background:var(--surface-2,#1a2035); border:1px solid var(--border-2,#1e2a45);
  border-radius:10px; padding:14px 16px; width:calc(100% - 40px); max-width:320px;
  position:relative;
}
.tc-help-title { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--pa-lit,#8ab4cc); margin-bottom:8px; }
.tc-help-grid { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; font-size:10px; }
.tc-help-key { color:var(--muted,#64748b); font-family:monospace; font-size:9.5px; white-space:nowrap; }

/* ─ Panel light mode ─ */
#tc-root.tc-panel-light {
  --bg:#d8e4f0; --surface:#e8f0f8; --surface-2:#dde8f4;
  --border:#b8ccdf; --border-2:#a8bcd4;
  --hi:#1a2840; --text:#2c3e58; --text-2:#3d5272;
  --muted:#4a6282; --dim:#607898; --ghost:#8098b4;
  background:var(--surface,#e8f0f8) !important;
  color:var(--text,#2c3e58) !important;
}
#tc-root.tc-panel-light #tc-header { background:var(--surface-2,#dde8f4); }
#tc-root.tc-panel-light #tc-body   { background:var(--surface,#e8f0f8); }
`;

  const styleTag = document.createElement('style');
  styleTag.textContent = panelCSS;
  document.head.appendChild(styleTag);

  // ─── Panel DOM ─────────────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id='tc-fab'; fab.title='Theme Controls'; fab.textContent='🎨';
  document.body.appendChild(fab);

  const root = document.createElement('div');
  root.id='tc-root';
  root.innerHTML = `
<div id="tc-sheet-pill"></div>
<div id="tc-header">
  <span class="tc-title">Theme</span>
  <span id="tc-unsaved">unsaved</span>
  <button class="tc-icon-btn" id="tc-undo" title="Undo (⌘Z)">↩</button>
  <button class="tc-icon-btn" id="tc-redo" title="Redo">↪</button>
  <button class="tc-icon-btn" id="tc-ldtoggle" title="Toggle light / dark">☀</button>
  <button class="tc-icon-btn" id="tc-panel-mode" title="Panel brightness">◐</button>
  <button class="tc-icon-btn" id="tc-help" title="Keyboard shortcuts">?</button>
  <button class="tc-icon-btn" id="tc-dock-float" title="Float">⊡</button>
  <button class="tc-icon-btn" id="tc-dock-right" title="Dock right">▶</button>
  <button class="tc-icon-btn" id="tc-dock-bottom" title="Dock bottom">▼</button>
  <button class="tc-icon-btn" id="tc-close" title="Close (Esc)">✕</button>
</div>
<div id="tc-help-overlay" style="display:none">
  <div id="tc-help-box">
    <div class="tc-help-title">Keyboard Shortcuts</div>
    <div class="tc-help-grid">
      <span class="tc-help-key">⌘Z / Ctrl Z</span><span>Undo</span>
      <span class="tc-help-key">⌘⇧Z / Ctrl Y</span><span>Redo</span>
      <span class="tc-help-key">← → hover slider</span><span>Nudge ±1</span>
      <span class="tc-help-key">⇧ + ← →</span><span>Nudge ±10</span>
      <span class="tc-help-key">↑ ↓ on handle</span><span>Axis ±1</span>
      <span class="tc-help-key">Esc</span><span>Close panel</span>
      <span class="tc-help-key">Dbl-click label</span><span>Reset to default</span>
    </div>
    <div class="tc-help-title" style="margin-top:8px">Inspector (Theme Studio)</div>
    <div class="tc-help-grid">
      <span class="tc-help-key">I</span><span>Toggle inspect mode</span>
      <span class="tc-help-key">Esc</span><span>Close popup / exit</span>
    </div>
    <button class="tc-btn" id="tc-help-close" style="margin-top:10px;width:100%">Close</button>
  </div>
</div>
<div id="tc-body">
  <div style="padding:8px 14px 4px">
    <div class="tc-section-label">Style axes — drag handle · drag polygon · click axis line · dbl-click label resets</div>
    <div id="tc-starburst-wrap">
      <div id="tc-axis-tip"></div>
      <svg id="tc-svg" viewBox="0 0 260 260" width="220" height="220"></svg>
    </div>
  </div>
  <div id="tc-accordion"></div>
  <div style="padding:8px 14px 4px">
    <div class="tc-section-label">Presets</div>
    <div class="tc-presets-grid" id="tc-presets"></div>
  </div>
  <div style="padding:4px 14px 8px">
    <div class="tc-section-label">History · hover preview · click jump · right-click revert</div>
    <div id="tc-hist-scroll"><div id="tc-hist-bar"></div></div>
  </div>
  <div id="tc-swatch"></div>
</div>
<div id="tc-footer">
  <button class="tc-btn" id="tc-reset">Reset</button>
  <button class="tc-btn" id="tc-save-preset">Save</button>
  <button class="tc-btn" id="tc-export">Export CSS</button>
  <label class="tc-btn" style="cursor:pointer">Import<input type="file" accept=".json" id="tc-import-file" style="display:none"></label>
  <span class="tc-spacer"></span>
  <button class="tc-btn primary" id="tc-apply-all">Apply All</button>
</div>
<div id="tc-prefs-bar">
  <span class="tc-prefs-lbl">Panel size</span>
  <button class="tc-ps-btn" data-ps="0.85" title="Compact">S</button>
  <button class="tc-ps-btn" data-ps="1" title="Default">M</button>
  <button class="tc-ps-btn" data-ps="1.2" title="Large">L</button>
  <button class="tc-ps-btn" data-ps="1.45" title="Extra large">XL</button>
</div>
`;
  document.body.appendChild(root);

  // ─── Starburst ─────────────────────────────────────────────────────────────
  const svg     = root.querySelector('#tc-svg');
  const axisTip = root.querySelector('#tc-axis-tip');
  let   axisValEls = {};

  function axisXY(ax,frac) {
    const a=rad(ax.deg);
    return [SVG_CX+frac*SVG_R*Math.cos(a), SVG_CY+frac*SVG_R*Math.sin(a)];
  }

  function buildStarburst() {
    svg.innerHTML=''; axisValEls={};
    // Guide rings
    [0.25,0.5,0.75,1].forEach(f => {
      const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points',AXES.map(ax=>axisXY(ax,f).join(',')).join(' '));
      poly.setAttribute('class','tc-axis-ring'); svg.appendChild(poly);
    });
    // Axes + hit areas + labels
    AXES.forEach(ax => {
      const [x1,y1]=axisXY(ax,0), [x2,y2]=axisXY(ax,1);

      // Visible line
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',x1); line.setAttribute('y1',y1);
      line.setAttribute('x2',x2); line.setAttribute('y2',y2);
      line.setAttribute('class','tc-axis-line'); svg.appendChild(line);

      // Wide transparent hit area for the full axis (click anywhere on line)
      const hit=document.createElementNS('http://www.w3.org/2000/svg','line');
      hit.setAttribute('x1',x1); hit.setAttribute('y1',y1);
      hit.setAttribute('x2',x2); hit.setAttribute('y2',y2);
      hit.setAttribute('class','tc-axis-hit'); hit.dataset.axis=ax.id;
      svg.appendChild(hit);

      // Outer label — single click shows value, dbl-click resets
      const [lx,ly]=axisXY(ax,1.18);
      const lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
      lbl.setAttribute('x',lx); lbl.setAttribute('y',ly);
      lbl.setAttribute('class','tc-axis-label outer'); lbl.dataset.axis=ax.id;
      lbl.textContent=ax.label;
      lbl.addEventListener('click', () => showAxisTip(ax, state.axes[ax.id]));
      lbl.addEventListener('dblclick', () => { state.axes[ax.id]=50; updateStarburst(); applyAndSync(); pushHistory(state); });
      svg.appendChild(lbl);

      // Inner neg label
      const [ix,iy]=axisXY(ax,-0.18);
      const neg=document.createElementNS('http://www.w3.org/2000/svg','text');
      neg.setAttribute('x',ix); neg.setAttribute('y',iy);
      neg.setAttribute('class','tc-axis-label'); neg.setAttribute('font-size','8');
      neg.textContent=ax.neg; svg.appendChild(neg);

      // Per-axis value (small, always visible near handle)
      const valT=document.createElementNS('http://www.w3.org/2000/svg','text');
      valT.setAttribute('class','tc-axis-val'); valT.dataset.axisval=ax.id;
      svg.appendChild(valT); axisValEls[ax.id]=valT;
    });

    // Polygon
    const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.id='tc-poly'; poly.setAttribute('class','tc-poly'); svg.appendChild(poly);

    // Handles (on top)
    AXES.forEach(ax => {
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('class','tc-handle'); c.setAttribute('data-axis',ax.id);
      c.setAttribute('tabindex','0'); c.setAttribute('role','slider'); c.setAttribute('aria-label',ax.label);
      svg.appendChild(c);
    });

    updateStarburst();
    attachStarburstDrag();
  }

  function showAxisTip(ax, val) {
    axisTip.textContent=`${ax.label}: ${val}`;
    axisTip.classList.add('visible');
    clearTimeout(axisTip._t);
    axisTip._t=setTimeout(()=>axisTip.classList.remove('visible'),1200);
  }

  function updateStarburst() {
    // Sync starburst accent to live theme (:root), overriding any panel lock
    const cs = getComputedStyle(document.documentElement);
    const wrap = root.querySelector('#tc-starburst-wrap');
    ['--accent','--acc-bg','--acc-hi'].forEach(v => {
      const val = cs.getPropertyValue(v).trim();
      if (val) wrap.style.setProperty(v, val);
    });

    const pts=AXES.map(ax=>axisXY(ax,state.axes[ax.id]/100));
    svg.querySelector('#tc-poly').setAttribute('points',pts.map(p=>p.join(',')).join(' '));
    svg.querySelectorAll('.tc-handle').forEach(h => {
      const ax=AXES.find(a=>a.id===h.dataset.axis);
      const [x,y]=axisXY(ax,state.axes[ax.id]/100);
      h.setAttribute('cx',x); h.setAttribute('cy',y);
      h.setAttribute('aria-valuenow',state.axes[ax.id]);
    });
    // Update per-axis value labels — offset slightly from handle toward outer
    AXES.forEach(ax => {
      const v=state.axes[ax.id];
      const frac=v/100;
      const [hx,hy]=axisXY(ax,frac);
      const [ox,oy]=axisXY(ax,frac+0.16);
      const el=axisValEls[ax.id]; if (!el) return;
      el.setAttribute('x',ox); el.setAttribute('y',oy);
      el.textContent=v;
    });
  }

  function projectToAxis(ax, mx, my) {
    const a=rad(ax.deg);
    const proj=dot(mx-SVG_CX,my-SVG_CY,Math.cos(a),Math.sin(a));
    return clamp(Math.round(proj/SVG_R*100),0,100);
  }

  function attachStarburstDrag() {
    let dragging   = null;   // axis id — single handle drag
    let freeOrigin = null;   // {mx,my,snapshot} — polygon freeform drag

    function svgCoords(e) {
      const rect = svg.getBoundingClientRect();
      return [(e.clientX - rect.left) * (260/rect.width),
              (e.clientY - rect.top)  * (260/rect.height)];
    }

    // ── Click on axis hit-line → snap that axis ──────────────────────────────
    svg.addEventListener('click', e => {
      const hit = e.target.closest('.tc-axis-hit');
      if (!hit || dragging || freeOrigin) return;
      const ax = AXES.find(a => a.id === hit.dataset.axis); if (!ax) return;
      const [mx,my] = svgCoords(e);
      state.axes[ax.id] = projectToAxis(ax, mx, my);
      updateStarburst(); applyAndSync(); pushHistory(state);
      showAxisTip(ax, state.axes[ax.id]);
    });

    // ── Pointerdown: handle drag OR polygon freeform ─────────────────────────
    svg.addEventListener('pointerdown', e => {
      const h    = e.target.closest('.tc-handle');
      const poly = e.target.closest('#tc-poly');

      if (h) {
        // Single-handle drag
        dragging = h.dataset.axis;
        h.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else if (poly) {
        // Freeform polygon drag — snapshot current axes, record start point
        const [mx,my] = svgCoords(e);
        freeOrigin = { mx, my, snapshot: { ...state.axes } };
        poly.setPointerCapture(e.pointerId);
        svg.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    // ── Pointermove ──────────────────────────────────────────────────────────
    svg.addEventListener('pointermove', e => {
      if (dragging) {
        // Single handle
        const ax = AXES.find(a => a.id === dragging);
        const [mx,my] = svgCoords(e);
        state.axes[dragging] = projectToAxis(ax, mx, my);
        updateStarburst(); applyAndSync();
        showAxisTip(ax, state.axes[dragging]);

      } else if (freeOrigin) {
        // Freeform: for each axis, project the drag delta onto that axis direction
        // and add it as a percentage of SVG_R
        const [mx,my] = svgCoords(e);
        const dx = mx - freeOrigin.mx;
        const dy = my - freeOrigin.my;
        AXES.forEach(ax => {
          const a    = rad(ax.deg);
          const proj = dot(dx, dy, Math.cos(a), Math.sin(a));
          const delta = proj / SVG_R * 100;
          state.axes[ax.id] = clamp(Math.round(freeOrigin.snapshot[ax.id] + delta), 0, 100);
        });
        updateStarburst(); applyAndSync();
        // Show aggregate tip
        axisTip.textContent = 'Moving shape…';
        axisTip.classList.add('visible');
      }
    });

    // ── Pointerup ────────────────────────────────────────────────────────────
    svg.addEventListener('pointerup', () => {
      if (dragging) {
        pushHistory(state); dragging = null;
        clearTimeout(axisTip._t);
        axisTip._t = setTimeout(() => axisTip.classList.remove('visible'), 600);
      }
      if (freeOrigin) {
        pushHistory(state); freeOrigin = null;
        svg.style.cursor = '';
        clearTimeout(axisTip._t);
        axisTip._t = setTimeout(() => axisTip.classList.remove('visible'), 600);
      }
    });
    svg.addEventListener('pointercancel', () => { dragging = null; freeOrigin = null; svg.style.cursor = ''; });

    // ── Keyboard on handles ──────────────────────────────────────────────────
    svg.querySelectorAll('.tc-handle').forEach(h => {
      h.addEventListener('keydown', e => {
        const id = h.dataset.axis, delta = e.shiftKey ? 10 : 1;
        if      (e.key==='ArrowUp'  || e.key==='ArrowRight') state.axes[id] = clamp(state.axes[id]+delta, 0, 100);
        else if (e.key==='ArrowDown'|| e.key==='ArrowLeft')  state.axes[id] = clamp(state.axes[id]-delta, 0, 100);
        else if (e.key==='Home') state.axes[id] = 0;
        else if (e.key==='End')  state.axes[id] = 100;
        else return;
        updateStarburst(); applyAndSync(); pushHistory(state);
      });
    });
  }

  // ─── Accordion ─────────────────────────────────────────────────────────────
  const accDiv = root.querySelector('#tc-accordion');
  const ACC_SECTIONS = [
    { id:'type',     label:'Typography' },
    { id:'color',    label:'Color & Harmony' },
    { id:'surfaces', label:'Surfaces & Glass' },
    { id:'layout',   label:'Layout' },
    { id:'vibe',     label:'Vibe' },
  ];
  const accOpen = new Set(['type','color']); // open by default
  const accBuilt = new Set();

  function updateSliderDisplay(sl, input, valEl) {
    const v = state.sliders[sl.id];
    const pct = ((v - sl.min) / (sl.max - sl.min) * 100).toFixed(1);
    input.style.setProperty('--pct', pct + '%');
    if      (sl.id === 'hue')         { input.style.setProperty('--hue-h', v); valEl.textContent = v + '°'; }
    else if (sl.id === 'scale')        valEl.textContent = v + '%';
    else if (sl.id === 'ctrlScale')    valEl.textContent = v + '%';
    else if (sl.id === 'colors')       valEl.textContent = v;
    else if (sl.id === 'accHueSplit')  valEl.textContent = v + '°';
    else if (sl.id === 'bgHue')        valEl.textContent = (v >= 0 ? '+' : '') + v + '°';
    else if (sl.id === 'weight')       valEl.textContent = Math.round(lerp(300,800,v/100)/100)*100;
    else                               valEl.textContent = Math.round(pct) + '%';
  }

  function makeSliderRow(sl) {
    const row = document.createElement('div'); row.className = 'tc-slider-row';
    const label = document.createElement('div'); label.className = 'tc-slider-label'; label.textContent = sl.label;
    label.title = 'Dbl-click to reset · hover + ← → to nudge';
    label.addEventListener('dblclick', () => { state.sliders[sl.id] = sl.def; updateAccSliders(); applyAndSync(); pushHistory(state); });
    const wrap = document.createElement('div'); wrap.className = 'tc-range-wrap';
    if (sl.lo || sl.hi) { const ends = document.createElement('div'); ends.className = 'tc-slider-ends'; ends.innerHTML = `<span>${sl.lo}</span><span>${sl.hi}</span>`; wrap.appendChild(ends); }
    const input = document.createElement('input'); input.type = 'range'; input.min = sl.min; input.max = sl.max; input.step = 1;
    input.className = 'tc-range' + (sl.id === 'hue' ? ' hue-range' : ''); input.dataset.sid = sl.id;
    wrap.appendChild(input);
    const val = document.createElement('div'); val.className = 'tc-slider-val'; val.dataset.sid = sl.id;
    row.appendChild(label); row.appendChild(wrap); row.appendChild(val);
    input.value = state.sliders[sl.id]; updateSliderDisplay(sl, input, val);
    input.addEventListener('input', () => { state.sliders[sl.id] = Number(input.value); updateSliderDisplay(sl, input, val); applyAndSync(); });
    input.addEventListener('change', () => pushHistory(state));
    // Prevent panel scroll while dragging slider
    input.addEventListener('pointerdown', e => { input.setPointerCapture(e.pointerId); });
    input.addEventListener('pointermove', e => { if (e.buttons) e.preventDefault(); });
    return row;
  }

  function addSubLabel(container, text) {
    const d = document.createElement('div'); d.className = 'tc-sub-lbl'; d.textContent = text;
    container.appendChild(d);
  }

  function addSliders(container, ids) {
    ids.forEach(id => { const sl = SLIDERS.find(s => s.id === id); if (sl) container.appendChild(makeSliderRow(sl)); });
  }

  // ── Type section ────────────────────────────────────────────────────────────
  function buildTypeSection(c) {
    const picks = document.createElement('div'); picks.className = 'tc-font-picks';
    FONT_PRESETS.forEach((fp, i) => {
      const btn = document.createElement('button'); btn.className = 'tc-font-pill'; btn.textContent = fp.label;
      if (fp.family) btn.style.fontFamily = fp.family;
      if ((state.sliders.fontPreset ?? 0) === i) btn.classList.add('active');
      btn.addEventListener('click', () => {
        state.sliders.fontPreset = i;
        picks.querySelectorAll('.tc-font-pill').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        customRow.classList.toggle('visible', i === FONT_PRESETS.length - 1);
        applyAndSync(); pushHistory(state);
      });
      picks.appendChild(btn);
    });
    c.appendChild(picks);
    const customRow = document.createElement('div'); customRow.id = 'tc-custom-font-row';
    if ((state.sliders.fontPreset ?? 0) === FONT_PRESETS.length - 1) customRow.classList.add('visible');
    const customIn = document.createElement('input'); customIn.type = 'text'; customIn.id = 'tc-custom-font';
    customIn.placeholder = 'e.g. "Inter", sans-serif'; customIn.value = state.customFont || '';
    customIn.addEventListener('input', () => { state.customFont = customIn.value; applyAndSync(); });
    customRow.appendChild(customIn); c.appendChild(customRow);
    addSubLabel(c, 'Scale & Spacing'); addSliders(c, ['scale','weight','leading','tracking']);
    addSubLabel(c, 'Headings');       addSliders(c, ['hRatio','h2Ratio','h1Leading','h2Leading']);
    addSubLabel(c, 'Opacity');        addSliders(c, ['txOpacity','muOpacity']);
  }

  // ── Color section ───────────────────────────────────────────────────────────
  const COLOR_TOKENS = [
    { key:'--bg',        label:'Background', get: t => t.bg },
    { key:'--surface',   label:'Surface',    get: t => t.surface },
    { key:'--surface-2', label:'Inputs / S2',get: t => t.surf2 },
    { key:'--border',    label:'Border',     get: t => t.border },
    { key:'--border-2',  label:'Input border',get:t => t.border2 },
    { key:'--deep',      label:'Deep',       get: t => t.deep },
    { key:'--hi',        label:'Heading',    get: t => t.hi },
    { key:'--text',      label:'Body text',  get: t => t.text },
    { key:'--muted',     label:'Muted',      get: t => t.muted },
    { key:'--accent',    label:'Accent',     get: t => t.accent },
    { key:'--acc-bg',    label:'Accent BG',  get: t => t.accBg },
    { key:'--acc-hi',    label:'Accent Hi',  get: t => t.accHi },
    { key:'--accent-2',  label:'Accent 2',   get: t => t.split2 },
  ];

  const HARMONY_PRESETS = [
    { label:'Mono',    split:0,   n:1, title:'Single hue' },
    { label:'Analog',  split:30,  n:2, title:'Adjacent hues (~30°)' },
    { label:'Compl.',  split:180, n:2, title:'Opposite hues (180°)' },
    { label:'Split',   split:150, n:3, title:'Split-complementary (150°)' },
    { label:'Triadic', split:120, n:3, title:'Three equal hues (120°)' },
    { label:'Tetra',   split:90,  n:4, title:'Four hues (90° each)' },
  ];

  function buildColorSection(c) {
    // Harmony wheel
    const hwWrap = document.createElement('div'); hwWrap.className = 'tc-hw-wrap';
    const ring = document.createElement('div'); ring.className = 'tc-hw-ring'; ring.id = 'tc-hw-ring';
    const hole = document.createElement('div'); hole.className = 'tc-hw-hole'; ring.appendChild(hole);
    // Ghost dot (wayfinding — shown when hovering a token row)
    const ghost = document.createElement('div'); ghost.id = 'tc-hw-ghost'; ring.appendChild(ghost);
    ['tc-hw-bg','tc-hw-acc','tc-hw-spl'].forEach(id => {
      const dot = document.createElement('div'); dot.className = 'tc-hw-dot'; dot.id = id; ring.appendChild(dot);
    });
    const legend = document.createElement('div'); legend.className = 'tc-hw-legend';
    [['BG','tc-hw-bg'],['Accent','tc-hw-acc'],['Split','tc-hw-spl']].forEach(([name, id]) => {
      const item = document.createElement('div'); item.className = 'tc-hw-legend-item';
      const ldot = document.createElement('div'); ldot.className = 'tc-hw-legend-dot'; ldot.id = id + '-l';
      const lbl  = document.createElement('span'); lbl.className = 'tc-hw-legend-lbl'; lbl.textContent = name;
      const hex  = document.createElement('span'); hex.className = 'tc-hw-legend-hex'; hex.id = id + '-h';
      item.appendChild(ldot); item.appendChild(lbl); item.appendChild(hex); legend.appendChild(item);
    });
    hwWrap.appendChild(ring); hwWrap.appendChild(legend); c.appendChild(hwWrap);

    // Harmony suggestion chips
    buildHarmonySuggestions(c);

    addSliders(c, ['hue','accSat','accHueSplit','popAccent']);
    addSubLabel(c, 'Individual Colors — hover to locate on wheel · lock to pin');
    const tokenContainer = document.createElement('div'); tokenContainer.id = 'tc-color-tokens';
    COLOR_TOKENS.forEach(tk => tokenContainer.appendChild(makeTokenRow(tk)));
    c.appendChild(tokenContainer);
    updateHarmonyWheel();
  }

  function buildHarmonySuggestions(c) {
    const wrap = document.createElement('div'); wrap.className = 'tc-harm-sugg';
    HARMONY_PRESETS.forEach(hp => {
      const chip = document.createElement('button'); chip.className = 'tc-harm-chip'; chip.title = hp.title;
      const dotsDiv = document.createElement('div'); dotsDiv.className = 'tc-harm-dots tc-harm-chip-dots';
      const lbl = document.createElement('div'); lbl.className = 'tc-harm-lbl'; lbl.textContent = hp.label;
      chip.appendChild(dotsDiv); chip.appendChild(lbl);
      chip.addEventListener('click', () => {
        state.sliders.accHueSplit = hp.split; state.sliders.colors = hp.n;
        updateAccSliders(); applyAndSync(); pushHistory(state);
        refreshHarmonyChips();
      });
      wrap.appendChild(chip);
    });
    c.appendChild(wrap);
    refreshHarmonyChips();
  }

  function refreshHarmonyChips() {
    const baseHue = state.sliders.hue ?? 217;
    const sat = state.sliders.accSat ?? 70;
    const curSplit = state.sliders.accHueSplit ?? 0;
    root.querySelectorAll('.tc-harm-chip').forEach((chip, i) => {
      const hp = HARMONY_PRESETS[i]; if (!hp) return;
      // Color the dots using current hue + split offsets
      const dotsDiv = chip.querySelector('.tc-harm-chip-dots');
      if (dotsDiv) {
        dotsDiv.innerHTML = '';
        const offsets = hp.n === 1 ? [0] : hp.n === 2 ? [0, hp.split] : [0, hp.split/2, hp.split];
        offsets.forEach(offset => {
          const d = document.createElement('div'); d.className = 'tc-harm-dot';
          d.style.background = `hsl(${((baseHue + offset) % 360 + 360) % 360},${sat}%,55%)`;
          dotsDiv.appendChild(d);
        });
      }
      chip.classList.toggle('active', Math.round(curSplit) === hp.split);
    });
  }

  // Show a ghost dot on the harmony wheel at the given hue (for token hover wayfinding)
  function updateHarmonyGhost(hue) {
    const g = root.querySelector('#tc-hw-ghost'); if (!g) return;
    const R = 27, CX = 36, CY = 36;
    const a = hue * Math.PI / 180 - Math.PI / 2;
    g.style.left = (CX + R * Math.cos(a)) + 'px';
    g.style.top  = (CY + R * Math.sin(a)) + 'px';
    g.style.display = 'block';
  }
  function clearHarmonyGhost() {
    const g = root.querySelector('#tc-hw-ghost'); if (g) g.style.display = 'none';
  }

  // hex → {h,s,l} (h: 0-360, s: 0-100, l: 0-100)
  function hexToHSL(hex) {
    const h6 = hex.replace('#','').padEnd(6,'0');
    let r = parseInt(h6.slice(0,2),16)/255, g = parseInt(h6.slice(2,4),16)/255, b = parseInt(h6.slice(4,6),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
    const l = (max+min)/2;
    const s = d === 0 ? 0 : d/(1-Math.abs(2*l-1));
    let hue = 0;
    if (d) { hue = max===r ? ((g-b)/d+6)%6 : max===g ? (b-r)/d+2 : (r-g)/d+4; hue *= 60; }
    return { h: Math.round(hue), s: Math.round(s*100), l: Math.round(l*100) };
  }
  // {h,s,l} → hex
  function hslObjToHex(h,s,l) { return hslToHex(`hsl(${h},${s}%,${l}%)`); }

  function makeTokenRow(tk) {
    const t = computeTheme(state);
    const computed = tk.get(t);
    const ov = (state.colorOverrides || {})[tk.key];
    const hexVal = hslToHex(ov || computed);

    const wrap = document.createElement('div'); wrap.dataset.tkWrap = tk.key;
    const row  = document.createElement('div'); row.className = 'tc-color-token'; row.dataset.tkKey = tk.key;

    // Swatch chip — click toggles inline picker, no system picker
    const chip = document.createElement('div'); chip.className = 'tc-token-chip'; chip.title = 'Click to edit';
    chip.style.background = hexVal;

    row.addEventListener('mouseenter', () => updateHarmonyGhost(hexToHue(hexVal)));
    row.addEventListener('mouseleave', clearHarmonyGhost);

    const name   = document.createElement('div'); name.className = 'tc-token-name'; name.textContent = tk.label;
    const hexInp = document.createElement('input'); hexInp.type = 'text';
    hexInp.className = 'tc-token-hex' + (ov ? ' ov' : '');
    hexInp.value = hexVal; hexInp.placeholder = '#rrggbb';
    const lockBtn = document.createElement('button');
    lockBtn.className = 'tc-token-lock' + (ov ? ' locked' : '');
    lockBtn.textContent = ov ? '🔒' : '○';
    lockBtn.title = ov ? 'Unlock (restore computed)' : 'Lock this color';

    // ── Combined wheel + H/S/L panel ──────────────────────────────────────────
    const hslPanel = document.createElement('div'); hslPanel.className = 'tc-token-hsl';
    let _hsl = hexToHSL(hexVal); // live working copy {h,s,l}

    // Left col — wheel
    const wheelCol  = document.createElement('div'); wheelCol.className = 'tc-hsl-wheel-col';
    const wheel     = document.createElement('div'); wheel.className = 'tc-hsl-wheel';
    const cursor    = document.createElement('div'); cursor.className = 'tc-hsl-wheel-cursor';
    wheel.appendChild(cursor);
    // Lightness strip below wheel
    const lSlider = document.createElement('input'); lSlider.type = 'range';
    lSlider.min = 0; lSlider.max = 100; lSlider.className = 'tc-hsl-lightness';
    lSlider.addEventListener('pointerdown', e => lSlider.setPointerCapture(e.pointerId));
    lSlider.addEventListener('pointermove', e => { if (e.buttons) e.preventDefault(); });
    wheelCol.appendChild(wheel); wheelCol.appendChild(lSlider);

    // Right col — H/S/L sliders
    const slidersCol = document.createElement('div'); slidersCol.className = 'tc-hsl-sliders-col';
    const slDefs = [
      { lbl:'H', key:'h', min:0, max:360, cls:'h-range' },
      { lbl:'S', key:'s', min:0, max:100, cls:'' },
      { lbl:'L', key:'l', min:0, max:100, cls:'' },
    ];
    const slEls = {}; // key → {sl, num}
    slDefs.forEach(d => {
      const r = document.createElement('div'); r.className = 'tc-hsl-row';
      const lbl = document.createElement('div'); lbl.className = 'tc-hsl-lbl'; lbl.textContent = d.lbl;
      const sl  = document.createElement('input'); sl.type = 'range'; sl.min = d.min; sl.max = d.max;
      sl.value = _hsl[d.key]; sl.className = 'tc-hsl-range ' + d.cls;
      sl.addEventListener('pointerdown', e => sl.setPointerCapture(e.pointerId));
      sl.addEventListener('pointermove', e => { if (e.buttons) e.preventDefault(); });
      const num = document.createElement('div'); num.className = 'tc-hsl-val'; num.textContent = _hsl[d.key];
      r.appendChild(lbl); r.appendChild(sl); r.appendChild(num);
      slidersCol.appendChild(r); slEls[d.key] = { sl, num };
    });

    hslPanel.appendChild(wheelCol); hslPanel.appendChild(slidersCol);

    // ── Sync all picker UI from _hsl ──────────────────────────────────────────
    function syncPickerUI() {
      const { h, s, l } = _hsl;
      // Update sliders
      slDefs.forEach(d => { slEls[d.key].sl.value = _hsl[d.key]; slEls[d.key].num.textContent = _hsl[d.key]; });
      // S track
      slEls.s.sl.style.background = `linear-gradient(to right,hsl(${h},0%,${l}%),hsl(${h},100%,${l}%))`;
      // L track
      slEls.l.sl.style.background = `linear-gradient(to right,hsl(${h},${s}%,5%),hsl(${h},${s}%,50%),hsl(${h},${s}%,95%))`;
      // Wheel cursor: hue = angle, saturation = radius
      const R = 24, cx = 24, cy = 24;
      const a = (h - 90) * Math.PI / 180;
      const r = (s / 100) * R;
      cursor.style.left = (cx + r * Math.cos(a)) + 'px';
      cursor.style.top  = (cy + r * Math.sin(a)) + 'px';
      cursor.style.background = hslObjToHex(h, s, l);
      // Wheel overlay darkens/lightens based on L
      wheel.style.filter = l < 40 ? `brightness(${0.3 + l/40*0.7})` : l > 60 ? `brightness(${1 + (l-60)/40*0.5})` : '';
      // Lightness strip
      lSlider.value = l;
      lSlider.style.background = `linear-gradient(to right,hsl(${h},${s}%,5%),hsl(${h},${s}%,50%),hsl(${h},${s}%,95%))`;
      // Chip + hex
      const hex = hslObjToHex(h, s, l);
      chip.style.background = hex; chip.classList.toggle('open', hslPanel.classList.contains('open'));
      hexInp.value = hex;
    }

    function applyHSL(pushHist) {
      const hex = hslObjToHex(_hsl.h, _hsl.s, _hsl.l);
      pin(hex);
      syncPickerUI();
      if (pushHist) pushHistory(state);
    }

    // Wheel click/drag: angle → hue, radius → saturation
    function wheelEvent(e) {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.width/2, cy = rect.height/2;
      const dx = e.clientX - rect.left - cx, dy = e.clientY - rect.top - cy;
      const R = Math.min(cx, cy);
      _hsl.h = Math.round(((Math.atan2(dy, dx) * 180/Math.PI) + 90 + 360) % 360);
      _hsl.s = Math.round(Math.min(100, Math.sqrt(dx*dx+dy*dy)/R*100));
      applyHSL(false);
    }
    wheel.addEventListener('pointerdown', e => { wheel.setPointerCapture(e.pointerId); wheelEvent(e); });
    wheel.addEventListener('pointermove', e => { if (e.buttons) { e.preventDefault(); wheelEvent(e); } });
    wheel.addEventListener('pointerup', () => pushHistory(state));

    // Lightness strip
    lSlider.addEventListener('input', () => { _hsl.l = Number(lSlider.value); applyHSL(false); });
    lSlider.addEventListener('change', () => pushHistory(state));
    lSlider.addEventListener('wheel', e => { e.preventDefault(); _hsl.l = clamp(_hsl.l+(e.deltaY<0?1:-1),0,100); applyHSL(false); pushHistory(state); }, {passive:false});

    // H/S/L sliders
    slDefs.forEach(d => {
      const { sl } = slEls[d.key];
      sl.addEventListener('input', () => { _hsl[d.key] = Number(sl.value); applyHSL(false); });
      sl.addEventListener('change', () => pushHistory(state));
      sl.addEventListener('wheel', e => { e.preventDefault(); _hsl[d.key]=clamp(_hsl[d.key]+(e.deltaY<0?1:-1),d.min,d.max); applyHSL(false); pushHistory(state); }, {passive:false});
    });

    // ── Chip click → toggle panel ─────────────────────────────────────────────
    chip.addEventListener('click', () => {
      const isOpen = hslPanel.classList.toggle('open');
      chip.classList.toggle('open', isOpen);
      if (isOpen) { _hsl = hexToHSL(hexInp.value || hexVal); syncPickerUI(); }
    });

    function pin(hex) {
      if (!state.colorOverrides) state.colorOverrides = {};
      state.colorOverrides[tk.key] = hex;
      hexInp.classList.add('ov'); lockBtn.classList.add('locked'); lockBtn.textContent = '🔒';
      applyAndSync();
    }
    function unpin() {
      if (state.colorOverrides) delete state.colorOverrides[tk.key];
      hexInp.classList.remove('ov'); lockBtn.classList.remove('locked'); lockBtn.textContent = '○';
      const newHex = hslToHex(tk.get(computeTheme(state)));
      _hsl = hexToHSL(newHex); syncPickerUI(); applyAndSync();
    }
    hexInp.addEventListener('change', () => {
      let v = hexInp.value.trim();
      if (/^#?[0-9a-fA-F]{3,6}$/.test(v)) {
        if (!v.startsWith('#')) v = '#'+v;
        _hsl = hexToHSL(v); applyHSL(true);
      }
    });
    lockBtn.addEventListener('click', () => lockBtn.classList.contains('locked') ? unpin() : pin(hexInp.value || hexVal));

    row.appendChild(chip); row.appendChild(name); row.appendChild(hexInp); row.appendChild(lockBtn);
    wrap.appendChild(row); wrap.appendChild(hslPanel);
    // Initial UI sync
    syncPickerUI();
    return wrap;
  }

  function updateHarmonyWheel() {
    const ring = root.querySelector('#tc-hw-ring'); if (!ring) return;
    const t = computeTheme(state);
    const R = 27, CX = 36, CY = 36;
    function hueOf(hslStr) { const m = hslStr.match(/hsla?\((\d+)/); return m ? parseInt(m[1]) : 0; }
    [['tc-hw-bg', t.bg], ['tc-hw-acc', t.accent], ['tc-hw-spl', t.split2]].forEach(([id, color]) => {
      const dot = ring.querySelector('#' + id); if (!dot) return;
      const a = hueOf(color) * Math.PI / 180 - Math.PI / 2;
      dot.style.left = (CX + R * Math.cos(a)) + 'px';
      dot.style.top  = (CY + R * Math.sin(a)) + 'px';
      dot.style.background = color;
      const ldot = root.querySelector('#' + id + '-l'); if (ldot) ldot.style.background = color;
      const lhex = root.querySelector('#' + id + '-h'); if (lhex) lhex.textContent = hslToHex(color);
    });
    // Update the hole to match panel surface
    const hole = ring.querySelector('.tc-hw-hole'); if (hole) hole.style.background = 'var(--surface-2,#1a2035)';
  }

  function updateColorTokens() {
    const t = computeTheme(state);
    root.querySelectorAll('.tc-color-token').forEach(row => {
      const tk = COLOR_TOKENS.find(tk => tk.key === row.dataset.tkKey); if (!tk) return;
      const ov = (state.colorOverrides || {})[tk.key];
      if (!ov) {
        const hex = hslToHex(tk.get(t));
        // chip is now a div — set background
        const chip = row.querySelector('.tc-token-chip'); if (chip) chip.style.background = hex;
        const hexInp = row.querySelector('.tc-token-hex'); if (hexInp && document.activeElement !== hexInp) hexInp.value = hex;
        const hring = row.querySelector('[data-hue-ring]');
        if (hring) {
          const dot = hring.querySelector('.tc-token-hue-dot');
          if (dot) { const a=(hexToHue(hex)-90)*Math.PI/180, R=5; dot.style.left=(8+R*Math.cos(a)-2)+'px'; dot.style.top=(8+R*Math.sin(a)-2)+'px'; }
          hring.title = `Hue ≈ ${Math.round(hexToHue(hex))}°`;
        }
      }
    });
    refreshHarmonyChips();
  }

  // ── Surfaces section ────────────────────────────────────────────────────────
  function buildSurfacesSection(c) {
    addSubLabel(c, 'Transparency & Glass');
    addSliders(c, ['surfaceAlpha','glassBlur']);
    addSubLabel(c, 'Tint & Depth');
    addSliders(c, ['tint','sfSep','sfSat','bgSat','bgHue']);
  }

  // ── Layout section ──────────────────────────────────────────────────────────
  function buildLayoutSection(c) {
    addSliders(c, ['radius','border','density','shadow','motion','iconScale','ctrlScale']);
  }

  // ── Vibe section ────────────────────────────────────────────────────────────
  function buildVibeSection(c) {
    addSliders(c, ['organic','polish','energy']);
  }

  const ACC_BUILDERS = { type:buildTypeSection, color:buildColorSection, surfaces:buildSurfacesSection, layout:buildLayoutSection, vibe:buildVibeSection };

  function buildAccordion() {
    accDiv.innerHTML = ''; accBuilt.clear();
    ACC_SECTIONS.forEach(sec => {
      const hd = document.createElement('div'); hd.className = 'tc-acc-hd' + (accOpen.has(sec.id) ? ' open' : '');
      hd.innerHTML = `<span>${sec.label}</span><span class="tc-acc-arrow">▶</span>`;
      const body = document.createElement('div'); body.className = 'tc-acc-body'; body.id = 'tc-acc-' + sec.id;
      if (accOpen.has(sec.id)) { ACC_BUILDERS[sec.id](body); accBuilt.add(sec.id); body.style.display = 'block'; }
      hd.addEventListener('click', () => {
        const wasOpen = accOpen.has(sec.id);
        accOpen[wasOpen ? 'delete' : 'add'](sec.id);
        hd.classList.toggle('open', !wasOpen);
        body.style.display = wasOpen ? 'none' : 'block';
        if (!wasOpen && !accBuilt.has(sec.id)) { ACC_BUILDERS[sec.id](body); accBuilt.add(sec.id); }
        if (!wasOpen && sec.id === 'color') updateHarmonyWheel();
      });
      accDiv.appendChild(hd); accDiv.appendChild(body);
    });
  }

  function updateAccSliders() {
    // Save scroll position — setting input.value can trigger browser scroll-into-view.
    // Also capture the outer scroll container (e.g. #ctrl-col in theme-studio) in case
    // #tc-body is not the actual scrolling element in the host layout.
    const tcBody = root.querySelector('#tc-body');
    // Walk up from tc-root to find the nearest scrollable host container
    // (e.g. #ctrl-col in theme-studio.html, which has overflow-y:auto via CSS)
    let outerScroll = null;
    let el = root.parentElement;
    while (el && el !== document.body) {
      const ov = getComputedStyle(el).overflowY;
      if (ov === 'auto' || ov === 'scroll') { outerScroll = el; break; }
      el = el.parentElement;
    }
    const savedScroll      = tcBody      ? tcBody.scrollTop      : 0;
    const savedOuterScroll = outerScroll ? outerScroll.scrollTop : 0;
    root.querySelectorAll('input.tc-range[data-sid]').forEach(input => {
      const sl = SLIDERS.find(s => s.id === input.dataset.sid); if (!sl) return;
      if (input.offsetParent === null) return; // skip hidden accordion bodies
      const valEl = input.closest('.tc-slider-row')?.querySelector('.tc-slider-val');
      input.value = state.sliders[sl.id]; if (valEl) updateSliderDisplay(sl, input, valEl);
    });
    // Restore synchronously and again in the next frame to catch any async scroll-into-view
    // triggered by updateHistBar's scrollIntoView call that runs in requestAnimationFrame.
    if (tcBody)      tcBody.scrollTop      = savedScroll;
    if (outerScroll) outerScroll.scrollTop = savedOuterScroll;
    requestAnimationFrame(() => {
      if (tcBody)      tcBody.scrollTop      = savedScroll;
      if (outerScroll) outerScroll.scrollTop = savedOuterScroll;
    });
    // Update font picker active state
    root.querySelectorAll('.tc-font-pill').forEach((btn, i) => btn.classList.toggle('active', (state.sliders.fontPreset ?? 0) === i));
    // Update color tokens and harmony wheel
    updateColorTokens(); updateHarmonyWheel();
  }

  // ─── Presets ───────────────────────────────────────────────────────────────
  const presetsDiv=root.querySelector('#tc-presets');

  function buildPresets() {
    presetsDiv.innerHTML='';
    const all={...BUILTIN_PRESETS,...userPresets};
    Object.entries(all).forEach(([name,preset])=>{
      const isUser=!!userPresets[name];
      const pill=document.createElement('button');
      pill.className='tc-preset-pill'+(isUser?' user':''); pill.dataset.name=name;
      pill.innerHTML=name+(isUser?`<span class="tc-del" data-del="${name}">×</span>`:'');
      pill.addEventListener('click',e=>{
        if (e.target.dataset.del) { delete userPresets[e.target.dataset.del]; saveUserPresets(); buildPresets(); return; }
        state=ensureDefaults(deepClone(all[name])); pushHistory(state); applyAndSync();
      });
      presetsDiv.appendChild(pill);
    });
    updatePresetHighlight();
  }

  function updatePresetHighlight() {
    const all={...BUILTIN_PRESETS,...userPresets}; let anyMatch=false;
    presetsDiv.querySelectorAll('.tc-preset-pill').forEach(p=>{
      const m=all[p.dataset.name]&&deepEq(all[p.dataset.name],state);
      p.classList.toggle('active',m); if (m) anyMatch=true;
    });
    root.querySelector('#tc-unsaved').classList.toggle('visible',!anyMatch);
  }

  // ─── History ───────────────────────────────────────────────────────────────
  const histBar=root.querySelector('#tc-hist-bar');
  const histScroll=root.querySelector('#tc-hist-scroll');

  // Fixed preview card — appended to body so it's never clipped
  let histPreview = document.getElementById('tc-hist-preview');
  if (!histPreview) {
    histPreview = document.createElement('div');
    histPreview.id = 'tc-hist-preview';
    document.body.appendChild(histPreview);
  }

  function showHistPreview(snap, majorIdx, minorIdx, anchorEl) {
    const t = computeTheme(snap);
    const accentHex = hslToHex(t.accent);
    const label = histLabel(snap);
    histPreview.innerHTML = '';
    const sw = document.createElement('div'); sw.className = 'tc-hist-swatch';
    [t.bg,t.surface,t.surf2,t.text,t.muted,t.accent,t.accBg,t.accHi].forEach(c=>{
      const s=document.createElement('span'); s.style.cssText=`flex:1;background:${c};height:100%`; sw.appendChild(s);
    });
    histPreview.appendChild(sw);
    if (label) { const nm=document.createElement('div'); nm.className='tc-hist-name'; nm.textContent=label; histPreview.appendChild(nm); }
    const axGrid=document.createElement('div'); axGrid.className='tc-hist-axes';
    AXES.forEach(ax=>{ const r=document.createElement('div'); r.className='tc-hist-ax'; r.innerHTML=`${ax.label}<span>${snap.axes[ax.id]}</span>`; axGrid.appendChild(r); });
    histPreview.appendChild(axGrid);
    const stepLbl = minorIdx != null ? `major ${majorIdx+1}, tweak ${minorIdx+1}` : `step ${majorIdx+1} of ${history.length}`;
    const st=document.createElement('div'); st.className='tc-hist-step'; st.textContent=stepLbl; histPreview.appendChild(st);
    // Position above the anchor element
    const rect = anchorEl.getBoundingClientRect();
    const pw = 140, ph = 100;
    let left = rect.left + rect.width/2 - pw/2;
    let top  = rect.top - ph - 8;
    if (left < 6) left = 6;
    if (left + pw > window.innerWidth - 6) left = window.innerWidth - pw - 6;
    if (top < 6) top = rect.bottom + 8;
    histPreview.style.left = left + 'px';
    histPreview.style.top  = top  + 'px';
    histPreview.classList.add('visible');
    // Tint preview border with accent color
    histPreview.style.borderColor = accentHex + '60';
  }
  function hideHistPreview() { histPreview.classList.remove('visible'); }

  function updateHistBar() {
    histBar.innerHTML='';
    history.forEach((entry, i) => {
      const snap  = entry.state;
      const t     = computeTheme(snap);
      const accentHex = hslToHex(t.accent);

      const wrap = document.createElement('div');
      wrap.className = 'tc-hist-major' + (i===histIdx?' cur':'');

      const dot = document.createElement('div');
      dot.className = 'tc-hist-major-dot';
      dot.style.background = accentHex;

      // Minor dots
      const minorRow = document.createElement('div'); minorRow.className='tc-hist-minors';
      (entry.minors||[]).forEach((msnap, mi) => {
        const mt = computeTheme(msnap);
        const md = document.createElement('div'); md.className='tc-hist-minor-dot';
        md.style.background = hslToHex(mt.accent);
        md.addEventListener('mouseenter', () => showHistPreview(msnap, i, mi, md));
        md.addEventListener('mouseleave', hideHistPreview);
        md.addEventListener('click', e => { e.stopPropagation(); histIdx=i; state=deepClone(msnap); applyAndSync(false); hideHistPreview(); });
        minorRow.appendChild(md);
      });

      dot.addEventListener('mouseenter', () => showHistPreview(snap, i, null, dot));
      dot.addEventListener('mouseleave', hideHistPreview);
      wrap.addEventListener('click', () => { histIdx=i; state=deepClone(snap); applyAndSync(false); hideHistPreview(); });
      wrap.addEventListener('contextmenu', e => { e.preventDefault(); state=deepClone(snap); pushHistory(state); applyAndSync(false); });

      wrap.appendChild(dot);
      if (minorRow.children.length) wrap.appendChild(minorRow);
      histBar.appendChild(wrap);
    });
    requestAnimationFrame(()=>{
      const cur=histBar.querySelector('.cur');
      if (cur) cur.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
    });
  }

  // ─── Swatch ────────────────────────────────────────────────────────────────
  const swatchDiv=root.querySelector('#tc-swatch');
  function updateSwatch() {
    const t=computeTheme(state);
    const cols=[t.bg,t.surface,t.surf2,t.text,t.muted,t.accent,t.accBg,t.accHi];
    swatchDiv.innerHTML=cols.map(c=>`<span style="background:${c}"></span>`).join('');
  }

  // ─── syncUI ────────────────────────────────────────────────────────────────
  function syncUI() { updateStarburst(); updateAccSliders(); updatePresetHighlight(); updateHistBar(); updateSwatch(); }

  // ─── Dock / drag ──────────────────────────────────────────────────────────
  let dockMode='float';
  function setDock(mode) {
    dockMode=mode; root.classList.remove('dock-right','dock-bottom');
    if (mode==='right')  root.classList.add('dock-right');
    if (mode==='bottom') root.classList.add('dock-bottom');
    if (mode==='float')  { root.style.bottom='76px'; root.style.right='22px'; root.style.top=''; root.style.left=''; }
    root.querySelector('#tc-dock-float').classList.toggle('active',  mode==='float');
    root.querySelector('#tc-dock-right').classList.toggle('active',  mode==='right');
    root.querySelector('#tc-dock-bottom').classList.toggle('active', mode==='bottom');
  }
  const header=root.querySelector('#tc-header');
  let dp=false,dox=0,doy=0;
  header.addEventListener('pointerdown',e=>{ if (dockMode!=='float'||e.target.tagName==='BUTTON') return; dp=true; header.setPointerCapture(e.pointerId); const r=root.getBoundingClientRect(); dox=e.clientX-r.left; doy=e.clientY-r.top; root.style.bottom='auto'; root.style.right='auto'; });
  document.addEventListener('pointermove',e=>{ if (!dp) return; root.style.left=(e.clientX-dox)+'px'; root.style.top=(e.clientY-doy)+'px'; });
  document.addEventListener('pointerup',()=>{ dp=false; });

  // ─── Mobile swipe-to-dismiss ───────────────────────────────────────────────
  (function() {
    const pill = root.querySelector('#tc-sheet-pill');
    if (!pill) return;
    let sy = 0, dragging = false;
    function isMobile() { return window.innerWidth <= 600; }
    pill.addEventListener('pointerdown', e => {
      if (!isMobile()) return;
      dragging = true; sy = e.clientY;
      pill.setPointerCapture(e.pointerId);
      root.style.transition = 'none';
    });
    pill.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dy = Math.max(0, e.clientY - sy);
      root.style.transform = `translateY(${dy}px)`;
    });
    pill.addEventListener('pointerup', e => {
      if (!dragging) return; dragging = false;
      root.style.transition = '';
      const dy = Math.max(0, e.clientY - sy);
      if (dy > 80) { root.classList.remove('visible'); fab.classList.remove('open'); root.style.transform = ''; }
      else { root.style.transform = ''; }
    });
    // Right-edge pull tab on mobile — fixed strip that opens panel
    const pullTab = document.createElement('div');
    pullTab.id = 'tc-pull-tab';
    pullTab.style.cssText = 'display:none;position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:99997;width:18px;height:56px;background:#1a2236;border-radius:8px 0 0 8px;border:1px solid #1e2a45;border-right:none;cursor:pointer;align-items:center;justify-content:center;font-size:10px;color:#4e7a9b;writing-mode:vertical-lr;';
    pullTab.textContent = '🎨';
    pullTab.addEventListener('click', () => { root.classList.add('visible'); fab.classList.add('open'); });
    document.body.appendChild(pullTab);
    // Show pull tab only on mobile when panel is closed
    function updatePullTab() {
      if (window.innerWidth <= 600) {
        pullTab.style.display = root.classList.contains('visible') ? 'none' : 'flex';
      } else { pullTab.style.display = 'none'; }
    }
    fab.addEventListener('click', updatePullTab);
    root.querySelector('#tc-close')?.addEventListener('click', updatePullTab);
    window.addEventListener('resize', updatePullTab);
    updatePullTab();
  })();

  // ─── Events ────────────────────────────────────────────────────────────────
  fab.addEventListener('click',()=>{ const v=root.classList.toggle('visible'); fab.classList.toggle('open',v); });
  root.querySelector('#tc-close').addEventListener('click',    ()=>{ root.classList.remove('visible'); fab.classList.remove('open'); });
  root.querySelector('#tc-undo').addEventListener('click',     undo);
  root.querySelector('#tc-redo').addEventListener('click',     redo);
  root.querySelector('#tc-dock-float').addEventListener('click', ()=>setDock('float'));
  root.querySelector('#tc-dock-right').addEventListener('click', ()=>setDock('right'));
  root.querySelector('#tc-dock-bottom').addEventListener('click',()=>setDock('bottom'));
  root.querySelector('#tc-ldtoggle').addEventListener('click', ()=>{ state.axes.light=state.axes.light<50?92:5; pushHistory(state); applyAndSync(); });
  root.querySelector('#tc-panel-mode').addEventListener('click', ()=>{ root.classList.toggle('tc-panel-light'); });
  root.querySelector('#tc-help').addEventListener('click', ()=>{ root.querySelector('#tc-help-overlay').style.display='flex'; });
  root.querySelector('#tc-help-close').addEventListener('click', ()=>{ root.querySelector('#tc-help-overlay').style.display='none'; });
  root.querySelector('#tc-reset').addEventListener('click',    ()=>{ state=deepClone(DEFAULTS); pushHistory(state); applyAndSync(); });
  root.querySelector('#tc-save-preset').addEventListener('click',()=>{ const n=prompt('Preset name:','My Preset'); if (!n?.trim()) return; userPresets[n.trim()]=deepClone(state); saveUserPresets(); buildPresets(); });
  root.querySelector('#tc-export').addEventListener('click', () => {
    const t = computeTheme(state);
    const date = new Date().toISOString().slice(0,10);
    const css = `/* OpenClaw theme — ${date} */\n:root {\n  --bg:${t.bg}; --surface:${t.surface}; --surface-2:${t.surf2}; --deep:${t.deep};\n  --border:${t.border}; --border-2:${t.border2};\n  --hi:${t.hi}; --text:${t.text}; --text-2:${t.text2};\n  --muted:${t.muted}; --dim:${t.dim}; --ghost:${t.ghost};\n  --accent:${t.accent}; --acc-bg:${t.accBg}; --acc-hi:${t.accHi}; --accent-2:${t.split2};\n  --r-sm:${t.rSmV.toFixed(1)}px; --r:${t.rMdV.toFixed(1)}px;\n  --r-lg:${t.rLgV.toFixed(1)}px; --pill:${t.pillV.toFixed(1)}px;\n  --border-w:${t.borderW.toFixed(2)}px;\n  --sp-xs:${t.spXs}; --sp-sm:${t.spSm}; --sp-md:${t.spMd}; --sp-lg:${t.spLg};\n  --shadow:${t.shadow}; --shadow-hover:${t.shadowHover};\n  --transition:${t.transition}; --line-height:${t.lineHeight};\n  --h1-size:${t.h1Em}em; --h2-size:${t.h2Em}em; --h3-size:${t.h3Em}em;\n  --icon-scale:${t.iconEm}em;\n  font-family:${t.fontFamily};\n  font-size:${t.fontSizePx}; font-weight:${t.fontWeight};\n  letter-spacing:${t.letterSpacing}; line-height:${t.lineHeight};\n}`;
    const b = new Blob([css], {type:'text/css'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'theme-'+date+'.css'; a.click();
  });
  root.querySelector('#tc-import-file').addEventListener('change',e=>{ const f=e.target.files[0]; if (!f) return; const r=new FileReader(); r.onload=ev=>{ try { const d=JSON.parse(ev.target.result); if (d.state?.axes){state=ensureDefaults(d.state);pushHistory(state);applyAndSync();} if (d.userPresets){Object.assign(userPresets,d.userPresets);saveUserPresets();buildPresets();} } catch{alert('Invalid theme file.');} }; r.readAsText(f); e.target.value=''; });
  root.querySelector('#tc-apply-all').addEventListener('click', ()=>{ saveState(); if (bc) bc.postMessage({type:'theme',state:deepClone(state)}); const btn=root.querySelector('#tc-apply-all'); btn.textContent='Sent ✓'; setTimeout(()=>{btn.textContent='Apply All';},1200); });

  // Panel scale buttons
  root.querySelectorAll('.tc-ps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      prefs.panelScale = parseFloat(btn.dataset.ps);
      savePrefs(); applyPanelScale();
    });
  });

  // Arrow-key + scroll nudge on hovered slider
  let _hoveredSl = null;
  root.addEventListener('mouseover', e => {
    const inp = e.target.closest('input.tc-range');
    _hoveredSl = inp ? inp.dataset.sid : null;
  });
  root.addEventListener('mouseout', e => {
    if (e.target.closest('input.tc-range')) _hoveredSl = null;
  });
  // Scroll/Apple Magic Mouse wheel on range inputs — prevent panel scroll
  root.addEventListener('wheel', e => {
    const inp = e.target.closest('input.tc-range');
    if (!inp) return;
    e.preventDefault(); e.stopPropagation();
    const sid = inp.dataset.sid;
    const sl  = SLIDERS.find(s => s.id === sid); if (!sl) return;
    const delta = (e.shiftKey ? 5 : 1) * (e.deltaY < 0 ? 1 : -1);
    state.sliders[sid] = clamp((state.sliders[sid] ?? sl.def) + delta, sl.min, sl.max);
    updateAccSliders(); applyAndSync(); pushHistory(state);
  }, { passive: false });
  // Also block wheel on the body of the panel when over any range-adjacent row
  // so touch pads don't scroll while dragging
  const tcBody = root.querySelector('#tc-body');
  if (tcBody) {
    tcBody.addEventListener('wheel', e => {
      if (e.target.closest('input.tc-range, .tc-hsl-range, .tc-hsl-lightness')) {
        e.preventDefault(); e.stopPropagation();
      }
    }, { passive: false });
  }

  document.addEventListener('keydown', e => {
    // Help overlay Esc
    const helpOverlay = root.querySelector('#tc-help-overlay');
    if (e.key === 'Escape' && helpOverlay?.style.display !== 'none') {
      helpOverlay.style.display = 'none'; return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Arrow keys on hovered slider
    if (_hoveredSl && (e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown')) {
      const sl = SLIDERS.find(s => s.id === _hoveredSl); if (sl) {
        const delta = (e.shiftKey ? 10 : 1) * (e.key==='ArrowRight'||e.key==='ArrowUp' ? 1 : -1);
        state.sliders[_hoveredSl] = clamp(state.sliders[_hoveredSl] + delta, sl.min, sl.max);
        e.preventDefault(); updateAccSliders(); applyAndSync(); pushHistory(state);
      }
      return;
    }

    if ((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undo();}
    if ((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();redo();}
    if (e.key==='Escape'&&root.classList.contains('visible')){root.classList.remove('visible');fab.classList.remove('open');}
    if (e.key==='?' || (e.key==='/' && e.shiftKey)) { root.querySelector('#tc-help-overlay').style.display='flex'; }
  });

  // ─── Public API (for inspector and external integrations) ─────────────────
  window.__tcSet = function(id, val) {
    if (id in state.axes) { state.axes[id] = Number(val); }
    else { state.sliders[id] = Number(val); }
    applyAndSync(); syncUI();
  };
  // Local-only variant: applies without broadcasting to other tabs
  window.__tcSetLocal = function(id, val) {
    if (id in state.axes) { state.axes[id] = Number(val); }
    else { state.sliders[id] = Number(val); }
    applyAndSync(false); syncUI();
  };
  window.__tcGet = function(id) {
    if (id in state.axes) return state.axes[id];
    return state.sliders[id] ?? null;
  };

  // ─── Init ──────────────────────────────────────────────────────────────────
  buildStarburst(); buildAccordion(); buildPresets(); updateHistBar(); updateSwatch(); setDock('float');
  if (history.length===1&&deepEq(history[0].state,DEFAULTS)&&!deepEq(state,DEFAULTS)) pushHistory(state);
})();
