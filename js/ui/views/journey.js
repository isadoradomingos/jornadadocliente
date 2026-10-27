import { esc, fmt, activityList } from '../dom.js';

// Mapa estilo Candy Crush: estrada sinuosa de cima para baixo (acompanha a
// rolagem da página), uma fase por parada, cidades como faixas de cenário e
// um carro marcando a fase atual.
const W = 420; // largura de referência do mapa (o SVG escala com a tela)
const STEP = 124; // distância vertical entre fases
const BOSS_STEP = 150;
const BANNER = 150; // espaço para a placa da cidade
const TEASER = 190; // "em breve" no fim da trilha
const PAD = 56;
const DECOR = ['🏢', '🌳', '🏬', '🚦', '🏠', '🌳', '🅿️', '⛽', '🏦', '🚏'];

function buildLayout(stages) {
  const nodes = [];
  const worlds = [];
  let y = PAD; // y medido de cima para baixo
  let k = 0;
  stages.forEach((stage, si) => {
    const top = y;
    y += BANNER;
    stage.missions.forEach((mission, mi) => {
      const x = mission.boss ? W / 2 : W / 2 + 118 * Math.sin(k * 1.05);
      nodes.push({ stage, si, mission, mi, n: k + 1, x, top: y });
      y += mission.boss ? BOSS_STEP : STEP;
      k++;
    });
    worlds.push({ stage, si, top, bottom: y - STEP / 2 });
    y -= STEP / 2;
  });
  const teaser = { top: y, bottom: y + TEASER };
  return { nodes, worlds, teaser, height: teaser.bottom };
}

// Curva suave (Catmull-Rom → Bézier) passando por todos os pontos.
function smoothPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;

function nodeStatus(engine, player, node) {
  if (player.completedMissions[node.mission.id]) return 'done';
  return engine.isMissionUnlocked(player, node.si, node.mi) ? 'current' : 'locked';
}

function renderMap({ engine }, player, segment) {
  const stages = segment.stages;
  const { nodes, worlds, teaser, height } = buildLayout(stages);
  const statuses = nodes.map((n) => nodeStatus(engine, player, n));
  const lastDone = statuses.lastIndexOf('done');

  // Estrada: começa na largada (no topo), passa por todas as fases e desce até o "em breve".
  const start = { x: W / 2, y: PAD / 2 };
  const end = { x: W / 2, y: teaser.top + 50 };
  const pts = [start, ...nodes.map((n) => ({ x: n.x, y: n.top })), end];
  const road = smoothPath(pts);
  const doneRoad = smoothPath(pts.slice(0, lastDone + 2 + (statuses[lastDone + 1] === 'current' ? 1 : 0)));

  const worldBands = worlds
    .map((w) => {
      const unlocked = engine.isStageUnlocked(player, w.si);
      const done = Boolean(player.completedStages[w.stage.id]);
      const decor = Array.from({ length: Math.max(2, Math.round((w.bottom - w.top) / 110)) }, (_, i) => {
        const left = i % 2 ? 91 : 8;
        const topPx = w.top + 50 + i * 105;
        return `<span class="decor" style="left:${left}%;top:${pct(topPx, height)}">${DECOR[(i + w.si * 3) % DECOR.length]}</span>`;
      }).join('');
      return `
        <div class="world-band ${unlocked ? '' : 'is-locked'}" style="top:${pct(w.top, height)};height:${pct(w.bottom - w.top, height)};--c:${esc(w.stage.color)}">
          ${decor}
        </div>
        <div class="world-banner ${unlocked ? '' : 'is-locked'}" style="top:${pct(w.top + 62, height)};--c:${esc(w.stage.color)}">
          <span class="world-banner-icon">${unlocked ? esc(w.stage.icon) : '🔒'}</span>
          <span><small>Cidade ${w.si + 1} · ${done ? 'concluída' : esc(w.stage.name)}</small>${esc(w.stage.city || w.stage.name)}</span>
        </div>`;
    })
    .join('');

  const nodeEls = nodes
    .map((node, i) => {
      const status = statuses[i];
      const { mission } = node;
      return `
        <button class="node node-${status} ${mission.boss ? 'node-boss' : ''}" style="left:${pct(node.x, W)};top:${pct(node.top, height)};--c:${esc(node.stage.color)}"
          data-action="openMission" data-stage="${node.si}" data-mission="${node.mi}"
          aria-label="Fase ${node.n}: ${esc(mission.title)} (${status === 'done' ? 'concluída' : status === 'current' ? 'fase atual' : 'bloqueada'})">
          ${mission.boss ? '<span class="boss-tag">Chefão</span>' : ''}
          <span class="node-icon">${status === 'locked' ? '🔒' : esc(mission.icon || '⭐')}</span>
          <span class="node-num">${node.n}</span>
          ${status === 'done' ? '<span class="node-stars" aria-hidden="true">★★★</span>' : ''}
          <span class="node-label">${esc(mission.short || mission.title)}</span>
        </button>`;
    })
    .join('');

  const current = nodes[statuses.indexOf('current')];
  const car = current
    ? `<div class="car ${current.mission.boss ? 'car-boss' : ''}" style="left:${pct(current.x, W)};top:${pct(current.top, height)}" aria-hidden="true">${esc(segment.icon)}</div>`
    : '';

  return `
    <div class="map" style="aspect-ratio:${W}/${height}">
      ${worldBands}
      <div class="teaser" style="top:${pct(teaser.top, height)};height:${pct(teaser.bottom - teaser.top, height)}">
        <span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="cloud c3">☁️</span>
        <div class="teaser-card"><small>Cidade ${stages.length + 1} · ${esc(segment.comingSoon?.name || 'Novos desafios')}</small><strong>${esc(segment.comingSoon?.city || 'Próxima cidade')}</strong><span>Em breve</span></div>
      </div>
      <svg class="road" viewBox="0 0 ${W} ${height}" aria-hidden="true">
        <path d="${road}" class="road-curb"/>
        <path d="${road}" class="road-asphalt"/>
        ${lastDone >= 0 ? `<path d="${doneRoad}" class="road-done"/>` : ''}
        <path d="${road}" class="road-lane"/>
      </svg>
      <div class="start-flag" style="left:50%;top:${pct(PAD / 2, height)}">🏁 Largada</div>
      ${nodeEls}
      ${car}
    </div>`;
}

