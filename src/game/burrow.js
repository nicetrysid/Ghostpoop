// The burrow interior is a small room that grows as you dig. Unlike the
// village map this isn't hand-authored terrain — it's generated from a
// stage number, since the room's dimensions and fixture positions all
// scale together.

export const MAX_DIG_STAGE = 2;

const STAGE_SIZES = [
  { w: 7, h: 6 },
  { w: 9, h: 7 },
  { w: 11, h: 9 },
];

export function interiorDims(stage) {
  return STAGE_SIZES[Math.min(stage, STAGE_SIZES.length - 1)];
}

export function fixtures(stage) {
  const { w, h } = interiorDims(stage);
  return {
    door: { x: Math.floor(w / 2), y: h - 1 },
    nook: { x: 1, y: 1 },
    workbench: { x: w - 2, y: 1 },
    frontier: stage < MAX_DIG_STAGE ? { x: w - 1, y: Math.floor(h / 2) } : null,
  };
}

// What's at (x,y): 'wall' | 'floor' | 'door' | 'nook' | 'workbench' | 'frontier'
export function tileKind(stage, x, y) {
  const { w, h } = interiorDims(stage);
  const f = fixtures(stage);
  if (f.frontier && x === f.frontier.x && y === f.frontier.y) return "frontier";
  if (x === f.door.x && y === f.door.y) return "door";
  const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
  if (border) return "wall";
  if (x === f.nook.x && y === f.nook.y) return "nook";
  if (x === f.workbench.x && y === f.workbench.y) return "workbench";
  return "floor";
}

export function isFloorTile(stage, x, y) {
  return tileKind(stage, x, y) === "floor";
}

export const DIG_COSTS = [
  { wood: 3, stone: 2 },
  { wood: 5, stone: 4 },
];

export const RECIPES = [
  { id: "stool", label: "Stool", cost: { wood: 2 } },
  { id: "table", label: "Table", cost: { wood: 3 } },
  { id: "shelf", label: "Shelf", cost: { wood: 2, stone: 1 } },
  { id: "rug", label: "Rug", cost: { bedding: 3 } },
  { id: "hearth", label: "Hearth", cost: { stone: 3 } },
  { id: "sprout", label: "Potted Sprout", cost: { seeds: 2 } },
];

// What each villager gives you, once — the first time you talk to them
// after maxing out friendship with them.
export const NPC_FURNITURE_GIFT = {
  weg: "stool",
  skitters: "shelf",
  dennis: "table",
  jeff: "hearth",
  claudius: "rug",
  rachel: "sprout",
  pepper: "shelf",
  churt: "stool",
  bart: "hearth",
};
