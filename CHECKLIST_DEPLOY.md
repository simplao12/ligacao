# ✅ Checklist de Deploy — Arquitetura de Pareamento Seguro

**Data:** 2024-01-15  
**Versão:** 2.0.0  
**Status:** 🔄 Implementação Pronta para Deploy

---

## 📦 Arquivos Criados/Modificados

### API Endpoints

- ✅ `api/register.js` — **NOVO** — `POST /api/register`
- ✅ `api/ping.js` — **NOVO** — `POST /api/ping`
- ✅ `api/ativar.js` — **NOVO** — `GET /api/ativar?code=X` (página HTML)
- ✅ `api/devices/[code].js` — **REFATORADO** — GET/POST/DELETE
- ✅ `api/health.js` — Sem mudanças

### Camada de Banco de Dados

- ✅ `lib/db.js` — **NOVO** — Postgres + fallback em-memória
- ⚠️ `lib/storage.js` — **DEPRECATED** — Será removido em v3.0

### Scripts

- ✅ `scripts/setup-db.js` — **NOVO** — Cria tabelas automaticamente

### Configuração

- ✅ `package.json` — Atualizado com `@vercel/postgres`
- ✅ `vercel.json` — Simplificado (sem rewrites antigos)
- ✅ `.env.example` — Adicionado como referência

### Documentação

- ✅ `README_NOVO.md` — Overview completo v2.0
- ✅ `SETUP.md` — Passo a passo de deploy
- ✅ `MIGRATION.md` — Guia de migração v1.x → v2.0
- ✅ `CHECKLIST_DEPLOY.md` — Este arquivo

---

## 🚀 Passo a Passo para Deploy

### Fase 1: Preparação Local (5 min)

- [ ] Clonar repo atualizado
  ```bash
  cd ~/Documents/GitHub/ligacao/vercel-deploy
  git pull origin main
  ```

- [ ] Instalar dependências
  ```bash
  npm install
  ```

- [ ] Verificar estrutura
  ```bash
  ls api/
  ls lib/
  ls scripts/
  ```

### Fase 2: Teste Local (10 min)

- [ ] Iniciar servidor local
  ```bash
  npx vercel dev
  ```

- [ ] Testar health check
  ```bash
  curl http://localhost:3000/api/health
  # Expected: {"ok": true, ...}
  ```

- [ ] Testar register (sem DB, usa memória)
  ```bash
  curl -X POST http://localhost:3000/api/register \
    -H "Content-Type: application/json" \
    -d '{"device_id":"test123"}'
  # Expected: {"success": true, "code": "SXXXXXXX"}
  ```

- [ ] Testar página de ativação
  ```bash
  curl http://localhost:3000/api/ativar
  # Deve retornar HTML
  ```

### Fase 3: Deploy para Vercel (5 min)

- [ ] Confirmar que repo está conectado ao Vercel
  ```bash
  git remote -v | grep vercel
  # Deve mostrar algo como: https://github.com/seu-user/seu-repo.git
  ```

- [ ] Fazer commit
  ```bash
  git add -A
  git commit -m "chore: implement v2.0 secure pairing architecture"
  git push origin main
  ```

- [ ] Vercel faz deploy automaticamente (esperar ~2 min)

- [ ] Confirmar deployment
  ```bash
  # No painel Vercel: Deployments → verificar que passou ✓
  curl https://seu-projeto.vercel.app/api/health
  ```

### Fase 4: Setup do Banco de Dados (10 min)

#### Opção A: Via Painel Vercel (Recomendado)

1. No painel Vercel → seu projeto
2. **Storage** → **Create Database**
3. Selecionar **Postgres**
4. Nomear database (ex: `stvbr`)
5. Selecionar região (mais próxima dos usuários)
6. Clicar em **Create**
7. ✅ Vercel adiciona `DATABASE_URL` automaticamente
8. Esperar ~1 min para estabilizar

#### Opção B: Via CLI

```bash
vercel postgres create stvbr
vercel env pull
npm run setup-db
```

### Fase 5: Criar Tabelas (2 min)

- [ ] Setup no Vercel (via CLI)
  ```bash
  vercel env pull
  npm run setup-db
  ```

- [ ] Ou manualmente no painel Vercel:
  1. Storage → Seu Postgres
  2. **Query** (abrir editor SQL)
  3. Copiar SQL de `scripts/setup-db.js`
  4. Executar

- [ ] Verificar que tabelas foram criadas
  ```bash
  # Via painel Vercel → Storage → Postgres → Query
  SELECT name FROM sqlite_master WHERE type='table';
  # Deve retornar: devices, playlists
  ```

---

## 🧪 Validação em Produção (10 min)

### Teste 1: Health Check

```bash
curl https://seu-projeto.vercel.app/api/health
# Expected: 200 OK + JSON
```

### Teste 2: Registrar Dispositivo

```bash
curl -X POST https://seu-projeto.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"device_id":"android-test-123"}'

# Expected: 
# {"success": true, "code": "S7K9P4X2"}
```

### Teste 3: Fazer Ping

```bash
CODE="S7K9P4X2"  # use o código do teste anterior

curl -X POST https://seu-projeto.vercel.app/api/ping \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\"}"

# Expected: {"success": true}
```

