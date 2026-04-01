import { state } from "../state.js";
import { CHARACTERS, GHOST_DATA_KEY, SCROLLS, BOSS_FRAGMENTS } from "../config.js";
import { saveGame } from "../utils.js";
import { persistState } from "../auth.js";

// ========================================
// SHOP RENDERING
// ========================================
export function openShop(changeStateFn) {
  changeStateFn("MENU");
  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-shop").classList.remove("hidden");
  renderShop();
}

export function renderShop() {
  const res = state.resources || { common: 0, rare: 0, legendary: 0 };

  document.getElementById("shop-coins").innerHTML = `
    <span style="color:#ffd700">💰 ${state.player?.coins || 0} Bạc</span>
    <span style="margin-left:15px;color:#4ade80">🟢 ${res.common} NL Common</span>
    <span style="margin-left:15px;color:#60a5fa">🔵 ${res.rare} NL Rare</span>
  `;

  let container = document.getElementById("shop-cards");
  container.innerHTML = "";

  SCROLLS.forEach((scroll) => {
    let card = document.createElement("div");
    card.className = `card scroll-card scroll-${scroll.rarity}`;
    card.style.width = "200px";

    const rarityEmoji =
      scroll.rarity === "common"
        ? "🟢"
        : scroll.rarity === "rare"
          ? "🔵"
          : "🟣";

    const isTrade = scroll.tradeFrom !== undefined;
    let canAfford = false;
    let costLabel = "";

    if (isTrade) {
      const matCount = res[scroll.tradeFrom] || 0;
      canAfford = matCount >= scroll.tradeCost;
      costLabel = `${scroll.tradeCost} NL ${scroll.tradeFrom}`;
    } else {
      canAfford = (state.player?.coins || 0) >= scroll.price;
      costLabel = `${scroll.price} Bạc`;
    }

    let probText = "";
    if (scroll.probabilities) {
      const entries = Object.entries(scroll.probabilities);
      probText = entries
        .map(([r, p]) => {
          const color =
            r === "common"
              ? "#4ade80"
              : r === "rare"
                ? "#60a5fa"
                : "#c084fc";
          return `<span style="color:${color}">${r}: ${Math.round(p * 100)}%</span>`;
        })
        .join(" | ");
    }

    card.innerHTML = `
      <div class="scroll-icon">${rarityEmoji}</div>
      <h3>${scroll.name}</h3>
      <p style="margin-bottom:5px;color:#ffd700;">Giá: ${costLabel}</p>
      <div style="font-size:12px;margin-bottom:8px;">${probText}</div>
      <p style="font-size:12px;color:#aaa;margin-bottom:10px;">${scroll.desc}</p>
    `;

    let btn = document.createElement("button");
    btn.innerText = isTrade ? "Đổi" : "Mua";
    btn.disabled = !canAfford;
    btn.onclick = () => {
      if (isTrade) {
        if ((res[scroll.tradeFrom] || 0) >= scroll.tradeCost) {
          state.resources[scroll.tradeFrom] -= scroll.tradeCost;
          saveGame(state, GHOST_DATA_KEY);
          persistState();
          renderShop();
          startWheel(scroll.rarity, scroll.probabilities);
        }
      } else {
        if (state.player.coins >= scroll.price) {
          state.player.coins -= scroll.price;
          saveGame(state, GHOST_DATA_KEY);
          persistState();
          renderShop();
          startWheel(scroll.rarity, scroll.probabilities);
        }
      }
    };

    card.appendChild(btn);
    container.appendChild(card);
  });

  renderFragmentSection(container);
}

// ========================================
// BOSS FRAGMENT EXCHANGE
// ========================================

