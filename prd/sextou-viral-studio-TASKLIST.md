# TaskList — Sextou Viral Studio v2
> Gerada por Chain-of-Thought em Junho 2026  
> Sprint: SVS-v2 Foundation → Launch  
> Total de tarefas: 52 | Sprints: 7

## Contexto do Projeto

O Sextou Viral Studio é uma plataforma SaaS de criação automatizada de vídeos virais com IA. A v1 foi validada como HTML standalone — este TaskList cobre a migração para produção: Next.js 15 + Supabase + multiusuário + HeyGen PRO + overlay de logo/animações. O fluxo central guia o usuário por 4 fases (briefing → roteiro → vozes → vídeo) e entrega um MP4 com narração voice-over pronta para redes sociais. Usuários PRO têm acesso ao modo Avatar HeyGen com lip sync real e vídeos de até 15s.

---

## SPRINT 1 — Fundação de Infraestrutura

### Raciocínio
Antes de qualquer feature de produto, a fundação técnica precisa estar sólida: repositório, banco, autenticação e layout base. Tudo neste sprint é bloqueante para os demais. Ordem: setup → banco → auth → layout → deploy.

### Tarefas

#### TASK-01 · chiara · 🔴 Alta
**Ação:** Criar projeto Next.js 15 com App Router, TypeScript strict, Tailwind CSS, shadcn/ui e ESLint configurado, com estrutura de pastas `/app`, `/components`, `/lib`, `/types`, `/hooks`  
**Contexto:** Base do frontend da plataforma Sextou Viral Studio v2. Toda a UI será construída sobre este projeto.  
**Input esperado:** Nenhum — projeto do zero  
**Output esperado:** Repositório Git com projeto rodando em `localhost:3000`, `npm run build` sem erros  
**Critério de conclusão:** PR aprovado com lint zerado e build passando em CI

#### TASK-02 · david · 🔴 Alta
**Ação:** Configurar Supabase Postgres com Prisma ORM, executar migration inicial com schema completo (User, Production, Asset, enums Plan/ProdStatus/ProdMode/AssetType) conforme PRD seção "Schema Prisma"  
**Contexto:** Banco de dados central da plataforma. Todas as features de persistência dependem deste schema.  
**Input esperado:** Arquivo `schema.prisma` do PRD  
**Output esperado:** Migration executada com sucesso, Prisma Client gerado, seed de usuário de teste funcionando  
**Critério de conclusão:** `npx prisma studio` mostra as tabelas criadas com dados de seed

#### TASK-03 · david · 🔴 Alta
**Ação:** Implementar NextAuth v5 com providers Google OAuth e email/senha (Credentials), incluindo middleware de proteção de rotas `/dashboard/*` e `/api/*`, com sessão JWT de 30 dias  
**Contexto:** Controle de acesso da plataforma. Sem auth, nenhuma feature multiusuário funciona.  
**Input esperado:** Supabase Postgres funcionando (TASK-02), credenciais Google OAuth  
**Output esperado:** Login/logout funcionando, rotas protegidas retornando 401 sem sessão, sessão persistindo entre reloads  
**Critério de conclusão:** Fluxo completo testado: cadastro → verificação email → login → acessar /dashboard → logout

#### TASK-04 · chiara · 🔴 Alta
**Ação:** Criar layout base da aplicação com header (logo Sextou Viral Studio + badge de plano + avatar do usuário + botão upgrade), sidebar de navegação (Dashboard, Nova Produção, Assets, Perfil) e área de conteúdo responsiva  
**Contexto:** Shell visual da plataforma. Todas as páginas são renderizadas dentro deste layout.  
**Input esperado:** Next.js + shadcn funcionando (TASK-01), NextAuth funcionando (TASK-03)  
**Output esperado:** Layout renderizando corretamente em desktop e mobile, header mostrando plano FREE/PRO do usuário logado  
**Critério de conclusão:** Navegação entre rotas sem reload, sidebar collapsível em mobile

