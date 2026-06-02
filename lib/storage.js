// ─────────────────────────────────────────────────────────────
// Storage layer — escolhe automaticamente entre Vercel KV
// (produção) e Map em memória (modo dev / sem KV configurado).
//
// Se as env vars KV_REST_API_URL e KV_REST_API_TOKEN estiverem
// presentes (Vercel KV adiciona automaticamente quando você
// conecta um KV ao projeto), usamos Redis distribuído.
// Senão, in-memory que sobrevive enquanto a instância serverless
// estiver "quente" (~minutos).
//
// Trocar entre os dois é zero configuração — basta criar o KV
// no painel do Vercel e fazer redeploy.
// ─────────────────────────────────────────────────────────────

const TTL_SECONDS = 24 * 60 * 60; // 24h

let kvClient = null;
let memStore = null;

async function getKv() {
  if (kvClient !== null) return kvClient;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const mod = await import('@vercel/kv');
      kvClient = mod.kv;
      return kvClient;
    } catch (e) {
      console.warn('[storage] @vercel/kv indisponível, caindo para memória:', e.message);
    }
  }
  kvClient = false;
  return null;
}

function getMem() {
  if (!memStore) memStore = new Map();
  // GC superficial
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (now - v.createdAt > TTL_SECONDS * 1000) memStore.delete(k);
  }
  return memStore;
}

export async function setPairing(code, source) {
  const entry = { source, createdAt: Date.now() };
  const kv = await getKv();
  if (kv) {
    await kv.set(`pair:${code}`, entry, { ex: TTL_SECONDS });
  } else {
    getMem().set(code, entry);
  }
}

export async function getPairing(code, { consume = true } = {}) {
  const kv = await getKv();
  if (kv) {
    const entry = await kv.get(`pair:${code}`);
    if (entry && consume) await kv.del(`pair:${code}`);
    return entry || null;
  }
  const mem = getMem();
  const entry = mem.get(code) || null;
  if (entry && consume) mem.delete(code);
  return entry;
}

export async function deletePairing(code) {
  const kv = await getKv();
  if (kv) {
    const existed = await kv.del(`pair:${code}`);
    return existed > 0;
  }
  return getMem().delete(code);
}

export function isValidCode(code) {
  return typeof code === 'string' && /^S\d{7}$/.test(code);
}

export function validateSource(body) {
  if (!body || typeof body !== 'object') return 'invalid_body';
  if (typeof body.name !== 'string' || body.name.length > 100) return 'invalid_name';
  if (!['xtream', 'm3u', 'file'].includes(body.kind)) return 'invalid_kind';

  if (body.kind === 'xtream') {
    const c = body.credentials || {};
    if (!c.host || !/^https?:\/\//i.test(c.host)) return 'invalid_host';
    if (typeof c.username !== 'string' || !c.username) return 'invalid_username';
    if (typeof c.password !== 'string' || !c.password) return 'invalid_password';
  } else if (body.kind === 'm3u') {
    const c = body.credentials || {};
    if (!c.url || !/^https?:\/\//i.test(c.url)) return 'invalid_url';
  } else if (body.kind === 'file') {
    if (typeof body.content !== 'string' || body.content.length > 5 * 1024 * 1024) return 'invalid_content';
  }
  return null;
}
