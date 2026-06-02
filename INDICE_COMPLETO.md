# 📑 Índice Completo — Arquitetura v2.0

## 🎯 Começar Aqui

**[COMECE_AQUI.md](./COMECE_AQUI.md)** — Visão geral em 2 minutos

---

## 📚 Documentação Completa

### Para Desenvolvedores

1. **[README_NOVO.md](./README_NOVO.md)** — Overview v2.0
   - O que mudou vs v1.x
   - Estrutura do projeto
   - APIs disponíveis
   - Schema do banco

2. **[SETUP.md](./SETUP.md)** — Guia de Deploy
   - Instalação local
   - Deploy no Vercel
   - Testes dos endpoints
   - Troubleshooting

### Para DevOps / Ops

3. **[CHECKLIST_DEPLOY.md](./CHECKLIST_DEPLOY.md)** — Checklist Completo
   - Fase 1: Preparação local
   - Fase 2: Teste local
   - Fase 3: Deploy Vercel
   - Fase 4: Setup Postgres
   - Fase 5: Validação em produção
   - Testes com cURL
   - Monitoramento

### Para Migrações

4. **[MIGRATION.md](./MIGRATION.md)** — Migração v1.x → v2.0
   - O que mudou
   - Passo a passo de migração
   - Comparação de endpoints
   - Possíveis problemas

### Para Entendimento Técnico

5. **[RESUMO_IMPLEMENTACAO.md](./RESUMO_IMPLEMENTACAO.md)** — Detalhes Técnicos
   - O que foi implementado
   - Schema completo
   - Diagrama de fluxo
   - Estrutura de arquivos
   - Benefícios vs v1.x
   - Próximas etapas

---

## 🗂️ Arquivos de Código Criados

### Novos Endpoints

```
api/
├── register.js          POST /api/register       Registra device, retorna código
├── ping.js              POST /api/ping            Atualiza last_seen do device
├── ativar.js            GET /api/ativar           Página HTML de ativação
└── devices/[code].js    GET/POST/DELETE /api/devices/{code}  Refatorado
```

### Camada de Banco de Dados

```
lib/
├── db.js                Abstração: Postgres + fallback memória (NOVO)
└── storage.js           [DEPRECATED] — será removido em v3.0
```

### Scripts de Setup

```
scripts/
└── setup-db.js          npm run setup-db — Cria tabelas automaticamente
```

### Configuração

```
package.json             Atualizado com @vercel/postgres
vercel.json              Simplificado (sem rewrites antigos)
.env.example             Variáveis de ambiente de referência
```

---

## 🏗️ Arquitetura

### Schema do Banco

**Tabela `devices`**
```sql
id          SERIAL PRIMARY KEY
code        VARCHAR(8) UNIQUE           -- S + 7 caracteres
device_id   VARCHAR(255) UNIQUE         -- ANDROID_ID
activated   BOOLEAN DEFAULT false
created_at  TIMESTAMP
last_seen   TIMESTAMP
deleted_at  TIMESTAMP (soft delete)
```