#### TASK-05 · david · 🟡 Normal
**Ação:** Configurar Cloudflare R2 bucket para storage de assets (logos, áudios TTS, clips de vídeo, vídeos finais), com API Route `/api/assets/upload` que gera presigned URL para upload direto do browser  
**Contexto:** Storage central da plataforma. Vídeos e áudios gerados precisam ser persistidos fora do banco.  
**Input esperado:** Conta Cloudflare R2 disponível  
**Output esperado:** Upload de arquivo PNG funcionando via presigned URL, arquivo acessível via URL pública  
**Critério de conclusão:** Teste: upload de logo 500KB, URL retornada, arquivo acessível em browser

#### TASK-06 · david · 🟡 Normal
**Ação:** Configurar deploy automático no Vercel com variáveis de ambiente (DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, R2 credentials), preview URLs automáticas em PRs, e pipeline CI com `npm run build` obrigatório  
**Contexto:** Infraestrutura de deploy. Necessário para ambiente de staging e produção.  
**Input esperado:** Repositório Git criado (TASK-01)  
**Output esperado:** Push na branch `main` → deploy automático em produção, push em branch feature → preview URL  
**Critério de conclusão:** URL de produção acessível, preview de PR funcionando

---

## SPRINT 2 — Migração do Fluxo v1

### Raciocínio
O fluxo de 4 fases existe como HTML standalone validado. A tarefa é decompô-lo em componentes React com estado gerenciado pelo Zustand, conectando cada fase ao backend via API Routes proxy seguro. O state store é a peça central — sem ele as fases não se comunicam.

### Tarefas

#### TASK-07 · david · 🔴 Alta
**Ação:** Criar todas as API Routes proxy para OpenRouter: `POST /api/generate/script` (chat/completions), `POST /api/generate/tts` (audio/speech), `POST /api/generate/video` (videos), `GET /api/generate/video/[id]` (polling), `GET /api/generate/video/[id]/content` (download do clip), lendo a chave OpenRouter do usuário decriptada do banco  
**Contexto:** Segurança crítica — a chave do usuário não pode trafegar no browser. Todas as chamadas OpenRouter passam por aqui.  
**Input esperado:** NextAuth funcionando (TASK-03), schema Prisma com campo `orKeyEnc` (TASK-02)  
**Output esperado:** Chamada a `POST /api/generate/script` com sessão válida retorna roteiro, sem sessão retorna 401  
**Critério de conclusão:** Teste com Insomnia/curl: todas as 5 rotas funcionando, 401 sem auth, 200 com auth

#### TASK-08 · chiara · 🔴 Alta
**Ação:** Implementar Zustand store `useProductionStore` com estado completo do fluxo de produção: fase atual (1-4), briefing, scriptLines, characters, audioBlobs (como URLs R2), clipBlobs (como URLs R2), configuração de vídeo, plano de produção  
**Contexto:** Gerenciamento de estado central. Cada componente de fase lê e escreve neste store.  
**Input esperado:** TASK-01 (Next.js)  
**Output esperado:** Store tipado em TypeScript com actions para cada fase, persistência em sessionStorage  
**Critério de conclusão:** Navegar entre fases mantém o estado, reload da página pede confirmação para resetar

#### TASK-09 · chiara · 🔴 Alta
**Ação:** Migrar Fase 1 (Briefing) para componente React `<BriefingPhase>` com campos produto, objetivo, narrador toggle, 4 personagens, ideia, tom de voz e público-alvo, conectado ao Zustand store e com auto-save chamando `PATCH /api/productions/:id`  
**Contexto:** Primeira fase do fluxo. O usuário preenche aqui o briefing que alimenta a geração de roteiro.  
**Input esperado:** TASK-08 (store), TASK-07 (API Routes)  
**Output esperado:** Componente renderizando, auto-save acontecendo, dados persistidos no banco  
**Critério de conclusão:** Preencher briefing, fechar aba, reabrir → dados recuperados do banco