function comingSoonSegment(segment) {
  return `
    <div class="card empty-segment">
      <span class="empty-segment-icon">${esc(segment.icon)}</span>
      <h2>Trilha de ${esc(segment.name)} em construção</h2>
      <p>As fases deste segmento ainda serão definidas. Escolha uma central de mobilidade urbana para ver a trilha.</p>
    </div>`;
}

export function render(ctx) {
  const { store, engine } = ctx;
  const player = store.getCurrentPlayer();
  const segment = engine.segmentOf(player);
  if (!segment.stages.length) return comingSoonSegment(segment);

  const summary = engine.journeySummary(player);
  const next = summary.currentMission;
  const nextPos = next && locate(segment, next.id);

  const worldsList = segment.stages
    .map((s) => {
      const done = s.missions.filter((m) => player.completedMissions[m.id]).length;
      return `<li style="--c:${esc(s.color)}"><span>${esc(s.icon)} ${esc(s.city || s.name)}</span><span class="world-progress"><span style="width:${(done / s.missions.length) * 100}%"></span></span><small>${done}/${s.missions.length}</small></li>`;
    })
    .join('');

  return `
    <div class="layout-map">
      <section class="map-wrap" aria-label="Mapa da jornada">${renderMap(ctx, player, segment)}</section>
      <aside class="side">
        ${
          next
            ? `<section class="card next-card" style="--c:${esc(summary.currentStage.color)}">
                <span class="eyebrow">${next.boss ? `Chefão · ${esc(summary.currentStage.city || summary.currentStage.name)}` : `Próxima fase · ${esc(summary.currentStage.city || summary.currentStage.name)}`}</span>
                <div class="next-head"><span class="next-icon">${esc(next.icon)}</span><h2>${esc(next.title)}</h2></div>
                <p>${esc(next.description)}</p>
                <div class="chips"><span class="chip chip-xp">+${fmt(next.xp)} XP</span>${next.coins ? `<span class="chip chip-coin">+${fmt(next.coins)} 🪙</span>` : ''}</div>
                <button class="btn btn-primary btn-block" data-action="openMission" data-stage="${nextPos.si}" data-mission="${nextPos.mi}">Ver fase</button>
              </section>`
            : `<section class="card next-card"><span class="eyebrow">Trilha concluída</span><h2>👑 Todas as fases concluídas!</h2><p>Novas cidades chegam em breve.</p></section>`
        }
        <section class="card">
          <h2 class="card-title">Progresso</h2>
          <div class="progress-head"><div class="ring" style="--p:${summary.percent}"><span>${summary.percent}%</span></div>
          <p><strong>${summary.doneMissions} de ${summary.totalMissions}</strong> fases<br><strong>${summary.stagesDone} de ${summary.totalStages}</strong> cidades</p></div>
          <ul class="worlds-list">${worldsList}</ul>
        </section>
        <section class="card">
          <h2 class="card-title">Atividade recente</h2>
          ${activityList(player.history, 6)}
        </section>
      </aside>
    </div>`;
}