function renderFragmentSection(container) {
  const fragments = state.bossFragments || [];
  const hasAll = BOSS_FRAGMENTS.every(f => fragments.includes(f.id));

  const section = document.createElement("div");
  section.className = "fragment-section";
  section.innerHTML = `
    <h3 style="color:#ffd700; margin-bottom:10px;">⭐ Mảnh Nguyên Liệu Boss</h3>
    <p style="font-size:12px; color:#aaa; margin-bottom:10px;">Thu thập 5 mảnh khác nhau từ boss (10% mỗi lần hạ boss) → đổi 1 nhân vật Legendary!</p>
    <div class="fragment-grid">
      ${BOSS_FRAGMENTS.map(f => {
        const owned = fragments.includes(f.id);
        return `
          <div class="fragment-item ${owned ? 'fragment-owned' : 'fragment-locked'}">
            <span class="fragment-icon">${f.icon}</span>
            <span class="fragment-name">${f.name}</span>
            ${owned ? '<span class="fragment-check">✅</span>' : '<span class="fragment-check">❌</span>'}
          </div>
        `;
      }).join('')}
    </div>
  `;

  const uniqueCount = new Set(fragments).size;
  const btn = document.createElement("button");
  btn.innerText = hasAll ? "🌟 ĐỔI NHÂN VẬT LEGENDARY" : `Thiếu ${BOSS_FRAGMENTS.length - uniqueCount} mảnh`;
  btn.disabled = !hasAll;
  btn.style.marginTop = "10px";
  if (hasAll) {
    btn.style.background = "linear-gradient(135deg, #ffd700, #ff8c00)";
    btn.style.color = "#000";
  }
  btn.onclick = () => {
    if (!hasAll) return;
    exchangeFragmentsForLegendary();
  };

  section.appendChild(btn);
  container.appendChild(section);
}

function exchangeFragmentsForLegendary() {
  state.bossFragments = [];

  const legendaries = CHARACTERS.filter(c => c.rarity === "legendary");
  const unowned = legendaries.filter(c => !state.ownedCharacters.includes(c.id));
  const pool = unowned.length > 0 ? unowned : legendaries;
  const reward = pool[Math.floor(Math.random() * pool.length)];

  const alreadyOwned = state.ownedCharacters.includes(reward.id);
  if (!alreadyOwned) {
    state.ownedCharacters.push(reward.id);
  } else {
    state.resources.legendary = (state.resources.legendary || 0) + 1;
  }

  saveGame(state, GHOST_DATA_KEY);
  persistState();

  // Show result using the wheel overlay (no wheel, just result)
  const overlay = document.getElementById("spinner-overlay");
  const titleDiv = document.getElementById("spinner-title");
  const resultDiv = document.getElementById("spinner-result");
  const closeBtn = document.getElementById("spinner-close");
  const wheelCanvas = document.getElementById("wheel-canvas");

  overlay.classList.remove("hidden");
  wheelCanvas.style.display = "none";
  document.getElementById("wheel-pointer").style.display = "none";

  if (alreadyOwned) {
    titleDiv.innerText = "💰 Trùng lặp!";
    resultDiv.innerHTML = `
      <div style="font-size:20px;color:#c084fc">${reward.name}</div>
      <div style="font-size:16px;color:#ffd700;margin-top:8px;">+1 NL Legendary</div>
    `;
  } else {
    titleDiv.innerText = "🎉 NHÂN VẬT HUYỀN THOẠI!";
    resultDiv.innerHTML = `
      <div style="font-size:28px;color:#c084fc;font-weight:bold;">${reward.name}</div>
      <div style="font-size:14px;color:#c084fc;margin-top:5px;">⭐ LEGENDARY</div>
    `;
  }
  resultDiv.className = "spinner-result gacha-legendary";

  closeBtn.style.display = "block";
  closeBtn.onclick = () => {
    overlay.classList.add("hidden");
    wheelCanvas.style.display = "";
    document.getElementById("wheel-pointer").style.display = "";
    renderShop();
  };
}

// ========================================
// 🎡 SPINNING WHEEL (Wheel of Fortune)
// ========================================

const WHEEL_COLORS = {
  common: [
    "#16a34a", "#15803d", "#22c55e", "#059669",
    "#10b981", "#047857", "#34d399", "#0d9488",
  ],
  rare: [
    "#2563eb", "#1d4ed8", "#3b82f6", "#1e40af",
    "#60a5fa", "#1e3a8a", "#93c5fd", "#0369a1",
  ],
  legendary: [
    "#9333ea", "#7c3aed", "#a855f7", "#6d28d9",
    "#c084fc", "#581c87", "#d8b4fe", "#7e22ce",
  ],
};

