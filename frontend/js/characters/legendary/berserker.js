import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";

const BERSERKER_COLORS = {
  black: "#16090b",
  armor: "#351116",
  red: "#ff263d",
  blood: "#a80718",
  ember: "#ff8a2a",
  bone: "#ffe4c0",
  pale: "#fff1ea",
};

function ensureBerserkerList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushBerserkerBurst(state, type, x, y, radius, life, angle = 0) {
  ensureBerserkerList(state, "berserkerBursts").push({
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

function pushBerserkerSpark(state, x, y, angle, speed, life, size, color = BERSERKER_COLORS.red) {
  ensureBerserkerList(state, "berserkerSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.22,
    life,
    maxLife: life,
    size,
    color,
  });
}

function updateBerserkerVfx(state) {
  if (state.berserkerBursts) {
    for (let i = state.berserkerBursts.length - 1; i >= 0; i--) {
      state.berserkerBursts[i].life--;
      if (state.berserkerBursts[i].life <= 0) state.berserkerBursts.splice(i, 1);
    }
  }

  if (state.berserkerSparks) {
    for (let i = state.berserkerSparks.length - 1; i >= 0; i--) {
      const p = state.berserkerSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.berserkerSparks.splice(i, 1);
    }
  }
}

function drawAxeHead(ctx, radius) {
  ctx.beginPath();
  ctx.moveTo(radius * 0.95, 0);
  ctx.quadraticCurveTo(radius * 0.28, -radius * 0.95, -radius * 0.45, -radius * 0.42);
  ctx.lineTo(-radius * 0.12, 0);
  ctx.lineTo(-radius * 0.45, radius * 0.42);
  ctx.quadraticCurveTo(radius * 0.28, radius * 0.95, radius * 0.95, 0);
  ctx.closePath();
}

function drawBrutalAxe(ctx, length, width, hot = false) {
  ctx.lineCap = "round";
  ctx.strokeStyle = hot ? BERSERKER_COLORS.red : BERSERKER_COLORS.bone;
  ctx.lineWidth = width * 0.28;
  ctx.shadowBlur = hot ? 18 : 8;
  ctx.shadowColor = hot ? BERSERKER_COLORS.red : BERSERKER_COLORS.ember;
  ctx.beginPath();
  ctx.moveTo(-length * 0.45, 0);
  ctx.lineTo(length * 0.36, 0);
  ctx.stroke();

  ctx.save();
  ctx.translate(length * 0.42, 0);
  ctx.fillStyle = hot ? BERSERKER_COLORS.red : "#5d1b23";
  ctx.strokeStyle = BERSERKER_COLORS.bone;
  ctx.lineWidth = width * 0.08;
  drawAxeHead(ctx, width);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = hot ? BERSERKER_COLORS.pale : BERSERKER_COLORS.ember;
  ctx.beginPath();
  ctx.arc(width * 0.02, 0, width * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawClawRing(ctx, radius, color, alpha, teeth = 12) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const inner = radius * 0.82;
    const outer = radius * (1.03 + (i % 2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.05) * inner, Math.sin(a - 0.05) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.lineTo(Math.cos(a + 0.05) * inner, Math.sin(a + 0.05) * inner);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBerserkerBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.24 + progress * 0.95);
  const isR = burst.type === "r";
  const isE = burst.type === "e";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 241, 234, ${alpha * 0.22})`);
  glow.addColorStop(0.44, isR ? `rgba(255, 38, 61, ${alpha * 0.28})` : `rgba(255, 138, 42, ${alpha * 0.22})`);
  glow.addColorStop(1, "rgba(22, 9, 11, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.07 : 0.045));
  ctx.shadowBlur = isR ? 24 : 16;
  ctx.shadowColor = isR ? BERSERKER_COLORS.red : BERSERKER_COLORS.ember;
  drawClawRing(
    ctx,
    radius * (isE ? 0.48 : 0.42),
    isR ? BERSERKER_COLORS.red : BERSERKER_COLORS.ember,
    alpha * 0.78,
    isE ? 16 : 12,
  );
  ctx.restore();

  const cuts = isE ? 12 : isR ? 18 : 10;
  ctx.lineCap = "round";
  for (let i = 0; i < cuts; i++) {
    const a = burst.seed + (i / cuts) * Math.PI * 2 + (isR ? frameCount * 0.03 : 0);
    const inner = radius * (0.18 + (i % 3) * 0.03);
    const outer = radius * (0.72 + (i % 2) * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a + 0.12) * outer, Math.sin(a + 0.12) * outer);
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(255, 241, 234, ${alpha * 0.62})`
      : `rgba(255, 38, 61, ${alpha * 0.58})`;
    ctx.lineWidth = isR ? 3 : 2;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(burst.angle);
    drawBrutalAxe(ctx, Math.max(36, radius * 0.38), Math.max(16, radius * 0.12), true);
    ctx.restore();
  }

  ctx.restore();
}

function drawBerserkerSpark(ctx, spark) {
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
  ctx.moveTo(spark.size * 2.2, 0);
  ctx.lineTo(-spark.size * 1.2, -spark.size * 0.48);
  ctx.lineTo(-spark.size * 0.55, 0);
  ctx.lineTo(-spark.size * 1.2, spark.size * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBerserkerPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.2) + 1) * 0.5;
  const faceAngle = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3.15 : isQ ? 2.55 : isE ? 2.35 : 1.82);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 241, 234, 0.24)" : "rgba(255, 38, 61, 0.09)");
  aura.addColorStop(0.46, isR ? "rgba(255, 38, 61, 0.22)" : "rgba(168, 7, 24, 0.16)");
  aura.addColorStop(1, "rgba(22, 9, 11, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(-fc * (isR ? 0.055 : 0.028));
    ctx.shadowBlur = isR ? 22 : 14;
    ctx.shadowColor = isR ? BERSERKER_COLORS.red : BERSERKER_COLORS.ember;
    drawClawRing(
      ctx,
      R * (1.48 + pulse * 0.12),
      isR ? "rgba(255, 38, 61, 0.72)" : "rgba(255, 138, 42, 0.54)",
      0.85,
      isR ? 14 : 10,
    );
    ctx.restore();
  }

  if (isQ || isR) {
    const dx = Math.cos(faceAngle);
    const dy = Math.sin(faceAngle);
    const px = -dy;
    const py = dx;
    const trail = ctx.createLinearGradient(-dx * R * 3.5, -dy * R * 3.5, dx * R * 1.2, dy * R * 1.2);
    trail.addColorStop(0, "rgba(255, 38, 61, 0)");
    trail.addColorStop(0.55, "rgba(255, 38, 61, 0.22)");
    trail.addColorStop(1, "rgba(255, 241, 234, 0.42)");
    ctx.beginPath();
    ctx.moveTo(dx * R * 1.25, dy * R * 1.25);
    ctx.lineTo(-dx * R * 3.2 + px * R * 0.88, -dy * R * 3.2 + py * R * 0.88);
    ctx.lineTo(-dx * R * 2.5 - px * R * 0.88, -dy * R * 2.5 - py * R * 0.88);
    ctx.closePath();
    ctx.fillStyle = trail;
    ctx.fill();
  }

  const body = ctx.createRadialGradient(-R * 0.36, -R * 0.45, R * 0.08, 0, 0, R * 1.35);
  body.addColorStop(0, BERSERKER_COLORS.pale);
  body.addColorStop(0.22, BERSERKER_COLORS.red);
  body.addColorStop(0.56, BERSERKER_COLORS.armor);
  body.addColorStop(1, BERSERKER_COLORS.black);
  ctx.shadowBlur = active ? 28 : 14;
  ctx.shadowColor = active ? BERSERKER_COLORS.red : BERSERKER_COLORS.blood;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.05);
  ctx.lineTo(R * 0.82, -R * 0.42);
  ctx.lineTo(R * 0.6, R * 0.86);
  ctx.lineTo(0, R * 1.1);
  ctx.lineTo(-R * 0.6, R * 0.86);
  ctx.lineTo(-R * 0.82, -R * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 138, 42, 0.82)" : "rgba(255, 38, 61, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = BERSERKER_COLORS.black;
  ctx.beginPath();
  ctx.arc(0, -R * 0.18, R * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isR ? BERSERKER_COLORS.pale : BERSERKER_COLORS.red;
  ctx.shadowBlur = isR ? 12 : 7;
  ctx.shadowColor = BERSERKER_COLORS.red;
  ctx.beginPath();
  ctx.moveTo(-R * 0.22, -R * 0.22);
  ctx.lineTo(-R * 0.04, -R * 0.13);
  ctx.lineTo(-R * 0.22, -R * 0.08);
  ctx.closePath();
  ctx.moveTo(R * 0.22, -R * 0.22);
  ctx.lineTo(R * 0.04, -R * 0.13);
  ctx.lineTo(R * 0.22, -R * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = BERSERKER_COLORS.bone;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.45, -R * 0.64);
  ctx.lineTo(-R * 0.8, -R * 0.98);
  ctx.moveTo(R * 0.45, -R * 0.64);
  ctx.lineTo(R * 0.8, -R * 0.98);
  ctx.stroke();

  ctx.save();
  ctx.rotate(faceAngle);
  ctx.translate(R * 0.38, R * 0.14);
  drawBrutalAxe(ctx, R * 2.55, R * 0.66, isQ || isR);
  ctx.restore();

  ctx.save();
  ctx.rotate(faceAngle + Math.PI * 0.9);
  ctx.translate(R * 0.22, -R * 0.26);
  ctx.globalAlpha = isR ? 0.95 : 0.72;
  drawBrutalAxe(ctx, R * 1.85, R * 0.5, isR);
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.24, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 138, 42, 0.58)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const berserker = {
  id: "berserker",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;
    const aim = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);

    if (key === "q") {
      state.activeBuffs.q = 4 * FPS;
      pushBerserkerBurst(state, "q", player.x, player.y, 130, 34, aim);
      for (let i = 0; i < 12; i++) {
        pushBerserkerSpark(
          state,
          player.x,
          player.y,
          aim + Math.PI + (Math.random() - 0.5) * 1.2,
          1.6 + Math.random() * 2.8,
          22,
          2 + Math.random() * 2,
          i % 3 === 0 ? BERSERKER_COLORS.ember : BERSERKER_COLORS.red,
        );
      }
    }

    if (key === "e") {
      const prevLen = state.bullets.length;
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 6) {
        spawnBullet(player.x, player.y, player.x + Math.cos(i), player.y + Math.sin(i), true);
      }
      for (let i = prevLen; i < state.bullets.length; i++) {
        state.bullets[i].life = 15;
        state.bullets[i].damage = 3;
        state.bullets[i].radius = 12;
        state.bullets[i].color = BERSERKER_COLORS.red;
        state.bullets[i].visualStyle = "berserker_rage";
        state.bullets[i].berserkerCleave = true;
      }
      state.activeBuffs.e = 15;
      state.screenShake = { timer: 7, intensity: 5 };
      pushBerserkerBurst(state, "e", player.x, player.y, 165, 28, aim);
    }

    if (key === "r") {
      if (player.hp > 1) {
        player.hp--;
        updateHealthUI();
      }
      state.activeBuffs.r = 6 * FPS;
      state.screenShake = { timer: 15, intensity: 8 };
      pushBerserkerBurst(state, "r", player.x, player.y, 185, 44, aim);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        pushBerserkerSpark(state, player.x, player.y, a, 1.5 + Math.random() * 3, 30, 2.4, i % 2 === 0 ? BERSERKER_COLORS.red : BERSERKER_COLORS.ember);
      }
    }

    return true;
  },

  update: (state) => {
    const { ghosts, player, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      state.playerSpeedMultiplier *= 1.35;
      state.playerFireRateMultiplier *= 0.5;
      if (fc % 5 === 0) {
        const angle = Math.random() * Math.PI * 2;
        pushBerserkerSpark(state, player.x, player.y, angle, 0.8 + Math.random() * 1.4, 16, 1.8, BERSERKER_COLORS.ember);
      }
    }

    if (buffs.r > 0) {
      state.playerMultiShotModifier += 2;

      ghosts.forEach((g) => {
        if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 140) {
          g.isStunned = Math.max(g.isStunned || 0, 60);
          g.hp -= 0.15;
          if (fc % 10 === 0) {
            pushBerserkerSpark(state, g.x, g.y, Math.random() * Math.PI * 2, 0.9, 16, 2, BERSERKER_COLORS.red);
          }
        }
      });
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "berserker" || b.berserkerPrepared) return;

      b.berserkerPrepared = true;
      b.visualStyle = "berserker_rage";

      if (buffs.q > 0) {
        b.berserkerFrenzy = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.r > 0) {
        b.berserkerBlood = true;
        b.damage = (b.damage || 1) * 1.25;
        b.radius = Math.max(b.radius || 4, 6);
      }
    });

    updateBerserkerVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.rotate(fc * 0.08);
      ctx.strokeStyle = "rgba(255, 138, 42, 0.62)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 28 + Math.sin(fc * 0.2) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (buffs.e > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.rotate(-fc * 0.18);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.strokeStyle = "rgba(255, 38, 61, 0.72)";
        ctx.lineWidth = 4;
        ctx.shadowBlur = 16;
        ctx.shadowColor = BERSERKER_COLORS.red;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 36, -0.18, 0.34);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.min(0.65, buffs.r / (6 * FPS));
      const pulse = Math.sin(fc * 0.22) * 4;
      ctx.fillStyle = `rgba(168, 7, 24, ${alpha * 0.12})`;
      ctx.beginPath();
      ctx.arc(0, 0, 140 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 38, 61, ${0.34 + alpha * 0.28})`;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([18, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 140 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = `rgba(120, 0, 16, ${alpha * 0.09})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    state.berserkerBursts?.forEach((burst) => drawBerserkerBurst(ctx, burst, fc));
    state.berserkerSparks?.forEach((spark) => drawBerserkerSpark(ctx, spark));
  },
};
