import { state } from "../state.js";
import { dist } from "../utils.js";
import { hexToRgba } from "../game/draw.js"; // Đổi đường dẫn file chứa ELEMENT_DEFS của bạn

// Danh sách các hệ "Hợp nhất" để làm đề bài cho Rune (độ khó cao)
const MERGED_ELEMENTS = [
  "steam", "plasma", "blaze", "magma", "frostbite", 
  "blizzard", "glacier", "storm", "magnet", "sandstorm"
];

// Hàm phụ trợ để tìm ngược "nguyên liệu" từ hệ hợp nhất
function getIngredients(targetElement) {
  const MERGE_RULES = {
    fire: { ice: "steam", lightning: "plasma", wind: "blaze", earth: "magma" },
    ice: { lightning: "frostbite", wind: "blizzard", earth: "glacier" },
    lightning: { wind: "storm", earth: "magnet" },
    wind: { earth: "sandstorm" },
  };

  for (const a in MERGE_RULES) {
    for (const b in MERGE_RULES[a]) {
      if (MERGE_RULES[a][b] === targetElement) return [a, b];
    }
  }
  return [targetElement]; // Fallback
}

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

  // Chọn ngẫu nhiên 4 hệ hợp nhất làm mục tiêu
  const chosenElements = [...MERGED_ELEMENTS].sort(() => 0.5 - Math.random()).slice(0, 4);

  puzzle.runes = runePositions.map((pos, idx) => ({
    ...pos,
    element: chosenElements[idx],
    activated: false,
    spawnCooldown: 0, // Thời gian chờ spawn lứa quái tiếp theo
  }));

  // Tạo câu gợi ý công thức cho Obelisk
  puzzle.recipeHints = puzzle.runes.map(r => {
    const ings = getIngredients(r.element);
    return `${ings.join(' + ').toUpperCase()} = ${r.element.toUpperCase()}`;
  });

  // Obelisk Position
  let clueX, clueY;
  do {
    clueX = 800 + Math.random() * (state.world.width - 1600);
    clueY = 800 + Math.random() * (state.world.height - 1600);
  } while (dist(clueX, clueY, state.player.x, state.player.y) < 800);

  puzzle.solved = false;
  puzzle.clueX = clueX;
  puzzle.clueY = clueY;
  puzzle.clueRevealed = false;
}

export function updateRunePuzzle(puzzle) {
  if (!puzzle || puzzle.solved || state.isBossLevel) return;

  const player = state.player;
  if (!player || player.hp <= 0) return;

  // --- 1. OBELISK (BIA ĐÁ HIỂN THỊ CÔNG THỨC) ---
  if (!puzzle.clueRevealed && dist(player.x, player.y, puzzle.clueX, puzzle.clueY) < 80) {
    puzzle.clueRevealed = true;
    state.screenShake = { timer: 15, intensity: 5 };

    // Bắn floating text nhiều dòng cho từng công thức
    puzzle.recipeHints.forEach((hint, idx) => {
      state.floatingTexts.push({
        x: puzzle.clueX,
        y: puzzle.clueY - 100 - (idx * 30),
        text: hint,
        color: "#00ffff",
        size: 20,
        life: 400,
        opacity: 1,
      });
    });
  }

  let activatedCount = 0;

  // --- 2. XỬ LÝ RUNES ---
  for (const rune of puzzle.runes) {
    if (rune.activated) {
      activatedCount++;
      continue;
    }

    // A. Kiểm tra xem có Zone hệ nào chạm vào Rune không
    let isHitByZone = false;
    if (state.elementalZones) {
      for (const z of state.elementalZones) {
        if (z.element === rune.element && dist(rune.x, rune.y, z.x, z.y) < z.radius + 40) {
          rune.activated = true;
          isHitByZone = true;
          
          z.life = 0; // Hấp thụ zone luôn cho ngầu

          state.floatingTexts.push({
            x: rune.x, y: rune.y - 80,
            text: `✔ RUNE ${rune.element.toUpperCase()} ĐÃ HẤP THỤ!`,
            color: "#00ffcc",
            size: 28, life: 120, opacity: 1
          });
          state.screenShake = { timer: 10, intensity: 6 };
          break;
        }
      }
    }

    if (isHitByZone) continue; // Đã kích hoạt thì bỏ qua bước sinh quái

    // B. Spawn quái nguyên liệu khi người chơi lại gần
    if (rune.spawnCooldown > 0) rune.spawnCooldown--;

    if (dist(player.x, player.y, rune.x, rune.y) < 200 && rune.spawnCooldown <= 0) {
      rune.spawnCooldown = 60 * 12; // Cooldown 12 giây mỗi lứa
      const ingredients = getIngredients(rune.element);

      state.floatingTexts.push({
        x: rune.x, y: rune.y - 60,
        text: `⚠ CẦN ZONE: ${rune.element.toUpperCase()}`,
        color: "#ffaa00",
        size: 18, life: 120, opacity: 1
      });

      // Spawn quái mang hệ tương ứng
      ingredients.forEach(ing => {
        // Spawn 3 con mỗi hệ nguyên liệu
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const d2 = 120 + Math.random() * 80;

          state.ghosts.push({
            id: `rune_guard_${ing}_${Date.now()}_${i}`,
            x: rune.x + Math.cos(a) * d2,
            y: rune.y + Math.sin(a) * d2,
            radius: 14,
            hp: 20 + state.currentLevel * 8,
            maxHp: 20 + state.currentLevel * 8,
            speed: 1.5 + Math.random() * 0.5,
            element: ing,        // ĐÁNH DẤU HỆ CHO QUÁI
            isStunned: 0,
            historyPath: [],
          });
        }
      });
    }
  }

  // --- 3. KIỂM TRA CHIẾN THẮNG ---
  if (activatedCount === puzzle.runes.length && !puzzle.solved) {
    puzzle.solved = true;
    state.floatingTexts.push({
      x: player.x, y: player.y - 140,
      text: "🧩 ĐÃ MỞ KHÓA TẤT CẢ RUNE NGUYÊN TỐ!",
      color: "#ff00ff",
      size: 36, life: 250, opacity: 1
    });
  }
}

