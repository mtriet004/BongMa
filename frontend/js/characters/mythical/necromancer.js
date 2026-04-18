import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const NECRO = {
  bone: "#f0eee2",
  ash: "#aeb0ba",
  smoke: "#31313a",
  void: "#07070c",
  violet: "#9c35ff",
  deepViolet: "#4b1278",
  soul: "#8dffda",
  cursed: "#d7fff2",
};

function ensureNecroList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushNecroTrail(state, x, y, angle, life = 14, radius = 44, dash = false) {
  ensureNecroList(state, "necroTrails").push({
    x,
    y,
    angle,
    life,
    maxLife: life,
    radius,
    dash,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushNecroWisp(state, x, y, angle, speed, life, size, color = NECRO.soul, pullToPlayer = false) {
  ensureNecroList(state, "necroWisps").push({
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
    pullToPlayer,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushNecroBurst(state, type, x, y, radius, life, angle = 0) {
  ensureNecroList(state, "necroBursts").push({
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

function pushNecroRune(state, type, x, y, radius, life, angle = 0) {
  ensureNecroList(state, "necroRunes").push({
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

function pulseAt(frameCount, seed = 0, speed = 0.16) {
  return (Math.sin(frameCount * speed + seed) + 1) * 0.5;
}

function damageAt(state, x, y, radius, damage, stun = 50, mark = false) {
  state.ghosts?.forEach((g) => {
    if (g.hp > 0 && dist(x, y, g.x, g.y) < radius + (g.radius || 12)) {
      g.hp -= damage;
      g.isStunned = Math.max(g.isStunned || 0, stun);
      if (mark) g.necroMarked = true;
      pushNecroWisp(state, g.x, g.y, Math.random() * Math.PI * 2, 1.3, 22, 2.1, NECRO.soul, true);
    }
  });

  state.elementalEnemies?.forEach((e) => {
    if (dist(x, y, e.x, e.y) < radius + (e.radius || 14)) {
      e.hp -= Math.max(1, damage * 0.45);
      pushNecroWisp(state, e.x, e.y, Math.random() * Math.PI * 2, 1.2, 20, 2, NECRO.cursed, true);
    }
  });

  if (state.boss && dist(x, y, state.boss.x, state.boss.y) < radius + (state.boss.radius || 40)) {
    state.boss.hp -= damage * 0.45;
    pushNecroBurst(state, "hit", state.boss.x, state.boss.y, Math.min(120, state.boss.radius || 60), 22);
  }
}

function updateNecroVfx(state) {
  if (state.necroTrails) {
    for (let i = state.necroTrails.length - 1; i >= 0; i--) {
      const t = state.necroTrails[i];
      t.life--;
      if (t.life <= 0) state.necroTrails.splice(i, 1);
    }
  }

  if (state.necroWisps) {
    const player = state.player;
    for (let i = state.necroWisps.length - 1; i >= 0; i--) {
      const w = state.necroWisps[i];
      if (w.pullToPlayer && player) {
        const dx = player.x - w.x;
        const dy = player.y - w.y;
        const len = Math.hypot(dx, dy) || 1;
        w.vx += (dx / len) * 0.18;
        w.vy += (dy / len) * 0.18;
      }
      w.x += w.vx;
      w.y += w.vy;
      w.vx *= 0.94;
      w.vy *= 0.94;
      w.angle += w.spin;
      w.life--;
      if (w.life <= 0) state.necroWisps.splice(i, 1);
    }
  }

  if (state.necroBursts) {
    for (let i = state.necroBursts.length - 1; i >= 0; i--) {
      const b = state.necroBursts[i];
      b.life--;
      if (b.life <= 0) state.necroBursts.splice(i, 1);
    }
  }

  if (state.necroRunes) {
    for (let i = state.necroRunes.length - 1; i >= 0; i--) {
      const r = state.necroRunes[i];
      r.life--;
      if (r.life <= 0) state.necroRunes.splice(i, 1);
    }
  }

  if (state.necroExplosions) {
    for (let i = state.necroExplosions.length - 1; i >= 0; i--) {
      const e = state.necroExplosions[i];
      e.life--;
      if (e.life <= 0) state.necroExplosions.splice(i, 1);
    }
  }
}

function drawNecroSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.rotate(frameCount * 0.022);
  ctx.strokeStyle = "rgba(240, 238, 226, 0.72)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = NECRO.bone;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.048);
  ctx.strokeStyle = "rgba(156, 53, 255, 0.66)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI * 2 / 6);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(radius * 0.26, 0);
    ctx.lineTo(radius * 0.54, -radius * 0.16);
    ctx.lineTo(radius * 0.78, 0);
    ctx.lineTo(radius * 0.54, radius * 0.16);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(141, 255, 218, 0.48)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawSkull(ctx, radius, glow = NECRO.bone) {
  ctx.save();
  ctx.shadowBlur = 16;
  ctx.shadowColor = glow;
  ctx.fillStyle = NECRO.bone;
  ctx.strokeStyle = "rgba(7, 7, 12, 0.72)";
  ctx.lineWidth = Math.max(1, radius * 0.12);

  ctx.beginPath();
  ctx.arc(0, -radius * 0.15, radius * 0.68, Math.PI * 0.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(-radius * 0.38, radius * 0.64, 0, radius * 0.72);
  ctx.quadraticCurveTo(radius * 0.38, radius * 0.64, radius * 0.68, -radius * 0.15);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = NECRO.void;
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.ellipse(side * radius * 0.26, -radius * 0.16, radius * 0.16, radius * 0.22, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(0, radius * 0.02);
  ctx.lineTo(-radius * 0.12, radius * 0.28);
  ctx.lineTo(radius * 0.12, radius * 0.28);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(7, 7, 12, 0.78)";
  ctx.lineWidth = Math.max(1, radius * 0.08);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * radius * 0.11, radius * 0.48);
    ctx.lineTo(i * radius * 0.09, radius * 0.7);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNecroBody(ctx, radius, active, frameCount, soulCount = 0) {
  const pulse = pulseAt(frameCount, 0, 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const cloak = ctx.createRadialGradient(0, -radius * 0.2, 2, 0, 0, radius * 1.5);
  cloak.addColorStop(0, "rgba(240, 238, 226, 0.9)");
  cloak.addColorStop(0.22, "rgba(156, 53, 255, 0.78)");
  cloak.addColorStop(0.64, "rgba(49, 49, 58, 0.95)");
  cloak.addColorStop(1, "rgba(7, 7, 12, 1)");

  ctx.fillStyle = cloak;
  ctx.shadowBlur = active ? 30 : 18;
  ctx.shadowColor = active ? NECRO.violet : NECRO.ash;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.28);
  ctx.quadraticCurveTo(radius * 0.82, -radius * 0.55, radius * 0.62, radius * 0.92);
  ctx.lineTo(radius * 0.16, radius * 1.3);
  ctx.lineTo(0, radius * 0.96);
  ctx.lineTo(-radius * 0.16, radius * 1.3);
  ctx.lineTo(-radius * 0.62, radius * 0.92);
  ctx.quadraticCurveTo(-radius * 0.82, -radius * 0.55, 0, -radius * 1.28);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(240, 238, 226, 0.58)";
  ctx.lineWidth = 1.7;
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -radius * 0.28);
  drawSkull(ctx, radius * 0.56, active ? NECRO.soul : NECRO.bone);
  ctx.restore();

  ctx.strokeStyle = "rgba(141, 255, 218, 0.7)";
  ctx.lineWidth = 1.4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = NECRO.soul;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, radius * 0.26);
  ctx.quadraticCurveTo(-radius * 0.08, radius * 0.48, 0, radius * 0.96);
  ctx.quadraticCurveTo(radius * 0.08, radius * 0.48, radius * 0.42, radius * 0.26);
  ctx.stroke();

  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.16 + pulse * 0.08);
    ctx.strokeStyle = "rgba(240, 238, 226, 0.52)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(radius * 0.42, -radius * 0.18);
    ctx.lineTo(radius * 1.22, -radius * 0.54);
    ctx.lineTo(radius * 1.04, radius * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  if (soulCount > 0) {
    ctx.save();
    ctx.rotate(-frameCount * 0.06);
    const orbitCount = Math.min(6, Math.max(2, Math.ceil(soulCount / 3)));
    for (let i = 0; i < orbitCount; i++) {
      const a = i * (Math.PI * 2 / orbitCount);
      const orbit = radius * (1.8 + pulse * 0.16);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * orbit, Math.sin(a) * orbit, radius * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "rgba(141, 255, 218, 0.8)" : "rgba(240, 238, 226, 0.7)";
      ctx.shadowBlur = 14;
      ctx.shadowColor = NECRO.soul;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawNecroTrail(ctx, trail, frameCount) {
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const visualAlpha = alpha * alpha;
  const radius = trail.radius * (0.72 + (1 - alpha) * 0.52);

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.rotate(trail.angle + Math.sin(frameCount * 0.04 + trail.seed) * 0.16);
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.6);
  grad.addColorStop(0, `rgba(240, 238, 226, ${visualAlpha * 0.2})`);
  grad.addColorStop(0.28, `rgba(141, 255, 218, ${visualAlpha * 0.18})`);
  grad.addColorStop(0.62, `rgba(156, 53, 255, ${visualAlpha * (trail.dash ? 0.28 : 0.16)})`);
  grad.addColorStop(1, "rgba(7, 7, 12, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (trail.dash ? 1.8 : 1.22), radius * (trail.dash ? 0.62 : 0.5), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(240, 238, 226, ${visualAlpha * 0.58})`;
  ctx.lineWidth = trail.dash ? 2.6 : 1.6;
  ctx.shadowBlur = 15;
  ctx.shadowColor = NECRO.bone;
  ctx.beginPath();
  ctx.moveTo(radius * 0.5, 0);
  ctx.quadraticCurveTo(-radius * 0.25, -radius * 0.5, -radius * 1.25, -radius * 0.16);
  ctx.quadraticCurveTo(-radius * 0.4, 0, -radius * 1.25, radius * 0.16);
  ctx.quadraticCurveTo(-radius * 0.25, radius * 0.5, radius * 0.5, 0);
  ctx.stroke();

  ctx.restore();
}

function drawNecroWisp(ctx, wisp, frameCount) {
  const alpha = Math.max(0, wisp.life / wisp.maxLife);
  const pulse = pulseAt(frameCount, wisp.seed, 0.28);
  const radius = wisp.size * (2.4 + pulse * 0.7);

  ctx.save();
  ctx.translate(wisp.x, wisp.y);
  ctx.rotate(wisp.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 16;
  ctx.shadowColor = wisp.color;

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8);
  grad.addColorStop(0, "rgba(240, 238, 226, 0.9)");
  grad.addColorStop(0.4, wisp.color);
  grad.addColorStop(1, "rgba(7, 7, 12, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(240, 238, 226, 0.7)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(radius * 0.2, 0);
  ctx.quadraticCurveTo(-radius * 0.25, radius * 0.5, -radius * 0.9, radius * 0.18);
  ctx.stroke();

  ctx.restore();
}

function drawNecroBurst(ctx, burst, frameCount) {
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const progress = 1 - alpha;
  const radius = burst.radius * (0.18 + progress * 0.9);
  const isR = burst.type === "r";
  const isE = burst.type === "e" || burst.type === "explode";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle + progress * Math.PI * (isR ? 1.2 : 2.2));
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(240, 238, 226, ${alpha * 0.28})`);
  field.addColorStop(0.34, `rgba(141, 255, 218, ${alpha * 0.18})`);
  field.addColorStop(0.62, `rgba(156, 53, 255, ${alpha * (isE ? 0.3 : 0.2)})`);
  field.addColorStop(1, "rgba(7, 7, 12, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  drawNecroSigil(ctx, Math.max(22, radius * 0.48), frameCount + burst.seed * 8, alpha * (isR ? 0.88 : 0.72));

  ctx.strokeStyle = isE ? "rgba(240, 238, 226, 0.86)" : "rgba(156, 53, 255, 0.72)";
  ctx.lineWidth = isE ? 3 : 2;
  ctx.shadowBlur = isE ? 28 : 18;
  ctx.shadowColor = isE ? NECRO.bone : NECRO.violet;
  for (let i = 0; i < (isR ? 12 : 8); i++) {
    const a = i * (Math.PI * 2 / (isR ? 12 : 8));
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.34, Math.sin(a) * radius * 0.34);
    ctx.lineTo(Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNecroRune(ctx, rune, frameCount) {
  const alpha = Math.max(0, rune.life / rune.maxLife);
  const radius = rune.radius * (1 + (1 - alpha) * 0.12);

  ctx.save();
  ctx.translate(rune.x, rune.y);
  ctx.rotate(rune.angle + frameCount * 0.026);
  ctx.globalCompositeOperation = "lighter";
  drawNecroSigil(ctx, radius, frameCount + rune.seed * 10, alpha * 0.8);
  ctx.restore();
}

function drawNecroMinion(ctx, minion, frameCount) {
  const lifeRatio = minion.maxLife ? Math.max(0, minion.life / minion.maxLife) : 1;
  const pulse = pulseAt(frameCount, minion.seed || 0, 0.22);
  const radius = minion.type === "orbit" ? 9 + pulse * 2 : 8 + pulse * 1.6;

  ctx.save();
  ctx.translate(minion.x, minion.y);
  ctx.globalCompositeOperation = "lighter";

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 3.2);
  aura.addColorStop(0, `rgba(240, 238, 226, ${0.28 * lifeRatio})`);
  aura.addColorStop(0.42, minion.type === "orbit" ? `rgba(156, 53, 255, ${0.28 * lifeRatio})` : `rgba(141, 255, 218, ${0.24 * lifeRatio})`);
  aura.addColorStop(1, "rgba(7, 7, 12, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 3.2, 0, Math.PI * 2);
  ctx.fill();

  drawSkull(ctx, radius, minion.type === "orbit" ? NECRO.violet : NECRO.soul);

  ctx.strokeStyle = minion.type === "orbit" ? "rgba(156, 53, 255, 0.65)" : "rgba(141, 255, 218, 0.62)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.25, Math.PI * 0.15, Math.PI * 1.65);
  ctx.stroke();

  ctx.restore();
}

function drawNecroZone(ctx, zone, frameCount) {
  const alpha = Math.min(1, Math.max(0.18, zone.life / (zone.maxLife || zone.life || 1)));
  const pulse = pulseAt(frameCount, zone.seed || 0, 0.12);
  const radius = zone.radius || 170;

  ctx.save();
  ctx.translate(zone.x, zone.y);
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.2);
  field.addColorStop(0, `rgba(240, 238, 226, ${0.08 * alpha})`);
  field.addColorStop(0.36, `rgba(141, 255, 218, ${0.07 * alpha})`);
  field.addColorStop(0.72, `rgba(156, 53, 255, ${0.16 * alpha})`);
  field.addColorStop(1, "rgba(7, 7, 12, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (1.05 + pulse * 0.03), 0, Math.PI * 2);
  ctx.fill();

  drawNecroSigil(ctx, radius * (0.9 + pulse * 0.02), frameCount, alpha * 0.9);

  ctx.strokeStyle = `rgba(240, 238, 226, ${0.42 * alpha})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI * 2 / 8) + frameCount * 0.01;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.18, Math.sin(a) * radius * 0.18);
    ctx.lineTo(Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawNecromancerPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount, necroSouls = 0 } = state;
  if (!player) return;

  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const isDash = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDash || isInvulnSkill;
  const pulse = pulseAt(fc, 0, 0.17);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 4.15 : isE ? 3.35 : isQ ? 3.0 : isDash ? 3.2 : 2.35);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(240, 238, 226, 0.34)" : "rgba(240, 238, 226, 0.12)");
  aura.addColorStop(0.25, "rgba(141, 255, 218, 0.18)");
  aura.addColorStop(0.54, "rgba(156, 53, 255, 0.19)");
  aura.addColorStop(0.84, "rgba(49, 49, 58, 0.24)");
  aura.addColorStop(1, "rgba(7, 7, 12, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawNecroSigil(
    ctx,
    radius * (isR ? 3.42 + pulse * 0.16 : isE ? 2.65 : isQ ? 2.36 : 1.85),
    fc,
    isR ? 0.95 : active ? 0.72 : 0.38,
  );

  if (isDash) {
    const dx = player.dashDx || 1;
    const dy = player.dashDy || 0;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    const streak = ctx.createLinearGradient(0, 0, -radius * 8.2, 0);
    streak.addColorStop(0, "rgba(240, 238, 226, 0.5)");
    streak.addColorStop(0.28, "rgba(141, 255, 218, 0.28)");
    streak.addColorStop(0.68, "rgba(156, 53, 255, 0.22)");
    streak.addColorStop(1, "rgba(7, 7, 12, 0)");
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(radius * 0.6, 0);
    ctx.quadraticCurveTo(-radius * 4.8, radius * 1.8, -radius * 8.2, radius * 1.12);
    ctx.quadraticCurveTo(-radius * 6.2, 0, -radius * 8.2, -radius * 1.12);
    ctx.quadraticCurveTo(-radius * 4.8, -radius * 1.8, radius * 0.6, 0);
    ctx.fill();
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.052);
    for (let i = 0; i < 10; i++) {
      const a = i * (Math.PI * 2 / 10);
      const orbit = radius * (3.05 + pulse * 0.16);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(orbit, 0);
      drawSkull(ctx, radius * 0.23, i % 2 === 0 ? NECRO.soul : NECRO.violet);
      ctx.restore();
    }
    ctx.restore();
  }

  drawNecroBody(ctx, radius, active, fc, necroSouls);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.34, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(141, 255, 218, 0.68)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const necromancer = {
  id: "necromancer",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;
    if (state.necroSouls === undefined) state.necroSouls = 0;

    if (key === "q") {
      if (!state.necroMinions) state.necroMinions = [];

      const summonCount = Math.min(4 + Math.floor(state.necroSouls / 10), 8);
      state.necroMinions = state.necroMinions.filter((m) => m.type !== "orbit");

      for (let i = 0; i < summonCount; i++) {
        state.necroMinions.push({
          x: player.x,
          y: player.y,
          life: 15 * FPS,
          maxLife: 15 * FPS,
          type: "orbit",
          angle: (i * Math.PI * 2) / summonCount,
          radius: 62,
          speed: 0.046,
          seed: Math.random() * Math.PI * 2,
        });
      }

      state.necroSouls = Math.max(0, state.necroSouls - 2);
      state.activeBuffs.q = 6 * FPS;
      pushNecroBurst(state, "q", player.x, player.y, 180, 38);
      pushNecroRune(state, "q", player.x, player.y, 92, 42);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI * 2 / 16;
        pushNecroWisp(state, player.x, player.y, a, 1.2 + Math.random() * 2.4, 28, 2.2, i % 2 === 0 ? NECRO.soul : NECRO.bone);
      }
    }

    if (key === "e") {
      if (!state.necroExplosions) state.necroExplosions = [];
      state.activeBuffs.e = 28;

      if (state.necroMinions && state.necroMinions.length > 0) {
        state.necroMinions.forEach((m) => {
          state.necroExplosions.push({
            x: m.x,
            y: m.y,
            life: 28,
            maxLife: 28,
            radius: 120,
            seed: Math.random() * Math.PI * 2,
          });
          pushNecroBurst(state, "explode", m.x, m.y, 140, 32);
          damageAt(state, m.x, m.y, 120, 5, 60, true);
        });
        state.necroMinions = [];
        state.screenShake = { timer: 12, intensity: 4 };
      } else {
        pushNecroBurst(state, "e", player.x, player.y, 120, 24);
      }
    }

    if (key === "r") {
      state.necroZone = {
        x: player.x,
        y: player.y,
        life: 12 * FPS,
        maxLife: 12 * FPS,
        spawnTick: 0,
        radius: 175,
        seed: Math.random() * Math.PI * 2,
      };
      state.activeBuffs.r = 12 * FPS;
      state.screenShake = { timer: 18, intensity: 4.8 };
      pushNecroBurst(state, "r", player.x, player.y, 310, 54);
      pushNecroRune(state, "r", player.x, player.y, 175, 60);
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI * 2 / 24;
        pushNecroWisp(state, player.x, player.y, a, 1 + Math.random() * 3, 34, 2.4, i % 3 === 0 ? NECRO.violet : NECRO.soul);
      }
    }

    return true;
  },

  update: (state) => {
    const { player, ghosts, boss, bullets, frameCount } = state;
    const fc = frameCount || 0;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    if (state.necroSouls === undefined) state.necroSouls = 0;

    player.dashEffect = () => {
      const angle = Math.atan2(player.dashDy || 0, player.dashDx || 1);
      pushNecroTrail(state, player.x, player.y, angle, 12, 64, true);
      if (fc % 2 === 0) {
        pushNecroWisp(
          state,
          player.x,
          player.y,
          angle + Math.PI + (Math.random() - 0.5) * 0.9,
          1.2 + Math.random() * 1.8,
          18,
          2,
          Math.random() > 0.45 ? NECRO.soul : NECRO.bone,
        );
      }
    };

    const last = state.necroLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.1 && fc % ((player.dashTimeLeft > 0 || buffs.r > 0) ? 1 : 2) === 0) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushNecroTrail(state, player.x, player.y, angle, dash ? 12 : 9, dash ? 66 : buffs.r > 0 ? 52 : 36, dash);
      }
    }
    state.necroLastPos = { x: player.x, y: player.y };

    ghosts?.forEach((g) => {
      if (g.hp <= 0 && !g.soulCollected && dist(player.x, player.y, g.x, g.y) < 400) {
        state.necroSouls++;
        g.soulCollected = true;
        pushNecroWisp(state, g.x, g.y, Math.atan2(player.y - g.y, player.x - g.x), 2.2, 34, 2.4, NECRO.soul, true);
      }
    });

    if (state.necroMinions) {
      state.necroMinions.forEach((m) => {
        m.life--;

        if (m.type === "orbit") {
          m.angle += m.speed || 0.046;
          const orbitPulse = Math.sin(fc * 0.04 + (m.seed || 0)) * 6;
          m.x = player.x + Math.cos(m.angle) * ((m.radius || 62) + orbitPulse);
          m.y = player.y + Math.sin(m.angle) * ((m.radius || 62) + orbitPulse);

          if (fc % 18 === 0) {
            damageAt(state, m.x, m.y, 34, 0.45, 18, true);
          }
        }

        if (m.type === "seeker") {
          let target = boss || ghosts.find((g) => g.x > 0 && g.hp > 0 && dist(m.x, m.y, g.x, g.y) < 600);
          if (target) {
            const dx = target.x - m.x;
            const dy = target.y - m.y;
            const len = Math.hypot(dx, dy) || 1;
            m.x += (dx / len) * 4;
            m.y += (dy / len) * 4;

            if (fc % 4 === 0) {
              pushNecroTrail(state, m.x, m.y, Math.atan2(dy, dx), 8, 26, false);
            }

            if (len < 18 + (target.radius || 12)) {
              target.hp -= 2;
              m.life = 0;
              pushNecroBurst(state, "hit", m.x, m.y, 80, 22);
            }
          }
        }
      });
      state.necroMinions = state.necroMinions.filter((m) => m.life > 0);
    }

    if (state.necroZone) {
      const z = state.necroZone;
      z.life--;
      z.spawnTick++;

      if (z.spawnTick % 20 === 0) {
        if (!state.necroMinions) state.necroMinions = [];
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (z.radius || 150) * 0.55;
        state.necroMinions.push({
          x: z.x + Math.cos(a) * r,
          y: z.y + Math.sin(a) * r,
          life: 120,
          maxLife: 120,
          type: "seeker",
          seed: Math.random() * Math.PI * 2,
        });
        pushNecroRune(state, "spawn", z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 28, 24, a);
      }

      if (fc % 24 === 0) {
        damageAt(state, z.x, z.y, z.radius || 175, 0.55, 16, true);
      }

      if (z.life <= 0) state.necroZone = null;
    }

    bullets?.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "necromancer" || b.necroPrepared) return;

      b.necroPrepared = true;
      b.visualStyle = "necromancer_soul";

      if (buffs.q > 0) {
        b.necroGuarded = true;
        b.damage = (b.damage || 1) * 1.12;
      }

      if (buffs.e > 0) {
        b.necroSacrifice = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.r > 0) {
        b.necroDoom = true;
        b.damage = (b.damage || 1) * 1.22;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if ((state.necroSouls || 0) >= 6) {
        b.necroSoulCount = Math.min(4, Math.floor(state.necroSouls / 6));
      }
    });

    if (buffs.r > 0 && fc % 5 === 0) {
      const a = Math.random() * Math.PI * 2;
      pushNecroWisp(state, player.x, player.y, a, 0.8 + Math.random() * 1.8, 24, 2.1, Math.random() > 0.4 ? NECRO.soul : NECRO.violet);
    }

    updateNecroVfx(state);
  },

  draw: (state, ctx, canvas, buffs = { q: 0, e: 0, r: 0 }) => {
    const { player, frameCount, necroMinions, necroZone, necroExplosions, necroSouls } = state;
    const fc = frameCount || 0;

    state.necroTrails?.forEach((trail) => drawNecroTrail(ctx, trail, fc));
    state.necroRunes?.forEach((rune) => drawNecroRune(ctx, rune, fc));

    if (necroZone) drawNecroZone(ctx, necroZone, fc);

    if ((buffs.r || 0) > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(49, 49, 58, 0.045)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.13) * 18;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 390 + pulse);
      field.addColorStop(0, "rgba(240, 238, 226, 0.1)");
      field.addColorStop(0.28, "rgba(141, 255, 218, 0.12)");
      field.addColorStop(0.65, "rgba(156, 53, 255, 0.14)");
      field.addColorStop(1, "rgba(7, 7, 12, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 390 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawNecroSigil(ctx, 170 + pulse * 0.12, fc, 0.72);
      ctx.restore();
    }

    necroMinions?.forEach((m) => drawNecroMinion(ctx, m, fc));
    necroExplosions?.forEach((e) => {
      const alpha = Math.max(0, e.life / (e.maxLife || 28));
      drawNecroBurst(ctx, {
        type: "explode",
        x: e.x,
        y: e.y,
        radius: e.radius || 120,
        life: e.life,
        maxLife: e.maxLife || 28,
        angle: e.seed || 0,
        seed: e.seed || 0,
      }, fc);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(240, 238, 226, ${alpha * 0.72})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (e.radius || 120) * (1 - alpha * 0.25), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    state.necroBursts?.forEach((burst) => drawNecroBurst(ctx, burst, fc));
    state.necroWisps?.forEach((wisp) => drawNecroWisp(ctx, wisp, fc));

    if (necroSouls > 0) {
      ctx.save();
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = NECRO.bone;
      ctx.shadowBlur = 12;
      ctx.shadowColor = NECRO.soul;
      ctx.fillText(`SOULS: ${necroSouls}`, player.x, player.y - 44);
      ctx.restore();
    }
  },
};
