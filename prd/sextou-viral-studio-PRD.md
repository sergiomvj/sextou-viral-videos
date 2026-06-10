# PRD — Sextou Viral Studio
**Versão:** 1.0  
**Data:** Junho 2026  
**Status:** Aprovado para desenvolvimento  
**Autor:** Produto

---

## Sumário Executivo

O Sextou Viral Studio é uma plataforma SaaS de criação automatizada de vídeos virais com IA, voltada para criadores de conteúdo, agências e marcas que precisam produzir vídeos de produto de alta qualidade sem equipe técnica. O sistema guia o usuário por um fluxo de 4 fases — briefing, roteiro, vozes e vídeo — e entrega um MP4 finalizado com narração voice-over, em até 30 segundos, pronto para publicação em redes sociais.

A v1 foi validada como HTML standalone. A v2 (este PRD) migra para uma stack de produção com multiusuário, autenticação, dashboard com histórico, salvamento de draft, overlay de logo/animações e um fluxo premium exclusivo com HeyGen para vídeos com avatares humanos e lip sync real.

---

## Stack Recomendada

### Por que esta stack?

O sistema tem três características que determinam a escolha técnica:

1. **Processamento pesado no browser** (FFmpeg.wasm, TTS, polling de jobs) — precisa de frontend reativo e com bom gerenciamento de estado assíncrono
2. **Multiusuário com dados por sessão** (drafts, histórico, planos) — precisa de backend com autenticação e banco de dados
3. **Integrações de terceiros** (OpenRouter, HeyGen, Stripe) — precisa de camada de API segura que proteja as chaves

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                            │
│  Next.js 15 (App Router) + React 19 + TypeScript        │
│  Tailwind CSS + shadcn/ui                               │
│  Zustand (estado global do fluxo de produção)           │
│  TanStack Query (cache + refetch de jobs)               │
│  FFmpeg.wasm (client-side, sem servidor)                │
└─────────────────┬───────────────────────────────────────┘
                  │ API Routes (Next.js)
