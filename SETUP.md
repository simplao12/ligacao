# Setup — Arquitetura de Pareamento Seguro no Vercel

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Node.js 20+
- PostgreSQL (via Vercel Postgres ou auto)

## 🚀 Instalação Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar banco de dados local (opcional)

Se quiser testar com um Postgres local, crie um arquivo de ambiente no projeto:

```bash
# Criar .env.local com sua DATABASE_URL
echo "DATABASE_URL=postgresql://user:pass@localhost/stvbr" > .env.local
```

O projeto lê automaticamente `.env.local` ou `.env` antes de iniciar.

Se não configurar, o app usa storage em memória (apenas para dev).

### 3. Setup do banco de dados

```bash
npm run setup-db
```

Isso cria as tabelas `devices` e `playlists` automaticamente.

### 4. Testar localmente

```bash
# Usando Vercel CLI
vercel dev

# Ou npm
npm install -g vercel
vercel dev
```

Acesse http://localhost:3000/api/health

## 🌐 Deploy no Vercel

### 1. Conectar repositório

```bash
git push origin main
```

Vercel detecta automaticamente e inicia o build.

### 2. Criar Vercel Postgres (se ainda não tem)

No painel do Vercel:

1. Vá ao seu projeto → **Storage** → **Create Database**
2. Selecione **Postgres**
3. Siga os passos (nomear database, região, etc)
4. Vercel adiciona `DATABASE_URL` automaticamente

### 3. Rodar migrations

Após criar o banco:

```bash
# Puxe as env vars do Vercel para .env.local
npx vercel env pull .env.local
npm run setup-db  # Cria as tabelas
```

Se você já tiver `DATABASE_URL` em `.env.local`, `npm run setup-db` vai usar essa conexão.

Ou na primeira requisição a qualquer endpoint, ele tenta criar automaticamente (graceful).

## 📡 Endpoints Criados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/register` | Registra/retorna código do dispositivo |
| `POST` | `/api/ping` | Atualiza last_seen do dispositivo |
| `GET` | `/api/devices/{code}` | Retorna credenciais (TV consulta) |
| `POST` | `/api/devices/{code}` | Cadastra credenciais (site ativa) |
| `DELETE` | `/api/devices/{code}` | Cancela pareamento |
| `GET` | `/api/ativar?code=S7K9P4X2` | Página HTML de ativação |

## 🔐 Fluxo Completo

```mermaid
App                 Backend              Site
├─ POST /register
│  └─ device_id
│     └─ returns code ────┐
│                         │
│  stores code locally    │
│  ────────────────────   │
│                         │
│                    [User opens site]
│                         │
│                   GET /ativar?code=S7K9P4X2
│                         │
│                   POST /devices/{code}
│                   (site sends credentials)
│                         │
│ GET /devices/{code} ←───┴─ stores credentials
│ (checks if activated)
│ ← returns credentials
│
└─ POST /ping (every 30 min)
   └─ updates last_seen
```

## 📝 Variáveis de Ambiente

```bash
# Vercel Postgres (auto-gerada)
DATABASE_URL=postgresql://...

# Vercel Runtime
VERCEL_ENV=production
VERCEL_URL=seu-projeto.vercel.app
```

## 🧪 Testar os Endpoints

### 1. Registrar dispositivo

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"device_id": "abc123def456"}'

# Response:
# {"success": true, "code": "S7K9P4X2"}
```

### 2. Fazer ping

```bash
curl -X POST http://localhost:3000/api/ping \
  -H "Content-Type: application/json" \
  -d '{"code": "S7K9P4X2"}'

# Response:
# {"success": true}
```

### 3. Ativar dispositivo (POST)

```bash
curl -X POST http://localhost:3000/api/devices/S7K9P4X2 \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "xtream",
    "name": "Minha Lista",
    "credentials": {
      "host": "http://iptv.example.com",
      "username": "user",
      "password": "pass"
    }
  }'

# Response:
# {"ok": true, "code": "S7K9P4X2", "message": "Dispositivo ativado com sucesso"}
```

### 4. Consultar dispositivo (GET)

```bash
curl http://localhost:3000/api/devices/S7K9P4X2

