import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

const VOID_COLORS = {
  void: "#050009",
  deep: "#12001f",
  plum: "#2a063d",
  violet: "#7a18ff",
  purple: "#b45cff",
  magenta: "#ff4dff",
  pale: "#f3dcff",
  white: "#ffffff",
};

function ensureVoidList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushVoidBurst(state, type, x, y, radius, life, angle = 0) {
  ensureVoidList(state, "voidBursts").push({
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

function pushVoidSpark(state, x, y, angle, speed, life, size, color = VOID_COLORS.purple) {
  ensureVoidList(state, "voidSparks").push({
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

function pushVoidRipple(state, x, y, radius, life = 28) {
  ensureVoidList(state, "voidRipples").push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    seed: Math.random() * Math.PI * 2,
  });
}

function updateVoidVfx(state) {
  if (state.voidBursts) {
    for (let i = state.voidBursts.length - 1; i >= 0; i--) {
      state.voidBursts[i].life--;
      if (state.voidBursts[i].life <= 0) state.voidBursts.splice(i, 1);
    }
  }

  if (state.voidSparks) {
    for (let i = state.voidSparks.length - 1; i >= 0; i--) {
      const p = state.voidSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.voidSparks.splice(i, 1);
    }
  }

  if (state.voidRipples) {
    for (let i = state.voidRipples.length - 1; i >= 0; i--) {
      state.voidRipples[i].life--;
      if (state.voidRipples[i].life <= 0) state.voidRipples.splice(i, 1);
    }
  }
}

function distToLine(p, v, w) {
  const l2 = dist(v.x, v.y, w.x, w.y) ** 2;
  if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
}

function drawVoidRing(ctx, radius, frameCount, alpha = 1, color = VOID_COLORS.purple, reverse = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * (reverse ? -0.035 : 0.035));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 8]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.16, radius * 0.48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(frameCount * (reverse ? 0.06 : -0.06));
  ctx.strokeStyle = "rgba(255, 77, 255, 0.55)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.74, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = VOID_COLORS.pale;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * radius * 0.94, Math.sin(a) * radius * 0.94, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVoidEye(ctx, radius, active = false) {
  ctx.save();
  ctx.shadowBlur = active ? 22 : 12;
  ctx.shadowColor = active ? VOID_COLORS.magenta : VOID_COLORS.violet;

  const iris = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  iris.addColorStop(0, VOID_COLORS.white);
  iris.addColorStop(0.22, VOID_COLORS.pale);
  iris.addColorStop(0.5, VOID_COLORS.purple);
  iris.addColorStop(1, VOID_COLORS.deep);
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? VOID_COLORS.magenta : VOID_COLORS.purple;
  ctx.lineWidth = 1.7;
  ctx.stroke();

  ctx.fillStyle = VOID_COLORS.void;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = VOID_COLORS.white;
  ctx.beginPath();
  ctx.arc(-radius * 0.1, -radius * 0.1, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVoidBody(ctx, radius, active = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;

  const body = ctx.createRadialGradient(-radius * 0.35, -radius * 0.42, radius * 0.08, 0, 0, radius * 1.35);
  body.addColorStop(0, VOID_COLORS.pale);
  body.addColorStop(0.2, VOID_COLORS.purple);
  body.addColorStop(0.52, VOID_COLORS.plum);
  body.addColorStop(0.86, VOID_COLORS.deep);
  body.addColorStop(1, VOID_COLORS.void);
  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 28 : 16;
  ctx.shadowColor = active ? VOID_COLORS.magenta : VOID_COLORS.violet;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.1);
  ctx.quadraticCurveTo(radius * 0.86, -radius * 0.58, radius * 0.7, radius * 0.74);
  ctx.lineTo(radius * 0.18, radius * 1.12);
  ctx.lineTo(0, radius * 0.82);
  ctx.lineTo(-radius * 0.18, radius * 1.12);
  ctx.lineTo(-radius * 0.7, radius * 0.74);
  ctx.quadraticCurveTo(-radius * 0.86, -radius * 0.58, 0, -radius * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 77, 255, 0.78)" : "rgba(180, 92, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5, 0, 9, 0.82)";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.22, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -radius * 0.22);
  drawVoidEye(ctx, radius * 0.36, active);
  ctx.restore();

  ctx.strokeStyle = "rgba(243, 220, 255, 0.56)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.28, radius * 0.22);
  ctx.lineTo(0, radius * 0.48);
  ctx.lineTo(radius * 0.28, radius * 0.22);
  ctx.stroke();

  ctx.restore();
}

function drawVoidBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.2 + progress * 0.96);
  const isR = burst.type === "r";
  const isE = burst.type === "e";
  const color = isR ? VOID_COLORS.magenta : VOID_COLORS.purple;

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.14})`);
  glow.addColorStop(0.38, isE ? `rgba(255, 77, 255, ${alpha * 0.24})` : `rgba(122, 24, 255, ${alpha * 0.22})`);
  glow.addColorStop(1, "rgba(5, 0, 9, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.07 : 0.045));
  ctx.shadowBlur = isR ? 28 : 18;
  ctx.shadowColor = color;
  drawVoidRing(ctx, radius * 0.5, frameCount, alpha * 0.9, color, isE);
  ctx.restore();

  ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = burst.seed + i * Math.PI * 2 / 12 + frameCount * 0.025;
    const inner = radius * 0.18;
    const outer = radius * (0.74 + (i % 2) * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a + 0.08) * outer, Math.sin(a + 0.08) * outer);
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(243, 220, 255, ${alpha * 0.62})`
      : `rgba(180, 92, 255, ${alpha * 0.52})`;
    ctx.lineWidth = isR ? 3 : 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawVoidSpark(ctx, spark) {
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
  ctx.lineTo(-spark.size * 1.2, -spark.size * 0.55);
  ctx.lineTo(-spark.size * 0.5, 0);
  ctx.lineTo(-spark.size * 1.2, spark.size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawVoidRipple(ctx, ripple, frameCount) {
  const alpha = Math.max(0, ripple.life / ripple.maxLife);
  const radius = ripple.radius * (0.25 + (1 - alpha) * 0.9);

  ctx.save();
  ctx.translate(ripple.x, ripple.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(ripple.seed + frameCount * 0.04);
  ctx.strokeStyle = `rgba(180, 92, 255, ${alpha * 0.68})`;
  ctx.lineWidth = 2.4;
  ctx.setLineDash([14, 8]);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.18, radius * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawVoidBlackhole(ctx, bh, frameCount) {
  const lifeRatio = bh.maxLife ? Math.max(0, bh.life / bh.maxLife) : 1;
  const pulse = Math.sin(frameCount * 0.16 + bh.seed) * 8;
  const core = Math.max(28, bh.radius * 0.2 + pulse);

  ctx.save();
  ctx.translate(bh.x, bh.y);
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, core * 0.2, 0, 0, bh.radius);
  field.addColorStop(0, `rgba(5, 0, 9, ${0.92 * lifeRatio})`);
  field.addColorStop(0.28, `rgba(42, 6, 61, ${0.7 * lifeRatio})`);
  field.addColorStop(0.62, `rgba(122, 24, 255, ${0.18 * lifeRatio})`);
  field.addColorStop(1, "rgba(5, 0, 9, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
  ctx.fillStyle = field;
  ctx.fill();

  ctx.save();
  ctx.rotate(frameCount * 0.08 + bh.seed);
  ctx.strokeStyle = `rgba(255, 77, 255, ${0.55 * lifeRatio})`;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 26;
  ctx.shadowColor = VOID_COLORS.magenta;
  ctx.beginPath();
  ctx.ellipse(0, 0, bh.radius * 0.42 + pulse, bh.radius * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(180, 92, 255, ${0.48 * lifeRatio})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, bh.radius * 0.62, bh.radius * 0.24 + pulse * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, core);
  coreGrad.addColorStop(0, "#000000");
  coreGrad.addColorStop(0.58, VOID_COLORS.void);
  coreGrad.addColorStop(1, "rgba(122, 24, 255, 0.2)");
  ctx.beginPath();
  ctx.arc(0, 0, core, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.shadowBlur = 34;
  ctx.shadowColor = VOID_COLORS.violet;
  ctx.fill();

  ctx.restore();
}

export function drawVoidPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0 || (state.voidBlackholes?.length || 0) > 0;
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

  const auraRadius = R * (isR ? 3.25 : isQ ? 2.75 : isE ? 2.55 : 1.85);
  const aura = ctx.createRadialGradient(0, 0, R * 0.12, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(243, 220, 255, 0.2)" : "rgba(180, 92, 255, 0.08)");
  aura.addColorStop(0.48, isR ? "rgba(255, 77, 255, 0.18)" : "rgba(122, 24, 255, 0.16)");
  aura.addColorStop(1, "rgba(5, 0, 9, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.055 : 0.035));
    ctx.shadowBlur = isR ? 26 : 16;
    ctx.shadowColor = isR ? VOID_COLORS.magenta : VOID_COLORS.violet;
    drawVoidRing(ctx, R * (1.55 + pulse * 0.1), fc, isR ? 0.9 : 0.7, isR ? VOID_COLORS.magenta : VOID_COLORS.purple, isE);
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(-fc * 0.03);
  ctx.strokeStyle = "rgba(180, 92, 255, 0.42)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.9, R * 0.68, Math.PI * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  drawVoidBody(ctx, R, active);

  if (isR) {
    ctx.save();
    ctx.rotate(fc * 0.08);
    ctx.strokeStyle = "rgba(255, 77, 255, 0.7)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.18 + pulse * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180, 92, 255, 0.58)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const voidChar = {
  id: "void",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const mx = mouse?.x ?? player.x;
    const my = mouse?.y ?? player.y;
    const aim = Math.atan2(my - player.y, mx - player.x);

    if (key === "q") {
      if (!state.voidBlackholes) state.voidBlackholes = [];
      state.voidBlackholes.push({
        x: mx,
        y: my,
        radius: 205,
        life: 3 * FPS,
        maxLife: 3 * FPS,
        seed: Math.random() * Math.PI * 2,
      });
      state.activeBuffs.q = 24;
      pushVoidBurst(state, "q", mx, my, 165, 42, aim);
      for (let i = 0; i < 16; i++) {
        pushVoidSpark(state, mx, my, Math.random() * Math.PI * 2, 1 + Math.random() * 2, 28, 2.2, i % 2 === 0 ? VOID_COLORS.purple : VOID_COLORS.magenta);
      }
    }

    if (key === "e") {
      let absorbed = 0;
      state.bullets = state.bullets.filter((b) => {
        if (!b.isPlayer) {
          absorbed++;
          pushVoidSpark(state, b.x, b.y, Math.atan2(player.y - b.y, player.x - b.x), 1.8, 18, 2, VOID_COLORS.pale);
          return false;
        }
        return true;
      });

      if (absorbed >= 6 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        updateHealthUI();
      }

      state.activeBuffs.e = 28;
      state.screenShake = { timer: 10, intensity: Math.min(7, 2 + absorbed * 0.25) };
      pushVoidRipple(state, player.x, player.y, 190, 34);
      pushVoidBurst(state, "e", player.x, player.y, 190, 38, aim);
    }

    if (key === "r") {
      state.activeBuffs.r = 3 * FPS;
      state.screenShake = { timer: 3 * FPS, intensity: 3 };
      pushVoidBurst(state, "r", player.x, player.y, 190, 42, aim);
    }

    return true;
  },

  update: (state) => {
    const { player, ghosts, boss, bullets, mouse, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (state.voidBlackholes) {
      state.voidBlackholes.forEach((bh) => {
        if (!bh.maxLife) bh.maxLife = 3 * FPS;
        bh.life--;

        ghosts.forEach((g) => {
          const d = dist(bh.x, bh.y, g.x, g.y);
          if (d < bh.radius) {
            const force = Math.max(0, (bh.radius - d) * 0.052);
            const angle = Math.atan2(bh.y - g.y, bh.x - g.x);
            g.x += Math.cos(angle) * force;
            g.y += Math.sin(angle) * force;
            g.isStunned = Math.max(g.isStunned || 0, 8);
            g.hp -= 0.12;
            if (fc % 10 === 0) pushVoidSpark(state, g.x, g.y, angle, 0.8, 16, 2, VOID_COLORS.purple);
          }
        });

        if (boss) {
          const d = dist(bh.x, bh.y, boss.x, boss.y);
          if (d < bh.radius + (boss.radius || 0)) {
            boss.hp -= 0.08;
          }
        }
      });
      state.voidBlackholes = state.voidBlackholes.filter((bh) => bh.life > 0);
    }

    if (buffs.r > 0) {
      state.playerCanShootModifier = false;

      const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      state.voidLaser = { x: player.x, y: player.y, angle };

      const p1 = { x: player.x, y: player.y };
      const p2 = { x: player.x + Math.cos(angle) * 2400, y: player.y + Math.sin(angle) * 2400 };

      if (fc % 5 === 0) {
        ghosts.forEach((g) => {
          if (g.x > 0 && distToLine({ x: g.x, y: g.y }, p1, p2) < (g.radius || 12) + 32) {
            g.hp -= 2.7;
            g.isStunned = Math.max(g.isStunned || 0, 22);
            pushVoidSpark(state, g.x, g.y, angle + Math.PI, 1.2, 18, 2.2, VOID_COLORS.magenta);
          }
        });
        if (boss && distToLine({ x: boss.x, y: boss.y }, p1, p2) < (boss.radius || 40) + 32) boss.hp -= 3.2;
      }

      bullets.forEach((b) => {
        if (!b.isPlayer && distToLine({ x: b.x, y: b.y }, p1, p2) < 34) {
          b.life = 0;
          if (fc % 3 === 0) pushVoidSpark(state, b.x, b.y, angle + Math.PI, 1.4, 14, 1.8, VOID_COLORS.pale);
        }
      });
    } else {
      state.voidLaser = null;
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "void" || b.voidPrepared) return;

      b.voidPrepared = true;
      b.visualStyle = "void_shard";

      if (buffs.q > 0) {
        b.voidSingularity = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.e > 0) {
        b.voidDevour = true;
        b.pierce = true;
      }

      if (buffs.r > 0) {
        b.voidLaserFed = true;
        b.damage = (b.damage || 1) * 1.25;
      }
    });

    updateVoidVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.voidBlackholes?.forEach((bh) => drawVoidBlackhole(ctx, bh, fc));
    state.voidRipples?.forEach((ripple) => drawVoidRipple(ctx, ripple, fc));

    if (buffs.e > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.22) * 6;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 170 + pulse);
      field.addColorStop(0, "rgba(255, 255, 255, 0.1)");
      field.addColorStop(0.4, "rgba(180, 92, 255, 0.18)");
      field.addColorStop(1, "rgba(5, 0, 9, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 170 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawVoidRing(ctx, 82 + pulse * 0.2, fc, 0.65, VOID_COLORS.magenta, true);
      ctx.restore();
    }

    if (buffs.r > 0 && state.voidLaser) {
      const s = state.voidLaser;
      const endX = s.x + Math.cos(s.angle) * 2600;
      const endY = s.y + Math.sin(s.angle) * 2600;
      const pulse = Math.sin(fc * 0.42) * 8;

      ctx.save();
      ctx.fillStyle = "rgba(18, 0, 31, 0.22)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = "rgba(122, 24, 255, 0.58)";
      ctx.lineWidth = 64 + pulse;
      ctx.shadowBlur = 36;
      ctx.shadowColor = VOID_COLORS.violet;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = "rgba(255, 77, 255, 0.75)";
      ctx.lineWidth = 30 + pulse * 0.35;
      ctx.shadowBlur = 28;
      ctx.shadowColor = VOID_COLORS.magenta;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
      ctx.lineWidth = 10;
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      drawVoidRing(ctx, 44 + pulse * 0.2, fc, 0.85, VOID_COLORS.magenta);
      ctx.restore();
      ctx.restore();
    }

    state.voidBursts?.forEach((burst) => drawVoidBurst(ctx, burst, fc));
    state.voidSparks?.forEach((spark) => drawVoidSpark(ctx, spark));
  },
};
