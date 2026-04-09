import { state } from "../state.js";
import { dist } from "../utils.js";

const COLORS = ["red", "blue", "yellow"];

const COLOR_MAP = {
  red: "#ff4444",
  blue: "#4488ff",
  yellow: "#ffee33",
  purple: "#aa44ff",
  orange: "#ff8800",
};

const MIX = {
  "blue+red": "purple",
  "red+yellow": "orange",
};

export function initTorchPuzzle(puzzle) {
  puzzle.torches = [];
  puzzle.sources = [];
  puzzle.playerColor = null;
  puzzle.solved = false;

  puzzle.clueX = state.player.x + 200;
  puzzle.clueY = state.player.y + 200;
  puzzle.clueRevealed = false;

  puzzle.mixCooldown = 0;

  COLORS.forEach((c) => {
    puzzle.sources.push({
      x: Math.random() * state.world.width,
      y: Math.random() * state.world.height,
      color: c,
    });
  });

  const targets = ["red", "blue", "yellow", "purple", "orange"];

  targets.forEach((c) => {
    puzzle.torches.push({
      x: Math.random() * state.world.width,
      y: Math.random() * state.world.height,
      target: c,
      lit: false,
    });
  });
}

export function updateTorchPuzzle(puzzle) {
  const p = state.player;
  if (!p || puzzle.solved) return;

  // ===== CLUE =====
  if (
    !puzzle.clueRevealed &&
    dist(p.x, p.y, puzzle.clueX, puzzle.clueY) < 80
  ) {
    puzzle.clueRevealed = true;

    state.floatingTexts.push({
      x: puzzle.clueX,
      y: puzzle.clueY - 80,
      text: "🔥 LẤY LỬA → PHA MÀU → ĐỐT ĐUỐC",
      color: "#ff8800",
      size: 26,
      life: 200,
    });
  }

  if (puzzle.mixCooldown > 0) puzzle.mixCooldown--;

  // ===== PICK / MIX =====
  puzzle.sources.forEach((s) => {
    if (dist(p.x, p.y, s.x, s.y) < 50) {
      if (puzzle.mixCooldown > 0) return;

      if (!puzzle.playerColor) {
        puzzle.playerColor = s.color;
      } else {
        const key = [puzzle.playerColor, s.color].sort().join("+");
        puzzle.playerColor = MIX[key] || s.color;
      }

      puzzle.mixCooldown = 20;

      state.floatingTexts.push({
        x: p.x,
        y: p.y - 50,
        text: `→ ${puzzle.playerColor.toUpperCase()}`,
        color: COLOR_MAP[puzzle.playerColor],
        size: 20,
        life: 40,
      });
    }
  });

  // ===== TORCH =====
  puzzle.torches.forEach((t) => {
    if (t.lit) return;

    if (dist(p.x, p.y, t.x, t.y) < 50) {
      if (puzzle.playerColor === t.target) {
        t.lit = true;

        state.floatingTexts.push({
          x: t.x,
          y: t.y - 40,
          text: "🔥",
          color: COLOR_MAP[t.target],
          life: 40,
        });
      } else {
        resetTorch(puzzle);
        spawnPenalty();
      }
    }
  });

  if (puzzle.torches.every((t) => t.lit)) {
    puzzle.solved = true;

    state.floatingTexts.push({
      x: p.x,
      y: p.y - 100,
      text: "🔥 TORCH COMPLETED!",
      color: "#00ffcc",
      size: 28,
      life: 120,
    });
  }

  // ===== AURA =====
  if (puzzle.playerColor) {
    const color = COLOR_MAP[puzzle.playerColor];

    if (state.frameCount % 2 === 0) {
      state.particles.push({
        x: p.x + (Math.random() - 0.5) * 20,
        y: p.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.5,
        life: 30,
        size: 3 + Math.random() * 3,
        color: color,
      });
    }
  }
}

function resetTorch(puzzle) {
  puzzle.torches.forEach((t) => (t.lit = false));
}

function spawnPenalty() {
  for (let i = 0; i < 6; i++) {
    state.ghosts.push({
      x: state.player.x + Math.random() * 200 - 100,
      y: state.player.y + Math.random() * 200 - 100,
      radius: 12,
      hp: 20,
      maxHp: 20,
      speed: 2,
      isHorde: true,
      isEnemy: true,
      alive: true,
      isStunned: 0,
      historyPath: [],
    });
  }
}

export function drawTorchPuzzle(puzzle, ctx) {
  const p = state.player;

  // ===== SOURCE =====
  puzzle.sources.forEach((s) => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);

    ctx.fillStyle = COLOR_MAP[s.color];
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ===== PLAYER AURA =====
  if (puzzle.playerColor && p) {
    const color = COLOR_MAP[puzzle.playerColor];
    const pulse = Math.sin(state.frameCount * 0.2) * 5;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 50 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ===== TORCH =====
  puzzle.torches.forEach((t) => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);

    if (t.lit) {
      ctx.fillStyle = COLOR_MAP[t.target];
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle;
    } else {
      ctx.fillStyle = "#222";

      ctx.strokeStyle = COLOR_MAP[t.target];
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ===== CLUE =====
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(puzzle.clueX - 12, puzzle.clueY - 18, 24, 36);

  ctx.fillStyle = puzzle.clueRevealed ? "#FFD700" : "#888";
  ctx.fillRect(puzzle.clueX - 8, puzzle.clueY - 14, 16, 28);

  ctx.fillStyle = puzzle.clueRevealed ? "#000" : "#fff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    puzzle.clueRevealed ? "!" : "?",
    puzzle.clueX,
    puzzle.clueY + 5
  );
}

export function getTorchMinimapMarkers(puzzle) {
  return [
    ...puzzle.torches.map((t) => ({
      type: "torch",
      x: t.x,
      y: t.y,
    })),
    ...puzzle.sources.map((s) => ({
      type: "source",
      x: s.x,
      y: s.y,
      color: s.color,
    })),
    {
      type: "clue",
      x: puzzle.clueX,
      y: puzzle.clueY,
      revealed: puzzle.clueRevealed,
    },
  ];
}