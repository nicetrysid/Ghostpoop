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

export const GARDEN = {
  palette: { 1: "#6b4a2f", 2: "#4a7c3f", 3: "#d9a441" },
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

export const WOOD_PICKUP = {
  palette: { 1: "#8a6a45", 2: "#6b4a2f" },
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
  palette: { 1: "#8a8a8a", 2: "#6a6a6a", 3: "#a0a0a0" },
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
  G: [GRASS_A, GRASS_B],
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
    o: "#2f3d28",
    a: body,
    b: belly,
    e: "#1b1b1b",
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

export const PLAYER_SPRITES = makeMouseSprites("#d8d2c6", "#b0a99c");
export const WEG_SPRITES = makeMouseSprites("#8a8478", "#69645a");
export const SKITTERS_SPRITES = makeMouseSprites("#c97b4a", "#a45f37");
export const DENNIS_SPRITES = makeMouseSprites("#8a7048", "#6b5636");
export const JEFF_SPRITES = makeMouseSprites("#e8c66b", "#c9a94a");
export const CLAUDIUS_SPRITES = makeMouseSprites("#7a8a99", "#5c6b78");
export const RACHEL_SPRITES = makeMouseSprites("#9a8a5a", "#7a6c42");
export const PEPPER_SPRITES = makeMouseSprites("#c9c9c9", "#a3a3a3");
export const CHURT_SPRITES = makeMouseSprites("#c9a23a", "#a37f28");
export const BART_SPRITES = makeToadSprites("#5a7a4a", "#c9c9a0");

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
  palette: { 1: "#6b5540", 2: "#5c4835" },
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
  palette: { 1: "#4a3826", 2: "#3a2c1c" },
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
  palette: { 1: "#5a4530", 2: "#3d2a1a", 3: "#6b4a2f" },
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
  palette: { 1: "#6b4a2f", 3: "#3d2a1a" },
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
  palette: { c: "#e8dcc0", d: "#c9b896", o: "#8a6a45" },
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
  palette: { w: "#8a6a45", d: "#5c3f26", t: "#a0a0a0" },
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
    palette: { w: "#8a6a45", d: "#5c3f26" },
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
    palette: { w: "#8a6a45", d: "#5c3f26" },
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
    palette: { w: "#8a6a45", d: "#5c3f26", i: "#d9a441" },
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
    palette: { c: "#c9622f", d: "#a34a22", e: "#e8a56b" },
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
    palette: { s: "#8a8a8a", f: "#e8503a", y: "#f0a030" },
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
    palette: { p: "#a3714a", g: "#4a7c3f" },
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
