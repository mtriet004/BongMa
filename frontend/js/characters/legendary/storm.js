import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const STORM_COLORS = {
  deep: "#05151d",
  cloud: "#123846",
  blue: "#27d7ff",
  cyan: "#7dfff7",
  white: "#f4ffff",
  green: "#7cffc4",
  gold: "#e8ff8a",
};

function ensureStormList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushStormBurst(state, type, x, y, radius, life, angle = 0) {
  ensureStormList(state, "stormBursts").push({
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

function pushStormSpark(state, x, y, angle, speed, life, size, color = STORM_COLORS.cyan) {
  ensureStormList(state, "stormSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.18,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushStormTrail(state, x, y, radius = 48) {
  ensureStormList(state, "stormTrails").push({
    x,
    y,
    radius,
    life: 4 * FPS,
    maxLife: 4 * FPS,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushStormStrike(state, x, y, radius = 132, life = 20) {
  ensureStormList(state, "stormStrikes").push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    seed: Math.random() * Math.PI * 2,
  });
}

function updateStormVfx(state) {
  if (state.stormBursts) {
    for (let i = state.stormBursts.length - 1; i >= 0; i--) {
      state.stormBursts[i].life--;
      if (state.stormBursts[i].life <= 0) state.stormBursts.splice(i, 1);
    }
  }

  if (state.stormSparks) {
    for (let i = state.stormSparks.length - 1; i >= 0; i--) {
      const p = state.stormSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.stormSparks.splice(i, 1);
    }
  }

  if (state.stormTrails) {
    for (let i = state.stormTrails.length - 1; i >= 0; i--) {
      state.stormTrails[i].life--;
      if (state.stormTrails[i].life <= 0) state.stormTrails.splice(i, 1);
    }
  }

  if (state.stormStrikes) {
    for (let i = state.stormStrikes.length - 1; i >= 0; i--) {
      state.stormStrikes[i].life--;
      if (state.stormStrikes[i].life <= 0) state.stormStrikes.splice(i, 1);
    }
  }

  if (state.stormChain) {
    state.stormChain.life--;
    if (state.stormChain.life <= 0) state.stormChain = null;
  }
}

function drawJaggedBolt(ctx, x1, y1, x2, y2, steps = 7, jitter = 18) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
    const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(x2, y2);
}

function drawCycloneRing(ctx, radius, frameCount, alpha = 1, color = STORM_COLORS.cyan, reverse = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * (reverse ? -0.045 : 0.045));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.15, radius * 0.48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(124, 255, 196, 0.45)";
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.42 + i * 0.2), i * 0.8, i * 0.8 + Math.PI * 1.25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStormCore(ctx, radius, active = false) {
  ctx.save();
  const body = ctx.createRadialGradient(-radius * 0.32, -radius * 0.46, radius * 0.08, 0, 0, radius * 1.35);
  body.addColorStop(0, STORM_COLORS.white);
  body.addColorStop(0.2, STORM_COLORS.cyan);
  body.addColorStop(0.5, STORM_COLORS.blue);
  body.addColorStop(0.82, STORM_COLORS.cloud);
  body.addColorStop(1, STORM_COLORS.deep);
  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 26 : 14;
  ctx.shadowColor = active ? STORM_COLORS.cyan : STORM_COLORS.blue;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.04);
  ctx.quadraticCurveTo(radius * 0.78, -radius * 0.62, radius * 0.58, radius * 0.76);
  ctx.quadraticCurveTo(radius * 0.18, radius * 1.08, 0, radius * 0.86);
  ctx.quadraticCurveTo(-radius * 0.18, radius * 1.08, -radius * 0.58, radius * 0.76);
  ctx.quadraticCurveTo(-radius * 0.78, -radius * 0.62, 0, -radius * 1.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(244, 255, 255, 0.84)" : "rgba(39, 215, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5, 21, 29, 0.72)";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.22, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = active ? STORM_COLORS.gold : STORM_COLORS.cyan;
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = active ? STORM_COLORS.gold : STORM_COLORS.cyan;
  drawJaggedBolt(
    ctx,
    -radius * 0.18,
    -radius * 0.42,
    radius * 0.1,
    -radius * 0.08,
    4,
    radius * 0.18,
  );
  ctx.stroke();

  ctx.strokeStyle = "rgba(244, 255, 255, 0.62)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.34, radius * 0.26);
  ctx.quadraticCurveTo(0, radius * 0.5, radius * 0.34, radius * 0.26);
  ctx.stroke();
  ctx.restore();
}

function drawStormBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.2 + progress * 0.96);
  const isR = burst.type === "r";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.28})`);
  glow.addColorStop(0.36, isR ? `rgba(124, 255, 196, ${alpha * 0.23})` : `rgba(39, 215, 255, ${alpha * 0.22})`);
  glow.addColorStop(1, "rgba(5, 21, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.075 : 0.05));
  ctx.shadowBlur = isR ? 26 : 18;
  ctx.shadowColor = isR ? STORM_COLORS.green : STORM_COLORS.cyan;
  drawCycloneRing(ctx, radius * 0.5, frameCount, alpha * 0.86, isR ? STORM_COLORS.green : STORM_COLORS.cyan);
  ctx.restore();

  ctx.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const a = burst.seed + i * Math.PI * 2 / 10 + frameCount * 0.035;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2);
    ctx.lineTo(Math.cos(a + 0.12) * radius * 0.78, Math.sin(a + 0.12) * radius * 0.78);
    ctx.strokeStyle = i % 2 === 0
      ? `rgba(244, 255, 255, ${alpha * 0.7})`
      : `rgba(39, 215, 255, ${alpha * 0.56})`;
    ctx.lineWidth = isR ? 3 : 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawStormSpark(ctx, spark) {
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
  ctx.roundRect(-spark.size * 1.9, -spark.size * 0.35, spark.size * 3.8, spark.size * 0.7, 2);
  ctx.fill();
  ctx.restore();
}

function drawStormTrail(ctx, trail, frameCount) {
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const radius = trail.radius * (0.82 + (1 - alpha) * 0.4);

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(trail.seed + frameCount * 0.09);
  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(244, 255, 255, ${alpha * 0.16})`);
  field.addColorStop(0.48, `rgba(39, 215, 255, ${alpha * 0.22})`);
  field.addColorStop(1, "rgba(5, 21, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = field;
  ctx.fill();
  drawCycloneRing(ctx, radius * 0.62, frameCount, alpha * 0.72, STORM_COLORS.cyan);
  ctx.restore();
}

