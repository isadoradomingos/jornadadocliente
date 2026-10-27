import { SCHEMA_VERSION } from '../core/store.js';

// Configuração padrão da jornada. Tudo aqui é editável pelo Admin (JSON)
// e, no futuro, pode vir do backend.
//
// Cada SEGMENTO (mobilidade urbana, entregas) tem sua própria trilha.
// Trilha = cidades (stages) → fases (missions). Fases são concluídas por
// EVENTOS (`trigger`): o painel Machine só precisa chamar
// JourneyGame.track('despacho_configurado') — a regra fica aqui.
export const DEFAULT_CONFIG = {
  name: 'Jornada da Central',
  sequential: true, // cidades desbloqueiam em ordem
  sequentialMissions: true, // fases desbloqueiam em ordem, como no Candy Crush
  levels: {
    base: 100, // XP para chegar ao nível 2
    exponent: 1.4, // curva de dificuldade
    titles: ['Central Iniciante', 'Central em Configuração', 'Central Preparada', 'Central em Operação', 'Central em Alta', 'Central Destaque', 'Central Referência'],
  },
  integration: {
    // Origens autorizadas a enviar/receber eventos via postMessage (uso em iframe).
    // Ex.: ["https://painel.machine.global"]. Vazio = apenas a mesma origem.
    allowedOrigins: [],
  },
  segments: [
    {
      id: 'mobilidade',
      name: 'Mobilidade urbana',
      icon: '🚕',
      vehicle: 'car', // desenhos em assets/car/ — o veículo que anda pelo mapa
      available: true,
      comingSoon: { city: 'Avenida Bandeirada', name: 'Primeiras corridas' },
      stages: [
        {
          id: 'mob_mundo1',
          city: 'Vale das Primeiras Corridas', // onde a central se prepara para rodar
          name: 'Preparando a central',
          icon: '🛠️',
          color: '#307fff',
          description: 'Deixe a central pronta para operar.',
          bonusXp: 150,
          bonusCoins: 30,
          missions: [
            { id: 'mob_painel', title: 'Acessar o seu painel', short: 'Painel', icon: '🖥️', description: 'Entrar no painel da sua central Machine pela primeira vez.', trigger: 'painel_acessado', target: 1, xp: 20, coins: 5, claimOnOpen: true },
            { id: 'mob_olivia', title: 'Abrir um chamado com a Olivia', short: 'Olivia', icon: '💬', description: 'Fale com a Olivia no chat do Suporte e abra seu primeiro chamado.', trigger: 'chamado_olivia_aberto', target: 1, xp: 40, coins: 10 },
            { id: 'mob_tarifas', title: 'Configurar tarifas e categorias', short: 'Tarifas', icon: '🏷️', description: 'Cadastre as categorias de veículo e as tarifas de cada uma.', trigger: 'tarifas_categorias_configuradas', target: 1, xp: 80, coins: 15 },
            { id: 'mob_taxas', title: 'Configurar as taxas da central', short: 'Taxas', icon: '💲', description: 'Defina as taxas que a central cobra sobre as corridas.', trigger: 'taxas_central_configuradas', target: 1, xp: 80, coins: 15 },
            { id: 'mob_despacho', title: 'Configurar o despacho', short: 'Despacho', icon: '📡', description: 'Defina como as corridas são distribuídas entre os motoristas.', trigger: 'despacho_configurado', target: 1, xp: 100, coins: 20 },
            { id: 'mob_integracao', title: 'Realizar a integração financeira', short: 'Integração financeira', icon: '🏦', boss: true, description: 'O chefão do Vale das Primeiras Corridas: conclua a integração financeira da central.', trigger: 'integracao_financeira_concluida', target: 1, xp: 300, coins: 60 },
          ],
        },
        {
          id: 'mob_mundo2',
          city: 'Vila dos Motoristas', // onde a frota se forma
          name: 'Montando a frota',
          icon: '🚗',
          color: '#f4a500',
          description: 'Traga motoristas para a sua central.',
          bonusXp: 200,
          bonusCoins: 40,
          missions: [
            { id: 'mob_carteira', title: 'Configurar a carteira de crédito', short: 'Carteira', icon: '💳', description: 'Configure a carteira de crédito da central.', trigger: 'carteira_credito_configurada', target: 1, xp: 100, coins: 20 },
            { id: 'mob_cadastros', title: 'Receber cadastros de motoristas', short: 'Cadastros', icon: '📝', description: 'Divulgue o app de motorista e receba os primeiros cadastros.', trigger: 'cadastro_motorista_recebido', target: 1, xp: 120, coins: 25 },
            { id: 'mob_aprovacao', title: 'Analisar e aprovar cadastros', short: 'Aprovação', icon: '✅', description: 'Analise a documentação e aprove os cadastros dos motoristas.', trigger: 'cadastro_motorista_aprovado', target: 1, xp: 150, coins: 30 },
          ],
        },
      ],
    },
    {
      id: 'entregas',
      name: 'Entregas',
      icon: '🛵',
      vehicle: 'moto', // entregador de moto, em assets/moto/
      available: false, // trilha ainda não definida
      stages: [],
    },
  ],
  // Tipos de regra: missions_completed | stage_completed | level | xp | event_count | all_stages
  badges: [
    { id: 'b_boas_vindas', name: 'Boas-vindas', icon: '👋', description: 'Entre no painel da sua central.', rule: { type: 'missions_completed', value: 1 }, xp: 10 },
    { id: 'b_olivia', name: 'Papo com a Olivia', icon: '💬', description: 'Abra seu primeiro chamado com a Olivia.', rule: { type: 'event_count', event: 'chamado_olivia_aberto', value: 1 }, xp: 20 },
    { id: 'b_preco', name: 'Preço certo', icon: '🏷️', description: 'Configure tarifas e categorias.', rule: { type: 'event_count', event: 'tarifas_categorias_configuradas', value: 1 }, xp: 20 },
    { id: 'b_chefao', name: 'Chefão derrotado', icon: '🏆', description: 'Conclua a integração financeira e vença o chefão do Vale das Primeiras Corridas.', rule: { type: 'stage_completed', stageId: 'mob_mundo1' }, xp: 50 },
    { id: 'b_motorista', name: 'Primeiro motorista', icon: '🚗', description: 'Aprove o primeiro cadastro de motorista.', rule: { type: 'event_count', event: 'cadastro_motorista_aprovado', value: 1 }, xp: 30 },
    { id: 'b_nivel5', name: 'Central em alta', icon: '🚀', description: 'Alcance o nível 5.', rule: { type: 'level', value: 5 }, xp: 50 },
    { id: 'b_completa', name: 'Trilha completa', icon: '👑', description: 'Conclua todas as cidades disponíveis.', rule: { type: 'all_stages' }, xp: 100 },
  ],
  // Recompensas provisórias: ajustar com o time comercial/CS.
  rewards: [
    { id: 'r_treinamento', name: 'Sessão extra de treinamento', icon: '🎓', description: 'Uma sessão ao vivo com o time Machine.', cost: 100 },
    { id: 'r_kit', name: 'Kit de divulgação', icon: '📣', description: 'Materiais para atrair motoristas e passageiros.', cost: 150 },
    { id: 'r_revisao', name: 'Revisão com especialista', icon: '🧑‍💻', description: 'Revisão das configurações da sua central.', cost: 250 },
    { id: 'r_destaque', name: 'Destaque nas redes Machine', icon: '⭐', description: 'Sua central em destaque nos canais da Machine.', cost: 400 },
  ],
};

