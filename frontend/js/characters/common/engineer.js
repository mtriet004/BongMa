import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

function pushEngineerBurst(state, type, x, y, radius, life) {
    if (!state.engineerBursts) state.engineerBursts = [];
    state.engineerBursts.push({
        x,
        y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function pushEngineerSpark(state, x, y, radius, life, vx = 0, vy = 0) {
    if (!state.engineerSparks) state.engineerSparks = [];
    state.engineerSparks.push({
        x,
        y,
        vx,
        vy,
        radius,
        life,
        maxLife: life,
        phase: Math.random() * Math.PI * 2,
    });
}

function drawCircuitRing(ctx, radius, frameCount, segments = 10) {
    for (let i = 0; i < segments; i++) {
        const start = (i / segments) * Math.PI * 2 + frameCount * 0.025;
        const end = start + Math.PI * 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, end);
        ctx.stroke();
    }
}

function drawEngineerBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.22 + progress * 0.92);
    const color = burst.type === "r" ? "#00ffcc" : burst.type === "e" ? "#9dff6a" : "#00d9ff";

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.32})`);
    glow.addColorStop(0.42, burst.type === "e"
        ? `rgba(157, 255, 106, ${alpha * 0.25})`
        : `rgba(0, 217, 255, ${alpha * 0.24})`);
    glow.addColorStop(1, "rgba(0, 40, 55, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        ctx.save();
        ctx.rotate(frameCount * (0.035 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(235, 255, 255, ${alpha * 0.85})`
            : burst.type === "e"
              ? `rgba(157, 255, 106, ${alpha * 0.64})`
              : `rgba(0, 255, 204, ${alpha * 0.58})`;
        ctx.lineWidth = Math.max(1.4, 4 - ring);
        ctx.shadowBlur = 22;
        ctx.shadowColor = color;
        drawCircuitRing(ctx, radius * (0.55 + ring * 0.2), frameCount + ring * 30, 12 + ring * 4);
        ctx.restore();
    }

    const rays = burst.type === "r" ? 16 : 10;
    ctx.lineCap = "round";
    for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + frameCount * 0.04;
        const inner = radius * 0.2;
        const outer = radius * (0.78 + Math.sin(frameCount * 0.11 + i) * 0.1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.strokeStyle = i % 3 === 0
            ? `rgba(255, 255, 255, ${alpha * 0.72})`
            : `rgba(0, 255, 204, ${alpha * 0.55})`;
        ctx.lineWidth = burst.type === "r" ? 2.4 : 1.6;
        ctx.shadowBlur = 14;
        ctx.shadowColor = color;
        ctx.stroke();
    }

    ctx.restore();
}