### Teste 4: Consultar Dispositivo (Não Ativado)

```bash
CODE="S7K9P4X2"

curl https://seu-projeto.vercel.app/api/devices/$CODE

# Expected: {"authed": false}
```

### Teste 5: Ativar Dispositivo

```bash
CODE="S7K9P4X2"

curl -X POST https://seu-projeto.vercel.app/api/devices/$CODE \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "xtream",
    "name": "Teste IPTV",
    "credentials": {
      "host": "http://iptv.example.com",
      "username": "testuser",
      "password": "testpass"
    }
  }'

# Expected: 
# {"ok": true, "code": "S7K9P4X2", "message": "Dispositivo ativado com sucesso"}
```

### Teste 6: Consultar Dispositivo (Agora Ativado)

```bash
CODE="S7K9P4X2"

curl https://seu-projeto.vercel.app/api/devices/$CODE

# Expected:
# {
#   "authed": true,
#   "source": {
#     "kind": "xtream",
#     "name": "Teste IPTV",
#     "credentials": {
#       "host": "http://iptv.example.com",
#       "username": "testuser",
#       "password": "testpass"
#     }
#   },
#   "pairedAt": "2024-01-15T10:30:00Z"
# }
```

### Teste 7: Página de Ativação

```bash
# Acessar no navegador ou curl
curl https://seu-projeto.vercel.app/api/ativar

# Deve retornar HTML com:
# - Input para digitar código
# - Aba para Xtream
# - Aba para M3U
# - Formulários preenchíveis
```

### Teste 8: Banco de Dados

```bash
# Via painel Vercel → Storage → Postgres → Query
SELECT COUNT(*) FROM devices;
SELECT COUNT(*) FROM playlists;

# Deve retornar as linhas criadas nos testes
```

---

## 📱 Teste com App Android

- [ ] Atualizar app Android para v2.0+ (conforme instruções em [../PAIRING_ARCHITECTURE.md](../PAIRING_ARCHITECTURE.md))

- [ ] Mudar BASE_URL em `AppPreferences.kt`:
  ```kotlin
  const val API_BASE = "https://seu-projeto.vercel.app/api"
  ```

- [ ] Build e deploy app:
  ```bash
  ./gradlew assembleDebug
  adb install -r app/build/outputs/apk/debug/app-debug.apk
  ```

- [ ] Abrir app na TV/Android
  - [ ] App chama `POST /api/register`
  - [ ] Recebe código (ex: `S7K9P4X2`)
  - [ ] Mostra código + QR
  - [ ] QR aponta para `https://seu-projeto.vercel.app/ativar?code=S7K9P4X2`

- [ ] Testar no site:
  - [ ] Abrir `https://seu-projeto.vercel.app/ativar`
  - [ ] Digitar código
  - [ ] Preencher credenciais Xtream
  - [ ] Clicar "Ativar"
  - [ ] Sucesso!

- [ ] Testar app:
  - [ ] App consulta `GET /api/devices/S7K9P4X2`
  - [ ] Recebe credenciais
  - [ ] Carrega lista do Xtream
  - [ ] ✓ Tudo funciona!

---

## 🔍 Monitoramento Pós-Deploy

### Verificar Logs

```bash
# Via Vercel CLI
vercel logs

# Ou no painel: Deployments → Logs
```

### Verificar BD

```sql
-- Quantos dispositivos registrados
SELECT COUNT(*) as total_devices FROM devices;

-- Quantos ativos
SELECT COUNT(*) as active FROM devices WHERE activated = true;

-- Último ping
SELECT code, last_seen FROM devices ORDER BY last_seen DESC LIMIT 5;
```

### Alertas

- ❌ Erro de conexão com Postgres → Checar DATABASE_URL
- ❌ Função 500 → Checar logs: `vercel logs`
- ❌ Tabelas não existem → Rodar `npm run setup-db`

---

## 📚 Documentação

Compartilhe com sua equipe:

| Documento | Para quem | O que contém |
|-----------|-----------|------------|
| `README_NOVO.md` | Developers | Overview v2.0, APIs, schema |
| `SETUP.md` | DevOps | Deploy, testes, troubleshooting |
| `MIGRATION.md` | Maiores de v1.x | Como atualizar de v1 para v2 |
| `CHECKLIST_DEPLOY.md` | Este documento | Passo a passo completo |

---

## ✨ Pronto para Produção?

Depois de completar todos os ✅, seu sistema está:

- ✅ Seguro (códigos gerados no backend)
- ✅ Escalável (Postgres + Vercel)
- ✅ Rastreável (last_seen, ping)
- ✅ À prova de fraude (78B combinações)
- ✅ Pronto para produção 🚀

---

## 📞 Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| `DATABASE_URL not found` | Criar Postgres no painel, redeploy |
| `relation "devices" does not exist` | Rodar `npm run setup-db` |
| `Cannot find module '@vercel/postgres'` | `npm install`, redeploy |
| `CORS error` | Headers já estão em vercel.json, limpar cache |
| `Código inválido` | Formato: `S` + 7 [A-Z0-9] |

---

**Versão:** 2.0.0  
**Data:** 2024-01-15  
**Status:** ✅ Pronto para Deploy

Bom deployment! 🎉
