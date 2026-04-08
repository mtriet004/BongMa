import { state } from "../state.js";
import { spawnHazard } from "../entities/helpers.js";

export function initMapTheme() {
  const bossType = state.currentBossType || "fire";
  state.currentMapTheme = bossType;

  // clear old map hazards
  state.hazards = state.hazards.filter(h => h.owner !== "map");

  // ❌ TẮT GLOBAL HAZARD HOÀN TOÀN
  state.globalHazard = {
    type: null,
    active: false,
    damage: 0,
  };

  // ===== FIRE THEME =====
  if (bossType === "fire") {
    for (let i = 0; i < 6; i++) {
      spawnHazard(
        "fire",
        Math.random() * state.world.width,
        Math.random() * state.world.height,
        60,
        999999,
        0, // ✅ KHÔNG DAMAGE
        "map"
      );
    }
  }

  // ===== EARTH THEME =====
  if (bossType === "earth") {
    for (let i = 0; i < 6; i++) {
      spawnHazard(
        "rock",
        Math.random() * state.world.width,
        Math.random() * state.world.height,
        100,
        999999,
        0, // vốn đã không damage
        "map"
      );
    }
  }
}