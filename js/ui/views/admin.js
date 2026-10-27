import { esc } from '../dom.js';
import { toast } from '../feedback.js';
import { DEFAULT_CONFIG } from '../../data/defaultJourney.js';

const AVATARS = { mobilidade: ['🚕', '🚗', '🚙', '🚖', '🛺'], entregas: ['🛵', '🚚', '📦', '🚲'] };

function knownEvents(config) {
  const set = new Set(config.segments.flatMap((seg) => seg.stages.flatMap((s) => s.missions.map((m) => m.trigger))));
  config.badges.forEach((b) => b.rule.event && set.add(b.rule.event));
  return [...set];
}

function validateConfig(config) {
  if (!config || !Array.isArray(config.segments) || !config.segments.length) throw new Error('"segments" precisa ser uma lista com ao menos um segmento.');
  if (!config.levels?.base || !config.levels?.exponent || !config.levels?.titles?.length) throw new Error('"levels" precisa de base, exponent e titles.');
  const ids = new Set();
  for (const seg of config.segments) {
    if (!seg.id || !seg.name || !Array.isArray(seg.stages)) throw new Error(`Segmento inválido: ${seg.id || '(sem id)'} — precisa de id, name e stages.`);
    for (const stage of seg.stages) {
      if (!stage.id || !stage.name || !Array.isArray(stage.missions)) throw new Error(`Mundo inválido: ${stage.id || '(sem id)'} — precisa de id, name e missions.`);
      for (const m of stage.missions) {
        if (!m.id || !m.title || !m.trigger || typeof m.xp !== 'number') throw new Error(`Fase inválida em "${stage.id}": precisa de id, title, trigger e xp numérico.`);
        if (ids.has(m.id)) throw new Error(`id de fase repetido: ${m.id}`);
        ids.add(m.id);
      }
    }
  }
  config.badges ??= [];
  config.rewards ??= [];
  config.integration ??= { allowedOrigins: [] };
  return config;
}

export function render({ store }) {
  const { config } = store.getState();
  const player = store.getCurrentPlayer();
  const events = knownEvents(config);

  return `
    <div class="admin-grid">
      <section class="card">
        <h2 class="card-title">Simulador de eventos</h2>
        <p class="hint">Dispara eventos para <strong>${esc(player.avatar)} ${esc(player.name)}</strong>, como o painel Machine faria.</p>
        <div class="event-buttons">
          ${events.map((ev) => `<button class="btn btn-sm btn-ghost" data-action="simulate" data-event="${esc(ev)}"><code>${esc(ev)}</code></button>`).join('')}
        </div>
        <form class="inline-form" data-action="trackCustom">
          <input name="event" placeholder="evento_personalizado" required aria-label="Nome do evento" list="known-events">
          <datalist id="known-events">${events.map((ev) => `<option value="${esc(ev)}">`).join('')}</datalist>
          <input name="amount" type="number" min="1" value="1" aria-label="Quantidade" class="input-narrow">
          <button class="btn btn-primary btn-sm">Disparar</button>
        </form>
      </section>

      <section class="card">
        <h2 class="card-title">Centrais</h2>
        <form class="inline-form" data-action="addPlayer">
          <input name="name" placeholder="Nome da central" required aria-label="Nome da central">
          <select name="segment" aria-label="Segmento">
            ${config.segments.map((s) => `<option value="${esc(s.id)}" ${s.available === false ? 'disabled' : ''}>${esc(s.icon)} ${esc(s.name)}${s.available === false ? ' (em breve)' : ''}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm">Adicionar</button>
        </form>
        <div class="button-row">
          <button class="btn btn-sm btn-ghost" data-action="resetPlayer">Zerar progresso de ${esc(player.name)}</button>
          <button class="btn btn-sm btn-danger" data-action="resetAll">Restaurar demonstração</button>
        </div>
      </section>

      <section class="card span-2">
        <h2 class="card-title">Configuração da jornada</h2>
        <p class="hint">Segmentos → mundos (stages) → fases (missions; <code>trigger</code> = nome do evento, <code>boss: true</code> = chefão). Também níveis, conquistas e recompensas. Ao salvar, o progresso de todas as centrais é recalculado.</p>
        <textarea id="config-json" class="code-area" spellcheck="false" aria-label="Configuração em JSON">${esc(JSON.stringify(config, null, 2))}</textarea>
        <p id="config-error" class="error" role="alert" hidden></p>
        <div class="button-row">
          <button class="btn btn-primary btn-sm" data-action="saveConfig">Salvar configuração</button>
          <button class="btn btn-ghost btn-sm" data-action="exportConfig">Exportar JSON</button>
          <button class="btn btn-ghost btn-sm" data-action="restoreConfig">Restaurar padrão</button>
        </div>
      </section>

      <section class="card span-2">
        <h2 class="card-title">Integração com o painel</h2>
        <p class="hint">Como o painel Machine conversa com esta ferramenta:</p>
        <pre class="code-block"><code>// Na mesma página
JourneyGame.track('despacho_configurado');
JourneyGame.track('cadastro_motorista_aprovado', { playerId: 'p_123', amount: 2 });
JourneyGame.on('level:up', ({ level, playerId }) => { /* ... */ });

// Embutido via iframe (adicione a origem em integration.allowedOrigins)
iframe.contentWindow.postMessage({ type: 'journey:track', event: 'despacho_configurado' }, '${esc(location.origin)}');
window.addEventListener('message', (e) => { /* e.data.type === 'journey:mission:completed' ... */ });</code></pre>
      </section>
    </div>`;
}

export const actions = {
  trackCustom({ engine }, form) {
    const data = new FormData(form);
    try {
      engine.track(data.get('event'), { amount: Math.max(1, Number(data.get('amount')) || 1) });
    } catch (err) {
      toast({ icon: '⚠️', title: 'Evento inválido', text: err.message, tone: 'error' });
    }
  },
  addPlayer({ engine, store }, form) {
    const data = new FormData(form);
    const name = data.get('name').trim();
    const segment = data.get('segment');
    if (!name) return;
    const avatars = AVATARS[segment] || AVATARS.mobilidade;
    const player = engine.createPlayer(name, avatars[Math.floor(Math.random() * avatars.length)], segment);
    store.setState({ currentPlayerId: player.id });
    toast({ icon: player.avatar, title: 'Central adicionada', text: name, tone: 'success' });
  },
  resetPlayer({ engine, store }) {
    const p = store.getCurrentPlayer();
    if (confirm(`Zerar todo o progresso de ${p.name}?`)) engine.resetPlayer(p.id);
  },
  async resetAll({ storage, storageKey }) {
    if (!confirm('Apagar todos os dados locais e restaurar a demonstração?')) return;
    await storage.remove(storageKey);
    location.reload();
  },
  saveConfig({ store, engine }) {
    const errorEl = document.getElementById('config-error');
    try {
      const config = validateConfig(JSON.parse(document.getElementById('config-json').value));
      store.setState({ config });
      engine.reevaluateAll();
      toast({ icon: '💾', title: 'Configuração salva', tone: 'success' });
    } catch (err) {
      errorEl.textContent = err instanceof SyntaxError ? `JSON inválido: ${err.message}` : err.message;
      errorEl.hidden = false;
    }
  },
  exportConfig({ store }) {
    const blob = new Blob([JSON.stringify(store.getState().config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jornada-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  restoreConfig({ store, engine }) {
    if (!confirm('Substituir a configuração atual pela padrão?')) return;
    store.setState({ config: structuredClone(DEFAULT_CONFIG) });
    engine.reevaluateAll();
  },
};