┌─────────────────▼───────────────────────────────────────┐
│                     BACKEND (API Routes)                │
│  Next.js API Routes — proxy seguro para OpenRouter      │
│  e HeyGen (chaves nunca expostas no client)             │
│  Autenticação: NextAuth v5 (Google + email/senha)       │
│  Upload de assets: Cloudflare R2 (logos, animações)     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                     DADOS                               │
│  PostgreSQL via Supabase                                │
│  Prisma ORM                                             │
│  Tabelas: users, projects, drafts, productions,         │
│           assets (logos), subscriptions                 │
└─────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                     INFRAESTRUTURA                      │
│  Vercel (deploy automático, edge functions)             │
│  Cloudflare R2 (storage de assets e vídeos gerados)     │
│  Stripe (pagamentos + planos Free/Pro)                  │
│  Resend (emails transacionais)                          │
└─────────────────────────────────────────────────────────┘
```

### Decisões técnicas principais

| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| Framework | Next.js 15 | React + Express separados | App Router simplifica SSR + API num projeto só |
| Auth | NextAuth v5 | Supabase Auth | Mais flexível para OAuth + JWT customizado |
| DB | Supabase Postgres | PlanetScale | Row Level Security nativo, realtime opcional |
| ORM | Prisma | Drizzle | Melhor DX + migrations automáticas |
| State | Zustand | Redux | Menos boilerplate para estado de fluxo de produção |
| Storage | Cloudflare R2 | AWS S3 | $0 egress fee — crítico para vídeos grandes |
| Deploy | Vercel | Railway | Zero config + preview URLs automáticas |
| CSS | Tailwind + shadcn | CSS Modules | Velocidade de desenvolvimento, componentes prontos |

---

## Planos e Monetização

```
┌─────────────┬──────────────────┬────────────────────────┐
│             │ FREE             │ PRO ($29/mês)          │
├─────────────┼──────────────────┼────────────────────────┤
│ Vídeos/mês  │ 3                │ Ilimitado*             │
│ Duração     │ até 30s          │ até 30s (cenas)        │
│ HeyGen flow │ ❌               │ ✅ até 15s             │
│ Overlay     │ Watermark SVS    │ Logo próprio           │
│ Animações   │ ❌               │ ✅ biblioteca básica   │
│ Drafts      │ 3 salvos         │ Ilimitados             │
│ Histórico   │ 7 dias           │ 12 meses               │
│ Resolução   │ 720p             │ 1080p                  │
│ Chave API   │ própria          │ própria ou plano pool  │
└─────────────┴──────────────────┴────────────────────────┘
* Limitado pelo saldo OpenRouter/HeyGen do próprio usuário
```

---

## Módulos do Sistema

### M1 — Autenticação e Usuários

**Objetivo:** Controlar acesso, planos e sessões de forma segura.

**Requisitos funcionais:**
- RF1.1 Cadastro com email/senha com verificação por email
- RF1.2 Login social: Google OAuth
- RF1.3 Recuperação de senha por email
- RF1.4 Perfil: nome, avatar, chave OpenRouter, chave HeyGen (PRO)
- RF1.5 Plano atual visível no header com badge
- RF1.6 Upgrade para PRO via Stripe Checkout
- RF1.7 Webhook Stripe para ativar/revogar PRO automaticamente

**Requisitos não-funcionais:**
- RNF1.1 Chaves de API armazenadas criptografadas (AES-256) no banco
- RNF1.2 Sessões com JWT de 30 dias + refresh token
- RNF1.3 Rate limiting: 10 req/min por usuário nas rotas de geração

---

### M2 — Dashboard e Histórico de Produção

**Objetivo:** Dar ao usuário visibilidade completa de suas produções e acesso rápido a retomar projetos.

**Requisitos funcionais:**
- RF2.1 Grid de produções com thumbnail do primeiro frame (ou placeholder)
- RF2.2 Status de cada produção: Rascunho / Concluído / Falhou
- RF2.3 Filtros: por data, status, tipo (cenas / HeyGen)
- RF2.4 Ação rápida: retomar draft, baixar vídeo, duplicar projeto
- RF2.5 Métricas no topo: vídeos gerados no mês, créditos estimados gastos, tempo médio de produção
- RF2.6 Produção falhou → botão "Tentar novamente" que retorna exatamente para o ponto de falha
- RF2.7 Limite de histórico por plano (7 dias free / 12 meses PRO)

**Modelo de dados — tabela `productions`:**
```
id, user_id, title, status, plan_type (free|pro),
mode (openrouter|heygen), brief_json, script_json,
voices_json, scenes_json, video_url, audio_url,
final_video_url, error_message, created_at, updated_at
```

---

### M3 — Salvamento de Drafts

**Objetivo:** Nenhum trabalho se perde. O usuário pode fechar e retomar exatamente onde parou.

**Requisitos funcionais:**
- RF3.1 Auto-save a cada mudança significativa (debounce 2s)
- RF3.2 Indicador visual "Salvo" / "Salvando…" no header
- RF3.3 Ao voltar: modal "Você tem um draft em andamento — retomar ou começar do zero?"
- RF3.4 Draft salva: fase atual, todos os campos do briefing, roteiro parseado com tipos de linha, vozes atribuídas, clips gerados (URLs R2), áudios gerados (URLs R2)
- RF3.5 Limite de 3 drafts simultâneos (free) / ilimitados (PRO)
- RF3.6 Expiração de drafts: 7 dias (free) / nunca (PRO)

**Fluxo de auto-save:**
```
Usuário edita campo
  → debounce 2s
    → PATCH /api/productions/:id { field, value }
      → Prisma update
        → "Salvo às HH:MM" no header
