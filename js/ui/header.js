import { esc, fmt } from './dom.js';

const TABS = [
  ['jornada', '🗺️', 'Jornada'],
  ['conquistas', '🏅', 'Conquistas'],
  ['recompensas', '🎁', 'Recompensas'],
  ['ranking', '🏆', 'Ranking'],
  ['painel', '⚙️', 'Painel'],
];

export function renderHeader({ store, engine }, route) {
  const { config, players } = store.getState();
  const p = store.getCurrentPlayer();
  const lv = engine.levelInfo(p.xp);

  return `
    <div class="topbar">
      <a class="brand" href="#/jornada"><span class="brand-mark">◆</span>${esc(config.name)}</a>
      <label class="player-select">
        <span class="player-select-label">Cliente</span>
        <select data-action="switchPlayer" aria-label="Cliente atual">
          ${Object.values(players)
            .map((pl) => `<option value="${esc(pl.id)}" ${pl.id === p.id ? 'selected' : ''}>${esc(pl.avatar)} ${esc(pl.name)}</option>`)
            .join('')}
        </select>
      </label>
    </div>
    <div class="hud card">
      <div class="hud-avatar" aria-hidden="true">${esc(p.avatar)}<span class="hud-level">${lv.level}</span></div>
      <div class="hud-main">
        <div class="hud-row">
          <strong class="hud-name">${esc(p.name)}</strong>
          <span class="level-pill">Nível ${lv.level} · ${esc(lv.title)}</span>
        </div>
        <div class="xpbar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.needed}" aria-valuenow="${lv.current}">
          <div class="xpbar-fill" style="width:${(lv.progress * 100).toFixed(1)}%"></div>
        </div>
        <div class="hud-sub">${fmt(lv.current)} / ${fmt(lv.needed)} XP para o nível ${lv.level + 1} · ${fmt(p.xp)} XP no total</div>
      </div>
      <div class="hud-stats">
        <div class="stat"><span class="stat-value">🪙 ${fmt(p.coins)}</span><span class="stat-label">moedas</span></div>
        <div class="stat"><span class="stat-value">🏅 ${Object.keys(p.badges).length}</span><span class="stat-label">conquistas</span></div>
      </div>
    </div>
    <nav class="tabs" aria-label="Seções">
      ${TABS.map(
        ([id, icon, label]) =>
          `<a href="#/${id}" class="tab ${route === id ? 'is-active' : ''}" ${route === id ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span> ${label}</a>`,
      ).join('')}
    </nav>`;
}

export const headerActions = {
  switchPlayer({ store }, el) {
    store.setState({ currentPlayerId: el.value });
  },
};
