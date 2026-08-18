export const TILE_SIZE = 32;

export const GRID_W = 18;
export const GRID_H = 14;

// Ground tile chars: G grass, W creek/pond water, B boulder wall (canyon rim).
// Landmark structures (unwalkable, decorative — the interactable thing at
// each one is the NPC standing in front of it, or the home burrow itself):
// H = your burrow (The Core), K = Skitters' Bush, N = Weg's Mound,
// R = Dennis's Tree, M = The Market stall, Y = Bart's Houseboat/dock,
// A = Rachel's garden.
const FEATURES = [
  { x: 8, y: 6, char: "H" }, // The Core — player's burrow
  { x: 8, y: 3, char: "K" }, // Skitters' Bush
  { x: 4, y: 7, char: "N" }, // Weg's Mound
  { x: 4, y: 10, char: "R" }, // Dennis's Tree
  { x: 13, y: 6, char: "M" }, // The Market
  { x: 14, y: 10, char: "Y" }, // Bart's Houseboat
  { x: 2, y: 6, char: "A" }, // Rachel's garden
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

const UNWALKABLE = new Set(["B", "W", "H", "K", "N", "R", "M", "Y", "T", "A"]);

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
      "Weg: I don't say things to be kind. I say them because they're true. That was true.",
      "Weg: You're still here. That means something, coming from you.",
    ],
    nightLine: "Weg: Late to be walking. Not my business why.",
    furnitureGiftLine: "Weg sets something down without a word. A plain stool. \"Sit properly.\"",
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
      "Skitters: I watch. That's not the same as judging. Most days.",
      "Skitters: Don't tell Weg I said this, but I'm glad you're around.",
    ],
    nightLine: "Skitters: Quiet up here at night. I like it. Don't tell anyone.",
    furnitureGiftLine: "Skitters produces a shelf from somewhere. \"Everyone needs a place to watch from.\"",
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
      "Dennis: Same face for good news and bad. Never could help that.",
      "Dennis: You keep coming back. I don't ask why. I just like that you do.",
    ],
    nightLine: "Dennis: Tree's quiet at night. Almost forgivable.",
    furnitureGiftLine: "Dennis beams. \"A table! For when the kids visit you too.\"",
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
      "Jeff: Can I come with you? I won't be any trouble. Probably.",
      "Jeff: You're fun to follow around. Don't ask me why. I just know things.",
    ],
    nightLine: "Jeff: I should be asleep. I'm extremely asleep right now. Watch.",
    furnitureGiftLine: "Jeff proudly presents a hearth. \"I don't know how I built this. I just did.\"",
  },
  {
    id: "claudius",
    name: "Claudius",
    x: 3,
    y: 8,
    sprite: "claudius",
    prefers: "bedding",
    giftLine: "Claudius turns it over slowly, the way you'd study a room. \"...thank you.\"",
    mismatchLine: "Claudius accepts it with a small, unreadable nod.",
    lines: [
      "Claudius: Reading the room. Habit, not judgment. Not anymore.",
      "Claudius: Weg doesn't say much. Means more when he does.",
      "Claudius: You're missing something over there. I can see it from here.",
      "Claudius: I used to read holes in people to take from them. Now I just... notice.",
      "Claudius: A carved stone once, no note attached. Meant more than anything with words on it.",
      "Claudius: Come fall, there's a walk I make. You'd be welcome on it.",
    ],
    nightLine: "Claudius: Old habit — I still case a room even when there's nothing to take.",
    furnitureGiftLine: "Claudius leaves a rug by your door, no note attached. You know who it's from.",
  },
  {
    id: "rachel",
    name: "Rachel",
    x: 3,
    y: 6,
    sprite: "rachel",
    prefers: "seeds",
    giftLine: "Rachel checks it over like she's checking a joist. \"Good. This is good.\"",
    mismatchLine: "Rachel accepts it, already thinking about something else.",
    lines: [
      "Rachel: That wall's load-bearing. The one you're leaning on isn't.",
      "Rachel: I keep every name anyone's ever shed. Yours, if you ever need it back.",
      "Rachel: Practical beats pretty. Every time, in my experience.",
      "Rachel: The garden doesn't care if I'm in the mood. Neither should I.",
      "Rachel: I don't say much when I like someone. I just keep showing up.",
      "Rachel: You built that well. I mean it — I checked.",
    ],
    nightLine: "Rachel: Watering's better at night. Less gets lost to the sun.",
    furnitureGiftLine: "Rachel hands you a potted sprout. \"Water it. Or don't. It's stubborn.\"",
  },
  {
    id: "pepper",
    name: "Pepper",
    x: 12,
    y: 7,
    sprite: "pepper",
    prefers: "seeds",
    giftLine: "Pepper logs it, then almost smiles. \"That closes a gap, actually.\"",
    mismatchLine: "Pepper accepts it and notes it down without comment.",
    lines: [
      "Pepper: You're late. Not that it matters. It matters.",
      "Pepper: There's a discrepancy in the seed count. There's always a discrepancy.",
      "Pepper: I run on certainty. It's not a bit. It's load-bearing.",
      "Pepper: You closed a gap I'd noted. That's rarer than you'd think.",
      "Pepper: I was wrong about something last week. Cost me more than I let on.",
      "Pepper: Don't tell me it's fine. Tell me it's done.",
    ],
    nightLine: "Pepper: Still working. The list doesn't clock out.",
    furnitureGiftLine: "Pepper delivers a shelf, fully itemized. \"For organization. You needed this.\"",
  },
  {
    id: "churt",
    name: "Churt",
    x: 9,
    y: 9,
    sprite: "churt",
    prefers: "bedding",
    giftLine: "Churt lights up completely. \"For me? For ME? Okay. Wow.\"",
    mismatchLine: "Churt takes it, already distracted by something else nearby.",
    lines: [
      "Churt: I was JUST about to finish that. This exact burrow. Any minute.",
      "Churt: Do you have— wait, is that for me? For me? Okay. Wow.",
      "Churt: I carry this bead everywhere. It was meant for someone else. Long story.",
      "Churt: I hold onto everything. I just wasn't looking at it, is all.",
      "Churt: You noticed me. That's rarer than you'd think.",
      "Churt: Warmest mouse in the canyon, underneath it all. Not that I'd say that about myself.",
    ],
    nightLine: "Churt: Started a project by moonlight once. Still not finished. You'll never guess which one.",
    furnitureGiftLine: "Churt beams. \"I MADE this. Well — finished it. A stool. For you.\"",
  },
  {
    id: "bart",
    name: "Bart",
    x: 12,
    y: 10,
    sprite: "bart",
    prefers: "roots",
    giftLine: "Bart considers it a long moment. \"...appreciated, actually.\"",
    mismatchLine: "Bart accepts it without much reaction. Roots, mostly, is what he's after.",
    lines: [
      "Bart: [long pause] ...you're new.",
      "Bart: Four hundred years. Give or take a few I wasn't paying attention to.",
      "Bart: The moat doesn't do anything. Never has. I like it anyway.",
      "Bart: [voice drops out] ...that's kind of you. Truly.",
      "Bart: Roots, if you've got them. Otherwise don't trouble yourself.",
      "Bart: Jeff's alright. Bit much. Alright, though.",
    ],
    nightLine: "Bart: Water's stiller at night. So am I.",
    furnitureGiftLine: "Bart pushes a hearth toward you, unhurried. \"Every burrow needs warmth.\"",
  },
];

export const RESOURCE_NODES = [
  { id: "seed-market", type: "seeds", x: 13, y: 7 },
  { id: "seed-ledge", type: "seeds", x: 11, y: 3 },
  { id: "seed-north", type: "seeds", x: 11, y: 2 },
  { id: "bedding-creek", type: "bedding", x: 5, y: 4 },
  { id: "bedding-meadow", type: "bedding", x: 6, y: 11 },
  { id: "bedding-south", type: "bedding", x: 9, y: 12 },
  { id: "wood-east", type: "wood", x: 15, y: 4 },
  { id: "wood-south", type: "wood", x: 10, y: 12 },
  { id: "stone-north", type: "stone", x: 14, y: 2 },
  { id: "stone-west", type: "stone", x: 6, y: 2 },
];
