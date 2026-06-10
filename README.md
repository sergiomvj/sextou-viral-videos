# 🎬 Sextou Viral Studio

Ferramenta de criação de vídeos virais para sexta-feira — gera roteiros, avatares HeyGen e posts otimizados para redes sociais com IA.

---

## 🚀 Stack

### v1 (atual) — HTML Standalone
- Arquivo único `v1-reference.html` com 4 fases de criação:
  1. **Briefing** — tema, plataforma, formato
  2. **Roteiro** — gerado via OpenRouter (Claude/GPT)
  3. **Avatar** — integração HeyGen para vídeo com apresentador IA
  4. **Post** — legenda + hashtags otimizadas para cada rede
- Sem backend, sem banco de dados
- Deploy via nginx (Docker)

### v2 (roadmap) — Next.js 15 + Supabase
- App Router + Server Actions
- Autenticação com Supabase Auth
- Histórico de projetos no banco
- Dashboard com analytics
- Multi-usuário / planos

---

## 🐳 Deploy no Easypanel

### Pré-requisitos
- VPS com Easypanel instalado
- Domínio apontado para o servidor (ex: `sextou.fbr.news`)

### Passos

1. **No Easypanel**, crie um novo serviço do tipo **App**
2. Conecte ao repositório GitHub: `sergiomvj/sextou-viral-videos`
3. Configure:
   - **Build Type:** Dockerfile
   - **Port:** 80
   - **Domain:** `sextou.fbr.news`
4. Clique em **Deploy**

### Configuração manual (Docker local)

```bash
# Build da imagem
docker build -t sextou-viral .

# Rodar localmente
docker run -p 8080:80 sextou-viral

# Acessar em http://localhost:8080
```

### Variáveis de ambiente
Copie `.env.example` para `.env` e preencha as chaves de API:

```bash
cp .env.example .env
```

> **Nota v1:** As API keys são inseridas diretamente na interface do HTML (não via variáveis de ambiente). O `.env` é preparação para v2.

---

## 📁 Estrutura do Projeto

```
sextou-viral-videos/
├── v1-reference.html      # Aplicação v1 (HTML standalone)
├── Dockerfile             # Build nginx para deploy
├── nginx.conf             # Configuração do servidor web
├── easypanel.json         # Metadados para Easypanel
├── .env.example           # Template de variáveis de ambiente
├── .dockerignore          # Arquivos excluídos do build
└── prd/
    ├── sextou-viral-studio-PRD.md          # PRD completo
    └── sextou-viral-studio (6).html        # Versão original v1
```

---

## 🗺️ Roadmap v1 → v2

| Feature | v1 | v2 |
|---|---|---|
| Geração de roteiro IA | ✅ (OpenRouter) | ✅ |
| Avatar HeyGen | ✅ | ✅ |
| Post copy | ✅ | ✅ |
| Autenticação | ❌ | ✅ Supabase |
| Histórico de projetos | ❌ | ✅ |
| Multi-usuário | ❌ | ✅ |
| Analytics | ❌ | ✅ |
| Deploy | nginx estático | Next.js 15 + Edge |

---

## 📄 Licença

Propriedade de **FBR News / Sextou Viral** — uso interno.