export function drawEngineerPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const deploying = buffs.q > 0;
    const overclocked = isE || isR || deploying || isInvulnSkill;
    const pulse = (Math.sin(fc * 0.2) + 1) * 0.5;
    const cyan = "#00d9ff";
    const mint = "#00ffcc";
    const lime = "#9dff6a";

    if (player.gracePeriod > 0 && !overclocked && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    const auraR = R * (isR ? 3.1 : isE ? 2.45 : deploying ? 2.2 : 1.75);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, overclocked ? "rgba(255, 255, 255, 0.46)" : "rgba(0, 217, 255, 0.22)");
    aura.addColorStop(0.45, isE ? "rgba(157, 255, 106, 0.26)" : "rgba(0, 255, 204, 0.18)");
    aura.addColorStop(1, "rgba(0, 35, 45, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : overclocked ? 2 : 1); ring++) {
        ctx.save();
        ctx.rotate(fc * (0.035 + ring * 0.014) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(0, 255, 204, ${overclocked ? 0.82 : 0.46})`
            : `rgba(157, 255, 106, ${isE ? 0.62 : 0.36})`;
        ctx.lineWidth = ring === 0 ? 2.4 : 1.5;
        ctx.shadowBlur = overclocked ? 18 : 10;
        ctx.shadowColor = ring === 0 ? mint : lime;
        drawCircuitRing(ctx, R * (1.55 + ring * 0.42 + pulse * 0.08), fc, 10 + ring * 4);
        ctx.restore();
    }

    const bodyGrad = ctx.createRadialGradient(
        -R * 0.38,
        -R * 0.42,
        R * 0.05,
        0,
        0,
        R * 1.25,
    );
    bodyGrad.addColorStop(0, "#efffff");
    bodyGrad.addColorStop(0.34, cyan);
    bodyGrad.addColorStop(0.72, "#176f78");
    bodyGrad.addColorStop(1, "#06282d");

    ctx.shadowBlur = overclocked ? 36 : 22;
    ctx.shadowColor = overclocked ? mint : cyan;
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-R * 0.82, -R * 0.82, R * 1.64, R * 1.64, R * 0.24);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = overclocked ? "#eaffff" : cyan;
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#08181d";
    ctx.beginPath();
    ctx.roundRect(-R * 0.52, -R * 0.5, R * 1.04, R * 0.68, R * 0.12);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = isE ? lime : "#eaffff";
    ctx.shadowBlur = 14;
    ctx.shadowColor = isE ? lime : cyan;
    ctx.beginPath();
    ctx.arc(-R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
    ctx.arc(R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(234, 255, 255, 0.8)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-R * 0.42, R * 0.34);
    ctx.lineTo(-R * 0.12, R * 0.52);
    ctx.lineTo(R * 0.26, R * 0.34);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
        const a = fc * 0.07 + i * Math.PI / 2;
        const armR = R * (1.28 + pulse * 0.05);
        const x = Math.cos(a) * armR;
        const y = Math.sin(a) * armR;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i % 2 === 0 ? "rgba(0, 255, 204, 0.8)" : "rgba(0, 217, 255, 0.72)";
        ctx.shadowBlur = 12;
        ctx.shadowColor = i % 2 === 0 ? mint : cyan;
        ctx.fillRect(-R * 0.08, -R * 0.28, R * 0.16, R * 0.56);
        ctx.restore();
    }

    if (isE) {
        ctx.strokeStyle = "rgba(157, 255, 106, 0.84)";
        ctx.lineWidth = 2.4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = lime;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1.9 + pulse * 0.15), 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isR) {
        ctx.save();
        ctx.rotate(-fc * 0.04);
        ctx.strokeStyle = "rgba(0, 255, 204, 0.64)";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, R * 2.55, 0, Math.PI * 2);
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

export const engineer = {
    id: "engineer",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        if (key === "q") {
            if (!state.engineerTurrets) state.engineerTurrets = [];
            state.engineerTurrets.push({
                x: player.x,
                y: player.y,
                life: 12 * FPS,
                maxLife: 12 * FPS,
                fireCD: 0,
                deployPulse: 26,
                angle: 0,
            });
            state.activeBuffs.q = 24;
            pushEngineerBurst(state, "q", player.x, player.y, 90, 26);
            state.screenShake = { timer: 6, intensity: 1.4 };
        }

        if (key === "e") {
            state.activeBuffs.e = 6 * FPS;
            pushEngineerBurst(state, "e", player.x, player.y, 100, 30);
            state.screenShake = { timer: 5, intensity: 1.1 };
        }

        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            pushEngineerBurst(state, "r", player.x, player.y, 125, 36);
            state.screenShake = { timer: 12, intensity: 2.8 };
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets, frameCount } = state;
        if (!player) return;

        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.6;

            if (frameCount % 5 === 0) {
                pushEngineerSpark(
                    state,
                    player.x + (Math.random() - 0.5) * player.radius * 2,
                    player.y + (Math.random() - 0.5) * player.radius * 2,
                    player.radius * 0.28,
                    18,
                    (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 0.8,
                );
            }
        }

        if (state.engineerTurrets) {
            state.engineerTurrets.forEach((t) => {
                t.life--;
                t.fireCD--;
                t.angle = (t.angle || 0) + 0.04;
                if (t.deployPulse > 0) t.deployPulse--;

                if (t.fireCD <= 0) {
                    const target = boss || ghosts.find(g => g.x > 0 && g.hp > 0 && dist(t.x, t.y, g.x, g.y) < 400);
                    if (target) {
                        spawnBullet(t.x, t.y, target.x, target.y, true, 1.2, "player");
                        t.fireCD = 25;
                        pushEngineerSpark(
                            state,
                            t.x,
                            t.y,
                            5,
                            14,
                            (target.x - t.x) / Math.max(1, dist(t.x, t.y, target.x, target.y)) * 1.2,
                            (target.y - t.y) / Math.max(1, dist(t.x, t.y, target.x, target.y)) * 1.2,
                        );
                    }
                }
            });
            state.engineerTurrets = state.engineerTurrets.filter((t) => t.life > 0);
        }

        if (state.activeBuffs.r > 0) {
            ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 120) {
                    g.hp -= 0.15;
                    g.isStunned = Math.max(g.isStunned, 10);
                }
            });

            state.bullets = bullets.filter(b => b.isPlayer || dist(player.x, player.y, b.x, b.y) > 120);

            if (frameCount % 4 === 0) {
                const a = Math.random() * Math.PI * 2;
                pushEngineerSpark(
                    state,
                    player.x + Math.cos(a) * 120,
                    player.y + Math.sin(a) * 120,
                    4 + Math.random() * 3,
                    20,
                    -Math.cos(a) * 0.7,
                    -Math.sin(a) * 0.7,
                );
            }
        }

        if (state.engineerSparks) {
            state.engineerSparks.forEach(s => {
                s.life--;
                s.x += s.vx;
                s.y += s.vy;
                s.phase += 0.12;
            });
            state.engineerSparks = state.engineerSparks.filter(s => s.life > 0);
        }

        if (state.engineerBursts) {
            state.engineerBursts.forEach(b => b.life--);
            state.engineerBursts = state.engineerBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;
        if (!player) return;

        state.engineerSparks?.forEach(s => {
            const alpha = Math.max(0, s.life / s.maxLife);
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.phase);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = alpha > 0.45 ? "#eaffff" : "#00ffcc";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "#00ffcc";
            ctx.beginPath();
            ctx.moveTo(-s.radius, 0);
            ctx.lineTo(s.radius, 0);
            ctx.moveTo(0, -s.radius);
            ctx.lineTo(0, s.radius);
            ctx.stroke();
            ctx.restore();
        });

        state.engineerBursts?.forEach(burst => {
            drawEngineerBurst(ctx, burst, frameCount || 0);
        });

        if (buffs.r > 0) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(frameCount * 0.05);
            ctx.globalCompositeOperation = "lighter";

            ctx.beginPath();
            ctx.arc(0, 0, 120, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 204, 0.74)";
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.shadowBlur = 24;
            ctx.shadowColor = "#00ffcc";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 120, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 200, 255, 0.06)";
            ctx.fill();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (buffs.e > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(157, 255, 106, 0.72)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#9dff6a";
            ctx.stroke();
            ctx.restore();
        }
    }
};
