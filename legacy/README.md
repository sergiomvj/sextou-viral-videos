# sextou-viral-videos

Sextou Viral Studio em Next.js, com auth, dashboard, studio multi-etapas, billing demo, jobs e persistencia via Prisma/Supabase.

## Stack

- Next.js 15
- React 19
- Tailwind CSS 4
- NextAuth v5 beta
- Prisma
- Supabase Postgres

## Escopo atual do MVP

- Auth por credentials e Google OAuth condicional por env
- Dashboard e historico de producoes
- Studio com fluxo guiado e autosave
- Geracao mockada de roteiro, audio, video e avatar
- Gating de plano `FREE` e `PRO` em modo operacional/demo

### Stripe no MVP

Stripe nao e obrigatorio para o MVP atual. O codigo de billing foi mantido como scaffolding para a integracao futura, mas o comportamento atual e apenas de gating interno por plano.

- Nao e necessario configurar `STRIPE_SECRET_KEY` nem `STRIPE_WEBHOOK_SECRET` agora
- A tela `/billing` funciona como controle operacional de plano
- O upgrade real via checkout e webhook Stripe fica para a fase pos-MVP

## Local setup

1. Copie `.env.example` para `.env.local`.
2. Substitua `[YOUR-PASSWORD]` dentro de `DATABASE_URL` pela senha real do Supabase.
3. Defina `AUTH_SECRET` e `APP_ENCRYPTION_KEY`.
4. Defina `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
5. Opcional: defina `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` para habilitar Google OAuth.
6. Instale as dependencias:

```bash
npm install
```

## Validacao

```bash
npm run prisma:generate
npm run lint
npm run typecheck
npm run build
npm test
```

## Database bootstrap

Gere o Prisma Client:

```bash
npm run prisma:generate
```

Aplique as migrations commitadas em um banco real:

```bash
npm run prisma:migrate:deploy
```

Rode o seed do usuario de desenvolvimento:

```bash
npm run db:seed
```

Credenciais seed:

- Email: `dev@sextou.local`
- Password: `Dev12345!`

## Auth behavior

- Login por credentials fica disponivel quando o banco estiver configurado.
- Login com Google so aparece quando `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` estiverem presentes.

## Integracoes externas

As rotas e contratos para OpenRouter, HeyGen e Stripe podem existir no codigo antes dos secrets reais.

- OpenRouter: pode permanecer mockado ate `OPENROUTER_API_KEY`
- HeyGen: pode permanecer mockado ate `HEYGEN_API_KEY`
- Stripe: mantido como scaffold, fora do escopo do MVP atual

## Story handoff

O espelho local das stories desta app fica em `docs/stories/` nesta pasta, apontando para os artefatos canonicos do repo raiz.
