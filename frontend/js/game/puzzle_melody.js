import { state } from "../state.js";
import { dist } from "../utils.js";

// ===== AUDIO =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(id) {
  const freqs = [261, 329, 392, 523, 659];

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.value = freqs[id % freqs.length];
  osc.type = "sine";

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// ===== INIT =====
export function initMelodyPuzzle(puzzle) {
  puzzle.bells = [];
  puzzle.sequence = [];
  puzzle.input = [];
  puzzle.solved = false;

  puzzle.inArena = false;

  const margin = 300; // 🔥 khoảng cách tránh mép map

  puzzle.clueX = margin + Math.random() * (state.world.width - margin * 2);

  puzzle.clueY = margin + Math.random() * (state.world.height - margin * 2);
  puzzle.clueRevealed = false;

  puzzle.showing = false;
  puzzle.showIndex = 0;
  puzzle.showTimer = 50;

  puzzle.inputCooldown = 0;

  // ===== ARENA CENTER =====

  // random vị trí trong vùng an toàn
  let cx = margin + Math.random() * (state.world.width - margin * 2);

  let cy = margin + Math.random() * (state.world.height - margin * 2);

  // (optional) tránh quá gần player
  const minDist = 400;

  if (dist(cx, cy, state.player.x, state.player.y) < minDist) {
    const angle = Math.random() * Math.PI * 2;
    cx = state.player.x + Math.cos(angle) * minDist;
    cy = state.player.y + Math.sin(angle) * minDist;
  }

  // clamp lại lần cuối (đề phòng lệch)
  cx = Math.max(margin, Math.min(state.world.width - margin, cx));
  cy = Math.max(margin, Math.min(state.world.height - margin, cy));

  puzzle.arenaCenter = { x: cx, y: cy };

  // ===== REPLAY BUTTON =====
  puzzle.replay = {
    x: cx,
    y: cy + 160,
    radius: 25,
  };

  const count = 5;
  const radius = 120;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;

    puzzle.bells.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      id: i,
      highlight: false,
      pulse: 0,
    });
  }

  for (let i = 0; i < 4; i++) {
    puzzle.sequence.push(Math.floor(Math.random() * count));
  }
}

// ===== START PLAYBACK =====
function startPlayback(puzzle) {
  puzzle.showing = true;
  puzzle.showIndex = 0;
  puzzle.showTimer = 50;
  puzzle.input = [];
}

// ===== UPDATE =====
export function updateMelodyPuzzle(puzzle) {
  const p = state.player;
  if (!p) return;

  // ===== ENTER ARENA =====
  if (!puzzle.inArena && dist(p.x, p.y, puzzle.clueX, puzzle.clueY) < 80) {
    puzzle.inArena = true;

    p.x = puzzle.arenaCenter.x;
    p.y = puzzle.arenaCenter.y;

    startPlayback(puzzle);

    state.floatingTexts.push({
      x: p.x,
      y: p.y - 100,
      text: "🎵 LISTEN...",
      color: "#00ccff",
      size: 26,
      life: 100,
    });
  }

  if (!puzzle.inArena) return;

  // ===== REPLAY BUTTON =====
  if (
    !puzzle.showing &&
    dist(p.x, p.y, puzzle.replay.x, puzzle.replay.y) < 40
  ) {
    startPlayback(puzzle);

    state.floatingTexts.push({
      x: puzzle.replay.x,
      y: puzzle.replay.y - 40,
      text: "🔁 REPLAY",
      color: "#00ccff",
      life: 40,
    });
  }

  // ===== PLAYBACK =====
  if (puzzle.showing) {
    const bell = puzzle.bells[puzzle.sequence[puzzle.showIndex]];

    bell.highlight = true;
    playTone(bell.id);

    if (--puzzle.showTimer <= 0) {
      bell.highlight = false;
      puzzle.showIndex++;
      puzzle.showTimer = 50;

      if (puzzle.showIndex >= puzzle.sequence.length) {
        puzzle.showing = false;

        state.floatingTexts.push({
          x: p.x,
          y: p.y - 100,
          text: "👉 REPEAT!",
          color: "#00ffcc",
          size: 24,
          life: 100,
        });
      }
    }
    return;
  }

  if (puzzle.solved) return;

  if (puzzle.inputCooldown > 0) puzzle.inputCooldown--;

  // ===== INPUT =====
  puzzle.bells.forEach((b) => {
    if (dist(p.x, p.y, b.x, b.y) < 40) {
      if (puzzle.inputCooldown > 0) return;

      puzzle.input.push(b.id);
      puzzle.inputCooldown = 20;

      b.highlight = true;
      b.pulse = 10;

      playTone(b.id);

      checkSequence(puzzle);
    }
  });

  puzzle.bells.forEach((b) => {
    if (b.pulse > 0) b.pulse--;
    else b.highlight = false;
  });
}

