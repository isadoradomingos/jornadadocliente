// Ponto de integração com o sistema maior.
//
// 1) Mesma página:   window.JourneyGame.track('pedido_realizado')
// 2) Via iframe:     iframe.contentWindow.postMessage({ type: 'journey:track', event: 'pedido_realizado' }, origin)
//    e o iframe devolve ao pai mensagens { type: 'journey:<evento>', data } (mission:completed, level:up, ...)
//    Origens precisam estar em config.integration.allowedOrigins.
export function exposeApi({ engine, store, bus }) {
  const allowedOrigins = () => store.getState().config.integration?.allowedOrigins || [];
  const isAllowed = (origin) => origin === location.origin || allowedOrigins().includes(origin);

  const api = {
    version: '0.1.0',
    track: (event, options) => engine.track(event, options),
    redeem: (rewardId, options) => engine.redeem(rewardId, options),
    getPlayer: (id) => structuredClone(id ? store.getState().players[id] : store.getCurrentPlayer()),
    getConfig: () => structuredClone(store.getState().config),
    setCurrentPlayer: (id) => store.setState({ currentPlayerId: id }),
    on: bus.on,
    off: bus.off,
  };
  window.JourneyGame = api;

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || msg.type !== 'journey:track' || !isAllowed(e.origin)) return;
    try {
      engine.track(msg.event, msg.options);
    } catch (err) {
      console.warn('[JourneyGame]', err.message);
    }
  });

  if (window.parent !== window) {
    bus.on('*', (type, payload) => {
      const data = JSON.parse(JSON.stringify(payload));
      allowedOrigins().forEach((origin) => window.parent.postMessage({ type: `journey:${type}`, data }, origin));
    });
  }

  return api;
}
