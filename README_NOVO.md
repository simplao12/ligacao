# STVBR Vercel — v2.0 — Arquitetura de Pareamento Seguro

## ✨ O que mudou

A partir da v2.0, o sistema de pareamento foi completamente refatorado para maior segurança:

### Antes (v1.x)
- ❌ App gerava código localmente (infinito de combinações)
- ❌ Backend aceitava qualquer código sem validar
- ❌ Dados armazenados em KV com TTL de 24h
- ❌ Sem rastreamento de dispositivos

### Agora (v2.0)
- ✅ Backend gera e controla todos os códigos
- ✅ Códigos apenas existem após registro no BD
- ✅ Armazenamento permanente em PostgreSQL
- ✅ Rastreamento de atividade (`last_seen`)
- ✅ Impossível fraudar (78 bilhões de combinações)
- ✅ Detecção de compartilhamento de contas

## 🗂️ Estrutura do Projeto

```
vercel-deploy/
├── api/
│   ├── health.js              # Health check
│   ├── register.js            # POST /api/register — cria código
│   ├── ping.js                # POST /api/ping — atualiza atividade
│   ├── ativar.js              # GET /api/ativar — página de ativação
│   └── devices/
│       └── [code].js          # GET/POST/DELETE /api/devices/{code}
├── lib/
│   ├── db.js                  # Camada de BD (Postgres + fallback memória)
│   └── storage.js             # [DEPRECIADO] — use lib/db.js
├── scripts/
│   └── setup-db.js            # Setup inicial do BD
├── package.json
├── vercel.json
├── .env.example
├── SETUP.md                   # Instruções de deploy
└── README.md                  # Este arquivo
```

## 🚀 Quick Start

### 1. Clonar e instalar

```bash
git clone <seu-repo>
cd vercel-deploy
npm install
```

### 2. Setup local (opcional)

```bash
# Com BD local ou remoto via Vercel/Supabase
echo "DATABASE_URL=postgresql://..." > .env.local
npm run setup-db

# Ou puxe do Vercel para .env.local
npx vercel env pull .env.local
npm run setup-db

# Ou apenas em memória (dev)
npm install -g vercel
vercel dev
```

### 3. Deploy

```bash
git push origin main
# Vercel detecta e faz deploy automaticamente
```

### 4. Criar Postgres no Vercel

No painel do Vercel:
- Projeto → Storage → Create Database → Postgres
- Vercel adiciona `DATABASE_URL` automaticamente
- Redeploy o projeto
- Pronto! 🎉

## 📡 APIs

### `POST /api/register`
**Registra dispositivo e retorna código**

Request:
```json
{
  "device_id": "a1b2c3d4e5f6g7h8"
}
```

Response:
```json
{
  "success": true,
  "code": "S7K9P4X2"
}
```

### `POST /api/ping`
**Atualiza atividade do dispositivo**

Request:
```json
{
  "code": "S7K9P4X2"
}
```

Response:
```json
{
  "success": true
}
```

### `GET /api/devices/{code}`
**Retorna credenciais (TV consulta)**

Response:
```json
{
  "authed": true,
  "source": {
    "kind": "xtream",
    "name": "Minha Lista",
    "credentials": {
      "host": "http://iptv.provider.com",
      "username": "user",
      "password": "pass"
    }
  },
  "pairedAt": "2024-01-15T10:30:00Z"
}
```

### `POST /api/devices/{code}`
**Cadastra credenciais (site ativa)**

Request:
```json
{
  "kind": "xtream",
  "name": "Minha Lista",
  "credentials": {
    "host": "http://iptv.provider.com",
    "username": "user",
    "password": "pass"
  }
}
```

### `GET /api/ativar?code=S7K9P4X2`
**Página HTML interativa de ativação**

Mostra formulário para o usuário:
- Digitar código
- Escolher Xtream ou M3U
- Preencher credenciais
- Ativar dispositivo

## 🔐 Fluxo de Segurança

