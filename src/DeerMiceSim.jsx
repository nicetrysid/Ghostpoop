import React, { useEffect, useRef, useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// DEER MICE THERMAL GENETICS
// An open enclosure, a swinging thermostat, and a breeder's hand.
// Coat thickness and ear size are polygenic traits that both bend
// one number — thermal conductance — in opposite directions.
// Select hard enough for one season and the other one bites back.
// ─────────────────────────────────────────────────────────────

const W = 760;
const H = 420;
const COMFORT = 22; // °C, thermoneutral point
const LOCI = 8; // diploid loci per trait (16 alleles) — additive polygenic model
const POP_TARGET = 42;
const MAX_POP = 70;
const MUT_RATE = 0.015;
const GEN_MS = 9000; // real ms per generation at 1x speed
const SEASON_PERIOD_GENS = 16; // generations per full seasonal cycle
const HUDDLE_R = 26;
const SEEK_R = 140;
const ENERGY_DRAIN = 0.012;
const FORAGE_RATE = 0.1;

const C = {
  bg: "#0e1310",
  panel: "#161d18",
  panel2: "#1b241d",
  edge: "#2a352b",
  ink: "#e9efe6",
  fog: "#b7c4b3",
  fogDim: "#7c8a79",
  amber: "#e0a95c",
  cold: "#7fb3e8",
  hot: "#e8886b",
  sage: "#8fbf8a",
  danger: "#e0705c",
};

const BREED_MODES = [
  { id: "natural", label: "Natural selection only", hint: "No breeder's hand — survival and energy decide who mates." },
  { id: "furry", label: "Select for furry coat", hint: "Breed the plushest coats each generation." },
  { id: "sparse", label: "Select for sparse coat", hint: "Breed the thinnest coats each generation." },
  { id: "bigEars", label: "Select for big ears", hint: "Breed the largest ears each generation." },
  { id: "smallEars", label: "Select for small ears", hint: "Breed the smallest ears each generation." },
  { id: "furryBigEars", label: "Furry coat + big ears", hint: "The hypothesis: plush insulation offset by radiator ears." },
  { id: "furrySmallEars", label: "Furry coat + small ears", hint: "Maximum cold hardiness, minimum cooling." },
];

let idCounter = 0;

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function lerpColor(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }

function newAlleles() {
  const arr = new Uint8Array(LOCI * 2);
  for (let i = 0; i < arr.length; i++) arr[i] = Math.random() < 0.5 ? 1 : 0;
  return arr;
}
function phenotype(alleles) {
  let s = 0;
  for (let i = 0; i < alleles.length; i++) s += alleles[i];
  return s / alleles.length;
}
function inherit(allelesA, allelesB) {
  const out = new Uint8Array(LOCI * 2);
  for (let locus = 0; locus < LOCI; locus++) {
    let a = allelesA[locus * 2 + (Math.random() < 0.5 ? 0 : 1)];
    let b = allelesB[locus * 2 + (Math.random() < 0.5 ? 0 : 1)];
    if (Math.random() < MUT_RATE) a = a ? 0 : 1;
    if (Math.random() < MUT_RATE) b = b ? 0 : 1;
    out[locus * 2] = a;
    out[locus * 2 + 1] = b;
  }
  return out;
}
function makeMouse(furAlleles, earAlleles, x, y) {
  return {
    id: idCounter++,
    x, y,
    vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3),
    furAlleles, earAlleles,
    fur: phenotype(furAlleles),
    ear: phenotype(earAlleles),
    energy: 1,
    alive: true,
    dying: false,
    diedAt: 0,
    thermState: "ok",
    huddling: false,
  };
}
function randomMouse(x, y) { return makeMouse(newAlleles(), newAlleles(), x, y); }

function conductanceOf(m) { return clamp(0.18 + m.ear * 0.62 - m.fur * 0.52, 0.04, 0.95); }
function seasonalTemp(genFloat) {
  return 16 + 20 * Math.sin((genFloat / SEASON_PERIOD_GENS) * Math.PI * 2 - Math.PI / 2);
}
function scoreForMode(mode) {
  switch (mode) {
    case "furry": return (m) => m.fur;
    case "sparse": return (m) => 1 - m.fur;
    case "bigEars": return (m) => m.ear;
    case "smallEars": return (m) => 1 - m.ear;
    case "furryBigEars": return (m) => m.fur + m.ear;
    case "furrySmallEars": return (m) => m.fur + (1 - m.ear);
    default: return (m) => m.energy;
  }
}

