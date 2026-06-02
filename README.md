# 🚀 STVBR no Vercel — Deploy em 5 minutos

Versão otimizada da hospedagem para **Vercel** (gratuita, HTTPS automático,
custom domain grátis, deploy por git push).

```
vercel-deploy/
├── vercel.json          Config do Vercel (rewrites, headers, CORS)
├── package.json
├── public/              Portal estático (HTML + JSX)
│   ├── index.html
│   └── portal.jsx
├── api/                 Funções serverless
│   ├── health.js              → GET /api/health
│   └── devices/[code].js      → GET/POST/DELETE /api/devices/Sxxxxxxx
└── lib/
    └── storage.js       In-memory + Vercel KV (escolha automática)
```

---

## ⚡ Deploy em 3 cliques

### Caminho 1 — Pela interface web (mais simples)

1. Crie conta grátis em https://vercel.com
2. Clique em **"Add New… → Project"**
3. Arraste a pasta `vercel-deploy/` inteira na tela (drag-and-drop) OU conecte
   um repositório do GitHub que contenha esta pasta
4. Clique em **Deploy** — sem alterar nada

Em ~30 segundos seu site vai estar online em `https://stvbr-XXX.vercel.app`.
Teste:

- `https://stvbr-XXX.vercel.app` → portal de cadastro
- `https://stvbr-XXX.vercel.app/api/health` → `{"ok":true,...}`

### Caminho 2 — Pela CLI (mais rápido para atualizações)

```bash
# Uma vez na sua máquina:
npm i -g vercel

# Dentro da pasta vercel-deploy:
cd vercel-deploy
vercel login                # abre o navegador para autenticar
vercel                      # primeiro deploy (preview)
vercel --prod               # deploy para produção
```

A partir daí, `vercel --prod` republica em segundos.

---

## 🌐 Conectando seu domínio

1. No painel Vercel → **Settings → Domains**
2. Digite `stvbr.tv` (ou seu domínio)
3. Vercel mostra os registros DNS que você precisa criar:
   - **Apex** (`stvbr.tv`):  registro `A` apontando para `76.76.21.21`
   - **www** (`www.stvbr.tv`): `CNAME` apontando para `cname.vercel-dns.com`
4. Vá no painel do seu registrador (Registro.br, GoDaddy, Namecheap) e crie
   esses registros
5. Aguarde a propagação (5-30 min)
6. Vercel emite SSL automaticamente — pronto

> 💡 Comprou domínio na Vercel? Aí o SSL é instantâneo e nem precisa configurar
> DNS.

---

## 💾 Persistência: Vercel KV (recomendado para produção)

O backend roda em **funções serverless** — cada chamada pode rodar numa máquina
diferente. Sem um banco compartilhado, os pareamentos só funcionam enquanto a
mesma instância serverless estiver "quente".

**Pra teste e baixo tráfego (até ~50 pareamentos/dia), funciona sem KV.**
Pra produção séria, ative o Vercel KV:

1. No projeto Vercel → **Storage → Create Database → KV**
2. Escolha um nome (ex: `stvbr-kv`), região (São Paulo se disponível) e clique **Create**
3. Conecte ao projeto — Vercel adiciona automaticamente as env vars
   `KV_REST_API_URL` e `KV_REST_API_TOKEN`
4. **Redeploy** (Settings → Deployments → ⋯ → Redeploy)

O `lib/storage.js` detecta as env vars automaticamente e começa a usar Redis.
Zero código alterado.

**Free tier do Vercel KV:** 30k comandos/mês — suficiente pra ~5.000
ativações de dispositivo por mês.

---

## ⚙️ Configurar o app Android para apontar pra Vercel

Quando seu site estiver no ar, edite o app TV para apontar pra ele:

**Arquivo:** `capacitor-app/src/screens/LoginScreen.tsx`

```ts
const ACTIVATION_URL = 'https://stvbr.tv/ativar';     // seu domínio
const API_BASE = 'https://stvbr.tv/api';               // mesmo
```

Recompile o APK:
```bash
cd capacitor-app
npm run android
# Build APK pelo Android Studio
```