#### TASK-10 · chiara · 🔴 Alta
**Ação:** Migrar Fase 2 (Roteiro) para componente React `<ScriptPhase>` com geração via `/api/generate/script`, renderização de linhas com tipo clicável (fala/cena/ignorar), badge timer 30s com bloqueio, botão regenerar, modal de edição e histórico das últimas 5 versões  
**Contexto:** Fase central do produto — onde o roteiro é gerado e aprovado. O timer de 30s é um controle de qualidade crítico.  
**Input esperado:** TASK-07, TASK-08, TASK-09  
**Output esperado:** Roteiro gerado, linhas clicáveis, timer funcionando, bloqueio acima de 30s  
**Critério de conclusão:** Gerar roteiro com 40+ palavras de fala → badge vermelho → botão "Aprovar" desabilitado

#### TASK-11 · chiara · 🟡 Normal
**Ação:** Migrar Fase 3 (Vozes) para componente React `<VoicesPhase>` com galeria de vozes (Gemini/Grok), filtro por gênero, demo de voz ▶, atribuição por personagem com select, geração de TTS via `/api/generate/tts`, player de áudio embutido por personagem e botão "← Reeditar narração"  
**Contexto:** Fase de geração de áudio. Os blobs de áudio ficam em memória e são também upados no R2 para persistência.  
**Input esperado:** TASK-07, TASK-08, TASK-10  
**Output esperado:** TTS gerado, player funcionando, URL R2 salva no banco  
**Critério de conclusão:** Fechar aba e retomar draft → áudios disponíveis para reprodução via URL R2

#### TASK-12 · chiara · 🟡 Normal
**Ação:** Migrar Fase 4 (Vídeo — modo Cenas) para componente React `<VideoPhase>` com grid de modelos OpenRouter, prompts de cenas editáveis, geração paralela de clips, cards individuais com botão regerar, FFmpeg.wasm concat + mix narração, e resultado final com player e download  
**Contexto:** Fase de geração de vídeo. É a mais complexa — gerencia jobs paralelos, fallbacks e o pipeline FFmpeg.  
**Input esperado:** TASK-07, TASK-08, TASK-11  
**Output esperado:** Vídeo final gerado com narração voice-over, URL R2 salva no banco, status DONE no banco  
**Critério de conclusão:** Fluxo completo end-to-end: briefing → roteiro → vozes → vídeo → download

---

## SPRINT 3 — Dashboard e Histórico

### Raciocínio
Com o fluxo funcionando, o usuário precisa de visibilidade sobre suas produções e capacidade de retomar. O dashboard é simples mas precisa ser funcional — grid com status, ações rápidas e retomada de draft.

### Tarefas

#### TASK-13 · chiara · 🔴 Alta
**Ação:** Criar página `/dashboard` com grid de produções do usuário logado, exibindo thumbnail (ou placeholder por status), título, data, status badge (Rascunho/Processando/Concluído/Falhou), modo (Cenas/HeyGen), duração e 3 ações: "Retomar", "Baixar vídeo", "Duplicar"  
**Contexto:** Home da plataforma após login. O usuário gerencia todas suas produções aqui.  
**Input esperado:** TASK-04 (layout), TASK-02 (banco com tabela productions)  
**Output esperado:** Grid renderizando produções do banco, ações funcionando  
**Critério de conclusão:** Criar 3 produções em estados diferentes → aparecem no grid com status correto

#### TASK-14 · david · 🔴 Alta
**Ação:** Implementar endpoint `GET /api/productions` que retorna produções do usuário logado com paginação (20/página), filtros por status e modo, ordenação por data, e endpoint `GET /api/productions/[id]` que retorna o JSON completo de um draft para retomada  
**Contexto:** API de dados do dashboard. O frontend lista e carrega produções a partir daqui.  
**Input esperado:** TASK-02 (banco), TASK-03 (auth)  
**Output esperado:** Endpoints funcionando, paginação correta, dados sensíveis (chaves) nunca retornados  
**Critério de conclusão:** 50 produções no banco → paginação retorna 20 + cursor, filtro por status funciona