```

---

### M4 — Overlay de Logo e Animações

**Objetivo:** Permitir que o usuário adicione identidade visual ao vídeo final na etapa de composição, processado 100% client-side via FFmpeg.wasm.

#### M4.1 — Upload e Gestão de Assets

**Requisitos funcionais:**
- RF4.1 Upload de logo: PNG/SVG/WebP, máx 5MB, armazenado no R2
- RF4.2 Até 3 logos salvos por conta (free) / 10 (PRO)
- RF4.3 Preview ao vivo do posicionamento antes de renderizar
- RF4.4 Assets persistem entre produções

#### M4.2 — Overlay de Logo

**Requisitos funcionais:**
- RF4.5 Posição: 9 pontos de âncora (3x3 grid) + offset X/Y em px
- RF4.6 Tamanho: slider 5–40% da largura do vídeo
- RF4.7 Timing: "aparecer do início", "aparecer nos últimos Xs", "tempo exato (slider)"
- RF4.8 Animação de entrada: Fade In / Slide da esquerda / Slide de baixo / Escalar
- RF4.9 Animação de saída: Fade Out / Nenhuma (fica até o fim)
- RF4.10 Opacidade: slider 10–100%

**Implementação FFmpeg.wasm:**
```bash
# Fade in do logo no canto inferior direito a partir de 2s
ffmpeg -i video.mp4 -i logo.png \
  -filter_complex "
    [1:v]fade=in:st=2:d=0.5,
          format=rgba[logo];
    [0:v][logo]overlay=
          W-w-20:H-h-20:
          enable='gte(t,2)'
    [v]" \
  -map "[v]" -map 0:a \
  -c:a copy output.mp4
```

#### M4.3 — Biblioteca de Animações

**Objetivo:** Animações pré-prontas que enriquecem o vídeo sem exigir After Effects.

**Animações disponíveis (PRO):**
| Animação | Descrição | Implementação |
|---|---|---|
| Título de abertura | Texto em fade no centro, 2s | FFmpeg drawtext + fade |
| Lower third | Barra + nome no rodapé | FFmpeg drawbox + drawtext |
| Contador regressivo | 3… 2… 1… antes do vídeo | FFmpeg drawtext animado |
| CTA final | "Acesse agora" + URL no final | FFmpeg drawtext |
| Progress bar | Barra de progresso no topo | FFmpeg drawbox animado |
| Watermark dinâmico | Logo pulsando levemente | FFmpeg overlay + scale filter |

**Requisitos funcionais:**
- RF4.11 Galeria visual com preview de cada animação (GIF ou canvas animado)
- RF4.12 Configuração: texto, cor, fonte (3 opções), duração
- RF4.13 Posicionamento: mesmo sistema de âncoras do logo
- RF4.14 Múltiplas animações empilháveis (máx 3 simultâneas)
- RF4.15 Preview renderizado antes de confirmar (FFmpeg.wasm low-res)

---

### M5 — Fluxo PRO: HeyGen Avatar (vídeos de 15s)

**Objetivo:** Oferecer aos usuários PRO a opção de gerar vídeos com avatares humanos fotorrealistas e lip sync real, via HeyGen API v3.

#### Diferença fundamental do fluxo

```
FLUXO PADRÃO (Free + PRO):
Briefing → Roteiro → Vozes (TTS) → Cenas visuais (OpenRouter) → FFmpeg mix

FLUXO HEYGEN (somente PRO):
Briefing → Roteiro → Seleção de Avatar → HeyGen gera vídeo com lip sync
                                          (TTS + vídeo + sync = 1 chamada)
```

No fluxo HeyGen **não há etapa de TTS separada** — o HeyGen usa sua própria engine de voz sincronizada com a boca do avatar.

#### Limite de 15s

O Avatar IV consome 20 créditos/min — um vídeo de 15s custa ~5 créditos (~$0.75–$1.50). Limitar a 15s no plano PRO controla o custo por vídeo e mantém o formato adequado para Reels/Shorts.

#### Requisitos funcionais

- RF5.1 Toggle visível na fase de configuração de vídeo: "Modo Cenas" ↔ "Modo Avatar PRO"
- RF5.2 Badge de bloqueio no toggle para usuários Free ("Upgrade para PRO")
- RF5.3 Campo para chave de API HeyGen (salva criptografada, separada da OpenRouter)
- RF5.4 Galeria de avatares: busca por gênero, etnia, estilo (formal/casual)
  - Dados via `GET https://api.heygen.com/v2/avatars` — paginado
  - Preview: foto + 3s de vídeo demo do avatar
