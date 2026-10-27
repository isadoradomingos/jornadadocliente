import { SCHEMA_VERSION } from '../core/store.js';

// Configuração padrão da jornada. Tudo aqui é editável pelo Painel (JSON)
// e, no futuro, pode vir do backend.
//
// Missões são concluídas por EVENTOS (`trigger`). O sistema hospedeiro só
// precisa chamar JourneyGame.track('pedido_realizado') — a regra fica aqui.
export const DEFAULT_CONFIG = {
  name: 'Jornada do Cliente',
  sequential: true, // etapas desbloqueiam em ordem
  levels: {
    base: 100, // XP para chegar ao nível 2
    exponent: 1.5, // curva de dificuldade
    titles: ['Visitante', 'Explorador', 'Cliente', 'Cliente Ativo', 'Cliente Fiel', 'Embaixador', 'Lenda'],
  },
  integration: {
    // Origens autorizadas a enviar/receber eventos via postMessage (uso em iframe).
    // Ex.: ["https://meusistema.com.br"]. Vazio = apenas a mesma origem.
    allowedOrigins: [],
  },
  stages: [
    {
      id: 'descoberta',
      name: 'Descoberta',
      icon: '🧭',
      color: '#0ea5e9',
      description: 'O primeiro contato com a marca.',
      bonusXp: 50,
      bonusCoins: 10,
      missions: [
        { id: 'm_instalar', title: 'Instalar o app', description: 'Baixe e abra o aplicativo pela primeira vez.', trigger: 'app_instalado', target: 1, xp: 20, coins: 5 },
        { id: 'm_tour', title: 'Fazer o tour', description: 'Conheça as principais funcionalidades.', trigger: 'tour_concluido', target: 1, xp: 30, coins: 5 },
      ],
    },
    {
      id: 'cadastro',
      name: 'Cadastro',
      icon: '📝',
      color: '#8b5cf6',
      description: 'Criar a conta e deixar tudo pronto.',
      bonusXp: 80,
      bonusCoins: 15,
      missions: [
        { id: 'm_cadastro', title: 'Criar sua conta', description: 'Conclua o cadastro básico.', trigger: 'cadastro_concluido', target: 1, xp: 40, coins: 5 },
        { id: 'm_email', title: 'Verificar e-mail', description: 'Confirme seu endereço de e-mail.', trigger: 'email_verificado', target: 1, xp: 20, coins: 5 },
        { id: 'm_perfil', title: 'Completar o perfil', description: 'Adicione foto e preferências.', trigger: 'perfil_completo', target: 1, xp: 40, coins: 10 },
      ],
    },
    {
      id: 'ativacao',
      name: 'Primeira compra',
      icon: '🛒',
      color: '#f59e0b',
      description: 'O momento da primeira experiência real.',
      bonusXp: 120,
      bonusCoins: 25,
      missions: [
        { id: 'm_pagamento', title: 'Cadastrar pagamento', description: 'Adicione um meio de pagamento.', trigger: 'pagamento_cadastrado', target: 1, xp: 40, coins: 5 },
        { id: 'm_pedido1', title: 'Fazer o primeiro pedido', description: 'Conclua sua primeira compra.', trigger: 'pedido_realizado', target: 1, xp: 100, coins: 20 },
        { id: 'm_avaliar1', title: 'Avaliar a experiência', description: 'Conte pra gente como foi.', trigger: 'avaliacao_enviada', target: 1, xp: 40, coins: 10 },
      ],
    },
    {
      id: 'engajamento',
      name: 'Engajamento',
      icon: '🔥',
      color: '#ef4444',
      description: 'Criar o hábito de voltar.',
      bonusXp: 150,
      bonusCoins: 30,
      missions: [
        { id: 'm_pedido5', title: 'Fazer 5 pedidos', description: 'Volte e faça mais pedidos.', trigger: 'pedido_realizado', target: 5, xp: 150, coins: 30 },
        { id: 'm_notif', title: 'Ativar notificações', description: 'Receba ofertas e novidades.', trigger: 'notificacoes_ativadas', target: 1, xp: 30, coins: 5 },
        { id: 'm_cupom', title: 'Usar um cupom', description: 'Aproveite um cupom de desconto.', trigger: 'cupom_usado', target: 1, xp: 50, coins: 10 },
      ],
    },
    {
      id: 'fidelizacao',
      name: 'Fidelização',
      icon: '💎',
      color: '#14b8a6',
      description: 'Relacionamento de longo prazo.',
      bonusXp: 250,
      bonusCoins: 50,
      missions: [
        { id: 'm_pedido15', title: 'Fazer 15 pedidos', description: 'Torne-se um cliente frequente.', trigger: 'pedido_realizado', target: 15, xp: 300, coins: 60 },
        { id: 'm_avaliar5', title: 'Avaliar 5 experiências', description: 'Sua opinião melhora o serviço.', trigger: 'avaliacao_enviada', target: 5, xp: 100, coins: 20 },
        { id: 'm_plano', title: 'Assinar o plano fidelidade', description: 'Desbloqueie benefícios exclusivos.', trigger: 'plano_assinado', target: 1, xp: 200, coins: 40 },
      ],
    },
    {
      id: 'embaixador',
      name: 'Embaixador',
      icon: '📣',
      color: '#ec4899',
      description: 'Indicar e levar a marca adiante.',
      bonusXp: 500,
      bonusCoins: 100,
      missions: [
        { id: 'm_compartilhar', title: 'Compartilhar nas redes', description: 'Mostre a marca para seus amigos.', trigger: 'compartilhou_redes', target: 1, xp: 50, coins: 10 },
        { id: 'm_indicar3', title: 'Enviar 3 indicações', description: 'Convide amigos com seu código.', trigger: 'indicacao_enviada', target: 3, xp: 120, coins: 25 },
        { id: 'm_conversao', title: 'Indicação convertida', description: 'Um amigo indicado fez o primeiro pedido.', trigger: 'indicacao_convertida', target: 1, xp: 250, coins: 50 },
      ],
    },
  ],
  // Tipos de regra: missions_completed | stage_completed | level | xp | event_count | all_stages
  badges: [
    { id: 'b_primeiros_passos', name: 'Primeiros passos', icon: '👣', description: 'Conclua sua primeira missão.', rule: { type: 'missions_completed', value: 1 }, xp: 10 },
    { id: 'b_bem_vindo', name: 'Bem-vindo(a)!', icon: '🎉', description: 'Conclua a etapa de cadastro.', rule: { type: 'stage_completed', stageId: 'cadastro' }, xp: 20 },
    { id: 'b_estreia', name: 'Estreia', icon: '🛍️', description: 'Faça seu primeiro pedido.', rule: { type: 'event_count', event: 'pedido_realizado', value: 1 }, xp: 20 },
    { id: 'b_critico', name: 'Crítico de plantão', icon: '⭐', description: 'Envie 3 avaliações.', rule: { type: 'event_count', event: 'avaliacao_enviada', value: 3 }, xp: 30 },
    { id: 'b_nivel5', name: 'Decolando', icon: '🚀', description: 'Alcance o nível 5.', rule: { type: 'level', value: 5 }, xp: 50 },
    { id: 'b_mil', name: 'Mil pontos', icon: '🏅', description: 'Acumule 1.000 XP.', rule: { type: 'xp', value: 1000 }, xp: 0 },
    { id: 'b_fiel', name: 'Cliente fiel', icon: '💎', description: 'Conclua a etapa de fidelização.', rule: { type: 'stage_completed', stageId: 'fidelizacao' }, xp: 50 },
    { id: 'b_completa', name: 'Jornada completa', icon: '🏆', description: 'Conclua todas as etapas.', rule: { type: 'all_stages' }, xp: 100 },
  ],
  rewards: [
    { id: 'r_frete', name: 'Frete grátis', icon: '🚚', description: 'Válido para um pedido.', cost: 50 },
    { id: 'r_desc10', name: '10% de desconto', icon: '🏷️', description: 'Cupom para o próximo pedido.', cost: 100 },
    { id: 'r_brinde', name: 'Brinde exclusivo', icon: '🎁', description: 'Enviado junto com seu pedido.', cost: 250 },
    { id: 'r_vip', name: 'Atendimento VIP', icon: '👑', description: '30 dias de atendimento prioritário.', cost: 500 },
  ],
};

