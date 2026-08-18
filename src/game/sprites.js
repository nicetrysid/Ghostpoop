// All pixel art in this game is authored here as small character grids.
// '.' = transparent. Every other character is a palette key -> CSS color.
//
// Palette direction: warm, saturated SNES-Harvest-Moon pastoral colors
// (vivid grass, cheerful turquoise water, terracotta cliffs, rich wood)
// with Animal-Crossing-style rounder, blushed character faces.

// ---------------------------------------------------------------- ground --

export const GRASS_A = {
  palette: { 1: "#63a848", 2: "#78c95c" },
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
  palette: { 1: "#63a848", 2: "#78c95c" },
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

// A little meadow charm — small flower flecks sprinkled sparingly.
export const GRASS_C = {
  palette: { 1: "#63a848", 2: "#78c95c", f: "#f7c9dc", y: "#f7e07a" },
  rows: [
    "21121211",
    "11f11121",
    "21121211",
    "11211211",
    "2112y211",
    "11211121",
    "21121211",
    "11211121",
  ],
};

export const WATER = {
  palette: { 1: "#3aa0c9", 2: "#4fc0e0", 3: "#72d6ef" },
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

// canyon rim — warm terracotta, more garden-wall than harsh cliff
export const BOULDER = {
  palette: { 1: "#c97a52", 2: "#b0603a", 3: "#dd9468" },
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
  palette: { l: "#4a9143", d: "#367530", b: "#22421f" },
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
  palette: { l: "#3a7f34", d: "#2c6428", t: "#7a5738" },
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
  palette: { 1: "#9c7449", 2: "#7a5738", 3: "#4a3524" },
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
  palette: { a: "#4fc0e0", w: "#9c7449", t: "#e0c99a" },
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
  palette: { h: "#7a5738", r: "#c9603f", w: "#3aa0c9" },
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

export const GARDEN = {
  palette: { 1: "#7a5738", 2: "#63a848", 3: "#f7c9dc" },
  rows: [
    "11111111",
    "12121213",
    "11111111",
    "21121112",
    "11111111",
    "13121212",
    "11111111",
    "21212121",
  ],
};

// player burrow — three stages, drawn instead of MOUND at the home tile
export const BURROW_STAGES = [
  {
    // bare hole
    palette: { 1: "#9c7449", 2: "#4a3524" },
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
    palette: { 1: "#9c7449", 2: "#4a3524", c: "#f2e8d0" },
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
    palette: { 1: "#9c7449", 2: "#4a3524", c: "#f2e8d0", s: "#e8b552" },
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
  palette: { s: "#e8b552", d: "#b8842f" },
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
  palette: { c: "#f2e8d0", d: "#d9c9a0" },
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

export const WOOD_PICKUP = {
  palette: { 1: "#9c7449", 2: "#7a5738" },
  rows: [
    "........",
    ".11.....",
    "1221....",
    ".2211...",
    "....1122",
    "...122.1",
    ".....11.",
    "........",
  ],
};

export const STONE_PICKUP = {
  palette: { 1: "#9a9086", 2: "#79706a", 3: "#b0a89e" },
  rows: [
    "........",
    "........",
    "..123...",
    ".122221.",
    "12222221",
    ".111111.",
    "........",
    "........",
  ],
};

export const TILE_SPRITES = {
  G: [GRASS_A, GRASS_B, GRASS_C],
  W: [WATER],
  B: [BOULDER],
  K: [BUSH],
  N: [MOUND],
  R: [TREE],
  M: [MARKET],
  Y: [HOUSEBOAT],
  T: [TREE],
  A: [GARDEN],
};

// -------------------------------------------------------------- characters --

function mouseRows(faceRow) {
  return [
    ".oo..oo.",
    ".op..po.",
    "oaaaaaao",
    "oaaaaaao",
    faceRow,
    "opannapo",
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
    o: "#4a2f1f",
    a: fur,
    s: shadow,
    p: "#f7b0c4",
    e: "#241a12",
    n: "#dd7d96",
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

// A toad reads differently from a mouse: wider eyes on top, no ears, a
// rounder squat body with a lighter belly patch.
function toadRows() {
  return [
    "........",
    ".o....o.",
    ".oe..eo.",
    "oaaaaaao",
    "oaaaaaao",
    "oabbbbao",
    "oabbbbao",
    ".oaaaao.",
    "..oaao..",
    "........",
  ];
}

function toadPalette(body, belly) {
  return {
    o: "#3a4a26",
    a: body,
    b: belly,
    e: "#241a12",
  };
}

export function makeToadSprites(body, belly) {
  const palette = toadPalette(body, belly);
  const rows = toadRows();
  return {
    down: { palette, rows },
    up: { palette, rows },
    side: { palette, rows },
  };
}

export const PLAYER_SPRITES = makeMouseSprites("#ede0c8", "#c9b896");
export const WEG_SPRITES = makeMouseSprites("#948b7a", "#736a5a");
export const SKITTERS_SPRITES = makeMouseSprites("#e0895a", "#b8683f");
export const DENNIS_SPRITES = makeMouseSprites("#a3824f", "#7d6339");
export const JEFF_SPRITES = makeMouseSprites("#f2d377", "#d4b154");
export const CLAUDIUS_SPRITES = makeMouseSprites("#8a9aa8", "#687885");
export const RACHEL_SPRITES = makeMouseSprites("#ab9a63", "#8a7a4a");
export const PEPPER_SPRITES = makeMouseSprites("#d6d2c4", "#aeaa9c");
export const CHURT_SPRITES = makeMouseSprites("#dbb048", "#b08a30");
export const BART_SPRITES = makeToadSprites("#688f56", "#d9d4ac");

export const NPC_SPRITE_SETS = {
  weg: WEG_SPRITES,
  skitters: SKITTERS_SPRITES,
  dennis: DENNIS_SPRITES,
  jeff: JEFF_SPRITES,
  claudius: CLAUDIUS_SPRITES,
  rachel: RACHEL_SPRITES,
  pepper: PEPPER_SPRITES,
  churt: CHURT_SPRITES,
  bart: BART_SPRITES,
};

export const NPC_SCALE = {
  weg: 1,
  skitters: 1,
  dennis: 1,
  jeff: 0.8, // Jeff's a kit — smaller
  claudius: 1,
  rachel: 1,
  pepper: 1,
  churt: 1,
  bart: 1.05, // an old toad takes up a little more room
};

// Small distress mark drawn above Jeff when his hunger hits.
export const EXCLAIM = {
  palette: { r: "#e8503a" },
  rows: [".r.", ".r.", ".r.", "...", ".r."],
};

// -------------------------------------------------------- burrow interior --

export const FLOOR = {
  palette: { 1: "#7d6247", 2: "#6b5238" },
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

export const DUG_WALL = {
  palette: { 1: "#5a442e", 2: "#4a3524" },
  rows: [
    "11111111",
    "12121212",
    "11111111",
    "21212121",
    "11111111",
    "12121212",
    "11111111",
    "21212121",
  ],
};

export const DIG_FRONTIER = {
  palette: { 1: "#6b5238", 2: "#4a3524", 3: "#7a5738" },
  rows: [
    "13131313",
    "31313131",
    "13131313",
    "31313131",
    "13131313",
    "31313131",
    "13131313",
    "31313131",
  ],
};

export const INTERIOR_DOOR = {
  palette: { 1: "#7a5738", 3: "#4a3524" },
  rows: [
    "11111111",
    "1......1",
    "1.3.3..1",
    "1......1",
    "1.3.3..1",
    "1......1",
    "1.3.3..1",
    "11111111",
  ],
};

export const SLEEPING_NOOK = {
  palette: { c: "#f2e8d0", d: "#d9c9a0", o: "#9c7449" },
  rows: [
    "........",
    ".cccccc.",
    "cddddddc",
    "cddddddc",
    ".cccccc.",
    "........",
    "oooooooo",
    "........",
  ],
};

export const WORKBENCH = {
  palette: { w: "#9c7449", d: "#6b4f34", t: "#b0a89e" },
  rows: [
    "........",
    "wwwwwwww",
    "wtd..dtw",
    "wwwwwwww",
    "..w..w..",
    "..w..w..",
    "........",
    "........",
  ],
};

export const FURNITURE = {
  stool: {
    palette: { w: "#9c7449", d: "#6b4f34" },
    rows: [
      "........",
      "..wwww..",
      ".wwwwww.",
      "wwwwwwww",
      "..w..w..",
      "..w..w..",
      "........",
      "........",
    ],
  },
  table: {
    palette: { w: "#9c7449", d: "#6b4f34" },
    rows: [
      "........",
      "wwwwwwww",
      "wwwwwwww",
      "........",
      ".w....w.",
      ".w....w.",
      "........",
      "........",
    ],
  },
  shelf: {
    palette: { w: "#9c7449", d: "#6b4f34", i: "#e8b552" },
    rows: [
      "wwwwwwww",
      "w.i..i.w",
      "wwwwwwww",
      "w..i...w",
      "wwwwwwww",
      "........",
      "........",
      "........",
    ],
  },
  rug: {
    palette: { c: "#d9703f", d: "#b0552e", e: "#f2b57e" },
    rows: [
      "........",
      ".cccccc.",
      ".cdeedc.",
      ".cdeedc.",
      ".cdeedc.",
      ".cccccc.",
      "........",
      "........",
    ],
  },
  hearth: {
    palette: { s: "#9a9086", f: "#e8503a", y: "#f7b03a" },
    rows: [
      "........",
      "ssssssss",
      "s.fyf..s",
      "s.fff..s",
      "ssssssss",
      "........",
      "........",
      "........",
    ],
  },
  sprout: {
    palette: { p: "#b3805a", g: "#63a848" },
    rows: [
      "........",
      "...g....",
      "..ggg...",
      "...g....",
      "..ppp...",
      ".ppppp..",
      "..ppp...",
      "........",
    ],
  },
};

export const FURNITURE_LABEL = {
  stool: "a stool",
  table: "a table",
  shelf: "a shelf",
  rug: "a rug",
  hearth: "a hearth",
  sprout: "a potted sprout",
};