- RF5.5 Seleção de voz: lista de vozes do avatar escolhido (`GET /v2/voices?avatar_id=X`)
- RF5.6 Fundo (background): sólido (cor picker), gradiente, blur ou imagem upload
- RF5.7 Roteiro adaptado: máx 15s de fala (~40 palavras) — bloqueio igual ao de 30s
- RF5.8 Geração via `POST /v2/video/generate`:
  ```json
  {
    "video_inputs": [{
      "character": { "type": "avatar", "avatar_id": "...", "avatar_style": "normal" },
      "voice": { "type": "text", "input_text": "...", "voice_id": "..." },
      "background": { "type": "color", "value": "#f5f5f5" }
    }],
    "dimension": { "width": 1080, "height": 1920 }
  }
  ```
- RF5.9 Polling via `GET /v1/video_status.get?video_id=X` com intervalo de 10s
- RF5.10 Vídeo HeyGen já vem com lip sync — **não passa pelo FFmpeg mix de narração**
- RF5.11 Overlay de logo ainda disponível mesmo no fluxo HeyGen (etapa posterior)
- RF5.12 Custo estimado exibido antes de confirmar geração (créditos HeyGen)

#### Gestão de chave HeyGen

```
Usuário PRO tem duas opções:
  A) Usa própria chave HeyGen → custo debitado da conta dele
  B) Usa crédito do pool Sextou → Sextou cobra markup de 20% no crédito
     (requer configuração de conta master HeyGen na infraestrutura)
```

A opção B é uma decisão de negócio — o PRD documenta a possibilidade mas não obriga a implementação na v2.

---

### M6 — Proxy Seguro de API (Backend)

**Objetivo:** As chaves OpenRouter e HeyGen nunca trafegam no cliente ou ficam expostas no código frontend.

**Endpoints API Routes (Next.js):**

```
POST /api/generate/script       → proxy para OpenRouter chat/completions
POST /api/generate/tts          → proxy para OpenRouter audio/speech
POST /api/generate/video        → proxy para OpenRouter /videos
GET  /api/generate/video/:id    → proxy para polling OpenRouter
GET  /api/generate/video/:id/content → proxy para download do clip

POST /api/heygen/video          → proxy para HeyGen v2/video/generate
GET  /api/heygen/video/:id      → proxy para HeyGen polling
GET  /api/heygen/avatars        → proxy para HeyGen v2/avatars (com cache 1h)
GET  /api/heygen/voices         → proxy para HeyGen v2/voices (com cache 1h)

POST /api/assets/upload         → upload para R2 via presigned URL
GET  /api/assets                → lista assets do usuário

GET  /api/productions           → lista produções do usuário
POST /api/productions           → cria nova produção
PATCH /api/productions/:id      → auto-save de draft
GET  /api/productions/:id       → carrega draft para retomar
```

**Segurança:**
- Toda rota `/api/generate/*` e `/api/heygen/*` exige sessão ativa
- Chave do usuário lida do banco (decriptada em runtime) e injetada no proxy
- Logs de uso por usuário para billing e rate limiting

---

### M7 — Fase de Briefing Melhorada

Melhorias sobre a v1:

- RF7.1 Salvar briefing como template reutilizável ("Meus produtos")
- RF7.2 Campo de Tom de Voz: Formal / Casual / Urgente / Inspirador / Humorístico
- RF7.3 Público-alvo: campo de texto livre (alimenta o prompt de geração)
- RF7.4 Hashtags sugeridas: geradas pelo Claude junto com o roteiro
- RF7.5 Duração alvo: slider 15s / 20s / 30s (limita geração de roteiro)

---

### M8 — Fase de Roteiro Melhorada

Melhorias sobre a v1:

- RF8.1 Histórico de versões do roteiro (últimas 5 regenerações)
- RF8.2 Botão "← Versão anterior" para comparar e voltar
- RF8.3 Sugestão de hashtags e legenda para post, geradas junto com o roteiro
- RF8.4 Export do roteiro como PDF ou TXT
- RF8.5 Modo de edição inline (clique na linha para editar sem abrir modal)

---