// Clientes de demonstração. `events` é reproduzido pelo motor ao criar o estado,
// então o progresso deles é sempre coerente com a configuração.
export const SEED_PLAYERS = [
  { name: 'Você (demo)', avatar: '🙂', events: {} },
  {
    name: 'Mariana Costa',
    avatar: '👩',
    events: { app_instalado: 1, tour_concluido: 1, cadastro_concluido: 1, email_verificado: 1, perfil_completo: 1, pagamento_cadastrado: 1, pedido_realizado: 7, avaliacao_enviada: 3, notificacoes_ativadas: 1, cupom_usado: 1 },
  },
  {
    name: 'Rafael Lima',
    avatar: '👨',
    events: { app_instalado: 1, tour_concluido: 1, cadastro_concluido: 1, email_verificado: 1, perfil_completo: 1, pagamento_cadastrado: 1, pedido_realizado: 2, avaliacao_enviada: 1 },
  },
  { name: 'Juliana Alves', avatar: '👩‍🦱', events: { app_instalado: 1, tour_concluido: 1, cadastro_concluido: 1 } },
  {
    name: 'Pedro Santos',
    avatar: '🧔',
    events: { app_instalado: 1, tour_concluido: 1, cadastro_concluido: 1, email_verificado: 1, perfil_completo: 1, pagamento_cadastrado: 1, pedido_realizado: 18, avaliacao_enviada: 6, notificacoes_ativadas: 1, cupom_usado: 2, plano_assinado: 1, compartilhou_redes: 1, indicacao_enviada: 1 },
  },
];

export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: structuredClone(DEFAULT_CONFIG),
    players: {},
    currentPlayerId: null,
  };
}
