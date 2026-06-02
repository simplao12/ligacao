/**
 * Playlists Management Endpoint
 *
 * GET    /api/playlists/{code}        → List all playlists for device
 * PUT    /api/playlists/{code}        → Update playlist (requires id in body)
 * DELETE /api/playlists/{code}        → Delete playlist (requires id in body)
 */

import {
  getPlaylists,
  updatePlaylist,
  deletePlaylistById,
  isValidCode,
  validatePlaylistData,
} from '../../lib/db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
    // ─── GET: List all playlists ────────────────────────────────
    if (req.method === 'GET') {
      const playlists = await getPlaylists(code);
      return res.status(200).json({ playlists });
    }

    // ─── PUT: Update playlist ───────────────────────────────────
    if (req.method === 'PUT') {
      const { id, ...playlistData } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'missing_id', message: 'ID da playlist é obrigatório' });
      }

      const err = validatePlaylistData(playlistData);
      if (err) {
        return res.status(400).json({ error: err });
      }

      await updatePlaylist(code, id, playlistData);
      return res.status(200).json({
        ok: true,
        message: 'Playlist atualizada com sucesso',
      });
    }

    // ─── DELETE: Delete specific playlist ─────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'missing_id', message: 'ID da playlist é obrigatório' });
      }

      await deletePlaylistById(code, id);
      return res.status(200).json({
        ok: true,
        message: 'Playlist deletada com sucesso',
      });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    console.error('[api/playlists]', error);
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
}
