export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function saveGame(state, GHOST_DATA_KEY) {
  let savePlayer = { ...state.player };
  delete savePlayer.gracePeriod;
  localStorage.setItem(
    GHOST_DATA_KEY,
    JSON.stringify({
      level: state.currentLevel,
      runs: state.pastRuns,
      player: savePlayer,
    }),
  );
}
