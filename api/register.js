/**
 * Device Registration Endpoint
 * POST /api/register
 *
 * Request:
 *   { "device_id": "a1b2c3d4e5f6g7h8" }
 *
 * Response:
 *   { "success": true, "code": "S7K9P4X2" }
 */

import { registerDevice, isValidCode } from '../lib/db.js';

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
    const { device_id } = req.body || {};

    if (!device_id || typeof device_id !== 'string' || device_id.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_device_id',
        message: 'device_id é obrigatório e deve ser uma string não vazia',
      });
    }

    const code = await registerDevice(device_id);

    if (!isValidCode(code)) {
      throw new Error('Generated code is invalid');
    }

    return res.status(200).json({
      success: true,
      code,
    });
  } catch (error) {
    console.error('[api/register]', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
}
