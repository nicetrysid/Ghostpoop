import { useCallback, useEffect, useRef, useState } from "react";
import { drawSprite } from "./game/pixelSprite";
import {
  BEDDING_PICKUP,
  BURROW_STAGES,
  DIG_FRONTIER,
  DUG_WALL,
  EXCLAIM,
  FLOOR,
  FURNITURE,
  FURNITURE_LABEL,
  INTERIOR_DOOR,
  NPC_SCALE,
  NPC_SPRITE_SETS,
  PLAYER_SPRITES,
  SEED_PICKUP,
  SLEEPING_NOOK,
  STONE_PICKUP,
  TILE_SPRITES,
  WOOD_PICKUP,
  WORKBENCH,
} from "./game/sprites";
import {
  GRID_H,
  GRID_W,
  HOME,
  NPCS,
  PLAYER_START,
  RESOURCE_NODES,
  TILE_SIZE,
  isWalkable,
  tileAt,
} from "./game/map";
import { DIG_COSTS, MAX_DIG_STAGE, NPC_FURNITURE_GIFT, RECIPES, fixtures, interiorDims, tileKind } from "./game/burrow";
import "./Centerville.css";

const CELL = TILE_SIZE / 8;
const CHAR_CELL = CELL;
const MOVE_SPEED = 4.2; // tiles per second
const CANVAS_W = GRID_W * TILE_SIZE;
const CANVAS_H = GRID_H * TILE_SIZE;
const MAX_FRIENDSHIP = 100;

const DIR_OFFSET = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

const MOVE_KEYS = {
  ArrowDown: "down",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowRight: "right",
  s: "down",
  w: "up",
  a: "left",
  d: "right",
  // synthetic entries so on-screen touch buttons reuse the same
  // tap-queues / held-key-continues movement logic as the keyboard
  "touch-down": "down",
  "touch-up": "up",
  "touch-left": "left",
  "touch-right": "right",
};

const FLAVOR_TEXT = {
  K: "Skitters' Bush — the watching seat.",
  N: "Weg's Mound — one mouse wide, the kind you have to mean.",
  R: "Dennis's Tree — it slaps him. He blames the wind.",
  M: "The Market — Fossoway's stall.",
  Y: "Bart's Houseboat — the moat serves no identified purpose.",
  A: "Rachel's garden. She'd know what's wrong with it before you finished asking.",
  T: "A tree. Nothing more to say.",
  B: "The canyon wall. Solid red sandstone.",
};

const RESOURCE_LABEL = { seeds: "a seed", bedding: "some bedding", wood: "some wood", stone: "a stone" };
const RESOURCE_ICON = { seeds: "🌾", bedding: "🪶", wood: "🪵", stone: "🪨" };
const RESOURCE_SPRITE = { seeds: SEED_PICKUP, bedding: BEDDING_PICKUP, wood: WOOD_PICKUP, stone: STONE_PICKUP };
const BURROW_LABEL = [
  "barely dug out — just enough to turn around in",
  "roomier now, walls properly packed",
  "a real home underground",
];

// ---------------------------------------------------------- day / night --

const DAY_DURATION = 120; // seconds for a full dawn-to-dawn cycle while playing
const NIGHT_START = 0.68;
const MORNING_RESET = DAY_DURATION * 0.12; // where the clock lands after resting

const PHASE_BOUNDS = [
  { name: "Dawn", start: 0 },
  { name: "Day", start: 0.1 },
  { name: "Dusk", start: 0.55 },
  { name: "Night", start: NIGHT_START },
];

function phaseName(t) {
  let name = "Night";
  for (const p of PHASE_BOUNDS) {
    if (t >= p.start) name = p.name;
  }
  return name;
}

// Keyframed color+alpha overlay tinting the whole scene through the cycle.
const TINT_KEYFRAMES = [
  { t: 0.0, r: 20, g: 20, b: 60, a: 0.45 },
  { t: 0.1, r: 255, g: 170, b: 120, a: 0.22 },
  { t: 0.3, r: 0, g: 0, b: 0, a: 0.0 },
  { t: 0.55, r: 255, g: 140, b: 90, a: 0.18 },
  { t: NIGHT_START, r: 120, g: 60, b: 110, a: 0.32 },
  { t: 0.85, r: 15, g: 15, b: 50, a: 0.55 },
  { t: 1.0, r: 20, g: 20, b: 60, a: 0.45 },
];