function getRarityColor(rarity) {
  switch (rarity) {
    case "common": return "#4ade80";
    case "rare": return "#60a5fa";
    case "legendary": return "#c084fc";
    default: return "#ffffff";
  }
}

function buildWheelSegments(probabilities) {
  // Build a pool of 12 segments for the wheel
  const segments = [];
  const totalSegments = 12;
  const entries = Object.entries(probabilities);

  for (let i = 0; i < totalSegments; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let chosenRarity = "common";
    for (const [r, p] of entries) {
      cumulative += p;
      if (rand < cumulative) {
        chosenRarity = r;
        break;
      }
    }

    const candidates = CHARACTERS.filter(c => c.rarity === chosenRarity);
    if (candidates.length > 0) {
      segments.push(candidates[Math.floor(Math.random() * candidates.length)]);
    } else {
      const fallback = CHARACTERS.filter(c => c.rarity === "common");
      segments.push(fallback[Math.floor(Math.random() * fallback.length)]);
    }
  }

  return segments;
}

function startWheel(scrollRarity, probabilities) {
  // 1. Determine winner
  const rand = Math.random();
  let cumulative = 0;
  let winRarity = "common";
  const entries = Object.entries(probabilities);
  for (const [r, p] of entries) {
    cumulative += p;
    if (rand < cumulative) {
      winRarity = r;
      break;
    }
  }

  const winPool = CHARACTERS.filter(c => c.rarity === winRarity);
  const winnerChar = winPool[Math.floor(Math.random() * winPool.length)];

  // 2. Build wheel segments
  const segments = buildWheelSegments(probabilities);
  // Place winner at a random segment
  const winIndex = Math.floor(Math.random() * segments.length);
  segments[winIndex] = winnerChar;

  // 3. Show overlay
  const overlay = document.getElementById("spinner-overlay");
  const titleDiv = document.getElementById("spinner-title");
  const resultDiv = document.getElementById("spinner-result");
  const closeBtn = document.getElementById("spinner-close");
  const canvas = document.getElementById("wheel-canvas");
  const pointer = document.getElementById("wheel-pointer");

  overlay.classList.remove("hidden");
  canvas.style.display = "";
  pointer.style.display = "";
  closeBtn.style.display = "none";
  resultDiv.innerHTML = "";
  resultDiv.className = "spinner-result";
  titleDiv.innerText = "🎡 Đang quay...";

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(cx, cy) - 10;
  const segAngle = (2 * Math.PI) / segments.length;

  // 4. Calculate target rotation
  // The pointer is at the TOP (12 o'clock = -π/2)
  // We want the winIndex segment center to align with the pointer
  // Segment i center is at: i * segAngle + segAngle/2
  const winSegCenter = winIndex * segAngle + segAngle / 2;
  // Pointer is at angle -π/2 (top). We need to rotate so winSegCenter aligns with -π/2
  // targetAngle = (-π/2 - winSegCenter) + fullSpins
  const fullSpins = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2; // 5-7 full rotations
  const randomJitter = (Math.random() - 0.5) * segAngle * 0.6; // jitter within segment
  const targetAngle = -Math.PI / 2 - winSegCenter + fullSpins + randomJitter;

  // 5. Animate
  let currentAngle = 0;
  const duration = 5000; // 5 seconds
  const startTime = performance.now();
  let animId = null;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function drawWheel(angle) {
    ctx.clearRect(0, 0, W, H);

    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 204, 0.3)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();

    // Draw segments
    for (let i = 0; i < segments.length; i++) {
      const startA = angle + i * segAngle;
      const endA = startA + segAngle;
      const char = segments[i];

      // Segment fill
      const colors = WHEEL_COLORS[char.rarity] || WHEEL_COLORS.common;
      const colorIdx = i % colors.length;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startA, endA);
      ctx.closePath();

      // gradient fill
      const gradStart = {
        x: cx + Math.cos(startA + segAngle / 2) * radius * 0.3,
        y: cy + Math.sin(startA + segAngle / 2) * radius * 0.3,
      };
      const gradEnd = {
        x: cx + Math.cos(startA + segAngle / 2) * radius,
        y: cy + Math.sin(startA + segAngle / 2) * radius,
      };
      const grad = ctx.createLinearGradient(gradStart.x, gradStart.y, gradEnd.x, gradEnd.y);
      grad.addColorStop(0, colors[colorIdx]);
      grad.addColorStop(1, colors[(colorIdx + 1) % colors.length]);
      ctx.fillStyle = grad;
      ctx.fill();

      // segment border
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Draw text
      ctx.save();
      const textAngle = startA + segAngle / 2;
      const textR = radius * 0.65;
      ctx.translate(cx + Math.cos(textAngle) * textR, cy + Math.sin(textAngle) * textR);
      ctx.rotate(textAngle + Math.PI / 2);

      // Name
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(char.name, 0, 0);

      // Rarity label
      ctx.font = "9px 'Segoe UI', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(char.rarity.toUpperCase(), 0, 13);
      ctx.restore();
    }

    // Center circle
    ctx.save();
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    centerGrad.addColorStop(0, "#1a1a2e");
    centerGrad.addColorStop(1, "#0d0d11");
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // Center icon
    ctx.save();
    ctx.fillStyle = "#00ffcc";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎰", cx, cy);
    ctx.restore();
  }

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeOutQuart(progress);

    currentAngle = eased * targetAngle;
    drawWheel(currentAngle);

    if (progress < 1) {
      animId = requestAnimationFrame(tick);
    } else {
      // Spin complete - show result
      onWheelComplete(winnerChar);
    }
  }

  // Initial draw
  drawWheel(0);

  // Start spin after brief pause
  setTimeout(() => {
    animId = requestAnimationFrame(tick);
  }, 300);

  function onWheelComplete(winner) {
    const alreadyOwned = state.ownedCharacters.includes(winner.id);

    if (alreadyOwned) {
      const matRarity = winner.rarity;
      state.resources[matRarity] = (state.resources[matRarity] || 0) + 1;

      titleDiv.innerText = "💰 Trùng lặp!";
      resultDiv.innerHTML = `
        <div class="wheel-result-char" style="color:${getRarityColor(matRarity)}">
          ${winner.name}
        </div>
        <div class="wheel-result-sub" style="color:#ffd700;">
          +1 Nguyên liệu ${matRarity}
        </div>
      `;
      resultDiv.className = `spinner-result gacha-${matRarity}`;
    } else {
      state.ownedCharacters.push(winner.id);

      titleDiv.innerText = "🎉 NHÂN VẬT MỚI!";
      resultDiv.innerHTML = `
        <div class="wheel-result-char" style="color:${getRarityColor(winner.rarity)}">
          ${winner.name}
        </div>
        <div class="wheel-result-sub" style="color:${getRarityColor(winner.rarity)}">
          ⭐ ${winner.rarity.toUpperCase()}
        </div>
      `;
      resultDiv.className = `spinner-result gacha-${winner.rarity}`;
    }

    saveGame(state, GHOST_DATA_KEY);
    persistState();

    closeBtn.style.display = "block";
    closeBtn.onclick = () => {
      overlay.classList.add("hidden");
      renderShop();
    };
  }
}

// ========================================
// TRADING MENU (kept for direct access)
// ========================================

export function openTradingMenu() {
  document.getElementById("screen-shop").classList.add("hidden");
  document.getElementById("screen-trading").classList.remove("hidden");

  renderTradingMenu();

  document.getElementById("btn-trading-back").onclick = () => {
    document.getElementById("screen-trading").classList.add("hidden");
    document.getElementById("screen-shop").classList.remove("hidden");
    renderShop();
  };
}

function renderTradingMenu() {
  const info = document.getElementById("trading-info");
  const options = document.getElementById("trading-options");

  options.innerHTML = "";

  const res = state.resources || { common: 0, rare: 0, legendary: 0 };

  info.innerHTML = `
    <p style="color:#4ade80">🟢 NL Common: ${res.common}</p>
    <p style="color:#60a5fa">🔵 NL Rare: ${res.rare}</p>
  `;
}

// Exports for backward compatibility
export function rollGacha() {}
export function tradeCharacters() {}