import { FPS } from "../../config.js";

const SHARPSHOOTER_COLORS = {
  deep: "#15121d",
  coat: "#302442",
  violet: "#b875ff",
  gold: "#ffd36a",
  pale: "#f7f1ff",
  crimson: "#ff4b6a",
};

function ensureSharpshooterList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushSharpshooterBurst(state, type, x, y, radius, life, angle = 0) {
  ensureSharpshooterList(state, "sharpshooterBursts").push({
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

function pushSharpshooterSpark(state, x, y, angle, speed, life, size, color = SHARPSHOOTER_COLORS.gold) {
  ensureSharpshooterList(state, "sharpshooterSparks").push({
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

function updateSharpshooterVfx(state) {
  if (state.sharpshooterBursts) {
    for (let i = state.sharpshooterBursts.length - 1; i >= 0; i--) {
      state.sharpshooterBursts[i].life--;
      if (state.sharpshooterBursts[i].life <= 0) state.sharpshooterBursts.splice(i, 1);
    }
  }

  if (state.sharpshooterSparks) {
    for (let i = state.sharpshooterSparks.length - 1; i >= 0; i--) {
      const p = state.sharpshooterSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.sharpshooterSparks.splice(i, 1);
    }
  }
}

function drawCrosshair(ctx, radius, frameCount, alpha = 1, color = SHARPSHOOTER_COLORS.gold) {
  ctx.save();
  ctx.rotate(frameCount * 0.018);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.58, Math.sin(a) * radius * 0.58);
    ctx.lineTo(Math.cos(a) * radius * 1.12, Math.sin(a) * radius * 1.12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEagleMark(ctx, radius) {
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.16);
  ctx.quadraticCurveTo(radius * 0.62, -radius * 0.62, radius * 1.02, -radius * 0.1);
  ctx.quadraticCurveTo(radius * 0.5, -radius * 0.04, radius * 0.2, radius * 0.34);
  ctx.lineTo(0, radius * 0.12);
  ctx.lineTo(-radius * 0.2, radius * 0.34);
  ctx.quadraticCurveTo(-radius * 0.5, -radius * 0.04, -radius * 1.02, -radius * 0.1);
  ctx.quadraticCurveTo(-radius * 0.62, -radius * 0.62, 0, -radius * 0.16);
  ctx.stroke();
}

function drawLongRifle(ctx, length, width) {
  ctx.fillStyle = SHARPSHOOTER_COLORS.deep;
  ctx.strokeStyle = SHARPSHOOTER_COLORS.gold;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-length * 0.46, -width * 0.34, length * 0.92, width * 0.68, 3);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = SHARPSHOOTER_COLORS.pale;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-length * 0.38, -width * 0.12);
  ctx.lineTo(length * 0.42, -width * 0.12);
  ctx.stroke();

  ctx.fillStyle = SHARPSHOOTER_COLORS.violet;
  ctx.beginPath();
  ctx.roundRect(-length * 0.12, -width * 0.72, length * 0.28, width * 0.26, 3);
  ctx.fill();

  ctx.fillStyle = SHARPSHOOTER_COLORS.gold;
  ctx.beginPath();
  ctx.arc(length * 0.48, 0, width * 0.17, 0, Math.PI * 2);
  ctx.fill();
}

function drawSharpshooterBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.94);
  const isR = burst.type === "r";
  const color = isR ? SHARPSHOOTER_COLORS.crimson : SHARPSHOOTER_COLORS.gold;

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.2})`);
  glow.addColorStop(0.44, isR ? `rgba(255, 75, 106, ${alpha * 0.16})` : `rgba(255, 211, 106, ${alpha * 0.16})`);
  glow.addColorStop(1, "rgba(21, 18, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * 0.025);
  ctx.strokeStyle = `rgba(247, 241, 255, ${alpha * 0.66})`;
  ctx.lineWidth = 2.2;
  drawCrosshair(ctx, radius * 0.5, frameCount, alpha, `rgba(247, 241, 255, ${alpha})`);
  ctx.restore();

  ctx.save();
  ctx.rotate(burst.angle || 0);
  ctx.strokeStyle = isR ? `rgba(255, 75, 106, ${alpha * 0.7})` : `rgba(255, 211, 106, ${alpha * 0.68})`;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 14;
  ctx.shadowColor = color;
  drawEagleMark(ctx, Math.max(14, radius * 0.18));
  ctx.restore();

  ctx.restore();
}

function drawSharpshooterSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = spark.color;
  ctx.shadowBlur = 10;
  ctx.shadowColor = spark.color;
  ctx.beginPath();
  ctx.roundRect(-spark.size * 1.6, -spark.size * 0.3, spark.size * 3.2, spark.size * 0.6, 2);
  ctx.fill();
  ctx.restore();
}

export function drawSharpshooterPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;
  const aim = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 2.35 : isE ? 2.1 : isQ ? 1.95 : 1.55);
  const aura = ctx.createRadialGradient(0, 0, R * 0.25, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(247, 241, 255, 0.24)" : "rgba(184, 117, 255, 0.08)");
  aura.addColorStop(0.55, isR ? "rgba(255, 75, 106, 0.12)" : "rgba(255, 211, 106, 0.1)");
  aura.addColorStop(1, "rgba(21, 18, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.03 : 0.018));
    ctx.strokeStyle = isR ? "rgba(255, 75, 106, 0.5)" : "rgba(255, 211, 106, 0.48)";
    ctx.lineWidth = isR ? 2.2 : 1.7;
    ctx.shadowBlur = 10;
    ctx.shadowColor = isR ? SHARPSHOOTER_COLORS.crimson : SHARPSHOOTER_COLORS.gold;
    drawCrosshair(ctx, R * (1.42 + pulse * 0.08), fc, 0.8, ctx.strokeStyle);
    ctx.restore();
  }

  const coat = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.08, 0, 0, R * 1.35);
  coat.addColorStop(0, SHARPSHOOTER_COLORS.pale);
  coat.addColorStop(0.24, SHARPSHOOTER_COLORS.violet);
  coat.addColorStop(0.58, SHARPSHOOTER_COLORS.coat);
  coat.addColorStop(1, SHARPSHOOTER_COLORS.deep);
  ctx.shadowBlur = active ? 22 : 12;
  ctx.shadowColor = active ? SHARPSHOOTER_COLORS.gold : SHARPSHOOTER_COLORS.violet;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.02);
  ctx.quadraticCurveTo(R * 0.84, -R * 0.58, R * 0.7, R * 0.84);
  ctx.lineTo(0, R * 1.06);
  ctx.lineTo(-R * 0.7, R * 0.84);
  ctx.quadraticCurveTo(-R * 0.84, -R * 0.58, 0, -R * 1.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 211, 106, 0.74)" : "rgba(184, 117, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(21, 18, 29, 0.84)";
  ctx.beginPath();
  ctx.arc(0, -R * 0.14, R * 0.43, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SHARPSHOOTER_COLORS.gold;
  ctx.beginPath();
  ctx.arc(-R * 0.15, -R * 0.17, R * 0.052, 0, Math.PI * 2);
  ctx.arc(R * 0.15, -R * 0.17, R * 0.052, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -R * 0.72);
  ctx.strokeStyle = SHARPSHOOTER_COLORS.gold;
  ctx.fillStyle = SHARPSHOOTER_COLORS.deep;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.9, R * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-R * 0.32, -R * 0.4, R * 0.64, R * 0.42, R * 0.1);
  ctx.fillStyle = SHARPSHOOTER_COLORS.coat;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(aim);
  ctx.translate(R * 0.34, R * 0.18);
  ctx.shadowBlur = isR ? 18 : 8;
  ctx.shadowColor = isR ? SHARPSHOOTER_COLORS.crimson : SHARPSHOOTER_COLORS.gold;
  drawLongRifle(ctx, R * 2.5, R * 0.45);
  if (isR) {
    ctx.fillStyle = "rgba(255, 75, 106, 0.86)";
    ctx.beginPath();
    ctx.arc(R * 1.18, 0, R * (0.12 + pulse * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(-0.48);
  ctx.strokeStyle = "rgba(255, 211, 106, 0.5)";
  ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.5 + i * R * 0.12, R * 0.5);
    ctx.lineTo(-R * 0.3 + i * R * 0.12, R * 0.98);
    ctx.stroke();
  }
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.26, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 211, 106, 0.56)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const sharpshooter = {
  id: "sharpshooter",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const angle = Math.atan2((mouse?.y ?? player.y) - player.y, (mouse?.x ?? player.x + 100) - player.x);

    if (key === "q") {
      state.activeBuffs.q = 5 * FPS;
      pushSharpshooterBurst(state, "q", player.x, player.y, 115, 34, angle);
    }

    if (key === "e") {
      state.activeBuffs.e = 5 * FPS;
      pushSharpshooterBurst(state, "e", player.x, player.y, 130, 34, angle);
      for (let i = -2; i <= 2; i++) {
        pushSharpshooterSpark(
          state,
          player.x,
          player.y,
          angle + i * 0.12,
          1.6 + Math.random() * 1.8,
          22,
          2,
          i === 0 ? SHARPSHOOTER_COLORS.pale : SHARPSHOOTER_COLORS.gold,
        );
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 8 * FPS;
      state.screenShake = { timer: 10, intensity: 3 };
      pushSharpshooterBurst(state, "r", player.x, player.y, 150, 42, angle);
    }

    return true;
  },

  update: (state) => {
    const { player, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      state.playerBouncesModifier = (state.playerBouncesModifier || player.bounces || 0) + 3;
      if (fc % 18 === 0) {
        pushSharpshooterSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.45, 18, 1.5, SHARPSHOOTER_COLORS.gold);
      }
    }

    if (buffs.e > 0) {
      state.playerMultiShotModifier = (state.playerMultiShotModifier || player.multiShot || 1) + 4;
    }

    if (buffs.r > 0) {
      state.playerFireRateMultiplier *= 0.35;
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "sharpshooter" || b.sharpshooterPrepared) return;

      b.sharpshooterPrepared = true;
      b.visualStyle = "sharpshooter_mark";

      if (buffs.q > 0) {
        b.bounces = Math.max(b.bounces || 0, 3);
        b.sharpshooterRicochet = true;
      }

      if (buffs.e > 0) {
        b.radius = Math.max(b.radius || 4, 5);
        b.sharpshooterVolley = true;
      }

      if (buffs.r > 0) {
        b.pierce = true;
        b.damage = (b.damage || 1) * 1.5;
        b.radius = Math.max(b.radius || 4, 6);
        b.sharpshooterFocus = true;
      }
    });

    updateSharpshooterVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 211, 106, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 22 + Math.sin(fc * 0.12) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (buffs.e > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x));
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(184, 117, 255, 0.5)";
      ctx.lineWidth = 1.7;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(14, i * 8);
        ctx.lineTo(70, i * 16);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.min(0.55, buffs.r / (8 * FPS));
      ctx.strokeStyle = `rgba(255, 75, 106, ${0.35 + alpha * 0.25})`;
      ctx.lineWidth = 2;
      drawCrosshair(ctx, player.radius + 32, fc, 0.75, ctx.strokeStyle);
      ctx.restore();
    }

    state.sharpshooterBursts?.forEach((burst) => drawSharpshooterBurst(ctx, burst, fc));
    state.sharpshooterSparks?.forEach((spark) => drawSharpshooterSpark(ctx, spark));
  },
};
