# Migração v1.x → v2.0

## 📝 O que mudou

### Storage
- **v1.x:** Vercel KV com TTL 24h
- **v2.0:** PostgreSQL permanente

### Códigos
- **v1.x:** App gerava `S` + 7 dígitos
- **v2.0:** Backend gera `S` + 7 alfanuméricos

### Endpoints
- **v1.x:** POST/GET/DELETE `/api/devices/{code}`
- **v2.0:** `POST /api/register`, `POST /api/ping` + endpoints anteriores

### Dados
- **v1.x:** Consumia na primeira leitura (GET + consume=true)
- **v2.0:** Dados persistentes, validação em cada acesso

## 🔄 Passo a Passo para Migração

### 1. Backup de Dados (Opcional)

Se você tem dados importantes em KV:

```bash
# Exportar dados do KV
npm install -g @vercel/kv-export
vercel kv export > backup.json
```

### 2. Criar Postgres

No painel Vercel:
1. Vá ao seu projeto → **Storage**
2. **Create Database** → **Postgres**
3. Selecione região e crie
4. Vercel adiciona `DATABASE_URL` automaticamente

### 3. Atualizar Código

#### Remover imports de storage.js

De:
```javascript
import { setPairing, getPairing } from '../../lib/storage.js';
```

Para:
```javascript
import { getDevice, setPlaylist } from '../../lib/db.js';
```

#### Atualizar chamadas

```javascript
// v1
const entry = await getPairing(code, { consume: true });

// v2
const device = await getDevice(code);
const playlist = await getPlaylist(code);
```

### 4. Criar Tabelas

```bash
npm run setup-db
```

Isso cria:
- `devices` — registo de dispositivos
- `playlists` — credenciais cadastradas

### 5. Migrar Dados (Optional)

Se tem dados no KV, migre manualmente:

```javascript
// Lê do KV
const kvData = await kv.get(`pair:${code}`);

// Escreve no Postgres
await sql`
  INSERT INTO devices (code, activated) VALUES ($1, true);
  INSERT INTO playlists (device_code, ...) VALUES ($1, ...);
`;
```

### 6. Teste Local

```bash
vercel dev
npm run setup-db
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test123"}'
```

### 7. Deploy

```bash
git add -A
git commit -m "chore: migrate to v2.0 with Postgres backend"
git push origin main
```

### 8. Validar em Produção

```bash
# Health check
curl https://seu-projeto.vercel.app/api/health

# Register
curl -X POST https://seu-projeto.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test123"}'

# Verify data in Postgres
# No painel Vercel → Storage → Postgres → Query
SELECT * FROM devices LIMIT 1;
```

## 🔧 Comparação de Endpoints

| Ação | v1.x | v2.0 |
|------|------|------|
| Registrar device | N/A | `POST /api/register` |
| Atualizar atividade | N/A | `POST /api/ping` |
| Cadastrar credenciais | `POST /api/devices/{code}` | `POST /api/devices/{code}` (igual) |
| Consultar credenciais | `GET /api/devices/{code}` (consume) | `GET /api/devices/{code}` (não consume) |
| Cancelar | `DELETE /api/devices/{code}` | `DELETE /api/devices/{code}` (igual) |
| Página de ativação | Manual/custom | `GET /api/ativar?code=X` (built-in) |

## 🐛 Possíveis Problemas

### KV ainda está sendo usado

Se o código ainda importa de `lib/storage.js`:

```bash
# Procurar
grep -r "storage.js" --include="*.js" api/

# Remover imports antigos
sed -i "s|lib/storage.js|lib/db.js|g" api/**/*.js
```

### Postgres connection error

```
Error: connect ENOTFOUND host
```

Solução:
1. Verifica se DATABASE_URL está em Env Vars (Vercel painel)
2. Redeploy: `git push` ou botão "Redeploy" no painel
3. Tenta novamente em 1-2 minutos (pode levar para conectar)

### Tabelas não existem

```
Error: relation "devices" does not exist
```

Solução:
```bash
npm run setup-db
```

Ou manualmente:
```bash
vercel env pull
npm install
npm run setup-db
```

### Antigos KV data não aparecem no Postgres

**Isto é esperado.** Você precisa migrar manualmente se quiser preservar dados antigos.

Para simplificar, pode ignorar dados antigos e começar fresco em v2.0.

## 📋 Checklist de Migração

- [ ] Backup de dados (se necessário)
- [ ] Criar Vercel Postgres
- [ ] Atualizar imports: `storage.js` → `db.js`
- [ ] Testar localmente: `vercel dev`
- [ ] Rodar setup: `npm run setup-db`
- [ ] Deploy: `git push`
- [ ] Validar em produção
- [ ] Testar app Android
- [ ] Remover `@vercel/kv` do package.json (opcional)
- [ ] Apagar variável KV da config (opcional)

## 🎉 Está Pronto!

Sua arquitetura agora é v2.0 — mais segura, escalável e mantível! 🚀

---

**Dúvidas?** Veja [SETUP.md](./SETUP.md) ou [README_NOVO.md](./README_NOVO.md)
