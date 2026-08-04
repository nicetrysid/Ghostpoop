export const TILE_SIZE = 32;

// F=fence T=tree G=grass(tillable) P=path R=roof W=wall D=door(sleep) O=water
export const TERRAIN = [
  "FFFFFFFFFFFFFF",
  "FRRGGGGGPPPPTF",
  "FWDGGGGGPPPPTF",
  "FGGGGGGGPPPPPF",
  "FGGGGGGGPPOOOF",
  "FGGGGGGGPPOOOF",
  "FGGGGGGGPPPPPF",
  "FGGGGGGGGPPPPF",
  "FTGGGGGGGGGPTF",
  "FFFFFFFFFFFFFF",
];

export const GRID_W = TERRAIN[0].length;
export const GRID_H = TERRAIN.length;

// The door is a solid interactable, like an NPC: you stand next to it and
// face it to sleep, rather than walking onto it.
const UNWALKABLE = new Set(["F", "T", "R", "W", "O", "D"]);

export function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return "F";
  return TERRAIN[y][x];
}

export function isWalkable(x, y) {
  return !UNWALKABLE.has(tileAt(x, y));
}

export function isTillable(x, y) {
  return tileAt(x, y) === "G";
}

export const PLAYER_START = { x: 4, y: 4 };

export const NPCS = [
  {
    id: "hazel",
    name: "Hazel",
    x: 10,
    y: 3,
    sprite: "npc1",
    lines: [
      "Hazel: Oh! Didn't hear you come up the path.",
      "Hazel: The turnips around here grow best if you water 'em daily.",
      "Hazel: My burrow's just past the pond. Come by anytime.",
      "Hazel: You're getting the hang of this farming thing!",
    ],
  },
  {
    id: "reed",
    name: "Reed",
    x: 10,
    y: 6,
    sprite: "npc2",
    lines: [
      "Reed: ...oh, hello. I was just watching the water.",
      "Reed: Turnips, huh. I prefer things that don't need tending.",
      "Reed: You brought me one? ...thanks. That's kind of you.",
      "Reed: I suppose it's nice, having someone to talk to.",
    ],
  },
];
