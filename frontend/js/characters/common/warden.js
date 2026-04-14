import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

function pushWardenBurst(state, type, radius, life) {
    const player = state.player;
    if (!player) return;
    if (!state.wardenBursts) state.wardenBursts = [];
    state.wardenBursts.push({
        x: player.x,
        y: player.y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function pushWardenSpark(state, x, y, radius, life, angle = 0) {
    if (!state.wardenSparks) state.wardenSparks = [];
    state.wardenSparks.push({
        x,
        y,
        radius,
        life,
        maxLife: life,
        angle,
        spin: (Math.random() - 0.5) * 0.08,
        driftX: Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.35,
        driftY: Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 0.35,
    });
}

function drawRuneShield(ctx, radius, sides = 6) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
}

function drawWardenBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.25 + progress * 0.95);
    const rays = burst.type === "r" ? 18 : burst.type === "e" ? 12 : 10;

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.36})`);
    glow.addColorStop(0.35, `rgba(255, 215, 0, ${alpha * 0.28})`);
    glow.addColorStop(1, "rgba(120, 75, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        const ringR = radius * (0.52 + ring * 0.22);
        ctx.save();
        ctx.rotate(frameCount * (0.025 + ring * 0.015) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(255, 245, 170, ${alpha * 0.85})`
            : `rgba(255, 180, 45, ${alpha * 0.62})`;
        ctx.lineWidth = Math.max(1.5, 5 - ring * 1.3);
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#ffd700";
        drawRuneShield(ctx, ringR, ring === 1 ? 8 : 6);
        ctx.restore();
    }

    ctx.lineCap = "round";
    for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + frameCount * 0.035;
        const inner = radius * 0.18;
        const outer = radius * (0.82 + Math.sin(frameCount * 0.1 + i) * 0.1);

        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.strokeStyle = i % 3 === 0
            ? `rgba(255, 255, 255, ${alpha * 0.8})`
            : `rgba(255, 205, 50, ${alpha * 0.7})`;
        ctx.lineWidth = burst.type === "r" ? 3 : 2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ffd700";
        ctx.stroke();
    }

    ctx.restore();
}