function getTint(t) {
  for (let i = 0; i < TINT_KEYFRAMES.length - 1; i++) {
    const a = TINT_KEYFRAMES[i];
    const b = TINT_KEYFRAMES[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1);
      return {
        r: a.r + (b.r - a.r) * f,
        g: a.g + (b.g - a.g) * f,
        b: a.b + (b.b - a.b) * f,
        a: a.a + (b.a - a.a) * f,
      };
    }
  }
  return TINT_KEYFRAMES[TINT_KEYFRAMES.length - 1];
}

// -------------------------------------------------------------- movement --

// Shared tile-step lerp used by both the player and (when following) Jeff.
function advanceMover(m, dt, speed) {
  if (!m.moving) return false;
  const targetPx = m.targetX * TILE_SIZE;
  const targetPy = m.targetY * TILE_SIZE;
  const stepDist = speed * TILE_SIZE * dt;
  const dx = targetPx - m.px;
  const dy = targetPy - m.py;
  const dist = Math.hypot(dx, dy);
  if (dist <= stepDist || dist === 0) {
    m.px = targetPx;
    m.py = targetPy;
    m.x = m.targetX;
    m.y = m.targetY;
    m.moving = false;
    return true;
  }
  m.px += (dx / dist) * stepDist;
  m.py += (dy / dist) * stepDist;
  return false;
}

// -------------------------------------------------------- burrow interior --

// Door/nook/workbench/frontier are solid, interacted with from an adjacent
// floor tile — same design language as every fixture in the village.
function isBurrowWalkable(stage, x, y, furnitureList) {
  const kind = tileKind(stage, x, y);
  if (kind !== "floor") return false;
  return !furnitureList.some((f) => f.x === x && f.y === y);
}

function findFreeFloorTile(stage, furnitureList) {
  const { w, h } = interiorDims(stage);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tileKind(stage, x, y) !== "floor") continue;
      if (furnitureList.some((f) => f.x === x && f.y === y)) continue;
      return { x, y };
    }
  }
  return null;
}

const JEFF_DATA = NPCS.find((n) => n.id === "jeff");

