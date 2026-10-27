import { esc, fmt } from '../dom.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export function render({ store, engine }) {
  const { players, currentPlayerId } = store.getState();
  const ranked = Object.values(players).sort((a, b) => b.xp - a.xp);

  const rows = ranked
    .map((p, i) => {
      const lv = engine.levelInfo(p.xp);
      const summary = engine.journeySummary(p);
      return `
        <li class="rank-row ${p.id === currentPlayerId ? 'is-me' : ''}">
          <span class="rank-pos">${MEDALS[i] || i + 1}</span>
          <span class="rank-avatar" aria-hidden="true">${esc(p.avatar)}</span>
          <div class="rank-info">
            <strong>${esc(p.name)}</strong>
            <small>Nível ${lv.level} · ${esc(lv.title)} · ${summary.currentStage ? `etapa ${esc(summary.currentStage.name)}` : 'jornada completa'}</small>
          </div>
          <span class="rank-xp">${fmt(p.xp)} XP</span>
          <button class="btn btn-sm btn-ghost" data-action="viewAs" data-id="${esc(p.id)}">Ver jornada</button>
        </li>`;
    })
    .join('');

  return `
    <h2 class="section-title">Ranking de clientes</h2>
    <ol class="card rank-list">${rows}</ol>`;
}

export const actions = {
  viewAs({ store }, el) {
    store.setState({ currentPlayerId: el.dataset.id });
    location.hash = '#/jornada';
  },
};