#### TASK-15 · chiara · 🟡 Normal
**Ação:** Implementar retomada de draft: ao acessar "Retomar" no dashboard, carregar o JSON do banco no Zustand store e navegar automaticamente para a fase onde o usuário parou (campo `phase` no banco), mostrando toast "Rascunho retomado — fase X"  
**Contexto:** Core do salvamento de draft. O usuário não deve perder trabalho nunca.  
**Input esperado:** TASK-08 (store), TASK-13 (dashboard), TASK-14 (API)  
**Output esperado:** Clicar "Retomar" → usuário cai na fase correta com dados pré-preenchidos  
**Critério de conclusão:** Parar na fase 3, fechar aba, retomar → fase 3 com personagens e vozes já configurados

#### TASK-16 · chiara · 🟢 Baixa
**Ação:** Adicionar métricas no topo do dashboard: vídeos gerados no mês atual, créditos estimados consumidos (calculado pelo custo dos modelos usados), duração total de vídeos, taxa de conclusão (produções DONE / produções totais)  
**Contexto:** Visibilidade de uso para o usuário. Ajuda a entender o consumo antes de estourar o limite do plano.  
**Input esperado:** TASK-13 (dashboard)  
**Output esperado:** Cards de métricas no topo do dashboard com valores reais do banco  
**Critério de conclusão:** Criar 5 produções → métricas refletem os valores corretos

---

## SPRINT 4 — Overlay de Logo e Animações

### Raciocínio
O overlay é totalmente client-side via FFmpeg.wasm. O fluxo é: upload logo → configurar posição/timing → FFmpeg aplica no pipeline de composição (após concat de clips, antes do mix de áudio). As animações de texto são filtros FFmpeg adicionais empilhados.

### Tarefas

#### TASK-17 · david · 🔴 Alta
**Ação:** Implementar upload de logo: endpoint `POST /api/assets/upload` que aceita PNG/SVG/WebP até 5MB, valida o tipo, faz upload para R2, salva registro na tabela Asset (com userId, name, url, sizeBytes), e retorna a URL pública  
**Contexto:** Infraestrutura de assets. Logos e animações são armazenados aqui para reutilização entre produções.  
**Input esperado:** R2 configurado (TASK-05), banco com tabela Asset (TASK-02)  
**Output esperado:** Upload funcionando, arquivo no R2, registro no banco, limite de 3 (free) / 10 (PRO) validado  
**Critério de conclusão:** Upload de logo PNG → aparece em `/api/assets`, acessível via URL R2

#### TASK-18 · chiara · 🔴 Alta
**Ação:** Criar componente `<OverlayConfigurator>` na Fase 4 com: seleção de logo (galeria dos assets do usuário + upload inline), 9 pontos de âncora para posicionamento, slider de tamanho (5–40%), slider de opacidade (10–100%), configuração de timing (início/fim/personalizado) e seleção de animação de entrada (Fade/Slide esquerda/Slide baixo/Escalar)  
**Contexto:** UI de configuração do overlay. O usuário vê um preview ao vivo antes de renderizar.  
**Input esperado:** TASK-17 (upload de logo), TASK-12 (Fase 4)  
**Output esperado:** Componente renderizando com preview ao vivo do posicionamento sobre thumbnail do vídeo  
**Critério de conclusão:** Configurar overlay, preview mostra logo na posição correta com opacidade ajustada

#### TASK-19 · chiara · 🔴 Alta
**Ação:** Integrar a configuração de overlay no pipeline FFmpeg.wasm da Fase 4: após `concatVideos()` e antes de `mixAudioVideo()`, chamar nova função `applyOverlay(ff, videoBlob, overlayConfig)` que aplica o filtro `overlay` com fade-in conforme timing e animação configurados, usando o logo baixado do R2  
**Contexto:** Implementação técnica do overlay. O filtro FFmpeg precisa receber o logo como arquivo no FS virtual e aplicar o filtro correto.  
**Input esperado:** TASK-18 (configuração), FFmpeg.wasm já integrado  
**Output esperado:** Vídeo final com logo surgindo conforme configurado  
**Critério de conclusão:** Logo com fade-in de 0.5s no canto inferior direito a partir de 2s → vídeo final correto

