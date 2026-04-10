import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const scout = {
  id: "scout",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;

    if (key === "q") {
      const radius = 180;

      // diệt quái trong vòng
      state.ghosts.forEach((g) => {
        if (dist(player.x, player.y, g.x, g.y) < radius) {
          g.hp -= 100;
          g.shield-=10; // hoặc g.dead = true tùy system
        }
      });
      state.elementalEnemies.forEach((e) => {
        if (dist(player.x, player.y, e.x, e.y) < radius) {
          e.hp -= 1; // hoặc e.dead = true tùy system
        }
      });

      // lưu hiệu ứng để draw
      state.scoutSlash = {
        life: 20,
        maxLife: 20,
        radius,
      };
    }

    // E: Dây móc (Grappling Hook)
    if (key === "e") {
      const dx = mouse.x - player.x,
        dy = mouse.y - player.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        // Tính toán tốc độ bay bằng dash
        player.dashTimeLeft = Math.min(40, Math.floor(len / 15));
        player.dashDx = dx / len;
        player.dashDy = dy / len;
        player.grappleTarget = { x: mouse.x, y: mouse.y };
      }
    }

    // R: Quá tải (AoT MODE - Tốc độ thần thánh)
    if (key === "r") {
      state.activeBuffs.r = 10 * FPS;

      // 💥 HIỆU ỨNG NỔ KHÍ GA KHI BẬT SKILL
      if (!state.particles) state.particles = [];
      for (let i = 0; i < 40; i++) {
        state.particles.push({
          x: player.x,
          y: player.y,
          vx: (Math.random() - 0.5) * 20, // Bắn cực mạnh ra xung quanh
          vy: (Math.random() - 0.5) * 20,
          life: 20 + Math.random() * 20,
          color: Math.random() > 0.5 ? "#ffffff" : "#00ffff", // Khí ga trắng / xanh
          size: 3 + Math.random() * 5,
        });
      }

      // Rung màn hình cực mạnh (nếu hệ thống của bạn có nhận state.screenShake)
      state.screenShake = { timer: 20, intensity: 12 };

      // Khởi tạo mảng chứa bóng mờ
      state.scoutAfterimages = [];
    }
    return true;
  },

  update: (state) => {
    // Logic Buff R: Tăng cực mạnh tốc độ chạy và tốc độ bắn
    if (state.activeBuffs.r > 0) {
      const player = state.player;
      state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 2.2; // Bay như chim
      state.playerFireRateMultiplier =
        (state.playerFireRateMultiplier || 1) * 0.25; // Xả đạn siêu rát

      // 💨 SINH KHÍ GA VÀ BÓNG MỜ KHI ĐANG CHẠY
      if (state.frameCount % 3 === 0) {
        // Lưu bóng mờ
        if (!state.scoutAfterimages) state.scoutAfterimages = [];
        state.scoutAfterimages.push({ x: player.x, y: player.y, life: 15 });

        // Sinh hạt khí ga xịt ra từ bộ cơ động
        if (!state.particles) state.particles = [];
        state.particles.push({
          x: player.x + (Math.random() - 0.5) * 20,
          y: player.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 15,
          color: "rgba(200, 255, 255, 0.6)", // Khí màu lục lam nhạt
          size: 4 + Math.random() * 4,
        });
      }

      // Update tuổi thọ của mảng bóng mờ
      if (state.scoutAfterimages) {
        state.scoutAfterimages.forEach((img) => img.life--);
        state.scoutAfterimages = state.scoutAfterimages.filter(
          (img) => img.life > 0,
        );
      }
    }
  },

  draw: (state, ctx, canvas) => {
    const { player } = state;

    // Kỹ năng E: Vẽ dây móc
    if (player.grappleTarget && player.dashTimeLeft > 0) {
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.grappleTarget.x, player.grappleTarget.y);
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        player.grappleTarget.x,
        player.grappleTarget.y,
        6,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#00ffff";
      ctx.fill();
    }

    // Kỹ năng R: AoT VISUAL OVERHAUL
    if (state.activeBuffs.r > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter"; // Chế độ hòa trộn phát sáng

      // 1. VẼ BÓNG MỜ (AFTERIMAGES)
      if (state.scoutAfterimages) {
        state.scoutAfterimages.forEach((img) => {
          const ratio = img.life / 15; // 1.0 -> 0.0
          ctx.beginPath();
          ctx.arc(
            img.x,
            img.y,
            player.radius * (0.8 + ratio * 0.4),
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = `rgba(0, 255, 255, ${ratio * 0.4})`; // Bóng mờ xanh lướt đi
          ctx.fill();
        });
      }

      // 2. VẼ HÀO QUANG LÕI
      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + 15 + Math.sin(state.frameCount * 0.5) * 5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(0, 255, 255, 0.2)"; // Cyan glow
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.stroke();

      // 3. TIA SÉT (TITAN SHIFTER SPARKS)
      // Tạo 3-4 tia sét giật ngẫu nhiên xung quanh nhân vật mỗi frame
      const numSparks = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numSparks; i++) {
        ctx.beginPath();
        // Điểm bắt đầu tia sét (nằm trên viền nhân vật)
        let angle = Math.random() * Math.PI * 2;
        let startX = player.x + Math.cos(angle) * player.radius;
        let startY = player.y + Math.sin(angle) * player.radius;
        ctx.moveTo(startX, startY);

        // Vẽ 2-3 đường zic-zắc văng ra ngoài
        let currentX = startX;
        let currentY = startY;
        const segments = 2 + Math.floor(Math.random() * 3);

        for (let j = 0; j < segments; j++) {
          currentX += (Math.random() - 0.5) * 40;
          currentY += (Math.random() - 0.5) * 40;
          ctx.lineTo(currentX, currentY);
        }

        // Đổi màu ngẫu nhiên giữa Sét Xanh (Tốc độ) và Sét Vàng/Đỏ (Titan)
        const sparkColors = ["#00ffff", "#ffff00", "#ff3300"];
        ctx.strokeStyle =
          sparkColors[Math.floor(Math.random() * sparkColors.length)];
        ctx.lineWidth = 1.5 + Math.random() * 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  },
};