function drawStormStrike(ctx, strike, frameCount) {
  const alpha = Math.max(0, strike.life / strike.maxLife);
  const radius = strike.radius * (0.72 + (1 - alpha) * 0.35);
  const topY = strike.y - 850;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 28;
  ctx.shadowColor = STORM_COLORS.cyan;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  drawJaggedBolt(ctx, strike.x + Math.sin(strike.seed) * 38, topY, strike.x, strike.y, 9, 60);
  ctx.strokeStyle = `rgba(124, 255, 196, ${alpha * 0.86})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  drawJaggedBolt(ctx, strike.x, topY, strike.x, strike.y, 7, 34);
  ctx.strokeStyle = `rgba(244, 255, 255, ${alpha * 0.9})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  const impact = ctx.createRadialGradient(strike.x, strike.y, 0, strike.x, strike.y, radius);
  impact.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.38})`);
  impact.addColorStop(0.38, `rgba(39, 215, 255, ${alpha * 0.26})`);
  impact.addColorStop(1, "rgba(5, 21, 29, 0)");
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = impact;
  ctx.fill();
  ctx.restore();
}

export function drawStormPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0 || !!state.stormChain;
  const isE = (buffs.e || 0) > 0 || player.dashTimeLeft > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.2) + 1) * 0.5;

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3.35 : isE ? 2.85 : isQ ? 2.55 : 1.9);
  const aura = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.28)" : "rgba(39, 215, 255, 0.1)");
  aura.addColorStop(0.48, isR ? "rgba(124, 255, 196, 0.2)" : "rgba(39, 215, 255, 0.17)");
  aura.addColorStop(1, "rgba(5, 21, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  ctx.save();
  ctx.rotate(fc * (isR ? 0.07 : 0.04));
  ctx.shadowBlur = active ? 22 : 12;
  ctx.shadowColor = active ? STORM_COLORS.cyan : STORM_COLORS.blue;
  drawCycloneRing(ctx, R * (1.58 + pulse * 0.12), fc, active ? 0.86 : 0.48, isR ? STORM_COLORS.green : STORM_COLORS.cyan);
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const a = fc * 0.055 + i * Math.PI * 2 / 3;
    ctx.save();
    ctx.translate(Math.cos(a) * R * 1.4, Math.sin(a) * R * 0.92);
    ctx.rotate(a);
    ctx.strokeStyle = "rgba(124, 255, 196, 0.42)";
    ctx.lineWidth = 1.6;
    ctx.shadowBlur = 10;
    ctx.shadowColor = STORM_COLORS.green;
    drawJaggedBolt(ctx, -R * 0.2, 0, R * 0.36, 0, 3, R * 0.22);
    ctx.stroke();
    ctx.restore();
  }

  drawStormCore(ctx, R, active);

  if (isE) {
    const dx = player.dashDx || 0;
    const dy = player.dashDy || 0;
    const px = -dy;
    const py = dx;
    const trail = ctx.createLinearGradient(-dx * R * 4, -dy * R * 4, dx * R * 1.2, dy * R * 1.2);
    trail.addColorStop(0, "rgba(39, 215, 255, 0)");
    trail.addColorStop(0.55, "rgba(39, 215, 255, 0.22)");
    trail.addColorStop(1, "rgba(244, 255, 255, 0.45)");
    ctx.beginPath();
    ctx.moveTo(dx * R * 1.25, dy * R * 1.25);
    ctx.lineTo(-dx * R * 3.8 + px * R * 0.86, -dy * R * 3.8 + py * R * 0.86);
    ctx.lineTo(-dx * R * 3 - px * R * 0.86, -dy * R * 3 - py * R * 0.86);
    ctx.closePath();
    ctx.fillStyle = trail;
    ctx.fill();
  }

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(124, 255, 196, 0.58)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const storm = {
  id: "storm",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const aim = Math.atan2((mouse?.y ?? player.y) - player.y, (mouse?.x ?? player.x + 100) - player.x);

    if (key === "q") {
      state.activeBuffs.q = 18;
      state.stormChain = { origin: { x: player.x, y: player.y }, targets: [], life: 18, maxLife: 18 };

      let current = player;
      const hit = [];
      for (let i = 0; i < 3; i++) {
        let nearest = null;
        let minDist = 430;

        state.ghosts.forEach((g) => {
          if (!hit.includes(g) && g.hp > 0 && g.x > 0) {
            const d = dist(current.x, current.y, g.x, g.y);
            if (d < minDist) {
              minDist = d;
              nearest = g;
            }
          }
        });

        if (!nearest) break;
        hit.push(nearest);
        nearest.hp -= 9;
        nearest.isStunned = Math.max(nearest.isStunned || 0, 60);
        state.stormChain.targets.push({ x: nearest.x, y: nearest.y });
        current = nearest;
      }

      pushStormBurst(state, "q", player.x, player.y, 150, 34, aim);
      for (let i = 0; i < 12; i++) {
        pushStormSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 1.2 + Math.random() * 2.2, 22, 2, i % 2 === 0 ? STORM_COLORS.cyan : STORM_COLORS.green);
      }
    }

    if (key === "e") {
      const dx = mouse.x - player.x;
      const dy = mouse.y - player.y;
      const len = Math.hypot(dx, dy) || 1;

      player.dashTimeLeft = 20;
      player.dashDx = dx / len;
      player.dashDy = dy / len;
      player.gracePeriod = Math.max(player.gracePeriod || 0, 16);
      state.activeBuffs.e = 20;
      pushStormBurst(state, "e", player.x, player.y, 140, 30, Math.atan2(dy, dx));
    }

    if (key === "r") {
      state.activeBuffs.r = 5 * FPS;
      state.screenShake = { timer: 20, intensity: 6 };
      pushStormBurst(state, "r", player.x, player.y, 210, 46, aim);
    }

    return true;
  },

  update: (state) => {
    const { player, ghosts, boss, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.e > 0 && fc % 4 === 0) {
      pushStormTrail(state, player.x, player.y, 54);
    }

    if (state.stormTrails) {
      state.stormTrails.forEach((t) => {
        ghosts.forEach((g) => {
          if (g.x > 0 && dist(t.x, t.y, g.x, g.y) < t.radius + (g.radius || 12)) {
            g.hp -= 0.45;
            g.isStunned = Math.max(g.isStunned || 0, 30);
          }
        });
      });
    }

    if (buffs.r > 0 && fc % 8 === 0) {
      for (let i = 0; i < 3; i++) {
        const lx = player.x + (Math.random() - 0.5) * 1200;
        const ly = player.y + (Math.random() - 0.5) * 900;
        pushStormStrike(state, lx, ly, 132, 20);

        ghosts.forEach((g) => {
          if (g.x > 0 && dist(lx, ly, g.x, g.y) < (g.radius || 12) + 130) {
            g.hp -= 6;
            g.isStunned = Math.max(g.isStunned || 0, 60);
          }
        });
        if (boss && dist(lx, ly, boss.x, boss.y) < (boss.radius || 40) + 130) boss.hp -= 10;
      }
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "storm" || b.stormPrepared) return;

      b.stormPrepared = true;
      b.visualStyle = "storm_bolt";

      if (buffs.q > 0) {
        b.stormCharged = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.e > 0) {
        b.stormGale = true;
        b.vx *= 1.12;
        b.vy *= 1.12;
      }

      if (buffs.r > 0) {
        b.stormTempest = true;
        b.damage = (b.damage || 1) * 1.2;
        b.bounces = Math.max(b.bounces || 0, 2);
      }
    });

    updateStormVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { frameCount } = state;
    const fc = frameCount || 0;

    state.stormTrails?.forEach((trail) => drawStormTrail(ctx, trail, fc));

    if (state.stormChain) {
      const { origin, targets, life, maxLife } = state.stormChain;
      const alpha = maxLife ? Math.max(0, life / maxLife) : 1;
      let sx = origin.x;
      let sy = origin.y;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      targets.forEach((target) => {
        drawJaggedBolt(ctx, sx, sy, target.x, target.y, 8, 28);
        ctx.strokeStyle = `rgba(124, 255, 196, ${alpha * 0.92})`;
        ctx.lineWidth = 7;
        ctx.shadowBlur = 22;
        ctx.shadowColor = STORM_COLORS.cyan;
        ctx.stroke();

        drawJaggedBolt(ctx, sx, sy, target.x, target.y, 6, 16);
        ctx.strokeStyle = `rgba(244, 255, 255, ${alpha * 0.88})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        sx = target.x;
        sy = target.y;
      });
      ctx.restore();
    }

    if (buffs.r > 0 && fc % 20 < 5) {
      ctx.save();
      ctx.fillStyle = "rgba(39, 215, 255, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    state.stormStrikes?.forEach((strike) => drawStormStrike(ctx, strike, fc));
    state.stormBursts?.forEach((burst) => drawStormBurst(ctx, burst, fc));
    state.stormSparks?.forEach((spark) => drawStormSpark(ctx, spark));
  },
};