#### TASK-20 · chiara · 🟡 Normal
**Ação:** Criar biblioteca de animações de texto com 6 templates (Título de Abertura, Lower Third, Contador Regressivo, CTA Final, Progress Bar, Watermark Dinâmico), cada um com formulário de configuração (texto, cor, fonte, duração) e preview em canvas antes de aplicar  
**Contexto:** Feature PRO de animações. Adiciona valor visual ao vídeo sem exigir software de edição.  
**Input esperado:** TASK-19 (overlay pipeline), shadcn/ui  
**Output esperado:** Galeria de animações com preview animado (canvas), formulário de configuração, integração no pipeline FFmpeg  
**Critério de conclusão:** Adicionar "Lower Third" com texto "João Silva — CEO" → aparece no vídeo final nos 3s corretos

#### TASK-21 · chiara · 🟢 Baixa
**Ação:** Implementar preview renderizado de overlay: antes de confirmar e renderizar o vídeo final, gerar uma thumbnail animada (canvas 2D, low-res) mostrando o frame 0 do vídeo + logo na posição configurada + animação simulada em loop  
**Contexto:** UX de confiança — o usuário confirma visualmente o resultado antes de gastar tempo de renderização.  
**Input esperado:** TASK-18 (configuração), TASK-19 (pipeline)  
**Output esperado:** Preview em canvas atualizado em tempo real conforme o usuário muda as configurações  
**Critério de conclusão:** Mudar posição do logo → preview atualiza em < 200ms

---

## SPRINT 5 — Fluxo HeyGen PRO

### Raciocínio
O fluxo HeyGen é paralelo ao fluxo OpenRouter — as fases 1 e 2 são idênticas, mas na fase 4 o toggle muda o modo. A Fase 3 (vozes) é pulada porque o HeyGen tem TTS próprio sincronizado. A complexidade está na galeria de avatares (chamada à API HeyGen com cache) e no limite de 15s no roteiro.

### Tarefas

#### TASK-22 · david · 🔴 Alta
**Ação:** Criar API Routes proxy para HeyGen: `POST /api/heygen/video` (v2/video/generate), `GET /api/heygen/video/[id]` (polling v1/video_status.get), `GET /api/heygen/avatars` (lista avatares com cache Redis de 1h), `GET /api/heygen/voices` (lista vozes com cache 1h), lendo a chave HeyGen do campo `heygenKeyEnc` do usuário, retornando 403 se plano FREE  
**Contexto:** Proxy seguro para HeyGen — a chave nunca vai ao browser. O 403 para FREE é o gate de acesso PRO.  
**Input esperado:** TASK-03 (auth com plano), TASK-02 (campo heygenKeyEnc no banco)  
**Output esperado:** Chamada a `/api/heygen/avatars` com usuário PRO retorna lista de avatares, com FREE retorna 403  
**Critério de conclusão:** Teste com usuário FREE → 403, com PRO → lista de avatares da HeyGen

#### TASK-23 · chiara · 🔴 Alta
**Ação:** Adicionar toggle "Modo Cenas / Modo Avatar PRO" na Fase 4, com badge de bloqueio para usuários FREE que abre modal de upgrade ao clicar, e para usuários PRO exibe o componente `<HeyGenAvatarPhase>` substituindo o grid de modelos OpenRouter  
**Contexto:** Gate de acesso ao modo PRO. O toggle precisa ser visível mas não frustrante — o caminho de upgrade deve ser claro.  
**Input esperado:** TASK-12 (Fase 4 base), plano do usuário disponível no store  
**Output esperado:** Toggle visível, FREE vê cadeado + CTA, PRO vê interface HeyGen  
**Critério de conclusão:** Usuário FREE clica no toggle → modal de upgrade com comparativo de planos e botão "Assinar PRO"

#### TASK-24 · chiara · 🔴 Alta
**Ação:** Criar componente `<AvatarGallery>` que lista os avatares da HeyGen via `/api/heygen/avatars`, com filtros por gênero (masculino/feminino), estilo (formal/casual/energético), preview de foto e 3s de vídeo demo ao hover, e seleção persistida no store  
**Contexto:** Core do fluxo HeyGen. O usuário escolhe o avatar que vai "falar" o roteiro.  
**Input esperado:** TASK-22 (API proxy), TASK-23 (toggle)  
**Output esperado:** Galeria com avatares reais da HeyGen, filtros funcionando, seleção refletida no store  
**Critério de conclusão:** Selecionar avatar → store atualizado, voz default do avatar carregada automaticamente

