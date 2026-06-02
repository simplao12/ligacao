// ─────────────────────────────────────────────────────────────
// Pairing endpoint — Vercel Serverless Function
//
//  POST   /api/devices/Sxxxxxxx   →  portal cadastra a lista
//  GET    /api/devices/Sxxxxxxx   →  TV consulta o pareamento
//  DELETE /api/devices/Sxxxxxxx   →  cancela o pareamento
//
// Vercel mapeia o nome da pasta [code] como parâmetro dinâmico,
// disponível em req.query.code.
// ─────────────────────────────────────────────────────────────

import {
  setPairing,
  getPairing,
  deletePairing,
  isValidCode,
  validateSource,
} from '../../lib/storage.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const code = String(req.query.code || '').toUpperCase();
  if (!isValidCode(code)) {
    return res.status(400).json({ error: 'invalid_code', message: 'Código deve ser S + 7 dígitos' });
  }

  try {
    // ─── POST: portal cadastra ────────────────────────────
    if (req.method === 'POST') {
      const body = req.body;
      const err = validateSource(body);
      if (err) return res.status(400).json({ error: err });

      await setPairing(code, body);
      return res.status(200).json({
        ok: true,
        code,
        expiresIn: 24 * 60 * 60,
      });
    }

    // ─── GET: TV consulta ─────────────────────────────────
    if (req.method === 'GET') {
      const entry = await getPairing(code, { consume: true });
      if (!entry) {
        return res.status(200).json({ authed: false });
      }
      return res.status(200).json({
        authed: true,
        source: entry.source,
        pairedAt: entry.createdAt,
      });
    }

    // ─── DELETE: cancela pareamento ───────────────────────
    if (req.method === 'DELETE') {
      const existed = await deletePairing(code);
      return res.status(200).json({ ok: true, existed });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('[api/devices]', e);
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