// Centrais de demonstração. `events` é reproduzido pelo motor ao criar o estado,
// então o progresso delas é sempre coerente com a configuração.
const WORLD1 = { painel_acessado: 1, chamado_olivia_aberto: 1, tarifas_categorias_configuradas: 1, taxas_central_configuradas: 1, despacho_configurado: 1, integracao_financeira_concluida: 1 };
export const SEED_PLAYERS = [
  { name: 'Sua central (demo)', avatar: '🚕', segment: 'mobilidade', events: {} },
  { name: 'Rota Certa Mobilidade', avatar: '🚗', segment: 'mobilidade', events: { ...WORLD1, carteira_credito_configurada: 1 } },
  { name: 'VaiJá Transportes', avatar: '🚙', segment: 'mobilidade', events: { painel_acessado: 1, chamado_olivia_aberto: 1, tarifas_categorias_configuradas: 1 } },
  { name: 'Táxi Amigo', avatar: '🚖', segment: 'mobilidade', events: { ...WORLD1, carteira_credito_configurada: 1, cadastro_motorista_recebido: 3, cadastro_motorista_aprovado: 2 } },
  { name: 'Leva Eu', avatar: '🛺', segment: 'mobilidade', events: { painel_acessado: 1, chamado_olivia_aberto: 1, tarifas_categorias_configuradas: 1, taxas_central_configuradas: 1, despacho_configurado: 1 } },
];

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: structuredClone(DEFAULT_CONFIG),
    players: {},
    currentPlayerId: null,
  };
}
