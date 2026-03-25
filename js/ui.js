import { state } from "./state.js";

export const UI = {
  main: document.getElementById("screen-main"),
  upgrade: document.getElementById("screen-upgrade"),
  bossReward: document.getElementById("screen-boss-reward"),
  title: document.getElementById("main-title"),
  desc: document.getElementById("main-desc"),
  btnStart: document.getElementById("btn-start"),
  timer: document.getElementById("timer"),
  level: document.getElementById("level-display"),
  ghosts: document.getElementById("ghost-count"),
  dash: document.getElementById("dash-cooldown"),
  healthBar: document.getElementById("health-bar"),
  shieldIcon: document.getElementById("shield-icon"),
  bossUi: document.getElementById("boss-ui"),
  bossHp: document.getElementById("boss-hp-fill"),
  bossName: document.getElementById("boss-name"),
};

export function updateHealthUI() {
  UI.healthBar.innerHTML = "";
  for (let i = 0; i < state.player.maxHp; i++) {
    let div = document.createElement("div");
    div.className = `heart ${i >= state.player.hp ? "empty" : ""}`;
    UI.healthBar.appendChild(div);
  }
  if (state.player.shield > 0) {
    UI.shieldIcon.style.display = "flex";
    UI.shieldIcon.innerText = state.player.shield;
    UI.healthBar.appendChild(UI.shieldIcon);
  } else {
    UI.shieldIcon.style.display = "none";
  }
}

export function generateCards(pool, container, isGold, onSelectCallback) {
  container.innerHTML = "";
  let shuffled = [...pool].sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, 3);

  selected.forEach((upg) => {
    let div = document.createElement("div");
    div.className = `card ${isGold ? "gold" : ""}`;
    div.innerHTML = `<h3>${upg.name}</h3><p>${upg.desc}</p>`;
    div.onclick = () => {
      upg.action(state.player);
      onSelectCallback();
    };
    container.appendChild(div);
  });
}
