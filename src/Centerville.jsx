import { useCallback, useEffect, useRef, useState } from "react";
import { drawSprite } from "./game/pixelSprite";
import {
  BEDDING_PICKUP,
  BURROW_STAGES,
  NPC_SCALE,
  NPC_SPRITE_SETS,
  PLAYER_SPRITES,
  SEED_PICKUP,
  TILE_SPRITES,
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
};

const FLAVOR_TEXT = {
  K: "Skitters' Bush — the watching seat.",
  N: "Weg's Mound — one mouse wide, the kind you have to mean.",
  R: "Dennis's Tree — it slaps him. He blames the wind.",
  M: "The Market — Fossoway's stall.",
  Y: "Bart's Houseboat — the moat serves no identified purpose.",
  T: "A tree. Nothing more to say.",
  B: "The canyon wall. Solid red sandstone.",
};

const RESOURCE_LABEL = { seeds: "a seed", bedding: "some bedding" };
const BURROW_LABEL = ["a bare hole", "softer, with bedding tucked in", "properly furnished"];

function getBurrowStage(banked) {
  if (banked.bedding >= 3 && banked.seeds >= 3) return 2;
  if (banked.bedding >= 3) return 1;
  return 0;
}

export default function Centerville() {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(0);
  const toastTimerRef = useRef(0);

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
  });

  const dialogueRef = useRef(null);
  const sleepingRef = useRef(false);
  const carriedRef = useRef({ seeds: 0, bedding: 0 });
  const bankedRef = useRef({ seeds: 0, bedding: 0 });
  const nodesRef = useRef(new Map(RESOURCE_NODES.map((n) => [n.id, { ...n, active: true }])));

  const [day, setDay] = useState(1);
  const [carried, setCarried] = useState({ seeds: 0, bedding: 0 });
  const [banked, setBanked] = useState({ seeds: 0, bedding: 0 });
  const [hearts, setHearts] = useState({ weg: 0, skitters: 0, dennis: 0, jeff: 0 });
  const [dialogue, setDialogue] = useState(null);
  const [toast, setToast] = useState("");
  const [sleeping, setSleeping] = useState(false);
  const [hint, setHint] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const rest = useCallback(() => {
    const c = carriedRef.current;
    const stageBefore = getBurrowStage(bankedRef.current);
    let msg;
    if (c.seeds === 0 && c.bedding === 0) {
      msg = "Nothing to store today, but rest is rest.";
    } else {
      const parts = [];
      if (c.seeds > 0) parts.push(`${c.seeds} seed${c.seeds > 1 ? "s" : ""}`);
      if (c.bedding > 0) parts.push(`${c.bedding} bedding`);
      bankedRef.current = {
        seeds: bankedRef.current.seeds + c.seeds,
        bedding: bankedRef.current.bedding + c.bedding,
      };
      setBanked({ ...bankedRef.current });
      const stageAfter = getBurrowStage(bankedRef.current);
      msg = `Stored ${parts.join(" and ")}.`;
      if (stageAfter > stageBefore) {
        msg += ` Your burrow is now ${BURROW_LABEL[stageAfter]}.`;
      }
    }
    carriedRef.current = { seeds: 0, bedding: 0 };
    setCarried({ seeds: 0, bedding: 0 });

    sleepingRef.current = true;
    setSleeping(true);
    setTimeout(() => {
      for (const node of nodesRef.current.values()) node.active = true;
      setDay((d) => d + 1);
      player.current.x = PLAYER_START.x;
      player.current.y = PLAYER_START.y;
      player.current.targetX = PLAYER_START.x;
      player.current.targetY = PLAYER_START.y;
      player.current.px = PLAYER_START.x * TILE_SIZE;
      player.current.py = PLAYER_START.y * TILE_SIZE;
      sleepingRef.current = false;
      setSleeping(false);
      showToast(msg);
    }, 900);
  }, [showToast]);

  const openDialogue = useCallback((npc) => {
    setHearts((prev) => {
      const next = Math.min(MAX_FRIENDSHIP, prev[npc.id] + 10);
      const level = Math.min(npc.lines.length - 1, Math.floor(next / 20));
      const entry = { id: npc.id, name: npc.name, lines: npc.lines, index: level };
      dialogueRef.current = entry;
      setDialogue(entry);
      return { ...prev, [npc.id]: next };
    });
  }, []);

  const gift = useCallback(
    (npc) => {
      const other = npc.prefers === "seeds" ? "bedding" : "seeds";
      if (carriedRef.current[npc.prefers] > 0) {
        carriedRef.current = { ...carriedRef.current, [npc.prefers]: carriedRef.current[npc.prefers] - 1 };
        setCarried({ ...carriedRef.current });
        setHearts((prev) => ({ ...prev, [npc.id]: Math.min(MAX_FRIENDSHIP, prev[npc.id] + 25) }));
        showToast(npc.giftLine);
      } else if (carriedRef.current[other] > 0) {
        carriedRef.current = { ...carriedRef.current, [other]: carriedRef.current[other] - 1 };
        setCarried({ ...carriedRef.current });
        setHearts((prev) => ({ ...prev, [npc.id]: Math.min(MAX_FRIENDSHIP, prev[npc.id] + 5) }));
        showToast(npc.mismatchLine);
      } else {
        showToast("You have nothing to give right now.");
      }
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
      }
      return;
    }

    const p = player.current;
    const [ox, oy] = DIR_OFFSET[p.dir];
    const fx = p.x + ox;
    const fy = p.y + oy;

    const npc = NPCS.find((n) => n.x === fx && n.y === fy);
    if (npc) {
      openDialogue(npc);
      return;
    }

    if (fx === HOME.x && fy === HOME.y) {
      rest();
      return;
    }

    const flavor = FLAVOR_TEXT[tileAt(fx, fy)];
    showToast(flavor || "Nothing here.");
  }, [openDialogue, rest, showToast]);

  const giftFacing = useCallback(() => {
    if (dialogueRef.current) return;
    const p = player.current;
    const [ox, oy] = DIR_OFFSET[p.dir];
    const fx = p.x + ox;
    const fy = p.y + oy;
    const npc = NPCS.find((n) => n.x === fx && n.y === fy);
    if (npc) gift(npc);
    else showToast("No one there to give that to.");
  }, [gift, showToast]);

  // A tap that lands while the previous tile-step is still animating must
  // not be lost — queue it and the game loop will fire it the instant the
  // current step lands, so rapid tapping still moves the player one tile
  // per press instead of silently swallowing inputs.
  const tryStep = useCallback((dir) => {
    const p = player.current;
    if (dialogueRef.current || sleepingRef.current) return;
    if (p.moving) {
      p.queuedDir = dir;
      return;
    }
    p.dir = dir;
    const [ox, oy] = DIR_OFFSET[dir];
    const nx = p.x + ox;
    const ny = p.y + oy;
    const blockedByNpc = NPCS.some((n) => n.x === nx && n.y === ny);
    if (isWalkable(nx, ny) && !blockedByNpc) {
      p.targetX = nx;
      p.targetY = ny;
      p.moving = true;
    }
  }, []);

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

    function computeHint() {
      if (dialogueRef.current) return "SPACE to continue";
      const p = player.current;
      const [ox, oy] = DIR_OFFSET[p.dir];
      const fx = p.x + ox;
      const fy = p.y + oy;
      const npc = NPCS.find((n) => n.x === fx && n.y === fy);
      if (npc) return `SPACE to talk to ${npc.name} · G to gift`;
      if (fx === HOME.x && fy === HOME.y) return "SPACE to rest and store today's gathering";
      if (FLAVOR_TEXT[tileAt(fx, fy)]) return "SPACE to look closer";
      return "Arrows / WASD to move — walk over seeds & bedding to collect them";
    }

    function collectAt(x, y) {
      for (const node of nodesRef.current.values()) {
        if (node.active && node.x === x && node.y === y) {
          node.active = false;
          carriedRef.current = { ...carriedRef.current, [node.type]: carriedRef.current[node.type] + 1 };
          setCarried({ ...carriedRef.current });
          showToast(`Picked up ${RESOURCE_LABEL[node.type]}.`);
          break;
        }
      }
    }

    function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = player.current;

      if (!p.moving && !dialogueRef.current && !sleepingRef.current) {
        for (const key of keysRef.current) {
          if (MOVE_KEYS[key]) {
            tryStep(MOVE_KEYS[key]);
            break;
          }
        }
      }

      if (p.moving) {
        const targetPx = p.targetX * TILE_SIZE;
        const targetPy = p.targetY * TILE_SIZE;
        const stepDist = MOVE_SPEED * TILE_SIZE * dt;
        const dx = targetPx - p.px;
        const dy = targetPy - p.py;
        const dist = Math.hypot(dx, dy);
        if (dist <= stepDist || dist === 0) {
          p.px = targetPx;
          p.py = targetPy;
          p.x = p.targetX;
          p.y = p.targetY;
          p.moving = false;
          collectAt(p.x, p.y);
          if (p.queuedDir) {
            const queued = p.queuedDir;
            p.queuedDir = null;
            tryStep(queued);
          }
        } else {
          p.px += (dx / dist) * stepDist;
          p.py += (dy / dist) * stepDist;
        }
        p.walkPhase += dt * 10;
      } else {
        p.walkPhase = 0;
      }

      draw(ctx);

      const h = computeHint();
      if (h !== lastHint) {
        lastHint = h;
        setHint(h);
      }

      rafRef.current = requestAnimationFrame(step);
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const t = tileAt(x, y);
          if (t === "H") continue; // burrow drawn from BURROW_STAGES below
          const variants = TILE_SPRITES[t] || TILE_SPRITES.G;
          const sprite = variants[(x + y) % variants.length];
          drawSprite(ctx, sprite, x * TILE_SIZE, y * TILE_SIZE, CELL);
        }
      }

      const stage = getBurrowStage(bankedRef.current);
      drawSprite(ctx, BURROW_STAGES[stage], HOME.x * TILE_SIZE, HOME.y * TILE_SIZE, CELL);

      for (const node of nodesRef.current.values()) {
        if (!node.active) continue;
        const sprite = node.type === "seeds" ? SEED_PICKUP : BEDDING_PICKUP;
        drawSprite(ctx, sprite, node.x * TILE_SIZE, node.y * TILE_SIZE, CELL);
      }

      const entities = [
        ...NPCS.map((n) => ({ y: n.y, draw: () => drawNpc(ctx, n) })),
        { y: player.current.y + (player.current.moving ? 1 : 0), draw: () => drawPlayer(ctx) },
      ].sort((a, b) => a.y - b.y);
      for (const e of entities) e.draw();
    }

    function drawNpc(ctx, npc) {
      const sprites = NPC_SPRITE_SETS[npc.sprite];
      const scale = NPC_SCALE[npc.sprite] ?? 1;
      const cell = CHAR_CELL * scale;
      const inset = (TILE_SIZE - 8 * cell) / 2;
      drawSprite(ctx, sprites.down, npc.x * TILE_SIZE + inset, npc.y * TILE_SIZE - 8 * scale, cell);
    }

    function drawPlayer(ctx) {
      const p = player.current;
      const bob = p.moving ? Math.round(Math.sin(p.walkPhase) * 2) : 0;
      const x = p.px + 4;
      const y = p.py - 8 + bob;
      if (p.dir === "up") drawSprite(ctx, PLAYER_SPRITES.up, x, y, CHAR_CELL);
      else if (p.dir === "down") drawSprite(ctx, PLAYER_SPRITES.down, x, y, CHAR_CELL);
      else if (p.dir === "left") drawSprite(ctx, PLAYER_SPRITES.side, x, y, CHAR_CELL, true);
      else drawSprite(ctx, PLAYER_SPRITES.side, x, y, CHAR_CELL, false);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tryStep, showToast]);

  const heartIcons = (value) => {
    const level = Math.min(5, Math.floor(value / 20));
    return "♥".repeat(level) + "♡".repeat(5 - level);
  };

  const stage = getBurrowStage(banked);

  return (
    <div className="cv-game">
      <div className="cv-stage">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="cv-canvas" />
        {sleeping && <div className="cv-sleep-overlay">Zzz...</div>}
        {toast && <div className="cv-toast">{toast}</div>}
        {dialogue && (
          <div className="cv-dialogue">
            <div className="cv-dialogue-name">{dialogue.name}</div>
            <div className="cv-dialogue-text">{dialogue.lines[dialogue.index]}</div>
            <div className="cv-dialogue-hint">SPACE</div>
          </div>
        )}
        <div className="cv-hint">{hint}</div>
      </div>

      <div className="cv-hud">
        <h1>Centerville</h1>
        <div className="cv-stat">Day {day}</div>

        <div className="cv-stat-block">
          <span>Carrying</span>
          <div className="cv-carry-row">
            <span>🌾 Seeds: {carried.seeds}</span>
            <span>🪶 Bedding: {carried.bedding}</span>
          </div>
        </div>

        <div className="cv-stat-block">
          <span>Your Burrow</span>
          <div>{BURROW_LABEL[stage]}</div>
          <div className="cv-burrow-progress">
            stored: {banked.seeds} seeds, {banked.bedding} bedding
          </div>
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
