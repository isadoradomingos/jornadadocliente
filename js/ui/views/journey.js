import { esc, fmt, activityList } from '../dom.js';

// Mapa estilo Candy Crush: estrada sinuosa de cima para baixo (acompanha a
// rolagem da página), uma fase por parada, cidades como faixas de cenário e
// um carro marcando a fase atual.
const W = 420; // largura de referência do mapa (o SVG escala com a tela)
const STEP = 124; // distância vertical entre fases
const BOSS_STEP = 150;
const BANNER = 130; // espaço para a placa da cidade
const TEASER = 190; // "em breve" no fim da trilha
const PAD = 0; // o mapa começa direto na primeira cidade
const DECOR = ['🏢', '🌳', '🏬', '🚦', '🏠', '🌳', '🅿️', '⛽', '🏦', '🚏'];

// Veículo visto de cima (segment.vehicle: 'car' ou 'moto'), um desenho por ângulo:
// 0 = subindo, 1 = noroeste, 2 = esquerda, 3 = sudoeste, 4 = descendo.
// As direções para a direita usam os mesmos desenhos espelhados.
const vehicleSprite = (vehicle, i) => `assets/${vehicle}/${vehicle}-${i}.png`;
// Índice = direção em passos de 45° a partir do leste (sentido horário, y para baixo).
const CAR_HEADINGS = [[2, true], [3, true], [4, false], [3, false], [2, false], [1, false], [0, false], [1, true]];
const CAR_SPEED = 260; // unidades do mapa por segundo
let lastCar = null; // { playerId, len } — onde o veículo está agora na estrada
let carAnim = 0;
let stopCarWait = null;

// Chama fn quando não houver janela de aviso aberta na frente do mapa (ex.: "Subiu de nível").
// Os toasts do canto somem sozinhos e não seguram o veículo.
// O instante de espera cobre a janela que surge logo depois do render, na mesma conclusão.
function afterNotices(fn) {
  let timer = 0;
  const check = () => {
    clearTimeout(timer);
    if (document.querySelector('.modal-overlay')) return;
    timer = setTimeout(() => {
      observer.disconnect();
      fn();
    }, 60);
  };
  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  stopCarWait = () => {
    observer.disconnect();
    clearTimeout(timer);
  };
  check();
}

function buildLayout(stages) {
  const nodes = [];
  const worlds = [];
  let y = PAD; // y medido de cima para baixo
  let k = 0;
  stages.forEach((stage, si) => {
    const top = y;
    y += BANNER;
    stage.missions.forEach((mission, mi) => {
      // x = ponto na pista; o botão da fase fica ao lado, do lado com mais espaço.
      const x = mission.boss ? W / 2 : W / 2 + 118 * Math.sin(k * 1.05);
      const side = x > W / 2 ? 'left' : 'right';
      nodes.push({ stage, si, mission, mi, n: k + 1, x, side, top: y });
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

  // Estrada: começa na largada (no topo), passa por todas as fases e desce até o "em breve".
  const start = { x: W / 2, y: -20 }; // a estrada entra pelo topo do mapa
  const end = { x: W / 2, y: teaser.top + 50 };
  const pts = [start, ...nodes.map((n) => ({ x: n.x, y: n.top })), end];
  const road = smoothPath(pts);

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
        <div class="world-banner ${unlocked ? '' : 'is-locked'}" style="top:${pct(w.top + 48, height)};--c:${esc(w.stage.color)}">
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
        <button class="node node-${status} node-${node.side} ${mission.boss ? 'node-boss' : ''}" style="left:calc(${pct(node.x, W)} ${node.side === 'left' ? '-' : '+'} var(--side));top:${pct(node.top, height)};--c:${esc(node.stage.color)}"
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

  // Cada fase tem um pontinho na pista (o tracinho até o botão é desenhado no CSS do botão).
  const stops = nodes
    .map((node, i) => `<circle cx="${node.x.toFixed(1)}" cy="${node.top}" r="7" class="stop stop-${statuses[i]}" style="--c:${esc(node.stage.color)}"/>`)
    .join('');

  // O carro para em cima do pontinho da fase atual (ou no "em breve", se a trilha acabou);
  // a posição exata e o trajeto são calculados em afterRender, sobre o caminho já desenhado.
  const current = nodes[statuses.indexOf('current')];
  const vehicle = segment.vehicle || 'car';
  const car = `<div class="car" data-y="${current ? current.top : end.y}" data-vehicle="${esc(vehicle)}" aria-hidden="true"><img src="${vehicleSprite(vehicle, 4)}" alt=""></div>`;

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
        <path d="${road}" class="road-done" stroke-dasharray="0 1e5"/>
        <path d="${road}" class="road-lane"/>
        ${stops}
      </svg>
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

// Leva o carro pela estrada da última parada até a nova, virando o desenho conforme a curva.
function driveCar(player) {
  cancelAnimationFrame(carAnim);
  stopCarWait?.();
  const car = document.querySelector('.car');
  const path = document.querySelector('.road-asphalt');
  if (!car || !path) return;
  const img = car.querySelector('img');
  // O trecho azul é a mesma estrada, pintada só até onde o veículo está (fica sempre alinhado).
  const done = document.querySelector('.road-done');
  const height = path.ownerSVGElement.viewBox.baseVal.height;
  const total = path.getTotalLength();

  // A estrada só desce, então dá para achar o comprimento de um y por busca binária.
  const lengthAtY = (y) => {
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).y < y) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  const place = (len) => {
    const p = path.getPointAtLength(len);
    const a = path.getPointAtLength(Math.max(0, len - 2));
    const b = path.getPointAtLength(Math.min(total, len + 2));
    const step = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4));
    const [sprite, mirror] = CAR_HEADINGS[((step % 8) + 8) % 8];
    lastCar = { playerId: player.id, len };
    done.setAttribute('stroke-dasharray', `${len.toFixed(1)} 1e5`);
    car.style.left = pct(p.x, W);
    car.style.top = pct(p.y, height);
    const src = vehicleSprite(car.dataset.vehicle, sprite);
    if (!img.src.endsWith(src)) img.src = src;
    img.classList.toggle('is-mirrored', mirror);
  };

  const to = lengthAtY(Number(car.dataset.y));
  // Mesmo cliente: sai de onde o veículo está (mesmo que tenha sido interrompido no meio).
  // Ao abrir o mapa ou trocar de cliente: um trechinho de entrada.
  const from = lastCar?.playerId === player.id ? lastCar.len : Math.max(0, to - 140);

  if (from >= to || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    place(to);
    return;
  }
  const duration = Math.min(4000, Math.max(700, ((to - from) / CAR_SPEED) * 1000));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  let t0;
  const tick = (now) => {
    t0 ??= now;
    const t = Math.min(1, (now - t0) / duration);
    place(from + (to - from) * ease(t));
    if (t < 1) carAnim = requestAnimationFrame(tick);
  };
  // O veículo espera parado enquanto houver aviso na frente, para a viagem não passar despercebida.
  place(from);
  afterNotices(() => {
    carAnim = requestAnimationFrame(tick);
  });
}

// Mantém o carro (fase atual) visível: só rola se ele estiver fora da tela.
export function afterRender({ store }) {
  driveCar(store.getCurrentPlayer());
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