### M9 — Notificações e UX de Longa Espera

Vídeos podem demorar 2–8 minutos. O usuário não pode ficar preso na tela.

**Requisitos funcionais:**
- RF9.1 "Continuar em background" — o usuário fecha a aba e o job continua
- RF9.2 Notificação push (browser) quando o vídeo ficar pronto
- RF9.3 Email de notificação quando o vídeo ficar pronto (Resend)
- RF9.4 Badge de notificação no header com jobs em andamento
- RF9.5 Página de jobs ativos acessível sem perder o contexto

**Implementação:**
- Jobs de vídeo são registrados no banco (status: queued / processing / done / failed)
- API Route faz polling ao HeyGen/OpenRouter a cada 10s (server-side)
- Quando done: atualiza banco, envia email, dispara push notification
- Frontend usa TanStack Query com `refetchInterval` para atualizar o status

---

## Arquitetura de Dados

### Schema Prisma

```prisma
model User {
  id              String        @id @default(cuid())
  email           String        @unique
  name            String?
  image           String?
  plan            Plan          @default(FREE)
  planExpiresAt   DateTime?
  orKeyEnc        String?       // OpenRouter key AES-256
  heygenKeyEnc    String?       // HeyGen key AES-256 (PRO)
  productions     Production[]
  assets          Asset[]
  createdAt       DateTime      @default(now())
}

model Production {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  title           String        @default("Sem título")
  status          ProdStatus    @default(DRAFT)
  mode            ProdMode      @default(OPENROUTER)
  phase           Int           @default(1)  // fase atual 1-4
  briefJson       Json?
  scriptJson      Json?
  voicesJson      Json?
  scenesJson      Json?
  clipsJson       Json?         // URLs R2 dos clips individuais
  audioJson       Json?         // URLs R2 dos áudios TTS
  finalVideoUrl   String?       // URL R2 do vídeo final
  thumbnailUrl    String?
  errorMessage    String?
  durationSec     Int?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Asset {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  name            String
  type            AssetType     // LOGO | ANIMATION
  url             String        // R2 URL
  thumbnailUrl    String?
  sizeBytes       Int
  createdAt       DateTime      @default(now())
}

enum Plan        { FREE PRO }
enum ProdStatus  { DRAFT PROCESSING DONE FAILED }
enum ProdMode    { OPENROUTER HEYGEN }
enum AssetType   { LOGO ANIMATION }
```

---

## Fluxo de Dados Completo (v2)

```
[Browser]
  │
  ├── Fase 1: Briefing
  │     └── PATCH /api/productions/:id (auto-save)
  │
  ├── Fase 2: Roteiro
  │     ├── POST /api/generate/script → OpenRouter → Claude
  │     └── PATCH /api/productions/:id (script_json)
  │
  ├── Fase 3: Vozes
  │     ├── POST /api/generate/tts → OpenRouter → Gemini/Grok TTS
  │     ├── Áudio → upload R2 via /api/assets/upload
  │     └── PATCH /api/productions/:id (voices_json, audio_json)
  │
  ├── Fase 4a: Vídeo (modo Cenas)
  │     ├── POST /api/generate/video → OpenRouter → modelo de vídeo
  │     ├── Polling GET /api/generate/video/:id
  │     ├── Clips → upload R2
  │     ├── FFmpeg.wasm (client): concat clips + mix narração + overlay logo
  │     ├── Final → upload R2 via /api/assets/upload
  │     └── PATCH /api/productions/:id (final_video_url, status=DONE)
  │
  └── Fase 4b: Vídeo (modo Avatar PRO — HeyGen)
        ├── POST /api/heygen/video → HeyGen v2/video/generate
        ├── Polling GET /api/heygen/video/:id
        ├── FFmpeg.wasm (client): overlay logo (opcional)
        ├── Final → upload R2
        └── PATCH /api/productions/:id (final_video_url, status=DONE)
```

---

## Roadmap de Entregas

### Sprint 1 — Fundação (2 semanas)
- [ ] Setup Next.js 15 + TypeScript + Tailwind + shadcn
- [ ] Prisma + Supabase Postgres (schema inicial)
- [ ] NextAuth v5 (Google + email)
- [ ] Layout base: header com plano, sidebar, área de conteúdo
- [ ] Rotas protegidas middleware

