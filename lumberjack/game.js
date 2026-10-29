import { BIOMES, ROWS, buildLevel } from './levels.js'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const W = 960
const H = 540
const TS = 32
const LEVEL_H = ROWS * TS
const SPR = `${import.meta.env.BASE_URL}lumberjack/sprites/`

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
canvas.width = W
canvas.height = H
ctx.imageSmoothingEnabled = false

const FONT = '"Pixelify Sans", "Courier New", monospace'

// Player sprite anchors (feet center) measured from the source art.
const PLAYER_META = {
  swing0: { ax: 43, ay: 104 },
  swing1: { ax: 55, ay: 102 },
  swing2: { ax: 44, ay: 87 },
  swing3: { ax: 42, ay: 89 },
  climb0: { ax: 49, ay: 119, tx: 31 },
  climb1: { ax: 52, ay: 119, tx: 27 },
  climb2: { ax: 51, ay: 119, tx: 22 },
  look0: { ax: 43, ay: 99 },
}

const ENEMY_NAMES = ['aspen', 'bikini', 'cactus', 'juniper', 'manzanita', 'marigold', 'oak', 'rabbitbrush', 'rose', 'sage', 'willow', 'yucca']

const images = {}
const flashes = {}

function loadImage(name, file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      images[name] = img
      resolve()
    }
    img.onerror = () => resolve()
    img.src = SPR + file
  })
}

// White silhouette of a sprite, used for hit flashes.
function flashOf(name) {
  if (flashes[name]) return flashes[name]
  const img = images[name]
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  flashes[name] = c
  return c
}

// Fade the top of a backdrop painting into transparency and record its
// average sky color, so it blends into the sky gradient without a seam.
function fadeBackground(name) {
  const img = images[name]
  if (!img) return
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  const row = g.getImageData(0, 0, c.width, 6).data
  let r = 0
  let gg = 0
  let b = 0
  for (let i = 0; i < row.length; i += 4) {
    r += row[i]
    gg += row[i + 1]
    b += row[i + 2]
  }
  const n = row.length / 4
  const fade = g.createLinearGradient(0, 0, 0, 50)
  fade.addColorStop(0, 'rgba(0,0,0,1)')
  fade.addColorStop(1, 'rgba(0,0,0,0)')
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = fade
  g.fillRect(0, 0, c.width, 50)
  c.sky = `rgb(${(r / n) | 0},${(gg / n) | 0},${(b / n) | 0})`
  images[name] = c
}

// ---------------------------------------------------------------------------
// Input (keyboard + touch)
// ---------------------------------------------------------------------------
const keys = {}
const pressed = {}
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyJ: 'chop', KeyX: 'chop',
  KeyK: 'throw', KeyC: 'throw',
  KeyB: 'look', ShiftLeft: 'look', ShiftRight: 'look',
  Enter: 'start', Escape: 'pause', KeyP: 'pause', KeyM: 'mute',
}

function press(action, down) {
  if (down && !keys[action]) pressed[action] = true
  keys[action] = down
}

addEventListener('keydown', (e) => {
  const a = KEYMAP[e.code]
  if (!a) return
  e.preventDefault()
  press(a, true)
  audio.unlock()
})
addEventListener('keyup', (e) => {
  const a = KEYMAP[e.code]
  if (a) press(a, false)
})
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false
})

for (const btn of document.querySelectorAll('[data-act]')) {
  const act = btn.dataset.act
  const on = (e) => {
    e.preventDefault()
    btn.classList.add('on')
    press(act, true)
    if (act === 'jump' || act === 'chop') press('start', true)
    audio.unlock()
  }
  const off = (e) => {
    e.preventDefault()
    btn.classList.remove('on')
    press(act, false)
    press('start', false)
  }
  btn.addEventListener('pointerdown', on)
  btn.addEventListener('pointerup', off)
  btn.addEventListener('pointercancel', off)
  btn.addEventListener('pointerleave', off)
}
// Floating joystick: the base appears wherever the thumb lands.
const stick = document.getElementById('stick')
if (stick) {
  const base = document.getElementById('stick-base')
  const knob = document.getElementById('stick-knob')
  const hint = document.getElementById('stick-hint')
  const R = 50
  let id = null
  let ox = 0
  let oy = 0
  const setDirs = (dx, dy) => {
    press('left', dx < -16)
    press('right', dx > 16)
    // Vertical needs a firmer push so running doesn't trigger climbing.
    press('up', dy < -30 && Math.abs(dy) > Math.abs(dx) * 0.6)
    press('down', dy > 30 && Math.abs(dy) > Math.abs(dx) * 0.6)
  }
  const place = (el, x, y) => {
    el.style.left = x + 'px'
    el.style.top = y + 'px'
  }
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    audio.unlock()
    press('start', true)
    if (id !== null) return
    id = e.pointerId
    stick.setPointerCapture(id)
    ox = e.clientX
    oy = e.clientY
    place(base, ox, oy)
    place(knob, ox, oy)
    base.hidden = false
    knob.hidden = false
    if (hint) hint.hidden = true
  })
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return
    let dx = e.clientX - ox
    let dy = e.clientY - oy
    const d = Math.hypot(dx, dy)
    // Drag past the rim and the base follows the thumb.
    if (d > R) {
      ox += (dx / d) * (d - R)
      oy += (dy / d) * (d - R)
      dx = e.clientX - ox
      dy = e.clientY - oy
      place(base, ox, oy)
    }
    place(knob, ox + dx, oy + dy)
    setDirs(dx, dy)
  })
  const end = (e) => {
    if (e.pointerId !== id) return
    id = null
    base.hidden = true
    knob.hidden = true
    setDirs(0, 0)
    press('start', false)
  }
  stick.addEventListener('pointerup', end)
  stick.addEventListener('pointercancel', end)
}

canvas.addEventListener('pointerdown', () => {
  press('start', true)
  audio.unlock()
})
canvas.addEventListener('pointerup', () => press('start', false))

const clearPressed = () => {
  for (const k in pressed) pressed[k] = false
}

const consume = (a) => {
  const v = pressed[a]
  pressed[a] = false
  return v
}