# Response (se ativado):
# {
#   "authed": true,
#   "source": {
#     "kind": "xtream",
#     "name": "Minha Lista",
#     "credentials": {"host": "...", "username": "...", "password": "..."}
#   },
#   "pairedAt": "2024-01-15T10:30:00Z"
# }
```

### 5. Página de ativação

```bash
# Sem código (form para digitar)
curl http://localhost:3000/api/ativar

# Com código
curl http://localhost:3000/api/ativar?code=S7K9P4X2
```

## 📊 Schema do Banco

### Tabela `devices`

```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(8) UNIQUE           -- S + 7 caracteres
device_id       VARCHAR(255) UNIQUE         -- ANDROID_ID do app
activated       BOOLEAN DEFAULT false       -- Se tem credentials cadastradas
created_at      TIMESTAMP                   -- Quando foi criado
last_seen       TIMESTAMP                   -- Último ping
deleted_at      TIMESTAMP                   -- Soft delete (opcional)
```

### Tabela `playlists`

```sql
id              SERIAL PRIMARY KEY
device_code     VARCHAR(8)                  -- FK → devices.code
kind            VARCHAR(10)                 -- 'xtream' ou 'm3u'
name            VARCHAR(255)                -- Nome da lista
host            VARCHAR(255)                -- Xtream: servidor
username        VARCHAR(255)                -- Xtream: usuário
password        VARCHAR(255)                -- Xtream: senha
url             VARCHAR(1024)               -- M3U: URL do arquivo
epg_url         VARCHAR(1024)               -- M3U: URL do EPG
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

## 🔍 Monitoramento

### Dispositivos ativos (últimas 24h)

```sql
SELECT code, device_id, activated, last_seen 
FROM devices 
WHERE last_seen > NOW() - INTERVAL '1 day'
ORDER BY last_seen DESC;
```

### Dispositivos inativos

```sql
SELECT code, device_id, last_seen 
FROM devices 
WHERE last_seen < NOW() - INTERVAL '30 days';
```

### Ver playlist de um dispositivo

```sql
SELECT d.code, d.device_id, d.activated, p.kind, p.name, p.created_at
FROM devices d
LEFT JOIN playlists p ON d.code = p.device_code
WHERE d.code = 'S7K9P4X2';
```

## 🐛 Troubleshooting

### DATABASE_URL não está sendo lido

1. Verifica se você criou o Postgres no painel Vercel
2. Redeploy o projeto: `git push origin main`
3. Verifica logs: `vercel logs`

### Tabelas não são criadas automaticamente

1. Rode manualmente: `npm run setup-db`
2. Verifica conexão: `npm run setup-db`
3. Verifica logs do Vercel

### CORS errors

Todos os endpoints têm `Access-Control-Allow-Origin: *` ativado. Se ainda tiver problema:

1. Verifica o header `Origin` na request
2. Muda em `lib/db.js` se necessário

## ✅ Checklist de Deploy

- [ ] Repositório criado e conectado ao Vercel
- [ ] Vercel Postgres criado
- [ ] `DATABASE_URL` configurada automaticamente
- [ ] Deploy realizado (`git push`)
- [ ] `npm run setup-db` rodado (ou tabelas criadas)
- [ ] Endpoints testados:
  - [ ] `/api/health` retorna ok
  - [ ] `/api/register` gera código
  - [ ] `/api/ativar?code=X` mostra form
  - [ ] POST para ativar funciona
  - [ ] `/api/devices/{code}` retorna credenciais
- [ ] App Android testado:
  - [ ] Chama `/api/register` com ANDROID_ID
  - [ ] Recebe código
  - [ ] Armazena localmente
  - [ ] Faz ping periodicamente

## 📚 Documentação Relacionada

- [PAIRING_ARCHITECTURE.md](../PAIRING_ARCHITECTURE.md) — Design completo
- [BACKEND_IMPLEMENTATION.md](../BACKEND_IMPLEMENTATION.md) — Exemplos detalhados
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