// ===== CHECK =====
function checkSequence(puzzle) {
  const len = puzzle.input.length;

  for (let i = 0; i < len; i++) {
    if (puzzle.input[i] !== puzzle.sequence[i]) {
      puzzle.input = [];

      state.floatingTexts.push({
        x: state.player.x,
        y: state.player.y - 80,
        text: "❌ SAI!",
        color: "#ff4444",
        size: 24,
        life: 80,
      });

      spawnPenalty();
      return;
    }
  }

  if (len === puzzle.sequence.length) {
    puzzle.solved = true;

    state.floatingTexts.push({
      x: state.player.x,
      y: state.player.y - 100,
      text: "🎵 COMPLETE!",
      color: "#00ffcc",
      size: 28,
      life: 120,
    });
  }
}

// ===== PENALTY =====
function spawnPenalty() {
  for (let i = 0; i < 6; i++) {
    state.ghosts.push({
      x: state.player.x + Math.random() * 200 - 100,
      y: state.player.y + Math.random() * 200 - 100,
      radius: 12,
      hp: 20,
      maxHp: 20,
      speed: 2,
      isEnemy: true,
      alive: true,

      // 👇 THÊM MẤY CÁI NÀY
      type: "ghost",
      takeDamage: true,
    });
  }
}

// ===== DRAW =====
export function drawMelodyPuzzle(puzzle, ctx) {
  // ===== ARENA =====
  if (puzzle.inArena) {
    const c = puzzle.arenaCenter;

    ctx.beginPath();
    ctx.arc(c.x, c.y, 160, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,200,255,0.3)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // ===== BELLS =====
  puzzle.bells.forEach((b) => {
    const size = 20 + b.pulse;

    ctx.beginPath();
    ctx.arc(b.x, b.y, size, 0, Math.PI * 2);

    ctx.fillStyle = b.highlight ? "#00ccff" : "#555";
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });

  // ===== REPLAY BUTTON =====
  if (puzzle.inArena) {
    ctx.beginPath();
    ctx.arc(puzzle.replay.x, puzzle.replay.y, 25, 0, Math.PI * 2);

    ctx.fillStyle = "#222";
    ctx.fill();

    ctx.strokeStyle = "#00ccff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("↻", puzzle.replay.x, puzzle.replay.y + 5);
  }

  // ===== CLUE =====
  if (!puzzle.inArena) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(puzzle.clueX - 12, puzzle.clueY - 18, 24, 36);

    ctx.fillStyle = puzzle.clueRevealed ? "#FFD700" : "#888";
    ctx.fillRect(puzzle.clueX - 8, puzzle.clueY - 14, 16, 28);

    ctx.fillStyle = puzzle.clueRevealed ? "#000" : "#fff";
    ctx.fillText(
      puzzle.clueRevealed ? "!" : "?",
      puzzle.clueX,
      puzzle.clueY + 5,
    );
  }
}

// ===== MINIMAP =====
export function getMelodyMinimapMarkers(puzzle) {
  return [
    {
      type: "clue",
      x: puzzle.clueX,
      y: puzzle.clueY,
      revealed: puzzle.clueRevealed,
    },
  ];
}