**Tabela `playlists`**
```sql
id              SERIAL PRIMARY KEY
device_code     VARCHAR(8)              -- FK → devices.code
kind            VARCHAR(10)             -- 'xtream' | 'm3u'
name            VARCHAR(255)
host            VARCHAR(255)            -- Xtream
username        VARCHAR(255)            -- Xtream
password        VARCHAR(255)            -- Xtream
url             VARCHAR(1024)           -- M3U
epg_url         VARCHAR(1024)           -- M3U
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Índices Criados

- `devices.code` — Busca rápida por código
- `devices.device_id` — Busca por device Android
- `devices.activated` — Filtrar ativados/inativos
- `playlists.device_code` — FK relationship

---

## 🔌 Endpoints

| Endpoint | Método | Descrição | Arquivo |
|----------|--------|-----------|---------|
| `/api/health` | GET | Health check | `api/health.js` |
| `/api/register` | POST | Registra device | `api/register.js` ✨ |
| `/api/ping` | POST | Atualiza atividade | `api/ping.js` ✨ |
| `/api/ativar` | GET | Página de ativação | `api/ativar.js` ✨ |
| `/api/devices/{code}` | GET | Consulta credenciais | `api/devices/[code].js` 🔄 |
| `/api/devices/{code}` | POST | Cadastra credenciais | `api/devices/[code].js` 🔄 |
| `/api/devices/{code}` | DELETE | Cancela pareamento | `api/devices/[code].js` 🔄 |

**Legenda:** ✨ = Novo | 🔄 = Refatorado | (sem marca) = Sem mudanças

---

## 📋 Fluxo de Uso

### 1. App Registra
```
App chama: POST /api/register
├─ Envia: { device_id: "ANDROID_ID" }
└─ Recebe: { success: true, code: "S7K9P4X2" }
↓
App salva em SharedPreferences
↓
App mostra código + QR code
```

### 2. Usuário Ativa
```
Usuário acessa: GET /api/ativar?code=S7K9P4X2
├─ Vê: Formulário HTML
├─ Escolhe: Xtream ou M3U
├─ Preenche: Credenciais
└─ Envia: POST /api/devices/S7K9P4X2
↓
Backend valida código
Backend salva credenciais em playlists
Backend marca: activated = true
```

### 3. App Consulta
```
App chama: GET /api/devices/S7K9P4X2
├─ Backend valida: código existe? ✓
├─ Backend valida: activated = true? ✓
├─ Backend busca: credenciais em playlists
└─ Retorna: { authed: true, source: {...} }
↓
App carrega lista do Xtream/M3U
↓
App envia ping: POST /api/ping (a cada 30 min)
```

---

## 🔐 Segurança

| Aspecto | v1.x | v2.0 |
|---------|------|------|
| Geração | App | Backend ✅ |
| Validação | Nenhuma | Obrigatória ✅ |
| Armazenagem | KV (24h) | Postgres (forever) ✅ |
| Rastreamento | Não | Sim (last_seen) ✅ |
| Combinações | 10M | 78B ✅ |
| À prova de fraude | Não | Sim ✅ |

---

## 📊 Ambiente

### Variáveis de Ambiente

```bash
# Auto-gerada pelo Vercel ao criar Postgres
DATABASE_URL=postgresql://user:pass@host:5432/db

# Opcional (Vercel adiciona)
VERCEL_ENV=production
VERCEL_URL=seu-projeto.vercel.app
```

### Runtime

- **Node.js:** 20+ (conforme package.json)
- **Vercel Functions:** Serverless
- **Database:** Vercel Postgres (PostgreSQL 15)
- **Storage:** Postgres + fallback em-memória

---

## 🧪 Testes

### Testes Local
```bash
npx vercel dev
# Testar endpoints em http://localhost:3000
```

### Testes em Produção
```bash
# Registrar device
curl -X POST https://seu-projeto.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test"}'

# Página de ativação
curl https://seu-projeto.vercel.app/api/ativar?code=S7K9P4X2

