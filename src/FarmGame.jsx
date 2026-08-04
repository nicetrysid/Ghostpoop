import { useCallback, useEffect, useRef, useState } from "react";
import { drawSprite } from "./game/pixelSprite";
import {
  CROP_STAGES,
  PLAYER_SPRITES,
  NPC1_SPRITES,
  NPC2_SPRITES,
  TILE_SPRITES,
  TILLED,
  WATERED,
} from "./game/sprites";
import {
  GRID_H,
  GRID_W,
  NPCS,
  PLAYER_START,
  TILE_SIZE,
  isTillable,
  isWalkable,
  tileAt,
} from "./game/map";
import "./FarmGame.css";

const CELL = TILE_SIZE / 8; // tile sprites are 8x8 grids
const CHAR_CELL = CELL; // character sprites are also authored on an 8-wide grid
const MOVE_SPEED = 4.2; // tiles per second
const CANVAS_W = GRID_W * TILE_SIZE;
const CANVAS_H = GRID_H * TILE_SIZE;
const MAX_STAMINA = 100;
const MAX_FRIENDSHIP = 100;
const TOOLS = ["hoe", "water", "seeds"];
const TOOL_LABEL = { hoe: "Hoe", water: "Watering Can", seeds: "Turnip Seeds" };

const NPC_SPRITE_SETS = { npc1: NPC1_SPRITES, npc2: NPC2_SPRITES };

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

function tileKey(x, y) {
  return `${x},${y}`;
}