function drawMouse(ctx, m) {
  const bodyColor = m.thermState === "cold" ? C.cold : m.thermState === "hot" ? C.hot : "#c9a878";
  const ang = Math.atan2(m.vy, m.vx) || 0;
  const tailLen = 14;
  const tx = m.x - Math.cos(ang) * 8, ty = m.y - Math.sin(ang) * 8;
  const tex = tx - Math.cos(ang) * tailLen, tey = ty - Math.sin(ang) * tailLen;
  ctx.strokeStyle = "#a98a63";
  ctx.lineWidth = 1 + m.fur * 2.2;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tex, tey); ctx.stroke();

  const ticks = Math.round(m.fur * 7);
  const perp = ang + Math.PI / 2;
  for (let i = 0; i < ticks; i++) {
    const f = i / (ticks || 1);
    const px = tx + (tex - tx) * f, py = ty + (tey - ty) * f;
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(perp) * 2.5, py - Math.sin(perp) * 2.5);
    ctx.lineTo(px + Math.cos(perp) * 2.5, py + Math.sin(perp) * 2.5);
    ctx.stroke();
  }

  const earR = 1.5 + m.ear * 4.5;
  const eAng1 = ang - 0.55, eAng2 = ang + 0.55;
  ctx.fillStyle = "#dcc4a0";
  ctx.beginPath(); ctx.arc(m.x + Math.cos(ang) * 6 + Math.cos(eAng1) * 3, m.y + Math.sin(ang) * 6 + Math.sin(eAng1) * 3, earR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + Math.cos(ang) * 6 + Math.cos(eAng2) * 3, m.y + Math.sin(ang) * 6 + Math.sin(eAng2) * 3, earR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(m.x, m.y, 7, 5, ang, 0, Math.PI * 2); ctx.fill();

  if (m.huddling) {
    ctx.strokeStyle = "rgba(127,179,232,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI * 2); ctx.stroke();
  }
}

function Sparkline({ data, accessor, color, min, max, height = 78, width = 300, label, format }) {
  const vals = data.map(accessor);
  const lo = min ?? (vals.length ? Math.min(...vals) : 0);
  const hi = max ?? (vals.length ? Math.max(...vals) : 1);
  const range = hi - lo || 1;
  const pts = data.map((d, i) => {
    const x = data.length <= 1 ? width : (i / (data.length - 1)) * width;
    const y = height - ((accessor(d) - lo) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  const last = vals.length ? vals[vals.length - 1] : null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.fogDim, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color }}>{last == null ? "—" : format ? format(last) : last.toFixed(2)}</span>
      </div>
      <svg width={width} height={height} style={{ display: "block", background: C.panel2, borderRadius: 4, border: `1px solid ${C.edge}` }}>
        {data.length > 1 && <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} />}
      </svg>
    </div>
  );
}

function TraitChart({ data, width = 300, height = 78 }) {
  const line = (accessor) => data.map((d, i) => {
    const x = data.length <= 1 ? width : (i / (data.length - 1)) * width;
    const y = height - clamp(accessor(d), 0, 1) * height;
    return `${x},${y}`;
  }).join(" ");
  const last = data.length ? data[data.length - 1] : null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.fogDim, marginBottom: 4 }}>
        <span>Trait averages</span>
        <span>
          <span style={{ color: C.amber }}>fur {last ? Math.round(last.avgFur * 100) : "—"}%</span>
          {"  "}
          <span style={{ color: C.sage }}>ear {last ? Math.round(last.avgEar * 100) : "—"}%</span>
        </span>
      </div>
      <svg width={width} height={height} style={{ display: "block", background: C.panel2, borderRadius: 4, border: `1px solid ${C.edge}` }}>
        {data.length > 1 && <polyline points={line((d) => d.avgFur)} fill="none" stroke={C.amber} strokeWidth={1.6} />}
        {data.length > 1 && <polyline points={line((d) => d.avgEar)} fill="none" stroke={C.sage} strokeWidth={1.6} />}
      </svg>
    </div>
  );
}

