# Jornada do Cliente — gamificação

Ferramenta web (HTML + CSS + JavaScript puro, sem build) que transforma a jornada do cliente em um jogo: etapas, missões, XP, níveis, conquistas, moedas, recompensas e ranking.

## Rodar localmente

```bash
npm run dev
```

Abra http://localhost:5173. (Precisa de um servidor porque o código usa ES Modules; abrir o `index.html` direto não funciona.)

## Como funciona

O sistema hospedeiro só envia **eventos** do cliente; as regras ficam na configuração.

```js
JourneyGame.track('pedido_realizado');                       // cliente atual
JourneyGame.track('pedido_realizado', { playerId, amount: 2 });
JourneyGame.on('level:up', ({ level, playerId }) => { ... });
```

Eventos emitidos: `event:tracked`, `mission:completed`, `stage:completed`, `badge:earned`, `level:up`, `reward:granted`, `reward:redeemed`.

Também funciona embutido em `<iframe>` via `postMessage` (veja a aba **Painel → Integração**).

## Estrutura

```
index.html
css/styles.css
js/
  main.js               # inicialização, rotas e delegação de ações
  api.js                # window.JourneyGame + postMessage (integração)
  core/
    eventBus.js         # pub/sub
    store.js            # estado central + persistência
    storage.js          # adapters: LocalStorage (atual) e Supabase (esqueleto)
  engine/engine.js      # regras: missões, etapas, níveis, conquistas, resgates
  data/defaultJourney.js# configuração padrão + clientes de demonstração
  ui/                   # header/HUD, feedback (toasts, confete) e telas
server.js               # servidor estático para desenvolvimento
```

A configuração (etapas, missões, níveis, conquistas, recompensas) é editável em **Painel → Configuração da jornada**.

## Deploy (Vercel)

Importe o repositório no Vercel com o preset **Other**, sem comando de build e com o diretório de saída na raiz. Os arquivos são servidos como estão.

## Próximos passos sugeridos

- **Supabase**: trocar o `LocalStorageAdapter` pelo `SupabaseStorageAdapter` em `js/main.js` e evoluir o modelo para tabelas (`players`, `events`, `config`) com autenticação.
- Mover as regras do motor para o backend (Edge Function) para que eventos não possam ser forjados no navegador.
- Editor visual de etapas/missões no lugar do JSON.
