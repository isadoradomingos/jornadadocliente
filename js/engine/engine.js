// Motor de gamificação: recebe eventos da central e aplica as regras da
// configuração (fases, mundos, níveis, conquistas, moedas).
// Não conhece a interface — comunica resultados pelo barramento de eventos.
const HISTORY_LIMIT = 100;

export function createEngine({ store, bus }) {
  const cfg = () => store.getState().config;

  function newId(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  // ---------- Segmentos ----------
  function segmentOf(player) {
    const { segments } = cfg();
    return segments.find((s) => s.id === player.segment) || segments[0];
  }

  const stagesOf = (player) => segmentOf(player).stages;

  // ---------- Níveis ----------
  function xpForLevel(level) {
    const { base, exponent } = cfg().levels;
    return level <= 1 ? 0 : Math.round(base * Math.pow(level - 1, exponent));
  }

  function levelInfo(xp) {
    let level = 1;
    while (xp >= xpForLevel(level + 1)) level++;
    const floor = xpForLevel(level);
    const next = xpForLevel(level + 1);
    const titles = cfg().levels.titles;
    return {
      level,
      title: titles[Math.min(level - 1, titles.length - 1)],
      current: xp - floor,
      needed: next - floor,
      progress: (xp - floor) / (next - floor),
    };
  }

  // ---------- Consultas ----------
  function isStageComplete(player, stage) {
    return stage.missions.every((m) => player.completedMissions[m.id]);
  }

  function isStageUnlocked(player, stageIndex) {
    const stages = stagesOf(player);
    if (!cfg().sequential || stageIndex === 0) return true;
    return Boolean(player.completedStages[stages[stageIndex - 1].id]);
  }

  function isMissionUnlocked(player, stageIndex, missionIndex) {
    if (!isStageUnlocked(player, stageIndex)) return false;
    if (!cfg().sequentialMissions || missionIndex === 0) return true;
    const prev = stagesOf(player)[stageIndex].missions[missionIndex - 1];
    return Boolean(player.completedMissions[prev.id]);
  }

  function missionProgress(player, mission) {
    return Math.min(player.eventCounts[mission.trigger] || 0, mission.target || 1);
  }

  function journeySummary(player) {
    const stages = stagesOf(player);
    const missions = stages.flatMap((s) => s.missions);
    const done = missions.filter((m) => player.completedMissions[m.id]).length;
    let currentStage = null;
    let currentMission = null;
    stages.some((stage, si) =>
      stage.missions.some((m, mi) => {
        if (player.completedMissions[m.id] || !isMissionUnlocked(player, si, mi)) return false;
        currentStage = stage;
        currentMission = m;
        return true;
      }),
    );
    return {
      totalMissions: missions.length,
      doneMissions: done,
      percent: missions.length ? Math.round((done / missions.length) * 100) : 0,
      currentStage,
      currentMission,
      stagesDone: stages.filter((s) => player.completedStages[s.id]).length,
      totalStages: stages.length,
    };
  }

  function checkRule(player, rule) {
    switch (rule.type) {
      case 'missions_completed':
        return Object.keys(player.completedMissions).length >= rule.value;
      case 'stage_completed':
        return Boolean(player.completedStages[rule.stageId]);
      case 'level':
        return levelInfo(player.xp).level >= rule.value;
      case 'xp':
        return player.xp >= rule.value;
      case 'event_count':
        return (player.eventCounts[rule.event] || 0) >= rule.value;
      case 'all_stages': {
        const stages = stagesOf(player);
        return stages.length > 0 && stages.every((s) => player.completedStages[s.id]);
      }
      default:
        return false;
    }
  }

  // ---------- Regras (mutam o rascunho do player) ----------
  function grant(player, xp, coins, label, effects) {
    if (!xp && !coins) return;
    player.xp += xp || 0;
    player.coins += coins || 0;
    player.history.unshift({ label, xp: xp || 0, coins: coins || 0, ts: Date.now() });
    player.history.length = Math.min(player.history.length, HISTORY_LIMIT);
    effects.push({ type: 'reward:granted', xp, coins, label });
  }

  function evaluate(player, effects) {
    let changed = true;
    while (changed) {
      changed = false;
      stagesOf(player).forEach((stage, si) => {
        stage.missions.forEach((mission, mi) => {
          if (player.completedMissions[mission.id] || !isMissionUnlocked(player, si, mi)) return;
          if (missionProgress(player, mission) < (mission.target || 1)) return;
          player.completedMissions[mission.id] = Date.now();
          grant(player, mission.xp, mission.coins, `${mission.boss ? 'Chefão' : 'Fase'}: ${mission.title}`, effects);
          effects.push({ type: 'mission:completed', mission, stage });
          changed = true;
        });
        if (isStageUnlocked(player, si) && !player.completedStages[stage.id] && stage.missions.length && isStageComplete(player, stage)) {
          player.completedStages[stage.id] = Date.now();
          grant(player, stage.bonusXp, stage.bonusCoins, `Mundo concluído: ${stage.name}`, effects);
          effects.push({ type: 'stage:completed', stage });
          changed = true;
        }
      });
      for (const badge of cfg().badges) {
        if (player.badges[badge.id] || !checkRule(player, badge.rule)) continue;
        player.badges[badge.id] = Date.now();
        grant(player, badge.xp, 0, `Conquista: ${badge.name}`, effects);
        effects.push({ type: 'badge:earned', badge });
        changed = true;
      }
    }
  }

  // Aplica uma mutação num clone do player, salva e emite os efeitos.
  function applyToPlayer(playerId, mutate, { silent = false } = {}) {
    const state = store.getState();
    const id = playerId || state.currentPlayerId;
    const original = state.players[id];
    if (!original) throw new Error(`Central não encontrada: ${id}`);
    const player = structuredClone(original);
    const levelBefore = levelInfo(player.xp).level;
    const effects = [];
    mutate(player, effects);
    evaluate(player, effects);
    const after = levelInfo(player.xp);
    if (after.level > levelBefore) effects.push({ type: 'level:up', level: after.level, title: after.title });
    store.updatePlayer(player);
    if (!silent) effects.forEach((fx) => bus.emit(fx.type, { ...fx, playerId: player.id }));
    return effects;
  }

  // ---------- API pública do motor ----------
  function track(event, { playerId, amount = 1, silent = false } = {}) {
    const name = String(event || '').trim();
    if (!name) throw new Error('Informe o nome do evento.');
    return applyToPlayer(
      playerId,
      (player, effects) => {
        player.eventCounts[name] = (player.eventCounts[name] || 0) + amount;
        effects.push({ type: 'event:tracked', event: name, amount });
      },
      { silent },
    );
  }

  function redeem(rewardId, { playerId } = {}) {
    const reward = cfg().rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error('Recompensa não encontrada.');
    return applyToPlayer(playerId, (player, effects) => {
      if (player.coins < reward.cost) throw new Error('Moedas insuficientes.');
      player.coins -= reward.cost;
      player.redemptions.unshift({ rewardId, name: reward.name, icon: reward.icon, cost: reward.cost, ts: Date.now() });
      player.history.unshift({ label: `Resgate: ${reward.name}`, xp: 0, coins: -reward.cost, ts: Date.now() });
      effects.push({ type: 'reward:redeemed', reward });
    });
  }

  const emptyProgress = () => ({
    xp: 0,
    coins: 0,
    eventCounts: {},
    completedMissions: {},
    completedStages: {},
    badges: {},
    redemptions: [],
    history: [],
  });

  function applyStartEvents(playerId) {
    const player = store.getState().players[playerId];
    (segmentOf(player).startEvents || []).forEach((ev) => track(ev, { playerId, silent: true }));
  }

  function createPlayer(name, avatar = '🚕', segment = cfg().segments[0].id) {
    const player = { id: newId('p'), name, avatar, segment, ...emptyProgress(), createdAt: Date.now() };
    store.updatePlayer(player);
    applyStartEvents(player.id);
    return store.getState().players[player.id];
  }

  function resetPlayer(playerId) {
    store.updatePlayer({ ...store.getState().players[playerId], ...emptyProgress() });
    applyStartEvents(playerId);
  }

  // Após mudar a configuração, reaplica as regras para todos (sem notificar).
  function reevaluateAll() {
    Object.keys(store.getState().players).forEach((id) => applyToPlayer(id, () => {}, { silent: true }));
  }

  return {
    track,
    redeem,
    createPlayer,
    resetPlayer,
    reevaluateAll,
    levelInfo,
    segmentOf,
    stagesOf,
    isStageUnlocked,
    isMissionUnlocked,
    missionProgress,
    journeySummary,
  };
}