#### TASK-25 · chiara · 🔴 Alta
**Ação:** Implementar geração de vídeo HeyGen: montar payload com avatar_id, voice_id, script (do roteiro — somente as falas), background configurado, dimension 1080x1920 (9:16 para Reels), enviar via `/api/heygen/video`, polling a cada 10s, exibir card de progresso e ao concluir mostrar vídeo em player com botão de download  
**Contexto:** Geração efetiva do vídeo HeyGen. Este fluxo não usa TTS separado nem FFmpeg mix de narração — o HeyGen entrega tudo junto.  
**Input esperado:** TASK-24 (avatar selecionado), TASK-22 (API proxy)  
**Output esperado:** Vídeo HeyGen com lip sync gerado, exibido em player, URL salva no banco  
**Critério de conclusão:** Gerar vídeo HeyGen de 10s → player mostra avatar falando com boca sincronizada

#### TASK-26 · chiara · 🟡 Normal
**Ação:** Adaptar o timer de roteiro para o modo HeyGen: quando modo HeyGen está ativo, o limite máximo é 15s (≈40 palavras de fala) em vez de 30s, com badge "Modo Avatar — máx 15s", bloqueio do botão "Aprovar roteiro" acima de 15s e aviso de custo estimado em créditos HeyGen  
**Contexto:** Controle de custo e qualidade. Avatar IV cobra 20 créditos/min — 15s custa ~5 créditos. O usuário precisa saber antes de aprovar.  
**Input esperado:** TASK-10 (componente de roteiro), TASK-23 (toggle de modo)  
**Output esperado:** Timer mostrando limite de 15s quando HeyGen ativo, bloqueio acima de 15s  
**Critério de conclusão:** Roteiro com 16s no modo HeyGen → botão "Aprovar" desabilitado com mensagem clara

#### TASK-27 · chiara · 🟢 Baixa
**Ação:** Implementar configuração de fundo para vídeo HeyGen: color picker para fundo sólido, seletor de gradiente (3 predefinidos), opção "blur" (fundo desfocado), e upload de imagem de fundo personalizada (via R2), com preview ao vivo no componente  
**Contexto:** Personalização do vídeo HeyGen. O fundo impacta diretamente a qualidade visual do avatar.  
**Input esperado:** TASK-24 (avatar gallery), TASK-17 (upload R2)  
**Output esperado:** Configuração de fundo refletida no payload enviado ao HeyGen  
**Critério de conclusão:** Selecionar cor #FF3D57 como fundo → vídeo gerado com fundo vermelho atrás do avatar

---

## SPRINT 6 — Monetização e Notificações

### Raciocínio
Sem Stripe, o plano PRO não pode ser cobrado. Sem notificações, o usuário precisa ficar na aba esperando. Estes dois módulos são independentes entre si mas dependem do Sprint 2 completo.

### Tarefas

#### TASK-28 · david · 🔴 Alta
**Ação:** Integrar Stripe Checkout: criar endpoint `POST /api/stripe/checkout` que gera sessão de pagamento para o plano PRO ($29/mês), e endpoint `POST /api/stripe/webhook` que processa eventos `checkout.session.completed` (ativa PRO) e `customer.subscription.deleted` (revoga PRO), atualizando `user.plan` e `user.planExpiresAt` no banco  
**Contexto:** Monetização central. Sem isto o plano PRO não pode ser vendido.  
**Input esperado:** Conta Stripe configurada, TASK-02 (banco com campo plan)  
**Output esperado:** Fluxo completo: clicar "Assinar PRO" → Stripe Checkout → webhook → usuário com plan=PRO no banco  
**Critério de conclusão:** Pagamento teste com cartão Stripe → plan atualizado no banco em < 5s via webhook

