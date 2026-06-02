/**
 * Device Status Endpoint
 * GET /api/devices/{code}/status
 *
 * Returns current device data and active playlist
 * Used by app to validate if credentials changed
 */

import {
  getDevice,
  getPlaylist,
  isValidCode,
} from '../../../lib/db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const device = await getDevice(code);

    if (!device) {
      return res.status(404).json({
        error: 'device_not_found',
        authed: false,
      });
    }

    if (!device.activated) {
      return res.status(200).json({
        authed: false,
        code,
      });
    }

    const playlist = await getPlaylist(code);

    if (!playlist) {
      return res.status(200).json({
        authed: false,
        code,
      });
    }

    // Build response with current credentials
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
      code,
      source,
      lastUpdated: playlist.updated_at || playlist.created_at,
    });
  } catch (error) {
    console.error('[api/devices/status]', error);
    return res.status(500).json({
      error: 'server_error',
      message: error.message,
    });
  }
}
