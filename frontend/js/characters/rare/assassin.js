import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

function pushAssassinBurst(state, type, x, y, radius, life) {
  if (!state.assassinBursts) state.assassinBursts = [];
  state.assassinBursts.push({ x, y, type, radius, life, maxLife: life });
}

function pushAssassinAfterimage(state, x, y, radius, life, dx, dy, color) {
  if (!state.assassinAfterimages) state.assassinAfterimages = [];
  state.assassinAfterimages.push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    dx,
    dy,
    phase: Math.random() * Math.PI * 2,
    color,
  });
}

function pushAssassinShard(state, x, y, radius, life, angle, color) {
  if (!state.assassinShards) state.assassinShards = [];
  state.assassinShards.push({
    x,
    y,
    vx: Math.cos(angle) * (0.7 + Math.random() * 1.6),
    vy: Math.sin(angle) * (0.7 + Math.random() * 1.6),
    radius,
    life,
    maxLife: life,
    angle,
    spin: (Math.random() - 0.5) * 0.18,
    color,
  });
}

function drawBlade(ctx, length, width) {
  ctx.beginPath();
  ctx.moveTo(length * 0.62, 0);
  ctx.lineTo(-length * 0.15, -width);
  ctx.lineTo(-length * 0.52, 0);
  ctx.lineTo(-length * 0.15, width);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawAssassinBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.96);
  const crimson = "#ff3355";
  const cyan = "#00ffcc";
  const smoke = "#0a0f1a";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.28})`);
  glow.addColorStop(
    0.42,
    burst.type === "r"
      ? `rgba(0, 255, 204, ${alpha * 0.22})`
      : `rgba(255, 51, 85, ${alpha * 0.24})`,
  );
  glow.addColorStop(1, "rgba(5, 8, 15, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
    const rr = radius * (0.55 + ring * 0.2);
    ctx.save();
    ctx.rotate(
      frameCount * (0.04 + ring * 0.014) * (ring % 2 === 0 ? 1 : -1),
    );
    ctx.strokeStyle =
      ring === 0
        ? `rgba(255, 245, 220, ${alpha * 0.72})`
        : burst.type === "r"
          ? `rgba(0, 255, 204, ${alpha * 0.55})`
          : `rgba(255, 51, 85, ${alpha * 0.55})`;
    ctx.lineWidth = Math.max(1.4, 4.8 - ring);
    ctx.shadowBlur = 22;
    ctx.shadowColor = ring === 0 ? "#ffffff" : burst.type === "r" ? cyan : crimson;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const spokes = burst.type === "r" ? 16 : burst.type === "e" ? 12 : 10;
  ctx.lineCap = "round";
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + frameCount * 0.05;
    const inner = radius * 0.22;
    const outer = radius * (0.8 + Math.sin(frameCount * 0.11 + i) * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(255, 255, 255, ${alpha * 0.7})`
        : burst.type === "r"
          ? `rgba(0, 255, 204, ${alpha * 0.5})`
          : `rgba(255, 51, 85, ${alpha * 0.55})`;
    ctx.lineWidth = burst.type === "r" ? 3 : 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = burst.type === "r" ? cyan : crimson;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(frameCount * 0.16);
    ctx.fillStyle = `rgba(10, 15, 26, ${alpha * 0.9})`;
    ctx.strokeStyle = `rgba(255, 51, 85, ${alpha * 0.75})`;
    ctx.lineWidth = 2.4;
    ctx.shadowBlur = 18;
    ctx.shadowColor = crimson;
    drawBlade(ctx, Math.max(18, radius * 0.22), Math.max(6, radius * 0.08));
    ctx.restore();
  }

  if (burst.type === "e") {
    ctx.save();
    ctx.rotate(-frameCount * 0.14);
    ctx.strokeStyle = `rgba(0, 255, 204, ${alpha * 0.62})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (burst.type === "r") {
    ctx.save();
    ctx.rotate(frameCount * 0.12);
    ctx.strokeStyle = `rgba(10, 15, 26, ${alpha * 0.6})`;
    ctx.lineWidth = 6;
    ctx.shadowBlur = 18;
    ctx.shadowColor = smoke;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawAssassinPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const isDashing = player.dashTimeLeft > 0;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
  const stealth = isDashing || isQ || isE || isR || isInvulnSkill;
  const dx = player.dashDx || Math.cos(fc * 0.05);
  const dy = player.dashDy || Math.sin(fc * 0.05);

  if (player.gracePeriod > 0 && !stealth && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  const smoke = "#0a0f1a";
  const deep = "#0b0f2b";
  const crimson = "#ff3355";
  const cyan = "#00ffcc";

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  if (isDashing || isQ) {
    const trailCount = isR ? 7 : 5;
    for (let i = trailCount; i >= 1; i--) {
      const fade = (trailCount - i + 1) / trailCount;
      const off = i * 10;
      ctx.beginPath();
      ctx.ellipse(
        -dx * off,
        -dy * off,
        R * (1.12 - fade * 0.18),
        R * (0.7 - fade * 0.08),
        Math.atan2(dy, dx),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(255, 51, 85, ${0.05 + fade * 0.08})`;
      ctx.fill();
    }
  }

  const auraR = R * (isR ? 3.05 : isE ? 2.6 : isQ ? 2.35 : 1.85);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
  aura.addColorStop(0, stealth ? "rgba(255, 255, 255, 0.36)" : "rgba(10, 15, 26, 0.22)");
  aura.addColorStop(0.42, isR ? "rgba(0, 255, 204, 0.22)" : "rgba(255, 51, 85, 0.18)");
  aura.addColorStop(1, "rgba(5, 8, 15, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  for (let ring = 0; ring < (isR ? 3 : stealth ? 2 : 1); ring++) {
    ctx.save();
    ctx.rotate(fc * (0.035 + ring * 0.014) * (ring % 2 === 0 ? 1 : -1));
    ctx.strokeStyle =
      ring === 0
        ? `rgba(255, 51, 85, ${stealth ? 0.78 : 0.44})`
        : `rgba(0, 255, 204, ${isR ? 0.52 : 0.28})`;
    ctx.lineWidth = ring === 0 ? 2.6 : 1.6;
    ctx.shadowBlur = stealth ? 18 : 10;
    ctx.shadowColor = ring === 0 ? crimson : cyan;
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.55 + ring * 0.42 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const body = ctx.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.06, 0, 0, R * 1.35);
  body.addColorStop(0, "#f7fbff");
  body.addColorStop(0.22, deep);
  body.addColorStop(0.62, "#141a3f");
  body.addColorStop(1, smoke);

  ctx.shadowBlur = stealth ? 36 : 22;
  ctx.shadowColor = stealth ? (isR ? cyan : crimson) : smoke;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-R * 0.84, -R * 0.84, R * 1.68, R * 1.68, R * 0.3);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stealth ? "rgba(255, 245, 220, 0.78)" : "rgba(10, 15, 26, 0.7)";
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-R * 0.56, -R * 0.52, R * 1.12, R * 0.72, R * 0.14);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#f7ffff";
  ctx.shadowBlur = 12;
  ctx.shadowColor = isR ? cyan : crimson;
  ctx.beginPath();
  ctx.arc(-R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
  ctx.arc(R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(-fc * 0.08);
  ctx.fillStyle = "rgba(10, 15, 26, 0.9)";
  ctx.strokeStyle = isR ? "rgba(0, 255, 204, 0.8)" : "rgba(255, 51, 85, 0.8)";
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 16;
  ctx.shadowColor = isR ? cyan : crimson;
  drawBlade(ctx, R * (1.0 + pulse * 0.06), R * 0.26);
  ctx.restore();

  if (isE) {
    ctx.strokeStyle = "rgba(0, 255, 204, 0.68)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = cyan;
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.95 + pulse * 0.16), 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(fc * 0.05);
    ctx.strokeStyle = "rgba(0, 255, 204, 0.52)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, R * 2.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#00aaff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const s = state.playerStatus || {};
  if (s.slowTimer > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R + 12, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (s.stunTimer > 0) {
    ctx.fillStyle = "#ffff00";
    for (let i = 0; i < 3; i++) {
      const a = fc * 0.2 + i * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export const assassin = {
  id: "assassin",

  onTrigger: (key, state, canvas, changeStateFn) => {
    let { player, mouse, keys } = state;

    if (key === "q") {
      state.activeBuffs.q = 2 * FPS;

      let dx = 0, dy = 0;
      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;

      if (dx === 0 && dy === 0) {
        let mx = mouse.x - player.x, my = mouse.y - player.y;
        let len = Math.sqrt(mx * mx + my * my);
        if (len > 0) { dx = mx / len; dy = my / len; }
      } else {
        let len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;
      }
      player.dashTimeLeft = 20;
      player.dashDx = dx;
      player.dashDy = dy;

      pushAssassinBurst(state, "q", player.x, player.y, 120, 26);
      state.screenShake = { timer: 8, intensity: 2.2 };
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        pushAssassinShard(
          state,
          player.x,
          player.y,
          3 + Math.random() * 4,
          20,
          a,
          i % 3 === 0 ? "#00ffcc" : "#ff3355",
        );
      }
    }

    if (key === "e") {
      state.activeBuffs.e = 10 * FPS;
      pushAssassinBurst(state, "e", player.x, player.y, 140, 30);
      state.screenShake = { timer: 6, intensity: 1.6 };
    }

    if (key === "r") {
      state.activeBuffs.r = Math.round(1.3 * FPS);
      pushAssassinBurst(state, "r", player.x, player.y, 200, 40);
      state.screenShake = { timer: 14, intensity: 3.2 };

      for (let i = 0; i < 15; i++) {
        state.delayedTasks.push({
          delay: Math.round(i * 0.06 * FPS),
          action: () => {
            let angOffset = (Math.random() - 0.5) * 0.8;
            let dirX = mouse.x - player.x, dirY = mouse.y - player.y;
            let angle = Math.atan2(dirY, dirX) + angOffset;
            spawnBullet(
              player.x,
              player.y,
              player.x + Math.cos(angle) * 100,
              player.y + Math.sin(angle) * 100,
              true,
              1.5,
            );
            pushAssassinShard(
              state,
              player.x,
              player.y,
              3 + Math.random() * 4,
              18,
              angle,
              Math.random() > 0.4 ? "#ff3355" : "#00ffcc",
            );
          },
        });
      }
    }
    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    if (!player) return;

    if ((buffs.e || 0) > 0) state.assassinE_Active = true;

    if (((buffs.q || 0) > 0 || player.dashTimeLeft > 0) && frameCount % 2 === 0) {
      pushAssassinAfterimage(
        state,
        player.x,
        player.y,
        player.radius * 1.05,
        12,
        player.dashDx || 0,
        player.dashDy || 0,
        "rgba(255, 51, 85, 0.22)",
      );
    }

    if ((buffs.e || 0) > 0 && frameCount % 6 === 0) {
      const a = Math.random() * Math.PI * 2;
      pushAssassinShard(
        state,
        player.x + Math.cos(a) * (18 + Math.random() * 18),
        player.y + Math.sin(a) * (18 + Math.random() * 18),
        3 + Math.random() * 3,
        22,
        a,
        Math.random() > 0.5 ? "#00ffcc" : "#ff3355",
      );
    }

    if ((buffs.r || 0) > 0 && frameCount % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      pushAssassinShard(
        state,
        player.x + Math.cos(a) * (70 + Math.random() * 140),
        player.y + Math.sin(a) * (70 + Math.random() * 140),
        3 + Math.random() * 4,
        22,
        a + Math.PI,
        Math.random() > 0.35 ? "#00ffcc" : "#ff3355",
      );
    }

    if (state.assassinAfterimages) {
      state.assassinAfterimages.forEach((p) => {
        p.life--;
        p.phase += 0.14;
      });
      state.assassinAfterimages = state.assassinAfterimages.filter((p) => p.life > 0);
    }

    if (state.assassinShards) {
      state.assassinShards.forEach((s) => {
        s.life--;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.angle += s.spin;
      });
      state.assassinShards = state.assassinShards.filter((s) => s.life > 0);
    }

    if (state.assassinBursts) {
      state.assassinBursts.forEach((b) => b.life--);
      state.assassinBursts = state.assassinBursts.filter((b) => b.life > 0);
    }
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    if (!player) return;

    state.assassinAfterimages?.forEach((p) => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x - (p.dx || 0) * (p.maxLife - p.life) * 3, p.y - (p.dy || 0) * (p.maxLife - p.life) * 3);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radius * 1.05, p.radius * 0.72, Math.sin(p.phase) * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    });

    state.assassinShards?.forEach((s) => {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = "rgba(255, 245, 220, 0.55)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 14;
      ctx.shadowColor = s.color;
      drawBlade(ctx, s.radius * 2.1, s.radius * 0.7);
      ctx.restore();
    });

    state.assassinBursts?.forEach((burst) => {
      drawAssassinBurst(ctx, burst, frameCount || 0);
    });

    if ((buffs.e || 0) > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(0, 255, 204, 0.72)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#00ffcc";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  },
};

