/**
 * Device Ping Endpoint
 * POST /api/ping
 *
 * Atualiza o timestamp last_seen do dispositivo
 *
 * Request:
 *   { "code": "S7K9P4X2" }
 *
 * Response:
 *   { "success": true }
 */

import { pingDevice, isValidCode } from '../lib/db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
    });
  }

  try {
    const { code } = req.body || {};

    if (!isValidCode(code)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_code',
        message: 'Código deve ser S + 7 caracteres alfanuméricos',
      });
    }

    const success = await pingDevice(code);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'device_not_found',
        message: 'Código não encontrado',
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error('[api/ping]', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
}
