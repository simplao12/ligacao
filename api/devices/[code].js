/**
 * Device Pairing Endpoint
 *
 * POST   /api/devices/{code}   →  app envia credenciais cadastradas pelo site
 * GET    /api/devices/{code}   →  TV consulta as credenciais
 * DELETE /api/devices/{code}   →  cancela o pareamento
 */

import {
  getDevice,
  getPlaylist,
  setPlaylist,
  deletePlaylist,
  isValidCode,
  validatePlaylistData,
} from '../../lib/db.js';

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
  res.setHeader('Content-Type', 'application/json');

  const code = String(req.query.code || '').toUpperCase();
  if (!isValidCode(code)) {
    return res.status(400).json({
      error: 'invalid_code',
      message: 'Código deve ser S + 7 caracteres alfanuméricos',
    });
  }

  try {
    // ─── POST: site envia credenciais já validadas ────────────────────────────
    if (req.method === 'POST') {
      const body = req.body;
      const err = validatePlaylistData(body);
      if (err) {
        return res.status(400).json({ error: err });
      }

      await setPlaylist(code, body);
      return res.status(200).json({
        ok: true,
        code,
        message: 'Dispositivo ativado com sucesso',
      });
    }

    // ─── GET: TV consulta credenciais ─────────────────────────────
    if (req.method === 'GET') {
      const device = await getDevice(code);

      if (!device) {
        return res.status(200).json({ authed: false });
      }

      if (!device.activated) {
        return res.status(200).json({ authed: false });
      }

      const playlist = await getPlaylist(code);

      if (!playlist) {
        return res.status(200).json({ authed: false });
      }

      // Monta response com as credenciais
      const source = {
        kind: playlist.kind,
        name: playlist.name,
        credentials: {},
      };

      if (playlist.kind === 'xtream') {
        source.credentials = {
          host: playlist.host,
          username: playlist.username,
          password: playlist.password,
        };
      } else if (playlist.kind === 'm3u') {
        source.credentials = {
          url: playlist.url,
          epgUrl: playlist.epg_url,
        };
      }

      return res.status(200).json({
        authed: true,
        source,
        pairedAt: playlist.created_at,
      });
    }

    // ─── DELETE: cancela pareamento ───────────────────────
    if (req.method === 'DELETE') {
      await deletePlaylist(code);
      return res.status(200).json({
        ok: true,
        message: 'Pareamento cancelado',
      });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    console.error('[api/devices]', error);
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
}
