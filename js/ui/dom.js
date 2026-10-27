const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

export function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

export function activityList(history, limit) {
  const items = history.slice(0, limit);
  if (!items.length) return '<p class="empty">Nenhuma atividade ainda. Simule um evento para começar!</p>';
  return `<ul class="activity">${items
    .map(
      (h) => `<li>
        <span class="activity-label">${esc(h.label)}</span>
        <span class="activity-meta">
          ${h.xp ? `<span class="chip chip-xp">+${fmt(h.xp)} XP</span>` : ''}
          ${h.coins ? `<span class="chip chip-coin">${h.coins > 0 ? '+' : ''}${fmt(h.coins)} 🪙</span>` : ''}
          <time>${timeAgo(h.ts)}</time>
        </span>
      </li>`,
    )
    .join('')}</ul>`;
}