export default function DeerMiceSim() {
  const canvasRef = useRef(null);
  const miceRef = useRef([]);
  const genRef = useRef(0);
  const genElapsedRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const statsThrottleRef = useRef(0);
  const forceGenRef = useRef(false);

  const runningRef = useRef(true);
  const speedRef = useRef(1);
  const breedModeRef = useRef("natural");
  const selectionFractionRef = useRef(0.4);
  const autoSeasonRef = useRef(true);
  const manualTempRef = useRef(16);

  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [breedMode, setBreedMode] = useState("natural");
  const [selectionFraction, setSelectionFraction] = useState(0.4);
  const [autoSeason, setAutoSeason] = useState(true);
  const [manualTemp, setManualTemp] = useState(16);

  const [generation, setGeneration] = useState(0);
  const [alivePop, setAlivePop] = useState(POP_TARGET);
  const [liveTemp, setLiveTemp] = useState(16);
  const [genProgress, setGenProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [lastDeaths, setLastDeaths] = useState(0);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { breedModeRef.current = breedMode; }, [breedMode]);
  useEffect(() => { selectionFractionRef.current = selectionFraction; }, [selectionFraction]);
  useEffect(() => { autoSeasonRef.current = autoSeason; }, [autoSeason]);
  useEffect(() => { manualTempRef.current = manualTemp; }, [manualTemp]);

  const computeTemp = useCallback(() => {
    if (autoSeasonRef.current) {
      const genFloat = genRef.current + genElapsedRef.current / GEN_MS;
      return seasonalTemp(genFloat);
    }
    return manualTempRef.current;
  }, []);

  const resetPopulation = useCallback(() => {
    const mice = [];
    for (let i = 0; i < POP_TARGET; i++) mice.push(randomMouse(rand(20, W - 20), rand(20, H - 20)));
    miceRef.current = mice;
    genRef.current = 0;
    genElapsedRef.current = 0;
    setGeneration(0);
    setAlivePop(mice.length);
    setHistory([]);
    setCollapsed(false);
    setLastDeaths(0);
    setRunning(true);
  }, []);

  useEffect(() => {
    resetPopulation();

    function step(dt, envTemp) {
      const mice = miceRef.current;
      const diff = envTemp - COMFORT;
      for (const m of mice) {
        if (!m.alive) continue;
        let neighbors = 0;
        for (const o of mice) {
          if (o === m || !o.alive) continue;
          const dx = o.x - m.x, dy = o.y - m.y;
          if (dx * dx + dy * dy < HUDDLE_R * HUDDLE_R) neighbors++;
        }
        const cond = conductanceOf(m);
        let exposure, mode;
        if (diff < 0) {
          exposure = (-diff * cond) / (1 + 0.22 * neighbors);
          mode = exposure > 3 ? "cold" : "ok";
        } else {
          exposure = diff * (1 - cond) + diff * 0.05 * neighbors;
          mode = exposure > 3 ? "hot" : "ok";
        }
        m.thermState = mode;
        m.huddling = mode === "cold";
        m.energy = clamp(m.energy - exposure * ENERGY_DRAIN * dt + FORAGE_RATE * dt, 0, 1);
        if (m.energy <= 0 && !m.dying) { m.alive = false; m.dying = true; m.diedAt = performance.now(); }

        let ax = 0, ay = 0;
        if (mode === "cold") {
          let cx = 0, cy = 0, cnt = 0;
          for (const o of mice) {
            if (o !== m && o.alive) {
              const dx = o.x - m.x, dy = o.y - m.y;
              if (dx * dx + dy * dy < SEEK_R * SEEK_R) { cx += o.x; cy += o.y; cnt++; }
            }
          }
          if (cnt > 0) { cx /= cnt; cy /= cnt; ax += (cx - m.x) * 0.0022; ay += (cy - m.y) * 0.0022; }
        } else if (mode === "hot") {
          for (const o of mice) {
            if (o !== m && o.alive) {
              const dx = m.x - o.x, dy = m.y - o.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < HUDDLE_R * HUDDLE_R && d2 > 1) { ax += (dx / d2) * 5; ay += (dy / d2) * 5; }
            }
          }
        } else {
          ax += rand(-0.05, 0.05); ay += rand(-0.05, 0.05);
        }
        for (const o of mice) {
          if (o !== m && o.alive) {
            const dx = m.x - o.x, dy = m.y - o.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 90 && d2 > 1) { ax += (dx / d2) * 0.6; ay += (dy / d2) * 0.6; }
          }
        }

        m.vx = clamp((m.vx + ax * dt) * 0.94, -1.4, 1.4);
        m.vy = clamp((m.vy + ay * dt) * 0.94, -1.4, 1.4);
        m.x += m.vx * dt * 30;
        m.y += m.vy * dt * 30;
        if (m.x < 12) { m.x = 12; m.vx *= -0.6; }
        if (m.x > W - 12) { m.x = W - 12; m.vx *= -0.6; }
        if (m.y < 12) { m.y = 12; m.vy *= -0.6; }
        if (m.y > H - 12) { m.y = H - 12; m.vy *= -0.6; }
      }
      const now = performance.now();
      miceRef.current = mice.filter((m) => m.alive || now - m.diedAt < 650);
    }

    function runGeneration(envTemp) {
      const alive = miceRef.current.filter((m) => m.alive);
      let breeders = alive;

      if (breedModeRef.current !== "natural") {
        const scoreFn = scoreForMode(breedModeRef.current);
        const sorted = [...alive].sort((a, b) => scoreFn(b) - scoreFn(a));
        const keep = Math.max(Math.min(2, sorted.length), Math.round(sorted.length * selectionFractionRef.current));
        breeders = sorted.slice(0, keep);
        const keepSet = new Set(breeders.map((m) => m.id));
        const now = performance.now();
        for (const m of alive) {
          if (!keepSet.has(m.id)) { m.alive = false; m.dying = true; m.diedAt = now; }
        }
      }

      const offspring = [];
      if (breeders.length >= 2) {
        const weights = breeders.map((m) => (breedModeRef.current === "natural" ? Math.max(0.05, m.energy) : 1));
        const totalW = weights.reduce((a, b) => a + b, 0);
        const pick = () => {
          let r = Math.random() * totalW, acc = 0;
          for (let i = 0; i < breeders.length; i++) { acc += weights[i]; if (r <= acc) return breeders[i]; }
          return breeders[breeders.length - 1];
        };
        const targetNew = clamp(POP_TARGET - breeders.length, 0, MAX_POP - breeders.length);
        let attempts = 0;
        while (offspring.length < targetNew && attempts < targetNew * 6 + 30) {
          attempts++;
          const p1 = pick(), p2 = pick();
          if (p1 === p2) continue;
          const litter = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < litter && offspring.length < targetNew; i++) {
            const furA = inherit(p1.furAlleles, p2.furAlleles);
            const earA = inherit(p1.earAlleles, p2.earAlleles);
            const nx = clamp((p1.x + p2.x) / 2 + rand(-20, 20), 12, W - 12);
            const ny = clamp((p1.y + p2.y) / 2 + rand(-20, 20), 12, H - 12);
            offspring.push(makeMouse(furA, earA, nx, ny));
          }
        }
      }

      const survivors = miceRef.current.filter((m) => m.alive);
      const dying = miceRef.current.filter((m) => m.dying && !m.alive);
      const newPop = [...survivors, ...offspring];
      miceRef.current = [...dying, ...newPop];

      const genNum = genRef.current + 1;
      genRef.current = genNum;
      const snapshot = {
        gen: genNum,
        population: newPop.length,
        avgFur: avg(newPop.map((m) => m.fur)),
        avgEar: avg(newPop.map((m) => m.ear)),
        temp: envTemp,
      };
      setGeneration(genNum);
      setLastDeaths(Math.max(0, alive.length - survivors.length));
      setHistory((h) => [...h.slice(-119), snapshot]);
      if (newPop.length === 0) {
        setCollapsed(true);
        runningRef.current = false;
        setRunning(false);
      }
    }

    function draw(ctx, temp) {
      ctx.clearRect(0, 0, W, H);
      const t = clamp((temp + 10) / 50, 0, 1);
      const bg = lerpColor([22, 32, 48], [54, 28, 20], t);
      ctx.fillStyle = `rgb(${bg.join(",")})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#3a3f3a";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);
      ctx.globalAlpha = 1;
      for (const m of miceRef.current) {
        const alpha = m.dying ? clamp(1 - (performance.now() - m.diedAt) / 650, 0, 1) : 1;
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        drawMouse(ctx, m);
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      const ctx = canvasRef.current?.getContext("2d");

      const temp = computeTemp();

      if (runningRef.current) {
        const scaledDt = dt * speedRef.current;
        step(scaledDt, temp);
        genElapsedRef.current += scaledDt * 1000;
        if (genElapsedRef.current >= GEN_MS) {
          genElapsedRef.current -= GEN_MS;
          runGeneration(temp);
        }
      }
      if (forceGenRef.current) {
        forceGenRef.current = false;
        genElapsedRef.current = 0;
        runGeneration(temp);
      }

      statsThrottleRef.current += dt * 1000;
      if (statsThrottleRef.current > 200) {
        statsThrottleRef.current = 0;
        setLiveTemp(temp);
        setGenProgress(clamp(genElapsedRef.current / GEN_MS, 0, 1));
        const aliveCount = miceRef.current.reduce((n, m) => n + (m.alive ? 1 : 0), 0);
        setAlivePop(aliveCount);
        if (aliveCount === 0 && runningRef.current) {
          runningRef.current = false;
          setRunning(false);
          setCollapsed(true);
        }
      }

      if (ctx) draw(ctx, temp);
      rafRef.current = requestAnimationFrame(tick);
    }

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [computeTemp, resetPopulation]);

  const currentMode = BREED_MODES.find((b) => b.id === breedMode);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", padding: "28px 18px 60px", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Spectral:wght@300;400;600&display=swap');
        input[type=range] { accent-color: ${C.amber}; }
        select { color-scheme: dark; }
        .dm-btn { background: ${C.panel2}; border: 1px solid ${C.edge}; color: ${C.ink}; border-radius: 4px; padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer; }
        .dm-btn:hover { border-color: ${C.amber}; }
        .dm-btn.active { background: ${C.amber}; color: #1a1408; border-color: ${C.amber}; font-weight: 600; }
        .dm-select { background: ${C.panel2}; border: 1px solid ${C.edge}; color: ${C.ink}; border-radius: 4px; padding: 6px 8px; font: inherit; font-size: 12px; width: 100%; }
        details summary { cursor: pointer; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 1100 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontWeight: 600, fontSize: 26, margin: "0 0 4px" }}>Deer Mice Thermal Genetics</h1>
        <p style={{ color: C.fogDim, fontSize: 13, margin: "0 0 20px", maxWidth: 720, lineHeight: 1.5 }}>
          An open enclosure with a swinging thermostat. Coat thickness and ear size are both polygenic traits
          that push one number — thermal conductance — in opposite directions. Pick what you breed for, then
          swing the seasons and watch the trade-off show up as deaths, huddling, and drift in the averages below.
        </p>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "2 1 500px", minWidth: 400 }}>
            <div style={{ position: "relative" }}>
              <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", maxWidth: W, display: "block", borderRadius: 6 }} />
              {collapsed && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(10,12,10,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 6, gap: 12, textAlign: "center", padding: 20 }}>
                  <div style={{ fontFamily: "'Spectral', serif", fontSize: 20, color: C.danger }}>The line died out.</div>
                  <div style={{ fontSize: 13, color: C.fog, maxWidth: 380 }}>Thermal stress outpaced reproduction — the selected traits couldn't survive the swing. Reset and try a gentler selection fraction, or a hedge between fur and ears.</div>
                  <button className="dm-btn active" onClick={resetPopulation}>Reset enclosure</button>
                </div>
              )}
              <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, height: 3, background: "rgba(0,0,0,0.4)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${genProgress * 100}%`, height: "100%", background: C.amber, transition: "width 120ms linear" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: C.fogDim, flexWrap: "wrap" }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: C.cold, marginRight: 5 }} />cold-stressed / huddling</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: C.hot, marginRight: 5 }} />heat-stressed</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#c9a878", marginRight: 5 }} />comfortable</span>
              <span>tail fuzz ∝ coat · ear circles ∝ ear size</span>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <Sparkline data={history} accessor={(d) => d.population} color={C.fog} min={0} max={MAX_POP} label="Population" width={280} />
              <TraitChart data={history} width={280} />
              <Sparkline data={history} accessor={(d) => d.temp} color={C.hot} min={-10} max={40} label="Temperature (°C)" format={(v) => v.toFixed(1)} width={280} />
            </div>

            <details style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 6, padding: "10px 14px" }}>
              <summary style={{ fontSize: 13, color: C.amber }}>How the trade-off works</summary>
              <div style={{ fontSize: 12.5, color: C.fog, lineHeight: 1.6, marginTop: 8 }}>
                Each mouse's coat and ear size fold into one value: <em>thermal conductance</em>. Thicker fur lowers it
                (heat stays in); bigger ears raise it (more blood-rich surface radiating heat, same logic as a jackrabbit's
                ears — Allen's rule). Low conductance is an asset in cold and a liability in heat; high conductance is the
                reverse. When cold-stress crosses a threshold, mice actively huddle — clustering cuts each mouse's exposed
                surface and buys real relief. There's no equivalent trick for heat, so heat-stressed mice just scatter for
                space instead. Breed hard for a furry coat and small ears and you get excellent winters and a population
                crash the first time you fire a Heat Wave — try it. Traits are inherited as {LOCI}-locus additive genes
                with a small mutation rate, so variation regenerates even under strong selection.
              </div>
            </details>
          </div>

          <div style={{ flex: "1 1 280px", minWidth: 260, display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel title="Stats">
              <Row label="Generation" value={generation} />
              <Row label="Population" value={alivePop} valueColor={alivePop < 10 ? C.danger : C.ink} />
              <Row label="Temperature" value={`${liveTemp.toFixed(1)}°C`} valueColor={liveTemp < COMFORT ? C.cold : liveTemp > COMFORT ? C.hot : C.ink} />
              <Row label="Deaths last litter" value={lastDeaths} valueColor={lastDeaths > 0 ? C.danger : C.fogDim} />
            </Panel>

            <Panel title="Breeding">
              <select className="dm-select" value={breedMode} onChange={(e) => setBreedMode(e.target.value)}>
                {BREED_MODES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: C.fogDim, marginTop: 6, lineHeight: 1.4 }}>{currentMode.hint}</div>
              {breedMode !== "natural" && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.fogDim }}>
                    <span>Keep top</span><span style={{ color: C.amber }}>{Math.round(selectionFraction * 100)}%</span>
                  </div>
                  <input type="range" min={0.1} max={0.9} step={0.05} value={selectionFraction}
                    onChange={(e) => setSelectionFraction(parseFloat(e.target.value))} style={{ width: "100%" }} />
                </div>
              )}
            </Panel>

            <Panel title="Season">
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <button className={`dm-btn${autoSeason ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setAutoSeason(true)}>Auto cycle</button>
                <button className={`dm-btn${!autoSeason ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setAutoSeason(false)}>Manual</button>
              </div>
              {!autoSeason && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.fogDim }}>
                    <span>Set temperature</span><span style={{ color: C.amber }}>{manualTemp.toFixed(0)}°C</span>
                  </div>
                  <input type="range" min={-15} max={42} step={1} value={manualTemp}
                    onChange={(e) => setManualTemp(parseFloat(e.target.value))} style={{ width: "100%" }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="dm-btn" style={{ flex: 1, color: C.cold }} onClick={() => { setAutoSeason(false); setManualTemp(-12); }}>❄ Cold Snap</button>
                <button className="dm-btn" style={{ flex: 1, color: C.hot }} onClick={() => { setAutoSeason(false); setManualTemp(40); }}>☀ Heat Wave</button>
              </div>
            </Panel>

            <Panel title="Playback">
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button className={`dm-btn${running ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setRunning((r) => !r)}>{running ? "⏸ Pause" : "▶ Play"}</button>
                <button className="dm-btn" style={{ flex: 1 }} onClick={() => { forceGenRef.current = true; }}>⏭ Next gen</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[1, 2, 4].map((s) => (
                  <button key={s} className={`dm-btn${speed === s ? " active" : ""}`} style={{ flex: 1 }} onClick={() => setSpeed(s)}>{s}×</button>
                ))}
              </div>
              <button className="dm-btn" style={{ width: "100%", color: C.danger }} onClick={resetPopulation}>↺ Reset enclosure</button>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 6, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.fogDim, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
      <span style={{ color: C.fogDim }}>{label}</span>
      <span style={{ color: valueColor || C.ink, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
