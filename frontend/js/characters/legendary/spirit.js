import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const SPIRIT_COLORS = {
  void: "#071012",
  deep: "#0e2026",
  teal: "#35fff2",
  cyan: "#9ffff8",
  gold: "#ffe58a",
  ivory: "#fff8e8",
  white: "#ffffff",
  violet: "#c9b7ff",
};

function ensureSpiritList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushSpiritBurst(state, type, x, y, radius, life, angle = 0) {
  ensureSpiritList(state, "spiritBursts").push({
    type,
    x,
    y,
    radius,
    life,
    maxLife: life,
    angle,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushSpiritSpark(state, x, y, angle, speed, life, size, color = SPIRIT_COLORS.cyan) {
  ensureSpiritList(state, "spiritSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.11,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushSpiritPhantom(state, player) {
  ensureSpiritList(state, "spiritPhantoms").push({
    x: player.x,
    y: player.y,
    radius: player.radius,
    life: 24,
    maxLife: 24,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushSpiritLightning(state, x, y, radius = 120, life = 20) {
  ensureSpiritList(state, "spiritLightnings").push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    seed: Math.random() * Math.PI * 2,
  });
}

function updateSpiritVfx(state) {
  if (state.spiritBursts) {
    for (let i = state.spiritBursts.length - 1; i >= 0; i--) {
      state.spiritBursts[i].life--;
      if (state.spiritBursts[i].life <= 0) state.spiritBursts.splice(i, 1);
    }
  }

  if (state.spiritSparks) {
    for (let i = state.spiritSparks.length - 1; i >= 0; i--) {
      const p = state.spiritSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.spiritSparks.splice(i, 1);
    }
  }

  if (state.spiritPhantoms) {
    for (let i = state.spiritPhantoms.length - 1; i >= 0; i--) {
      state.spiritPhantoms[i].life--;
      if (state.spiritPhantoms[i].life <= 0) state.spiritPhantoms.splice(i, 1);
    }
  }

  if (state.spiritLightnings) {
    for (let i = state.spiritLightnings.length - 1; i >= 0; i--) {
      state.spiritLightnings[i].life--;
      if (state.spiritLightnings[i].life <= 0) state.spiritLightnings.splice(i, 1);
    }
  }
}

function drawHalo(ctx, radius, frameCount, alpha = 1, color = SPIRIT_COLORS.gold) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * 0.018);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([13, 8]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.1, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.04);
  ctx.strokeStyle = "rgba(159, 255, 248, 0.55)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.72, radius * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.fillStyle = i % 2 === 0 ? SPIRIT_COLORS.ivory : SPIRIT_COLORS.cyan;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * radius * 0.96, Math.sin(a) * radius * 0.96, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpiritSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(-frameCount * 0.025);
  ctx.strokeStyle = "rgba(255, 248, 232, 0.72)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(53, 255, 242, 0.48)";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const a = frameCount * 0.02 + i * Math.PI * 2 / 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.22, Math.sin(a) * radius * 0.22);
    ctx.lineTo(Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpiritWings(ctx, radius, active = false) {
  ctx.save();
  ctx.strokeStyle = active ? "rgba(255, 248, 232, 0.82)" : "rgba(159, 255, 248, 0.48)";
  ctx.lineWidth = active ? 2.3 : 1.7;
  ctx.shadowBlur = active ? 18 : 10;
  ctx.shadowColor = active ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan;
  ctx.lineCap = "round";

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const lift = -radius * (0.55 + i * 0.08);
      const reach = side * radius * (0.62 + i * 0.34);
      ctx.beginPath();
      ctx.moveTo(side * radius * 0.22, -radius * 0.12 + i * radius * 0.1);
      ctx.quadraticCurveTo(reach * 0.62, lift, reach, radius * (0.18 + i * 0.16));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSpiritBody(ctx, radius, alpha = 1, active = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;

  const robe = ctx.createRadialGradient(-radius * 0.28, -radius * 0.46, radius * 0.08, 0, 0, radius * 1.35);
  robe.addColorStop(0, SPIRIT_COLORS.white);
  robe.addColorStop(0.22, SPIRIT_COLORS.ivory);
  robe.addColorStop(0.48, SPIRIT_COLORS.cyan);
  robe.addColorStop(0.82, "rgba(53, 255, 242, 0.28)");
  robe.addColorStop(1, "rgba(7, 16, 18, 0.12)");
  ctx.fillStyle = robe;
  ctx.shadowBlur = active ? 24 : 14;
  ctx.shadowColor = active ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.1);
  ctx.quadraticCurveTo(radius * 0.72, -radius * 0.56, radius * 0.45, radius * 0.7);
  ctx.quadraticCurveTo(radius * 0.18, radius * 1.12, 0, radius * 0.82);
  ctx.quadraticCurveTo(-radius * 0.18, radius * 1.12, -radius * 0.45, radius * 0.7);
  ctx.quadraticCurveTo(-radius * 0.72, -radius * 0.56, 0, -radius * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 229, 138, 0.78)" : "rgba(159, 255, 248, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(7, 16, 18, 0.38)";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.24, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = active ? SPIRIT_COLORS.gold : SPIRIT_COLORS.white;
  ctx.shadowBlur = active ? 14 : 8;
  ctx.shadowColor = active ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan;
  ctx.beginPath();
  ctx.arc(-radius * 0.14, -radius * 0.26, radius * 0.045, 0, Math.PI * 2);
  ctx.arc(radius * 0.14, -radius * 0.26, radius * 0.045, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 248, 232, 0.62)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.2);
  ctx.lineTo(0, radius * 0.68);
  ctx.moveTo(-radius * 0.22, radius * 0.42);
  ctx.lineTo(radius * 0.22, radius * 0.42);
  ctx.stroke();
  ctx.restore();
}

function drawSpiritBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.96);
  const isR = burst.type === "r";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.28})`);
  glow.addColorStop(0.36, isR ? `rgba(255, 229, 138, ${alpha * 0.24})` : `rgba(159, 255, 248, ${alpha * 0.2})`);
  glow.addColorStop(1, "rgba(7, 16, 18, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.055 : 0.035));
  ctx.shadowBlur = isR ? 24 : 16;
  ctx.shadowColor = isR ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan;
  drawSpiritSigil(ctx, radius * 0.48, frameCount, alpha * 0.9);
  ctx.restore();

  ctx.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const a = burst.seed + i * Math.PI * 2 / 10 + frameCount * 0.025;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.24, Math.sin(a) * radius * 0.24);
    ctx.lineTo(Math.cos(a) * radius * 0.78, Math.sin(a) * radius * 0.78);
    ctx.strokeStyle = i % 2 === 0
      ? `rgba(255, 248, 232, ${alpha * 0.62})`
      : `rgba(53, 255, 242, ${alpha * 0.5})`;
    ctx.lineWidth = isR ? 3 : 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawSpiritSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = spark.color;
  ctx.shadowBlur = 14;
  ctx.shadowColor = spark.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, spark.size * 2.1, spark.size * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpiritPhantom(ctx, phantom, frameCount) {
  const alpha = Math.max(0, phantom.life / phantom.maxLife);

  ctx.save();
  ctx.translate(phantom.x, phantom.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(Math.sin(frameCount * 0.05 + phantom.seed) * 0.08);
  drawSpiritWings(ctx, phantom.radius, true);
  drawSpiritBody(ctx, phantom.radius, alpha * 0.34, true);
  ctx.restore();
}

function drawSpiritLightning(ctx, strike, frameCount) {
  const alpha = Math.max(0, strike.life / strike.maxLife);
  const radius = strike.radius * (0.65 + (1 - alpha) * 0.45);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 28;
  ctx.shadowColor = SPIRIT_COLORS.white;

  const topY = strike.y - 900;
  const steps = 8;
  ctx.beginPath();
  ctx.moveTo(strike.x + Math.sin(strike.seed) * 30, topY);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jitter = Math.sin(strike.seed + frameCount * 0.4 + i * 1.9) * (42 * (1 - t * 0.35));
    ctx.lineTo(strike.x + jitter, topY + (strike.y - topY) * t);
  }
  ctx.strokeStyle = `rgba(255, 248, 232, ${alpha * 0.86})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(strike.x, topY);
  ctx.lineTo(strike.x, strike.y);
  ctx.strokeStyle = `rgba(53, 255, 242, ${alpha * 0.58})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  const impact = ctx.createRadialGradient(strike.x, strike.y, 0, strike.x, strike.y, radius);
  impact.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.42})`);
  impact.addColorStop(0.42, `rgba(255, 229, 138, ${alpha * 0.24})`);
  impact.addColorStop(1, "rgba(7, 16, 18, 0)");
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = impact;
  ctx.fill();

  ctx.save();
  ctx.translate(strike.x, strike.y);
  drawSpiritSigil(ctx, radius * 0.42, frameCount, alpha);
  ctx.restore();
  ctx.restore();
}