```
┌─ App abre
│
├─ Obtém ANDROID_ID
│
├─ POST /api/register
│  └─ Backend gera código S7K9P4X2
│     └─ Salva na tabela devices
│
├─ App armazena código
│
├─ Mostra código + QR
│
├─ Usuário acessa site: https://seu-projeto.vercel.app/ativar
│  │
│  ├─ Digita: S7K9P4X2
│  │
│  ├─ GET /api/ativar?code=S7K9P4X2
│  │  └─ Valida se código existe (✓)
│  │
│  ├─ Mostra formulário
│  │
│  ├─ Usuário preenche:
│  │  ├─ Nome: "Minha Lista"
│  │  ├─ Host: "http://iptv.provider.com"
│  │  ├─ User: "user"
│  │  └─ Pass: "pass"
│  │
│  └─ POST /api/devices/S7K9P4X2
│     └─ Backend:
│        ├─ Valida código
│        ├─ Salva credenciais em playlists
│        └─ Marca como activated=true
│
├─ App checa GET /api/devices/S7K9P4X2
│  └─ Recebe credenciais (authed=true, source={...})
│
└─ App carrega lista do Xtream ✓
```

## 🛠️ Variáveis de Ambiente

```bash
# Auto-gerada pelo Vercel ao criar Postgres
DATABASE_URL=postgresql://user:pass@host/db

# Opcional (Vercel adiciona automaticamente)
VERCEL_ENV=production
VERCEL_URL=seu-projeto.vercel.app
```

## 📊 Schema do Banco

### `devices`
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(8) UNIQUE           -- S + 7 caracteres (36^7 = 78B)
device_id       VARCHAR(255) UNIQUE         -- ANDROID_ID do app
activated       BOOLEAN DEFAULT false
created_at      TIMESTAMP DEFAULT NOW()
last_seen       TIMESTAMP DEFAULT NOW()
deleted_at      TIMESTAMP                   -- Soft delete
```

### `playlists`
```sql
id              SERIAL PRIMARY KEY
device_code     VARCHAR(8)
kind            VARCHAR(10)                 -- 'xtream' | 'm3u'
name            VARCHAR(255)
host            VARCHAR(255)                -- Xtream only
username        VARCHAR(255)                -- Xtream only
password        VARCHAR(255)                -- Xtream only
url             VARCHAR(1024)               -- M3U only
epg_url         VARCHAR(1024)               -- M3U only
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

## 🧪 Testar

```bash
# Register
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"device_id":"abc123"}'

# Ping
curl -X POST http://localhost:3000/api/ping \
  -H "Content-Type: application/json" \
  -d '{"code":"S7K9P4X2"}'

# Get device
curl http://localhost:3000/api/devices/S7K9P4X2

# Activate (POST)
curl -X POST http://localhost:3000/api/devices/S7K9P4X2 \
  -H "Content-Type: application/json" \
  -d '{
    "kind":"xtream",
    "name":"Minha",
    "credentials":{
      "host":"http://iptv.com",
      "username":"u",
      "password":"p"
    }
  }'

# Activation page
curl http://localhost:3000/api/ativar?code=S7K9P4X2
```

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| `DATABASE_URL not found` | Criar Postgres no painel Vercel, redeploy |
| `Tabelas não existem` | Rodar `npm run setup-db` |
| `CORS error` | Todos endpoints têm CORS permitido, verificar browser |
| `Código inválido` | Formato deve ser `S` + 7 [A-Z0-9] |
| `Device not found` | Rodar `/api/register` primeiro |

## 📚 Documentação Completa

- **[SETUP.md](./SETUP.md)** — Instruções passo a passo de deploy
- **[../PAIRING_ARCHITECTURE.md](../PAIRING_ARCHITECTURE.md)** — Design completo
- **[../BACKEND_IMPLEMENTATION.md](../BACKEND_IMPLEMENTATION.md)** — Exemplos detalhados
- **[../PAIRING_ARCHITECTURE.md](../app/src/main/java/tv/stvbr/mobile/data/PairingApi.kt)** — Cliente Android

## ✅ Checklist de Deploy

- [ ] `npm install`
- [ ] Testar localmente: `vercel dev`
- [ ] Conectar repo ao Vercel
- [ ] Criar Vercel Postgres
- [ ] Deploy: `git push`
- [ ] Rodar setup: `npm run setup-db`
- [ ] Testar endpoints:
  - [ ] GET `/api/health` → ok
  - [ ] POST `/api/register` → código
  - [ ] GET `/api/ativar` → formulário
  - [ ] POST para ativar → sucesso
  - [ ] GET `/api/devices/{code}` → credenciais
- [ ] Testar no app Android
- [ ] Ir ao site e ativar um código

## 🎉 Pronto!

Seu sistema de pareamento está seguro, escalável e rastreável!

---

**v2.0.0** — Jan 2024  
Arquitetura refatorada para segurança máxima
