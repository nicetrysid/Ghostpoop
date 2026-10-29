// Level data for Lumberjack vs. the Plants.
//
// Levels are stitched together from chunks. Chunks are bottom-aligned to the
// level height and use these symbols:
//   #  solid ground          =  one-way wooden platform / log bridge
//   |  climbable trunk       ^  thorns (solid, hurts on contact)
//   ~  water (drowns you)    f  flapjacks (heals one heart)
//   C  checkpoint stump      G  goal signpost
//   P  player start          B  boss spawn
//   1-5  enemy slot, resolved per biome (see BIOMES[].slots)

export const ROWS = 17

const CHUNKS = {
  start: [
    '........................',
    '..................f.....',
    '.................===....',
    '........................',
    '........................',
    '.P..........1...........',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  gap: [
    '........................',
    '.........f..............',
    '........====............',
    '........................',
    '........................',
    '...................2....',
    '#######.......##########',
    '#######.......##########',
    '#######.......##########',
    '#######.......##########',
  ],
  climb: [
    '..............f.........',
    '.........=======........',
    '.........|..............',
    '.........|..............',
    '.........|..........3...',
    '.........|.....=====....',
    '.........|..............',
    '.........|..............',
    '....1....|..............',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  steps: [
    '........................',
    '....................f...',
    '..................####..',
    '..................####..',
    '.............###..####..',
    '.............###........',
    '........###..........4..',
    '.....2..###.............',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  bridge: [
    '........................',
    '..........f.............',
    '.........====...........',
    '........................',
    '........................',
    '.......5.........1......',
    '###=========..=======###',
    '###~~~~~~~~~~~~~~~~~~###',
    '###~~~~~~~~~~~~~~~~~~###',
    '###~~~~~~~~~~~~~~~~~~###',
  ],
  arena: [
    '........................',
    '.......====......====...',
    '........................',
    '........................',
    'C..2.......4......1.....',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  tower: [
    '...............f........',
    '..............====......',
    '........................',
    '.........====...........',
    '........................',
    '....====.......3........',
    '...........#######......',
    '....1......#######...2..',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  thorns: [
    '........................',
    '........................',
    '.......=====............',
    '........................',
    '........................',
    '....2...........5.......',
    '#####^^^^^^^^^^^########',
    '########################',
    '########################',
    '########################',
  ],
  lure: [
    '........................',
    '...f....................',
    '..====..................',
    '........................',
    '........................',
    'C...........5......3....',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  end: [
    '........................',
    '........................',
    '........................',
    '..3.................G...',
    '########################',
    '########################',
    '########################',
    '########################',
  ],
  boss: [
    '....................................#',
    '....................................#',
    '....................................#',
    '......====..................====....#',
    '....................................#',
    '....................................#',
    'C.........................B.........#',
    '#####################################',
    '#####################################',
    '#####################################',
    '#####################################',
  ],
}

export const BIOMES = [
  {
    id: 'evergreen',
    name: 'Evergreen Forest',
    tagline: 'Tall trees. Cool air. Hidden dangers.',
    slots: { 1: 'rabbitbrush', 2: 'rose', 3: 'willow', 4: 'oak', 5: 'bikini' },
    ground: { top: '#5aa832', top2: '#3f7d22', dirt: '#6b4428', dirt2: '#55361f', stone: '#6f7378' },
    air: 'needles',
    chunks: ['start', 'gap', 'climb', 'arena', 'bridge', 'lure', 'steps', 'end'],
  },
  {
    id: 'aspen',
    name: 'Aspen Forest',
    tagline: 'Beautiful. Bright. Still dangerous.',
    slots: { 1: 'rabbitbrush', 2: 'marigold', 3: 'manzanita', 4: 'aspen', 5: 'bikini' },
    ground: { top: '#d9a521', top2: '#7aa62c', dirt: '#6b4428', dirt2: '#55361f', stone: '#77706a' },
    air: 'leaves',
    chunks: ['start', 'steps', 'tower', 'arena', 'thorns', 'climb', 'lure', 'gap', 'end'],
  },
  {
    id: 'desert',
    name: 'Juniper Desert',
    tagline: 'Dry. Rugged. Full of surprises.',
    slots: { 1: 'cactus', 2: 'sage', 3: 'yucca', 4: 'juniper', 5: 'bikini' },
    ground: { top: '#c9a24a', top2: '#8f8a3a', dirt: '#a5552c', dirt2: '#84401f', stone: '#b9774a' },
    air: 'dust',
    chunks: ['start', 'thorns', 'tower', 'gap', 'arena', 'steps', 'climb', 'lure', 'thorns', 'end'],
  },
  {
    id: 'burned',
    name: 'Burned Forest',
    tagline: 'Nothing stays dead for long.',
    slots: { 1: 'juniper', 2: 'manzanita', 3: 'rose', 4: 'oak', 5: 'juniper' },
    ground: { top: '#3a3433', top2: '#ff6a1a', dirt: '#221c1c', dirt2: '#140f10', stone: '#3c3536' },
    air: 'embers',
    chunks: ['start', 'arena', 'thorns', 'tower', 'bridge', 'climb', 'steps', 'boss'],
  },
]

// Builds a level grid plus entity list for a biome index.
export function buildLevel(index) {
  const biome = BIOMES[index]
  const parts = biome.chunks.map((name) => {
    const rows = CHUNKS[name]
    const w = Math.max(...rows.map((r) => r.length))
    const pad = Array.from({ length: ROWS - rows.length }, () => '.'.repeat(w))
    return [...pad, ...rows.map((r) => r.padEnd(w, '.'))]
  })
  const width = parts.reduce((n, p) => n + p[0].length, 0)
  const grid = []
  const entities = []
  for (let y = 0; y < ROWS; y++) grid.push(new Array(width).fill('.'))
  let ox = 0
  for (const part of parts) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < part[y].length; x++) {
        const ch = part[y][x]
        const gx = ox + x
        if ('#=|^~'.includes(ch)) grid[y][gx] = ch
        else if (ch === 'P') entities.push({ type: 'player', x: gx, y })
        else if (ch === 'f') entities.push({ type: 'flapjack', x: gx, y })
        else if (ch === 'C') entities.push({ type: 'checkpoint', x: gx, y })
        else if (ch === 'G') entities.push({ type: 'goal', x: gx, y })
        else if (ch === 'B') entities.push({ type: 'boss', x: gx, y })
        else if (biome.slots[ch]) entities.push({ type: 'enemy', kind: biome.slots[ch], x: gx, y })
      }
    }
    ox += part[0].length
  }
  // Checkpoints sit on the ground; never inside a wall column.
  for (const e of entities) if (e.type === 'checkpoint' && grid[e.y][e.x] === '#') e.x += 1
  return { biome, grid, width, entities }
}