export default function FarmGame() {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const farmRef = useRef(new Map());
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

  const dialogueRef = useRef(null); // mirrors dialogue state for the game loop
  const sleepingRef = useRef(false);
  const staminaRef = useRef(MAX_STAMINA);

  const [day, setDay] = useState(1);
  const [stamina, setStamina] = useState(MAX_STAMINA);
  const [tool, setTool] = useState("hoe");
  const [basket, setBasket] = useState(0);
  const [hearts, setHearts] = useState({ hazel: 0, reed: 0 });
  const [dialogue, setDialogue] = useState(null);
  const [toast, setToast] = useState("");
  const [sleeping, setSleeping] = useState(false);
  const [hint, setHint] = useState("");

  const toolRef = useRef(tool);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2200);
  }, []);

  const spendStamina = useCallback((amount) => {
    staminaRef.current = Math.max(0, staminaRef.current - amount);
    setStamina(staminaRef.current);
  }, []);

  const getFarmTile = useCallback((x, y) => {
    const key = tileKey(x, y);
    let tile = farmRef.current.get(key);
    if (!tile) {
      tile = { tilled: false, watered: false, stage: -1 };
      farmRef.current.set(key, tile);
    }
    return tile;
  }, []);

  const sleep = useCallback(() => {
    sleepingRef.current = true;
    setSleeping(true);
    setTimeout(() => {
      for (const tile of farmRef.current.values()) {
        if (tile.watered && tile.stage >= 0 && tile.stage < CROP_STAGES.length - 1) {
          tile.stage += 1;
        }
        tile.watered = false;
      }
      staminaRef.current = MAX_STAMINA;
      setStamina(MAX_STAMINA);
      setDay((d) => d + 1);
      player.current.x = PLAYER_START.x;
      player.current.y = PLAYER_START.y;
      player.current.targetX = PLAYER_START.x;
      player.current.targetY = PLAYER_START.y;
      player.current.px = PLAYER_START.x * TILE_SIZE;
      player.current.py = PLAYER_START.y * TILE_SIZE;
      sleepingRef.current = false;
      setSleeping(false);
      showToast("A new day on the farm.");
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

  const giveGift = useCallback(
    (npc) => {
      if (basket <= 0) {
        showToast("You have no turnips to give.");
        return;
      }
      setBasket((b) => b - 1);
      setHearts((prev) => ({
        ...prev,
        [npc.id]: Math.min(MAX_FRIENDSHIP, prev[npc.id] + 25),
      }));
      showToast(`Gave ${npc.name} a turnip. They seem happy!`);
    },
    [basket, showToast]
  );

  const applyTool = useCallback(
    (x, y) => {
      if (!isTillable(x, y)) {
        showToast("Can't do that here.");
        return;
      }
      const t = getFarmTile(x, y);

      if (t.stage === CROP_STAGES.length - 1) {
        t.stage = -1;
        t.watered = false;
        setBasket((b) => b + 1);
        showToast("Picked a turnip!");
        return;
      }

      if (staminaRef.current < 5) {
        showToast("Too tired... go home and sleep.");
        return;
      }

      const current = toolRef.current;
      if (current === "hoe") {
        if (t.tilled) {
          showToast("Already tilled.");
          return;
        }
        t.tilled = true;
        spendStamina(5);
        showToast("Tilled the soil.");
      } else if (current === "water") {
        if (!t.tilled) {
          showToast("Till the soil first.");
          return;
        }
        if (t.watered) {
          showToast("Already watered today.");
          return;
        }
        t.watered = true;
        spendStamina(5);
        showToast("Watered the soil.");
      } else if (current === "seeds") {
        if (!t.tilled) {
          showToast("Till the soil first.");
          return;
        }
        if (t.stage >= 0) {
          showToast("Already planted here.");
          return;
        }
        t.stage = 0;
        spendStamina(5);
        showToast("Planted turnip seeds.");
      }
    },
    [getFarmTile, showToast, spendStamina]
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

    if (tileAt(fx, fy) === "D") {
      sleep();
      return;
    }

    applyTool(fx, fy);
  }, [applyTool, openDialogue, sleep]);

  const gift = useCallback(() => {
    if (dialogueRef.current) return;
    const p = player.current;
    const [ox, oy] = DIR_OFFSET[p.dir];
    const fx = p.x + ox;
    const fy = p.y + oy;
    const npc = NPCS.find((n) => n.x === fx && n.y === fy);
    if (npc) giveGift(npc);
    else showToast("No one there to give that to.");
  }, [giveGift, showToast]);

  // A single key tap must always move the player one tile, even if the
  // keyup fires before the next animation frame (fast taps, programmatic
  // key dispatch). So movement is kicked off directly from the keydown
  // handler; the held-keys set is only consulted afterwards, inside the
  // game loop, to keep moving while a key stays down.
  const tryStep = useCallback((dir) => {
    const p = player.current;
    if (p.moving || dialogueRef.current || sleepingRef.current) return;
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
      else if (e.key === "g" || e.key === "G") gift();
      else if (e.key === "1") setTool("hoe");
      else if (e.key === "2") setTool("water");
      else if (e.key === "3") setTool("seeds");
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
  }, [interact, gift, tryStep]);

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
      if (npc) return `SPACE to talk to ${npc.name} · G to gift a turnip`;
      if (tileAt(fx, fy) === "D") return "SPACE to sleep and start a new day";
      if (isTillable(fx, fy)) {
        const t = farmRef.current.get(tileKey(fx, fy));
        if (t && t.stage === CROP_STAGES.length - 1) return "SPACE to harvest";
        return `SPACE to use ${TOOL_LABEL[toolRef.current]}`;
      }
      return "Move with arrow keys / WASD";
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
        const step = MOVE_SPEED * TILE_SIZE * dt;
        const dx = targetPx - p.px;
        const dy = targetPy - p.py;
        const dist = Math.hypot(dx, dy);
        if (dist <= step || dist === 0) {
          p.px = targetPx;
          p.py = targetPy;
          p.x = p.targetX;
          p.y = p.targetY;
          p.moving = false;
        } else {
          p.px += (dx / dist) * step;
          p.py += (dy / dist) * step;
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

      // terrain
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const t = tileAt(x, y);
          const variants = TILE_SPRITES[t] || TILE_SPRITES.G;
          const sprite = variants[(x + y) % variants.length];
          drawSprite(ctx, sprite, x * TILE_SIZE, y * TILE_SIZE, CELL);
        }
      }

      // overlay tilled/watered soil + crops on top of grass
      for (const [key, tile] of farmRef.current) {
        if (!tile.tilled) continue;
        const [xs, ys] = key.split(",");
        const x = Number(xs);
        const y = Number(ys);
        const soilSprite = tile.watered ? WATERED : TILLED;
        drawSprite(ctx, soilSprite, x * TILE_SIZE, y * TILE_SIZE, CELL);
        if (tile.stage >= 0) {
          drawSprite(ctx, CROP_STAGES[tile.stage], x * TILE_SIZE, y * TILE_SIZE, CELL);
        }
      }

      // entities sorted by y for simple depth ordering
      const entities = [
        ...NPCS.map((n) => ({ y: n.y, draw: () => drawNpc(ctx, n) })),
        { y: player.current.y + (player.current.moving ? 1 : 0), draw: () => drawPlayer(ctx) },
      ].sort((a, b) => a.y - b.y);
      for (const e of entities) e.draw();
    }

    function drawNpc(ctx, npc) {
      const sprites = NPC_SPRITE_SETS[npc.sprite];
      drawSprite(ctx, sprites.down, npc.x * TILE_SIZE + 4, npc.y * TILE_SIZE - 8, CHAR_CELL);
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
  }, [tryStep]);

  const heartIcons = (value) => {
    const level = Math.min(5, Math.floor(value / 20));
    return "♥".repeat(level) + "♡".repeat(5 - level);
  };

  return (
    <div className="farm-game">
      <div className="farm-stage">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="farm-canvas"
        />
        {sleeping && <div className="farm-sleep-overlay">Zzz...</div>}
        {toast && <div className="farm-toast">{toast}</div>}
        {dialogue && (
          <div className="farm-dialogue">
            <div className="farm-dialogue-name">{dialogue.name}</div>
            <div className="farm-dialogue-text">{dialogue.lines[dialogue.index]}</div>
            <div className="farm-dialogue-hint">SPACE</div>
          </div>
        )}
        <div className="farm-hint">{hint}</div>
      </div>

      <div className="farm-hud">
        <h1>Mouse Valley</h1>
        <div className="farm-stat">Day {day}</div>

        <div className="farm-stat-block">
          <span>Stamina</span>
          <div className="farm-bar">
            <div
              className="farm-bar-fill farm-bar-stamina"
              style={{ width: `${(stamina / MAX_STAMINA) * 100}%` }}
            />
          </div>
        </div>

        <div className="farm-stat-block">
          <span>Basket: {basket} 🥕</span>
        </div>

        <div className="farm-stat-block">
          <span>Tools</span>
          <div className="farm-tools">
            {TOOLS.map((t, i) => (
              <button
                key={t}
                className={t === tool ? "farm-tool active" : "farm-tool"}
                onClick={() => setTool(t)}
              >
                {i + 1}. {TOOL_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="farm-stat-block">
          <span>Friendship</span>
          {NPCS.map((n) => (
            <div key={n.id} className="farm-friend-row">
              <span>{n.name}</span>
              <span className="farm-hearts">{heartIcons(hearts[n.id])}</span>
            </div>
          ))}
        </div>

        <div className="farm-controls">
          <div>Arrows / WASD — move</div>
          <div>Space — use tool / talk / sleep</div>
          <div>G — gift a turnip</div>
          <div>1 2 3 — switch tool</div>
        </div>
      </div>
    </div>
  );
}