// ---------------------------------------------------------------------------
// Audio: tiny WebAudio synth
// ---------------------------------------------------------------------------
const audio = {
  ctx: null,
  muted: false,
  unlock() {
    if (this.ctx) return
    try {
      this.ctx = new AudioContext()
    } catch {
      this.ctx = null
    }
  },
  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    const a = this.ctx
    if (!a || this.muted) return
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, a.currentTime)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), a.currentTime + dur)
    g.gain.setValueAtTime(vol, a.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur)
    o.connect(g).connect(a.destination)
    o.start()
    o.stop(a.currentTime + dur)
  },
  noise(dur, vol = 0.15, cutoff = 1200) {
    const a = this.ctx
    if (!a || this.muted) return
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const s = a.createBufferSource()
    const f = a.createBiquadFilter()
    const g = a.createGain()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    g.gain.value = vol
    s.buffer = buf
    s.connect(f).connect(g).connect(a.destination)
    s.start()
  },
  chop() { this.noise(0.12, 0.25, 900); this.tone(110, 0.12, 'sine', 0.2, -50) },
  swing() { this.noise(0.08, 0.05, 3000) },
  jump() { this.tone(260, 0.15, 'square', 0.05, 300) },
  hurt() { this.tone(300, 0.3, 'sawtooth', 0.08, -220) },
  pickup() { this.tone(660, 0.08, 'square', 0.05); setTimeout(() => this.tone(990, 0.12, 'square', 0.05), 80) },
  timber() { this.tone(500, 0.6, 'triangle', 0.1, -400); this.noise(0.5, 0.12, 500) },
  shoot() { this.tone(700, 0.08, 'square', 0.03, -300) },
  boom() { this.noise(0.4, 0.3, 300); this.tone(80, 0.4, 'sine', 0.25, -40) },
  checkpoint() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'square', 0.05), i * 90)) },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'square', 0.06), i * 140)) },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t))

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function text(str, x, y, size, color = '#fff', align = 'center', outline = '#1a1210') {
  // Break the font's fi/fl ligatures, which render as a single odd glyph.
  str = String(str).replace(/f([il])/g, 'f\u200C$1')
  ctx.font = `700 ${size}px ${FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  if (outline) {
    ctx.lineWidth = Math.max(3, size / 6)
    ctx.strokeStyle = outline
    ctx.lineJoin = 'round'
    ctx.strokeText(str, x, y)
  }
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
}

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------
let game = null

function newGame() {
  return { levelIndex: 0, wood: 0, deaths: 0, state: 'title', time: 0 }
}

let level = null
let player = null
let enemies = []
let shots = []
let clouds = []
let particles = []
let pickups = []
let floaters = []
let camera = { x: 0, y: LEVEL_H - H, shake: 0 }
let banner = 0

function tileAt(tx, ty) {
  if (tx < 0 || tx >= level.width) return '#'
  if (ty < 0) return '.'
  if (ty >= ROWS) return '.'
  return level.grid[ty][tx]
}
const isSolid = (t) => t === '#' || t === '^'

function startLevel(index, fromCheckpoint = false) {
  const prevCheckpoint = fromCheckpoint && level ? level.checkpoint : null
  const data = buildLevel(index)
  level = { ...data, checkpoint: null, bossDefeated: false, goal: null }
  enemies = []
  shots = []
  clouds = []
  particles = []
  pickups = []
  floaters = []
  level.checkpoints = []
  for (const e of data.entities) {
    const px = e.x * TS + TS / 2
    const py = (e.y + 1) * TS
    if (e.type === 'player') level.start = { x: px, y: py }
    else if (e.type === 'enemy') enemies.push(makeEnemy(e.kind, px, py))
    else if (e.type === 'boss') enemies.push(makeBoss(px, py))
    else if (e.type === 'flapjack') pickups.push({ kind: 'flapjack', x: px, y: py - 14, t: Math.random() * 6 })
    else if (e.type === 'checkpoint') level.checkpoints.push({ x: px, y: py, on: false })
    else if (e.type === 'goal') level.goal = { x: px, y: py, hidden: false }
  }
  if (!level.goal) {
    // Boss levels reveal the goal once the boss falls.
    level.goal = { x: (data.width - 4) * TS, y: (ROWS - 4) * TS, hidden: true }
  }
  if (prevCheckpoint) {
    level.checkpoint = prevCheckpoint
    for (const c of level.checkpoints) if (c.x <= prevCheckpoint.x) c.on = true
  }
  const spawn = level.checkpoint || level.start
  player = makePlayer(spawn.x, spawn.y)
  camera.x = clamp(player.x - W * 0.35, 0, level.width * TS - W)
  renderLevelLayer()
  banner = fromCheckpoint ? 0 : 3
}

// ---------------------------------------------------------------------------
// Physics body movement against the tile grid
// ---------------------------------------------------------------------------
function moveBody(b, dt, opts = {}) {
  b.hitWall = 0
  b.x += b.vx * dt
  let box = bodyBox(b)
  let x0 = Math.floor(box.x / TS)
  let x1 = Math.floor((box.x + box.w - 0.01) / TS)
  let y0 = Math.floor(box.y / TS)
  let y1 = Math.floor((box.y + box.h - 0.01) / TS)
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(tileAt(tx, ty))) continue
      if (b.vx > 0) {
        b.x = tx * TS - b.w / 2 - 0.01
        b.hitWall = 1
      } else if (b.vx < 0) {
        b.x = (tx + 1) * TS + b.w / 2 + 0.01
        b.hitWall = -1
      }
      b.vx = 0
      box = bodyBox(b)
    }
  }

  const prevBottom = b.y
  b.y += b.vy * dt
  b.onGround = false
  b.onThorns = false
  box = bodyBox(b)
  x0 = Math.floor(box.x / TS)
  x1 = Math.floor((box.x + box.w - 0.01) / TS)
  y0 = Math.floor(box.y / TS)
  y1 = Math.floor((box.y + box.h - 0.01) / TS)
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(tx, ty)
      const top = ty * TS
      if (isSolid(t)) {
        // Only resolve against tiles crossed this step, so tall bodies
        // brushing a raised block are not teleported on top of it.
        if (b.vy > 0 && prevBottom <= top + 0.5) {
          b.y = top
          b.vy = 0
          b.onGround = true
          if (t === '^') b.onThorns = true
        } else if (b.vy < 0 && prevBottom - b.h >= (ty + 1) * TS - 0.5) {
          b.y = (ty + 1) * TS + b.h
          b.vy = 0
        }
      } else if (t === '=' && b.vy >= 0 && !opts.ignoreOneWay && prevBottom <= top + 0.5) {
        b.y = top
        b.vy = 0
        b.onGround = true
      }
    }
  }
}

// Bodies are positioned by their feet center (x, y).
function bodyBox(b) {
  return { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h }
}

function groundAhead(b, dir) {
  const fx = Math.floor((b.x + dir * (b.w / 2 + 4)) / TS)
  const fy = Math.floor((b.y + 4) / TS)
  const t = tileAt(fx, fy)
  return t === '#' || t === '='
}

function wallAhead(b, dir) {
  const fx = Math.floor((b.x + dir * (b.w / 2 + 4)) / TS)
  const fy = Math.floor((b.y - 8) / TS)
  return isSolid(tileAt(fx, fy))
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
const GRAV = 2200
const RUN = 250
const JUMP_V = 800

function makePlayer(x, y) {
  return {
    x, y, w: 30, h: 84, vx: 0, vy: 0, face: 1,
    hp: 4, maxHp: 4, invuln: 0, onGround: false,
    coyote: 0, jumpBuf: 0, attack: 0, attackHit: new Set(),
    climbing: false, climbX: 0, climbAnim: 0,
    axeOut: false, look: 0, lured: 0, slowed: 0, runT: 0,
    dropThrough: 0, hurtT: 0, dead: false,
  }
}

function trunkAt(x, y) {
  const tx = Math.floor(x / TS)
  for (const yy of [y - 20, y - 50]) {
    if (tileAt(tx, Math.floor(yy / TS)) === '|') return tx * TS + TS / 2
  }
  return null
}

function updatePlayer(dt) {
  const p = player
  p.invuln = Math.max(0, p.invuln - dt)
  p.hurtT = Math.max(0, p.hurtT - dt)
  p.slowed = Math.max(0, p.slowed - dt)
  p.lured = Math.max(0, p.lured - dt)
  p.dropThrough = Math.max(0, p.dropThrough - dt)

  if (consume('jump')) p.jumpBuf = 0.12
  else p.jumpBuf = Math.max(0, p.jumpBuf - dt)

  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
  let speed = RUN * (p.slowed ? 0.5 : 1)
  if (p.lured) speed *= 0.45

  // Climbing trunks
  const trunk = trunkAt(p.x, p.y)
  if (!p.climbing && trunk !== null && (keys.up || (keys.down && !p.onGround)) && p.attack <= 0) {
    p.climbing = true
    p.climbX = trunk
    p.vx = 0
    p.vy = 0
  }
  if (p.climbing) {
    const cdir = (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
    p.vy = cdir * 160
    p.x = approach(p.x, p.climbX, 400 * dt)
    p.vx = 0
    if (cdir) p.climbAnim += dt
    if (dir) p.face = dir
    moveBody(p, dt, { ignoreOneWay: true })
    const still = trunkAt(p.x, p.y)
    if (p.jumpBuf > 0) {
      p.climbing = false
      p.jumpBuf = 0
      p.vy = -JUMP_V * 0.85
      p.vx = (dir || p.face) * RUN
      audio.jump()
    } else if (still === null) {
      p.climbing = false
      if (cdir < 0) p.vy = -560
    } else if (p.onGround && cdir > 0) {
      p.climbing = false
    }
  } else {
    // Horizontal control
    const accel = p.onGround ? 2600 : 1600
    const pull = p.lured ? p.lureDir * 95 : 0
    if ((dir || pull) && p.hurtT <= 0) {
      p.vx = approach(p.vx, dir * speed + pull, accel * dt)
      if (p.attack <= 0) p.face = dir
    } else if (p.hurtT <= 0) {
      p.vx = approach(p.vx, 0, (p.onGround ? 2400 : 600) * dt)
    }

    // Jumping
    p.coyote = p.onGround ? 0.1 : Math.max(0, p.coyote - dt)
    if (p.jumpBuf > 0 && keys.down && p.onGround && standingOnOneWay(p)) {
      p.dropThrough = 0.25
      p.jumpBuf = 0
      p.y += 2
    } else if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -JUMP_V
      p.jumpBuf = 0
      p.coyote = 0
      audio.jump()
      dust(p.x, p.y, 6)
    }
    if (!keys.jump && p.vy < -320) p.vy = -320

    p.vy = Math.min(p.vy + GRAV * dt, 1100)
    const wasAir = !p.onGround
    const vyBefore = p.vy
    moveBody(p, dt, { ignoreOneWay: p.dropThrough > 0 })
    if (wasAir && p.onGround && vyBefore > 500) dust(p.x, p.y, 8)
    if (p.onThorns) hurtPlayer(1, p.x + p.face * 10, true)
  }

  // Binoculars: hold look (or down while standing still)
  const looking = keys.look || (keys.down && p.onGround && !dir && !p.climbing && !standingOnOneWay(p))
  p.look = looking && p.onGround && !dir ? Math.min(1, p.look + dt * 3) : Math.max(0, p.look - dt * 4)

  // Attacks
  if (consume('chop') && p.attack <= 0 && !p.climbing) {
    p.attack = 0.34
    p.attackHit.clear()
    audio.swing()
  }
  if (p.attack > 0) {
    p.attack -= dt
    const t = 0.34 - p.attack
    if (t > 0.08 && t < 0.2) {
      const hb = { x: p.face > 0 ? p.x : p.x - 92, y: p.y - 95, w: 92, h: 95 }
      for (const e of enemies) {
        if (e.dead || p.attackHit.has(e) || !e.hittable) continue
        if (overlap(hb, enemyBox(e))) {
          p.attackHit.add(e)
          hitEnemy(e, 1, p.face)
        }
      }
    }
  }
  if (consume('throw') && !p.axeOut && !p.climbing) {
    p.axeOut = true
    shots.push({
      kind: 'axe', friendly: true, x: p.x + p.face * 20, y: p.y - 55, vx: p.face * 520, vy: 0,
      r: 18, t: 0, spin: 0, hit: new Set(), returning: false,
    })
    audio.swing()
  }

  if (p.y > LEVEL_H + 100) fallOut()
  const tileBody = tileAt(Math.floor(p.x / TS), Math.floor((p.y - 10) / TS))
  if (tileBody === '~') fallOut()

  if (p.onGround && Math.abs(p.vx) > 40) {
    p.runT += dt
    if (Math.random() < dt * 8) dust(p.x - p.face * 10, p.y, 1)
  } else p.runT = 0

  // Pickups
  const pb = bodyBox(p)
  for (const k of pickups) {
    if (k.got) continue
    if (overlap(pb, { x: k.x - 14, y: k.y - 14, w: 28, h: 28 })) {
      k.got = true
      if (k.kind === 'flapjack') {
        p.hp = Math.min(p.maxHp, p.hp + 1)
        floaters.push({ x: k.x, y: k.y - 20, text: 'Flapjacks!', t: 1.2, color: '#ffe08a' })
      } else {
        game.wood++
        floaters.push({ x: k.x, y: k.y - 20, text: '+1 wood', t: 1, color: '#e2b07a' })
      }
      audio.pickup()
    }
  }
  pickups = pickups.filter((k) => !k.got)

  for (const c of level.checkpoints) {
    if (!c.on && Math.abs(p.x - c.x) < 30 && Math.abs(p.y - c.y) < 60) {
      c.on = true
      level.checkpoint = { x: c.x, y: c.y }
      p.hp = p.maxHp
      floaters.push({ x: c.x, y: c.y - 90, text: 'Checkpoint', t: 1.5, color: '#9fe870' })
      audio.checkpoint()
    }
  }

  const g = level.goal
  if (!g.hidden && Math.abs(p.x - g.x) < 30 && Math.abs(p.y - g.y) < 80) completeLevel()
}

function standingOnOneWay(p) {
  const t = tileAt(Math.floor(p.x / TS), Math.floor((p.y + 2) / TS))
  return p.onGround && t === '='
}

function hurtPlayer(dmg, fromX, bounce = false) {
  const p = player
  if (p.invuln > 0 || p.dead || game.state !== 'play') return
  p.hp -= dmg
  p.invuln = 1.1
  p.hurtT = 0.25
  p.climbing = false
  p.vx = (p.x < fromX ? -1 : 1) * 300
  p.vy = bounce ? -650 : -380
  camera.shake = 0.25
  audio.hurt()
  for (let i = 0; i < 8; i++) particles.push(spark(p.x, p.y - 50, '#ff5050'))
  if (p.hp <= 0) killPlayer()
}

function fallOut() {
  const p = player
  if (p.dead) return
  p.hp -= 1
  audio.hurt()
  if (p.hp <= 0) return killPlayer()
  const s = level.checkpoint || level.start
  p.x = s.x
  p.y = s.y
  p.vx = 0
  p.vy = 0
  p.invuln = 1.2
  p.climbing = false
}

function killPlayer() {
  player.dead = true
  clearPressed()
  game.deaths++
  game.state = 'dead'
  game.stateT = 0
}

function completeLevel() {
  if (game.state !== 'play') return
  audio.win()
  game.state = game.levelIndex >= BIOMES.length - 1 ? 'win' : 'clear'
  clearPressed()
  game.stateT = 0
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
const ETYPES = {
  rabbitbrush: { hp: 2, kind: 'walker', scale: 0.72 },
  rose: { hp: 3, kind: 'trap', scale: 0.85 },
  willow: { hp: 3, kind: 'ambush', scale: 0.95 },
  oak: { hp: 6, kind: 'tank', scale: 1 },
  bikini: { hp: 3, kind: 'lure', scale: 0.95 },
  marigold: { hp: 2, kind: 'poison', scale: 0.8 },
  sage: { hp: 3, kind: 'pollen', scale: 0.85 },
  manzanita: { hp: 3, kind: 'lobber', scale: 0.9 },
  cactus: { hp: 4, kind: 'spitter', scale: 0.85 },
  yucca: { hp: 3, kind: 'burst', scale: 0.85 },
  aspen: { hp: 4, kind: 'charger', scale: 0.9 },
  juniper: { hp: 3, kind: 'zombie', scale: 0.85 },
}

const STATIONARY = new Set(['trap', 'poison', 'pollen', 'lobber', 'spitter', 'burst', 'lure'])

// Burned and desert junipers get back up once. Nothing stays dead for long.
const willRevive = (e) => e.type === 'juniper' && !e.revived && !e.boss && (level.biome.id === 'burned' || level.biome.id === 'desert')

function makeEnemy(type, x, y, extra = {}) {
  const def = ETYPES[type]
  const img = images['e_' + type]
  const scale = extra.scale || def.scale
  const sw = img.width * scale
  const sh = img.height * scale
  return {
    type, kind: def.kind, x, y, vx: 0, vy: 0,
    w: sw * 0.55, h: sh * 0.82, sw, sh, scale,
    hp: extra.hp || def.hp, maxHp: extra.hp || def.hp,
    dir: Math.random() < 0.5 ? -1 : 1, t: Math.random() * 3, cool: rand(0.5, 2),
    flash: 0, dead: false, deadT: 0, revived: false, hittable: true,
    state: 'idle', stateT: 0, revealed: def.kind !== 'ambush', onGround: false, hitWall: 0,
    ...extra,
  }
}

function makeBoss(x, y) {
  const e = makeEnemy('oak', x, y, { scale: 2.3, hp: 30 })
  e.kind = 'boss'
  e.boss = true
  e.w *= 0.7
  e.name = 'Craigy the Gamble Oak'
  e.cool = 2
  e.awake = false
  return e
}

function enemyBox(e) {
  return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }
}

function hitEnemy(e, dmg, dir) {
  if (e.dead) return
  if (e.kind === 'ambush' && !e.revealed) e.revealed = true
  e.hp -= dmg
  e.flash = 0.12
  audio.chop()
  camera.shake = Math.max(camera.shake, 0.08)
  const leaf = leafColor(e.type)
  for (let i = 0; i < 6; i++) particles.push(chip(e.x, e.y - e.h * 0.4, dir))
  for (let i = 0; i < 4; i++) particles.push(leafP(e.x, e.y - e.h * 0.8, leaf))
  if (!e.boss && e.kind !== 'tank' && e.kind !== 'trap') {
    e.vx = dir * 160
    if (e.onGround) e.vy = -180
  }
  if (e.hp <= 0) killEnemy(e, dir)
}

function killEnemy(e, dir) {
  e.dead = true
  e.deadT = 0
  e.fallDir = dir || 1
  e.hittable = false
  audio.timber()
  floaters.push({ x: e.x, y: e.y - e.sh - 10, text: 'TIMBER!', t: 1.2, color: '#ffd23f', size: e.boss ? 40 : 22 })
  const drops = e.boss ? 10 : Math.random() < 0.6 ? 1 : 0
  for (let i = 0; i < drops; i++) pickups.push({ kind: 'log', x: e.x + rand(-40, 40), y: e.y - 14, t: 0, vy: -300 - i * 30, falling: true })
  if (e.boss) {
    level.bossDefeated = true
    level.goal.hidden = false
    level.goal.x = Math.min(e.x + 140, (level.width - 3) * TS)
    level.goal.y = groundY(level.goal.x, e.y)
    camera.shake = 0.8
    audio.boom()
  }
}

function leafColor(type) {
  return {
    aspen: '#f2c21b', bikini: '#5bb33a', cactus: '#3f9a3a', juniper: '#6f8a3a', manzanita: '#d04060',
    marigold: '#f59a1c', oak: '#4f8a2a', rabbitbrush: '#f5c518', rose: '#e0407a', sage: '#9b6fd0',
    willow: '#6fb03a', yucca: '#3a8a7a',
  }[type]
}

function updateEnemy(e, dt) {
  const p = player
  e.t += dt
  e.flash = Math.max(0, e.flash - dt)
  e.cool -= dt
  e.stateT += dt

  if (e.dead) {
    e.deadT += dt
    if (!willRevive(e) && !e.boss && e.deadT > 1.4) e.gone = true
    if (willRevive(e) && e.deadT > 2.4) {
      e.dead = false
      e.revived = true
      e.hittable = true
      e.hp = 2
      e.deadT = 0
      floaters.push({ x: e.x, y: e.y - e.sh, text: 'It got back up...', t: 1.4, color: '#b6ff7a', size: 16 })
    }
    return
  }

  const dx = p.x - e.x
  const dist = Math.abs(dx)
  const near = (r, vr = 160) => dist < r && Math.abs(p.y - e.y) < vr
  const face = Math.sign(dx) || 1

  switch (e.kind) {
    case 'walker': {
      const sp = near(260) ? 130 : 70
      e.vx = approach(e.vx, e.dir * sp, 600 * dt)
      if (e.onGround && (!groundAhead(e, e.dir) || wallAhead(e, e.dir))) e.dir *= -1
      if (near(260)) e.dir = face
      if (e.onGround && e.cool <= 0 && near(220)) {
        e.vy = -520
        e.cool = rand(1.2, 2.2)
      }
      break
    }
    case 'tank':
      e.vx = near(500) ? face * 45 : 0
      if (e.onGround && (!groundAhead(e, face) || wallAhead(e, face))) e.vx = 0
      break
    case 'zombie':
      if (e.state === 'lunge') {
        if (e.stateT > 0.5) e.state = 'idle'
      } else {
        e.vx = near(450) ? face * (e.revived ? 75 : 55) : 0
        if (e.onGround && (!groundAhead(e, face) || wallAhead(e, face))) e.vx = 0
        if (near(170) && e.cool <= 0 && e.onGround) {
          e.state = 'lunge'
          e.stateT = 0
          e.vx = face * 380
          e.vy = -300
          e.cool = 2.2
        }
      }
      break
    case 'charger':
      if (e.state === 'idle') {
        e.vx = approach(e.vx, 0, 800 * dt)
        if (near(420, 90) && e.cool <= 0) {
          e.state = 'wind'
          e.stateT = 0
          e.dir = face
        }
      } else if (e.state === 'wind') {
        if (e.stateT > 0.55) {
          e.state = 'charge'
          e.stateT = 0
        }
      } else if (e.state === 'charge') {
        e.vx = e.dir * 400
        if (Math.random() < dt * 30) particles.push(leafP(e.x, e.y - e.h * 0.7, '#f2c21b'))
        if (e.stateT > 1.3 || e.hitWall || (e.onGround && !groundAhead(e, e.dir))) {
          e.vx = 0
          e.state = 'idle'
          e.cool = 1.4
        }
      }
      break
    case 'trap':
      if (e.state === 'idle' && near(110, 100) && e.cool <= 0) {
        e.state = 'wind'
        e.stateT = 0
        e.dir = face
      } else if (e.state === 'wind' && e.stateT > 0.4) {
        e.state = 'whip'
        e.stateT = 0
        audio.swing()
      } else if (e.state === 'whip') {
        const hb = { x: e.x - 110, y: e.y - 70, w: 220, h: 50 }
        if (overlap(hb, bodyBox(p))) hurtPlayer(1, e.x)
        if (e.stateT > 0.25) {
          e.state = 'idle'
          e.cool = 1.2
        }
      }
      break
    case 'ambush':
      if (!e.revealed && near(150, 120)) {
        e.revealed = true
        e.state = 'grab'
        e.stateT = 0
        e.vx = face * 300
        e.vy = -250
        floaters.push({ x: e.x, y: e.y - e.sh, text: '!', t: 0.7, color: '#ff5050', size: 32 })
      }
      if (e.revealed) {
        e.vx = approach(e.vx, near(400) ? face * 60 : 0, 400 * dt)
        if (e.onGround && (!groundAhead(e, face) || wallAhead(e, face))) e.vx = 0
      }
      break
    case 'lure':
      if (near(300, 140)) {
        p.lured = 0.2
        p.lureDir = -face
        if (Math.random() < dt * 4) floaters.push({ x: p.x + rand(-15, 15), y: p.y - 100, text: '♥', t: 0.9, color: '#ff4f7a', size: 18, heart: true })
      }
      if (Math.random() < dt * 1.5) floaters.push({ x: e.x + rand(-20, 20), y: e.y - e.sh * 0.6, text: '♥', t: 1.1, color: '#ff7aa2', size: 14, heart: true })
      if (near(70, 100) && e.cool <= 0) {
        e.cool = 1.1
        e.state = 'slap'
        e.stateT = 0
        hurtPlayer(1, e.x)
        floaters.push({ x: p.x, y: p.y - 110, text: 'SLAP!', t: 0.8, color: '#ff7aa2', size: 20 })
      }
      break
    case 'poison':
      if (near(380) && e.cool <= 0) {
        e.cool = 3
        clouds.push({ x: e.x, y: e.y - 30, r: 10, maxR: 70, t: 0, life: 2.4, color: '200,240,60', dmg: 1 })
        audio.shoot()
      }
      break
    case 'pollen':
      if (near(450) && e.cool <= 0) {
        e.cool = 2.6
        clouds.push({ x: e.x, y: e.y - e.h * 0.8, vx: face * 70, r: 12, maxR: 46, t: 0, life: 3.5, color: '170,120,230', slow: true })
        audio.shoot()
      }
      break
    case 'lobber':
      if (near(480, 260) && e.cool <= 0) {
        e.cool = 2.2
        const tflight = 0.9
        const sx = e.x
        const sy = e.y - e.h * 0.7
        shots.push({ kind: 'berry', x: sx, y: sy, vx: (p.x - sx) / tflight, vy: (p.y - 40 - sy) / tflight - (GRAV * 0.5 * tflight) / 2, g: GRAV * 0.5, r: 7, t: 0, dmg: 1 })
        audio.shoot()
      }
      break
    case 'spitter':
      if (near(520, 120) && e.cool <= 0) {
        e.cool = 2
        for (const a of [-0.12, 0, 0.12]) {
          shots.push({ kind: 'needle', x: e.x + face * 20, y: e.y - e.h * 0.55, vx: face * 360 * Math.cos(a), vy: 360 * Math.sin(a), r: 5, t: 0, dmg: 1 })
        }
        audio.shoot()
      }
      break
    case 'burst':
      if (near(320, 220) && e.cool <= 0) {
        if (e.state !== 'wind') {
          e.state = 'wind'
          e.stateT = 0
        } else if (e.stateT > 0.5) {
          e.state = 'idle'
          e.cool = 2.6
          for (let i = 0; i < 9; i++) {
            const a = Math.PI + (i / 8) * Math.PI
            shots.push({ kind: 'spike', x: e.x, y: e.y - e.h * 0.4, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 6, t: 0, dmg: 1, g: 300 })
          }
          audio.shoot()
        }
      }
      break
    case 'boss':
      updateBoss(e, dt, face, dist)
      break
  }

  if (STATIONARY.has(e.kind)) e.vx = approach(e.vx, 0, 800 * dt)
  e.vy = Math.min(e.vy + GRAV * dt, 1100)
  moveBody(e, dt)
  if (e.y > LEVEL_H + 200) {
    e.dead = true
    e.gone = true
  }

  // Contact damage
  const harmless = (e.kind === 'ambush' && !e.revealed) || e.kind === 'lure'
  if (!harmless && overlap(enemyBox(e), bodyBox(p))) {
    if (e.kind === 'tank' || (e.boss && e.state === 'charge')) {
      hurtPlayer(1, e.x)
      if (player.invuln > 1) {
        player.vx = face * -520
        player.vy = -700
        floaters.push({ x: p.x, y: p.y - 110, text: 'TOSSED!', t: 0.8, color: '#ffb347', size: 20 })
      }
    } else hurtPlayer(1, e.x)
  }
}

function updateBoss(e, dt, face, dist) {
  const p = player
  if (!e.awake) {
    if (dist < 520) {
      e.awake = true
      e.cool = 1.2
      floaters.push({ x: e.x, y: e.y - e.sh - 20, text: 'CRAIGY AWAKENS', t: 2, color: '#ff8a3a', size: 30 })
      audio.boom()
      camera.shake = 0.5
    }
    return
  }
  const rage = e.hp < e.maxHp / 2
  if (e.state === 'idle') {
    e.vx = face * (rage ? 70 : 45)
    if (e.cool <= 0) {
      const r = Math.random()
      e.stateT = 0
      e.state = r < 0.35 ? 'roots' : r < 0.65 ? 'toss' : r < 0.85 ? 'charge-wind' : 'summon'
      if (e.state === 'summon' && (!rage || enemies.filter((x) => !x.dead).length > 5)) e.state = 'toss'
      e.shots = 0
      e.rootX = p.x
    }
  } else if (e.state === 'roots') {
    e.vx = 0
    // Three telegraphed root eruptions under the player.
    const n = Math.floor(e.stateT / 0.7)
    if (n > e.shots && e.shots < 3) {
      e.shots++
      clouds.push({ kind: 'root', x: p.x, y: groundY(p.x, p.y), t: 0, life: 1.1, r: 34 })
    }
    if (e.stateT > 2.4) bossIdle(e, rage)
  } else if (e.state === 'toss') {
    e.vx = 0
    const n = Math.floor(e.stateT / 0.35)
    if (n > e.shots && e.shots < (rage ? 5 : 3)) {
      e.shots++
      const tflight = rand(0.8, 1.1)
      const sx = e.x
      const sy = e.y - e.sh * 0.7
      const tx = p.x + rand(-80, 80)
      shots.push({ kind: 'acorn', x: sx, y: sy, vx: (tx - sx) / tflight, vy: (p.y - 30 - sy) / tflight - (GRAV * 0.5 * tflight) / 2, g: GRAV * 0.5, r: 11, t: 0, dmg: 1 })
      audio.shoot()
    }
    if (e.stateT > 2) bossIdle(e, rage)
  } else if (e.state === 'charge-wind') {
    e.vx = 0
    e.dir = face
    if (Math.random() < dt * 20) particles.push(chip(e.x, e.y - 10, -e.dir))
    if (e.stateT > 0.8) {
      e.state = 'charge'
      e.stateT = 0
    }
  } else if (e.state === 'charge') {
    e.vx = e.dir * (rage ? 520 : 430)
    if (e.hitWall || e.stateT > 1.6 || (e.onGround && !groundAhead(e, e.dir))) {
      e.vx = 0
      camera.shake = 0.3
      audio.boom()
      bossIdle(e, rage)
    }
  } else if (e.state === 'summon') {
    e.vx = 0
    if (e.stateT > 0.6 && !e.shots) {
      e.shots = 1
      for (const off of [-120, 120]) {
        const baby = makeEnemy('juniper', e.x + off, e.y - 40, { scale: 0.45, hp: 1, revived: true })
        baby.vy = -400
        enemies.push(baby)
      }
      floaters.push({ x: e.x, y: e.y - e.sh, text: 'Baby junipers!', t: 1.2, color: '#b6ff7a', size: 20 })
    }
    if (e.stateT > 1.2) bossIdle(e, rage)
  }
}

function bossIdle(e, rage) {
  e.state = 'idle'
  e.stateT = 0
  e.cool = rage ? rand(0.8, 1.4) : rand(1.4, 2.2)
}

function groundY(x, y) {
  const tx = Math.floor(x / TS)
  for (let ty = Math.floor((y - 10) / TS); ty < ROWS; ty++) {
    const t = tileAt(tx, ty)
    if (t === '#' || t === '=' || t === '^') return ty * TS
  }
  return y
}

// ---------------------------------------------------------------------------
// Projectiles, clouds, particles
// ---------------------------------------------------------------------------
function updateShots(dt) {
  for (const s of shots) {
    s.t += dt
    if (s.kind === 'axe') {
      s.spin += dt * 22
      if (!s.returning && s.t > 0.42) {
        s.returning = true
        s.hit.clear()
      }
      if (s.returning) {
        const dx = player.x - s.x
        const dy = player.y - 50 - s.y
        const d = Math.hypot(dx, dy) || 1
        s.vx = (dx / d) * 640
        s.vy = (dy / d) * 640
        if (d < 30) {
          s.done = true
          player.axeOut = false
        }
      } else if (isSolid(tileAt(Math.floor(s.x / TS), Math.floor(s.y / TS)))) {
        s.returning = true
        s.hit.clear()
        audio.chop()
      }
      s.x += s.vx * dt
      s.y += s.vy * dt
      for (const e of enemies) {
        if (e.dead || !e.hittable || s.hit.has(e)) continue
        const b = enemyBox(e)
        if (s.x > b.x - s.r && s.x < b.x + b.w + s.r && s.y > b.y - s.r && s.y < b.y + b.h + s.r) {
          s.hit.add(e)
          hitEnemy(e, 1, Math.sign(s.vx) || 1)
        }
      }
      if (s.t > 3) {
        s.done = true
        player.axeOut = false
      }
      continue
    }
    s.vy += (s.g || 0) * dt
    s.x += s.vx * dt
    s.y += s.vy * dt
    if (isSolid(tileAt(Math.floor(s.x / TS), Math.floor(s.y / TS))) || s.t > 4) {
      s.done = true
      for (let i = 0; i < 4; i++) particles.push(spark(s.x, s.y, s.kind === 'berry' ? '#d0305a' : '#c8b070'))
      continue
    }
    const pb = bodyBox(player)
    if (s.x > pb.x - s.r && s.x < pb.x + pb.w + s.r && s.y > pb.y - s.r && s.y < pb.y + pb.h + s.r) {
      s.done = true
      hurtPlayer(s.dmg, s.x)
      if (s.kind === 'berry') player.slowed = 1
    }
  }
  shots = shots.filter((s) => !s.done)
}

function updateClouds(dt) {
  const pb = bodyBox(player)
  for (const c of clouds) {
    c.t += dt
    if (c.kind === 'root') {
      // Telegraph, then erupt.
      if (c.t < 0.6) {
        if (Math.random() < dt * 30) particles.push(chip(c.x + rand(-20, 20), c.y, rand(-1, 1)))
      } else if (!c.erupted) {
        c.erupted = true
        audio.boom()
        camera.shake = Math.max(camera.shake, 0.15)
      }
      if (c.erupted && c.t < 0.95 && overlap(pb, { x: c.x - 26, y: c.y - 110, w: 52, h: 110 })) hurtPlayer(1, c.x, true)
      continue
    }
    c.r = approach(c.r, c.maxR, 90 * dt)
    if (c.vx) c.x += c.vx * dt
    c.y -= 8 * dt
    const cx = clamp(c.x, pb.x, pb.x + pb.w)
    const cy = clamp(c.y, pb.y, pb.y + pb.h)
    if (Math.hypot(cx - c.x, cy - c.y) < c.r * 0.8) {
      if (c.slow) {
        if (!player.slowed) floaters.push({ x: player.x, y: player.y - 110, text: 'zzz...', t: 1, color: '#c7a6ff', size: 16 })
        player.slowed = 2
      }
      if (c.dmg) hurtPlayer(c.dmg, c.x)
    }
  }
  clouds = clouds.filter((c) => c.t < c.life)
}

function chip(x, y, dir) {
  return { x, y, vx: dir * rand(60, 260) + rand(-60, 60), vy: rand(-420, -160), g: 1400, t: 0, life: rand(0.5, 0.9), size: rand(3, 6), color: Math.random() < 0.5 ? '#d9a066' : '#a8693a', rot: rand(0, 6) }
}
function leafP(x, y, color) {
  return { x: x + rand(-20, 20), y, vx: rand(-120, 120), vy: rand(-200, -40), g: 250, t: 0, life: rand(0.8, 1.4), size: rand(3, 5), color, sway: true, rot: rand(0, 6) }
}
function spark(x, y, color) {
  return { x, y, vx: rand(-220, 220), vy: rand(-300, 50), g: 900, t: 0, life: rand(0.3, 0.6), size: rand(2, 4), color }
}
function dust(x, y, n) {
  for (let i = 0; i < n; i++) particles.push({ x: x + rand(-10, 10), y: y - 2, vx: rand(-80, 80), vy: rand(-80, -10), g: 0, t: 0, life: rand(0.3, 0.5), size: rand(3, 6), color: 'rgba(230,220,200,0.6)' })
}

function updateParticles(dt) {
  for (const q of particles) {
    q.t += dt
    q.vy += (q.g || 0) * dt
    if (q.sway) q.vx += Math.sin(q.t * 8) * 200 * dt
    q.x += q.vx * dt
    q.y += q.vy * dt
    q.rot = (q.rot || 0) + dt * 6
  }
  particles = particles.filter((q) => q.t < q.life)
  for (const f of floaters) {
    f.t -= dt
    f.y -= (f.heart ? 50 : 35) * dt
  }
  floaters = floaters.filter((f) => f.t > 0)
  for (const k of pickups) {
    k.t += dt
    if (k.falling) {
      k.vy += GRAV * dt
      k.y += k.vy * dt
      const gy = groundY(k.x, k.y - 20) - 14
      if (k.vy > 0 && k.y >= gy) {
        k.y = gy
        k.falling = false
      }
    }
  }
}

// Ambient air particles per biome.
let air = []
function updateAir(dt) {
  const kind = level.biome.air
  if (air.length < 40 && Math.random() < dt * 20) {
    const a = { x: camera.x + rand(0, W + 200), y: camera.y + rand(-20, H), t: 0, life: rand(4, 8), kind, ph: rand(0, 6) }
    if (kind === 'embers') a.y = camera.y + H + 10
    air.push(a)
  }
  for (const a of air) {
    a.t += dt
    if (kind === 'embers') {
      a.y -= 40 * dt
      a.x += Math.sin(a.t * 2 + a.ph) * 20 * dt
    } else if (kind === 'dust') {
      a.x -= 60 * dt
      a.y += Math.sin(a.t + a.ph) * 6 * dt
    } else {
      a.y += 30 * dt
      a.x += Math.sin(a.t * 1.5 + a.ph) * 30 * dt - 10 * dt
    }
  }
  air = air.filter((a) => a.t < a.life)
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
let levelLayer = null

function renderLevelLayer() {
  const c = document.createElement('canvas')
  c.width = level.width * TS
  c.height = LEVEL_H
  const g = c.getContext('2d')
  const col = level.biome.ground
  const P = 4 // art pixel size
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const t = level.grid[ty][tx]
      const X = tx * TS
      const Y = ty * TS
      if (t === '#' || t === '^') {
        const above = ty > 0 ? level.grid[ty - 1][tx] : '.'
        const exposed = above !== '#' && above !== '^'
        for (let py = 0; py < TS; py += P) {
          for (let px = 0; px < TS; px += P) {
            const h = hash(X + px, Y + py)
            let color = h < 0.5 ? col.dirt : col.dirt2
            if (h > 0.93) color = col.stone
            if (exposed && py < 8 + (hash(X + px, 7) > 0.5 ? 4 : 0)) color = h < 0.7 ? col.top : col.top2
            g.fillStyle = color
            g.fillRect(X + px, Y + py, P, P)
          }
        }
        // Edge outlines
        g.fillStyle = 'rgba(0,0,0,0.45)'
        const left = tx > 0 ? level.grid[ty][tx - 1] : '#'
        const right = tx < level.width - 1 ? level.grid[ty][tx + 1] : '#'
        if (left !== '#' && left !== '^') g.fillRect(X, Y, P, TS)
        if (right !== '#' && right !== '^') g.fillRect(X + TS - P, Y, P, TS)
        if (exposed) {
          g.fillRect(X, Y, TS, P - 2)
          if (level.biome.id === 'burned') {
            g.fillStyle = '#ff6a1a'
            if (hash(tx, ty) > 0.6) g.fillRect(X + 8, Y + 12, 12, 4)
          } else if (hash(tx, 99) > 0.6) {
            // little grass tufts
            g.fillStyle = col.top
            g.fillRect(X + 6, Y - 4, P, 4)
            g.fillRect(X + 18, Y - 6, P, 6)
          }
        }
        if (t === '^') {
          for (let i = 0; i < 4; i++) {
            const sx = X + i * 8
            g.fillStyle = '#d8d0b0'
            g.beginPath()
            g.moveTo(sx, Y + 2)
            g.lineTo(sx + 4, Y - 14)
            g.lineTo(sx + 8, Y + 2)
            g.fill()
            g.fillStyle = '#5a3a20'
            g.fillRect(sx + 3, Y - 4, 2, 6)
          }
        }
      } else if (t === '=') {
        // log bridge plank
        g.fillStyle = '#2a170c'
        g.fillRect(X, Y, TS, 14)
        g.fillStyle = '#8a5a2b'
        g.fillRect(X, Y + 2, TS, 9)
        g.fillStyle = '#b07a40'
        g.fillRect(X, Y + 3, TS, 3)
        g.fillStyle = '#5c3a1a'
        g.fillRect(X + 14, Y + 2, 2, 9)
        if (hash(tx, ty) > 0.5) {
          g.fillStyle = '#d8a060'
          g.fillRect(X + 4, Y + 5, 4, 4)
        }
      } else if (t === '|') {
        g.fillStyle = '#1e120a'
        g.fillRect(X + 2, Y, 28, TS)
        g.fillStyle = '#a15d30'
        g.fillRect(X + 5, Y, 22, TS)
        g.fillStyle = '#7a4420'
        g.fillRect(X + 10, Y + (hash(tx, ty) * 20) | 0, 3, 10)
        g.fillRect(X + 19, Y + (hash(ty, tx) * 20) | 0, 3, 8)
      } else if (t === '~') {
        const top = ty > 0 && level.grid[ty - 1][tx] !== '~'
        g.fillStyle = level.biome.id === 'burned' ? '#c8401a' : '#2f7fc8'
        g.fillRect(X, Y, TS, TS)
        g.fillStyle = level.biome.id === 'burned' ? '#ff9a2a' : '#6fc0f0'
        if (top) g.fillRect(X, Y, TS, 6)
        if (hash(tx, ty) > 0.6) g.fillRect(X + 8, Y + 14, 10, 3)
      }
    }
  }
  levelLayer = c
}

function drawBackground() {
  const id = level.biome.id
  const bg = images['bg_' + id]
  const sky = bg && bg.sky ? bg.sky : '#8ac6ee'
  const grad = ctx.createLinearGradient(0, 0, 0, 200)
  grad.addColorStop(0, id === 'burned' ? '#2a0c0a' : '#3d74c4')
  grad.addColorStop(1, sky)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  if (bg) {
    const s = 430 / bg.height
    const bw = bg.width * s
    const bh = bg.height * s
    const top = H - bh + 20
    const off = -(camera.x * 0.25) % (bw * 2)
    for (let i = -1; i < 4; i++) {
      const x = off + i * bw
      if (x > W || x + bw < 0) continue
      ctx.save()
      if (((i % 2) + 2) % 2 === 1) {
        ctx.translate(x + bw, 0)
        ctx.scale(-1, 1)
      } else ctx.translate(x, 0)
      ctx.drawImage(bg, 0, top, bw, bh)
      ctx.restore()
    }
    // Haze to push the painting back behind the playfield.
    ctx.fillStyle = id === 'burned' ? 'rgba(40,10,10,0.35)' : 'rgba(210,230,245,0.28)'
    ctx.fillRect(0, 0, W, H)
  }
}

function drawSprite(name, x, y, ax, ay, flip, opts = {}) {
  const img = opts.flash ? flashOf(name) : images[name]
  if (!img) return
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  if (opts.rot) ctx.rotate(opts.rot)
  if (flip) ctx.scale(-1, 1)
  if (opts.sx || opts.sy) ctx.scale(opts.sx || 1, opts.sy || 1)
  if (opts.skew) ctx.transform(1, 0, opts.skew, 1, 0, 0)
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha
  ctx.drawImage(img, -ax, -ay)
  ctx.restore()
}

function drawPlayer() {
  const p = player
  if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0 && !p.dead) return
  const flip = p.face < 0
  let name = 'swing0'
  let sy = 1
  let sx = 1
  let rot = 0
  if (p.climbing) {
    name = 'climb' + (Math.floor(p.climbAnim * 6) % 3)
    const m = PLAYER_META[name]
    // Align the trunk drawn in the sprite with the level trunk.
    drawSprite(name, p.climbX, p.y + 10, m.tx, m.ay, flip)
    return
  }
  if (p.attack > 0) {
    const t = 0.34 - p.attack
    name = t < 0.08 ? 'swing1' : t < 0.2 ? 'swing2' : 'swing3'
  } else if (!p.onGround) {
    name = p.vy < 0 ? 'swing1' : 'swing0'
  } else if (p.runT > 0) {
    name = 'swing3'
    sy = 1 + Math.sin(p.runT * 22) * 0.04
    sx = 1 - Math.sin(p.runT * 22) * 0.03
  } else if (p.look > 0.5) {
    name = 'look0'
  } else {
    sy = 1 + Math.sin(game.time * 3) * 0.015
  }
  if (p.hurtT > 0) rot = -p.face * 0.2
  if (p.axeOut && (name === 'swing0' || name === 'swing1')) {
    // No axe in hand: lean on the binocular pose's empty-handed look.
    name = p.onGround && p.runT <= 0 ? 'look0' : name
  }
  const m = PLAYER_META[name]
  drawSprite(name, p.x, p.y + 2, m.ax, m.ay, flip, { sx, sy, rot })
  if (p.lured > 0) {
    text('♥', p.x + Math.sin(game.time * 6) * 8, p.y - 112, 18, '#ff4f7a', 'center', null)
  }
}

function drawEnemy(e) {
  if (e.gone) return
  const name = 'e_' + e.type
  let rot = 0
  let alpha = 1
  let sy = 1 + Math.sin(e.t * 3) * 0.02
  let skew = 0
  let sx = 1
  if (e.dead) {
    const k = Math.min(1, e.deadT / 0.6)
    rot = e.fallDir * (Math.PI / 2) * k * k
    alpha = e.deadT > 0.9 ? Math.max(0, 1 - (e.deadT - 0.9) / 0.5) : 1
    if (willRevive(e)) {
      alpha = 1
      if (e.deadT > 1.6) rot *= Math.max(0, 1 - (e.deadT - 1.6) / 0.8)
    }
    if (e.boss) alpha = Math.max(alpha, 0.5)
  } else {
    if (Math.abs(e.vx) > 10) skew = -Math.sign(e.vx) * 0.12
    if (e.state === 'wind') {
      sx = 1 + Math.sin(e.stateT * 60) * 0.04
      sy = 0.94
    }
    if (e.state === 'whip') skew = Math.sin(e.stateT * 40) * 0.5
    if (e.state === 'slap') skew = e.stateT < 0.2 ? Math.sin(e.stateT * 30) * 0.3 : 0
    if (e.kind === 'ambush' && !e.revealed) {
      alpha = 0.55
      sy = 0.6
    }
    if (e.revived) sy *= 1 + Math.sin(e.t * 9) * 0.02
  }
  const img = images[name]
  ctx.save()
  ctx.translate(Math.round(e.x), Math.round(e.y + 4))
  ctx.rotate(rot)
  ctx.scale(e.scale * sx, e.scale * sy)
  ctx.transform(1, 0, skew, 1, 0, 0)
  ctx.globalAlpha = alpha
  ctx.drawImage(e.flash > 0 ? flashOf(name) : img, -img.width / 2, -img.height)
  if (e.revived && !e.boss && !e.dead) {
    ctx.globalCompositeOperation = 'source-atop'
    ctx.globalAlpha = 0.25
    ctx.fillStyle = '#80ff60'
    ctx.fillRect(-img.width / 2, -img.height, img.width, img.height)
  }
  ctx.restore()
  if (!e.dead && e.hp < e.maxHp && !e.boss) {
    const bw = 40
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(e.x - bw / 2, e.y - e.sh - 8, bw, 5)
    ctx.fillStyle = '#ffcf3a'
    ctx.fillRect(e.x - bw / 2, e.y - e.sh - 8, (bw * e.hp) / e.maxHp, 5)
  }
}

function drawShot(s) {
  ctx.save()
  ctx.translate(s.x, s.y)
  if (s.kind === 'axe') {
    ctx.rotate(s.spin * Math.sign(s.vx || 1))
    ctx.fillStyle = '#1a1210'
    ctx.fillRect(-3, -18, 7, 36)
    ctx.fillStyle = '#8a5a2b'
    ctx.fillRect(-2, -17, 5, 34)
    ctx.fillStyle = '#1a1210'
    ctx.fillRect(2, -19, 16, 16)
    ctx.fillStyle = '#c8ccd2'
    ctx.fillRect(3, -18, 14, 14)
    ctx.fillStyle = '#eef0f2'
    ctx.fillRect(13, -18, 4, 14)
  } else if (s.kind === 'berry') {
    ctx.fillStyle = '#5a0f1f'
    ctx.beginPath()
    ctx.arc(0, 0, s.r + 1, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#d0305a'
    ctx.beginPath()
    ctx.arc(0, 0, s.r - 1, 0, 7)
    ctx.fill()
    ctx.fillStyle = '#ff9ab0'
    ctx.fillRect(-3, -4, 3, 3)
  } else if (s.kind === 'acorn') {
    ctx.rotate(s.t * 8)
    ctx.fillStyle = '#3a220f'
    ctx.fillRect(-10, -12, 20, 24)
    ctx.fillStyle = '#b07a40'
    ctx.fillRect(-8, -4, 16, 14)
    ctx.fillStyle = '#6b4428'
    ctx.fillRect(-9, -11, 18, 8)
  } else {
    ctx.rotate(Math.atan2(s.vy, s.vx))
    ctx.fillStyle = s.kind === 'spike' ? '#2f8a70' : '#e8d8a0'
    ctx.beginPath()
    ctx.moveTo(10, 0)
    ctx.lineTo(-8, -3)
    ctx.lineTo(-8, 3)
    ctx.fill()
  }
  ctx.restore()
}

function drawClouds() {
  for (const c of clouds) {
    if (c.kind === 'root') {
      if (c.t < 0.6) {
        ctx.fillStyle = `rgba(80,40,20,${0.3 + 0.4 * Math.sin(c.t * 30) ** 2})`
        ctx.fillRect(c.x - 26, c.y - 4, 52, 6)
      } else {
        const k = Math.min(1, (c.t - 0.6) / 0.12) * (c.t > 0.95 ? Math.max(0, 1 - (c.t - 0.95) / 0.15) : 1)
        const h = 110 * k
        for (const [ox, w, hh] of [[-18, 12, 0.7], [-4, 14, 1], [10, 12, 0.8]]) {
          ctx.fillStyle = '#1e120a'
          ctx.beginPath()
          ctx.moveTo(c.x + ox - 2, c.y)
          ctx.lineTo(c.x + ox + w / 2, c.y - h * hh - 4)
          ctx.lineTo(c.x + ox + w + 2, c.y)
          ctx.fill()
          ctx.fillStyle = '#7a4a25'
          ctx.beginPath()
          ctx.moveTo(c.x + ox, c.y)
          ctx.lineTo(c.x + ox + w / 2, c.y - h * hh)
          ctx.lineTo(c.x + ox + w, c.y)
          ctx.fill()
        }
      }
      continue
    }
    const fade = Math.min(1, (c.life - c.t) / 0.6)
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + c.t
      ctx.fillStyle = `rgba(${c.color},${0.22 * fade})`
      ctx.beginPath()
      ctx.arc(c.x + Math.cos(a) * c.r * 0.4, c.y + Math.sin(a) * c.r * 0.3, c.r * 0.7, 0, 7)
      ctx.fill()
    }
  }
}

function drawPickups() {
  for (const k of pickups) {
    const bob = k.falling ? 0 : Math.sin(k.t * 4) * 3
    const x = Math.round(k.x)
    const y = Math.round(k.y + bob)
    if (k.kind === 'flapjack') {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#5a3210'
        ctx.fillRect(x - 13, y + 4 - i * 6, 26, 7)
        ctx.fillStyle = '#e0a050'
        ctx.fillRect(x - 12, y + 5 - i * 6, 24, 4)
      }
      ctx.fillStyle = '#ffe680'
      ctx.fillRect(x - 4, y - 12, 8, 4)
      ctx.fillStyle = 'rgba(150,70,10,0.8)'
      ctx.fillRect(x - 8, y - 9, 16, 3)
      ctx.fillRect(x + 6, y - 9, 3, 8)
    } else {
      ctx.fillStyle = '#2a170c'
      ctx.fillRect(x - 15, y - 8, 30, 16)
      ctx.fillStyle = '#8a5a2b'
      ctx.fillRect(x - 14, y - 7, 26, 14)
      ctx.fillStyle = '#e2b07a'
      ctx.fillRect(x + 9, y - 7, 5, 14)
      ctx.fillStyle = '#b07a40'
      ctx.fillRect(x + 10, y - 3, 3, 6)
    }
  }
}

function drawProps() {
  for (const c of level.checkpoints) {
    const x = Math.round(c.x)
    const y = Math.round(c.y)
    ctx.fillStyle = '#2a170c'
    ctx.fillRect(x - 18, y - 22, 36, 22)
    ctx.fillStyle = '#8a5a2b'
    ctx.fillRect(x - 16, y - 20, 32, 20)
    ctx.fillStyle = '#e2b07a'
    ctx.fillRect(x - 16, y - 22, 32, 5)
    // axe stuck in the stump
    ctx.fillStyle = '#5c3a1a'
    ctx.fillRect(x - 2, y - 52, 5, 32)
    ctx.fillStyle = c.on ? '#ffe680' : '#c8ccd2'
    ctx.fillRect(x + 2, y - 52, 14, 12)
    if (c.on) {
      ctx.fillStyle = `rgba(255,230,120,${0.25 + 0.15 * Math.sin(game.time * 4)})`
      ctx.beginPath()
      ctx.arc(x + 8, y - 46, 18, 0, 7)
      ctx.fill()
    }
  }
  const g = level.goal
  if (!g.hidden) {
    const x = Math.round(g.x)
    const y = Math.round(g.y)
    ctx.fillStyle = '#2a170c'
    ctx.fillRect(x - 4, y - 90, 10, 90)
    ctx.fillStyle = '#8a5a2b'
    ctx.fillRect(x - 2, y - 90, 6, 90)
    ctx.fillStyle = '#2a170c'
    ctx.fillRect(x - 40, y - 96, 84, 34)
    ctx.fillStyle = '#b07a40'
    ctx.fillRect(x - 38, y - 94, 80, 30)
    const last = game.levelIndex >= BIOMES.length - 1
    text(last ? 'HOME' : 'ONWARD →', x + 2, y - 79, 14, '#2a170c', 'center', null)
  }
}

function drawAir() {
  for (const a of air) {
    const x = a.x - camera.x
    const y = a.y - camera.y
    const fade = Math.min(1, a.t, a.life - a.t)
    if (a.kind === 'embers') ctx.fillStyle = `rgba(255,${120 + ((a.ph * 20) | 0)},40,${fade})`
    else if (a.kind === 'leaves') ctx.fillStyle = `rgba(240,${170 + ((a.ph * 10) | 0)},30,${fade})`
    else if (a.kind === 'dust') ctx.fillStyle = `rgba(230,200,150,${fade * 0.5})`
    else ctx.fillStyle = `rgba(60,110,50,${fade})`
    const s = a.kind === 'embers' ? 3 : a.kind === 'needles' ? 2 : 4
    ctx.fillRect(Math.round(x), Math.round(y), a.kind === 'needles' ? 6 : s, s)
  }
}

function heart(x, y, full) {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
  const s = 4
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] !== 'X') continue
      ctx.fillStyle = full ? (r === 1 && c < 3 ? '#ff9a9a' : '#e02828') : '#2a3346'
      ctx.fillRect(x + c * s, y + r * s, s, s)
    }
  }
}

function drawHUD() {
  ctx.fillStyle = 'rgba(15,20,30,0.55)'
  ctx.fillRect(10, 10, 260, 44)
  for (let i = 0; i < player.maxHp; i++) heart(20 + i * 34, 18, i < player.hp)
  // wood counter
  ctx.fillStyle = '#2a170c'
  ctx.fillRect(170, 20, 30, 16)
  ctx.fillStyle = '#8a5a2b'
  ctx.fillRect(171, 21, 26, 14)
  ctx.fillStyle = '#e2b07a'
  ctx.fillRect(193, 21, 5, 14)
  text(`× ${game.wood}`, 208, 30, 18, '#fff', 'left')
  text(level.biome.name, W - 14, 26, 16, '#fff', 'right')
  if (player.axeOut) text('axe thrown', 20, 66, 12, '#ddd', 'left')

  const boss = enemies.find((e) => e.boss)
  if (boss && boss.awake && !boss.dead) {
    const bw = 420
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(W / 2 - bw / 2 - 4, H - 46, bw + 8, 24)
    ctx.fillStyle = '#4f8a2a'
    ctx.fillRect(W / 2 - bw / 2, H - 42, (bw * boss.hp) / boss.maxHp, 16)
    text(boss.name, W / 2, H - 58, 16, '#ffd23f')
  }

  if (banner > 0 && game.state === 'play') {
    const a = Math.min(1, banner, 3 - banner + 0.3)
    ctx.globalAlpha = clamp(a, 0, 1)
    ctx.fillStyle = 'rgba(20,12,8,0.75)'
    ctx.fillRect(W / 2 - 280, 120, 560, 96)
    ctx.strokeStyle = '#b07a40'
    ctx.lineWidth = 4
    ctx.strokeRect(W / 2 - 280, 120, 560, 96)
    text(level.biome.name.toUpperCase(), W / 2, 152, 36, '#f4e2c0')
    text(level.biome.tagline, W / 2, 192, 18, '#e2b07a', 'center', null)
    ctx.globalAlpha = 1
  }
}

function drawBinocularMask() {
  const k = player.look
  if (k <= 0) return
  ctx.save()
  ctx.globalAlpha = k
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  const r = 210
  ctx.arc(W / 2 - 150, H / 2, r, 0, Math.PI * 2, true)
  ctx.arc(W / 2 + 150, H / 2, r, 0, Math.PI * 2, true)
  ctx.fill('evenodd')
  ctx.restore()
}

function render() {
  if (game.state === 'title') return drawTitle()
  const sx = camera.shake > 0 ? rand(-6, 6) * camera.shake * 3 : 0
  const sy = camera.shake > 0 ? rand(-6, 6) * camera.shake * 3 : 0
  drawBackground()
  ctx.save()
  ctx.translate(-Math.round(camera.x + sx), -Math.round(camera.y + sy))
  const lx = clamp(Math.floor(camera.x) - 8, 0, levelLayer.width - 1)
  const lw = Math.min(W + 24, levelLayer.width - lx)
  ctx.drawImage(levelLayer, lx, 0, lw, LEVEL_H, lx, 0, lw, LEVEL_H)
  drawProps()
  drawPickups()
  for (const e of enemies) drawEnemy(e)
  drawClouds()
  drawPlayer()
  for (const s of shots) drawShot(s)
  for (const q of particles) {
    ctx.fillStyle = q.color
    ctx.globalAlpha = Math.min(1, (q.life - q.t) * 4)
    ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size)
  }
  ctx.globalAlpha = 1
  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.t * 2)
    text(f.text, f.x, f.y, f.size || 18, f.color, 'center', f.heart ? null : '#1a1210')
  }
  ctx.globalAlpha = 1
  ctx.restore()
  drawAir()
  drawBinocularMask()
  drawHUD()

  if (game.state === 'dead') {
    ctx.fillStyle = `rgba(30,5,5,${Math.min(0.75, game.stateT)})`
    ctx.fillRect(0, 0, W, H)
    text('THE PLANTS GOT YOU', W / 2, H / 2 - 50, 44, '#ff6a4a')
    text('Different enemies. Same goal... eat the lumberjack.', W / 2, H / 2 + 4, 18, '#f4e2c0', 'center', null)
    if (game.stateT > 0.8) text('Press Enter / tap to get back up', W / 2, H / 2 + 60, 20, '#ffd23f')
  } else if (game.state === 'clear') {
    ctx.fillStyle = `rgba(10,20,10,${Math.min(0.7, game.stateT)})`
    ctx.fillRect(0, 0, W, H)
    text(`${level.biome.name} cleared!`, W / 2, H / 2 - 40, 40, '#9fe870')
    text(`Wood chopped: ${game.wood}`, W / 2, H / 2 + 10, 20, '#e2b07a', 'center', null)
    if (game.stateT > 0.8) text('Press Enter / tap for the next biome', W / 2, H / 2 + 60, 20, '#ffd23f')
  } else if (game.state === 'win') {
    drawWin()
  } else if (game.state === 'pause') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, W, H)
    text('PAUSED', W / 2, H / 2 - 20, 48)
    text('Esc / P to resume · M to mute', W / 2, H / 2 + 30, 18, '#ccc', 'center', null)
  }
}

function drawLogo(cx, cy, s = 1) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.fillStyle = '#2a170c'
  ctx.fillRect(-250, -62, 500, 74)
  ctx.fillStyle = '#8a5a2b'
  ctx.fillRect(-246, -58, 492, 66)
  ctx.fillStyle = '#a8703a'
  ctx.fillRect(-246, -58, 492, 10)
  text('LUMBERJACK', 0, -22, 56, '#f4e2c0', 'center', '#2a170c')
  text('vs. the', 0, 30, 22, '#f4e2c0')
  text('PLANTS', 0, 78, 64, '#7fd23a', 'center', '#173a0c')
  ctx.restore()
}

function drawTitle() {
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#2c5f9e')
  grad.addColorStop(1, '#9fd0ee')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  const bg = images.bg_evergreen
  if (bg) {
    const s = 360 / bg.height
    const off = -(game.time * 20) % (bg.width * s)
    for (let i = 0; i < 3; i++) ctx.drawImage(bg, off + i * bg.width * s - 1, H - 360, bg.width * s, 360)
    ctx.fillStyle = 'rgba(15,25,40,0.35)'
    ctx.fillRect(0, 0, W, H)
  }
  drawLogo(W / 2, 110, 1)
  const heroes = ['hero0', 'hero1', 'hero2']
  heroes.forEach((n, i) => {
    const img = images[n]
    if (!img) return
    const s = 0.75
    const x = W / 2 + (i - 1) * 230
    const bob = Math.sin(game.time * 2 + i) * 4
    ctx.drawImage(img, x - (img.width * s) / 2, 430 - img.height * s + bob, img.width * s, img.height * s)
  })
  ctx.fillStyle = 'rgba(20,12,8,0.7)'
  ctx.fillRect(0, 446, W, 94)
  const blink = Math.floor(game.time * 2) % 2 === 0
  if (blink) text('Press Enter or tap to start', W / 2, 470, 24, '#ffd23f')
  text('Move: ←→/A D   Jump: Space/Z   Chop: J/X   Throw axe: K/C   Climb: ↑↓   Binoculars: Shift/↓', W / 2, 502, 14, '#f4e2c0', 'center', null)
  text('"Chop what you can, explore what you can\'t."', W / 2, 524, 14, '#e2b07a', 'center', null)
}

function drawWin() {
  ctx.fillStyle = `rgba(10,15,25,${Math.min(0.85, game.stateT)})`
  ctx.fillRect(0, 0, W, H)
  drawLogo(W / 2, 90, 0.8)
  const img = images.hero2
  if (img) {
    const s = 0.8
    ctx.drawImage(img, W / 2 - (img.width * s) / 2, 380 - img.height * s, img.width * s, img.height * s)
  }
  text('Craigy is firewood. The forest is yours.', W / 2, 410, 24, '#9fe870')
  text(`Wood chopped: ${game.wood}   ·   Times eaten: ${game.deaths}`, W / 2, 446, 18, '#e2b07a', 'center', null)
  if (game.stateT > 1.5) text('Press Enter / tap to play again', W / 2, 490, 20, '#ffd23f')
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function update(dt) {
  game.time += dt
  if (consume('mute')) audio.muted = !audio.muted

  if (game.state === 'title') {
    if (consume('start') || consume('jump') || consume('chop')) {
      game.levelIndex = 0
      startLevel(0)
      game.state = 'play'
    }
    return
  }
  if (game.state === 'pause') {
    if (consume('pause')) game.state = 'play'
    return
  }
  game.stateT = (game.stateT || 0) + dt
  if (game.state === 'dead') {
    camera.shake = 0
    if (game.stateT > 0.8 && (consume('start') || consume('jump') || consume('chop'))) {
      startLevel(game.levelIndex, true)
      game.state = 'play'
    }
    updateParticles(dt)
    return
  }
  if (game.state === 'clear') {
    if (game.stateT > 0.8 && (consume('start') || consume('jump') || consume('chop'))) {
      game.levelIndex = Math.min(game.levelIndex + 1, BIOMES.length - 1)
      startLevel(game.levelIndex)
      game.state = 'play'
    }
    return
  }
  if (game.state === 'win') {
    if (game.stateT > 1.5 && (consume('start') || consume('jump') || consume('chop'))) {
      game = newGame()
    }
    return
  }
  if (consume('pause')) {
    game.state = 'pause'
    return
  }

  banner = Math.max(0, banner - dt)
  updatePlayer(dt)
  for (const e of enemies) updateEnemy(e, dt)
  enemies = enemies.filter((e) => !e.gone || e.boss)
  updateShots(dt)
  updateClouds(dt)
  updateParticles(dt)
  updateAir(dt)

  // Camera
  const lookAhead = player.face * (60 + player.look * 320)
  const target = clamp(player.x - W / 2 + lookAhead, 0, level.width * TS - W)
  camera.x += (target - camera.x) * Math.min(1, dt * 6)
  camera.y = LEVEL_H - H
  camera.shake = Math.max(0, camera.shake - dt)
}

let last = performance.now()
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000)
  last = now
  // Two physics substeps per frame keep collisions solid at low frame rates.
  if (game.state === 'play') {
    update(dt / 2)
    update(dt / 2)
  } else update(dt)
  render()
  requestAnimationFrame(frame)
}

async function boot() {
  const jobs = []
  for (const n of ['swing0', 'swing1', 'swing2', 'swing3', 'climb0', 'climb1', 'climb2', 'look0', 'hero0', 'hero1', 'hero2']) jobs.push(loadImage(n, n + '.png'))
  for (const n of ENEMY_NAMES) jobs.push(loadImage('e_' + n, 'e_' + n + '.png'))
  for (const b of BIOMES) jobs.push(loadImage('bg_' + b.id, 'bg_' + b.id + '.png'))
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  text('Sharpening axe...', W / 2, H / 2, 24)
  await Promise.all(jobs)
  for (const b of BIOMES) fadeBackground('bg_' + b.id)
  if (document.fonts) await document.fonts.ready.catch(() => {})
  game = newGame()
  // Debug hook for automated checks.
  window.__lj = { get game() { return game }, get player() { return player }, get enemies() { return enemies }, startLevel, get level() { return level } }
  requestAnimationFrame(frame)
}

boot()
