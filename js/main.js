import { LocalStorageAdapter } from './core/storage.js';
import { createEventBus } from './core/eventBus.js';
import { createStore } from './core/store.js';
import { createEngine } from './engine/engine.js';
import { createInitialState, SEED_PLAYERS } from './data/defaultJourney.js';
import { exposeApi } from './api.js';
import { renderHeader, headerActions } from './ui/header.js';
import { setupFeedback, feedbackActions } from './ui/feedback.js';
import * as journey from './ui/views/journey.js';
import * as achievements from './ui/views/achievements.js';
import * as rewards from './ui/views/rewards.js';
import * as ranking from './ui/views/ranking.js';
import * as admin from './ui/views/admin.js';

const STORAGE_KEY = 'journey-game:state';

// Para usar o Supabase: troque por new SupabaseStorageAdapter(client) (ver core/storage.js).
const storage = new LocalStorageAdapter();
const bus = createEventBus();
const store = createStore(storage, STORAGE_KEY);
const isFresh = await store.init(createInitialState);
const engine = createEngine({ store, bus });

if (isFresh) {
  SEED_PLAYERS.forEach(({ name, avatar, events }) => {
    const player = engine.createPlayer(name, avatar);
    Object.entries(events).forEach(([event, amount]) => engine.track(event, { playerId: player.id, amount, silent: true }));
  });
  store.setState({ currentPlayerId: Object.keys(store.getState().players)[0] });
}

const ctx = { store, engine, bus, storage, storageKey: STORAGE_KEY };
const routes = { jornada: journey, conquistas: achievements, recompensas: rewards, ranking, painel: admin };
const actions = Object.assign({}, headerActions, feedbackActions, ...Object.values(routes).map((v) => v.actions || {}));

const headerEl = document.getElementById('app-header');
const viewEl = document.getElementById('app-view');

function currentRoute() {
  const name = location.hash.replace(/^#\/?/, '');
  return routes[name] ? name : 'jornada';
}

function render() {
  const route = currentRoute();
  headerEl.innerHTML = renderHeader(ctx, route);
  viewEl.innerHTML = routes[route].render(ctx);
}

// Delegação: qualquer elemento com data-action="nome" chama actions[nome](ctx, el, evento).
function dispatch(e, el) {
  actions[el.dataset.action]?.(ctx, el, e);
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && el.tagName !== 'SELECT' && el.tagName !== 'FORM') dispatch(e, el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('select[data-action]');
  if (el) dispatch(e, el);
});
document.addEventListener('submit', (e) => {
  const el = e.target.closest('form[data-action]');
  if (!el) return;
  e.preventDefault();
  dispatch(e, el);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelector('.modal-overlay')?.remove();
});

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0 });
});
store.subscribe(render);
setupFeedback(bus);
exposeApi({ engine, store, bus });
render();
