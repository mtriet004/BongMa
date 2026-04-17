import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const TIMEKEEPER_COLORS = {
  void: "#07131f",
  deep: "#10263a",
  blue: "#5bc8ff",
  cyan: "#9feeff",
  pale: "#e9fbff",
  white: "#ffffff",
  gold: "#ffe28a",
};

function ensureTimekeeperList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushTimekeeperBurst(state, type, x, y, radius, life, angle = 0) {
  ensureTimekeeperList(state, "timekeeperBursts").push({
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

function pushTimekeeperSpark(state, x, y, angle, speed, life, size, color = TIMEKEEPER_COLORS.cyan) {
  ensureTimekeeperList(state, "timekeeperSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.12,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushTimekeeperEcho(state, x, y, radius) {
  ensureTimekeeperList(state, "timekeeperEchoes").push({
    x,
    y,
    radius,
    life: 24,
    maxLife: 24,
    seed: Math.random() * Math.PI * 2,
  });
}

function clampTeleportTarget(state, x, y) {
  const player = state.player;
  const margin = player?.radius || 14;
  const maxX = Math.max(margin, (state.world?.width || x) - margin);
  const maxY = Math.max(margin, (state.world?.height || y) - margin);
  return {
    x: Math.max(margin, Math.min(maxX, x)),
    y: Math.max(margin, Math.min(maxY, y)),
  };
}

function updateTimekeeperVfx(state) {
  if (state.timekeeperBursts) {
    for (let i = state.timekeeperBursts.length - 1; i >= 0; i--) {
      state.timekeeperBursts[i].life--;
      if (state.timekeeperBursts[i].life <= 0) state.timekeeperBursts.splice(i, 1);
    }
  }

  if (state.timekeeperSparks) {
    for (let i = state.timekeeperSparks.length - 1; i >= 0; i--) {
      const p = state.timekeeperSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.timekeeperSparks.splice(i, 1);
    }
  }

  if (state.timekeeperEchoes) {
    for (let i = state.timekeeperEchoes.length - 1; i >= 0; i--) {
      state.timekeeperEchoes[i].life--;
      if (state.timekeeperEchoes[i].life <= 0) state.timekeeperEchoes.splice(i, 1);
    }
  }
}

function drawClockRing(ctx, radius, frameCount, alpha = 1, color = TIMEKEEPER_COLORS.cyan, reverse = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * (reverse ? -0.024 : 0.024));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(frameCount * (reverse ? 0.05 : -0.05));
  ctx.strokeStyle = "rgba(233, 251, 255, 0.56)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.66, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(233, 251, 255, 0.78)";
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const tickLen = i % 3 === 0 ? 8 : 4;
    ctx.save();
    ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.rotate(a);
    ctx.fillRect(-1, -tickLen * 0.5, 2, tickLen);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(159, 238, 255, 0.78)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -radius * 0.54);
  ctx.moveTo(0, 0);
  ctx.lineTo(radius * 0.38, 0);
  ctx.stroke();
  ctx.restore();
}

function drawHourglass(ctx, radius, active = false) {
  ctx.save();
  ctx.strokeStyle = active ? TIMEKEEPER_COLORS.white : TIMEKEEPER_COLORS.cyan;
  ctx.fillStyle = active ? "rgba(159, 238, 255, 0.38)" : "rgba(91, 200, 255, 0.22)";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = active ? 18 : 9;
  ctx.shadowColor = active ? TIMEKEEPER_COLORS.white : TIMEKEEPER_COLORS.blue;

  ctx.beginPath();
  ctx.moveTo(-radius * 0.46, -radius * 0.72);
  ctx.lineTo(radius * 0.46, -radius * 0.72);
  ctx.lineTo(radius * 0.08, 0);
  ctx.lineTo(radius * 0.46, radius * 0.72);
  ctx.lineTo(-radius * 0.46, radius * 0.72);
  ctx.lineTo(-radius * 0.08, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = active ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.pale;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.3, -radius * 0.52);
  ctx.lineTo(radius * 0.3, -radius * 0.52);
  ctx.lineTo(0, -radius * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, radius * 0.08);
  ctx.lineTo(radius * 0.3, radius * 0.52);
  ctx.lineTo(-radius * 0.3, radius * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTimekeeperBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.2 + progress * 0.96);
  const isE = burst.type === "e";
  const isR = burst.type === "r";
  const color = isR ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.cyan;

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.24})`);
  glow.addColorStop(0.42, isR ? `rgba(255, 226, 138, ${alpha * 0.22})` : `rgba(91, 200, 255, ${alpha * 0.2})`);
  glow.addColorStop(1, "rgba(7, 19, 31, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isE ? -0.055 : 0.04));
  ctx.shadowBlur = isE ? 24 : 16;
  ctx.shadowColor = color;
  drawClockRing(ctx, radius * 0.5, frameCount, alpha * 0.88, color, isE);
  ctx.restore();

  ctx.save();
  ctx.rotate(burst.angle || 0);
  ctx.strokeStyle = `rgba(233, 251, 255, ${alpha * 0.66})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.62, i * radius * 0.08);
    ctx.lineTo(radius * 0.72, i * radius * 0.08);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawTimekeeperSpark(ctx, spark) {
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
  ctx.roundRect(-spark.size * 1.9, -spark.size * 0.34, spark.size * 3.8, spark.size * 0.68, 2);
  ctx.fill();
  ctx.restore();
}

