import { state } from "../state.js";
import { dist } from "../utils.js";

export function initRunePuzzle(puzzle) {
  const numRunes = 4;
  const runePositions = [];

  for (let i = 0; i < numRunes; i++) {
    let rx, ry;
    do {
      rx = 600 + Math.random() * (state.world.width - 1200);
      ry = 600 + Math.random() * (state.world.height - 1200);
    } while (runePositions.some((p) => dist(rx, ry, p.x, p.y) < 500));

    runePositions.push({ x: rx, y: ry });
  }

  const runeSymbols = ["A", "B", "C", "D"];
  const stepOrder = [1, 2, 3, 4].sort(() => Math.random() - 0.5);

  const symbolByStep = {};
  stepOrder.forEach((step, idx) => {
    symbolByStep[step] = runeSymbols[idx];
  });

  const orderDisplay = [1, 2, 3, 4].map((s) => symbolByStep[s]).join(" → ");

  // clue
  let clueX, clueY;
  do {
    clueX = 800 + Math.random() * (state.world.width - 1600);
    clueY = 800 + Math.random() * (state.world.height - 1600);
  } while (dist(clueX, clueY, state.player.x, state.player.y) < 800);

  puzzle.runes = runePositions.map((pos, idx) => ({
    ...pos,
    symbol: runeSymbols[idx],
    step: stepOrder[idx],
    activated: false,
    runeState: "idle",
  }));

  puzzle.currentStep = 1;
  puzzle.solved = false;

  puzzle.clueX = clueX;
  puzzle.clueY = clueY;
  puzzle.clueRevealed = false;
  puzzle.orderDisplay = orderDisplay;
}