// Cần import ELEMENT_DEFS vào file này để lấy màu, 
// hoặc bạn copy tạm object ELEMENT_DEFS chứa màu sắc qua đây để dùng cho draw.
// Giả sử bạn đã import hoặc khai báo nó.
const RUNE_COLORS = {
  steam: "#dfe9ff", plasma: "#ff77ff", blaze: "#ff8a1f", magma: "#ff4d00",
  frostbite: "#bfefff", blizzard: "#e8ffff", glacier: "#74e5ff", 
  storm: "#f0f6ff", magnet: "#ffd966", sandstorm: "#e0c07a"
};

export function drawRunePuzzle(puzzle, ctx) {
  puzzle.runes.forEach((r) => {
    const color = RUNE_COLORS[r.element] || "#ffffff";

    // Nền shadow
    ctx.beginPath();
    ctx.arc(r.x, r.y, 35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fill();

    if (r.activated) {
      // Đã kích hoạt -> Đổ màu đặc, glow sáng
      ctx.beginPath();
      ctx.arc(r.x, r.y, 30, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.7);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      // Chưa kích hoạt -> Viền rỗng đập nhịp nhàng
      const pulse = Math.abs(Math.sin(state.frameCount * 0.05));
      ctx.beginPath();
      ctx.arc(r.x, r.y, 30, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(color, 0.3 + pulse * 0.6);
      ctx.lineWidth = 2 + pulse * 3;
      ctx.stroke();
    }

    // Tên Element
    ctx.fillStyle = r.activated ? "#000" : color;
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(r.element.toUpperCase(), r.x, r.y + 4);
  });

  // --- OBELISK ---
  const ox = puzzle.clueX;
  const oy = puzzle.clueY;

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(ox - 12, oy - 18, 24, 36);

  ctx.fillStyle = puzzle.clueRevealed ? "#00ffff" : "#888";
  ctx.fillRect(ox - 8, oy - 14, 16, 28);

  ctx.fillStyle = puzzle.clueRevealed ? "#000" : "#fff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(puzzle.clueRevealed ? "i" : "?", ox, oy + 5);
}

export function getRuneMinimapMarkers(puzzle) {
  const markers = [];
  puzzle.runes.forEach((r) => {
    markers.push({ x: r.x, y: r.y, type: "rune" });
  });
  markers.push({ x: puzzle.clueX, y: puzzle.clueY, type: "clue" });
  return markers;
}