export function drawSpiritPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3.45 : isE ? 3 : isQ ? 2.65 : 1.9);
  const aura = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.28)" : "rgba(159, 255, 248, 0.1)");
  aura.addColorStop(0.45, isR ? "rgba(255, 229, 138, 0.2)" : "rgba(53, 255, 242, 0.15)");
  aura.addColorStop(1, "rgba(7, 16, 18, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.045 : 0.025));
    ctx.shadowBlur = isR ? 24 : 16;
    ctx.shadowColor = isR ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan;
    drawSpiritSigil(ctx, R * (1.62 + pulse * 0.12), fc, isR ? 0.9 : 0.68);
    ctx.restore();
  }

  drawSpiritWings(ctx, R * (isR ? 1.15 : 1), active);

  ctx.save();
  ctx.translate(0, -R * 0.92);
  ctx.rotate(Math.sin(fc * 0.05) * 0.04);
  ctx.shadowBlur = active ? 22 : 12;
  ctx.shadowColor = active ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan;
  drawHalo(ctx, R * (0.72 + pulse * 0.05), fc, active ? 0.9 : 0.62, isR ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan);
  ctx.restore();

  drawSpiritBody(ctx, R, isQ ? 0.62 : 0.95, active);

  if (isQ) {
    ctx.save();
    ctx.rotate(-fc * 0.045);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.74)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.95 + pulse * 0.16), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (isE) {
    ctx.save();
    ctx.rotate(fc * 0.035);
    ctx.strokeStyle = "rgba(53, 255, 242, 0.62)";
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.6 + pulse * 0.14), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 229, 138, 0.58)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const spirit = {
  id: "spirit",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;
    const aim = Math.atan2((state.mouse?.y ?? player.y) - player.y, (state.mouse?.x ?? player.x + 100) - player.x);

    if (key === "q") {
      state.activeBuffs.q = 3 * FPS;
      pushSpiritBurst(state, "q", player.x, player.y, 145, 36, aim);
      for (let i = 0; i < 14; i++) {
        pushSpiritSpark(
          state,
          player.x,
          player.y,
          Math.random() * Math.PI * 2,
          1 + Math.random() * 2.1,
          24,
          2,
          i % 3 === 0 ? SPIRIT_COLORS.gold : SPIRIT_COLORS.cyan,
        );
      }
    }

    if (key === "e") {
      state.activeBuffs.e = 4 * FPS;
      pushSpiritBurst(state, "e", player.x, player.y, 210, 40, aim);
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI * 2 / 18;
        pushSpiritSpark(state, player.x, player.y, a, 1.1 + Math.random() * 1.7, 28, 2.2, i % 2 === 0 ? SPIRIT_COLORS.cyan : SPIRIT_COLORS.ivory);
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 6 * FPS;
      state.screenShake = { timer: 18, intensity: 5 };
      pushSpiritBurst(state, "r", player.x, player.y, 230, 50, aim);
    }

    return true;
  },

  update: (state) => {
    const { player, ghosts, boss, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      if (fc % 5 === 0) pushSpiritPhantom(state, player);
      if (fc % 8 === 0) {
        pushSpiritSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.6, 18, 1.6, SPIRIT_COLORS.white);
      }
    }

    if (buffs.e > 0) {
      bullets.forEach((b) => {
        if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 220 && fc % 4 === 0) {
          const a = Math.atan2(b.y - player.y, b.x - player.x);
          pushSpiritSpark(state, b.x, b.y, a, 0.9, 16, 1.8, SPIRIT_COLORS.cyan);
        }
      });

      ghosts.forEach((g) => {
        if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 230) {
          g.hp -= 0.04;
        }
      });
    }

    if (buffs.r > 0 && fc % 10 === 0) {
      const lx = player.x + (Math.random() - 0.5) * 820;
      const ly = player.y + (Math.random() - 0.5) * 620;
      pushSpiritLightning(state, lx, ly, 122, 22);

      ghosts.forEach((g) => {
        if (g.x > 0 && dist(lx, ly, g.x, g.y) < (g.radius || 12) + 120) {
          g.hp -= 9;
          g.isStunned = Math.max(g.isStunned || 0, 48);
        }
      });
      if (boss && dist(lx, ly, boss.x, boss.y) < (boss.radius || 40) + 120) {
        boss.hp -= 10;
      }
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "spirit" || b.spiritPrepared) return;

      b.spiritPrepared = true;
      b.visualStyle = "spirit_orb";

      if (buffs.q > 0) {
        b.spiritPhased = true;
        b.pierce = true;
      }

      if (buffs.e > 0) {
        b.spiritWard = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.r > 0) {
        b.spiritJudgement = true;
        b.damage = (b.damage || 1) * 1.25;
        b.radius = Math.max(b.radius || 4, 6);
      }
    });

    updateSpiritVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount, bullets } = state;
    const fc = frameCount || 0;

    state.spiritPhantoms?.forEach((phantom) => drawSpiritPhantom(ctx, phantom, fc));

    if (buffs.e > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.16) * 5;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 225 + pulse);
      field.addColorStop(0, "rgba(255, 255, 255, 0.05)");
      field.addColorStop(0.52, "rgba(53, 255, 242, 0.08)");
      field.addColorStop(1, "rgba(53, 255, 242, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 225 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      ctx.strokeStyle = "rgba(53, 255, 242, 0.52)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([20, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 220 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawSpiritSigil(ctx, 76 + pulse * 0.2, fc, 0.5);
      ctx.restore();

      bullets?.forEach((b) => {
        if (b.isPlayer || dist(player.x, player.y, b.x, b.y) > 220) return;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(159, 255, 248, 0.38)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(b.x, b.y, (b.radius || 6) + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 248, 232, 0.52)";
        ctx.stroke();
        ctx.restore();
      });
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 248, 232, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.14) * 7;
      ctx.strokeStyle = "rgba(255, 229, 138, 0.48)";
      ctx.lineWidth = 3;
      ctx.setLineDash([24, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 150 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawHalo(ctx, 88 + pulse * 0.25, fc, 0.68, SPIRIT_COLORS.gold);
      ctx.restore();
    }

    state.spiritLightnings?.forEach((strike) => drawSpiritLightning(ctx, strike, fc));
    state.spiritBursts?.forEach((burst) => drawSpiritBurst(ctx, burst, fc));
    state.spiritSparks?.forEach((spark) => drawSpiritSpark(ctx, spark));
  },
};