#### TASK-29 · david · 🟡 Normal
**Ação:** Configurar Resend para emails transacionais: template de boas-vindas (novo cadastro), template de "Vídeo pronto" (com link de download), template de confirmação de upgrade PRO, e template de renovação/cancelamento de assinatura  
**Contexto:** Comunicação com o usuário. O email de "Vídeo pronto" é especialmente importante para jobs longos.  
**Input esperado:** Conta Resend configurada, TASK-28 (webhook Stripe para email de upgrade)  
**Output esperado:** 4 templates configurados no Resend, envio automático nos eventos corretos  
**Critério de conclusão:** Criar conta teste → email de boas-vindas recebido em < 60s

#### TASK-30 · chiara · 🟡 Normal
**Ação:** Implementar notificação push de browser para "Vídeo pronto": ao iniciar geração, solicitar permissão de notificação, registrar Service Worker, e quando a produção mudar para status DONE (detectado via TanStack Query polling), disparar `new Notification("Seu vídeo está pronto! 🎬")` com link para download  
**Contexto:** UX para jobs longos (2–8 min). O usuário pode navegar para outra aba e ser avisado.  
**Input esperado:** TASK-12 (Fase 4 com status no banco), TanStack Query instalado  
**Output esperado:** Notificação push aparecendo quando vídeo fica pronto, mesmo com aba em background  
**Critério de conclusão:** Iniciar geração, trocar para outra aba → notificação push em < 30s após conclusão

#### TASK-31 · maria · 🟡 Normal
**Ação:** Criar página de Billing em `/dashboard/billing` exibindo: plano atual com data de renovação, histórico de faturas (via Stripe API), botão "Gerenciar assinatura" (Stripe Customer Portal), comparativo Free vs PRO com lista de features e CTA de upgrade  
**Contexto:** Transparência de cobrança. O usuário precisa visualizar e gerenciar sua assinatura.  
**Input esperado:** TASK-28 (Stripe integrado)  
**Output esperado:** Página renderizando com dados reais do Stripe, portal de gerenciamento abrindo corretamente  
**Critério de conclusão:** Usuário PRO acessa billing → vê próxima data de cobrança e histórico de faturas

---

## SPRINT 7 — Polimento e Launch

### Raciocínio
O último sprint garante qualidade de produto antes do lançamento: onboarding para novos usuários, página de upgrade com conversão, monitoramento de erros e analytics de uso.

### Tarefas

#### TASK-32 · chiara · 🟡 Normal
**Ação:** Criar wizard de onboarding para novos usuários (3 passos): Passo 1 — "Adicione sua chave OpenRouter" (com link para criar conta), Passo 2 — "Crie seu primeiro vídeo" (preview do fluxo em 4 fases), Passo 3 — "Conheça o modo Avatar PRO" (com CTA de upgrade), aparecendo somente no primeiro login e dismissível  
**Contexto:** Reduzir fricção de adoção. Novos usuários que não entendem o produto abandonam antes do primeiro vídeo.  
**Input esperado:** TASK-04 (layout base), TASK-03 (first login detection)  
**Output esperado:** Wizard de 3 passos aparecendo no primeiro login, não aparecendo nos seguintes  
**Critério de conclusão:** Criar nova conta → wizard aparece → completar 3 passos → wizard não reaparece

#### TASK-33 · lia · 🟡 Normal
**Ação:** Criar página de upgrade PRO em `/upgrade` com: comparativo visual de planos (tabela Free vs PRO), 3 casos de uso com exemplos visuais (e-commerce / agência / criador individual), FAQ de 5 perguntas sobre o plano, e CTA "Assinar PRO por $29/mês" conectado ao Stripe Checkout  
**Contexto:** Página de conversão. Usuários Free que chegam aqui precisam entender o valor antes de pagar.  
**Input esperado:** TASK-28 (Stripe Checkout), conteúdo dos planos definido  
**Output esperado:** Página com design limpo, comparativo claro, CTA funcionando  
**Critério de conclusão:** Clicar CTA → redireciona para Stripe Checkout com plano PRO pré-selecionado