Pronto. Ciclo completo:

```
TV mostra QR + código S1234567
   ↓
Usuário escaneia QR com celular
   ↓
Abre https://stvbr.tv/ativar?codigo=S1234567
   ↓
Preenche dados Xtream/M3U
   ↓
POST https://stvbr.tv/api/devices/S1234567
   ↓
TV faz polling GET cada 3s
   ↓
Recebe a lista e entra automaticamente
```

---

## 🔐 Restringir CORS em produção

Por padrão a API aceita requisições de qualquer origem (`*`). Em produção,
restrinja para evitar abusos.

Edite `api/devices/[code].js` e `api/health.js`:

```js
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://stvbr.tv',   // ← seu domínio
  // ...
};
```

E em `vercel.json`, substitua `*` em `Access-Control-Allow-Origin` pela URL real.

**Importante:** o app Capacitor passa por `CapacitorHttp` nativo (não pelo
WebView), então CORS não afeta ele. Só precisa liberar o domínio onde o
**portal** roda.

---

## 💰 Custo no Vercel

| Recurso | Free tier | Suficiente para |
|---|---|---|
| Bandwidth | 100 GB/mês | ~200k pageviews |
| Function invocations | 100k/mês | ~100k ativações |
| Function duration | 100h/mês | meses de uso |
| Vercel KV (opcional) | 30k commands/mês | ~5k ativações |
| Custom domain | grátis | qualquer |
| SSL | grátis | qualquer |

**Total para começar: R$ 0/mês** + custo do domínio (R$ 40/ano).

Se ultrapassar os limites, o plano Pro custa **U$ 20/mês** e dá 1TB de
bandwidth + 1M de invocations.

---

## 🧪 Testar a API local antes de fazer deploy

```bash
cd vercel-deploy
npm install
npm i -g vercel
vercel dev               # roda local em http://localhost:3000
```

Em outro terminal:
```bash
# Health
curl http://localhost:3000/api/health

# Simular portal cadastrando
curl -X POST http://localhost:3000/api/devices/S1234567 \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","kind":"xtream","credentials":{"host":"http://exemplo.com:8080","username":"u","password":"p"}}'

# Simular TV consultando
curl http://localhost:3000/api/devices/S1234567
# → {"authed":true,"source":{...}}
```

---

## 🐛 Troubleshooting

### "Function timed out"
- Vercel free tem timeout de 10s — a API atual é instantânea, então não deveria
- Se acontecer, abra **Settings → Functions → Max Duration**

### Portal abre mas o QR não funciona
- O QR vem da api `api.qrserver.com` (externa) — precisa internet no celular
- Para gerar QR localmente sem dependência externa, troque por um lib JS de
  QR code dentro do `portal.jsx`

### "Cannot find module '@vercel/kv'"
- Rode `vercel --prod` de novo: força reinstalar as deps
- Ou rode `vercel dev` localmente primeiro para validar

### Cadastrei a lista no portal, mas a TV não detecta
- Confira o `API_BASE` no app TV — deve apontar para seu domínio Vercel
- O endpoint é one-shot: depois que a TV consulta, o pareamento some
- Se quiser testar várias vezes: edite `lib/storage.js` linha 60,
  troque `consume: true` por `consume: false`

### O domínio custom não conecta
- Tem que aguardar a propagação DNS (até 24h, mas geralmente <1h)
- Cheque com `dig stvbr.tv` — se aparecer o IP da Vercel (76.76.21.21),
  está pronto
- Vercel verifica e emite SSL automaticamente

---

## 📚 Próximos passos

- [ ] Subir o projeto pra Vercel
- [ ] Conectar domínio custom
- [ ] Criar Vercel KV (se for usar em produção)
- [ ] Restringir CORS pro seu domínio
- [ ] Atualizar `LoginScreen.tsx` no app TV com a URL final
- [ ] Recompilar e instalar APK em uma TV de teste
- [ ] Testar o fluxo completo: TV → QR → portal → TV entra

**Boa sorte! 🚀**
