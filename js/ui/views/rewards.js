import { esc, fmt, timeAgo } from '../dom.js';
import { toast } from '../feedback.js';

export function render({ store }) {
  const { config } = store.getState();
  const player = store.getCurrentPlayer();

  const rewards = config.rewards
    .map((r) => {
      const missing = r.cost - player.coins;
      return `
        <li class="card reward">
          <span class="reward-icon" aria-hidden="true">${esc(r.icon)}</span>
          <strong>${esc(r.name)}</strong>
          <p>${esc(r.description)}</p>
          <div class="reward-foot">
            <span class="chip chip-coin">${fmt(r.cost)} 🪙</span>
            <button class="btn btn-sm ${missing > 0 ? 'btn-ghost' : 'btn-primary'}" data-action="redeem" data-id="${esc(r.id)}" ${missing > 0 ? 'disabled' : ''}>
              ${missing > 0 ? `Faltam ${fmt(missing)}` : 'Resgatar'}
            </button>
          </div>
        </li>`;
    })
    .join('');

  const redemptions = player.redemptions.length
    ? `<ul class="activity">${player.redemptions
        .map((r) => `<li><span class="activity-label">${esc(r.icon)} ${esc(r.name)}</span><span class="activity-meta"><span class="chip chip-coin">-${fmt(r.cost)} 🪙</span><time>${timeAgo(r.ts)}</time></span></li>`)
        .join('')}</ul>`
    : '<p class="empty">Nenhum resgate ainda.</p>';

  return `
    <div class="balance card">
      <span class="balance-icon" aria-hidden="true">🪙</span>
      <div><span class="stat-big">${fmt(player.coins)}</span><p>moedas disponíveis · ganhe mais concluindo fases e cidades</p></div>
    </div>
    <h2 class="section-title">Catálogo de recompensas</h2>
    <ul class="reward-grid">${rewards}</ul>
    <h2 class="section-title">Meus resgates</h2>
    <section class="card">${redemptions}</section>`;
}

export const actions = {
  redeem({ engine }, el) {
    try {
      engine.redeem(el.dataset.id);
    } catch (err) {
      toast({ icon: '⚠️', title: 'Não foi possível resgatar', text: err.message, tone: 'error' });
    }
  },
};
