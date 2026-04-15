import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";
import { addExperience } from "../../game/combat.js";

function pushMageBurst(state, type, x, y, radius, life) {
  if (!state.mageBursts) state.mageBursts = [];
  state.mageBursts.push({ x, y, type, radius, life, maxLife: life });
}

function pushMageSpark(state, x, y, radius, life, angle, color) {
  if (!state.mageSparks) state.mageSparks = [];
  state.mageSparks.push({
    x,
    y,
    vx: Math.cos(angle) * (0.6 + Math.random() * 1.4),
    vy: Math.sin(angle) * (0.6 + Math.random() * 1.4),
    radius,
    life,
    maxLife: life,
    angle,
    spin: (Math.random() - 0.5) * 0.16,
    color,
  });
}

function drawRuneStar(ctx, r, points = 6) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawMageBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.96);
  const ember = "#ff5a1f";
  const gold = "#ffb000";
  const arcane = "#00ffd5";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.32})`);
  glow.addColorStop(
    0.42,
    burst.type === "r"
      ? `rgba(0, 255, 213, ${alpha * 0.22})`
      : `rgba(255, 90, 31, ${alpha * 0.24})`,
  );
  glow.addColorStop(1, "rgba(30, 12, 0, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
    const rr = radius * (0.55 + ring * 0.2);
    ctx.save();
    ctx.rotate(
      frameCount * (0.03 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1),
    );
    ctx.strokeStyle =
      ring === 0
        ? `rgba(255, 245, 220, ${alpha * 0.82})`
        : burst.type === "r"
          ? `rgba(0, 255, 213, ${alpha * 0.58})`
          : `rgba(255, 176, 0, ${alpha * 0.58})`;
    ctx.lineWidth = Math.max(1.4, 4.8 - ring);
    ctx.shadowBlur = 22;
    ctx.shadowColor = ring === 0 ? gold : burst.type === "r" ? arcane : ember;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const spokes = burst.type === "r" ? 14 : burst.type === "e" ? 10 : 8;
  ctx.lineCap = "round";
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + frameCount * 0.04;
    const inner = radius * 0.2;
    const outer = radius * (0.78 + Math.sin(frameCount * 0.1 + i) * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(255, 255, 255, ${alpha * 0.72})`
        : burst.type === "r"
          ? `rgba(0, 255, 213, ${alpha * 0.54})`
          : `rgba(255, 90, 31, ${alpha * 0.56})`;
    ctx.lineWidth = burst.type === "r" ? 3 : 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = burst.type === "r" ? arcane : ember;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(frameCount * 0.14);
    ctx.strokeStyle = `rgba(255, 176, 0, ${alpha * 0.75})`;
    ctx.lineWidth = 2.6;
    ctx.shadowBlur = 18;
    ctx.shadowColor = gold;
    drawRuneStar(ctx, Math.max(12, radius * 0.18), 6);
    ctx.restore();
  }

  if (burst.type === "e") {
    ctx.save();
    ctx.rotate(-frameCount * 0.1);
    ctx.strokeStyle = `rgba(255, 40, 60, ${alpha * 0.75})`;
    ctx.lineWidth = 2.4;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff3355";
    drawRuneStar(ctx, Math.max(10, radius * 0.16), 5);
    ctx.restore();
  }

  if (burst.type === "r") {
    ctx.save();
    ctx.rotate(frameCount * 0.08);
    ctx.strokeStyle = `rgba(0, 255, 213, ${alpha * 0.62})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

export function drawMagePlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isR = (buffs.r || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
  const energized = isR || isE || isInvulnSkill;

  if (player.gracePeriod > 0 && !energized && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  const ember = "#ff5a1f";
  const gold = "#ffb000";
  const arcane = "#00ffd5";
  const deep = "#101428";

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraR = R * (isR ? 3.2 : isE ? 2.5 : 1.9);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
  aura.addColorStop(0, energized ? "rgba(255, 255, 255, 0.42)" : "rgba(255, 90, 31, 0.22)");
  aura.addColorStop(0.45, isR ? "rgba(0, 255, 213, 0.24)" : "rgba(255, 176, 0, 0.2)");
  aura.addColorStop(1, "rgba(30, 12, 0, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  for (let ring = 0; ring < (isR ? 3 : energized ? 2 : 1); ring++) {
    ctx.save();
    ctx.rotate(fc * (0.03 + ring * 0.014) * (ring % 2 === 0 ? 1 : -1));
    ctx.strokeStyle =
      ring === 0
        ? `rgba(255, 176, 0, ${energized ? 0.78 : 0.46})`
        : `rgba(0, 255, 213, ${isR ? 0.58 : 0.32})`;
    ctx.lineWidth = ring === 0 ? 2.6 : 1.6;
    ctx.shadowBlur = energized ? 18 : 10;
    ctx.shadowColor = ring === 0 ? gold : arcane;
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.55 + ring * 0.42 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const robe = ctx.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.06, 0, 0, R * 1.35);
  robe.addColorStop(0, "#f7f7ff");
  robe.addColorStop(0.26, deep);
  robe.addColorStop(0.66, "#1b2550");
  robe.addColorStop(1, "#070a18");

  ctx.shadowBlur = energized ? 38 : 22;
  ctx.shadowColor = energized ? (isR ? arcane : gold) : ember;
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.roundRect(-R * 0.84, -R * 0.84, R * 1.68, R * 1.68, R * 0.3);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = energized ? "rgba(255, 245, 220, 0.85)" : "rgba(255, 90, 31, 0.7)";
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-R * 0.56, -R * 0.52, R * 1.12, R * 0.72, R * 0.14);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#f7ffff";
  ctx.shadowBlur = 12;
  ctx.shadowColor = isR ? arcane : gold;
  ctx.beginPath();
  ctx.arc(-R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
  ctx.arc(R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(-fc * 0.06);
  ctx.strokeStyle = isR ? "rgba(0, 255, 213, 0.8)" : "rgba(255, 176, 0, 0.8)";
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 16;
  ctx.shadowColor = isR ? arcane : gold;
  drawRuneStar(ctx, R * (1.18 + pulse * 0.05), 6);
  ctx.restore();

  if (isE) {
    ctx.strokeStyle = "rgba(255, 90, 31, 0.78)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = ember;
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.95 + pulse * 0.16), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(fc * 0.05);
    ctx.strokeStyle = "rgba(0, 255, 213, 0.6)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 2.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#00aaff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const s = state.playerStatus || {};
  if (s.slowTimer > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R + 12, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (s.stunTimer > 0) {
    ctx.fillStyle = "#ffff00";
    for (let i = 0; i < 3; i++) {
      const a = fc * 0.2 + i * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export const mage = {
  id: "mage",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;

    if (key === "q") {
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 4) {
        spawnBullet(
          player.x,
          player.y,
          player.x + Math.cos(i),
          player.y + Math.sin(i),
          true,
          1,
        );
      }
      state.activeBuffs.q = 18;
      pushMageBurst(state, "q", player.x, player.y, 120, 26);
      state.screenShake = { timer: 8, intensity: 2.2 };
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        pushMageSpark(state, player.x, player.y, 3 + Math.random() * 4, 22, a, i % 3 === 0 ? "#ffb000" : "#ff5a1f");
      }
    }

    if (key === "e") {
      if (player.hp > 1) {
        player.hp--;
        updateHealthUI();
        addExperience(100, changeStateFn);
        state.activeBuffs.e = 24;
        pushMageBurst(state, "e", player.x, player.y, 105, 30);
        state.screenShake = { timer: 6, intensity: 1.8 };
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          pushMageSpark(state, player.x, player.y, 3 + Math.random() * 4, 24, a, i % 2 === 0 ? "#ff3355" : "#ff5a1f");
        }
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 4 * FPS;
      pushMageBurst(state, "r", player.x, player.y, 240, 44);
      state.screenShake = { timer: 12, intensity: 3 };
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        pushMageSpark(state, player.x, player.y, 4 + Math.random() * 5, 30, a, i % 3 === 0 ? "#00ffd5" : "#bdf6ff");
      }
    }
    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    if (!player) return;

    if (buffs.r > 0) {
      state.timeFrozenModifier = true;

      if (frameCount % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        pushMageSpark(
          state,
          player.x + Math.cos(a) * (70 + Math.random() * 190),
          player.y + Math.sin(a) * (70 + Math.random() * 190),
          3 + Math.random() * 4,
          26,
          a + Math.PI,
          Math.random() > 0.25 ? "#00ffd5" : "#bdf6ff",
        );
      }
    }

    if (state.mageSparks) {
      state.mageSparks.forEach((s) => {
        s.life--;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.angle += s.spin;
      });
      state.mageSparks = state.mageSparks.filter((s) => s.life > 0);
    }

    if (state.mageBursts) {
      state.mageBursts.forEach((b) => b.life--);
      state.mageBursts = state.mageBursts.filter((b) => b.life > 0);
    }
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    if (!player) return;

    state.mageSparks?.forEach((s) => {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = "rgba(255, 245, 220, 0.6)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 14;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.moveTo(s.radius, 0);
      ctx.lineTo(-s.radius * 0.35, s.radius * 0.75);
      ctx.lineTo(-s.radius * 0.7, -s.radius * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    state.mageBursts?.forEach((burst) => {
      drawMageBurst(ctx, burst, frameCount || 0);
    });

    if (buffs.r > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(0, 255, 213, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.translate(player.x, player.y);
      ctx.rotate((frameCount || 0) * 0.04);
      ctx.strokeStyle = "rgba(0, 255, 213, 0.42)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // light "snow" pixels, but stable-ish
      ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(
          (Math.sin((frameCount || 0) * 0.07 + i * 1.7) * 0.5 + 0.5) * canvas.width,
          (Math.cos((frameCount || 0) * 0.09 + i * 2.1) * 0.5 + 0.5) * canvas.height,
          2,
          2,
        );
      }
    }
  },
};

