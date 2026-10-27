import { esc, fmt, timeAgo, activityList } from '../dom.js';

export function render({ store, engine }) {
  const { config } = store.getState();
  const player = store.getCurrentPlayer();
  const summary = engine.journeySummary(player);
  const earned = Object.keys(player.badges).length;

  const badges = config.badges
    .map((b) => {
      const at = player.badges[b.id];
      return `
        <li class="badge ${at ? 'is-earned' : ''}">
          <span class="badge-icon" aria-hidden="true">${at ? esc(b.icon) : '🔒'}</span>
          <strong>${esc(b.name)}</strong>
          <p>${esc(b.description)}</p>
          <small>${at ? `Conquistada ${timeAgo(at)}` : b.xp ? `+${fmt(b.xp)} XP ao conquistar` : 'Bloqueada'}</small>
        </li>`;
    })
    .join('');

  return `
    <div class="stats-row">
      <div class="card stat-card"><span class="stat-big">${fmt(player.xp)}</span><span>XP total</span></div>
      <div class="card stat-card"><span class="stat-big">${summary.doneMissions}/${summary.totalMissions}</span><span>fases</span></div>
      <div class="card stat-card"><span class="stat-big">${summary.stagesDone}/${summary.totalStages}</span><span>cidades</span></div>
      <div class="card stat-card"><span class="stat-big">${earned}/${config.badges.length}</span><span>conquistas</span></div>
    </div>
    <h2 class="section-title">Conquistas</h2>
    <ul class="badge-grid">${badges}</ul>
    <h2 class="section-title">Histórico</h2>
    <section class="card">${activityList(player.history, 50)}</section>`;
}