function locate(segment, missionId) {
  for (let si = 0; si < segment.stages.length; si++) {
    const mi = segment.stages[si].missions.findIndex((m) => m.id === missionId);
    if (mi >= 0) return { si, mi };
  }
  return null;
}

// Mantém o carro (fase atual) visível: só rola se ele estiver fora da tela.
export function afterRender() {
  const el = document.querySelector('.node-current') || [...document.querySelectorAll('.node-done')].pop();
  if (!el) return;
  const { top, bottom } = el.getBoundingClientRect();
  if (top < 80 || bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function missionModal(ctx, si, mi) {
  const { store, engine } = ctx;
  const player = store.getCurrentPlayer();
  const stage = engine.segmentOf(player).stages[si];
  const mission = stage.missions[mi];
  const doneAt = player.completedMissions[mission.id];
  const unlocked = engine.isMissionUnlocked(player, si, mi);
  const prev = mi > 0 ? stage.missions[mi - 1] : null;
  const target = mission.target || 1;
  const progress = engine.missionProgress(player, mission);

  let footer;
  if (doneAt) {
    footer = `<p class="status status-done">✓ Concluída em ${new Date(doneAt).toLocaleDateString('pt-BR')}</p>`;
  } else if (unlocked) {
    footer = `
      ${target > 1 ? `<div class="mini-progress"><div class="mini-progress-bar"><span style="width:${(progress / target) * 100}%"></span></div><small>${progress}/${target}</small></div>` : ''}
      <button class="btn btn-primary btn-block" data-action="simulate" data-event="${esc(mission.trigger)}">Simular conclusão (demo)</button>
      <p class="hint">No painel real, esta fase é concluída automaticamente pelo evento <code>${esc(mission.trigger)}</code>.</p>`;
  } else {
    footer = `<p class="status status-locked">🔒 ${prev ? `Conclua antes: <strong>${esc(prev.title)}</strong>` : `Conclua “${esc(engine.segmentOf(player).stages[si - 1]?.city || 'a cidade anterior')}” para desbloquear.`}</p>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal mission-modal" role="dialog" aria-modal="true" aria-labelledby="mission-title" style="--c:${esc(stage.color)}">
      <button class="modal-close" data-action="closeModal" aria-label="Fechar">×</button>
      <div class="mission-modal-icon ${mission.boss ? 'is-boss' : ''}">${esc(mission.icon || '⭐')}</div>
      <span class="eyebrow">${mission.boss ? `👑 Chefão · ${esc(stage.city || stage.name)}` : `${esc(stage.city || stage.name)} · ${esc(stage.name)}`}</span>
      <h2 id="mission-title">${esc(mission.title)}</h2>
      <p>${esc(mission.description)}</p>
      <div class="chips"><span class="chip chip-xp">+${fmt(mission.xp)} XP</span>${mission.coins ? `<span class="chip chip-coin">+${fmt(mission.coins)} 🪙</span>` : ''}</div>
      ${footer}
    </div>`;
  document.body.append(overlay);
  overlay.querySelector('.btn, .modal-close').focus();
}

export const actions = {
  openMission(ctx, el) {
    missionModal(ctx, Number(el.dataset.stage), Number(el.dataset.mission));
  },
  simulate({ engine }, el) {
    el.closest('.modal-overlay')?.remove();
    engine.track(el.dataset.event);
  },
};
