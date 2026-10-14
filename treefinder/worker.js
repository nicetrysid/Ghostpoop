// Runs the heavy terrain math off the main thread. Keeps a few analyzed windows in memory.
importScripts('analysis.js');

const windows = new Map(); // key -> { grids, n }
const MAX = 3;

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.cmd === 'load') {
      if (!windows.has(m.key)) {
        const dem = new Float32Array(m.dem);
        const grids = Analysis.analyze(dem, m.n, m.res, m.segs);
        windows.set(m.key, { grids, n: m.n });
        while (windows.size > MAX) windows.delete(windows.keys().next().value);
      }
      self.postMessage({ rid: m.rid, ok: true });
    } else if (m.cmd === 'has') {
      self.postMessage({ rid: m.rid, ok: true, has: windows.has(m.key) });
    } else if (m.cmd === 'fp') {
      const w = windows.get(m.key);
      if (!w) throw new Error('Area not loaded');
      self.postMessage({ rid: m.rid, ok: true, fps: m.pts.map(p => Analysis.fingerprintAt(w.grids, w.n, p[0], p[1])) });
    } else if (m.cmd === 'score') {
      const w = windows.get(m.key);
      if (!w) throw new Error('Area not loaded');
      const factors = new Set(m.factors);
      const pos = Analysis.score(w.grids, w.n, m.trees, factors, m.bw);
      let s = pos.score;
      if (m.empties.length) {
        // Spots you checked and found nothing pull the score down near look-alikes.
        const neg = Analysis.score(w.grids, w.n, m.empties, factors, m.bw * 0.6).score;
        s = new Float32Array(s.length);
        for (let k = 0; k < s.length; k++) s[k] = pos.score[k] * (1 - 0.6 * neg[k]);
      }
      const sep = Math.max(4, Math.round(350 / m.res));
      const peaks = Analysis.peaks(s, w.n, sep, 12, 0.15);
      self.postMessage({ rid: m.rid, ok: true, score: s.buffer, peaks, used: pos.used }, [s.buffer]);
    }
  } catch (err) {
    self.postMessage({ rid: m.rid, ok: false, error: String(err && err.message || err) });
  }
};
