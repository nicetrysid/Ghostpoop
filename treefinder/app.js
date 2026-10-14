/* Big Tree Scout — field app for logging big juniper, pinyon and oak and finding look-alike ground. */
(function () {
  'use strict';

  // ---------- Data sources (all public; each one can fail without breaking the rest) ----------
  const SRC = {
    topo: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    img: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
    relief: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
    // BLM Surface Management Agency: who manages the surface. Private/unknown is left unshaded.
    land: 'https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_without_PriUnk/MapServer',
    geoTiles: 'https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png',
    geoPoint: 'https://macrostrat.org/api/v2/geologic_units/map',
    // Elevation tiles built mostly from USGS 3DEP in the US, RGB-encoded ("terrarium").
    dem: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    overpass: 'https://overpass-api.de/api/interpreter',
    soil: 'https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest',
  };

  const SPECIES = {
    juniper: { label: 'Juniper', color: '#4f6f9a', suggest: ['Utah juniper', 'One-seed juniper', 'Rocky Mountain juniper'] },
    pinyon: { label: 'Pinyon', color: '#a0662a', suggest: ['Two-needle pinyon'] },
    oak: { label: 'Oak', color: '#5d7f2f', suggest: ['Gambel oak'] },
  };
  const DEM_Z = 13, TILE = 256, WIN = 768; // analysis window: 3×3 elevation tiles, ~7 mi square here

  // ---------- Storage ----------
  const KEY = 'bigtreescout.v1';
  const state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && Array.isArray(s.trees)) return Object.assign({ types: {}, view: null, base: 'topo', ov: ['land'] }, s);
    } catch (e) { /* storage unavailable */ }
    return { trees: [], types: {}, view: null, base: 'topo', ov: ['land'] };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save on this phone. Export a backup now.'); }
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- Helpers ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const FT = 3.28084;
  let toastTimer;
  function toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 3200);
  }
  function lonLatToPx(lon, lat, z) {
    const s = TILE * Math.pow(2, z);
    const sin = Math.sin(lat * Math.PI / 180);
    return [(lon + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
  }
  function pxToLonLat(x, y, z) {
    const s = TILE * Math.pow(2, z);
    const lon = x / s * 360 - 180;
    const n = Math.PI - 2 * Math.PI * y / s;
    return [lon, 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))];
  }
  function distM(a, b) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    const r = Math.PI / 180;
    const y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
    const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
    const deg = (Math.atan2(y, x) / r + 360) % 360;
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
  }
  function fmtDist(m) {
    const mi = m / 1609.34;
    return mi < 0.2 ? Math.round(m * FT) + ' ft' : mi.toFixed(mi < 10 ? 1 : 0) + ' mi';
  }
  function fromHere(ll) {
    const o = gpsFix ? [gpsFix.lat, gpsFix.lon] : [map.getCenter().lat, map.getCenter().lng];
    return fmtDist(distM(o, ll)) + ' ' + bearing(o, ll) + (gpsFix ? ' of you' : ' of crosshair');
  }
  // American Forests champion-tree points: trunk circumference (in) + height (ft) + ¼ crown spread (ft).
  function bigTreePoints(t) {
    if (!t.circIn && !t.heightFt && !t.crownFt) return null;
    return Math.round((+t.circIn || 0) + (+t.heightFt || 0) + 0.25 * (+t.crownFt || 0));
  }
  async function fetchJSON(url, opts, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms || 20000);
    try {
      const r = await fetch(url, Object.assign({ signal: ctl.signal }, opts || {}));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  // ---------- Map ----------
  const START = state.view || { lat: 36.95, lon: -107.45, z: 10 }; // between Ignacio, Navajo Dam and Dulce
  const map = L.map('map', { zoomControl: false, attributionControl: true, maxZoom: 18 }).setView([START.lat, START.lon], START.z);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.scale({ imperial: true, metric: false, position: 'bottomleft' }).addTo(map);
  map.attributionControl.setPrefix('');

  const bases = {
    topo: L.tileLayer(SRC.topo, { maxNativeZoom: 16, maxZoom: 18, attribution: 'USGS The National Map' }),
    img: L.tileLayer(SRC.img, { maxNativeZoom: 16, maxZoom: 18, attribution: 'USGS The National Map' }),
  };
  const EXT = 20037508.342789244;
  const ExportLayer = L.TileLayer.extend({
    getTileUrl(c) {
      const size = 2 * EXT / Math.pow(2, c.z);
      const minx = -EXT + c.x * size, maxy = EXT - c.y * size;
      const bbox = [minx, maxy - size, minx + size, maxy].map(v => v.toFixed(2)).join(',');
      return this._url + '/export?bbox=' + bbox + '&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&dpi=96&f=image';
    },
  });
  const overlays = {
    land: new ExportLayer(SRC.land, { opacity: 0.45, maxZoom: 18, attribution: 'BLM Surface Management Agency' }),
    relief: L.tileLayer(SRC.relief, { opacity: 0.35, maxNativeZoom: 16, maxZoom: 18 }),
    geo: L.tileLayer(SRC.geoTiles, { opacity: 0.5, maxNativeZoom: 16, maxZoom: 18, attribution: 'Macrostrat' }),
  };
  function setBase(k) {
    Object.values(bases).forEach(l => map.removeLayer(l));
    bases[k].addTo(map); bases[k].bringToBack();
    state.base = k; save();
    $$('#base-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.base === k)));
  }
  function setOverlay(k, on) {
    if (on) overlays[k].addTo(map); else map.removeLayer(overlays[k]);
    state.ov = Object.keys(overlays).filter(x => map.hasLayer(overlays[x])); save();
    $$('#ov-chips .chip').forEach(b => b.setAttribute('aria-pressed', String(state.ov.includes(b.dataset.ov))));
  }
  setBase(state.base in bases ? state.base : 'topo');
  ['land', 'relief', 'geo'].forEach(k => setOverlay(k, state.ov.includes(k)));
  map.on('moveend', () => { const c = map.getCenter(); state.view = { lat: c.lat, lon: c.lng, z: map.getZoom() }; save(); });

  const treeLayer = L.layerGroup().addTo(map);
  const candLayer = L.layerGroup().addTo(map);
  let heatOverlay = null, windowOutline = null;

  // ---------- GPS ----------
  let gpsFix = null, gpsWatch = null, follow = false, gpsMarker = null, gpsCircle = null;
  function startGps() {
    if (!navigator.geolocation) { $('#gps').textContent = 'No GPS in this browser'; return; }
    if (gpsWatch !== null) return;
    $('#gps').textContent = 'Finding GPS…';
    gpsWatch = navigator.geolocation.watchPosition(p => {
      gpsFix = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, alt: p.coords.altitude };
      const ll = [gpsFix.lat, gpsFix.lon];
      if (!gpsMarker) {
        gpsCircle = L.circle(ll, { radius: gpsFix.acc, color: '#1f6feb', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map);
        gpsMarker = L.circleMarker(ll, { radius: 7, color: '#fff', weight: 3, fillColor: '#1f6feb', fillOpacity: 1, interactive: false }).addTo(map);
      } else { gpsMarker.setLatLng(ll); gpsCircle.setLatLng(ll).setRadius(gpsFix.acc); }
      $('#gps').innerHTML = '<b>' + gpsFix.lat.toFixed(5) + ', ' + gpsFix.lon.toFixed(5) + '</b><br>±' + Math.round(gpsFix.acc * FT) + ' ft';
      if (follow) map.setView(ll, Math.max(map.getZoom(), 15));
      updateAddLoc();
    }, err => {
      $('#gps').textContent = err.code === 1 ? 'GPS blocked in settings' : 'No GPS fix';
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }
  $('#tb-locate').addEventListener('click', () => {
    startGps();
    follow = !follow;
    $('#tb-locate').setAttribute('aria-pressed', String(follow));
    if (follow && gpsFix) map.setView([gpsFix.lat, gpsFix.lon], Math.max(map.getZoom(), 15));
  });
  map.on('dragstart', () => { if (follow) { follow = false; $('#tb-locate').setAttribute('aria-pressed', 'false'); } });
  startGps();

  // ---------- Sheets ----------
  const sheets = { add: '#sh-add', find: '#sh-find', layers: '#sh-layers', trees: '#sh-trees' };
  let openSheet = null;
  function showSheet(name) {
    Object.entries(sheets).forEach(([k, s]) => { $(s).hidden = k !== name; });
    openSheet = name;
    $$('.toolbar .tb:not(.primary)').forEach(b => b.classList.remove('active'));
    const tb = name && $('#tb-' + name); if (tb && !tb.classList.contains('primary')) tb.classList.add('active');
  }
  $$('[data-close]').forEach(b => b.addEventListener('click', () => showSheet(null)));
  $('#tb-find').addEventListener('click', () => { if (openSheet === 'find') return showSheet(null); refreshTargets(); showSheet('find'); });
  $('#tb-layers').addEventListener('click', () => { if (openSheet === 'layers') return showSheet(null); loadLegend(); showSheet('layers'); });
  $('#tb-trees').addEventListener('click', () => { if (openSheet === 'trees') return showSheet(null); renderTreeList(); showSheet('trees'); });

  // ---------- Layers sheet ----------
  $('#base-seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setBase(b.dataset.base); });
  $('#ov-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setOverlay(b.dataset.ov, b.getAttribute('aria-pressed') !== 'true'); });
  $('#land-op').addEventListener('input', e => overlays.land.setOpacity(+e.target.value));
  let legendLoaded = false;
  async function loadLegend() {
    if (legendLoaded) return;
    try {
      const j = await fetchJSON(SRC.land + '/legend?f=json');
      const rows = [];
      (j.layers || []).forEach(l => (l.legend || []).forEach(g => {
        const label = g.label || l.layerName;
        if (label && !rows.some(r => r.label === label)) rows.push({ label, img: g.imageData, type: g.contentType || 'image/png' });
      }));
      if (!rows.length) throw new Error('empty');
      $('#legend').innerHTML = rows.map(r => '<div><img alt="" src="data:' + esc(r.type) + ';base64,' + esc(r.img) + '"><span>' + esc(r.label) + '</span></div>').join('');
      legendLoaded = true;
    } catch (e) {
      $('#legend').innerHTML = '<p class="hint">Could not load the key (no signal, or the BLM server is down). Usual colors: yellow = BLM, green = National Forest, blue = state, tan/orange = tribal (BIA), purple = National Park.</p>';
    }
  }

  // ---------- Lookups: land status, soil, geology ----------
  async function landAt(lat, lon) {
    const d = 0.01;
    const url = SRC.land + '/identify?geometry=' + lon + ',' + lat + '&geometryType=esriGeometryPoint&sr=4326&layers=all&tolerance=2' +
      '&mapExtent=' + (lon - d) + ',' + (lat - d) + ',' + (lon + d) + ',' + (lat + d) + '&imageDisplay=400,400,96&returnGeometry=false&f=json';
    const j = await fetchJSON(url);
    const res = j.results || [];
    if (!res.length) return { owner: 'Private or unrecorded', private: true, detail: '' };
    const a = res[0].attributes || {};
    const pick = (re) => { const k = Object.keys(a).find(k => re.test(k) && a[k] && a[k] !== 'Null'); return k ? a[k] : ''; };
    const owner = pick(/AGENCY.*NAME|ADMIN_AGENCY|AGENCY/i) || res[0].layerName || 'Managed land';
    const unit = pick(/UNIT.*NAME|ADMIN_UNIT|DEPT/i);
    const tribal = /BIA|INDIAN|TRIB|RESERV/i.test(owner + ' ' + unit + ' ' + (res[0].layerName || ''));
    return { owner: String(owner), detail: unit ? String(unit) : '', tribal };
  }
  async function soilAt(lat, lon) {
    const wkt = 'point(' + lon.toFixed(6) + ' ' + lat.toFixed(6) + ')';
    const q = "SELECT TOP 1 mu.mukey, mu.muname, c.compname, c.comppct_r, c.taxclname, c.drainagecl " +
      "FROM mapunit mu LEFT JOIN component c ON c.mukey = mu.mukey AND c.majcompflag = 'Yes' " +
      "WHERE mu.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('" + wkt + "')) ORDER BY c.comppct_r DESC";
    const j = await sda(q);
    const t = j && j.Table;
    if (!t || t.length < 2) return { name: 'No soil survey here', none: true };
    const row = Object.fromEntries(t[0].map((c, i) => [c, t[1][i]]));
    const out = { mukey: row.mukey, name: row.muname, comp: row.compname, pct: row.comppct_r, tax: row.taxclname, drainage: row.drainagecl };
    try { // optional extras; column names vary between SSURGO releases, so failure is fine
      const j2 = await sda("SELECT aws0150wta, brockdepmin FROM muaggatt WHERE mukey = '" + row.mukey + "'");
      if (j2 && j2.Table && j2.Table.length > 1) {
        const r2 = Object.fromEntries(j2.Table[0].map((c, i) => [c, j2.Table[1][i]]));
        out.water = r2.aws0150wta; out.bedrock = r2.brockdepmin;
      }
    } catch (e) { /* skip */ }
    return out;
  }
  async function sda(query) {
    try {
      return await fetchJSON(SRC.soil, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, format: 'JSON+COLUMNNAME' }) });
    } catch (e) { // some setups only accept form posts
      const body = new URLSearchParams({ query, format: 'JSON+COLUMNNAME' });
      return await fetchJSON(SRC.soil, { method: 'POST', body });
    }
  }
  async function geoAt(lat, lon) {
    const j = await fetchJSON(SRC.geoPoint + '?lat=' + lat.toFixed(5) + '&lng=' + lon.toFixed(5));
    const d = (j.success && j.success.data) || j.data || [];
    const u = d[0];
    if (!u) return { name: 'No geologic map unit' };
    const age = [u.b_int_name, u.t_int_name].filter(Boolean);
    return {
      name: u.name || u.strat_name || 'Unnamed unit',
      lith: u.lith || '',
      age: age.length === 2 && age[0] !== age[1] ? age.join(' to ') : (age[0] || ''),
      desc: (u.descrip || '').slice(0, 220),
    };
  }
  function landHtml(l) {
    if (!l) return '';
    let s = '<b>' + esc(l.owner) + '</b>' + (l.detail ? '<br><span class="hint">' + esc(l.detail) + '</span>' : '');
    if (l.tribal) s += '<br><span style="color:var(--warn)">Tribal land: needs a tribal permit.</span>';
    if (l.private) s += '<br><span style="color:var(--warn)">Ask permission before going in.</span>';
    return s;
  }
  function soilHtml(s) {
    if (!s) return '';
    if (s.none) return esc(s.name);
    const bits = [esc(s.name)];
    if (s.comp) bits.push(esc(s.comp) + (s.pct ? ' (' + esc(s.pct) + '%)' : ''));
    if (s.drainage) bits.push(esc(s.drainage));
    if (s.bedrock != null && s.bedrock !== '') bits.push('bedrock ~' + Math.round(s.bedrock / 2.54) + ' in down');
    if (s.water != null && s.water !== '') bits.push('holds ' + (+s.water / 2.54).toFixed(1) + ' in water (top 5 ft)');
    return bits.join('<br>');
  }
  function geoHtml(g) {
    if (!g) return '';
    return '<b>' + esc(g.name) + '</b>' + (g.age ? '<br>' + esc(g.age) : '') + (g.lith ? '<br><span class="hint">' + esc(g.lith) + '</span>' : '');
  }

  // ---------- Elevation tiles & analysis windows ----------
  const tileCache = new Map();
  function demTile(x, y) {
    const k = x + '/' + y;
    if (!tileCache.has(k)) {
      tileCache.set(k, (async () => {
        const url = SRC.dem.replace('{z}', DEM_Z).replace('{x}', x).replace('{y}', y);
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) throw new Error('Elevation tile HTTP ' + r.status);
        const blob = await r.blob();
        const img = await new Promise((res, rej) => {
          const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Bad elevation tile'));
          im.src = URL.createObjectURL(blob);
        });
        const c = document.createElement('canvas'); c.width = c.height = TILE;
        const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
        const px = cx.getImageData(0, 0, TILE, TILE).data;
        const out = new Float32Array(TILE * TILE);
        for (let i = 0; i < out.length; i++) out[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
        return out;
      })().catch(e => { tileCache.delete(k); throw e; }));
    }
    return tileCache.get(k);
  }
  async function elevAt(lat, lon) {
    const [px, py] = lonLatToPx(lon, lat, DEM_Z);
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const t = await demTile(tx, ty);
    return t[Math.floor(py - ty * TILE) * TILE + Math.floor(px - tx * TILE)];
  }
  // Windows snap to the tile grid so the same ground always gets the same window (cache friendly).
  function windowFor(lat, lon) {
    const [px, py] = lonLatToPx(lon, lat, DEM_Z);
    const tx0 = Math.floor(px / TILE) - 1, ty0 = Math.floor(py / TILE) - 1;
    const x0 = tx0 * TILE, y0 = ty0 * TILE;
    const nw = pxToLonLat(x0, y0, DEM_Z), se = pxToLonLat(x0 + WIN, y0 + WIN, DEM_Z);
    const res = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, DEM_Z);
    return { key: tx0 + ',' + ty0, tx0, ty0, x0, y0, nw, se, res, px: Math.floor(px - x0), py: Math.floor(py - y0) };
  }
  function roadsUrl(w) {
    const s = w.se[1].toFixed(4), n = w.nw[1].toFixed(4), wl = w.nw[0].toFixed(4), e = w.se[0].toFixed(4);
    const q = '[out:json][timeout:25];way["highway"]["highway"!~"footway|path|cycleway|bridleway|steps|pedestrian|corridor|proposed|construction"](' + s + ',' + wl + ',' + n + ',' + e + ');out geom;';
    return SRC.overpass + '?data=' + encodeURIComponent(q);
  }
  async function roadSegs(w) {
    const j = await fetchJSON(roadsUrl(w), null, 30000);
    const segs = [];
    (j.elements || []).forEach(el => {
      const g = el.geometry || [];
      for (let i = 1; i < g.length; i++) {
        const a = lonLatToPx(g[i - 1].lon, g[i - 1].lat, DEM_Z), b = lonLatToPx(g[i].lon, g[i].lat, DEM_Z);
        segs.push(a[0] - w.x0, a[1] - w.y0, b[0] - w.x0, b[1] - w.y0);
      }
    });
    return segs;
  }

  const worker = new Worker('worker.js');
  let rid = 0; const pending = new Map();
  worker.onmessage = e => { const p = pending.get(e.data.rid); if (!p) return; pending.delete(e.data.rid); e.data.ok ? p.res(e.data) : p.rej(new Error(e.data.error)); };
  const ask = (msg, transfer) => new Promise((res, rej) => { const id = ++rid; pending.set(id, { res, rej }); worker.postMessage(Object.assign({ rid: id }, msg), transfer || []); });

  const windowInfo = new Map(); // key -> { roads: bool }
  async function ensureWindow(w, onStep) {
    const has = await ask({ cmd: 'has', key: w.key });
    if (has.has) return windowInfo.get(w.key) || { roads: false };
    onStep && onStep('Loading elevation…');
    const dem = new Float32Array(WIN * WIN);
    const jobs = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      jobs.push(demTile(w.tx0 + i, w.ty0 + j).then(t => {
        for (let r = 0; r < TILE; r++) dem.set(t.subarray(r * TILE, (r + 1) * TILE), (j * TILE + r) * WIN + i * TILE);
      }));
    }
    await Promise.all(jobs);
    onStep && onStep('Loading roads…');
    let segs = [], roads = true;
    try { segs = await roadSegs(w); } catch (e) { roads = false; }
    onStep && onStep('Reading the terrain…');
    await ask({ cmd: 'load', key: w.key, dem: dem.buffer, n: WIN, res: w.res, segs }, [dem.buffer]);
    const info = { roads };
    windowInfo.set(w.key, info);
    return info;
  }
  async function fingerprint(lat, lon) {
    const w = windowFor(lat, lon);
    const info = await ensureWindow(w);
    const r = await ask({ cmd: 'fp', key: w.key, pts: [[w.px, w.py]] });
    const fp = r.fps[0];
    if (!info.roads) fp.road = null;
    return fp;
  }

  // Fill in terrain + lookups for a tree in the background; keeps going if any piece fails.
  async function enrich(t, opts) {
    const force = opts && opts.force;
    const jobs = [];
    if (force || !t.fp) jobs.push(fingerprint(t.lat, t.lon).then(fp => { t.fp = fp; }).catch(() => {}));
    if (force || !t.land) jobs.push(landAt(t.lat, t.lon).then(v => { t.land = v; }).catch(() => {}));
    if (force || !t.soil) jobs.push(soilAt(t.lat, t.lon).then(v => { t.soil = v; }).catch(() => {}));
    if (force || !t.geo) jobs.push(geoAt(t.lat, t.lon).then(v => { t.geo = v; }).catch(() => {}));
    await Promise.all(jobs);
    save(); drawTrees();
  }

  // ---------- Trees on the map ----------
  function typeLabel(t) { return t.type ? t.type : SPECIES[t.species].label; }
  function drawTrees() {
    treeLayer.clearLayers();
    state.trees.forEach(t => {
      const icon = t.kind === 'empty'
        ? L.divIcon({ className: '', html: '<div class="empty-pin"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
        : L.divIcon({ className: '', html: '<div class="tree-pin" style="background:' + SPECIES[t.species].color + '"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
      L.marker([t.lat, t.lon], { icon, keyboard: true, title: t.kind === 'empty' ? 'Checked spot' : typeLabel(t) })
        .on('click', () => treePopup(t)).addTo(treeLayer);
    });
  }
  function fpHtml(fp) {
    if (!fp) return '<p class="hint">Terrain not read yet (needs signal once).</p>';
    return '<dl class="kv">' + Analysis.VARS.filter(v => fp[v.key] != null).map(v =>
      '<dt>' + esc(v.label.replace(/ \(.*\)/, '')) + '</dt><dd>' + esc(v.show(fp[v.key])) + (v.unit ? ' ' + v.unit : '') + '</dd>').join('') + '</dl>';
  }
  function treePopup(t) {
    const pts = bigTreePoints(t);
    const head = t.kind === 'empty' ? 'Checked, nothing big' : esc(typeLabel(t));
    const size = t.kind === 'empty' ? '' : [t.circIn ? t.circIn + ' in around' : '', t.heightFt ? t.heightFt + ' ft tall' : '', t.crownFt ? t.crownFt + ' ft crown' : ''].filter(Boolean).join(' · ');
    const html = '<h3>' + head + '</h3>' +
      (size ? '<div>' + esc(size) + (pts ? ' · <b>' + pts + ' pts</b>' : '') + '</div>' : '') +
      (t.notes ? '<p style="margin:6px 0">' + esc(t.notes) + '</p>' : '') +
      '<div class="hint">' + esc(fromHere([t.lat, t.lon])) + ' · ' + new Date(t.date).toLocaleDateString() + '</div>' +
      (t.land ? '<p class="eyebrow" style="margin-top:8px">Land</p>' + landHtml(t.land) : '') +
      (t.soil ? '<p class="eyebrow" style="margin-top:8px">Soil</p>' + soilHtml(t.soil) : '') +
      (t.geo ? '<p class="eyebrow" style="margin-top:8px">Rock</p>' + geoHtml(t.geo) : '') +
      '<details style="margin-top:8px"><summary>Terrain fingerprint</summary>' + fpHtml(t.fp) + '</details>' +
      '<div class="pop-actions"><button class="btn" data-act="edit">Edit</button><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + t.lat + ',' + t.lon + '">Directions</a></div>';
    const p = L.popup({ maxWidth: 300 }).setLatLng([t.lat, t.lon]).setContent(html).openOn(map);
    p.getElement().querySelector('[data-act=edit]').addEventListener('click', () => { map.closePopup(); openEditor(t); });
  }

  // ---------- Add / edit ----------
  let editing = null, form = { kind: 'tree', species: 'juniper', where: 'gps' };
  function rememberedTypes(sp) {
    const mine = Object.keys(state.types[sp] || {}).sort((a, b) => state.types[sp][b] - state.types[sp][a]);
    return mine.concat(SPECIES[sp].suggest.filter(s => !mine.some(m => m.toLowerCase() === s.toLowerCase())));
  }
  function renderTypeChoices() {
    const list = rememberedTypes(form.species);
    $('#type-list').innerHTML = list.map(t => '<option value="' + esc(t) + '"></option>').join('');
    $('#type-chips').innerHTML = list.slice(0, 6).map(t => '<button class="chip" type="button" data-t="' + esc(t) + '" aria-pressed="' + ($('#add-type').value === t) + '">' + esc(t) + '</button>').join('');
    $('#add-type').placeholder = 'e.g. ' + (list[0] || SPECIES[form.species].suggest[0]);
  }
  function setPressed(groupSel, attr, val) { $$(groupSel + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === val))); }
  function renderForm() {
    setPressed('#add-kind', 'kind', form.kind);
    setPressed('#add-species', 'sp', form.species);
    setPressed('#add-where', 'where', form.where);
    const empty = form.kind === 'empty';
    $('#kind-hint').textContent = empty
      ? 'Log places you checked that had nothing big. The finder ranks look-alike ground lower.'
      : 'Write in the exact type below. Next time it shows up as a one-tap choice.';
    $('#size-row').hidden = empty; $('#add-points').hidden = empty;
    $('#type-wrap').hidden = false;
    renderTypeChoices(); updatePoints(); updateAddLoc();
  }
  function updatePoints() {
    const p = bigTreePoints({ circIn: $('#add-circ').value, heightFt: $('#add-height').value, crownFt: $('#add-crown').value });
    $('#add-points').textContent = p ? 'Big-tree score: ' + p + ' points (trunk inches + height ft + ¼ crown ft, the American Forests formula).' : 'Measure the trunk around at 4.5 ft up, or below the lowest fork on a multi-stem juniper.';
  }
  function addPosition() {
    if (editing && form.where === 'keep') return { lat: editing.lat, lon: editing.lon, acc: editing.acc };
    if (form.where === 'gps' && gpsFix) return { lat: gpsFix.lat, lon: gpsFix.lon, acc: gpsFix.acc };
    if (form.where === 'cross') { const c = map.getCenter(); return { lat: c.lat, lon: c.lng, acc: null }; }
    return null;
  }
  function updateAddLoc() {
    if (openSheet !== 'add') return;
    const p = addPosition();
    const el = $('#add-loc');
    if (!p) { el.textContent = 'Waiting for GPS… or switch to Map crosshair.'; el.className = 'status warn'; $('#add-save').disabled = true; return; }
    $('#add-save').disabled = false;
    el.className = 'status' + (p.acc && p.acc > 30 ? ' warn' : '');
    el.textContent = (form.where === 'keep' ? 'Saved spot: ' : form.where === 'cross' ? 'Crosshair: ' : 'GPS: ') +
      p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) + (p.acc ? ' (±' + Math.round(p.acc * FT) + ' ft' + (p.acc > 30 ? '; wait a moment for a tighter fix' : '') + ')' : '');
  }
  function openEditor(t) {
    editing = t || null;
    form = t ? { kind: t.kind || 'tree', species: t.species, where: 'keep' } : { kind: 'tree', species: form.species, where: gpsFix ? 'gps' : 'cross' };
    $('#h-add').textContent = t ? 'Edit entry' : 'Log a tree';
    $('#add-type').value = t ? (t.type || '') : '';
    $('#add-circ').value = t && t.circIn || ''; $('#add-height').value = t && t.heightFt || ''; $('#add-crown').value = t && t.crownFt || '';
    $('#add-notes').value = t && t.notes || '';
    $('#add-delete').hidden = !t; $('#del-confirm').hidden = true;
    const keepBtn = $('#add-where [data-where=keep]');
    if (t && !keepBtn) $('#add-where').insertAdjacentHTML('afterbegin', '<button data-where="keep" aria-pressed="true">Saved spot</button>');
    if (!t && keepBtn) keepBtn.remove();
    showSheet('add'); renderForm();
  }
  $('#tb-add').addEventListener('click', () => { if (openSheet === 'add') return showSheet(null); openEditor(null); });
  $('#add-kind').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { form.kind = b.dataset.kind; renderForm(); } });
  $('#add-species').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { form.species = b.dataset.sp; $('#add-type').value = ''; renderForm(); } });
  $('#add-where').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { form.where = b.dataset.where; renderForm(); } });
  $('#type-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { $('#add-type').value = b.dataset.t; renderTypeChoices(); } });
  ['#add-circ', '#add-height', '#add-crown'].forEach(s => $(s).addEventListener('input', updatePoints));
  $('#add-save').addEventListener('click', () => {
    const p = addPosition(); if (!p) return;
    const type = $('#add-type').value.trim().replace(/\s+/g, ' ');
    if (type) { state.types[form.species] = state.types[form.species] || {}; state.types[form.species][type] = (state.types[form.species][type] || 0) + 1; }
    const num = s => { const v = parseFloat($(s).value); return Number.isFinite(v) && v > 0 ? v : null; };
    const moved = !editing || form.where !== 'keep';
    const t = editing || { id: uid(), date: new Date().toISOString() };
    Object.assign(t, {
      kind: form.kind, species: form.species, type,
      lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), acc: p.acc ? Math.round(p.acc) : null,
      circIn: form.kind === 'tree' ? num('#add-circ') : null,
      heightFt: form.kind === 'tree' ? num('#add-height') : null,
      crownFt: form.kind === 'tree' ? num('#add-crown') : null,
      notes: $('#add-notes').value.trim(),
    });
    if (moved) { delete t.fp; delete t.land; delete t.soil; delete t.geo; }
    if (!editing) state.trees.push(t);
    save(); drawTrees(); showSheet(null);
    toast(form.kind === 'empty' ? 'Saved checked spot' : 'Saved ' + typeLabel(t));
    enrich(t);
  });
  $('#add-delete').addEventListener('click', () => { $('#del-confirm').hidden = false; });
  $('#del-no').addEventListener('click', () => { $('#del-confirm').hidden = true; });
  $('#del-yes').addEventListener('click', () => {
    state.trees = state.trees.filter(x => x !== editing); save(); drawTrees(); showSheet(null); toast('Deleted');
  });

  // ---------- Tap the map: what's here ----------
  map.on('click', async (e) => {
    if (openSheet) { showSheet(null); return; }
    const { lat, lng } = e.latlng;
    const pop = L.popup({ maxWidth: 300 }).setLatLng(e.latlng).setContent('<h3>This spot</h3><div class="hint">' + esc(fromHere([lat, lng])) + '</div><div id="here-body" class="hint">Looking up…</div>').openOn(map);
    const parts = { land: '…', elev: '…', soil: '…', geo: '…' };
    const render = () => {
      const el = pop.getElement() && pop.getElement().querySelector('#here-body'); if (!el) return;
      el.className = '';
      el.innerHTML = '<p class="eyebrow" style="margin-top:6px">Land</p>' + parts.land +
        '<p class="eyebrow" style="margin-top:8px">Elevation</p>' + parts.elev +
        '<p class="eyebrow" style="margin-top:8px">Soil</p>' + parts.soil +
        '<p class="eyebrow" style="margin-top:8px">Rock</p>' + parts.geo;
    };
    render();
    const fail = '<span class="hint">Unavailable (no signal?)</span>';
    landAt(lat, lng).then(v => { parts.land = landHtml(v); }, () => { parts.land = fail; }).then(render);
    elevAt(lat, lng).then(v => { parts.elev = Math.round(v * FT).toLocaleString() + ' ft'; }, () => { parts.elev = fail; }).then(render);
    soilAt(lat, lng).then(v => { parts.soil = soilHtml(v); }, () => { parts.soil = fail; }).then(render);
    geoAt(lat, lng).then(v => { parts.geo = geoHtml(v); }, () => { parts.geo = fail; }).then(render);
  });

  // ---------- Find more ----------
  function refreshTargets() {
    const sel = $('#find-target'); const prev = sel.value;
    const trees = state.trees.filter(t => t.kind !== 'empty');
    const opts = [];
    Object.keys(SPECIES).forEach(sp => {
      const ofSp = trees.filter(t => t.species === sp);
      if (!ofSp.length) return;
      opts.push(['sp:' + sp, 'All ' + SPECIES[sp].label.toLowerCase() + ' (' + ofSp.length + ')']);
      const types = {};
      ofSp.forEach(t => { if (t.type) types[t.type] = (types[t.type] || 0) + 1; });
      Object.keys(types).sort().forEach(ty => opts.push(['ty:' + sp + ':' + ty, '  ' + ty + ' only (' + types[ty] + ')']));
    });
    if (trees.length > 0) opts.push(['all', 'Every tree logged (' + trees.length + ')']);
    sel.innerHTML = opts.length ? opts.map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join('') : '<option value="">Log a tree first</option>';
    if (opts.some(o => o[0] === prev)) sel.value = prev;
    $('#find-run').disabled = !opts.length;
  }
  function targetTrees(v) {
    const trees = state.trees.filter(t => t.kind !== 'empty');
    if (v === 'all') return trees;
    if (v.startsWith('sp:')) return trees.filter(t => t.species === v.slice(3));
    if (v.startsWith('ty:')) { const [, sp, ...rest] = v.split(':'); const ty = rest.join(':'); return trees.filter(t => t.species === sp && t.type === ty); }
    return [];
  }
  $('#find-factors').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
  function findStatus(msg, warn) { const s = $('#find-status'); s.hidden = !msg; s.textContent = msg || ''; s.className = 'status' + (warn ? ' warn' : ''); }

  $('#find-run').addEventListener('click', async () => {
    const trees = targetTrees($('#find-target').value);
    const factors = $$('#find-factors .chip[aria-pressed=true]').map(b => b.dataset.f);
    if (!trees.length) return findStatus('Log at least one tree of this kind first.', true);
    if (!factors.length) return findStatus('Pick at least one thing to match on.', true);
    $('#find-run').disabled = true;
    try {
      // Make sure every tree has its terrain read.
      const missing = trees.filter(t => !t.fp);
      for (let i = 0; i < missing.length; i++) {
        findStatus('Reading terrain at your trees (' + (i + 1) + '/' + missing.length + ')…');
        try { missing[i].fp = await fingerprint(missing[i].lat, missing[i].lon); } catch (e) { /* skip that tree */ }
      }
      save();
      const usable = trees.filter(t => t.fp);
      if (!usable.length) throw new Error('Could not read terrain at any of these trees. Check signal and run the data check.');
      const empties = state.trees.filter(t => t.kind === 'empty' && t.fp && (t.species === usable[0].species || $('#find-target').value === 'all'));
      const c = map.getCenter();
      const w = windowFor(c.lat, c.lng);
      const info = await ensureWindow(w, findStatus);
      findStatus('Scoring…');
      const bw = 1.15 - +$('#find-bw').value; // slider right = stricter (0.25 strict … 0.9 loose)
      const r = await ask({ cmd: 'score', key: w.key, trees: usable.map(t => t.fp), empties: empties.map(t => t.fp), factors, bw, res: w.res });
      drawHeat(w, new Float32Array(r.score));
      showCandidates(w, r.peaks);
      const notes = [];
      if (usable.length < trees.length) notes.push((trees.length - usable.length) + ' tree(s) skipped: no terrain yet.');
      if (!info.roads && factors.includes('road')) notes.push('Roads did not load, so road distance was left out.');
      if (usable.length < 5) notes.push('With ' + usable.length + ' tree' + (usable.length === 1 ? '' : 's') + ', this finds ground like those exact spots. It gets smarter around 15–30.');
      const best = r.peaks.length ? r.peaks[0].score : 0;
      if (best < 0.4) notes.unshift('Weak matches only. This area is unlike your trees on at least one factor; try turning one off, or pan to other ground.');
      findStatus(r.peaks.length ? notes.join(' ') : 'Nothing in this area resembles your trees. ' + notes.join(' '), !r.peaks.length || best < 0.4);
    } catch (e) {
      findStatus(e.message || 'Something failed. Run the data check under Trees.', true);
    } finally { $('#find-run').disabled = false; }
  });
  function drawHeat(w, s) {
    const c = document.createElement('canvas'); c.width = c.height = WIN;
    const cx = c.getContext('2d'); const img = cx.createImageData(WIN, WIN);
    // Shade only the best ~15% of ground in view so the map underneath stays readable.
    let top = 0; const sample = [];
    for (let k = 0; k < s.length; k++) { if (s[k] > top) top = s[k]; if (k % 13 === 0) sample.push(s[k]); }
    sample.sort((a, b) => a - b);
    const floor = Math.max(sample[Math.floor(sample.length * 0.85)] || 0, top * 0.35, 0.05);
    const span = Math.max(1e-6, top - floor);
    for (let k = 0; k < s.length; k++) {
      const v = s[k]; if (v < floor) continue;
      const t = Math.min(1, (v - floor) / span);
      img.data[k * 4] = 179 + 60 * t; img.data[k * 4 + 1] = 36 * (1 - t); img.data[k * 4 + 2] = 107 + 40 * t;
      img.data[k * 4 + 3] = Math.round(70 + 160 * t);
    }
    cx.putImageData(img, 0, 0);
    if (heatOverlay) map.removeLayer(heatOverlay);
    if (windowOutline) map.removeLayer(windowOutline);
    const b = [[w.se[1], w.nw[0]], [w.nw[1], w.se[0]]];
    heatOverlay = L.imageOverlay(c.toDataURL(), b, { opacity: 0.85, interactive: false }).addTo(map);
    windowOutline = L.rectangle(b, { color: '#b3246b', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(map);
  }
  let lastCands = [];
  function showCandidates(w, peaks) {
    candLayer.clearLayers();
    lastCands = peaks.map((p, i) => {
      const [lon, lat] = pxToLonLat(w.x0 + p.x + 0.5, w.y0 + p.y + 0.5, DEM_Z);
      return { rank: i + 1, lat, lon, score: p.score };
    });
    lastCands.forEach(c => {
      L.marker([c.lat, c.lon], { icon: L.divIcon({ className: '', html: '<div class="cand-pin">' + c.rank + '</div>', iconSize: [28, 28], iconAnchor: [14, 14] }), title: 'Spot ' + c.rank })
        .on('click', () => candPopup(c)).addTo(candLayer);
    });
    $('#find-results').hidden = !lastCands.length;
    $('#find-list').innerHTML = lastCands.map(c =>
      '<button class="item" data-r="' + c.rank + '"><span class="dot" style="background:var(--heat)"></span><span class="t"><b>Spot ' + c.rank + '</b><span>' + esc(fromHere([c.lat, c.lon])) + '</span></span><span class="n">' + Math.round(c.score * 100) + '%</span></button>').join('');
  }
  $('#find-list').addEventListener('click', e => {
    const b = e.target.closest('.item'); if (!b) return;
    const c = lastCands[+b.dataset.r - 1]; showSheet(null);
    map.setView([c.lat, c.lon], Math.max(map.getZoom(), 15)); candPopup(c);
  });
  function candPopup(c) {
    const html = '<h3>Spot ' + c.rank + ' · ' + Math.round(c.score * 100) + '% match</h3><div class="hint">' + esc(fromHere([c.lat, c.lon])) + '</div><div class="land">Checking land…</div>' +
      '<div class="pop-actions"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + c.lat.toFixed(6) + ',' + c.lon.toFixed(6) + '">Directions</a></div>';
    const p = L.popup({ maxWidth: 300 }).setLatLng([c.lat, c.lon]).setContent(html).openOn(map);
    landAt(c.lat, c.lon).then(v => landHtml(v), () => '<span class="hint">Land status unavailable</span>').then(h => {
      const el = p.getElement() && p.getElement().querySelector('.land'); if (el) el.innerHTML = '<p class="eyebrow" style="margin-top:6px">Land</p>' + h;
    });
  }
  $('#find-clear').addEventListener('click', () => {
    if (heatOverlay) map.removeLayer(heatOverlay); if (windowOutline) map.removeLayer(windowOutline);
    heatOverlay = windowOutline = null; candLayer.clearLayers(); lastCands = []; $('#find-results').hidden = true; findStatus('');
  });

  // ---------- Tree list ----------
  function renderTreeList() {
    const trees = state.trees.slice().sort((a, b) => (bigTreePoints(b) || 0) - (bigTreePoints(a) || 0) || b.date.localeCompare(a.date));
    const n = state.trees.filter(t => t.kind !== 'empty').length;
    $('#trees-summary').textContent = n + ' tree' + (n === 1 ? '' : 's') + ' logged, ' + (state.trees.length - n) + ' checked spot' + (state.trees.length - n === 1 ? '' : 's') + '. Saved on this phone only, so back up often.';
    $('#trees-list').innerHTML = trees.length ? trees.map(t => {
      const p = bigTreePoints(t);
      const color = t.kind === 'empty' ? '#6b6b6b' : SPECIES[t.species].color;
      return '<button class="item" data-id="' + t.id + '"><span class="dot" style="background:' + color + '"></span><span class="t"><b>' +
        (t.kind === 'empty' ? 'Checked, none' : esc(typeLabel(t))) + '</b><span>' + esc(fromHere([t.lat, t.lon])) +
        (t.land ? ' · ' + esc(t.land.owner) : '') + '</span></span><span class="n">' + (p ? p + ' pts' : '') + '</span></button>';
    }).join('') : '<p class="hint" style="padding:12px;margin:0">No trees yet. Tap Add when you are standing at one.</p>';
  }
  $('#trees-list').addEventListener('click', e => {
    const b = e.target.closest('.item'); if (!b) return;
    const t = state.trees.find(x => x.id === b.dataset.id); if (!t) return;
    showSheet(null); map.setView([t.lat, t.lon], Math.max(map.getZoom(), 15)); treePopup(t);
  });

  // ---------- Export / import ----------
  const stamp = () => new Date().toISOString().slice(0, 10);
  function toJSON() { return JSON.stringify({ app: 'big-tree-scout', version: 1, exported: new Date().toISOString(), types: state.types, trees: state.trees }, null, 1); }
  function toCSV() {
    const cols = ['kind', 'species', 'type', 'lat', 'lon', 'acc_m', 'circ_in', 'height_ft', 'crown_ft', 'points', 'land', 'soil', 'rock', 'elev_ft', 'slope_deg', 'notes', 'date'];
    const q = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [cols.join(',')].concat(state.trees.map(t => [t.kind, t.species, t.type, t.lat, t.lon, t.acc, t.circIn, t.heightFt, t.crownFt, bigTreePoints(t),
      t.land && t.land.owner, t.soil && t.soil.name, t.geo && t.geo.name, t.fp && Math.round(t.fp.elev * FT), t.fp && t.fp.slope && t.fp.slope.toFixed(0), t.notes, t.date].map(q).join(','))).join('\n');
  }
  function toGPX() {
    const x = s => esc(s).replace(/&#39;/g, '&apos;');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Big Tree Scout" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      state.trees.map(t => '<wpt lat="' + t.lat + '" lon="' + t.lon + '"><time>' + t.date + '</time><name>' + x(t.kind === 'empty' ? 'Checked, none' : typeLabel(t) + (bigTreePoints(t) ? ' ' + bigTreePoints(t) + 'pts' : '')) +
        '</name><desc>' + x([SPECIES[t.species].label, t.type, t.circIn && t.circIn + ' in', t.heightFt && t.heightFt + ' ft', t.notes].filter(Boolean).join(' | ')) + '</desc></wpt>').join('\n') + '\n</gpx>\n';
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  $('#ex-json').addEventListener('click', () => download('big-trees-' + stamp() + '.json', toJSON(), 'application/json'));
  $('#ex-gpx').addEventListener('click', () => download('big-trees-' + stamp() + '.gpx', toGPX(), 'application/gpx+xml'));
  $('#ex-csv').addEventListener('click', () => download('big-trees-' + stamp() + '.csv', toCSV(), 'text/csv'));
  $('#ex-share').addEventListener('click', async () => {
    const file = new File([toJSON()], 'big-trees-' + stamp() + '.json', { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Big trees' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    download(file.name, toJSON(), 'application/json');
    toast('Saved a file. Send it by text or email; they open it with Import.', 5000);
  });
  $('#ex-import').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const text = await f.text(); e.target.value = '';
    let incoming = [];
    try {
      if (/^\s*[{[]/.test(text)) {
        const j = JSON.parse(text); incoming = j.trees || j;
        if (j.types) Object.keys(j.types).forEach(sp => { state.types[sp] = Object.assign({}, j.types[sp], state.types[sp]); });
      } else if (/<gpx/i.test(text)) {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        incoming = Array.from(doc.getElementsByTagName('wpt')).map(w => {
          const name = (w.getElementsByTagName('name')[0] || {}).textContent || '';
          const desc = (w.getElementsByTagName('desc')[0] || {}).textContent || '';
          const sp = /pin[yo]/i.test(name + desc) ? 'pinyon' : /oak/i.test(name + desc) ? 'oak' : 'juniper';
          return { lat: +w.getAttribute('lat'), lon: +w.getAttribute('lon'), species: sp, type: name.replace(/\s*\d+pts$/, ''), notes: desc, kind: /checked, none/i.test(name) ? 'empty' : 'tree' };
        });
      } else {
        const rows = text.trim().split(/\r?\n/).map(r => r.split(','));
        const h = rows[0].map(s => s.trim().toLowerCase());
        const ix = n => h.findIndex(c => n.test(c));
        const iLat = ix(/^lat/), iLon = ix(/^(lon|lng|long)/), iSp = ix(/species/), iTy = ix(/type|name/), iC = ix(/circ/), iH = ix(/height/), iN = ix(/note/);
        if (iLat < 0 || iLon < 0) throw new Error('CSV needs lat and lon columns');
        incoming = rows.slice(1).map(r => ({ lat: +r[iLat], lon: +r[iLon], species: (r[iSp] || 'juniper').trim().toLowerCase(), type: iTy >= 0 ? r[iTy] : '', circIn: iC >= 0 ? +r[iC] || null : null, heightFt: iH >= 0 ? +r[iH] || null : null, notes: iN >= 0 ? r[iN] : '' }));
      }
      let added = 0;
      incoming.forEach(t => {
        if (!Number.isFinite(+t.lat) || !Number.isFinite(+t.lon)) return;
        if (!SPECIES[t.species]) t.species = 'juniper';
        if (state.trees.some(x => (t.id && x.id === t.id) || (Math.abs(x.lat - t.lat) < 1e-6 && Math.abs(x.lon - t.lon) < 1e-6))) return;
        state.trees.push(Object.assign({ id: uid(), date: new Date().toISOString(), kind: 'tree', type: '' }, t)); added++;
      });
      save(); drawTrees(); renderTreeList(); toast('Imported ' + added + ' new entr' + (added === 1 ? 'y' : 'ies'));
    } catch (err) { toast('Could not read that file: ' + err.message, 5000); }
  });
  $('#fp-redo').addEventListener('click', async () => {
    const b = $('#fp-redo'); b.disabled = true;
    for (let i = 0; i < state.trees.length; i++) { b.textContent = 'Working ' + (i + 1) + '/' + state.trees.length + '…'; await enrich(state.trees[i], { force: true }); }
    b.textContent = 'Recompute terrain for all trees'; b.disabled = false; toast('Updated');
  });

  // ---------- Offline area ----------
  $('#off-save').addEventListener('click', async () => {
    const st = $('#off-status'); st.hidden = false; st.className = 'status';
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { st.textContent = 'Offline saving needs the app opened from its web address once with signal, then reloaded.'; st.className = 'status warn'; return; }
    const b = map.getBounds(), z0 = Math.max(10, map.getZoom()), z1 = Math.min(16, z0 + 3);
    const urls = [];
    const layers = [bases[state.base]].concat(state.ov.map(k => overlays[k]));
    for (let z = z0; z <= z1; z++) {
      const a = lonLatToPx(b.getWest(), b.getNorth(), z), c = lonLatToPx(b.getEast(), b.getSouth(), z);
      for (let x = Math.floor(a[0] / TILE); x <= Math.floor(c[0] / TILE); x++) for (let y = Math.floor(a[1] / TILE); y <= Math.floor(c[1] / TILE); y++) {
        layers.forEach(l => urls.push(l instanceof ExportLayer ? l.getTileUrl({ x, y, z }) : L.Util.template(l._url, { x, y, z, s: 'a' })));
      }
    }
    const c = map.getCenter(), w = windowFor(c.lat, c.lng);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) urls.push(SRC.dem.replace('{z}', DEM_Z).replace('{x}', w.tx0 + i).replace('{y}', w.ty0 + j));
    urls.push(roadsUrl(w));
    if (urls.length > 4000) { st.textContent = 'That view is too big (' + urls.length + ' tiles). Zoom in a step and try again.'; st.className = 'status warn'; return; }
    let done = 0, failed = 0, i = 0;
    const next = async () => {
      while (i < urls.length) {
        const u = urls[i++];
        try { const cors = /terrarium|overpass/.test(u); await fetch(u, cors ? { mode: 'cors' } : { mode: 'no-cors' }); } catch (e) { failed++; }
        done++; if (done % 20 === 0 || done === urls.length) st.textContent = 'Saving map for offline: ' + done + '/' + urls.length + (failed ? ' (' + failed + ' failed)' : '');
      }
    };
    await Promise.all([next(), next(), next(), next(), next(), next()]);
    st.textContent = 'Saved ' + (done - failed) + ' map pieces for this view, zoom ' + z0 + '–' + z1 + ', plus terrain for Find.' + (failed ? ' ' + failed + ' failed; try again with better signal.' : '');
  });

  // ---------- Data check ----------
  $('#dc-run').addEventListener('click', async () => {
    const out = $('#dc-out');
    const c = map.getCenter(), lat = c.lat, lon = c.lng;
    const tp = lonLatToPx(lon, lat, 12), tc = { z: 12, x: Math.floor(tp[0] / TILE), y: Math.floor(tp[1] / TILE) };
    const checks = [
      ['USGS topo map', () => imgOk(L.Util.template(SRC.topo, tc))],
      ['BLM land ownership map', () => imgOk(overlays.land.getTileUrl(tc))],
      ['BLM owner lookup', () => landAt(lat, lon).then(v => v.owner)],
      ['Elevation (for Find)', () => elevAt(lat, lon).then(v => Math.round(v * FT) + ' ft')],
      ['Roads (OpenStreetMap)', () => fetchJSON(SRC.overpass + '?data=' + encodeURIComponent('[out:json][timeout:10];node(1);out;'), null, 15000).then(() => 'reachable')],
      ['Soil survey (NRCS)', () => soilAt(lat, lon).then(v => v.name)],
      ['Geology (Macrostrat)', () => geoAt(lat, lon).then(v => v.name)],
      ['Offline support', () => Promise.resolve(navigator.serviceWorker && navigator.serviceWorker.controller ? 'on' : Promise.reject(new Error('reload once with signal')))],
    ];
    out.innerHTML = checks.map((ck, i) => '<div class="check"><span>' + esc(ck[0]) + '</span><span id="dc-' + i + '" class="s-wait">checking…</span></div>').join('');
    checks.forEach((ck, i) => ck[1]().then(v => { const el = $('#dc-' + i); el.className = 's-ok'; el.textContent = 'OK' + (v && v !== true ? ': ' + String(v).slice(0, 40) : ''); },
      e => { const el = $('#dc-' + i); el.className = 's-bad'; el.textContent = 'Failed: ' + String(e && e.message || e).slice(0, 50); }));
  });
  function imgOk(src) {
    return new Promise((res, rej) => { const im = new Image(); const t = setTimeout(() => rej(new Error('timed out')), 15000); im.onload = () => { clearTimeout(t); res(true); }; im.onerror = () => { clearTimeout(t); rej(new Error('did not load')); }; im.src = src; });
  }

  // ---------- Boot ----------
  drawTrees();
  state.trees.filter(t => !t.fp || !t.land).slice(0, 10).forEach(t => enrich(t));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
