import { state } from "../state.js";
import { dist } from "../utils.js";

export function initDominoPuzzle(puzzle) {
  puzzle.tiles = [];
  puzzle.currentIndex = 0;
  puzzle.timer = 0;
  puzzle.maxTime = 300; // 5s
  puzzle.solved = false;
  puzzle.clueX = state.player.x + 300;
  puzzle.clueY = state.player.y - 300;
  puzzle.clueRevealed = false;
  const count = 6;

  for (let i = 0; i < count; i++) {
    puzzle.tiles.push({
      x: 600 + Math.random() * (state.world.width - 1200),
      y: 600 + Math.random() * (state.world.height - 1200),
      active: false,
    });
  }
}

export function updateDominoPuzzle(puzzle) {
  const player = state.player;

  const currentTile = puzzle.tiles[puzzle.currentIndex];
  if (!currentTile) return;
  // 🔥 guard index
  if (puzzle.currentIndex >= puzzle.tiles.length) {
    puzzle.solved = true;
    return;
  }
  if (
    !puzzle.clueRevealed &&
    dist(player.x, player.y, puzzle.clueX, puzzle.clueY) < 80
  ) {
    puzzle.clueRevealed = true;

    state.floatingTexts.push({
      x: puzzle.clueX,
      y: puzzle.clueY - 80,
      text: "⚡ DASH THEO CHUỖI TRƯỚC KHI HẾT GIỜ!",
      color: "#FFD700",
      size: 26,
      life: 200,
      opacity: 1,
    });
  }
  if (puzzle.timer > 0) {
    state.floatingTexts.push({
      x: currentTile.x,
      y: currentTile.y - 40,
      text: `${Math.ceil(puzzle.timer / 60)}s`,
      color: "#ffff00",
      size: 18,
      life: 5,
    });
  }
  if (puzzle.solved) return;

  if (puzzle.timer > 0) puzzle.timer--;

  if (dist(player.x, player.y, currentTile.x, currentTile.y) < 50) {
    // đúng tile
    currentTile.active = true;
    puzzle.currentIndex++;

    if (puzzle.currentIndex >= puzzle.tiles.length) {
      puzzle.solved = true;

      state.floatingTexts.push({
        x: player.x,
        y: player.y - 100,
        text: "⚡ DOMINO COMPLETED!",
        color: "#00ffcc",
        size: 28,
        life: 120,
      });

      return;
    }

    puzzle.timer = puzzle.maxTime;
  }

  // fail
  if (puzzle.timer === 0 && puzzle.currentIndex > 0) {
    resetDomino(puzzle);
    spawnPenalty();
  }
}

function resetDomino(puzzle) {
  puzzle.tiles.forEach((t) => (t.active = false));
  puzzle.currentIndex = 0;
}
function spawnPenalty() {
  for (let i = 0; i < 6; i++) {
    state.ghosts.push({
      x: state.player.x + Math.random() * 200 - 100,
      y: state.player.y + Math.random() * 200 - 100,

      radius: 12,
      hp: 20,
      maxHp: 20, // 🔥 thêm
      speed: 2,

      isHorde: true,
      isEnemy: true, // 🔥 QUAN TRỌNG
      alive: true, // 🔥 QUAN TRỌNG

      isStunned: 0,
      historyPath: [], // 🔥 để đồng bộ hệ thống
    });
  }
}

export function drawDominoPuzzle(puzzle, ctx) {
  puzzle.tiles.forEach((t, i) => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);

    if (i === puzzle.currentIndex) ctx.fillStyle = "#ffff00";
    else if (t.active) ctx.fillStyle = "#00ffcc";
    else ctx.fillStyle = "#555";
    const pulse = Math.sin(state.frameCount * 0.2) * 3;

    ctx.arc(
      t.x,
      t.y,
      20 + (i === puzzle.currentIndex ? pulse : 0),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  // --- CLUE (OBELISK) ---
  const ox = puzzle.clueX;
  const oy = puzzle.clueY;

  // nền đen
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(ox - 12, oy - 18, 24, 36);

  // thân
  ctx.fillStyle = puzzle.clueRevealed ? "#FFD700" : "#888";
  ctx.fillRect(ox - 8, oy - 14, 16, 28);

  // ký hiệu
  ctx.fillStyle = puzzle.clueRevealed ? "#000" : "#fff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(puzzle.clueRevealed ? "!" : "?", ox, oy + 5);
}

export function getDominoMinimapMarkers(puzzle) {
  return [
    ...puzzle.tiles.map((t, i) => ({
      type: "domino",
      x: t.x,
      y: t.y,
      isNext: i === puzzle.currentIndex,
    })),
    {
      type: "clue",
      x: puzzle.clueX,
      y: puzzle.clueY,
      revealed: puzzle.clueRevealed,
    },
  ];
}
