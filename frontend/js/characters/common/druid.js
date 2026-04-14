import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

function pushDruidBurst(state, type, x, y, radius, life) {
    if (!state.druidBursts) state.druidBursts = [];
    state.druidBursts.push({
        x,
        y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function pushDruidLeaf(state, x, y, radius, life, angle = 0, color = "#00ff88") {
    if (!state.druidLeaves) state.druidLeaves = [];
    state.druidLeaves.push({
        x,
        y,
        radius,
        life,
        maxLife: life,
        angle,
        color,
        spin: (Math.random() - 0.5) * 0.12,
        driftX: Math.cos(angle) * 0.45 + (Math.random() - 0.5) * 0.45,
        driftY: Math.sin(angle) * 0.45 - 0.25 - Math.random() * 0.35,
    });
}

function drawLeaf(ctx, radius) {
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(radius * 0.8, -radius * 0.45, radius * 0.82, radius * 0.42, 0, radius);
    ctx.bezierCurveTo(-radius * 0.82, radius * 0.42, -radius * 0.8, -radius * 0.45, 0, -radius);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.7);
    ctx.lineTo(0, radius * 0.78);
    ctx.stroke();
}

function drawVineArc(ctx, radius, start, end, wiggle, frameCount) {
    const steps = 12;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = start + (end - start) * t;
        const r = radius + Math.sin(frameCount * 0.08 + i) * wiggle;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function drawDruidBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.2 + progress * 0.96);
    const leafCount = burst.type === "r" ? 22 : burst.type === "q" ? 14 : 10;

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(245, 255, 220, ${alpha * 0.34})`);
    glow.addColorStop(0.4, `rgba(0, 255, 136, ${alpha * 0.25})`);
    glow.addColorStop(1, "rgba(10, 70, 20, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        const ringR = radius * (0.52 + ring * 0.22);
        ctx.save();
        ctx.rotate(frameCount * (0.025 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(190, 255, 120, ${alpha * 0.78})`
            : `rgba(0, 255, 136, ${alpha * 0.58})`;
        ctx.lineWidth = Math.max(1.4, 4.5 - ring);
        ctx.shadowBlur = 22;
        ctx.shadowColor = ring === 0 ? "#beff78" : "#00ff88";
        drawVineArc(ctx, ringR, 0, Math.PI * 2, 4 + ring * 2, frameCount + ring * 20);
        ctx.restore();
    }

    for (let i = 0; i < leafCount; i++) {
        const a = (i / leafCount) * Math.PI * 2 + frameCount * 0.035;
        const r = radius * (0.28 + progress * 0.58 + Math.sin(frameCount * 0.08 + i) * 0.04);
        ctx.save();
        ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
        ctx.rotate(a + Math.PI / 2 + Math.sin(frameCount * 0.09 + i) * 0.4);
        ctx.fillStyle = i % 3 === 0
            ? `rgba(235, 255, 190, ${alpha * 0.82})`
            : `rgba(0, 255, 136, ${alpha * 0.62})`;
        ctx.strokeStyle = `rgba(255, 255, 220, ${alpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#00ff88";
        drawLeaf(ctx, burst.type === "r" ? 8 : 6);
        ctx.restore();
    }

    ctx.restore();
}

export function drawDruidPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isQ = buffs.q > 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const awakened = isQ || isE || isR || isInvulnSkill;
    const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;
    const green = "#00ff88";
    const leaf = "#7dff5a";
    const wood = "#5f3a18";

    if (player.gracePeriod > 0 && !awakened && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    const auraR = R * (isR ? 3.35 : isQ ? 2.7 : isE ? 2.35 : 1.85);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, awakened ? "rgba(245, 255, 220, 0.48)" : "rgba(0, 255, 136, 0.24)");
    aura.addColorStop(0.42, isR ? "rgba(125, 255, 90, 0.26)" : "rgba(0, 255, 136, 0.18)");
    aura.addColorStop(1, "rgba(10, 70, 20, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : awakened ? 2 : 1); ring++) {
        ctx.save();
        ctx.rotate(fc * (0.024 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(0, 255, 136, ${awakened ? 0.82 : 0.48})`
            : `rgba(190, 255, 120, ${isR ? 0.58 : 0.38})`;
        ctx.lineWidth = ring === 0 ? 2.6 : 1.7;
        ctx.shadowBlur = awakened ? 18 : 10;
        ctx.shadowColor = ring === 0 ? green : leaf;
        drawVineArc(ctx, R * (1.55 + ring * 0.42 + pulse * 0.1), 0, Math.PI * 2, 2.5 + ring, fc + ring * 30);
        ctx.restore();
    }

    for (let i = 0; i < (isR ? 10 : awakened ? 7 : 5); i++) {
        const a = fc * 0.045 + i * (Math.PI * 2 / (isR ? 10 : awakened ? 7 : 5));
        const leafR = R * (1.9 + Math.sin(fc * 0.1 + i) * 0.12);
        ctx.save();
        ctx.translate(Math.cos(a) * leafR, Math.sin(a) * leafR);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i % 2 === 0 ? "rgba(0, 255, 136, 0.74)" : "rgba(190, 255, 120, 0.58)";
        ctx.strokeStyle = "rgba(245, 255, 220, 0.5)";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 12;
        ctx.shadowColor = green;
        drawLeaf(ctx, R * 0.22);
        ctx.restore();
    }

    const body = ctx.createRadialGradient(-R * 0.32, -R * 0.4, R * 0.08, 0, 0, R * 1.25);
    body.addColorStop(0, "#efffd8");
    body.addColorStop(0.3, "#7dff5a");
    body.addColorStop(0.64, "#1a9a4c");
    body.addColorStop(1, "#10361d");

    ctx.beginPath();
    ctx.arc(0, 0, R * (1 + pulse * 0.05), 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.shadowBlur = awakened ? 38 : 22;
    ctx.shadowColor = awakened ? "#beff78" : green;
    ctx.fill();
    ctx.lineWidth = awakened ? 3 : 2;
    ctx.strokeStyle = awakened ? "#efffd8" : green;
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#12331e";
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = wood;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(R * 0.62, R * 0.65);
    ctx.quadraticCurveTo(R * 0.95, -R * 0.08, R * 0.58, -R * 0.88);
    ctx.stroke();

    ctx.fillStyle = "#beff78";
    ctx.strokeStyle = "#efffd8";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 14;
    ctx.shadowColor = leaf;
    ctx.save();
    ctx.translate(R * 0.58, -R * 0.88);
    ctx.rotate(0.7 + Math.sin(fc * 0.08) * 0.12);
    drawLeaf(ctx, R * 0.26);
    ctx.restore();

    ctx.fillStyle = "#efffd8";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#beff78";
    ctx.beginPath();
    ctx.arc(-R * 0.22, -R * 0.14, R * 0.07, 0, Math.PI * 2);
    ctx.arc(R * 0.22, -R * 0.14, R * 0.07, 0, Math.PI * 2);
    ctx.fill();

    if (isE) {
        ctx.strokeStyle = "rgba(190, 255, 120, 0.84)";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = leaf;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1.95 + pulse * 0.16), 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isR) {
        ctx.save();
        ctx.rotate(-fc * 0.03);
        ctx.strokeStyle = "rgba(0, 255, 136, 0.64)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        drawVineArc(ctx, R * 2.85, 0, Math.PI * 2, 3, fc);
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

export const druid = {
    id: "druid",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        if (key === "q") {
            state.activeBuffs.q = 8 * FPS;
            if (!state.druidOrbs) state.druidOrbs = [];
            state.druidOrbs = [];
            for (let i = 0; i < 3; i++) {
                state.druidOrbs.push({
                    angle: (i * Math.PI * 2) / 3,
                    radius: 60,
                    pulse: i * Math.PI * 0.7,
                });
            }
            pushDruidBurst(state, "q", player.x, player.y, 110, 30);
            state.screenShake = { timer: 5, intensity: 1.1 };
        }

        if (key === "e") {
            state.activeBuffs.e = 5 * FPS;
            pushDruidBurst(state, "e", player.x, player.y, 90, 28);
            state.screenShake = { timer: 4, intensity: 0.8 };
        }

        if (key === "r") {
            state.activeBuffs.r = 6 * FPS;
            pushDruidBurst(state, "r", player.x, player.y, 150, 38);
            state.screenShake = { timer: 10, intensity: 2.2 };
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets, frameCount } = state;
        if (!player) return;

        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;

            if (frameCount % 5 === 0) {
                pushDruidLeaf(
                    state,
                    player.x + (Math.random() - 0.5) * player.radius * 2,
                    player.y + player.radius * 0.8,
                    5 + Math.random() * 3,
                    24,
                    Math.random() * Math.PI * 2,
                    Math.random() > 0.35 ? "#00ff88" : "#beff78",
                );
            }
        }

        if (state.activeBuffs.q > 0 && state.druidOrbs) {
            state.druidOrbs.forEach((o, index) => {
                o.angle += 0.05;
                o.x = player.x + Math.cos(o.angle) * o.radius;
                o.y = player.y + Math.sin(o.angle) * o.radius;
                o.pulse = (o.pulse || 0) + 0.12;

                ghosts.forEach(g => {
                    if (g.x > 0 && dist(o.x, o.y, g.x, g.y) < g.radius + 8) {
                        g.isStunned = Math.max(g.isStunned, 20);
                        g.hp -= 0.15;
                    }
                });

                if (boss && dist(o.x, o.y, boss.x, boss.y) < boss.radius + 8) {
                    boss.hp -= 0.05;
                }

                if (frameCount % 8 === index) {
                    pushDruidLeaf(state, o.x, o.y, 5, 18, o.angle, "#00ff88");
                }
            });
        } else {
            state.druidOrbs = null;
        }

        if (state.activeBuffs.r > 0) {
            const newLen = bullets.length;
            for (let i = 0; i < newLen; i++) {
                const b = bullets[i];
                const maxLife = b.maxLife ?? 240;
                if (b.isSplit || !b.isPlayer || b.life < maxLife - 3) continue;

                for (let j = -1; j <= 1; j += 2) {
                    const angle = Math.atan2(b.vy, b.vx) + j * 0.4;
                    spawnBullet(b.x, b.y, b.x + Math.cos(angle) * 100, b.y + Math.sin(angle) * 100, true);
                    const newB = bullets[bullets.length - 1];
                    newB.isSplit = true;
                    newB.damage = (b.damage || 1) * 0.6;
                    newB.color = "#00ff88";
                    newB.visualStyle = "druid_seed";
                }
                b.isSplit = true;
                b.visualStyle = "druid_seed";
            }

            if (frameCount % 6 === 0) {
                const a = Math.random() * Math.PI * 2;
                pushDruidLeaf(
                    state,
                    player.x + Math.cos(a) * (80 + Math.random() * 80),
                    player.y + Math.sin(a) * (80 + Math.random() * 80),
                    6 + Math.random() * 4,
                    28,
                    a + Math.PI,
                    "#beff78",
                );
            }
        }

        if (state.druidLeaves) {
            state.druidLeaves.forEach(l => {
                l.life--;
                l.x += l.driftX;
                l.y += l.driftY;
                l.angle += l.spin;
            });
            state.druidLeaves = state.druidLeaves.filter(l => l.life > 0);
        }

        if (state.druidBursts) {
            state.druidBursts.forEach(b => b.life--);
            state.druidBursts = state.druidBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;
        if (!player) return;

        state.druidLeaves?.forEach(l => {
            const alpha = Math.max(0, l.life / l.maxLife);
            ctx.save();
            ctx.translate(l.x, l.y);
            ctx.rotate(l.angle);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.fillStyle = l.color;
            ctx.strokeStyle = "rgba(245, 255, 220, 0.6)";
            ctx.lineWidth = 1;
            ctx.shadowBlur = 14;
            ctx.shadowColor = l.color;
            drawLeaf(ctx, l.radius);
            ctx.restore();
        });

        state.druidBursts?.forEach(burst => {
            drawDruidBurst(ctx, burst, frameCount || 0);
        });

        if (state.druidOrbs && buffs.q > 0) {
            state.druidOrbs.forEach((o, index) => {
                const pulse = (Math.sin((frameCount || 0) * 0.16 + (o.pulse || 0)) + 1) * 0.5;

                ctx.save();
                ctx.translate(o.x, o.y);
                ctx.rotate((o.angle || 0) + (frameCount || 0) * 0.04);
                ctx.globalCompositeOperation = "lighter";

                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
                grad.addColorStop(0, "#efffd8");
                grad.addColorStop(0.4, index % 2 === 0 ? "#00ff88" : "#beff78");
                grad.addColorStop(1, "rgba(0, 255, 136, 0)");
                ctx.beginPath();
                ctx.arc(0, 0, 11 + pulse * 2, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.shadowBlur = 18;
                ctx.shadowColor = index % 2 === 0 ? "#00ff88" : "#beff78";
                ctx.fill();

                ctx.fillStyle = index % 2 === 0 ? "#00ff88" : "#beff78";
                ctx.strokeStyle = "rgba(245, 255, 220, 0.75)";
                ctx.lineWidth = 1.2;
                drawLeaf(ctx, 8 + pulse * 2);
                ctx.restore();
            });
        }

        if (buffs.r > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = "rgba(0, 255, 100, 0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.translate(player.x, player.y);
            ctx.rotate((frameCount || 0) * 0.03);
            ctx.strokeStyle = "rgba(0, 255, 136, 0.46)";
            ctx.lineWidth = 3;
            ctx.setLineDash([16, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, 150, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (buffs.e > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(190, 255, 120, 0.85)";
            ctx.lineWidth = 3;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#beff78";
            ctx.stroke();
            ctx.restore();
        }
    }
};