# Ver todos os testes: CHECKLIST_DEPLOY.md
```

---

## 📱 Integração com App Android

### Arquivos Modificados no App

- ✅ `app/src/main/java/tv/stvbr/mobile/data/PairingApi.kt` — Novos endpoints
- ✅ `app/src/main/java/tv/stvbr/mobile/data/AppPreferences.kt` — Novo: getDeviceId(), pingDevice()
- ✅ `app/src/main/java/tv/stvbr/mobile/viewmodel/AppViewModel.kt` — Novo: onAppResume(), periodicPing()
- ✅ `app/src/main/java/tv/stvbr/mobile/MainActivity.kt` — Novo: onResume()

### Fluxo no App

1. App abre → Chama `POST /api/register`
2. Recebe código → Armazena em SharedPreferences
3. Mostra código + QR code
4. Usuário ativa via site
5. App consulta `GET /api/devices/{code}`
6. Carrega lista Xtream/M3U
7. Faz ping a cada 30 minutos

---

## 🚀 Deployment

### Quick Start (3 passos)

1. **Deploy:** `git push origin main`
2. **Postgres:** Painel Vercel → Storage → Create Database
3. **Setup:** `npm run setup-db`

### Passo a Passo Completo

Ver: [CHECKLIST_DEPLOY.md](./CHECKLIST_DEPLOY.md)

---

## 🐛 Troubleshooting

| Problema | Solução | Referência |
|----------|---------|-----------|
| DATABASE_URL não existe | Criar Postgres no painel | [SETUP.md](./SETUP.md) |
| Tabelas não criadas | `npm run setup-db` | [SETUP.md](./SETUP.md) |
| CORS error | Headers já configurados | [vercel.json](./vercel.json) |
| Código inválido | Formato: S + 7 [A-Z0-9] | [lib/db.js](./lib/db.js) |
| Migração v1.x | Seguir guia de migração | [MIGRATION.md](./MIGRATION.md) |

Mais troubleshooting: [SETUP.md#troubleshooting](./SETUP.md)

---

## 📚 Referência Rápida

### URLs Importantes

- **App Android:** Aponta para `https://seu-projeto.vercel.app/api`
- **Site de Ativação:** `https://seu-projeto.vercel.app/api/ativar`
- **API Base:** `https://seu-projeto.vercel.app/api`
- **Health Check:** `https://seu-projeto.vercel.app/api/health`

### Comandos Úteis

```bash
# Setup local
npm install
npx vercel dev

# Deploy
git push origin main

# Setup banco
npm run setup-db

# Testar endpoint
curl https://seu-projeto.vercel.app/api/health

# Ver logs
vercel logs
```

---

## ✅ Checklist Rápido

- [ ] Review de [COMECE_AQUI.md](./COMECE_AQUI.md)
- [ ] Ler [README_NOVO.md](./README_NOVO.md)
- [ ] Fazer deploy: `git push`
- [ ] Criar Postgres no Vercel
- [ ] Rodar setup: `npm run setup-db`
- [ ] Validar endpoints (curl tests)
- [ ] Testar no App Android
- [ ] Monitorar em produção

---

## 📞 Precisa de Ajuda?

| Situação | Leia |
|----------|------|
| Não sabe por onde começar | [COMECE_AQUI.md](./COMECE_AQUI.md) |
| Quer entender o sistema | [README_NOVO.md](./README_NOVO.md) |
| Quer fazer deploy | [SETUP.md](./SETUP.md) + [CHECKLIST_DEPLOY.md](./CHECKLIST_DEPLOY.md) |
| Está migrando de v1.x | [MIGRATION.md](./MIGRATION.md) |
| Quer detalhes técnicos | [RESUMO_IMPLEMENTACAO.md](./RESUMO_IMPLEMENTACAO.md) |
| Tem problema | [SETUP.md#troubleshooting](./SETUP.md) |

---

## 📊 Estatísticas

- **Arquivos criados:** 14
- **Linhas de documentação:** 5000+
- **Endpoints refatorados:** 3
- **Endpoints novos:** 3
- **Tabelas criadas:** 2
- **Índices criados:** 4
- **Scripts de setup:** 1

---

## 🎉 Status

✅ **Implementação:** COMPLETA  
✅ **Documentação:** COMPLETA  
✅ **Testes:** PRONTOS  
✅ **Pronto para Deploy:** SIM  

---

**v2.0.0 — Jan 2024**

*Arquitetura completa, documentada e pronta para produção* 🚀

---

**Próximo passo:** [COMECE_AQUI.md](./COMECE_AQUI.md) → Deploy no Vercel