export function drawWardenPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isQ = buffs.q > 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const guarded = isInvulnSkill || isQ || isE || isR;
    const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;
    const gold = "#ffd700";
    const deepGold = "#b87900";
    const teal = "#00ffcc";

    if (player.gracePeriod > 0 && !guarded && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    const auraR = R * (isR ? 3.2 : isQ ? 2.5 : isE ? 2.2 : 1.75);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, guarded ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 230, 120, 0.26)");
    aura.addColorStop(0.45, isR ? "rgba(255, 215, 0, 0.28)" : "rgba(255, 180, 45, 0.2)");
    aura.addColorStop(1, "rgba(120, 75, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : guarded ? 2 : 1); ring++) {
        ctx.save();
        ctx.rotate(fc * (0.025 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(255, 235, 120, ${guarded ? 0.86 : 0.5})`
            : `rgba(0, 255, 204, ${isR ? 0.5 : 0.32})`;
        ctx.lineWidth = ring === 0 ? 2.5 : 1.6;
        ctx.shadowBlur = guarded ? 18 : 10;
        ctx.shadowColor = ring === 0 ? gold : teal;
        drawRuneShield(ctx, R * (1.55 + ring * 0.42 + pulse * 0.08), ring === 1 ? 8 : 6);
        ctx.restore();
    }

    for (let i = 0; i < (isR ? 8 : 5); i++) {
        const a = fc * 0.04 + i * (Math.PI * 2 / (isR ? 8 : 5));
        const markR = R * (2.05 + Math.sin(fc * 0.1 + i) * 0.08);
        ctx.save();
        ctx.translate(Math.cos(a) * markR, Math.sin(a) * markR);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i % 2 === 0 ? "rgba(255, 235, 120, 0.78)" : "rgba(0, 255, 204, 0.46)";
        ctx.shadowBlur = 14;
        ctx.shadowColor = i % 2 === 0 ? gold : teal;
        ctx.fillRect(-1.5, -5, 3, 10);
        ctx.restore();
    }

    const body = ctx.createRadialGradient(
        -R * 0.35,
        -R * 0.4,
        R * 0.08,
        0,
        0,
        R * 1.25,
    );
    body.addColorStop(0, "#fff8d0");
    body.addColorStop(0.32, "#ffd700");
    body.addColorStop(0.72, deepGold);
    body.addColorStop(1, "#3f2900");

    ctx.beginPath();
    ctx.arc(0, 0, R * (1 + pulse * 0.04), 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.shadowBlur = guarded ? 40 : 22;
    ctx.shadowColor = guarded ? "#fff3a6" : gold;
    ctx.fill();
    ctx.lineWidth = guarded ? 3 : 2;
    ctx.strokeStyle = guarded ? "#fff3a6" : "#ffc22e";
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#102024";
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.78);
    ctx.lineTo(R * 0.36, -R * 0.12);
    ctx.lineTo(0, R * 0.58);
    ctx.lineTo(-R * 0.36, -R * 0.12);
    ctx.closePath();
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#f7fff9";
    ctx.shadowBlur = 12;
    ctx.shadowColor = teal;
    ctx.beginPath();
    ctx.arc(-R * 0.2, -R * 0.16, R * 0.07, 0, Math.PI * 2);
    ctx.arc(R * 0.2, -R * 0.16, R * 0.07, 0, Math.PI * 2);
    ctx.fill();

    if (isQ) {
        ctx.strokeStyle = "rgba(255, 245, 170, 0.85)";
        ctx.lineWidth = 4;
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#ffd700";
        ctx.beginPath();
        ctx.arc(0, 0, R * (1.9 + pulse * 0.15), 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isE) {
        for (let i = 0; i < 4; i++) {
            const a = fc * 0.12 + i * Math.PI / 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * R * 1.72, Math.sin(a) * R * 1.72, R * 0.16, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 245, 170, 0.9)";
            ctx.shadowBlur = 16;
            ctx.shadowColor = "#ffd700";
            ctx.fill();
        }
    }

    if (isR) {
        ctx.save();
        ctx.rotate(-fc * 0.025);
        ctx.strokeStyle = "rgba(0, 255, 204, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        drawRuneShield(ctx, R * 2.85, 10);
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

export const warden = {
    id: "warden",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        if (key === "q") {
            state.activeBuffs.q = 15;
            pushWardenBurst(state, "q", 120, 26);
            state.screenShake = { timer: 8, intensity: 2.2 };
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 120, life: 30, maxLife: 30, color: "#ffd700" });
            state.ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 120) {
                    g.hp -= 2;
                    g.isStunned = Math.max(g.isStunned, 60);
                }
            });
        }

        if (key === "e") {
            state.activeBuffs.e = 6 * FPS;
            pushWardenBurst(state, "e", 95, 28);
            state.screenShake = { timer: 6, intensity: 1.4 };
        }

        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            pushWardenBurst(state, "r", 180, 42);
            state.screenShake = { timer: 14, intensity: 3.2 };
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 180, life: 50, maxLife: 50, color: "#ffd700" });
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, frameCount } = state;
        if (!player) return;

        if (state.activeBuffs.e > 0) {
            state.playerBouncesModifier = (state.playerBouncesModifier || 0) + 2;

            if (frameCount % 12 === 0) {
                pushWardenBurst(state, "e", 38, 12);
            }
        }

        if (state.activeBuffs.r > 0) {
            ghosts.forEach((g) => {
                const d = dist(player.x, player.y, g.x, g.y);
                if (d < 180) {
                    const force = (180 - d) * 0.08;
                    if (!g.isMiniBoss && !g.isSubBoss) {
                        const angle = Math.atan2(g.y - player.y, g.x - player.x);
                        g.x += Math.cos(angle) * force;
                        g.y += Math.sin(angle) * force;
                    }
                }
            });

            if (frameCount % 8 === 0) {
                const angle = Math.random() * Math.PI * 2;
                pushWardenSpark(
                    state,
                    player.x + Math.cos(angle) * 180,
                    player.y + Math.sin(angle) * 180,
                    player.radius * 0.7,
                    24,
                    angle,
                );
            }
        }

        if (state.activeBuffs.q > 0 && frameCount % 3 === 0) {
            const angle = Math.random() * Math.PI * 2;
            pushWardenSpark(
                state,
                player.x + Math.cos(angle) * 55,
                player.y + Math.sin(angle) * 55,
                player.radius * 0.45,
                18,
                angle,
            );
        }

        if (state.wardenSparks) {
            state.wardenSparks.forEach(s => {
                s.life--;
                s.x += s.driftX;
                s.y += s.driftY;
                s.angle += s.spin;
            });
            state.wardenSparks = state.wardenSparks.filter(s => s.life > 0);
        }

        if (state.wardenBursts) {
            state.wardenBursts.forEach(b => b.life--);
            state.wardenBursts = state.wardenBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;
        if (!player) return;

        state.wardenSparks?.forEach(s => {
            const alpha = Math.max(0, s.life / s.maxLife);

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = alpha > 0.45 ? "#fff3a6" : "#ffd700";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "#ffd700";
            ctx.beginPath();
            ctx.moveTo(-s.radius, 0);
            ctx.lineTo(s.radius, 0);
            ctx.moveTo(0, -s.radius);
            ctx.lineTo(0, s.radius);
            ctx.stroke();
            ctx.restore();
        });

        state.wardenBursts?.forEach(burst => {
            drawWardenBurst(ctx, burst, frameCount || 0);
        });

        if (buffs.q > 0) {
            const progress = 1 - buffs.q / 15;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + progress * 100, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 245, 170, ${buffs.q / 15})`;
            ctx.lineWidth = 6;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ffd700";
            ctx.stroke();
            ctx.restore();
        }

        if (buffs.e > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.85)";
            ctx.lineWidth = 3;
            ctx.shadowBlur = 16;
            ctx.shadowColor = "#ffd700";
            ctx.stroke();
            ctx.restore();
        }

        if (buffs.r > 0) {
            const pulse = Math.sin(frameCount * 0.1) * 5;

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, 180 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 24;
            ctx.shadowColor = "#ffd700";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(player.x, player.y, 180 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
            ctx.fill();

            ctx.strokeStyle = "rgba(0, 255, 204, 0.36)";
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, 150 - pulse * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
};
