// Barramento de eventos simples: desacopla o motor de gamificação da interface
// e de integrações externas (iframe, sistema hospedeiro, analytics).
export function createEventBus() {
  const handlers = new Map();

  function on(type, fn) {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => off(type, fn);
  }

  function off(type, fn) {
    handlers.get(type)?.delete(fn);
  }

  function emit(type, payload) {
    handlers.get(type)?.forEach((fn) => fn(payload));
    // '*' recebe todos os eventos: (type, payload)
    handlers.get('*')?.forEach((fn) => fn(type, payload));
  }

  return { on, off, emit };
}