function drawTimekeeperEcho(ctx, echo, frameCount) {
  const alpha = Math.max(0, echo.life / echo.maxLife);

  ctx.save();
  ctx.translate(echo.x, echo.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(Math.sin(frameCount * 0.06 + echo.seed) * 0.08);
  ctx.globalAlpha = alpha * 0.48;
  drawClockRing(ctx, echo.radius * 1.6, frameCount, 0.7, TIMEKEEPER_COLORS.cyan, true);
  drawTimekeeperBody(ctx, echo.radius, true, alpha * 0.52);
  ctx.restore();
}

function drawTimekeeperBody(ctx, radius, active = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;

  const body = ctx.createRadialGradient(-radius * 0.34, -radius * 0.45, radius * 0.08, 0, 0, radius * 1.35);
  body.addColorStop(0, TIMEKEEPER_COLORS.white);
  body.addColorStop(0.22, TIMEKEEPER_COLORS.pale);
  body.addColorStop(0.5, TIMEKEEPER_COLORS.blue);
  body.addColorStop(0.82, TIMEKEEPER_COLORS.deep);
  body.addColorStop(1, TIMEKEEPER_COLORS.void);
  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 24 : 13;
  ctx.shadowColor = active ? TIMEKEEPER_COLORS.white : TIMEKEEPER_COLORS.blue;
  ctx.beginPath();
  ctx.roundRect(-radius * 0.74, -radius * 0.86, radius * 1.48, radius * 1.72, radius * 0.2);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(233, 251, 255, 0.82)" : "rgba(159, 238, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(7, 19, 31, 0.72)";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.22, radius * 0.46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = active ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.cyan;
  ctx.shadowBlur = active ? 12 : 8;
  ctx.shadowColor = active ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.cyan;
  ctx.beginPath();
  ctx.arc(0, -radius * 0.24, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, radius * 0.24);
  drawHourglass(ctx, radius * 0.42, active);
  ctx.restore();

  ctx.restore();
}

export function drawTimekeeperPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isE ? 3.35 : isR ? 2.75 : isQ ? 2.55 : 1.75);
  const aura = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.24)" : "rgba(159, 238, 255, 0.08)");
  aura.addColorStop(0.5, isR ? "rgba(255, 226, 138, 0.14)" : "rgba(91, 200, 255, 0.16)");
  aura.addColorStop(1, "rgba(7, 19, 31, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isE ? -0.045 : 0.03));
    ctx.shadowBlur = isE ? 24 : 16;
    ctx.shadowColor = isR ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.cyan;
    drawClockRing(ctx, R * (1.55 + pulse * 0.1), fc, isR ? 0.82 : 0.68, isR ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.cyan, isE);
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(-fc * 0.018);
  ctx.strokeStyle = "rgba(159, 238, 255, 0.42)";
  ctx.lineWidth = 1.3;
  ctx.setLineDash([8, 9]);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.85, R * 0.72, Math.PI * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  drawTimekeeperBody(ctx, R, active);

  if (isQ) {
    ctx.save();
    ctx.rotate(fc * 0.07);
    ctx.strokeStyle = "rgba(233, 251, 255, 0.76)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.08 + pulse * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (isE) {
    ctx.save();
    ctx.rotate(-fc * 0.06);
    ctx.strokeStyle = "rgba(159, 238, 255, 0.7)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([20, 11]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.7 + pulse * 0.16), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(159, 238, 255, 0.58)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const timekeeper = {
  id: "timekeeper",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const aim = Math.atan2((mouse?.y ?? player.y) - player.y, (mouse?.x ?? player.x + 100) - player.x);

    if (key === "q") {
      const from = { x: player.x, y: player.y };
      const target = clampTeleportTarget(state, mouse?.x ?? player.x, mouse?.y ?? player.y);

      pushTimekeeperEcho(state, player.x, player.y, player.radius);
      pushTimekeeperBurst(state, "q", from.x, from.y, 125, 34, aim);

      player.x = target.x;
      player.y = target.y;
      player.gracePeriod = Math.max(player.gracePeriod || 0, 18);

      pushTimekeeperEcho(state, player.x, player.y, player.radius);
      pushTimekeeperBurst(state, "q", player.x, player.y, 145, 38, aim);
      for (let i = 0; i < 14; i++) {
        pushTimekeeperSpark(
          state,
          player.x,
          player.y,
          Math.random() * Math.PI * 2,
          1.1 + Math.random() * 2.1,
          24,
          2,
          i % 3 === 0 ? TIMEKEEPER_COLORS.white : TIMEKEEPER_COLORS.cyan,
        );
      }

      state.activeBuffs.q = 24;
    }

    if (key === "e") {
      state.activeBuffs.e = 3 * FPS;
      state.screenShake = { timer: 10, intensity: 5 };
      pushTimekeeperBurst(state, "e", player.x, player.y, 230, 44, aim);
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI * 2 / 20;
        pushTimekeeperSpark(state, player.x, player.y, a, 1 + Math.random() * 1.8, 28, 2.2, i % 2 === 0 ? TIMEKEEPER_COLORS.cyan : TIMEKEEPER_COLORS.pale);
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 4 * FPS;
      pushTimekeeperBurst(state, "r", player.x, player.y, 165, 38, aim);
      for (let i = 0; i < 16; i++) {
        pushTimekeeperSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.9 + Math.random() * 2, 24, 2, i % 3 === 0 ? TIMEKEEPER_COLORS.gold : TIMEKEEPER_COLORS.blue);
      }
    }

    return true;
  },

  update: (state) => {
    const { player, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.e > 0) {
      state.timeFrozenModifier = true;
      if (fc % 12 === 0) {
        pushTimekeeperSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.35, 22, 1.7, TIMEKEEPER_COLORS.white);
      }
    }

    if (buffs.r > 0) {
      state.playerSpeedMultiplier *= 1.6;
      state.playerFireRateMultiplier *= 0.3;
      if (fc % 5 === 0) {
        pushTimekeeperEcho(state, player.x, player.y, player.radius);
      }
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "timekeeper" || b.timekeeperPrepared) return;

      b.timekeeperPrepared = true;
      b.visualStyle = "timekeeper_space";

      if (buffs.q > 0) {
        b.timekeeperBlink = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.e > 0) {
        b.timekeeperFrozen = true;
        b.pierce = true;
      }

      if (buffs.r > 0) {
        b.timekeeperLoop = true;
        b.radius = Math.max(b.radius || 4, 5);
        b.life = Math.max(b.life || 0, 260);
      }
    });

    updateTimekeeperVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.timekeeperEchoes?.forEach((echo) => drawTimekeeperEcho(ctx, echo, fc));

    if (buffs.e > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(91, 200, 255, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(233, 251, 255, 0.82)";
      for (let i = 0; i < 58; i++) {
        const hx = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
        const hy = (Math.cos(i * 321.77) * 0.5 + 0.5) * canvas.height;
        const size = i % 5 === 0 ? 3 : 2;
        ctx.fillRect(hx, hy, size, size);
      }
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.12) * 6;
      const field = ctx.createRadialGradient(0, 0, 18, 0, 0, 260 + pulse);
      field.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      field.addColorStop(0.55, "rgba(91, 200, 255, 0.1)");
      field.addColorStop(1, "rgba(91, 200, 255, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 260 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawClockRing(ctx, 108 + pulse * 0.24, fc, 0.7, TIMEKEEPER_COLORS.cyan, true);
      ctx.restore();
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.22) * 4;
      ctx.strokeStyle = "rgba(255, 226, 138, 0.55)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 8]);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 24 + i * 12 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    state.timekeeperBursts?.forEach((burst) => drawTimekeeperBurst(ctx, burst, fc));
    state.timekeeperSparks?.forEach((spark) => drawTimekeeperSpark(ctx, spark));
  },
};
