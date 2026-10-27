// Estado central da aplicação: configuração da jornada + clientes (players).
// Toda alteração passa por aqui, é persistida pelo adapter e notifica a UI.
export const SCHEMA_VERSION = 1;

export function createStore(storage, key) {
  let state = null;
  const listeners = new Set();

  function commit(next) {
    state = next;
    Promise.resolve(storage.save(key, state)).catch((err) => console.error('[store]', err));
    listeners.forEach((fn) => fn(state));
  }

  return {
    // Retorna true quando o estado foi criado do zero (primeiro acesso).
    async init(createInitial) {
      const saved = await storage.load(key);
      const valid = saved && saved.schemaVersion === SCHEMA_VERSION;
      state = valid ? saved : createInitial();
      return !valid;
    },
    getState: () => state,
    getCurrentPlayer: () => state.players[state.currentPlayerId],
    setState(patch) {
      commit({ ...state, ...patch });
    },
    updatePlayer(player) {
      commit({ ...state, players: { ...state.players, [player.id]: player } });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
