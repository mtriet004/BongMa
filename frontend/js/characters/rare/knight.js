import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

const KNIGHT_COLORS = {
  iron: "#1d242b",
  steel: "#66717d",
  silver: "#d9e3ec",
  gold: "#ffd36a",
  royal: "#4f7cff",
  crimson: "#ff4058",
};

function ensureKnightList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushKnightBurst(state, type, x, y, radius, life, angle = 0) {
  ensureKnightList(state, "knightBursts").push({
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

function pushKnightSpark(state, x, y, angle, speed, life, size, color = KNIGHT_COLORS.gold) {
  ensureKnightList(state, "knightSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.16,
    life,
    maxLife: life,
    size,
    color,
  });
}

function updateKnightVfx(state) {
  if (state.knightBursts) {
    for (let i = state.knightBursts.length - 1; i >= 0; i--) {
      state.knightBursts[i].life--;
      if (state.knightBursts[i].life <= 0) state.knightBursts.splice(i, 1);
    }
  }

  if (state.knightSparks) {
    for (let i = state.knightSparks.length - 1; i >= 0; i--) {
      const s = state.knightSparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.94;
      s.vy *= 0.94;
      s.angle += s.spin;
      s.life--;
      if (s.life <= 0) state.knightSparks.splice(i, 1);
    }
  }
}

function drawKiteShield(ctx, radius) {
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(radius * 0.75, -radius * 0.68, radius * 0.66, radius * 0.18);
  ctx.quadraticCurveTo(radius * 0.5, radius * 0.78, 0, radius * 1.08);
  ctx.quadraticCurveTo(-radius * 0.5, radius * 0.78, -radius * 0.66, radius * 0.18);
  ctx.quadraticCurveTo(-radius * 0.75, -radius * 0.68, 0, -radius);
  ctx.closePath();
}

function drawSword(ctx, length, width) {
  ctx.beginPath();
  ctx.moveTo(length * 0.62, 0);
  ctx.lineTo(-length * 0.18, -width * 0.28);
  ctx.lineTo(-length * 0.36, 0);
  ctx.lineTo(-length * 0.18, width * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-length * 0.18, -width * 0.72);
  ctx.lineTo(-length * 0.18, width * 0.72);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-length * 0.42, 0, width * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawKnightBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.2 + progress * 0.95);
  const isRage = burst.type === "r";
  const color = isRage ? KNIGHT_COLORS.crimson : KNIGHT_COLORS.gold;

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
  glow.addColorStop(
    0.42,
    isRage ? `rgba(255, 64, 88, ${alpha * 0.24})` : `rgba(255, 211, 106, ${alpha * 0.24})`,
  );
  glow.addColorStop(1, "rgba(29, 36, 43, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < (isRage ? 3 : 2); ring++) {
    ctx.save();
    ctx.rotate(burst.seed + frameCount * (0.035 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = ring === 0
      ? `rgba(217, 227, 236, ${alpha * 0.78})`
      : isRage
        ? `rgba(255, 64, 88, ${alpha * 0.52})`
        : `rgba(255, 211, 106, ${alpha * 0.52})`;
    ctx.lineWidth = Math.max(1.4, 4.4 - ring);
    ctx.shadowBlur = 20;
    ctx.shadowColor = ring === 0 ? KNIGHT_COLORS.silver : color;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.52 + ring * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const spokes = isRage ? 16 : burst.type === "e" ? 12 : 10;
  ctx.lineCap = "round";
  for (let i = 0; i < spokes; i++) {
    const a = burst.seed + (i / spokes) * Math.PI * 2 + frameCount * 0.035;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.22, Math.sin(a) * radius * 0.22);
    ctx.lineTo(Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86);
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(255, 255, 255, ${alpha * 0.66})`
      : isRage
        ? `rgba(255, 64, 88, ${alpha * 0.5})`
        : `rgba(255, 211, 106, ${alpha * 0.48})`;
    ctx.lineWidth = isRage ? 3 : 2;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(burst.angle);
    ctx.fillStyle = `rgba(217, 227, 236, ${alpha * 0.85})`;
    ctx.strokeStyle = `rgba(255, 211, 106, ${alpha * 0.82})`;
    ctx.lineWidth = 2;
    drawSword(ctx, Math.max(28, radius * 0.26), Math.max(10, radius * 0.08));
    ctx.restore();
  }

  if (burst.type === "e") {
    ctx.save();
    ctx.rotate(-frameCount * 0.04);
    ctx.fillStyle = `rgba(79, 124, 255, ${alpha * 0.22})`;
    ctx.strokeStyle = `rgba(255, 211, 106, ${alpha * 0.72})`;
    ctx.lineWidth = 2.2;
    drawKiteShield(ctx, Math.max(14, radius * 0.18));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawKnightSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = spark.color;
  ctx.shadowBlur = 12;
  ctx.shadowColor = spark.color;
  ctx.beginPath();
  ctx.roundRect(-spark.size * 1.55, -spark.size * 0.35, spark.size * 3.1, spark.size * 0.7, 2);
  ctx.fill();
  ctx.restore();
}

export function drawKnightPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0 || !!state.knightCharge;
  const isE = (buffs.e || 0) > 0 || !!state.knightShield;
  const isR = (buffs.r || 0) > 0 || !!state.knightRage;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
  const faceAngle = state.knightCharge?.angle ?? Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3 : isE ? 2.7 : isQ ? 2.45 : 1.85);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.34)" : "rgba(217, 227, 236, 0.14)");
  aura.addColorStop(0.5, isR ? "rgba(255, 64, 88, 0.22)" : "rgba(255, 211, 106, 0.16)");
  aura.addColorStop(1, "rgba(29, 36, 43, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (isR || isE) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.055 : 0.025));
    ctx.strokeStyle = isR ? "rgba(255, 64, 88, 0.72)" : "rgba(255, 211, 106, 0.62)";
    ctx.lineWidth = isR ? 2.8 : 2.2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = isR ? KNIGHT_COLORS.crimson : KNIGHT_COLORS.gold;
    ctx.setLineDash(isR ? [7, 5] : [16, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.68 + pulse * 0.1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (isQ && state.knightCharge) {
    const dx = Math.cos(faceAngle);
    const dy = Math.sin(faceAngle);
    const px = -dy;
    const py = dx;
    const tail = ctx.createLinearGradient(-dx * R * 4, -dy * R * 4, dx * R * 1.4, dy * R * 1.4);
    tail.addColorStop(0, "rgba(255, 211, 106, 0)");
    tail.addColorStop(0.52, "rgba(255, 211, 106, 0.22)");
    tail.addColorStop(1, "rgba(255, 255, 255, 0.5)");
    ctx.beginPath();
    ctx.moveTo(dx * R * 1.35, dy * R * 1.35);
    ctx.lineTo(-dx * R * 4 + px * R * 0.9, -dy * R * 4 + py * R * 0.9);
    ctx.lineTo(-dx * R * 3.1 - px * R * 0.9, -dy * R * 3.1 - py * R * 0.9);
    ctx.closePath();
    ctx.fillStyle = tail;
    ctx.fill();
  }

  const armor = ctx.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.08, 0, 0, R * 1.35);
  armor.addColorStop(0, "#f5fbff");
  armor.addColorStop(0.3, KNIGHT_COLORS.silver);
  armor.addColorStop(0.62, KNIGHT_COLORS.steel);
  armor.addColorStop(1, KNIGHT_COLORS.iron);
  ctx.shadowBlur = active ? 28 : 16;
  ctx.shadowColor = active ? KNIGHT_COLORS.gold : KNIGHT_COLORS.silver;
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.roundRect(-R * 0.75, -R * 0.88, R * 1.5, R * 1.76, R * 0.22);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 211, 106, 0.88)" : "rgba(217, 227, 236, 0.78)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(29, 36, 43, 0.88)";
  ctx.beginPath();
  ctx.roundRect(-R * 0.48, -R * 0.48, R * 0.96, R * 0.6, R * 0.12);
  ctx.fill();

  ctx.fillStyle = KNIGHT_COLORS.gold;
  ctx.beginPath();
  ctx.roundRect(-R * 0.32, -R * 0.26, R * 0.64, R * 0.08, 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -R * 0.82);
  ctx.fillStyle = KNIGHT_COLORS.royal;
  ctx.strokeStyle = KNIGHT_COLORS.gold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.52);
  ctx.lineTo(R * 0.2, 0);
  ctx.lineTo(-R * 0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(faceAngle);
  ctx.translate(R * 0.25, R * 0.22);
  ctx.fillStyle = KNIGHT_COLORS.silver;
  ctx.strokeStyle = KNIGHT_COLORS.gold;
  ctx.lineWidth = 2;
  ctx.shadowBlur = isQ ? 20 : 10;
  ctx.shadowColor = isQ ? KNIGHT_COLORS.gold : KNIGHT_COLORS.silver;
  drawSword(ctx, R * 2.25, R * 0.56);
  ctx.restore();

  ctx.save();
  ctx.translate(-R * 0.48, R * 0.2);
  ctx.fillStyle = isE ? "rgba(79, 124, 255, 0.58)" : "rgba(79, 124, 255, 0.34)";
  ctx.strokeStyle = isE ? "rgba(255, 211, 106, 0.92)" : "rgba(217, 227, 236, 0.76)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = isE ? 22 : 8;
  ctx.shadowColor = isE ? KNIGHT_COLORS.gold : KNIGHT_COLORS.silver;
  drawKiteShield(ctx, R * 0.64);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (isE) {
    ctx.save();
    ctx.rotate(-fc * 0.035);
    ctx.strokeStyle = "rgba(255, 211, 106, 0.72)";
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 22;
    ctx.shadowColor = KNIGHT_COLORS.gold;
    ctx.setLineDash([12, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.55 + pulse * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      ctx.save();
      ctx.translate(Math.cos(a) * R * 2.55, Math.sin(a) * R * 2.55);
      ctx.rotate(a);
      drawKiteShield(ctx, R * 0.18);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

export const knight = {
  id: "knight",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;

    if (key === "q") {
      const mx = mouse?.x || player.x + 100;
      const my = mouse?.y || player.y;
      const angle = Math.atan2(my - player.y, mx - player.x);

      state.knightCharge = {
        vx: Math.cos(angle) * 12,
        vy: Math.sin(angle) * 12,
        angle,
        life: 15,
        maxLife: 15,
      };
      state.activeBuffs.q = 15;
      player.gracePeriod = Math.max(player.gracePeriod, 15);
      pushKnightBurst(state, "q", player.x, player.y, 130, 32, angle);
      for (let i = 0; i < 12; i++) {
        pushKnightSpark(
          state,
          player.x,
          player.y,
          angle + Math.PI + (Math.random() - 0.5) * 0.9,
          1.8 + Math.random() * 2.8,
          22,
          2 + Math.random() * 2,
          i % 3 === 0 ? KNIGHT_COLORS.silver : KNIGHT_COLORS.gold,
        );
      }

      if (state.boss) {
        const d = dist(player.x, player.y, state.boss.x, state.boss.y);
        if (d < 100) state.boss.hp -= 5;
      }
    }

    if (key === "e") {
      state.knightShield = {
        life: 3 * FPS,
        maxLife: 3 * FPS,
        blockedCount: 0,
      };
      state.activeBuffs.e = 3 * FPS;
      player.gracePeriod = Math.max(player.gracePeriod, 3 * FPS);
      pushKnightBurst(state, "e", player.x, player.y, 155, 36);
    }

    if (key === "r") {
      state.knightRage = {
        life: 6 * FPS,
        maxLife: 6 * FPS,
      };
      state.activeBuffs.r = 6 * FPS;
      pushKnightBurst(state, "r", player.x, player.y, 170, 42);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        pushKnightSpark(state, player.x, player.y, a, 1.5 + Math.random() * 2.6, 28, 2.4, i % 2 === 0 ? KNIGHT_COLORS.crimson : KNIGHT_COLORS.gold);
      }
    }
    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, boss, ghosts, frameCount } = state;
    const fc = frameCount || 0;

    if (state.knightCharge) {
      const charge = state.knightCharge;
      charge.life--;
      player.x += charge.vx;
      player.y += charge.vy;

      const chargeAngle = Math.atan2(charge.vy, charge.vx);
      if (fc % 2 === 0) {
        pushKnightSpark(
          state,
          player.x - Math.cos(chargeAngle) * 16,
          player.y - Math.sin(chargeAngle) * 16,
          chargeAngle + Math.PI + (Math.random() - 0.5) * 0.8,
          1.2 + Math.random() * 2.2,
          18,
          2,
          KNIGHT_COLORS.gold,
        );
      }

      ghosts.forEach((g) => {
        if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < (g.radius || 12) + player.radius + 22) {
          g.hp = (g.hp || 1) - 0.35;
          g.isStunned = Math.max(g.isStunned || 0, 12);
          const a = Math.atan2(g.y - player.y, g.x - player.x);
          g.x += Math.cos(a) * 8;
          g.y += Math.sin(a) * 8;
          if (fc % 4 === 0) pushKnightBurst(state, "hit", g.x, g.y, 42, 16, chargeAngle);
        }
      });

      if (boss && dist(player.x, player.y, boss.x, boss.y) < boss.radius + player.radius + 20) {
        boss.hp -= 0.1;
        if (fc % 4 === 0) pushKnightBurst(state, "hit", boss.x, boss.y, Math.min(85, boss.radius + 20), 16, chargeAngle);
      }
      if (charge.life <= 0) state.knightCharge = null;
    }

    if (state.knightShield) {
      state.knightShield.life--;
      state.bullets = state.bullets.filter((b) => {
        if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 46) {
          state.knightShield.blockedCount++;
          pushKnightSpark(state, b.x, b.y, Math.atan2(b.y - player.y, b.x - player.x), 1.8, 20, 2.2, KNIGHT_COLORS.silver);
          return false;
        }
        return true;
      });

      if (state.knightShield.life <= 0) {
        const oldLen = state.bullets.length;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          spawnBullet(player.x, player.y, player.x + Math.cos(a) * 100, player.y + Math.sin(a) * 100, true);
        }
        for (let i = oldLen; i < state.bullets.length; i++) {
          state.bullets[i].radius = 7;
          state.bullets[i].damage = 1.3 + Math.min(1.2, state.knightShield.blockedCount * 0.15);
          state.bullets[i].life = 100;
          state.bullets[i].pierce = true;
          state.bullets[i].isKnightRiposte = true;
          state.bullets[i].visualStyle = "knight_blade";
        }
        pushKnightBurst(state, "e", player.x, player.y, 180, 42);
        state.knightShield = null;
      }
    }

    if (state.knightRage) {
      state.knightRage.life--;
      if (state.knightRage.life <= 0) state.knightRage = null;
    }

    if (buffs.r > 0) {
      state.playerFireRateMultiplier = 0.6;
    }

    updateKnightVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    if (state.knightCharge) {
      const angle = state.knightCharge.angle;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 211, 106, 0.72)";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 22;
      ctx.shadowColor = KNIGHT_COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(-player.radius * 3.8, 0);
      ctx.lineTo(player.radius * 2.1, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (state.knightShield) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.max(0.25, state.knightShield.life / state.knightShield.maxLife);
      const pulse = Math.sin(fc * 0.18) * 4;
      const field = ctx.createRadialGradient(0, 0, 14, 0, 0, 52 + pulse);
      field.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      field.addColorStop(0.55, `rgba(79, 124, 255, ${alpha * 0.12})`);
      field.addColorStop(1, "rgba(255, 211, 106, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 52 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 211, 106, ${alpha * 0.78})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 22;
      ctx.shadowColor = KNIGHT_COLORS.gold;
      ctx.setLineDash([14, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 44 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (state.knightRage) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.max(0.2, state.knightRage.life / state.knightRage.maxLife);
      ctx.rotate(fc * 0.06);
      ctx.strokeStyle = `rgba(255, 64, 88, ${alpha * 0.72})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = KNIGHT_COLORS.crimson;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 22 + i * 9 + Math.sin(fc * 0.18 + i) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    state.knightBursts?.forEach((burst) => drawKnightBurst(ctx, burst, fc));
    state.knightSparks?.forEach((spark) => drawKnightSpark(ctx, spark));
  },
};