### Sprint 2 — Migração do fluxo v1 (2 semanas)
- [ ] Migrar HTML standalone para componentes React
- [ ] Zustand store para o fluxo de produção (4 fases)
- [ ] Proxy API Routes (OpenRouter)
- [ ] Auto-save de draft (Fase 1 e 2)
- [ ] Dashboard básico com lista de produções

### Sprint 3 — Persistência completa (1 semana)
- [ ] Auto-save completo (fases 3 e 4)
- [ ] Retomar draft do ponto exato
- [ ] Upload R2 de áudios e clips
- [ ] Histórico de produções com filtros

### Sprint 4 — Overlay e Animações (2 semanas)
- [ ] Upload e gestão de logos
- [ ] UI de configuração de overlay (posição, timing, animação)
- [ ] Integração FFmpeg.wasm: overlay no pipeline de composição
- [ ] Biblioteca de animações de texto (Lower Third, CTA, Título)
- [ ] Preview de overlay antes de renderizar

### Sprint 5 — Fluxo HeyGen PRO (2 semanas)
- [ ] Toggle Modo Cenas / Modo Avatar no step 4
- [ ] Integração HeyGen v2 via proxy seguro
- [ ] Galeria de avatares com preview
- [ ] Seleção de voz por avatar
- [ ] Configuração de fundo
- [ ] Limite de 15s no roteiro para este modo
- [ ] Bloqueio para usuários Free

### Sprint 6 — Monetização e Notificações (1 semana)
- [ ] Integração Stripe (Checkout + Webhook)
- [ ] Ativação/revogação automática PRO
- [ ] Emails transacionais (Resend): boas-vindas, vídeo pronto, upgrade
- [ ] Push notifications (browser) quando vídeo pronto
- [ ] Página de billing no perfil

### Sprint 7 — Polimento e Launch (1 semana)
- [ ] Onboarding de novos usuários (wizard de 3 passos)
- [ ] Página de upgrade PRO com comparativo de planos
- [ ] Testes de carga nas rotas de geração
- [ ] Monitoramento: Sentry (erros) + PostHog (analytics)
- [ ] SEO básico (meta tags, OG)

**Total estimado: 11 semanas**

---

## Métricas de Sucesso (v2)

| Métrica | Meta 30 dias | Meta 90 dias |
|---|---|---|
| Usuários cadastrados | 200 | 1.000 |
| Taxa de conversão Free→PRO | 5% | 12% |
| Vídeos gerados/mês | 500 | 3.000 |
| Taxa de conclusão do fluxo | 60% | 75% |
| Churn mensal PRO | < 15% | < 8% |
| NPS | — | > 40 |

---

## Decisões em Aberto

| Decisão | Opções | Responsável | Prazo |
|---|---|---|---|
| Pool de créditos HeyGen (opção B) | Implementar v2 / Deixar para v3 | Produto | Sprint 4 |
| Limite de vídeos/mês para FREE | 3 / 5 / 10 | Produto | Sprint 5 |
| Preço PRO | $29 / $39 / $49/mês | Negócio | Sprint 6 |
| Marca própria (white-label) | Incluir na v2 / v3 | Negócio | Sprint 7 |
| App mobile | React Native / PWA / Não na v2 | Tecnologia | Sprint 7 |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| HeyGen muda API antes do Sprint 5 | Média | Alto | Desenvolver contra v3 (suportada até 2026+) |
| FFmpeg.wasm lento em dispositivos fracos | Alta | Médio | Fallback: processar no servidor (Vercel Functions com ffmpeg-static) |
| Custo R2 explode com vídeos | Baixa | Alto | TTL de 30 dias nos arquivos, usuário baixa antes de expirar |
| OpenRouter fora do ar durante geração | Baixa | Alto | Retry automático + fallback para API direta (com CORS proxy) |
| Stripe webhook não processa upgrade | Média | Alto | Verificação manual na dashboard + reprocessamento |

