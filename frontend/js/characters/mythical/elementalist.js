import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const ELEMENT_ORDER = ["fire", "ice", "lightning", "earth", "wind"];

const ELEMENTS = {
  fire: {
    name: "Fire",
    core: "#fff1a8",
    main: "#ff5a1f",
    secondary: "#ffb22e",
    dark: "#39100a",
    glow: "rgba(255, 90, 31, 0.28)",
  },
  ice: {
    name: "Ice",
    core: "#f5ffff",
    main: "#63dfff",
    secondary: "#8aa8ff",
    dark: "#071a2a",
    glow: "rgba(99, 223, 255, 0.25)",
  },
  lightning: {
    name: "Lightning",
    core: "#fffdf0",
    main: "#ffe84a",
    secondary: "#7dfcff",
    dark: "#221a05",
    glow: "rgba(255, 232, 74, 0.28)",
  },
  earth: {
    name: "Earth",
    core: "#fff3c4",
    main: "#b47a3c",
    secondary: "#8dff7a",
    dark: "#21160c",
    glow: "rgba(180, 122, 60, 0.25)",
  },
  wind: {
    name: "Wind",
    core: "#f5fff8",
    main: "#7dffd8",
    secondary: "#b8ff7d",
    dark: "#071d18",
    glow: "rgba(125, 255, 216, 0.25)",
  },
};

function getElement(state, override = null) {
  const element = override || state.element || "fire";
  return ELEMENTS[element] ? element : "fire";
}

function palette(state, override = null) {
  return ELEMENTS[getElement(state, override)];
}

