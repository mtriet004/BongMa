import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

function pushOracleBurst(state, type, x, y, radius, life) {
    if (!state.oracleBursts) state.oracleBursts = [];
    state.oracleBursts.push({ x, y, type, radius, life, maxLife: life });
}

function pushOracleSigil(state, x, y, radius, life, angle = 0, color = "#ffd36a") {
    if (!state.oracleSigils) state.oracleSigils = [];
    state.oracleSigils.push({
        x,
        y,
        radius,
        life,
        maxLife: life,
        angle,
        color,
        spin: (Math.random() - 0.5) * 0.08,
        vx: Math.cos(angle) * (0.25 + Math.random() * 0.45),
        vy: Math.sin(angle) * (0.25 + Math.random() * 0.45),
    });
}

function drawEye(ctx, radius) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
}

function drawTriangleRune(ctx, radius) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawOracleBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.22 + progress * 0.96);
    const sapphire = "#4aa3ff";
    const gold = "#ffd36a";

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
    glow.addColorStop(0.42, burst.type === "q"
        ? `rgba(255, 211, 106, ${alpha * 0.24})`
        : `rgba(74, 163, 255, ${alpha * 0.24})`);
    glow.addColorStop(1, "rgba(7, 19, 38, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        ctx.save();
        ctx.rotate(frameCount * (0.025 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(255, 245, 220, ${alpha * 0.78})`
            : `rgba(74, 163, 255, ${alpha * 0.58})`;
        ctx.lineWidth = Math.max(1.4, 4.6 - ring);
        ctx.shadowBlur = 22;
        ctx.shadowColor = ring === 0 ? gold : sapphire;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.52 + ring * 0.22), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const spokes = burst.type === "r" ? 16 : 10;
    ctx.lineCap = "round";
    for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + frameCount * 0.035;
        const inner = radius * 0.2;
        const outer = radius * (0.78 + Math.sin(frameCount * 0.1 + i) * 0.1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.strokeStyle = i % 3 === 0
            ? `rgba(255, 255, 255, ${alpha * 0.72})`
            : `rgba(255, 211, 106, ${alpha * 0.56})`;
        ctx.lineWidth = burst.type === "r" ? 3 : 2;
        ctx.shadowBlur = 16;
        ctx.shadowColor = i % 3 === 0 ? "#ffffff" : gold;
        ctx.stroke();
    }

    if (burst.type === "q" || burst.type === "r") {
        ctx.save();
        ctx.rotate(frameCount * 0.09);
        ctx.strokeStyle = `rgba(255, 211, 106, ${alpha * 0.72})`;
        ctx.fillStyle = `rgba(74, 163, 255, ${alpha * 0.56})`;
        ctx.lineWidth = 2.4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = gold;
        drawEye(ctx, Math.max(12, radius * 0.16));
        ctx.restore();
    }

    if (burst.type === "e") {
        ctx.save();
        ctx.rotate(-frameCount * 0.12);
        ctx.strokeStyle = `rgba(74, 163, 255, ${alpha * 0.72})`;
        ctx.lineWidth = 2.4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = sapphire;
        drawTriangleRune(ctx, Math.max(14, radius * 0.18));
        ctx.restore();
    }

    ctx.restore();
}

export function drawOraclePlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const radius = player.radius;
    const fc = frameCount || 0;
    const isQ = (buffs.q || 0) > 0;
    const isE = (buffs.e || 0) > 0;
    const isR = (buffs.r || 0) > 0;
    const seeing = isQ || isE || isR || isInvulnSkill;
    const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;
    const sapphire = "#4aa3ff";
    const gold = "#ffd36a";
    const deep = "#071326";

    if (player.gracePeriod > 0 && !seeing && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    const auraRadius = radius * (isR ? 3.25 : isQ ? 2.75 : isE ? 2.45 : 1.9);
    const aura = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, auraRadius);
    aura.addColorStop(0, seeing ? "rgba(255, 255, 255, 0.42)" : "rgba(74, 163, 255, 0.2)");
    aura.addColorStop(0.44, isQ ? "rgba(255, 211, 106, 0.24)" : "rgba(74, 163, 255, 0.2)");
    aura.addColorStop(1, "rgba(7, 19, 38, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : seeing ? 2 : 1); ring++) {
        ctx.save();
        ctx.rotate(fc * (0.025 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(255, 211, 106, ${seeing ? 0.78 : 0.44})`
            : `rgba(74, 163, 255, ${isR ? 0.58 : 0.32})`;
        ctx.lineWidth = ring === 0 ? 2.6 : 1.6;
        ctx.shadowBlur = seeing ? 18 : 10;
        ctx.shadowColor = ring === 0 ? gold : sapphire;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (1.55 + ring * 0.42 + pulse * 0.08), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const robe = ctx.createRadialGradient(-radius * 0.35, -radius * 0.42, radius * 0.06, 0, 0, radius * 1.35);
    robe.addColorStop(0, "#f7fbff");
    robe.addColorStop(0.25, "#16315f");
    robe.addColorStop(0.62, "#102346");
    robe.addColorStop(1, deep);

    ctx.shadowBlur = seeing ? 38 : 22;
    ctx.shadowColor = seeing ? gold : sapphire;
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.roundRect(-radius * 0.84, -radius * 0.84, radius * 1.68, radius * 1.68, radius * 0.3);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = seeing ? "rgba(255, 245, 220, 0.85)" : "rgba(74, 163, 255, 0.7)";
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-radius * 0.56, -radius * 0.52, radius * 1.12, radius * 0.72, radius * 0.14);
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = gold;
    ctx.beginPath();
    ctx.arc(-radius * 0.22, -radius * 0.16, radius * 0.07, 0, Math.PI * 2);
    ctx.arc(radius * 0.22, -radius * 0.16, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(-fc * 0.04);
    ctx.strokeStyle = "rgba(255, 211, 106, 0.82)";
    ctx.fillStyle = "rgba(74, 163, 255, 0.55)";
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = gold;
    drawEye(ctx, radius * (0.76 + pulse * 0.04));
    ctx.restore();

    for (let i = 0; i < (isR ? 8 : seeing ? 6 : 4); i++) {
        const a = fc * 0.035 + i * (Math.PI * 2 / (isR ? 8 : seeing ? 6 : 4));
        const orbit = radius * (1.95 + Math.sin(fc * 0.09 + i) * 0.08);
        ctx.save();
        ctx.translate(Math.cos(a) * orbit, Math.sin(a) * orbit);
        ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 211, 106, 0.7)" : "rgba(74, 163, 255, 0.62)";
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 12;
        ctx.shadowColor = i % 2 === 0 ? gold : sapphire;
        drawTriangleRune(ctx, radius * 0.18);
        ctx.restore();
    }

    if (isE) {
        ctx.strokeStyle = "rgba(74, 163, 255, 0.76)";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = sapphire;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (1.95 + pulse * 0.16), 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isR) {
        ctx.save();
        ctx.rotate(fc * 0.05);
        ctx.strokeStyle = "rgba(255, 211, 106, 0.58)";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    if (player.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "#00aaff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    const s = state.playerStatus || {};
    if (s.slowTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
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

export const oracle = {
    id: "oracle",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        if (key === "q") {
            state.activeBuffs.q = 3 * FPS;
            pushOracleBurst(state, "q", player.x, player.y, 190, 34);
            state.screenShake = { timer: 5, intensity: 1.1 };
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                pushOracleSigil(state, player.x, player.y, 5 + Math.random() * 5, 28, a, i % 2 === 0 ? "#ffd36a" : "#4aa3ff");
            }
        }

        if (key === "e") {
            const oldX = player.x;
            const oldY = player.y;
            const mx = Math.max(player.radius, Math.min(canvas.width - player.radius, mouse.x));
            const my = Math.max(player.radius, Math.min(canvas.height - player.radius, mouse.y));

            if (!state.phantoms) state.phantoms = [];
            state.phantoms.push({
                x: player.x,
                y: player.y,
                life: 2 * FPS,
                color: "rgba(255, 211, 106, 0.25)",
                radius: player.radius,
                oracleVision: true,
            });
            state.oracleTeleportTrail = {
                fromX: oldX,
                fromY: oldY,
                toX: mx,
                toY: my,
                life: 28,
                maxLife: 28,
            };
            pushOracleBurst(state, "e", oldX, oldY, 90, 24);
            player.x = mx;
            player.y = my;
            state.activeBuffs.e = 28;
            pushOracleBurst(state, "e", player.x, player.y, 110, 28);
            state.screenShake = { timer: 8, intensity: 2 };
        }

        if (key === "r") {
            state.activeBuffs.r = 4 * FPS;
            pushOracleBurst(state, "r", player.x, player.y, 150, 36);
            state.screenShake = { timer: 8, intensity: 1.8 };
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        const { player, boss, ghosts, bullets, frameCount } = state;

        if (state.phantoms) {
            for (let i = state.phantoms.length - 1; i >= 0; i--) {
                state.phantoms[i].life--;
                if (state.phantoms[i].life <= 0) state.phantoms.splice(i, 1);
            }
        }

        if (buffs.r > 0 && state.frameCount % 2 === 0) {
            bullets.forEach((b) => {
                if (b.isPlayer) {
                    let nearestDist = 400;
                    let target = null;
                    if (boss && dist(b.x, b.y, boss.x, boss.y) < nearestDist) {
                        nearestDist = dist(b.x, b.y, boss.x, boss.y);
                        target = boss;
                    }
                    ghosts.forEach(g => {
                        const d = dist(b.x, b.y, g.x, g.y);
                        if (g.x > 0 && d < nearestDist) {
                            nearestDist = d;
                            target = g;
                        }
                    });

                    if (target) {
                        const angle = Math.atan2(target.y - b.y, target.x - b.x);
                        const curAngle = Math.atan2(b.vy, b.vx);
                        let diff = angle - curAngle;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        while (diff < -Math.PI) diff += Math.PI * 2;

                        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                        const nextAngle = curAngle + diff * 0.2;
                        b.vx = Math.cos(nextAngle) * speed;
                        b.vy = Math.sin(nextAngle) * speed;
                    }
                }
            });
        }

        if (buffs.q > 0 && frameCount % 8 === 0) {
            const a = Math.random() * Math.PI * 2;
            pushOracleSigil(
                state,
                player.x + Math.cos(a) * (80 + Math.random() * 130),
                player.y + Math.sin(a) * (80 + Math.random() * 130),
                4 + Math.random() * 4,
                24,
                a + Math.PI,
                Math.random() > 0.4 ? "#ffd36a" : "#4aa3ff",
            );
        }

        if (buffs.r > 0 && frameCount % 5 === 0) {
            const a = Math.random() * Math.PI * 2;
            pushOracleSigil(
                state,
                player.x + Math.cos(a) * (60 + Math.random() * 90),
                player.y + Math.sin(a) * (60 + Math.random() * 90),
                5 + Math.random() * 5,
                26,
                a,
                "#ffd36a",
            );
        }

        if (state.oracleTeleportTrail) {
            state.oracleTeleportTrail.life--;
            if (state.oracleTeleportTrail.life <= 0) state.oracleTeleportTrail = null;
        }

        if (state.oracleSigils) {
            state.oracleSigils.forEach(s => {
                s.life--;
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.96;
                s.vy *= 0.96;
                s.angle += s.spin;
            });
            state.oracleSigils = state.oracleSigils.filter(s => s.life > 0);
        }

        if (state.oracleBursts) {
            state.oracleBursts.forEach(b => b.life--);
            state.oracleBursts = state.oracleBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;

        state.oracleSigils?.forEach(s => {
            const alpha = Math.max(0, s.life / s.maxLife);
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = s.color;
            ctx.fillStyle = s.color;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 14;
            ctx.shadowColor = s.color;
            drawTriangleRune(ctx, s.radius * 1.6);
            ctx.beginPath();
            ctx.arc(0, 0, s.radius * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        state.oracleBursts?.forEach(burst => {
            drawOracleBurst(ctx, burst, frameCount || 0);
        });

        if (buffs.q > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(255, 211, 106, ${(buffs.q / (3 * FPS)) * 0.08})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.translate(player.x, player.y);
            ctx.rotate((frameCount || 0) * 0.025);
            ctx.strokeStyle = "rgba(255, 211, 106, 0.38)";
            ctx.lineWidth = 2;
            ctx.setLineDash([18, 12]);
            ctx.beginPath();
            ctx.arc(0, 0, 220, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (state.phantoms) {
            state.phantoms.forEach(p => {
                ctx.save();
                const alpha = p.life / (2 * FPS);
                ctx.globalAlpha = alpha;
                ctx.translate(p.x, p.y);
                ctx.globalCompositeOperation = "lighter";
                if (p.oracleVision) {
                    ctx.strokeStyle = "rgba(255, 211, 106, 0.8)";
                    ctx.fillStyle = "rgba(74, 163, 255, 0.35)";
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 16;
                    ctx.shadowColor = "#ffd36a";
                    drawEye(ctx, p.radius * 1.1);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    ctx.strokeStyle = "white";
                    ctx.stroke();
                }
                ctx.restore();
            });
        }

        if (state.oracleTeleportTrail) {
            const trail = state.oracleTeleportTrail;
            const alpha = Math.max(0, trail.life / trail.maxLife);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = `rgba(74, 163, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#4aa3ff";
            ctx.beginPath();
            ctx.moveTo(trail.fromX, trail.fromY);
            ctx.quadraticCurveTo(
                (trail.fromX + trail.toX) * 0.5,
                (trail.fromY + trail.toY) * 0.5 - 80,
                trail.toX,
                trail.toY,
            );
            ctx.stroke();
            ctx.restore();
        }

        if (buffs.r > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 14, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 211, 106, 0.78)";
            ctx.setLineDash([7, 7]);
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#ffd36a";
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
};
