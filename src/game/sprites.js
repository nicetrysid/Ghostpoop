// All pixel art in this game is authored here as small character grids.
// '.' = transparent. Every other character is a palette key -> CSS color.

// ---------------------------------------------------------------- terrain --

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

export const TILLED = {
  palette: { 1: "#6b4a2f", 2: "#5a3d26", 3: "#7d5738" },
  rows: [
    "33333333",
    "11111111",
    "22222222",
    "11111111",
    "33333333",
    "11111111",
    "22222222",
    "11111111",
  ],
};

export const WATERED = {
  palette: { 1: "#4a3a30", 2: "#3f4d55", 3: "#5c4c34", 4: "#6a5d3f" },
  rows: [
    "44444444",
    "11111111",
    "22222222",
    "11114111",
    "33333333",
    "11111411",
    "22222222",
    "11111111",
  ],
};

export const PATH = {
  palette: { 1: "#a89a86", 2: "#998a76" },
  rows: [
    "11112222",
    "11112222",
    "11112222",
    "11112222",
    "22221111",
    "22221111",
    "22221111",
    "22221111",
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

export const FENCE = {
  palette: { g: "#4a7c3f", w: "#8a6a45", d: "#5c4630" },
  rows: [
    "gg.gg.gg",
    "gg.gg.gg",
    "wwwwwwww",
    "gg.gg.gg",
    "gg.gg.gg",
    "gg.gg.gg",
    "wwwwwwww",
    "gg.gg.gg",
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

export const ROOF = {
  palette: { 1: "#8a3b2e", 2: "#7a3226" },
  rows: [
    "11111111",
    "22222222",
    "11111111",
    "22222222",
    "11111111",
    "22222222",
    "11111111",
    "22222222",
  ],
};

export const WALL = {
  palette: { 1: "#c9b28a", 2: "#b89e73" },
  rows: [
    "11111111",
    "11111111",
    "22222222",
    "11111111",
    "11111111",
    "22222222",
    "11111111",
    "11111111",
  ],
};

export const DOOR = {
  palette: { 1: "#6b4a2f", 2: "#5a3d26", k: "#e8c66b" },
  rows: [
    "11111111",
    "11222211",
    "12222221",
    "12222221",
    "12222k21",
    "12222221",
    "12222221",
    "11111111",
  ],
};

// ------------------------------------------------------------------ crops --

export const CROP_STAGES = [
  // stage 0: just planted (a small seed mound so planting has visible feedback)
  {
    palette: { d: "#3d2a1a" },
    rows: [
      "........",
      "........",
      "........",
      "...dd...",
      "..dddd..",
      "........",
      "........",
      "........",
    ],
  },
  // stage 1: sprout
  {
    palette: { g: "#5a934b" },
    rows: [
      "........",
      "........",
      "...g....",
      "..ggg...",
      "........",
      "........",
      "........",
      "........",
    ],
  },
  // stage 2: growing
  {
    palette: { g: "#4a7c3f", s: "#3a6b2f" },
    rows: [
      "........",
      ".g....g.",
      "..g..g..",
      "...gg...",
      "..gggg..",
      "...ss...",
      "...ss...",
      "........",
    ],
  },
  // stage 3: ripe (turnip)
  {
    palette: { g: "#4a7c3f", r: "#c9622f", w: "#e8a56b" },
    rows: [
      "........",
      ".gg..gg.",
      "..gggg..",
      "...rr...",
      "..rrrr..",
      "..rwrr..",
      "...rr...",
      "........",
    ],
  },
];

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
export const NPC1_SPRITES = makeMouseSprites("#b98a63", "#8f6a4c"); // Hazel
export const NPC2_SPRITES = makeMouseSprites("#8fa3b3", "#6d7f8d"); // Reed

export const TILE_SPRITES = {
  G: [GRASS_A, GRASS_B],
  P: [PATH],
  F: [FENCE],
  T: [TREE],
  R: [ROOF],
  W: [WALL],
  D: [DOOR],
  O: [WATER],
};