export default function Centerville() {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(0);
  const toastTimerRef = useRef(0);
  const dayTimeRef = useRef(MORNING_RESET);

  const player = useRef({
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    px: PLAYER_START.x * TILE_SIZE,
    py: PLAYER_START.y * TILE_SIZE,
    dir: "down",
    moving: false,
    targetX: PLAYER_START.x,
    targetY: PLAYER_START.y,
    walkPhase: 0,
    trail: [],
  });

  // Jeff normally just stands at his spot in NPCS, but he can also tag
  // along — this ref tracks that dynamic state ('idle' | 'following' |
  // 'hungry') and his live position while it's active.
  const jeff = useRef({
    mode: "idle",
    x: JEFF_DATA.x,
    y: JEFF_DATA.y,
    px: JEFF_DATA.x * TILE_SIZE,
    py: JEFF_DATA.y * TILE_SIZE,
    targetX: JEFF_DATA.x,
    targetY: JEFF_DATA.y,
    moving: false,
    walkPhase: 0,
  });

  const dialogueRef = useRef(null);
  const sleepingRef = useRef(false);
  const sceneRef = useRef("village");
  const digStageRef = useRef(0);
  const furnitureRef = useRef([]);
  const furnitureGivenRef = useRef(new Set());
  const craftMenuRef = useRef(false);
  const carriedRef = useRef({ seeds: 0, bedding: 0, wood: 0, stone: 0 });
  const storedRef = useRef({ seeds: 0, bedding: 0, wood: 0, stone: 0 });
  const heartsRef = useRef(Object.fromEntries(NPCS.map((n) => [n.id, 0])));
  const nodesRef = useRef(new Map(RESOURCE_NODES.map((n) => [n.id, { ...n, active: true }])));

  const [day, setDay] = useState(1);
  const [scene, setScene] = useState("village");
  const [digStage, setDigStage] = useState(0);
  const [furniture, setFurniture] = useState([]);
  const [craftMenuOpen, setCraftMenuOpen] = useState(false);
  const [carried, setCarried] = useState({ seeds: 0, bedding: 0, wood: 0, stone: 0 });
  const [stored, setStored] = useState({ seeds: 0, bedding: 0, wood: 0, stone: 0 });
  const [hearts, setHearts] = useState(
    Object.fromEntries(NPCS.map((n) => [n.id, 0]))
  );
  const [dialogue, setDialogue] = useState(null);
  const [toast, setToast] = useState("");
  const [sleeping, setSleeping] = useState(false);
  const [hint, setHint] = useState("");
  const [timeLabel, setTimeLabel] = useState(phaseName(MORNING_RESET / DAY_DURATION));

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2600);
  }, []);

  // Jeff's static NPCS entry is only accurate while he's idle — once he's
  // following (or stuck hungry) his real position lives on the jeff ref.
  const findNpcAt = useCallback((x, y) => {
    const j = jeff.current;
    for (const n of NPCS) {
      if (n.id === "jeff") {
        const jx = j.mode === "idle" ? n.x : j.x;
        const jy = j.mode === "idle" ? n.y : j.y;
        if (jx === x && jy === y) return n;
        continue;
      }
      if (n.x === x && n.y === y) return n;
    }
    return undefined;
  }, []);

  const rest = useCallback(() => {
    const c = carriedRef.current;
    let msg;
    const parts = Object.entries(c)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k}`);
    if (parts.length === 0) {
      msg = "Nothing to store today, but rest is rest.";
    } else {
      const nextStored = { ...storedRef.current };
      for (const [k, v] of Object.entries(c)) nextStored[k] += v;
      storedRef.current = nextStored;
      setStored(nextStored);
      msg = `Stored ${parts.join(", ")}.`;
    }
    carriedRef.current = { seeds: 0, bedding: 0, wood: 0, stone: 0 };
    setCarried({ seeds: 0, bedding: 0, wood: 0, stone: 0 });

    sleepingRef.current = true;
    setSleeping(true);
    setTimeout(() => {
      for (const node of nodesRef.current.values()) node.active = true;
      setDay((d) => d + 1);
      sceneRef.current = "village";
      setScene("village");
      const p = player.current;
      p.x = PLAYER_START.x;
      p.y = PLAYER_START.y;
      p.targetX = PLAYER_START.x;
      p.targetY = PLAYER_START.y;
      p.px = PLAYER_START.x * TILE_SIZE;
      p.py = PLAYER_START.y * TILE_SIZE;
      p.dir = "down";
      p.trail = [];
      dayTimeRef.current = MORNING_RESET;
      const j = jeff.current;
      j.mode = "idle";
      j.x = JEFF_DATA.x;
      j.y = JEFF_DATA.y;
      j.px = JEFF_DATA.x * TILE_SIZE;
      j.py = JEFF_DATA.y * TILE_SIZE;
      j.targetX = JEFF_DATA.x;
      j.targetY = JEFF_DATA.y;
      j.moving = false;
      sleepingRef.current = false;
      setSleeping(false);
      showToast(msg);
    }, 900);
  }, [showToast]);

  const enterBurrow = useCallback(() => {
    sceneRef.current = "burrow";
    setScene("burrow");
    const stage = digStageRef.current;
    const { door } = fixtures(stage);
    const p = player.current;
    p.x = door.x;
    p.y = door.y - 1;
    p.targetX = p.x;
    p.targetY = p.y;
    p.px = p.x * TILE_SIZE;
    p.py = p.y * TILE_SIZE;
    p.dir = "down";
    p.moving = false;
  }, []);

  const leaveBurrow = useCallback(() => {
    sceneRef.current = "village";
    setScene("village");
    const p = player.current;
    p.x = HOME.x;
    p.y = HOME.y + 1;
    p.targetX = p.x;
    p.targetY = p.y;
    p.px = p.x * TILE_SIZE;
    p.py = p.y * TILE_SIZE;
    p.dir = "up";
    p.moving = false;
  }, []);

  const attemptDig = useCallback(() => {
    const stage = digStageRef.current;
    if (stage >= MAX_DIG_STAGE) {
      showToast("There's nowhere further to dig.");
      return;
    }
    const cost = DIG_COSTS[stage];
    const s = storedRef.current;
    const canAfford = Object.entries(cost).every(([k, v]) => (s[k] || 0) >= v);
    if (!canAfford) {
      const need = Object.entries(cost)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
      showToast(`Need ${need} to dig further.`);
      return;
    }
    const nextStored = { ...s };
    for (const [k, v] of Object.entries(cost)) nextStored[k] -= v;
    storedRef.current = nextStored;
    setStored(nextStored);
    digStageRef.current = stage + 1;
    setDigStage(stage + 1);
    showToast(`You dig the room deeper — ${BURROW_LABEL[stage + 1]}.`);
  }, [showToast]);

  const craftItem = useCallback(
    (recipeId) => {
      const recipe = RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return;
      const s = storedRef.current;
      const canAfford = Object.entries(recipe.cost).every(([k, v]) => (s[k] || 0) >= v);
      if (!canAfford) {
        showToast("Not enough materials for that.");
        return;
      }
      const slot = findFreeFloorTile(digStageRef.current, furnitureRef.current);
      if (!slot) {
        showToast("No room left — dig the burrow deeper first.");
        return;
      }
      const nextStored = { ...s };
      for (const [k, v] of Object.entries(recipe.cost)) nextStored[k] -= v;
      storedRef.current = nextStored;
      setStored(nextStored);
      const nextFurniture = [...furnitureRef.current, { id: recipe.id, x: slot.x, y: slot.y }];
      furnitureRef.current = nextFurniture;
      setFurniture(nextFurniture);
      showToast(`Crafted ${FURNITURE_LABEL[recipe.id]}.`);
    },
    [showToast]
  );

  const openDialogue = useCallback((npc) => {
    const t = (dayTimeRef.current / DAY_DURATION) % 1;
    const night = t >= NIGHT_START;
    // Side effects (mutating refs, other setState calls) must not live
    // inside a setState updater — StrictMode double-invokes updaters in
    // development to catch exactly that, and the second call would see
    // furnitureGivenRef already mutated by the first and silently skip
    // the gift. heartsRef is the source of truth; setHearts just mirrors it.
    const next = Math.min(MAX_FRIENDSHIP, heartsRef.current[npc.id] + 10);
    heartsRef.current = { ...heartsRef.current, [npc.id]: next };
    setHearts(heartsRef.current);

    // The first time you talk to a maxed-friendship NPC, they give you a
    // signature piece of furniture instead of ordinary dialogue — but
    // only if there's actually room for it; otherwise this quietly
    // retries on the next conversation.
    if (next >= MAX_FRIENDSHIP && npc.furnitureGiftLine && !furnitureGivenRef.current.has(npc.id)) {
      const giftId = NPC_FURNITURE_GIFT[npc.id];
      const slot = giftId ? findFreeFloorTile(digStageRef.current, furnitureRef.current) : null;
      if (slot) {
        furnitureGivenRef.current.add(npc.id);
        const nextFurniture = [...furnitureRef.current, { id: giftId, x: slot.x, y: slot.y }];
        furnitureRef.current = nextFurniture;
        setFurniture(nextFurniture);
        const entry = { id: npc.id, name: npc.name, lines: [npc.furnitureGiftLine], index: 0 };
        dialogueRef.current = entry;
        setDialogue(entry);
        return;
      }
    }

    const level = Math.min(npc.lines.length - 1, Math.floor(next / 20));
    const entry =
      night && npc.nightLine
        ? { id: npc.id, name: npc.name, lines: [npc.nightLine], index: 0 }
        : { id: npc.id, name: npc.name, lines: npc.lines, index: level };
    dialogueRef.current = entry;
    setDialogue(entry);
  }, []);

  const gift = useCallback(
    (npc) => {
      // Some NPCs (Bart) prefer something outside the seeds/bedding economy
      // entirely — for them nothing ever matches, and any carried resource
      // falls through to the mismatch response.
      if (carriedRef.current[npc.prefers] > 0) {
        carriedRef.current = { ...carriedRef.current, [npc.prefers]: carriedRef.current[npc.prefers] - 1 };
        setCarried({ ...carriedRef.current });
        heartsRef.current = {
          ...heartsRef.current,
          [npc.id]: Math.min(MAX_FRIENDSHIP, heartsRef.current[npc.id] + 25),
        };
        setHearts(heartsRef.current);
        showToast(npc.giftLine);
        if (npc.id === "jeff" && jeff.current.mode === "hungry") {
          jeff.current.mode = "following";
        }
        return;
      }
      const fallbackType = Object.keys(carriedRef.current).find(
        (t) => t !== npc.prefers && carriedRef.current[t] > 0
      );
      if (fallbackType) {
        carriedRef.current = { ...carriedRef.current, [fallbackType]: carriedRef.current[fallbackType] - 1 };
        setCarried({ ...carriedRef.current });
        heartsRef.current = {
          ...heartsRef.current,
          [npc.id]: Math.min(MAX_FRIENDSHIP, heartsRef.current[npc.id] + 5),
        };
        setHearts(heartsRef.current);
        showToast(npc.mismatchLine);
        return;
      }
      showToast("You have nothing to give right now.");
    },
    [showToast]
  );

  const interact = useCallback(() => {
    if (dialogueRef.current) {
      const d = dialogueRef.current;
      if (d.index < d.lines.length - 1) {
        const next = { ...d, index: d.index + 1 };
        dialogueRef.current = next;
        setDialogue(next);
      } else {
        dialogueRef.current = null;
        setDialogue(null);
        if (d.id === "jeff" && jeff.current.mode === "idle") {
          if (Math.random() < 0.55) {
            jeff.current.mode = "following";
            player.current.trail = [];
            showToast("Jeff decides to tag along!");
          } else {
            showToast("Jeff: I'll just stay here. Probably.");
          }
        }
      }
      return;
    }

    if (craftMenuRef.current) return;

    const p = player.current;
    const [ox, oy] = DIR_OFFSET[p.dir];
    const fx = p.x + ox;
    const fy = p.y + oy;

    if (sceneRef.current === "burrow") {
      const kind = tileKind(digStageRef.current, fx, fy);
      if (kind === "door") {
        leaveBurrow();
      } else if (kind === "nook") {
        rest();
      } else if (kind === "workbench") {
        craftMenuRef.current = true;
        setCraftMenuOpen(true);
      } else if (kind === "frontier") {
        attemptDig();
      } else {
        showToast("Nothing here.");
      }
      return;
    }

    const npc = findNpcAt(fx, fy);
    if (npc) {
      openDialogue(npc);
      return;
    }

    if (fx === HOME.x && fy === HOME.y) {
      enterBurrow();
      return;
    }

    const flavor = FLAVOR_TEXT[tileAt(fx, fy)];
    showToast(flavor || "Nothing here.");
  }, [attemptDig, enterBurrow, findNpcAt, leaveBurrow, openDialogue, rest, showToast]);

  const giftFacing = useCallback(() => {
    if (dialogueRef.current || sceneRef.current === "burrow") return;
    const p = player.current;
    const [ox, oy] = DIR_OFFSET[p.dir];
    const fx = p.x + ox;
    const fy = p.y + oy;
    const npc = findNpcAt(fx, fy);
    if (npc) gift(npc);
    else showToast("No one there to give that to.");
  }, [findNpcAt, gift, showToast]);

  // A tap that lands while the previous tile-step is still animating must
  // not be lost — queue it and the game loop will fire it the instant the
  // current step lands, so rapid tapping still moves the player one tile
  // per press instead of silently swallowing inputs.
  const tryStep = useCallback(
    (dir) => {
      const p = player.current;
      if (dialogueRef.current || sleepingRef.current || craftMenuRef.current) return;
      if (p.moving) {
        p.queuedDir = dir;
        return;
      }
      p.dir = dir;
      const [ox, oy] = DIR_OFFSET[dir];
      const nx = p.x + ox;
      const ny = p.y + oy;

      if (sceneRef.current === "burrow") {
        if (isBurrowWalkable(digStageRef.current, nx, ny, furnitureRef.current)) {
          p.targetX = nx;
          p.targetY = ny;
          p.moving = true;
        }
        return;
      }

      const blockedByNpc = Boolean(findNpcAt(nx, ny));
      if (isWalkable(nx, ny) && !blockedByNpc) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 10) p.trail.shift();
        p.targetX = nx;
        p.targetY = ny;
        p.moving = true;
      }
    },
    [findNpcAt]
  );

  // ------------------------------------------------------------- input --

  useEffect(() => {
    function onKeyDown(e) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key in MOVE_KEYS) {
        keysRef.current.add(e.key);
        if (!e.repeat) tryStep(MOVE_KEYS[e.key]);
        return;
      }
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") interact();
      else if (e.key === "g" || e.key === "G") giftFacing();
    }
    function onKeyUp(e) {
      keysRef.current.delete(e.key);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [interact, giftFacing, tryStep]);

  // --------------------------------------------------------- game loop --

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let last = performance.now();
    let lastHint = "";
    let lastPhase = "";

    function computeHint() {
      if (dialogueRef.current) return "Tap Continue to keep talking";
      if (craftMenuRef.current) return "Pick something to craft, or Close";
      const p = player.current;
      const [ox, oy] = DIR_OFFSET[p.dir];
      const fx = p.x + ox;
      const fy = p.y + oy;

      if (sceneRef.current === "burrow") {
        const kind = tileKind(digStageRef.current, fx, fy);
        if (kind === "door") return "Leave the burrow";
        if (kind === "nook") return "Rest here to store today's gathering";
        if (kind === "workbench") return "Open the workbench to craft furniture";
        if (kind === "frontier") return "Dig here to make more room";
        return "Move around your burrow";
      }

      const npc = findNpcAt(fx, fy);
      if (npc) return `Talk to ${npc.name} · Gift to give something`;
      if (fx === HOME.x && fy === HOME.y) return "Go inside your burrow";
      if (FLAVOR_TEXT[tileAt(fx, fy)]) return "Look closer";
      return "Move around — walk over seeds & bedding to collect them";
    }

    function collectAt(x, y) {
      if (sceneRef.current !== "village") return;
      for (const node of nodesRef.current.values()) {
        if (node.active && node.x === x && node.y === y) {
          node.active = false;
          carriedRef.current = { ...carriedRef.current, [node.type]: carriedRef.current[node.type] + 1 };
          setCarried({ ...carriedRef.current });
          showToast(`Picked up ${RESOURCE_LABEL[node.type]}.`);
          rollJeffMood();
          break;
        }
      }
    }

    // While following, Jeff sometimes freaks out (needs feeding to move
    // again) and sometimes finds something useful and hands it over.
    function rollJeffMood() {
      const j = jeff.current;
      if (j.mode !== "following") return;
      const roll = Math.random();
      if (roll < 0.25) {
        j.mode = "hungry";
        showToast("Jeff: I'm not hungry. I'm not hungry. I'm SO hungry!");
      } else if (roll < 0.4) {
        const type = Math.random() < 0.5 ? "seeds" : "bedding";
        carriedRef.current = { ...carriedRef.current, [type]: carriedRef.current[type] + 1 };
        setCarried({ ...carriedRef.current });
        showToast(`Jeff finds ${RESOURCE_LABEL[type]} and hands it over, pleased with himself.`);
      }
    }

    function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = player.current;
      const j = jeff.current;

      if (!sleepingRef.current) {
        dayTimeRef.current = (dayTimeRef.current + dt) % DAY_DURATION;
      }

      if (!p.moving && !dialogueRef.current && !sleepingRef.current) {
        for (const key of keysRef.current) {
          if (MOVE_KEYS[key]) {
            tryStep(MOVE_KEYS[key]);
            break;
          }
        }
      }

      if (p.moving) p.walkPhase += dt * 10;
      else p.walkPhase = 0;

      const arrived = advanceMover(p, dt, MOVE_SPEED);
      if (arrived) {
        collectAt(p.x, p.y);
        if (p.queuedDir) {
          const queued = p.queuedDir;
          p.queuedDir = null;
          tryStep(queued);
        }
      }

      // Jeff waits outside while you're in your burrow — he retraces the
      // player's steps one tile at a time while following in the village.
      if (sceneRef.current === "village") {
        if (j.mode === "following" && !j.moving && p.trail.length > 0) {
          const next = p.trail.shift();
          j.targetX = next.x;
          j.targetY = next.y;
          j.moving = true;
        }
        if (j.moving) j.walkPhase += dt * 10;
        else j.walkPhase = 0;
        advanceMover(j, dt, MOVE_SPEED);
      }

      draw(ctx);

      const h = computeHint();
      if (h !== lastHint) {
        lastHint = h;
        setHint(h);
      }
      const phase = phaseName((dayTimeRef.current / DAY_DURATION) % 1);
      if (phase !== lastPhase) {
        lastPhase = phase;
        setTimeLabel(phase);
      }

      rafRef.current = requestAnimationFrame(step);
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (sceneRef.current === "burrow") drawBurrow(ctx);
      else drawVillage(ctx);
    }

    function drawVillage(ctx) {
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const t = tileAt(x, y);
          if (t === "H") continue; // burrow entrance drawn from BURROW_STAGES below
          const variants = TILE_SPRITES[t] || TILE_SPRITES.G;
          const sprite = variants[(x + y) % variants.length];
          drawSprite(ctx, sprite, x * TILE_SIZE, y * TILE_SIZE, CELL);
        }
      }

      drawSprite(ctx, BURROW_STAGES[digStageRef.current], HOME.x * TILE_SIZE, HOME.y * TILE_SIZE, CELL);

      for (const node of nodesRef.current.values()) {
        if (!node.active) continue;
        const sprite = RESOURCE_SPRITE[node.type];
        drawSprite(ctx, sprite, node.x * TILE_SIZE, node.y * TILE_SIZE, CELL);
      }

      const j = jeff.current;
      const entities = NPCS.map((n) => {
        if (n.id === "jeff" && j.mode !== "idle") {
          return { y: j.y, draw: () => drawJeffDynamic(ctx) };
        }
        return { y: n.y, draw: () => drawNpc(ctx, n) };
      });
      entities.push({ y: player.current.y + (player.current.moving ? 1 : 0), draw: () => drawPlayer(ctx) });
      entities.sort((a, b) => a.y - b.y);
      for (const e of entities) e.draw();

      const tint = getTint((dayTimeRef.current / DAY_DURATION) % 1);
      if (tint.a > 0.005) {
        ctx.fillStyle = `rgba(${tint.r | 0},${tint.g | 0},${tint.b | 0},${tint.a})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    }

    function drawBurrow(ctx) {
      const stage = digStageRef.current;
      const { w, h } = interiorDims(stage);
      const offsetX = Math.floor((GRID_W - w) / 2) * TILE_SIZE;
      const offsetY = Math.floor((GRID_H - h) / 2) * TILE_SIZE;

      ctx.fillStyle = "#140f0a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const kind = tileKind(stage, x, y);
          const px = offsetX + x * TILE_SIZE;
          const py = offsetY + y * TILE_SIZE;
          if (kind === "wall") {
            drawSprite(ctx, DUG_WALL, px, py, CELL);
          } else if (kind === "frontier") {
            drawSprite(ctx, DIG_FRONTIER, px, py, CELL);
          } else {
            drawSprite(ctx, FLOOR, px, py, CELL);
            if (kind === "door") drawSprite(ctx, INTERIOR_DOOR, px, py, CELL);
            else if (kind === "nook") drawSprite(ctx, SLEEPING_NOOK, px, py, CELL);
            else if (kind === "workbench") drawSprite(ctx, WORKBENCH, px, py, CELL);
          }
        }
      }

      for (const f of furnitureRef.current) {
        const sprite = FURNITURE[f.id];
        if (sprite) drawSprite(ctx, sprite, offsetX + f.x * TILE_SIZE, offsetY + f.y * TILE_SIZE, CELL);
      }

      drawPlayer(ctx, offsetX, offsetY);
    }

    function drawNpc(ctx, npc) {
      const sprites = NPC_SPRITE_SETS[npc.sprite];
      const scale = NPC_SCALE[npc.sprite] ?? 1;
      const cell = CHAR_CELL * scale;
      const inset = (TILE_SIZE - 8 * cell) / 2;
      drawSprite(ctx, sprites.down, npc.x * TILE_SIZE + inset, npc.y * TILE_SIZE - 8 * scale, cell);
    }

    function drawJeffDynamic(ctx) {
      const j = jeff.current;
      const sprites = NPC_SPRITE_SETS.jeff;
      const scale = NPC_SCALE.jeff ?? 1;
      const cell = CHAR_CELL * scale;
      const inset = (TILE_SIZE - 8 * cell) / 2;
      const bob = j.moving ? Math.round(Math.sin(j.walkPhase) * 2) : 0;
      drawSprite(ctx, sprites.down, j.px + inset, j.py - 8 * scale + bob, cell);
      if (j.mode === "hungry") {
        drawSprite(ctx, EXCLAIM, j.px + inset + cell * 2.5, j.py - 8 * scale - 12, 3);
      }
    }

    function drawPlayer(ctx, offsetX = 0, offsetY = 0) {
      const p = player.current;
      const bob = p.moving ? Math.round(Math.sin(p.walkPhase) * 2) : 0;
      const x = offsetX + p.px + 4;
      const y = offsetY + p.py - 8 + bob;
      if (p.dir === "up") drawSprite(ctx, PLAYER_SPRITES.up, x, y, CHAR_CELL);
      else if (p.dir === "down") drawSprite(ctx, PLAYER_SPRITES.down, x, y, CHAR_CELL);
      else if (p.dir === "left") drawSprite(ctx, PLAYER_SPRITES.side, x, y, CHAR_CELL, true);
      else drawSprite(ctx, PLAYER_SPRITES.side, x, y, CHAR_CELL, false);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tryStep, showToast, findNpcAt]);

  const heartIcons = (value) => {
    const level = Math.min(5, Math.floor(value / 20));
    return "♥".repeat(level) + "♡".repeat(5 - level);
  };

  const holdDir = useCallback(
    (dir) => (e) => {
      e.preventDefault();
      const key = `touch-${dir}`;
      keysRef.current.add(key);
      tryStep(dir);
    },
    [tryStep]
  );
  const releaseDir = useCallback((dir) => () => keysRef.current.delete(`touch-${dir}`), []);

  return (
    <div className="cv-game">
      <div className="cv-stage">
        <div className="cv-viewport">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="cv-canvas" />
          {sleeping && <div className="cv-sleep-overlay">Zzz...</div>}
          {toast && <div className="cv-toast">{toast}</div>}
          {dialogue && (
            <div className="cv-dialogue">
              <div className="cv-dialogue-name">{dialogue.name}</div>
              <div className="cv-dialogue-text">{dialogue.lines[dialogue.index]}</div>
              <div className="cv-dialogue-hint">TAP CONTINUE</div>
            </div>
          )}
          {craftMenuOpen && (
            <div className="cv-craft-menu">
              <div className="cv-craft-title">Workbench</div>
              {RECIPES.map((r) => {
                const affordable = Object.entries(r.cost).every(([k, v]) => (stored[k] || 0) >= v);
                const costText = Object.entries(r.cost)
                  .map(([k, v]) => `${v} ${k}`)
                  .join(", ");
                return (
                  <button
                    key={r.id}
                    type="button"
                    className="cv-craft-item"
                    disabled={!affordable}
                    onClick={() => craftItem(r.id)}
                  >
                    <span>{r.label}</span>
                    <span className="cv-craft-cost">{costText}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className="cv-craft-close"
                onClick={() => {
                  craftMenuRef.current = false;
                  setCraftMenuOpen(false);
                }}
              >
                Close
              </button>
            </div>
          )}
          <div className="cv-hint">{hint}</div>
        </div>

        <div className="cv-touch-controls">
          <div className="cv-dpad">
            <button
              type="button"
              className="cv-dpad-btn cv-dpad-up"
              onPointerDown={holdDir("up")}
              onPointerUp={releaseDir("up")}
              onPointerLeave={releaseDir("up")}
              onPointerCancel={releaseDir("up")}
              aria-label="Move up"
            >
              ▲
            </button>
            <button
              type="button"
              className="cv-dpad-btn cv-dpad-left"
              onPointerDown={holdDir("left")}
              onPointerUp={releaseDir("left")}
              onPointerLeave={releaseDir("left")}
              onPointerCancel={releaseDir("left")}
              aria-label="Move left"
            >
              ◀
            </button>
            <button
              type="button"
              className="cv-dpad-btn cv-dpad-right"
              onPointerDown={holdDir("right")}
              onPointerUp={releaseDir("right")}
              onPointerLeave={releaseDir("right")}
              onPointerCancel={releaseDir("right")}
              aria-label="Move right"
            >
              ▶
            </button>
            <button
              type="button"
              className="cv-dpad-btn cv-dpad-down"
              onPointerDown={holdDir("down")}
              onPointerUp={releaseDir("down")}
              onPointerLeave={releaseDir("down")}
              onPointerCancel={releaseDir("down")}
              aria-label="Move down"
            >
              ▼
            </button>
          </div>
          <div className="cv-action-buttons">
            <button
              type="button"
              className="cv-action-btn"
              onClick={() => giftFacing()}
              disabled={Boolean(dialogue) || scene === "burrow" || craftMenuOpen}
            >
              Gift
            </button>
            <button
              type="button"
              className="cv-action-btn cv-action-btn-primary"
              onClick={() => interact()}
              disabled={craftMenuOpen}
            >
              {dialogue ? "Continue" : "Talk / Rest"}
            </button>
          </div>
        </div>
      </div>

      <div className="cv-hud">
        <h1>Centerville</h1>
        <div className="cv-stat">
          Day {day} · {timeLabel}
        </div>

        <div className="cv-stat-block">
          <span>Carrying</span>
          <div className="cv-carry-row">
            {Object.entries(carried).map(([k, v]) => (
              <span key={k}>
                {RESOURCE_ICON[k]} {k[0].toUpperCase() + k.slice(1)}: {v}
              </span>
            ))}
          </div>
        </div>

        <div className="cv-stat-block">
          <span>Your Burrow</span>
          <div>{BURROW_LABEL[digStage]}</div>
          <div className="cv-burrow-progress">
            stored: {Object.entries(stored).map(([k, v]) => `${v} ${k}`).join(", ")}
          </div>
          {furniture.length > 0 && (
            <div className="cv-burrow-progress">{furniture.length} piece{furniture.length > 1 ? "s" : ""} of furniture</div>
          )}
        </div>

        <div className="cv-stat-block">
          <span>Friendship</span>
          {NPCS.map((n) => (
            <div key={n.id} className="cv-friend-row">
              <span>{n.name}</span>
              <span className="cv-hearts">{heartIcons(hearts[n.id])}</span>
            </div>
          ))}
        </div>

        <div className="cv-controls">
          <div>Arrows / WASD — move</div>
          <div>Space — talk / rest / look</div>
          <div>G — gift to whoever you're facing</div>
        </div>
      </div>
    </div>
  );
}
