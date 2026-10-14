// Terrain analysis on a square elevation grid (meters), row-major, north at row 0.
// Pure functions: used by the Web Worker and by tests under Node.

(function (root) {
  // Mean of a square window around every cell, via an integral image.
  function boxMean(src, n, r) {
    const w = n + 1;
    const sum = new Float64Array(w * w);
    for (let y = 0; y < n; y++) {
      let row = 0;
      for (let x = 0; x < n; x++) {
        row += src[y * n + x];
        sum[(y + 1) * w + (x + 1)] = sum[y * w + (x + 1)] + row;
      }
    }
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(n, y + r + 1);
      for (let x = 0; x < n; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(n, x + r + 1);
        const s = sum[y1 * w + x1] - sum[y0 * w + x1] - sum[y1 * w + x0] + sum[y0 * w + x0];
        out[y * n + x] = s / ((y1 - y0) * (x1 - x0));
      }
    }
    return out;
  }

  // Horn's method. Returns slope (degrees) and aspect as northness/eastness (-1..1).
  function slopeAspect(dem, n, res) {
    const slope = new Float32Array(n * n);
    const north = new Float32Array(n * n);
    const east = new Float32Array(n * n);
    const at = (x, y) => dem[Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const a = at(x - 1, y - 1), b = at(x, y - 1), c = at(x + 1, y - 1);
        const d = at(x - 1, y), f = at(x + 1, y);
        const g = at(x - 1, y + 1), h = at(x, y + 1), i = at(x + 1, y + 1);
        const dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * res); // + toward east
        const dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * res); // + toward south
        const k = y * n + x;
        const grad = Math.hypot(dzdx, dzdy);
        slope[k] = Math.atan(grad) * 180 / Math.PI;
        if (grad < 1e-6) { north[k] = 0; east[k] = 0; continue; }
        // Downslope direction faces opposite the gradient (uphill) vector.
        east[k] = -dzdx / grad;
        north[k] = dzdy / grad;
      }
    }
    return { slope, north, east };
  }

  // D8 flow accumulation (number of cells draining through each cell, itself included).
  function flowAccumulation(dem, n) {
    const N = n * n;
    const order = new Uint32Array(N);
    for (let i = 0; i < N; i++) order[i] = i;
    order.sort((p, q) => dem[q] - dem[p]); // highest first
    const acc = new Float32Array(N).fill(1);
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    const dist = [Math.SQRT2, 1, Math.SQRT2, 1, 1, Math.SQRT2, 1, Math.SQRT2];
    for (let o = 0; o < N; o++) {
      const k = order[o];
      const x = k % n, y = (k - x) / n;
      const z = dem[k];
      let best = -1, drop = 0;
      for (let j = 0; j < 8; j++) {
        const xx = x + dx[j], yy = y + dy[j];
        if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const s = (z - dem[yy * n + xx]) / dist[j];
        if (s > drop) { drop = s; best = yy * n + xx; }
      }
      if (best >= 0) acc[best] += acc[k];
    }
    return acc;
  }

  // Rasterize line segments [x0,y0,x1,y1,...] in pixel units, then chamfer distance in meters.
  function distanceToLines(segs, n, res) {
    const INF = 1e9;
    const d = new Float32Array(n * n).fill(INF);
    for (let s = 0; s + 3 < segs.length; s += 4) {
      const x0 = segs[s], y0 = segs[s + 1], x1 = segs[s + 2], y1 = segs[s + 3];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let t = 0; t <= steps; t++) {
        const x = Math.round(x0 + (x1 - x0) * t / steps);
        const y = Math.round(y0 + (y1 - y0) * t / steps);
        if (x >= 0 && y >= 0 && x < n && y < n) d[y * n + x] = 0;
      }
    }
    const a = 1, b = Math.SQRT2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const k = y * n + x; let v = d[k];
      if (x > 0) v = Math.min(v, d[k - 1] + a);
      if (y > 0) {
        v = Math.min(v, d[k - n] + a);
        if (x > 0) v = Math.min(v, d[k - n - 1] + b);
        if (x < n - 1) v = Math.min(v, d[k - n + 1] + b);
      }
      d[k] = v;
    }
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
      const k = y * n + x; let v = d[k];
      if (x < n - 1) v = Math.min(v, d[k + 1] + a);
      if (y < n - 1) {
        v = Math.min(v, d[k + n] + a);
        if (x < n - 1) v = Math.min(v, d[k + n + 1] + b);
        if (x > 0) v = Math.min(v, d[k + n - 1] + b);
      }
      d[k] = v;
    }
    const hasRoad = segs.length >= 4;
    for (let k = 0; k < n * n; k++) d[k] = hasRoad ? d[k] * res : NaN;
    return d;
  }

  // All per-cell variables used for matching. Units are human-readable.
  function analyze(dem, n, res, roadSegs) {
    const { slope, north, east } = slopeAspect(dem, n, res);
    const rS = Math.max(1, Math.round(150 / res));
    const rL = Math.max(2, Math.round(600 / res));
    const mS = boxMean(dem, n, rS), mL = boxMean(dem, n, rL);
    const tpiS = new Float32Array(n * n), tpiL = new Float32Array(n * n);
    for (let k = 0; k < n * n; k++) { tpiS[k] = dem[k] - mS[k]; tpiL[k] = dem[k] - mL[k]; }
    const acc = flowAccumulation(dem, n);
    const twi = new Float32Array(n * n);
    const drain = new Float32Array(n * n);
    for (let k = 0; k < n * n; k++) {
      const area = acc[k] * res * res;           // upslope area, m²
      const tanb = Math.max(0.001, Math.tan(slope[k] * Math.PI / 180));
      twi[k] = Math.log((area / res) / tanb);
      drain[k] = Math.log10(area);                // log10 m² of catchment
    }
    const road = distanceToLines(roadSegs || [], n, res);
    return { elev: dem, slope, north, east, tpiS, tpiL, twi, drain, road };
  }

  // Variables, how they're transformed for matching, and which factor toggle they belong to.
  const VARS = [
    { key: 'elev', factor: 'elev', label: 'Elevation', unit: 'ft', show: v => Math.round(v * 3.28084) },
    { key: 'slope', factor: 'slope', label: 'Slope', unit: '°', show: v => v.toFixed(0) },
    { key: 'north', factor: 'aspect', label: 'Faces north (−1 south … +1 north)', unit: '', show: v => v.toFixed(2) },
    { key: 'east', factor: 'aspect', label: 'Faces east (−1 west … +1 east)', unit: '', show: v => v.toFixed(2) },
    { key: 'tpiS', factor: 'ravine', label: 'Local position (− = in a draw, + = on a rise)', unit: 'ft', show: v => (v * 3.28084).toFixed(0) },
    { key: 'tpiL', factor: 'ravine', label: 'Valley position (− = canyon bottom, + = ridge)', unit: 'ft', show: v => (v * 3.28084).toFixed(0) },
    { key: 'drain', factor: 'water', label: 'Watershed above (log₁₀ m²)', unit: '', show: v => v.toFixed(1) },
    { key: 'twi', factor: 'water', label: 'Wetness index', unit: '', show: v => v.toFixed(1) },
    { key: 'road', factor: 'road', label: 'Distance to road', unit: 'ft', show: v => Math.round(v * 3.28084), tx: v => Math.log1p(v) },
  ];

  function fingerprintAt(grids, n, x, y) {
    const k = Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x));
    const fp = {};
    for (const v of VARS) {
      const val = grids[v.key][k];
      fp[v.key] = Number.isFinite(val) ? +val.toFixed(4) : null;
    }
    return fp;
  }

  // Similarity of every cell to the closest-matching known tree (0..1).
  // trees: array of fingerprints. factors: Set of enabled factor names.
  function score(grids, n, trees, factors, bandwidth) {
    const vars = VARS.filter(v => factors.has(v.factor));
    const tx = (v, x) => (v.tx ? v.tx(x) : x);
    // Spread of each variable across this window, so units don't matter.
    const spread = {};
    for (const v of vars) {
      const g = grids[v.key];
      let s = 0, s2 = 0, c = 0;
      for (let k = 0; k < n * n; k += 7) {
        const val = g[k]; if (!Number.isFinite(val)) continue;
        const t = tx(v, val); s += t; s2 += t * t; c++;
      }
      const sd = c > 1 ? Math.sqrt(Math.max(0, s2 / c - (s / c) ** 2)) : 0;
      spread[v.key] = sd > 1e-6 ? sd : null;
    }
    const usable = vars.filter(v => spread[v.key] !== null);
    const tvals = trees.map(fp => usable.map(v => (fp[v.key] == null ? null : tx(v, fp[v.key]))));
    const out = new Float32Array(n * n);
    const bw2 = 2 * bandwidth * bandwidth;
    for (let k = 0; k < n * n; k++) {
      let best = 0;
      for (let t = 0; t < tvals.length; t++) {
        let d2 = 0, m = 0;
        for (let j = 0; j < usable.length; j++) {
          const tv = tvals[t][j]; if (tv === null) continue;
          const g = grids[usable[j].key][k]; if (!Number.isFinite(g)) continue;
          const z = (tx(usable[j], g) - tv) / spread[usable[j].key];
          d2 += z * z; m++;
        }
        if (m === 0) continue;
        const sim = Math.exp(-(d2 / m) / bw2);
        if (sim > best) best = sim;
      }
      out[k] = best;
    }
    return { score: out, used: usable.map(v => v.key) };
  }

  // Strongest local peaks, at least `sep` cells apart.
  function peaks(scoreGrid, n, sep, count, minScore) {
    const cand = [];
    const step = Math.max(1, Math.floor(sep / 3));
    for (let y = 0; y < n; y += step) for (let x = 0; x < n; x += step) {
      let bk = -1, bv = -1;
      for (let yy = y; yy < Math.min(n, y + step); yy++) for (let xx = x; xx < Math.min(n, x + step); xx++) {
        const v = scoreGrid[yy * n + xx]; if (v > bv) { bv = v; bk = yy * n + xx; }
      }
      if (bv >= minScore) cand.push([bv, bk]);
    }
    cand.sort((a, b) => b[0] - a[0]);
    const picked = [];
    for (const [v, k] of cand) {
      const x = k % n, y = (k - x) / n;
      if (picked.every(p => Math.hypot(p.x - x, p.y - y) >= sep)) picked.push({ x, y, score: v });
      if (picked.length >= count) break;
    }
    return picked;
  }

  const api = { boxMean, slopeAspect, flowAccumulation, distanceToLines, analyze, fingerprintAt, score, peaks, VARS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Analysis = api;
})(typeof self !== 'undefined' ? self : this);
