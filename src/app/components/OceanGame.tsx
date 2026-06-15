import { useEffect, useRef, useState, useCallback } from "react";
import { Application } from "pixi.js";

// scene
import { createSky } from "./game/scene/drawSky";
import { createWater, updateWater } from "./game/scene/drawWater";
import { createBoat, updateBoat } from "./game/scene/drawBoat";

// systems
import { createBubbles, updateBubbles, destroyBubbles } from "./game/systems/BubbleSystem";
import { createHeartsHUD, updateHearts } from "./game/systems/HeartsHUD";
import {
  spawnPopLabel, spawnBurst,
  updatePopLabels, updateDots,
  destroyPopSystem,
} from "./game/systems/PopSystem";
import {
  spawnCreature, updateCreatures, hitTestCreatures,
  type ActiveCreature,
} from "./game/systems/CreatureSystem";

// constants
import { CREATURES, MAX_MISSES } from "./game/constants";

// ── Type aliases for pop system arrays ────────────────────────────────────────
type PopLabel  = Parameters<typeof updatePopLabels>[0][number];
type DotParticle = Parameters<typeof updateDots>[0][number];

export function OceanGame() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef    = useRef<Application | null>(null);

  // mutable game state (refs avoid stale closures in ticker)
  const creaturesRef    = useRef<ActiveCreature[]>([]);
  const bubblesRef      = useRef<ReturnType<typeof createBubbles>>([]);
  const popLabelsRef    = useRef<PopLabel[]>([]);
  const dotParticlesRef = useRef<DotParticle[]>([]);

  const heartsHUDRef    = useRef<ReturnType<typeof createHeartsHUD> | null>(null);
  const boatSceneRef    = useRef<ReturnType<typeof createBoat> | null>(null);
  const waterLayerRef   = useRef<ReturnType<typeof createWater> | null>(null);

  const spawnIntervalRef = useRef(1200);
  const lastSpawnRef     = useRef(0);
  const gameTimeRef      = useRef(0);
  const scoreRef         = useRef(0);
  const missesRef        = useRef(0);
  const comboRef         = useRef(0);
  const comboTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStateRef     = useRef<"idle" | "playing" | "dead">("idle");

  // React UI state (only what the overlay needs)
  const [score,     setScore]     = useState(0);
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem("deepTapBest") ?? 0));
  const [misses,    setMisses]    = useState(0);
  const [combo,     setCombo]     = useState(0);
  const [newBest,   setNewBest]   = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");

  // ── called when a creature expires without being tapped ──────────────────
  const onCreatureExpire = useCallback((c: ActiveCreature) => {
    if (c.phase !== "alive") return;
    c.tapped = false;
    c.phase = "popout";

    const next = missesRef.current + 1;
    missesRef.current = next;
    setMisses(next);
    if (heartsHUDRef.current) updateHearts(heartsHUDRef.current, next);
    comboRef.current = 0;
    setCombo(0);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);

    if (next >= MAX_MISSES) {
      gameStateRef.current = "dead";
      setGameState("dead");
      const final = scoreRef.current;
      setBestScore(prev => {
        const nb = final > prev;
        setNewBest(nb);
        const next2 = nb ? final : prev;
        localStorage.setItem("deepTapBest", String(next2));
        return next2;
      });
    }
  }, []);

  // ── tap a creature ────────────────────────────────────────────────────────
  const tapCreature = useCallback((c: ActiveCreature) => {
    c.tapped = true;
    c.phase = "popout";

    comboRef.current += 1;
    setCombo(comboRef.current);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => { comboRef.current = 0; setCombo(0); }, 1500);

    let pts = c.def.points;
    if (comboRef.current >= 3) pts = Math.round(pts * (1 + comboRef.current * 0.3));

    scoreRef.current += pts;
    setScore(scoreRef.current);

    const app = appRef.current;
    if (app) {
      spawnPopLabel(app, popLabelsRef.current, pts, c.x, c.y - 24, c.def.glow);
      spawnBurst(app, dotParticlesRef.current, c.x, c.y, c.def.glow);
    }
  }, []);

  // ── start / restart ───────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    scoreRef.current  = 0;
    missesRef.current = 0;
    comboRef.current  = 0;
    setScore(0); setMisses(0); setCombo(0); setNewBest(false);

    for (const c of creaturesRef.current) c.container.destroy({ children: true });
    creaturesRef.current = [];
    destroyPopSystem(popLabelsRef.current, dotParticlesRef.current);

    spawnIntervalRef.current = 1200;
    lastSpawnRef.current     = 0;
    gameTimeRef.current      = 0;

    if (heartsHUDRef.current) updateHearts(heartsHUDRef.current, 0);
    gameStateRef.current = "playing";
    setGameState("playing");
  }, []);

  // ── PixiJS setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const wrap = canvasRef.current;
    const app  = new Application();
    appRef.current = app;

    app.init({
      width:       wrap.clientWidth  || 800,
      height:      wrap.clientHeight || 600,
      backgroundColor: 0xdcecf0,
      antialias:   true,
      resolution:  window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      wrap.appendChild(app.canvas);
      const W = app.screen.width;
      const H = app.screen.height;

      // ── static scene layers (back to front) ──────────────────────────
      app.stage.addChild(createSky(app));

      const waterLayer = createWater(app);
      waterLayerRef.current = waterLayer;
      app.stage.addChild(waterLayer.deep);
      app.stage.addChild(waterLayer.reflection);
      app.stage.addChild(waterLayer.surface);

      // ── boat + fisherman + rod (also adds itself to stage) ────────────
      boatSceneRef.current = createBoat(app);

      // ── underwater bubbles ────────────────────────────────────────────
      bubblesRef.current = createBubbles(app);

      // ── hearts HUD (drawn on top of everything) ───────────────────────
      heartsHUDRef.current = createHeartsHUD(app);

      // ── game loop ─────────────────────────────────────────────────────
      let elapsed = 0;
      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS;
        elapsed += dt;

        // scene animation (always runs)
        updateWater(waterLayer, W, H, elapsed);
        updateBubbles(bubblesRef.current, H, W);
        if (boatSceneRef.current) updateBoat(boatSceneRef.current, H, elapsed);

        if (gameStateRef.current !== "playing") return;
        gameTimeRef.current += dt;

        // ramp difficulty
        spawnIntervalRef.current = Math.max(400, 1200 - gameTimeRef.current * 0.04);

        // spawn
        if (elapsed - lastSpawnRef.current > spawnIntervalRef.current) {
          lastSpawnRef.current = elapsed;
          creaturesRef.current.push(spawnCreature(app, elapsed, gameTimeRef.current));
        }

        // update creatures
        creaturesRef.current = updateCreatures(
          creaturesRef.current,
          elapsed,
          onCreatureExpire,
        );

        // pop effects
        popLabelsRef.current    = updatePopLabels(popLabelsRef.current);
        dotParticlesRef.current = updateDots(dotParticlesRef.current);
      });
    });

    return () => {
      destroyBubbles(bubblesRef.current);
      destroyPopSystem(popLabelsRef.current, dotParticlesRef.current);
      creaturesRef.current = [];
      heartsHUDRef.current = null;
      boatSceneRef.current = null;
      waterLayerRef.current = null;
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, [onCreatureExpire]);

  // ── canvas tap ───────────────────────────────────────────────────────────
  const handleTap = useCallback((e: React.PointerEvent) => {
    if (gameStateRef.current !== "playing") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const app  = appRef.current!;
    const tx = (e.clientX - rect.left) * (app.screen.width  / rect.width);
    const ty = (e.clientY - rect.top)  * (app.screen.height / rect.height);
    const hit = hitTestCreatures(creaturesRef.current, tx, ty);
    if (hit) tapCreature(hit);
  }, [tapCreature]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden bg-background text-foreground font-sans select-none">
      <style>{`
        @keyframes comboIn{0%{transform:translateX(-50%) scale(.6);opacity:0}60%{transform:translateX(-50%) scale(1.15);opacity:1}100%{transform:translateX(-50%) scale(1);opacity:1}}
        .combo-badge{animation:comboIn .3s ease-out forwards;}
      `}</style>

      {/* PixiJS canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "crosshair", touchAction: "none" }}
        onPointerDown={handleTap}
      />

      {/* Score HUD — top left */}
      {gameState === "playing" && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="bg-card border border-border shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)] rounded-[16px] px-4 py-2 flex gap-4 items-center">
            <div>
              <div className="text-muted-foreground font-medium" style={{ fontSize: "11px", letterSpacing: ".1em" }}>SCORE</div>
              <div className="text-foreground font-display font-bold" style={{ fontSize: "22px" }}>{score}</div>
            </div>
            {bestScore > 0 && (
              <div className="border-l border-border pl-3">
                <div className="text-muted-foreground font-medium" style={{ fontSize: "11px", letterSpacing: ".1em" }}>BEST</div>
                <div className="text-primary font-display font-bold" style={{ fontSize: "16px" }}>{bestScore}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Combo badge — top center */}
      {gameState === "playing" && combo >= 2 && (
        <div key={combo} className="combo-badge absolute top-3 pointer-events-none"
          style={{ left: "50%", transform: "translateX(-50%)" }}>
          <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2">
            <div className="text-foreground font-display font-bold" style={{ fontSize: "14px" }}>x{combo} COMBO</div>
          </div>
        </div>
      )}

      {/* Idle screen */}
      {gameState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
          <div className="text-center">
            <div className="text-foreground font-display font-extrabold" style={{ fontSize: "40px", letterSpacing: ".05em" }}>
              Ocean Tap
            </div>
            <div className="text-muted-foreground mt-2" style={{ fontSize: "16px" }}>
              Tap the sea creatures before they disappear.
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center px-8 max-w-sm">
            {CREATURES.map(c => (
              <div key={c.name} className="bg-muted border border-border rounded-[12px] px-3 py-1 text-center">
                <div className="text-foreground font-medium" style={{ fontSize: "13px" }}>{c.name}</div>
                <div className="text-secondary font-bold" style={{ fontSize: "12px" }}>+{c.points}</div>
              </div>
            ))}
          </div>
          <button
            className="pointer-events-auto rounded-full px-10 py-4 font-bold tracking-wider text-primary-foreground bg-primary transition-colors duration-200 hover:bg-[#D6B847]"
            style={{ fontSize: "16px" }}
            onClick={startGame}
          >
            START FISHING
          </button>
        </div>
      )}

      {/* Game over screen */}
      {gameState === "dead" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="text-foreground font-display font-bold" style={{ fontSize: "32px" }}>GAME OVER</div>
          <div className="bg-card border border-border rounded-[16px] px-8 py-6 text-center shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)]">
            <div className="text-muted-foreground font-medium" style={{ fontSize: "13px" }}>FINAL SCORE</div>
            <div className="text-primary font-display font-extrabold mt-1" style={{ fontSize: "48px", lineHeight: "1" }}>{score}</div>
            {newBest
              ? <div className="text-secondary font-bold mt-2" style={{ fontSize: "14px" }}>NEW BEST!</div>
              : bestScore > 0 && <div className="text-muted-foreground mt-2" style={{ fontSize: "13px" }}>best: {bestScore}</div>
            }
          </div>
          <button
            className="pointer-events-auto rounded-full px-8 py-3 font-bold text-primary-foreground bg-primary transition-colors duration-200 hover:bg-[#D6B847] mt-2"
            style={{ fontSize: "15px" }}
            onClick={startGame}
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {/* Bottom hint */}
      {gameState === "playing" && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-full px-5 py-2 shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)]">
            <span className="text-muted-foreground font-medium" style={{ fontSize: "13px" }}>
              Tap creatures before they disappear
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