#### TASK-34 · david · 🟡 Normal
**Ação:** Configurar Sentry para monitoramento de erros no frontend e backend: capturar exceções não tratadas, erros de API Routes, falhas de jobs FFmpeg.wasm e jobs de vídeo, com alertas por email para erros com taxa > 5/hora  
**Contexto:** Monitoramento de produção. Sem alertas, bugs críticos podem passar despercebidos.  
**Input esperado:** TASK-06 (deploy Vercel), conta Sentry  
**Output esperado:** Dashboard Sentry com erros categorizados, alerta de email configurado  
**Critério de conclusão:** Lançar erro manual em staging → aparece no Sentry em < 60s com stack trace

#### TASK-35 · david · 🟢 Baixa
**Ação:** Configurar PostHog para analytics de produto: rastrear eventos chave (production_started, script_approved, video_generated, heygen_mode_selected, plan_upgraded, draft_resumed), criar dashboard com funil de conversão (fase 1 → fase 4) e taxa de abandono por fase  
**Contexto:** Analytics de produto. Essencial para entender onde os usuários desistem e priorizar melhorias.  
**Input esperado:** TASK-06 (deploy)  
**Output esperado:** Eventos sendo registrados, funil de conversão visível no PostHog  
**Critério de conclusão:** Fazer fluxo completo em staging → 6 eventos aparecem no PostHog em ordem correta

#### TASK-36 · erick · 🟢 Baixa
**Ação:** Criar checklist de launch com 20 itens verificáveis: SSL ativo, CSP headers configurados, rate limiting em todas as rotas de geração, backups automáticos do banco habilitados (Supabase), GDPR compliance básico (política de privacidade + deletar conta), limites de plano testados (3 vídeos free, etc.), e executar smoke test completo do fluxo end-to-end em produção  
**Contexto:** Gate de qualidade antes do lançamento público. Evita problemas básicos em produção.  
**Input esperado:** Todos os sprints anteriores concluídos  
**Output esperado:** Documento de checklist com todos os 20 itens marcados como OK  
**Critério de conclusão:** Cada item testado manualmente em produção, evidência em screenshot ou log

---

## Mapa de Dependências

```
TASK-01 ← TASK-04, TASK-08, TASK-09, TASK-10, TASK-11, TASK-12
TASK-02 ← TASK-07, TASK-14, TASK-17, TASK-22, TASK-28
TASK-03 ← TASK-07, TASK-08, TASK-14, TASK-22
TASK-05 ← TASK-17
TASK-06 ← TASK-34, TASK-35
TASK-07 ← TASK-09, TASK-10, TASK-11, TASK-12
TASK-08 ← TASK-09, TASK-10, TASK-11, TASK-12, TASK-15, TASK-23
TASK-12 ← TASK-18, TASK-23
TASK-17 ← TASK-18, TASK-27
TASK-18 ← TASK-19
TASK-19 ← TASK-20
TASK-22 ← TASK-23, TASK-24, TASK-25
TASK-23 ← TASK-24, TASK-25, TASK-26
TASK-28 ← TASK-29, TASK-31, TASK-33
```

## Ordem de Execução Sugerida

**Semana 1-2 (Sprint 1):** TASK-01 → TASK-02 → TASK-03 → TASK-04, TASK-05 em paralelo → TASK-06  
**Semana 3-4 (Sprint 2):** TASK-07, TASK-08 em paralelo → TASK-09 → TASK-10 → TASK-11 → TASK-12  
**Semana 5 (Sprint 3):** TASK-14 → TASK-13 → TASK-15 → TASK-16  
**Semana 6-7 (Sprint 4):** TASK-17 → TASK-18 → TASK-19 → TASK-20, TASK-21 em paralelo  
**Semana 8-9 (Sprint 5):** TASK-22 → TASK-23 → TASK-24, TASK-26 em paralelo → TASK-25 → TASK-27  
**Semana 10 (Sprint 6):** TASK-28 → TASK-29, TASK-31 em paralelo → TASK-30  
**Semana 11 (Sprint 7):** TASK-32, TASK-34 em paralelo → TASK-33 → TASK-35 → TASK-36  

