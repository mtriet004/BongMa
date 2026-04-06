Hướng dẫn chi tiết dự án: Bóng Ma - Huyết Chiến Thời Gian (Asynchronous Echoes)

Dự án này là một game Action Survivor/RPG 2D (như Vampire Survivors kết hợp yếu tố Gacha), sử dụng hoàn toàn Vanilla JavaScript, Canvas API và module hóa qua hệ thống ES Modules.

1. NGUYÊN TẮC LẬP TRÌNH CỐT LÕI (AI CẦN TUÂN THỦ NGHIÊM NGẶT)

State Management (Quản lý trạng thái):

state.js là SSOT (Single Source of Truth). Toàn bộ dữ liệu game (từ vị trí chuột, lượng máu, đạn, quái, cho đến cài đặt đồ họa) phải được lưu ở đây.

Khi logic thay đổi một giá trị (VD: nhân vật bị mất máu), phải thay đổi trong state.player.hp trước, sau đó mới gọi hàm ở ui.js để cập nhật hiển thị. Không bao giờ thao tác DOM để tính toán logic.

Cập nhật & Tối ưu file:

Tuyệt đối không ghi đè toàn bộ nội dung file (no full-file replacement) trừ khi được yêu cầu. Thay vào đó, hãy cập nhật đúng hàm/biến cần thiết bằng cách comment // ... code hiện tại ... cho phần không thay đổi.

Bắt buộc dùng cú pháp ES Modules (import / export) và phải ghi rõ đuôi .js khi import (VD: import { state } from "./state.js";).

Hệ thống thời gian (Frame-based Timer):

Game chạy cố định ở 60 FPS (xác định tại config.js). Các cơ chế đếm ngược (cooldown, thời gian buff, thời gian tồn tại của đạn) phải được tính bằng Frame (Ví dụ: timer = 5 * FPS tương đương 5 giây) và trừ dần mỗi frame trong update.js hoặc combat.js.

Hệ tọa độ:

Tọa độ Màn hình (Screen/UI): Cố định theo độ phân giải Canvas (1536x864).

Tọa độ Thế giới (World): Kích thước 5000x5000.

Mọi đối tượng trong game phải được cập nhật di chuyển theo World, và khi vẽ (draw.js), vị trí hiển thị trên Canvas phải được trừ đi state.camera.x và state.camera.y. Vị trí chuột state.mouse cũng phải áp dụng quy tắc dịch Camera tương tự (xử lý tại input.js).

2. NHIỆM VỤ CỦA TỪNG FILE CỤ THỂ

📂 Cốt lõi & Dữ liệu (Core & Data)

state.js: Nguồn dữ liệu duy nhất. Định nghĩa toàn bộ các object như state.player, state.ghosts, state.bullets, state.camera, state.resources, và hệ thống hạt/hiệu ứng (particles, explosions).

config.js: File chứa các hằng số cấu hình. Bao gồm CHARACTERS (thông số từng nhân vật), danh sách Boss BOSS_FRAGMENTS, các mảnh rơi ra BOSS_REWARDS, và các loại hòm roll SCROLLS.

main.js: Điểm neo của toàn bộ ứng dụng. Khởi tạo Game Loop (requestAnimationFrame), lắng nghe khởi tạo từ auth.js và bind các sự kiện bắt đầu game.

📂 Logic Hệ Thống Game (Game Systems)

input.js: Xử lý keydown, keyup, mousemove, mousedown. Chuyển đổi tọa độ chuột từ Screen sang World (kết hợp với góc nhìn Camera) và đưa thẳng vào state.

flow.js: Quản lý luồng trạng thái ứng dụng. Chuyển đổi giữa các màn hình (Menu, Playing, Nâng cấp, Boss Arena). Quản lý reset/khởi tạo vòng lặp cho Màn Mới (nextStage) và khởi tạo các hiệu ứng cinematic cho boss.

update.js: Chạy ở mọi frame. Cập nhật vị trí tất cả thực thể, logic Camera, tính toán mục tiêu của Drone/Thú cưng, trừ dần các biến timer (God mode, Buffs). Chứa vòng lặp kiểm tra khoảng cách/va chạm.

draw.js: Nhận dữ liệu từ state và gọi các hàm API của Canvas 2D để vẽ toàn bộ game. Xử lý logic Screen Shake, Cinematic effects, Vẽ máu của quái vật trên đầu chúng.

📂 Chiến Đấu & Thực Thể (Combat & Entities)

combat.js: Trung tâm xử lý va chạm và sát thương. Chứa hàm cực kỳ quan trọng là playerTakeDamage() (xử lý I-frames, trừ máu), updateBullets() (logic đạn bay và trúng mục tiêu), hệ thống nhận EXP (addExperience).

skills.js: Định nghĩa logic 3 kỹ năng Q, E, R cho riêng rẽ từng nhân vật (được xác định dựa trên element/character ID). Xử lý vòng lặp cooldown cho từng kỹ năng này và render cooldown lên giao diện UI.

evolutions.js: Logic đặc biệt của những Nâng Cấp Tối Thượng (Speed, Fire, Multi, Bounce, Dash). Khác với upgrade cơ bản, evolution thay đổi mạnh cách vận hành của nhân vật.

entities.js: Nhà máy sản xuất object (Factory). Chứa toàn bộ các hàm spawnBullet, spawnCrate, spawnMiniBoss, cấu trúc tạo Boss khổng lồ, triệu hồi Drone/Hazard.

📂 Giao Diện & Nhân Vật (UI, Menu, Characters)

ui.js: File thao tác với DOM duy nhất của hệ thống in-game HUD (Máu, XP, Báo Boss, Fragment Toast, thời gian tồn tại của skill).

characters/manager.js: Áp dụng thông số gốc từ config.js và chỉ số nâng cấp state.characterUpgrades để tính ra chỉ số cuối cùng lưu vào state.player khi bắt đầu game.

characters/select.js: Logic cho màn hình Chọn Nhân Vật. Đọc state.ownedCharacters để biết nhân vật nào đã mở khóa và hiển thị.

characters/shop.js: Giao diện và logic của Gacha. Mở thẻ (SCROLLS), trả kết quả rớt nhân vật hoặc mảnh, xử lý trade mảnh (Trading Menu) lấy nhân vật xịn.

📂 Công cụ bổ trợ (Utils, Auth, Audio)

utils.js: Chứa hàm tính khoảng cách thần thánh dist(x1,y1,x2,y2), các lệnh gọi API (fetch) tới backend (Đăng ký, Đăng nhập, Lưu Game).

auth.js: Xử lý việc chứng thực User. Lưu và tải Token, đồng bộ hóa localStorage (cục bộ) với CSDL Server.

audio.js: Nơi khởi tạo đối tượng new Audio(). Xuất các hàm playSound và playBGM, điều hướng tự động nhạc Boss dựa trên số màn.

3. LƯU Ý KHI MỞ RỘNG (Gacha & Characters)

Độ hiếm (Rarity) có 4 mốc chuẩn mực màu sắc:

common: Xanh lá (#4ade80)

rare: Xanh biển (#60a5fa)

legendary: Tím (#c084fc)

mythical: Hồng (#ff0088)

Nếu thêm một nhân vật mới, bạn chỉ cần mở file config.js -> mảng CHARACTERS, sau đó thêm ID mới. Hệ thống ở manager.js và select.js sẽ tự động nắm bắt.