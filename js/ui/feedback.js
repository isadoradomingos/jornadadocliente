import { esc, fmt } from './dom.js';

// Feedback visual dos eventos do motor: toasts, modal de nível e confete.
const MAX_TOASTS = 5;
let toastRoot;

export function toast({ icon = '✨', title, text = '', tone = 'default' }) {
  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="toast-icon">${esc(icon)}</span><div><strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}</div>`;
  toastRoot.append(el);
  while (toastRoot.children.length > MAX_TOASTS) toastRoot.firstElementChild.remove();
  setTimeout(() => el.remove(), 3800);
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#307fff', '#ea4242', '#ffce00', '#37b3dd', '#4db956'];
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 3500);
}

function levelUpModal({ level, title }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
      <div class="modal-badge">${level}</div>
      <h2 id="levelup-title">Subiu de nível!</h2>
      <p>Agora você é <strong>${esc(title)}</strong>.</p>
      <button class="btn btn-primary" data-action="closeModal">Continuar</button>
    </div>`;
  document.body.append(overlay);
  overlay.querySelector('button').focus();
  confetti();
}

export function setupFeedback(bus) {
  toastRoot = document.createElement('div');
  toastRoot.className = 'toasts';
  toastRoot.setAttribute('aria-live', 'polite');
  document.body.append(toastRoot);

  bus.on('mission:completed', ({ mission }) =>
    toast({
      icon: mission.boss ? '👑' : '✅',
      title: mission.boss ? 'Chefão derrotado!' : 'Fase concluída',
      text: `${mission.title} · +${fmt(mission.xp)} XP`,
      tone: mission.boss ? 'gold' : 'default',
    }),
  );
  bus.on('stage:completed', ({ stage }) => {
    toast({ icon: stage.icon, title: `${stage.city || stage.name} concluída!`, text: `Bônus +${fmt(stage.bonusXp)} XP`, tone: 'success' });
    confetti();
  });
  bus.on('badge:earned', ({ badge }) => toast({ icon: badge.icon, title: 'Nova conquista!', text: badge.name, tone: 'gold' }));
  bus.on('reward:redeemed', ({ reward }) => toast({ icon: reward.icon, title: 'Recompensa resgatada', text: reward.name, tone: 'success' }));
  bus.on('level:up', levelUpModal);
  bus.on('event:tracked', ({ event }) => console.info('[JourneyGame] evento', event));
}

export const feedbackActions = {
  closeModal(_ctx, el) {
    el.closest('.modal-overlay')?.remove();
  },
};
