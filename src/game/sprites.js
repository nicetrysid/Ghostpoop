// All pixel art in this game is authored here as small character grids.
// '.' = transparent. Every other character is a palette key -> CSS color.

// ---------------------------------------------------------------- ground --

export const GRASS_A = {
  palette: { 1: "#4a7c3f", 2: "#5a934b" },
  rows: [
    "11211121",
    "21121211",
    "11211121",
    "21121211",
    "11211121",
    "21121211",
    "11211121",
    "21121211",
  ],
};

export const GRASS_B = {
  palette: { 1: "#4a7c3f", 2: "#5a934b" },
  rows: [
    "21121211",
    "11211121",
    "21121211",
    "11211121",
    "21121211",
    "11211121",
    "21121211",
    "11211121",
  ],
};

export const WATER = {
  palette: { 1: "#3a6ea5", 2: "#4a7fb5", 3: "#5a90c5" },
  rows: [
    "11122111",
    "11222211",
    "12222221",
    "22222222",
    "11122111",
    "11222211",
    "12222221",
    "22222222",
  ],
};

// canyon rim — red sandstone
export const BOULDER = {
  palette: { 1: "#9c5a3f", 2: "#864a32", 3: "#b06f4f" },
  rows: [
    "11122311",
    "12233211",
    "22333221",
    "13322331",
    "31133113",
    "22333221",
    "12233211",
    "11122311",
  ],
};

// -------------------------------------------------------------- landmarks --

export const BUSH = {
  palette: { l: "#3f7a3a", d: "#2f5e2c", b: "#1f3d1c" },
  rows: [
    "..dlll..",
    ".lllllll",
    "llllllll",
    "lldllldl",
    "llllllll",
    ".lllllll",
    "..bbbb..",
    "........",
  ],
};

export const TREE = {
  palette: { l: "#2f6b2a", d: "#255420", t: "#6b4a2f" },
  rows: [
    ".dllll..",
    "dllllll.",
    "lllllll.",
    ".lllld..",
    "..dlll..",
    "...tt...",
    "...tt...",
    "...tt...",
  ],
};

export const MOUND = {
  palette: { 1: "#8a6a45", 2: "#6b4a2f", 3: "#3d2a1a" },
  rows: [
    "..1111..",
    ".111111.",
    "11111111",
    "11122111",
    "11233211",
    "11322311",
    "..3333..",
    "........",
  ],
};

export const MARKET = {
  palette: { a: "#5a90c5", w: "#8a6a45", t: "#c9b28a" },
  rows: [
    "aaaaaaaa",
    "aaaaaaaa",
    "........",
    "ttttttt.",
    "wwwwwwww",
    "w......w",
    "w......w",
    "........",
  ],
};

export const HOUSEBOAT = {
  palette: { h: "#6b4a2f", r: "#8a3b2e", w: "#3a6ea5" },
  rows: [
    "..rrrr..",
    ".rhhhhr.",
    "..hhhh..",
    "hhhhhhhh",
    "hhhhhhhh",
    "wwwwwwww",
    "wwwwwwww",
    "wwwwwwww",
  ],
};

// player burrow — three stages, drawn instead of MOUND at the home tile
export const BURROW_STAGES = [
  {
    // bare hole
    palette: { 1: "#8a6a45", 2: "#3d2a1a" },
    rows: [
      "..1111..",
      ".111111.",
      "11111111",
      "11122111",
      "11222211",
      "11222211",
      "..2222..",
      "........",
    ],
  },
  {
    // bedding added — soft cream tuft at the entrance
    palette: { 1: "#8a6a45", 2: "#3d2a1a", c: "#e8dcc0" },
    rows: [
      "..1111..",
      ".111111.",
      "11111111",
      "11122111",
      "1c2222c1",
      "1c2222c1",
      "..2222..",
      "........",
    ],
  },
  {
    // furnished — seed stash visible alongside the bedding
    palette: { 1: "#8a6a45", 2: "#3d2a1a", c: "#e8dcc0", s: "#d9a441" },
    rows: [
      "..1111..",
      ".111111.",
      "1s111s11",
      "11122111",
      "1c2222c1",
      "1c2222c1",
      "..2222..",
      "........",
    ],
  },
];

// ---------------------------------------------------------------- pickups --

export const SEED_PICKUP = {
  palette: { s: "#d9a441", d: "#a97a2f" },
  rows: [
    "........",
    "........",
    "..s..s..",
    ".s.d.s..",
    "..s..s..",
    "........",
    "........",
    "........",
  ],
};

export const BEDDING_PICKUP = {
  palette: { c: "#e8dcc0", d: "#c9b896" },
  rows: [
    "........",
    "........",
    ".cc.cc..",
    "cddccddc",
    ".cc.cc..",
    "........",
    "........",
    "........",
  ],
};

export const TILE_SPRITES = {
  G: [GRASS_A, GRASS_B],
  W: [WATER],
  B: [BOULDER],
  K: [BUSH],
  N: [MOUND],
  R: [TREE],
  M: [MARKET],
  Y: [HOUSEBOAT],
  T: [TREE],
};

// -------------------------------------------------------------- characters --

function mouseRows(faceRow) {
  return [
    ".oo..oo.",
    ".op..po.",
    "oaaaaaao",
    "oaaaaaao",
    faceRow,
    "oaannaao",
    "oassssao",
    ".oaaaao.",
    "..o..o..",
    "........",
  ];
}

const FACE_DOWN = "oaeaaeao";
const FACE_UP = "oaaaaaao";

function mousePalette(fur, shadow) {
  return {
    o: "#2b241d",
    a: fur,
    s: shadow,
    p: "#e8a0b0",
    e: "#1b1b1b",
    n: "#c96a80",
  };
}

function mouseSide(fur, shadow) {
  return {
    palette: mousePalette(fur, shadow),
    rows: [
      "..oo....",
      ".oaao...",
      "oaaaao..",
      "oaaaaaoo",
      "oaaaeaon",
      "oaaaaaoo",
      "oassssoo",
      ".oaaao..",
      "..o..o..",
      "........",
    ],
  };
}

export function makeMouseSprites(fur, shadow) {
  const palette = mousePalette(fur, shadow);
  return {
    down: { palette, rows: mouseRows(FACE_DOWN) },
    up: { palette, rows: mouseRows(FACE_UP) },
    side: mouseSide(fur, shadow),
  };
}

export const PLAYER_SPRITES = makeMouseSprites("#d8d2c6", "#b0a99c");
export const WEG_SPRITES = makeMouseSprites("#8a8478", "#69645a");
export const SKITTERS_SPRITES = makeMouseSprites("#c97b4a", "#a45f37");
export const DENNIS_SPRITES = makeMouseSprites("#8a7048", "#6b5636");
export const JEFF_SPRITES = makeMouseSprites("#e8c66b", "#c9a94a");

export const NPC_SPRITE_SETS = {
  weg: WEG_SPRITES,
  skitters: SKITTERS_SPRITES,
  dennis: DENNIS_SPRITES,
  jeff: JEFF_SPRITES,
};

export const NPC_SCALE = {
  weg: 1,
  skitters: 1,
  dennis: 1,
  jeff: 0.8, // Jeff's a kit — smaller
};
