import { esc, fmt, activityList } from '../dom.js';

function missionItem(engine, player, mission, unlocked) {
  const done = Boolean(player.completedMissions[mission.id]);
  const target = mission.target || 1;
  const progress = engine.missionProgress(player, mission);
  return `
    <li class="mission ${done ? 'is-done' : ''}">
      <span class="mission-check" aria-hidden="true">${done ? '✓' : ''}</span>
      <div class="mission-body">
        <strong>${esc(mission.title)}</strong>
        <p>${esc(mission.description)}</p>
        ${
          target > 1
            ? `<div class="mini-progress"><div class="mini-progress-bar"><span style="width:${(progress / target) * 100}%"></span></div><small>${progress}/${target}</small></div>`
            : ''
        }
      </div>
      <div class="mission-meta">
        <span class="chip chip-xp">+${fmt(mission.xp)} XP</span>
        ${mission.coins ? `<span class="chip chip-coin">+${fmt(mission.coins)} 🪙</span>` : ''}
        ${
          !done && unlocked
            ? `<button class="btn btn-sm btn-ghost" data-action="simulate" data-event="${esc(mission.trigger)}" title="Dispara o evento “${esc(mission.trigger)}”">Simular</button>`
            : ''
        }
      </div>
    </li>`;
}

export function render({ store, engine }) {
  const { config } = store.getState();
  const player = store.getCurrentPlayer();
  const summary = engine.journeySummary(player);

  const stages = config.stages
    .map((stage, i) => {
      const unlocked = engine.isStageUnlocked(player, i);
      const done = Boolean(player.completedStages[stage.id]);
      const isCurrent = stage.id === summary.currentStage?.id;
      const status = done ? 'done' : isCurrent ? 'current' : unlocked ? 'open' : 'locked';
      const doneCount = stage.missions.filter((m) => player.completedMissions[m.id]).length;
      return `
        <li class="stage stage-${status}" style="--stage-color:${esc(stage.color || 'var(--accent)')}">
          <div class="stage-node" aria-hidden="true">${done ? '✓' : unlocked ? esc(stage.icon) : '🔒'}</div>
          <article class="stage-card card">
            <header class="stage-head">
              <div>
                <span class="eyebrow">Etapa ${i + 1}${isCurrent ? ' · você está aqui' : ''}${done ? ' · concluída' : ''}</span>
                <h3>${esc(stage.name)}</h3>
                <p>${esc(stage.description)}</p>
              </div>
              <div class="stage-side">
                <span class="stage-count">${doneCount}/${stage.missions.length}</span>
                ${stage.bonusXp ? `<span class="chip">Bônus +${fmt(stage.bonusXp)} XP</span>` : ''}
              </div>
            </header>
            ${unlocked ? '' : '<p class="locked-msg">🔒 Conclua a etapa anterior para desbloquear.</p>'}
            <ul class="missions">${stage.missions.map((m) => missionItem(engine, player, m, unlocked)).join('')}</ul>
          </article>
        </li>`;
    })
    .join('');

  return `
    <div class="layout-2col">
      <section aria-labelledby="trail-title">
        <h2 id="trail-title" class="section-title">Trilha da jornada</h2>
        <ol class="trail">${stages}</ol>
      </section>
      <aside class="side">
        <section class="card summary">
          <h2 class="card-title">Progresso</h2>
          <div class="ring" style="--p:${summary.percent}"><span>${summary.percent}%</span></div>
          <dl class="summary-list">
            <div><dt>Etapa atual</dt><dd>${summary.currentStage ? `${esc(summary.currentStage.icon)} ${esc(summary.currentStage.name)}` : '🏆 Jornada completa'}</dd></div>
            <div><dt>Missões</dt><dd>${summary.doneMissions} de ${summary.totalMissions}</dd></div>
            <div><dt>Etapas</dt><dd>${summary.stagesDone} de ${config.stages.length}</dd></div>
          </dl>
        </section>
        <section class="card">
          <h2 class="card-title">Atividade recente</h2>
          ${activityList(player.history, 8)}
        </section>
      </aside>
    </div>`;
}

export const actions = {
  simulate({ engine }, el) {
    engine.track(el.dataset.event);
  },
};
