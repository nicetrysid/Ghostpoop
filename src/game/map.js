export const TILE_SIZE = 32;

export const GRID_W = 18;
export const GRID_H = 14;

// Ground tile chars: G grass, W creek/pond water, B boulder wall (canyon rim).
// Landmark structures (unwalkable, decorative — the interactable thing at
// each one is the NPC standing in front of it, or the home burrow itself):
// H = your burrow (The Core), K = Skitters' Bush, N = Weg's Mound,
// R = Dennis's Tree, M = The Market stall, Y = Bart's Houseboat/dock.
const FEATURES = [
  { x: 8, y: 6, char: "H" }, // The Core — player's burrow
  { x: 8, y: 3, char: "K" }, // Skitters' Bush
  { x: 4, y: 7, char: "N" }, // Weg's Mound
  { x: 4, y: 10, char: "R" }, // Dennis's Tree
  { x: 13, y: 6, char: "M" }, // The Market
  { x: 14, y: 10, char: "Y" }, // Bart's Houseboat
  // scattered decorative trees, purely atmospheric
  { x: 2, y: 9, char: "T" },
  { x: 15, y: 3, char: "T" },
  { x: 9, y: 11, char: "T" },
  // the creek, running roughly northwest toward the lower pool
  { x: 2, y: 2, char: "W" },
  { x: 2, y: 3, char: "W" },
  { x: 3, y: 3, char: "W" },
  { x: 3, y: 4, char: "W" },
  { x: 4, y: 4, char: "W" },
  { x: 4, y: 5, char: "W" },
];

for (let y = 9; y <= 11; y++) {
  for (let x = 13; x <= 16; x++) {
    FEATURES.push({ x, y, char: "W" });
  }
}
// the houseboat sits at the pool's edge, overriding one water tile
FEATURES.push({ x: 14, y: 10, char: "Y" });

function buildTerrain() {
  const grid = [];
  for (let y = 0; y < GRID_H; y++) {
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      const border = x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
      row.push(border ? "B" : "G");
    }
    grid.push(row);
  }
  for (const f of FEATURES) grid[f.y][f.x] = f.char;
  return grid;
}

const TERRAIN = buildTerrain();

const UNWALKABLE = new Set(["B", "W", "H", "K", "N", "R", "M", "Y", "T"]);

export function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return "B";
  return TERRAIN[y][x];
}

export function isWalkable(x, y) {
  return !UNWALKABLE.has(tileAt(x, y));
}

export const HOME = { x: 8, y: 6 };
export const PLAYER_START = { x: 8, y: 8 };

export const NPCS = [
  {
    id: "weg",
    name: "Weg",
    x: 4,
    y: 8,
    sprite: "weg",
    prefers: "bedding",
    giftLine: "Weg turns it over once. \"Didn't need to.\" He keeps it anyway.",
    mismatchLine: "Weg takes it without comment. It's not what he'd have chosen.",
    lines: [
      "Weg: You walked here. That's true, at least.",
      "Weg: Your burrow's coming along. Or it isn't. I'd say if it wasn't.",
      "Weg: Claudius says you're alright. He's not often wrong.",
      "Weg: Good. Sit if you're staying.",
    ],
  },
  {
    id: "skitters",
    name: "Skitters",
    x: 8,
    y: 4,
    sprite: "skitters",
    prefers: "seeds",
    giftLine: "Skitters practically vanishes with it. Seed cake tonight, probably.",
    mismatchLine: "Skitters eyes it, unimpressed, but pockets it anyway.",
    lines: [
      "Skitters: Saw you coming from the ridge. Course I did.",
      "Skitters: Word is Pepper's missing a delivery. Not my business. Mostly.",
      "Skitters: ...that's seeds you've got? You know the way to a mouse's heart.",
      "Skitters: Good to see you settling in. Really.",
    ],
  },
  {
    id: "dennis",
    name: "Dennis",
    x: 4,
    y: 11,
    sprite: "dennis",
    prefers: "seeds",
    giftLine: "Dennis beams. \"A good seed! You remembered.\"",
    mismatchLine: "Dennis accepts it with total, cheerful sincerity anyway.",
    lines: [
      "Dennis: My tree slapped me again this morning. It's the wind. Definitely the wind.",
      "Dennis: Ask me anything. I'll have an answer. Can't promise it's right.",
      "Dennis: A good seed, for me? Well now. Thank you.",
      "Dennis: Kids come by with questions. I like that. Keeps a mouse honest. Mostly.",
    ],
  },
  {
    id: "jeff",
    name: "Jeff",
    x: 12,
    y: 9,
    sprite: "jeff",
    prefers: "seeds",
    giftLine: "Jeff's hunger vanishes on contact. \"Oh — better. Thanks.\"",
    mismatchLine: "Jeff sniffs it, confused, then pockets it out of principle.",
    lines: [
      "Jeff: Oh — hi. Do you have the thing? I don't know what thing. Just a thing.",
      "Jeff: I'm not hungry. I'm not hungry. I'm SO hungry.",
      "Jeff: ...okay. Better. What were we doing?",
      "Jeff: I know a shortcut. I don't know how I know. I just do.",
    ],
  },
];

export const RESOURCE_NODES = [
  { id: "seed-market", type: "seeds", x: 13, y: 7 },
  { id: "seed-ledge", type: "seeds", x: 11, y: 3 },
  { id: "bedding-creek", type: "bedding", x: 5, y: 4 },
  { id: "bedding-meadow", type: "bedding", x: 6, y: 11 },
];