function ensureElementalistList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushElementalistTrail(state, x, y, angle, element, life = 12, radius = 42, dash = false) {
  ensureElementalistList(state, "elementalistTrails").push({
    x,
    y,
    angle,
    element,
    life,
    maxLife: life,
    radius,
    dash,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushElementalistSpark(state, x, y, angle, speed, life, size, element) {
  ensureElementalistList(state, "elementalistSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.18,
    element,
    life,
    maxLife: life,
    size,
  });
}

function pushElementalistBurst(state, type, x, y, radius, life, element, angle = 0) {
  ensureElementalistList(state, "elementalistBursts").push({
    type,
    x,
    y,
    radius,
    element,
    life,
    maxLife: life,
    angle,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushElementalistRune(state, type, x, y, radius, life, element, angle = 0) {
  ensureElementalistList(state, "elementalistRunes").push({
    type,
    x,
    y,
    radius,
    element,
    life,
    maxLife: life,
    angle,
    seed: Math.random() * Math.PI * 2,
  });
}

function pulseAt(frameCount, seed = 0, speed = 0.16) {
  return (Math.sin(frameCount * speed + seed) + 1) * 0.5;
}

function applyAreaDamage(state, x, y, radius, damage, stun = 30, element = "fire") {
  state.ghosts?.forEach((g) => {
    if (g.hp > 0 && dist(x, y, g.x, g.y) < radius + (g.radius || 12)) {
      g.hp -= damage;
      if (element === "ice" || element === "lightning") g.isStunned = Math.max(g.isStunned || 0, stun);
      if (element === "wind") {
        const dx = g.x - x;
        const dy = g.y - y;
        const len = Math.hypot(dx, dy) || 1;
        g.x += (dx / len) * 12;
        g.y += (dy / len) * 12;
      }
    }
  });

  state.elementalEnemies?.forEach((e) => {
    if (dist(x, y, e.x, e.y) < radius + (e.radius || 14)) {
      e.hp -= Math.max(1, damage * 0.5);
      if (element === "ice" || element === "lightning") e.isStunned = Math.max(e.isStunned || 0, stun);
    }
  });

  if (state.boss && dist(x, y, state.boss.x, state.boss.y) < radius + (state.boss.radius || 40)) {
    state.boss.hp -= damage * 0.9;
    if (element === "lightning") state.boss.stunTimer = Math.max(state.boss.stunTimer || 0, 20);
  }
}

function updateElementalistVfx(state) {
  if (state.elementalistTrails) {
    for (let i = state.elementalistTrails.length - 1; i >= 0; i--) {
      const t = state.elementalistTrails[i];
      t.life--;
      if (t.life <= 0) state.elementalistTrails.splice(i, 1);
    }
  }

  if (state.elementalistSparks) {
    for (let i = state.elementalistSparks.length - 1; i >= 0; i--) {
      const p = state.elementalistSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.elementalistSparks.splice(i, 1);
    }
  }

  if (state.elementalistBursts) {
    for (let i = state.elementalistBursts.length - 1; i >= 0; i--) {
      const b = state.elementalistBursts[i];
      b.life--;
      if (b.life <= 0) state.elementalistBursts.splice(i, 1);
    }
  }

  if (state.elementalistRunes) {
    for (let i = state.elementalistRunes.length - 1; i >= 0; i--) {
      const r = state.elementalistRunes[i];
      r.life--;
      if (r.life <= 0) state.elementalistRunes.splice(i, 1);
    }
  }
}

function drawElementalistSigil(ctx, radius, frameCount, element, alpha = 1) {
  const colors = ELEMENTS[element] || ELEMENTS.fire;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.rotate(frameCount * 0.018);
  ctx.strokeStyle = colors.main;
  ctx.lineWidth = 2.3;
  ctx.shadowBlur = 22;
  ctx.shadowColor = colors.main;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.046);
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 1.5;
  const points = element === "earth" ? 6 : element === "lightning" ? 5 : 7;
  for (let i = 0; i < points; i++) {
    const a = i * (Math.PI * 2 / points);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(radius * 0.25, 0);
    if (element === "lightning") {
      ctx.lineTo(radius * 0.5, -radius * 0.12);
      ctx.lineTo(radius * 0.43, radius * 0.1);
      ctx.lineTo(radius * 0.82, 0);
    } else {
      ctx.quadraticCurveTo(radius * 0.54, -radius * 0.12, radius * 0.84, 0);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawElementShard(ctx, radius, element, alpha = 1) {
  const colors = ELEMENTS[element] || ELEMENTS.fire;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowBlur = 18;
  ctx.shadowColor = colors.main;

  const grad = ctx.createLinearGradient(0, -radius, 0, radius);
  grad.addColorStop(0, colors.core);
  grad.addColorStop(0.34, colors.secondary);
  grad.addColorStop(0.72, colors.main);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.2;

  if (element === "ice") {
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.25);
    ctx.lineTo(radius * 0.42, 0);
    ctx.lineTo(0, radius * 1.2);
    ctx.lineTo(-radius * 0.42, 0);
    ctx.closePath();
  } else if (element === "earth") {
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.82, -radius * 0.24);
    ctx.lineTo(radius * 0.5, radius * 0.84);
    ctx.lineTo(-radius * 0.5, radius * 0.84);
    ctx.lineTo(-radius * 0.82, -radius * 0.24);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.2);
    ctx.quadraticCurveTo(radius * 0.7, -radius * 0.2, radius * 0.18, radius * 1.1);
    ctx.quadraticCurveTo(0, radius * 0.58, -radius * 0.18, radius * 1.1);
    ctx.quadraticCurveTo(-radius * 0.7, -radius * 0.2, 0, -radius * 1.2);
    ctx.closePath();
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawElementalistBody(ctx, radius, active, frameCount, element) {
  const colors = ELEMENTS[element] || ELEMENTS.fire;
  const pulse = pulseAt(frameCount, 0, 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const body = ctx.createRadialGradient(0, -radius * 0.25, 1, 0, 0, radius * 1.45);
  body.addColorStop(0, colors.core);
  body.addColorStop(0.24, colors.secondary);
  body.addColorStop(0.55, colors.main);
  body.addColorStop(0.86, colors.dark);

  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 34 : 20;
  ctx.shadowColor = active ? colors.core : colors.main;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.22);
  ctx.quadraticCurveTo(radius * 0.68, -radius * 0.44, radius * 0.46, radius * 0.9);
  ctx.lineTo(0, radius * 1.28);
  ctx.lineTo(-radius * 0.46, radius * 0.9);
  ctx.quadraticCurveTo(-radius * 0.68, -radius * 0.44, 0, -radius * 1.22);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.strokeStyle = colors.core;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = colors.core;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.72);
  ctx.quadraticCurveTo(radius * 0.18, -radius * 0.2, -radius * 0.08, radius * 0.42);
  ctx.quadraticCurveTo(radius * 0.18, radius * 0.2, 0, radius * 0.86);
  ctx.stroke();

  const orbitElements = ELEMENT_ORDER;
  ctx.save();
  ctx.rotate(-frameCount * 0.035);
  orbitElements.forEach((el, index) => {
    const a = index * (Math.PI * 2 / orbitElements.length);
    const orbit = radius * (1.55 + pulse * 0.08);
    ctx.save();
    ctx.rotate(a);
    ctx.translate(orbit, 0);
    ctx.rotate(frameCount * 0.025 + index);
    drawElementShard(ctx, radius * (el === element ? 0.28 : 0.18), el, el === element ? 0.95 : 0.38);
    ctx.restore();
  });
  ctx.restore();

  ctx.fillStyle = colors.core;
  ctx.shadowBlur = 20;
  ctx.shadowColor = colors.core;
  ctx.beginPath();
  ctx.arc(0, -radius * 0.54, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawElementalistTrail(ctx, trail, frameCount) {
  const colors = ELEMENTS[trail.element] || ELEMENTS.fire;
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const visualAlpha = alpha * alpha;
  const radius = trail.radius * (0.72 + (1 - alpha) * 0.5);

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.rotate(trail.angle);
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.7);
  grad.addColorStop(0, `rgba(255, 255, 255, ${visualAlpha * 0.25})`);
  grad.addColorStop(0.3, `${colors.main}${Math.round(visualAlpha * 80).toString(16).padStart(2, "0")}`);
  grad.addColorStop(0.62, `${colors.secondary}${Math.round(visualAlpha * 55).toString(16).padStart(2, "0")}`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (trail.dash ? 1.9 : 1.18), radius * (trail.dash ? 0.58 : 0.44), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 255, 255, ${visualAlpha * 0.62})`;
  ctx.lineWidth = trail.dash ? 2.8 : 1.8;
  ctx.shadowBlur = 18;
  ctx.shadowColor = colors.main;
  ctx.beginPath();
  ctx.moveTo(radius * 0.62, 0);
  ctx.quadraticCurveTo(-radius * 0.2, -radius * 0.46, -radius * 1.3, 0);
  ctx.quadraticCurveTo(-radius * 0.2, radius * 0.46, radius * 0.62, 0);
  ctx.stroke();

  ctx.restore();
}

function drawElementalistSpark(ctx, spark) {
  const colors = ELEMENTS[spark.element] || ELEMENTS.fire;
  const alpha = Math.max(0, spark.life / spark.maxLife);
  const len = spark.size * 5;

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colors.main;
  ctx.lineWidth = Math.max(1.2, spark.size);
  ctx.shadowBlur = 16;
  ctx.shadowColor = colors.main;
  ctx.lineCap = "round";

  if (spark.element === "lightning") {
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, 0);
    ctx.lineTo(-len * 0.1, -len * 0.2);
    ctx.lineTo(len * 0.1, len * 0.2);
    ctx.lineTo(len * 0.5, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, 0);
    ctx.lineTo(len * 0.5, 0);
    ctx.stroke();
  }

  ctx.fillStyle = colors.core;
  ctx.beginPath();
  ctx.arc(0, 0, spark.size * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawElementalistBurst(ctx, burst, frameCount) {
  const colors = ELEMENTS[burst.element] || ELEMENTS.fire;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const progress = 1 - alpha;
  const radius = burst.radius * (0.2 + progress * 0.9);

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle + progress * Math.PI * 1.8);
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.28})`);
  field.addColorStop(0.34, colors.glow);
  field.addColorStop(0.68, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  drawElementalistSigil(ctx, Math.max(24, radius * 0.5), frameCount + burst.seed * 10, burst.element, alpha * 0.75);

  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI * 2 / 8);
    ctx.save();
    ctx.rotate(a);
    ctx.translate(radius * 0.66, 0);
    drawElementShard(ctx, radius * 0.08, burst.element, alpha * 0.75);
    ctx.restore();
  }

  ctx.restore();
}

function drawElementalistRune(ctx, rune, frameCount) {
  const alpha = Math.max(0, rune.life / rune.maxLife);

  ctx.save();
  ctx.translate(rune.x, rune.y);
  ctx.rotate(rune.angle + frameCount * 0.024);
  ctx.globalCompositeOperation = "lighter";
  drawElementalistSigil(ctx, rune.radius * (1 + (1 - alpha) * 0.12), frameCount + rune.seed * 10, rune.element, alpha * 0.78);
  ctx.restore();
}

function drawElementalistTornado(ctx, tornado, frameCount) {
  const colors = ELEMENTS.wind;
  const alpha = Math.max(0, tornado.life / tornado.maxLife);

  ctx.save();
  ctx.translate(tornado.x, tornado.y);
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, tornado.radius);
  field.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.12})`);
  field.addColorStop(0.45, `rgba(125, 255, 216, ${alpha * 0.16})`);
  field.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, tornado.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = colors.main;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 18;
  ctx.shadowColor = colors.main;
  for (let i = 0; i < 5; i++) {
    const a = frameCount * 0.08 + i * (Math.PI * 2 / 5);
    const r = tornado.radius * (0.25 + i * 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, r, a, a + Math.PI * 1.2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawElementalistIcicle(ctx, icicle) {
  const colors = ELEMENTS.ice;
  ctx.save();
  ctx.translate(icicle.x, icicle.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 18;
  ctx.shadowColor = colors.main;
  ctx.fillStyle = colors.core;
  ctx.strokeStyle = colors.main;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, icicle.radius * 1.4);
  ctx.lineTo(-icicle.radius * 0.46, -icicle.radius);
  ctx.lineTo(0, -icicle.radius * 1.55);
  ctx.lineTo(icicle.radius * 0.46, -icicle.radius);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function triggerElementSkill(state, x, y, element) {
  const colors = ELEMENTS[element] || ELEMENTS.fire;
  const radii = { fire: 90, ice: 110, lightning: 210, earth: 72, wind: 150 };
  const radius = radii[element] || 100;

  if (!state.hazards) state.hazards = [];
  if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
  state.skillRangeIndicators.push({
    x,
    y,
    radius,
    life: 36,
    maxLife: 36,
    color: colors.main,
  });

  if (element === "fire") {
    state.hazards.push({ x, y, radius: 90, type: "fire", life: 130, owner: "player" });
    applyAreaDamage(state, x, y, 100, 2.4, 20, element);
  }

  if (element === "ice") {
    state.hazards.push({ x, y, radius: 110, type: "frost", life: 130, owner: "player" });
    applyAreaDamage(state, x, y, 120, 1.5, 70, element);
  }

  if (element === "lightning") {
    if (!state.stormLightnings) state.stormLightnings = [];
    state.stormLightnings.push({ x, y, life: 18, maxLife: 18, elementalist: true });
    applyAreaDamage(state, x, y, 220, 3.4, 70, element);
  }

  if (element === "earth") {
    state.hazards.push({ x, y, radius: 68, type: "rock", life: 190, owner: "player" });
    applyAreaDamage(state, x, y, 95, 2.2, 38, element);
    state.screenShake = { timer: 10, intensity: 3.5 };
  }

  if (element === "wind") {
    if (!state.windTornadoes) state.windTornadoes = [];
    state.windTornadoes.push({
      x,
      y,
      radius: 150,
      life: 130,
      maxLife: 130,
      elementalist: true,
      seed: Math.random() * Math.PI * 2,
    });
    applyAreaDamage(state, x, y, 155, 1.2, 20, element);
  }

  pushElementalistBurst(state, "e", x, y, radius + 40, 38, element);
  pushElementalistRune(state, "e", x, y, radius * 0.72, 42, element);
}

export function drawElementalistPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const element = getElement(state);
  const colors = palette(state, element);
  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0 || !!state.elementR;
  const isDash = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDash || isInvulnSkill;
  const pulse = pulseAt(fc, 0, 0.17);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 4.4 : isE ? 3.35 : isQ ? 3.1 : isDash ? 3.0 : 2.35);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.38)" : colors.glow);
  aura.addColorStop(0.28, colors.glow);
  aura.addColorStop(0.58, `${colors.main}33`);
  aura.addColorStop(0.82, `${colors.secondary}24`);
  aura.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawElementalistSigil(
    ctx,
    radius * (isR ? 3.55 + pulse * 0.2 : isE ? 2.65 : isQ ? 2.45 : 1.88),
    fc,
    element,
    isR ? 0.96 : active ? 0.72 : 0.4,
  );

  if (isDash) {
    const dx = player.dashDx || 1;
    const dy = player.dashDy || 0;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    for (let i = 0; i < (element === "wind" ? 3 : 2); i++) {
      ctx.save();
      ctx.translate(0, (i - 0.5) * radius * 0.55);
      drawElementShard(ctx, radius * (element === "earth" ? 0.52 : 0.42), element, 0.45);
      const streak = ctx.createLinearGradient(0, 0, -radius * 7.8, 0);
      streak.addColorStop(0, "rgba(255, 255, 255, 0.55)");
      streak.addColorStop(0.35, `${colors.main}66`);
      streak.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = streak;
      ctx.beginPath();
      ctx.moveTo(radius * 0.62, 0);
      ctx.quadraticCurveTo(-radius * 4.5, radius, -radius * 7.8, 0);
      ctx.quadraticCurveTo(-radius * 4.5, -radius, radius * 0.62, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.052);
    ELEMENT_ORDER.forEach((el, index) => {
      const a = index * (Math.PI * 2 / ELEMENT_ORDER.length);
      const orbit = radius * (3.18 + pulse * 0.16);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(orbit, 0);
      ctx.rotate(fc * 0.035 + index);
      drawElementShard(ctx, radius * (el === element ? 0.32 : 0.24), el, el === element ? 0.94 : 0.68);
      ctx.restore();
    });
    ctx.restore();
  }

  drawElementalistBody(ctx, radius, active, fc, element);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.34, 0, Math.PI * 2);
    ctx.strokeStyle = colors.core;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const elementalist = {
  id: "elementalist",

  onTrigger: (key, state) => {
    const { player, mouse } = state;
    if (!state.element || !ELEMENTS[state.element]) state.element = "fire";
    const current = getElement(state);

    if (key === "q") {
      const idx = ELEMENT_ORDER.indexOf(current);
      const next = ELEMENT_ORDER[(idx + 1) % ELEMENT_ORDER.length];
      state.element = next;
      player.color = state.elementColors?.[next] || ELEMENTS[next].main;
      state.activeBuffs.q = 28;
      pushElementalistBurst(state, "q", player.x, player.y, 155, 34, next);
      pushElementalistRune(state, "q", player.x, player.y, 76, 34, next);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI * 2 / 16;
        pushElementalistSpark(state, player.x, player.y, a, 1.2 + Math.random() * 2.5, 24, 2.2, next);
      }
    }

    if (key === "e") {
      const element = getElement(state);
      state.activeBuffs.e = 42;
      triggerElementSkill(state, mouse.x, mouse.y, element);
    }

    if (key === "r") {
      const element = getElement(state);
      const radii = { fire: 420, ice: 500, lightning: 420, earth: 320, wind: 460 };
      const radius = radii[element] || 400;

      if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
      state.skillRangeIndicators.push({
        x: player.x,
        y: player.y,
        radius,
        life: 50,
        maxLife: 50,
        color: ELEMENTS[element].main,
      });

      state.activeBuffs.r = 6 * FPS;
      state.elementR = {
        type: element === "ice" ? "ice_rain" : element,
        element,
        life: 6 * FPS,
        maxLife: 6 * FPS,
        radius,
        seed: Math.random() * Math.PI * 2,
      };
      pushElementalistBurst(state, "r", player.x, player.y, Math.min(340, radius), 56, element);
      pushElementalistRune(state, "r", player.x, player.y, Math.min(190, radius * 0.42), 58, element);
      state.screenShake = { timer: element === "earth" ? 18 : 10, intensity: element === "earth" ? 6 : 3.2 };
    }

    return true;
  },

  update: (state) => {
    const { player, ghosts, boss, bullets, frameCount } = state;
    const fc = frameCount || 0;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const element = getElement(state);

    player.dashEffect = () => {
      const angle = Math.atan2(player.dashDy || 0, player.dashDx || 1);
      pushElementalistTrail(state, player.x, player.y, angle, element, 11, 64, true);
      if (fc % 2 === 0) {
        pushElementalistSpark(state, player.x, player.y, angle + Math.PI + (Math.random() - 0.5) * 1.0, 1.1 + Math.random() * 2.0, 20, 2.2, element);
      }
    };

    const last = state.elementalistLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.1 && fc % ((player.dashTimeLeft > 0 || buffs.r > 0) ? 1 : 2) === 0) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushElementalistTrail(state, player.x, player.y, angle, element, dash ? 11 : 8, dash ? 66 : buffs.r > 0 ? 52 : 34, dash);
      }
    }
    state.elementalistLastPos = { x: player.x, y: player.y };

    bullets?.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "elementalist" || b.elementalistPrepared) return;

      b.elementalistPrepared = true;
      if (!b.element) b.element = element;
      b.visualStyle = "elementalist_prism";

      if (buffs.q > 0) {
        b.elementalistShift = true;
        b.radius = Math.max(b.radius || 4, 4.5);
      }

      if (buffs.e > 0) {
        b.elementalistSkill = true;
      }

      if (buffs.r > 0) {
        b.elementalistOverload = true;
        b.damage = (b.damage || 1) * 1.08;
        b.radius = Math.max(b.radius || 4, 5);
      }
    });

    if (state.windTornadoes) {
      for (let i = state.windTornadoes.length - 1; i >= 0; i--) {
        const t = state.windTornadoes[i];
        if (!t.maxLife) t.maxLife = t.life || 120;
        t.life--;
        ghosts?.forEach((g) => {
          const d = dist(t.x, t.y, g.x, g.y);
          if (g.hp > 0 && d < t.radius + (g.radius || 12)) {
            const pull = (t.radius - d) * 0.045;
            const a = Math.atan2(t.y - g.y, t.x - g.x);
            g.x += Math.cos(a) * pull;
            g.y += Math.sin(a) * pull;
            g.isStunned = Math.max(g.isStunned || 0, 6);
          }
        });
        if (t.life <= 0) state.windTornadoes.splice(i, 1);
      }
    }

    if (state.icicles) {
      for (let i = state.icicles.length - 1; i >= 0; i--) {
        const ic = state.icicles[i];
        ic.y += ic.vy || 18;
        ic.life = (ic.life ?? 60) - 1;
        ghosts?.forEach((g) => {
          if (g.hp > 0 && dist(ic.x, ic.y, g.x, g.y) < (g.radius || 12) + (ic.radius || 18)) {
            g.hp -= 6;
            g.isStunned = Math.max(g.isStunned || 0, 50);
            ic.life = 0;
          }
        });
        if (boss && dist(ic.x, ic.y, boss.x, boss.y) < (boss.radius || 40) + (ic.radius || 18)) {
          boss.hp -= 3;
          ic.life = 0;
        }
        if (ic.y > player.y + 720 || ic.life <= 0) state.icicles.splice(i, 1);
      }
    }

    if (state.elementR) {
      state.elementR.life--;
      const rElement = state.elementR.element || element;
      const el = state.elementR.type;

      if (el === "fire" && fc % 10 === 0) {
        const x = player.x + (Math.random() - 0.5) * 800;
        const y = player.y + (Math.random() - 0.5) * 600;
        state.hazards.push({ x, y, radius: 62, type: "fire", life: 68, owner: "player" });
        pushElementalistBurst(state, "meteor", x, y, 90, 24, "fire");
      }

      if (el === "lightning" && fc % 8 === 0) {
        const x = player.x + (Math.random() - 0.5) * 800;
        const y = player.y + (Math.random() - 0.5) * 600;
        if (!state.stormLightnings) state.stormLightnings = [];
        state.stormLightnings.push({ x, y, life: 15, maxLife: 15, elementalist: true });
        applyAreaDamage(state, x, y, 125, 5, 65, "lightning");
        pushElementalistBurst(state, "strike", x, y, 112, 18, "lightning");
      }

      if (el === "wind") {
        ghosts?.forEach((g) => {
          const d = dist(player.x, player.y, g.x, g.y);
          if (g.hp > 0 && d < 460) {
            const pull = (460 - d) * 0.045;
            const a = Math.atan2(player.y - g.y, player.x - g.x);
            g.x += Math.cos(a) * pull;
            g.y += Math.sin(a) * pull;
            g.isStunned = Math.max(g.isStunned || 0, 5);
          }
        });
      }

      if (el === "ice_rain" && fc % 6 === 0) {
        if (!state.icicles) state.icicles = [];
        state.icicles.push({
          x: player.x + (Math.random() - 0.5) * 1000,
          y: player.y - 600,
          vy: 18,
          radius: 18,
          life: 60,
          elementalist: true,
        });
      }

      if (el === "earth" && fc % 12 === 0) {
        if (!state.explosions) state.explosions = [];
        state.explosions.push({ x: player.x, y: player.y, radius: 300, life: 12, color: "rgba(180, 122, 60, 0.5)" });
        pushElementalistBurst(state, "quake", player.x, player.y, 310, 22, "earth");
        ghosts?.forEach((g) => {
          const d = dist(player.x, player.y, g.x, g.y);
          if (g.hp > 0 && d < 310) {
            const force = (310 - d) * 0.45;
            const a = Math.atan2(g.y - player.y, g.x - player.x);
            g.x += Math.cos(a) * force;
            g.y += Math.sin(a) * force;
            g.isStunned = Math.max(g.isStunned || 0, 30);
          }
        });
        bullets?.forEach((b) => {
          if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 310) {
            b.isPlayer = true;
            b.ownerCharacter = "elementalist";
            b.visualStyle = "elementalist_prism";
            b.element = "earth";
            b.vx *= -1.2;
            b.vy *= -1.2;
          }
        });
      }

      if (state.elementR.life <= 0) state.elementR = null;

      if (fc % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        pushElementalistSpark(state, player.x, player.y, a, 0.8 + Math.random() * 1.8, 22, 2.1, rElement);
      }
    }

    updateElementalistVfx(state);
  },

  draw: (state, ctx, canvas, buffs = { q: 0, e: 0, r: 0 }) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;
    const element = getElement(state);
    const colors = palette(state, element);

    state.elementalistTrails?.forEach((trail) => drawElementalistTrail(ctx, trail, fc));
    state.elementalistRunes?.forEach((rune) => drawElementalistRune(ctx, rune, fc));
    state.windTornadoes?.forEach((tornado) => {
      if (tornado.elementalist) drawElementalistTornado(ctx, tornado, fc);
    });
    state.icicles?.forEach((ic) => {
      if (ic.elementalist) drawElementalistIcicle(ctx, ic);
    });

    if ((buffs.r || 0) > 0 || state.elementR) {
      ctx.save();
      ctx.fillStyle = colors.glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.14) * 18;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 390 + pulse);
      field.addColorStop(0, "rgba(255, 255, 255, 0.12)");
      field.addColorStop(0.32, colors.glow);
      field.addColorStop(0.68, `${colors.main}22`);
      field.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = field;
      ctx.beginPath();
      ctx.arc(0, 0, 390 + pulse, 0, Math.PI * 2);
      ctx.fill();
      drawElementalistSigil(ctx, 168 + pulse * 0.12, fc, element, 0.72);
      ctx.restore();
    }

    state.elementalistBursts?.forEach((burst) => drawElementalistBurst(ctx, burst, fc));
    state.elementalistSparks?.forEach((spark) => drawElementalistSpark(ctx, spark));
  },
};