export function updateRunePuzzle(puzzle) {
  if (!puzzle || puzzle.solved || state.isBossLevel) return;

  const player = state.player;
  if (!player || player.hp <= 0) return;

  // --- OBELISK ---
  if (
    !puzzle.clueRevealed &&
    dist(player.x, player.y, puzzle.clueX, puzzle.clueY) < 80
  ) {
    puzzle.clueRevealed = true;

    state.floatingTexts.push({
      x: puzzle.clueX,
      y: puzzle.clueY - 100,
      text: `THỨ TỰ: ${puzzle.orderDisplay}`,
      color: "#FFD700",
      size: 30,
      life: 300,
      opacity: 1,
    });

    state.screenShake = { timer: 15, intensity: 5 };
  }

  // --- PENDING → CHECK GUARDS ---
  for (const rune of puzzle.runes) {
    if (rune.runeState !== "pending") continue;

    const guardsAlive = state.ghosts.some(
      (g) => g.puzzleGuardTag === rune.symbol,
    );

    if (!guardsAlive) {
      rune.runeState = "activated";
      rune.activated = true;
      puzzle.currentStep++;

      state.floatingTexts.push({
        x: rune.x,
        y: rune.y - 80,
        text: `✔ RUNE ${rune.symbol} KẾT NẠP!`,
        color: "#00ffcc",
        size: 28,
        life: 120,
        opacity: 1,
      });

      if (puzzle.currentStep > puzzle.runes.length) {
        puzzle.solved = true;

        state.stagePortal = {
          x: player.x,
          y: player.y,
          radius: 60,
          active: true,
        };

        state.floatingTexts.push({
          x: player.x,
          y: player.y - 140,
          text: "🧩 GIẢI ĐỐ HOÀN THÀNH!",
          color: "#ff00ff",
          size: 36,
          life: 250,
          opacity: 1,
        });
      }
    }
  }

  // --- PLAYER TOUCH RUNE ---
  for (const rune of puzzle.runes) {
    if (rune.runeState !== "idle") continue;

    if (dist(player.x, player.y, rune.x, rune.y) >= 55) continue;

    if (rune.step === puzzle.currentStep) {
      // ✅ đúng
      rune.runeState = "pending";

      state.floatingTexts.push({
        x: rune.x,
        y: rune.y - 80,
        text: `⚔ TIÊU DIỆT CANH GIỮ RUNE ${rune.symbol}!`,
        color: "#ffaa00",
        size: 24,
        life: 150,
        opacity: 1,
      });

      state.screenShake = { timer: 20, intensity: 8 };

      const waveSize = 5 + Math.floor(state.currentLevel * 1.5);

      for (let i = 0; i < waveSize; i++) {
        const a = (i / waveSize) * Math.PI * 2;
        const dist2 = 120 + Math.random() * 150;

        state.ghosts.push({
          id: `puzzle_guard_${rune.symbol}_${Date.now()}_${i}`,
          puzzleGuardTag: rune.symbol,
          isHorde: true,
          x: rune.x + Math.cos(a) * dist2,
          y: rune.y + Math.sin(a) * dist2,
          radius: 13,
          hp: 25 + state.currentLevel * 6,
          maxHp: 25 + state.currentLevel * 6,
          speed: 1.8 + Math.random() * 0.5,
          isStunned: 0,
          historyPath: [],
          color: "#ff6600",
        });
      }
    } else {
      // ❌ sai → reset
      state.ghosts = state.ghosts.filter((g) => !g.puzzleGuardTag);

      puzzle.runes.forEach((r) => {
        r.activated = false;
        r.runeState = "idle";
      });

      puzzle.currentStep = 1;

      state.floatingTexts.push({
        x: rune.x,
        y: rune.y - 90,
        text: `✘ SAI! CẦN: ${puzzle.orderDisplay}`,
        color: "#ff4444",
        size: 26,
        life: 150,
        opacity: 1,
      });

      state.screenShake = { timer: 35, intensity: 14 };

      const penaltyCount = 8 + state.currentLevel * 2;

      for (let i = 0; i < penaltyCount; i++) {
        const a = Math.random() * Math.PI * 2;

        state.ghosts.push({
          id: `puzzle_penalty_${Date.now()}_${i}`,
          isHorde: true,
          x: player.x + Math.cos(a) * (100 + Math.random() * 200),
          y: player.y + Math.sin(a) * (100 + Math.random() * 200),
          radius: 12,
          hp: 30 + state.currentLevel * 6,
          maxHp: 30 + state.currentLevel * 6,
          speed: 2.2,
          isStunned: 0,
          historyPath: [],
        });
      }
    }

    break;
  }
}

export function drawRunePuzzle(puzzle, ctx) {
  puzzle.runes.forEach((r) => {
    if (r.activated) return;

    const isPending = r.runeState === "pending";
    const isNext = r.step === puzzle.currentStep;

    const fillColor = isPending ? "#ff9900" : isNext ? "#ffff00" : "#cc44ff";

    // viền ngoài (shadow nền)
    ctx.beginPath();
    ctx.arc(r.x, r.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();

    // vòng chính
    ctx.beginPath();
    ctx.arc(r.x, r.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // symbol
    ctx.fillStyle = "#000";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(r.symbol, r.x, r.y + 5);
  });

  // --- OBELISK ---
  const ox = puzzle.clueX;
  const oy = puzzle.clueY;

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(ox - 12, oy - 18, 24, 36);

  ctx.fillStyle = puzzle.clueRevealed ? "#FFD700" : "#888";
  ctx.fillRect(ox - 8, oy - 14, 16, 28);

  ctx.fillStyle = puzzle.clueRevealed ? "#000" : "#fff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(puzzle.clueRevealed ? "!" : "?", ox, oy + 5);
}

export function getRuneMinimapMarkers(puzzle) {
  const markers = [];

  // rune
  puzzle.runes.forEach((r) => {
    markers.push({
      x: r.x,
      y: r.y,
      type: "rune",
    });
  });

  // obelisk
  markers.push({
    x: puzzle.clueX,
    y: puzzle.clueY,
    type: "clue",
  });

  return markers;
}
