import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const PAINT = {
  ink: "#081017",
  canvas: "#fff7cf",
  white: "#fffdf2",
  gold: "#ffd22e",
  cyan: "#25e9ff",
  magenta: "#ff2ccf",
  violet: "#8a35ff",
  lime: "#9bff44",
  orange: "#ff7a21",
};

function paintColor(hue, alpha = 1, light = 62) {
  const h = ((Math.round(hue) % 360) + 360) % 360;
  return `hsla(${h}, 96%, ${light}%, ${alpha})`;
}

function ensurePainterList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushPainterStep(state, x, y, angle, life = 14, radius = 34, dash = false, hue = 48) {
  ensurePainterList(state, "painterSteps").push({
    x,
    y,
    angle,
    life,
    maxLife: life,
    radius,
    dash,
    hue,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushPainterSpark(state, x, y, angle, speed, life, size, hue) {
  ensurePainterList(state, "painterSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.18,
    life,
    maxLife: life,
    size,
    hue,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushPainterBurst(state, type, x, y, radius, life, hue, angle = 0) {
  ensurePainterList(state, "painterBursts").push({
    type,
    x,
    y,
    radius,
    life,
    maxLife: life,
    hue,
    angle,
    seed: Math.random() * Math.PI * 2,
  });
}

function makePainterTrail(state, x, y, frameCount, generation = 0) {
  const hue = (frameCount * 5 + Math.random() * 80) % 360;
  return {
    points: [{ x, y }],
    life: 5 * FPS,
    maxLife: 5 * FPS,
    generation,
    spawnCount: 0,
    hue,
    color: paintColor(hue, 0.95, generation > 0 ? 70 : 62),
    width: generation > 0 ? 6 : 10 + Math.random() * 5,
    seed: Math.random() * Math.PI * 2,
    isExploding: generation > 0,
    livingShift: (Math.random() - 0.5) * 0.9,
  };
}

function pulseAt(frameCount, seed = 0, speed = 0.16) {
  return (Math.sin(frameCount * speed + seed) + 1) * 0.5;
}

function damagePaintArea(state, x, y, radius, damage, stun = 50) {
  state.ghosts?.forEach((g) => {
    if (g.hp > 0 && dist(x, y, g.x, g.y) < radius + (g.radius || 12)) {
      g.hp -= damage;
      g.isStunned = Math.max(g.isStunned || 0, stun);
    }
  });

  state.elementalEnemies?.forEach((e) => {
    if (dist(x, y, e.x, e.y) < radius + (e.radius || 14)) {
      e.hp -= Math.max(1, damage * 0.5);
    }
  });

  if (state.boss && dist(x, y, state.boss.x, state.boss.y) < radius + (state.boss.radius || 40)) {
    state.boss.hp -= damage * 1.2;
  }
}

function updatePainterVfx(state) {
  if (state.painterSteps) {
    for (let i = state.painterSteps.length - 1; i >= 0; i--) {
      const s = state.painterSteps[i];
      s.life--;
      if (s.life <= 0) state.painterSteps.splice(i, 1);
    }
  }

  if (state.painterSparks) {
    for (let i = state.painterSparks.length - 1; i >= 0; i--) {
      const p = state.painterSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.painterSparks.splice(i, 1);
    }
  }

  if (state.painterBursts) {
    for (let i = state.painterBursts.length - 1; i >= 0; i--) {
      const b = state.painterBursts[i];
      b.life--;
      if (b.life <= 0) state.painterBursts.splice(i, 1);
    }
  }

  if (state.painterExplosions) {
    for (let i = state.painterExplosions.length - 1; i >= 0; i--) {
      const e = state.painterExplosions[i];
      e.life--;
      if (e.life <= 0) state.painterExplosions.splice(i, 1);
    }
  }
}

function drawPainterSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  const arcs = [
    [PAINT.gold, 0, Math.PI * 0.42],
    [PAINT.magenta, Math.PI * 0.55, Math.PI * 0.98],
    [PAINT.cyan, Math.PI * 1.1, Math.PI * 1.55],
    [PAINT.lime, Math.PI * 1.68, Math.PI * 2.0],
  ];

  ctx.rotate(frameCount * 0.02);
  ctx.shadowBlur = 20;
  ctx.lineWidth = 3;
  arcs.forEach(([color, start, end], index) => {
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius - index * 0.8, start, end);
    ctx.stroke();
  });

  ctx.rotate(-frameCount * 0.052);
  ctx.strokeStyle = "rgba(255, 253, 242, 0.55)";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 5; i++) {
    const a = i * (Math.PI * 2 / 5);
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = paintColor(i * 64 + frameCount, 0.58, 68);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(radius * 0.26, 0);
    ctx.quadraticCurveTo(radius * 0.5, -radius * 0.12, radius * 0.74, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawBrushStroke(ctx, length, width, hue, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 16;
  ctx.shadowColor = paintColor(hue, 0.85, 64);

  const grad = ctx.createLinearGradient(-length * 0.52, 0, length * 0.52, 0);
  grad.addColorStop(0, paintColor(hue + 40, 0));
  grad.addColorStop(0.22, paintColor(hue + 28, 0.62, 60));
  grad.addColorStop(0.58, paintColor(hue, 0.92, 64));
  grad.addColorStop(1, PAINT.white);

  ctx.strokeStyle = grad;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(-length * 0.48, 0);
  ctx.quadraticCurveTo(-length * 0.08, -width * 0.72, length * 0.48, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 253, 242, 0.58)";
  ctx.lineWidth = Math.max(1, width * 0.2);
  ctx.beginPath();
  ctx.moveTo(-length * 0.32, -width * 0.05);
  ctx.quadraticCurveTo(length * 0.05, -width * 0.34, length * 0.34, 0);
  ctx.stroke();

  ctx.restore();
}

function drawPainterBody(ctx, radius, active, frameCount) {
  const pulse = pulseAt(frameCount, 0, 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  ctx.save();
  ctx.rotate(-0.44 + pulse * 0.08);
  ctx.translate(radius * 0.18, radius * 0.08);
  ctx.fillStyle = "#5a2c16";
  ctx.shadowBlur = 12;
  ctx.shadowColor = PAINT.gold;
  ctx.fillRect(-radius * 0.14, -radius * 1.35, radius * 0.28, radius * 1.95);
  ctx.fillStyle = PAINT.gold;
  ctx.fillRect(-radius * 0.2, -radius * 0.92, radius * 0.4, radius * 0.18);
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.56);
  ctx.quadraticCurveTo(radius * 0.36, -radius * 1.18, 0, -radius * 0.98);
  ctx.quadraticCurveTo(-radius * 0.36, -radius * 1.18, 0, -radius * 1.56);
  ctx.fillStyle = PAINT.magenta;
  ctx.fill();
  ctx.restore();

  const body = ctx.createRadialGradient(0, -radius * 0.2, 1, 0, 0, radius * 1.45);
  body.addColorStop(0, PAINT.white);
  body.addColorStop(0.24, PAINT.gold);
  body.addColorStop(0.52, PAINT.magenta);
  body.addColorStop(0.78, PAINT.cyan);
  body.addColorStop(1, PAINT.violet);

  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 30 : 18;
  ctx.shadowColor = active ? PAINT.magenta : PAINT.gold;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.92, radius * 1.08, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 253, 242, 0.78)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const blobs = [
    [-0.28, -0.38, PAINT.cyan],
    [0.32, -0.26, PAINT.magenta],
    [-0.34, 0.14, PAINT.lime],
    [0.24, 0.28, PAINT.orange],
  ];
  blobs.forEach(([x, y, color]) => {
    ctx.beginPath();
    ctx.arc(x * radius, y * radius, radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(radius * 0.18, -radius * 0.06, radius * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = PAINT.ink;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(frameCount * 0.04);
    for (let i = 0; i < 5; i++) {
      const a = i * (Math.PI * 2 / 5);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(radius * (1.35 + pulse * 0.08), 0);
      drawBrushStroke(ctx, radius * 0.8, radius * 0.12, i * 72 + frameCount, 0.62);
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawPainterStep(ctx, step, frameCount) {
  const alpha = Math.max(0, step.life / step.maxLife);
  const visualAlpha = alpha * alpha;
  const radius = step.radius * (0.78 + (1 - alpha) * 0.5);

  ctx.save();
  ctx.translate(step.x, step.y);
  ctx.rotate(step.angle + Math.sin(frameCount * 0.05 + step.seed) * 0.16);
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.5);
  grad.addColorStop(0, paintColor(step.hue + 40, visualAlpha * 0.22, 70));
  grad.addColorStop(0.34, paintColor(step.hue, visualAlpha * 0.3, 62));
  grad.addColorStop(0.72, paintColor(step.hue + 120, visualAlpha * 0.18, 58));
  grad.addColorStop(1, "rgba(8, 16, 23, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (step.dash ? 1.9 : 1.25), radius * (step.dash ? 0.58 : 0.45), 0, 0, Math.PI * 2);
  ctx.fill();

  drawBrushStroke(ctx, radius * (step.dash ? 2.0 : 1.25), radius * 0.24, step.hue, visualAlpha * 0.75);
  ctx.restore();
}

function drawPainterSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);
  const radius = spark.size * (1.7 + pulseAt(0, spark.seed, 1) * 0.35);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 14;
  ctx.shadowColor = paintColor(spark.hue, 0.95, 62);
  ctx.fillStyle = paintColor(spark.hue, 0.9, 64);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 253, 242, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-radius * 1.3, 0);
  ctx.lineTo(radius * 1.3, 0);
  ctx.stroke();
  ctx.restore();
}

function drawPaintSplat(ctx, radius, hue, seed, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowBlur = 22;
  ctx.shadowColor = paintColor(hue, 0.85, 62);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.1);
  grad.addColorStop(0, PAINT.white);
  grad.addColorStop(0.3, paintColor(hue + 30, 0.9, 66));
  grad.addColorStop(0.7, paintColor(hue, 0.62, 54));
  grad.addColorStop(1, paintColor(hue + 140, 0));

  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = i * (Math.PI * 2 / 14);
    const wobble = 0.7 + Math.sin(seed + i * 1.9) * 0.18 + (i % 3 === 0 ? 0.22 : 0);
    const r = radius * wobble;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(Math.cos(a - 0.14) * radius * 0.72, Math.sin(a - 0.14) * radius * 0.72, x, y);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 253, 242, 0.58)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawPainterBurst(ctx, burst, frameCount) {
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const progress = 1 - alpha;
  const radius = burst.radius * (0.2 + progress * 0.9);

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle + progress * Math.PI * 1.8);
  ctx.globalCompositeOperation = "lighter";
  drawPaintSplat(ctx, radius, burst.hue + frameCount * 0.8, burst.seed, alpha * 0.85);
  drawPainterSigil(ctx, Math.max(18, radius * 0.54), frameCount + burst.seed * 10, alpha * 0.68);
  ctx.restore();
}

function drawPainterTrail(ctx, trail, frameCount) {
  if (!trail.points || trail.points.length < 2) return;

  const alpha = Math.max(0.08, Math.min(1, trail.life / (trail.maxLife || 1)));
  const hue = trail.hue ?? frameCount % 360;
  const width = Math.max(2, trail.width || 8);
  const points = trail.points;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowBlur = trail.isExploding ? 22 : 14;
  ctx.shadowColor = trail.isExploding ? PAINT.white : paintColor(hue, 0.9, 62);

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const next = points[i + 1];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) * 0.5, (p.y + next.y) * 0.5);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = trail.isExploding ? paintColor(hue + frameCount * 3, alpha, 74) : (trail.color || paintColor(hue, alpha, 62));
  ctx.lineWidth = trail.isExploding ? width + Math.sin(frameCount * 0.35 + trail.seed) * 2.5 : width;
  ctx.stroke();

  ctx.shadowBlur = 8;
  ctx.strokeStyle = "rgba(255, 253, 242, 0.62)";
  ctx.lineWidth = Math.max(1.5, width * 0.22);
  ctx.stroke();

  if (points.length > 6) {
    ctx.fillStyle = paintColor(hue + 120, alpha * 0.8, 66);
    for (let i = 5; i < points.length; i += 16) {
      const p = points[i];
      const r = Math.max(2, width * (0.22 + 0.12 * Math.sin((trail.seed || 0) + i)));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawPainterZone(ctx, zone, frameCount) {
  const alpha = Math.min(0.45, zone.life / (zone.maxLife || 1));
  const pulse = pulseAt(frameCount, zone.seed || 0, 0.12);

  ctx.save();
  ctx.translate(zone.x, zone.y);
  ctx.globalCompositeOperation = "lighter";
  drawPaintSplat(ctx, zone.radius * (1 + pulse * 0.06), zone.hue, zone.seed || 0, alpha);
  ctx.strokeStyle = paintColor(zone.hue + 160, alpha * 1.4, 66);
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius * (0.86 + pulse * 0.04), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPainterBomb(ctx, bomb, frameCount) {
  const maxLife = bomb.maxLife || 30;
  const progress = 1 - bomb.life / maxLife;
  const arc = Math.sin(progress * Math.PI) * 80;
  const x = bomb.startX + (bomb.x - bomb.startX) * progress;
  const y = bomb.startY + (bomb.y - bomb.startY) * progress - arc;
  const pulse = pulseAt(frameCount, bomb.seed || 0, 0.32);

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  drawPaintSplat(ctx, 14 + pulse * 3, bomb.hue, bomb.seed || 0, 0.95);
  ctx.strokeStyle = "rgba(255, 253, 242, 0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, -10);
  ctx.quadraticCurveTo(0, -28, 22, -10);
  ctx.stroke();
  ctx.restore();
}

export function drawPainterPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = !!state.painterDrawing || (buffs.q || 0) > 0;
  const isE = !!state.painterBomb || (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const isDash = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDash || isInvulnSkill;
  const pulse = pulseAt(fc, 0, 0.17);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 4.2 : isQ ? 3.25 : isE ? 3.1 : isDash ? 3.0 : 2.35);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 253, 242, 0.36)" : "rgba(255, 210, 46, 0.12)");
  aura.addColorStop(0.25, "rgba(255, 210, 46, 0.18)");
  aura.addColorStop(0.48, "rgba(255, 44, 207, 0.18)");
  aura.addColorStop(0.68, "rgba(37, 233, 255, 0.16)");
  aura.addColorStop(1, "rgba(8, 16, 23, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawPainterSigil(
    ctx,
    radius * (isR ? 3.45 + pulse * 0.2 : isQ ? 2.58 : isDash ? 2.5 : 1.85),
    fc,
    isR ? 0.95 : active ? 0.7 : 0.38,
  );

  if (isDash) {
    const dx = player.dashDx || 1;
    const dy = player.dashDy || 0;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(0, (i - 1) * radius * 0.55);
      drawBrushStroke(ctx, radius * 7.5, radius * 0.55, fc * 5 + i * 80, 0.42);
      ctx.restore();
    }
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.056);
    for (let i = 0; i < 12; i++) {
      const a = i * (Math.PI * 2 / 12);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(radius * (3.05 + pulse * 0.16), 0);
      drawPaintSplat(ctx, radius * 0.18, i * 32 + fc, i, 0.82);
      ctx.restore();
    }
    ctx.restore();
  }

  drawPainterBody(ctx, radius, active, fc);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.34, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 253, 242, 0.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const painter = {
  id: "painter",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse, frameCount } = state;
    const fc = frameCount || 0;

    if (key === "q") {
      state.painterDrawing = true;
      state.painterDrawTime = 3 * FPS;
      state.activeBuffs.q = 3 * FPS;
      if (!state.painterTrails) state.painterTrails = [];
      state.prevMouseDown = false;
      pushPainterBurst(state, "q", player.x, player.y, 160, 38, fc * 4);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI * 2 / 16;
        pushPainterSpark(state, player.x, player.y, a, 1.2 + Math.random() * 2.5, 26, 2.3, fc * 4 + i * 34);
      }
    }

    if (key === "e") {
      const hue = (fc * 6 + 300) % 360;
      state.activeBuffs.e = 34;
      state.painterBomb = {
        x: mouse.x,
        y: mouse.y,
        startX: player.x,
        startY: player.y,
        life: 30,
        maxLife: 30,
        hue,
        seed: Math.random() * Math.PI * 2,
      };
      pushPainterBurst(state, "e", player.x, player.y, 105, 24, hue);
    }

    if (key === "r") {
      state.activeBuffs.r = 8 * FPS;
      state.screenShake = { timer: 20, intensity: 6 };
      pushPainterBurst(state, "r", player.x, player.y, 300, 54, fc * 5);
      for (let i = 0; i < 26; i++) {
        const a = i * Math.PI * 2 / 26;
        pushPainterSpark(state, player.x, player.y, a, 1.1 + Math.random() * 3.4, 34, 2.4, i * 30 + fc * 3);
      }
    }

    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, boss, ghosts, mouse, frameCount } = state;
    const fc = frameCount || 0;

    player.dashEffect = () => {
      const angle = Math.atan2(player.dashDy || 0, player.dashDx || 1);
      pushPainterStep(state, player.x, player.y, angle, 11, 58, true, fc * 4);
      if (fc % 2 === 0) {
        for (let i = 0; i < 2; i++) {
          pushPainterSpark(
            state,
            player.x,
            player.y,
            angle + Math.PI + (Math.random() - 0.5) * 1.1,
            1 + Math.random() * 1.8,
            18,
            2,
            fc * 5 + i * 90,
          );
        }
      }
    };

    const last = state.painterLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.1 && fc % ((player.dashTimeLeft > 0 || (buffs.r || 0) > 0) ? 1 : 2) === 0) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushPainterStep(state, player.x, player.y, angle, dash ? 11 : 8, dash ? 60 : (buffs.r > 0 ? 44 : 30), dash, fc * 4);
      }
    }
    state.painterLastPos = { x: player.x, y: player.y };

    if (state.painterDrawing) state.playerCanShootModifier = false;

    if (state.painterDrawing) {
      state.painterDrawTime--;

      if (mouse.isDown && !state.prevMouseDown) {
        if (!state.painterTrails) state.painterTrails = [];
        state.painterTrails.push(makePainterTrail(state, mouse.x, mouse.y, fc));
      }

      if (mouse.isDown) {
        const trail = state.painterTrails?.[state.painterTrails.length - 1];
        if (trail) {
          const lastPoint = trail.points[trail.points.length - 1];
          if (!lastPoint || dist(lastPoint.x, lastPoint.y, mouse.x, mouse.y) > 6) {
            trail.points.push({ x: mouse.x, y: mouse.y });
            if (trail.points.length > 110) trail.points.shift();
            if (fc % 5 === 0) {
              pushPainterSpark(state, mouse.x, mouse.y, Math.random() * Math.PI * 2, 0.4 + Math.random(), 15, 1.8, trail.hue + fc);
            }
          }
        }
      }

      state.prevMouseDown = mouse.isDown;
      if (state.painterDrawTime <= 0) state.painterDrawing = false;
    }

    if (state.painterBomb) {
      state.painterBomb.life--;
      if (state.painterBomb.life <= 0) {
        const { x, y, hue, seed } = state.painterBomb;

        damagePaintArea(state, x, y, 120, 3, 60);
        state.bullets = state.bullets.filter((b) => !(!b.isPlayer && dist(b.x, b.y, x, y) <= 120));

        if (!state.painterZones) state.painterZones = [];
        state.painterZones.push({
          x,
          y,
          radius: 86,
          life: 5 * FPS,
          maxLife: 5 * FPS,
          hue,
          seed,
        });

        if (!state.painterExplosions) state.painterExplosions = [];
        state.painterExplosions.push({
          x,
          y,
          radius: 130,
          life: 28,
          maxLife: 28,
          hue,
          seed,
        });

        pushPainterBurst(state, "bomb", x, y, 150, 36, hue, seed);
        for (let i = 0; i < 18; i++) {
          const a = i * Math.PI * 2 / 18;
          pushPainterSpark(state, x, y, a, 1.6 + Math.random() * 3.2, 24, 2.4, hue + i * 24);
        }
        state.screenShake = { timer: 10, intensity: 3.5 };
        state.painterBomb = null;
      }
    }

    if ((buffs.r || 0) > 0) {
      state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.12;
    }

    if ((buffs.r || 0) > 0 && fc % 14 === 0 && state.painterTrails) {
      const newTrails = [];
      const sourceTrails = state.painterTrails.slice(-24);

      sourceTrails.forEach((trail) => {
        if ((trail.generation || 0) >= 2) return;
        if ((trail.spawnCount || 0) >= 2) return;
        if (!trail.points || trail.points.length === 0) return;

        trail.spawnCount = (trail.spawnCount || 0) + 1;
        const lastPoint = trail.points[trail.points.length - 1];

        for (let i = 0; i < 2; i++) {
          const angle = (trail.seed || 0) + i * Math.PI + Math.random() * 0.7;
          const branch = {
            points: [{ x: lastPoint.x, y: lastPoint.y }],
            life: 68,
            maxLife: 68,
            generation: (trail.generation || 0) + 1,
            spawnCount: 0,
            hue: (trail.hue || fc) + 60 + i * 75,
            color: paintColor((trail.hue || fc) + 60 + i * 75, 0.95, 72),
            width: Math.max(3, (trail.width || 8) * 0.62),
            seed: Math.random() * Math.PI * 2,
            isExploding: true,
            livingShift: (Math.random() - 0.5) * 1.2,
          };

          for (let j = 1; j <= 5; j++) {
            branch.points.push({
              x: lastPoint.x + Math.cos(angle + j * 0.08) * j * 22,
              y: lastPoint.y + Math.sin(angle + j * 0.08) * j * 22,
            });
          }
          newTrails.push(branch);
        }
      });

      if (state.painterTrails.length < 105) {
        state.painterTrails.push(...newTrails.slice(0, 12));
      }
    }

    if (state.painterTrails) {
      state.painterTrails.forEach((trail) => {
        trail.life--;
        if ((buffs.r || 0) > 0 && trail.isExploding && fc % 3 === 0) {
          const angle = (trail.seed || 0) + fc * 0.02;
          trail.points.forEach((p, index) => {
            if (index % 4 !== 0) return;
            p.x += Math.cos(angle + index) * (trail.livingShift || 0.4);
            p.y += Math.sin(angle + index) * (trail.livingShift || 0.4);
          });
        }
      });
      state.painterTrails = state.painterTrails.filter((trail) => trail.life > 0);

      state.painterTrails.forEach((trail) => {
        let hitOnce = false;
        const dmgMultiplier = trail.isExploding ? 2 : 1;
        const stride = Math.max(3, Math.floor((trail.points?.length || 0) / 24));

        for (let i = 0; i < trail.points.length; i += stride) {
          const p = trail.points[i];
          if (hitOnce) break;

          ghosts?.forEach((g) => {
            if (!hitOnce && g.hp > 0 && dist(p.x, p.y, g.x, g.y) < (g.radius || 12) + 12) {
              g.hp -= 0.15 * dmgMultiplier;
              g.isStunned = Math.max(g.isStunned || 0, 60);
              hitOnce = true;
            }
          });

          if (boss && !hitOnce && dist(p.x, p.y, boss.x, boss.y) < (boss.radius || 40) + 12) {
            boss.hp -= 0.05 * dmgMultiplier;
            hitOnce = true;
          }
        }
      });
    }

    if (state.painterZones) {
      state.painterZones.forEach((zone) => {
        zone.life--;
        ghosts?.forEach((g) => {
          if (g.hp > 0 && dist(zone.x, zone.y, g.x, g.y) < zone.radius + (g.radius || 12)) {
            g.hp -= 0.1;
            g.isStunned = Math.max(g.isStunned || 0, 60);
            g.speed *= 0.5;
          }
        });

        if (boss && dist(zone.x, zone.y, boss.x, boss.y) < zone.radius + (boss.radius || 40)) {
          boss.hp -= 0.05;
        }
      });
      state.painterZones = state.painterZones.filter((zone) => zone.life > 0);
    }

    updatePainterVfx(state);
  },

  draw: (state, ctx, canvas, buffs = { q: 0, e: 0, r: 0 }) => {
    const fc = state.frameCount || 0;

    state.painterSteps?.forEach((step) => drawPainterStep(ctx, step, fc));
    state.painterZones?.forEach((zone) => drawPainterZone(ctx, zone, fc));
    state.painterTrails?.forEach((trail) => drawPainterTrail(ctx, trail, fc));

    if (state.painterBomb) drawPainterBomb(ctx, state.painterBomb, fc);

    state.painterExplosions?.forEach((explosion) => {
      drawPainterBurst(ctx, {
        type: "explosion",
        x: explosion.x,
        y: explosion.y,
        radius: explosion.radius || 120,
        life: explosion.life,
        maxLife: explosion.maxLife || 28,
        hue: explosion.hue || fc,
        angle: explosion.seed || 0,
        seed: explosion.seed || 0,
      }, fc);
    });

    state.painterBursts?.forEach((burst) => drawPainterBurst(ctx, burst, fc));
    state.painterSparks?.forEach((spark) => drawPainterSpark(ctx, spark));

    if ((buffs.r || 0) > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 44, 207, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  },
};
