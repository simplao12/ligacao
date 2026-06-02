/**
 * Database layer — PostgreSQL (Vercel/Supabase) + fallback em-memória
 *
 * Em produção: usa PostgreSQL (via DATABASE_URL ou POSTGRES_URL)
 * Em dev: usa Map em memória se nenhuma conexão for disponível
 */

import pkg from 'pg';
const { Pool } = pkg;

// Detectar ambiente
const dbUrl = process.env.POSTGRES_URL_NON_POOLING ||
              process.env.POSTGRES_URL ||
              process.env.POSTGRES_PRISMA_URL ||
              process.env.DATABASE_URL;

let pool = null;
const hasDb = !!dbUrl;

if (hasDb) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

function getMem() {
  if (!memStore) memStore = new Map();
  return memStore;
}

// ─────────────────────────────────────────────────────────────
// Devices
// ─────────────────────────────────────────────────────────────

let memStore = null;

function getMem() {
  if (!memStore) memStore = new Map();
  return memStore;
}

export async function registerDevice(deviceId) {
  if (!hasDb) {
    const mem = getMem();
    let device = Array.from(mem.values()).find(d => d.device_id === deviceId);
    if (device) return device.code;

    const code = generateCode();
    mem.set(code, {
      code,
      device_id: deviceId,
      activated: false,
      created_at: new Date(),
      last_seen: new Date(),
    });
    return code;
  }

  try {
    // Verifica se device_id já existe
    const existing = await pool.query(
      'SELECT code FROM devices WHERE device_id = $1 AND deleted_at IS NULL',
      [deviceId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].code;
    }

    // Gera novo código
    const code = generateCode();

    await pool.query(
      'INSERT INTO devices (code, device_id, activated, created_at, last_seen) VALUES ($1, $2, false, NOW(), NOW())',
      [code, deviceId]
    );

    return code;
  } catch (error) {
    console.error('[registerDevice]', error);
    throw error;
  }
}

export async function getDevice(code) {
  if (!hasDb) {
    const device = getMem().get(code);
    return device || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM devices WHERE code = $1 AND deleted_at IS NULL',
      [code]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[getDevice]', error);
    throw error;
  }
}

export async function pingDevice(code) {
  if (!hasDb) {
    const device = getMem().get(code);
    if (device) {
      device.last_seen = new Date();
    }
    return !!device;
  }

  try {
    const result = await pool.query(
      'UPDATE devices SET last_seen = NOW() WHERE code = $1 AND deleted_at IS NULL RETURNING id',
      [code]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[pingDevice]', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Playlists
// ─────────────────────────────────────────────────────────────

export async function setPlaylist(code, playlistData) {
  if (!hasDb) {
    const mem = getMem();
    const device = Array.from(mem.values()).find(d => d.code === code);
    if (!device) {
      const error = new Error('Device not found');
      error.status = 404;
      throw error;
    }
    device.playlist = playlistData;
    device.activated = true;
    device.last_seen = new Date();
    return true;
  }

  try {
    // Verifica se device existe
    const device = await pool.query(
      'SELECT id FROM devices WHERE code = $1 AND deleted_at IS NULL',
      [code]
    );

    if (device.rows.length === 0) {
      const error = new Error('Device not found');
      error.status = 404;
      throw error;
    }

    // Remove playlist anterior
    await pool.query('DELETE FROM playlists WHERE device_code = $1', [code]);

    // Insere nova playlist
    const { kind, name, credentials } = playlistData;
    await pool.query(
      'INSERT INTO playlists (device_code, kind, name, host, username, password, url, epg_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        code,
        kind,
        name,
        credentials?.host || null,
        credentials?.username || null,
        credentials?.password || null,
        credentials?.url || null,
        credentials?.epgUrl || null,
      ]
    );

    // Marca device como ativado
    await pool.query(
      'UPDATE devices SET activated = true, last_seen = NOW() WHERE code = $1',
      [code]
    );

    return true;
  } catch (error) {
    console.error('[setPlaylist]', error);
    throw error;
  }
}

export async function getPlaylist(code) {
  if (!hasDb) {
    const device = getMem().get(code);
    return device?.playlist || null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM playlists WHERE device_code = $1 LIMIT 1',
      [code]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[getPlaylist]', error);
    throw error;
  }
}

export async function deletePlaylist(code) {
  if (!hasDb) {
    const device = getMem().get(code);
    if (device) {
      delete device.playlist;
      device.activated = false;
    }
    return true;
  }

  try {
    await pool.query('DELETE FROM playlists WHERE device_code = $1', [code]);
    await pool.query('UPDATE devices SET activated = false WHERE code = $1', [code]);
    return true;
  } catch (error) {
    console.error('[deletePlaylist]', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

export function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'S';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function isValidCode(code) {
  return typeof code === 'string' && /^S[A-Z0-9]{7}$/.test(code);
}

export function validatePlaylistData(data) {
  if (!data || typeof data !== 'object') return 'invalid_body';
  if (typeof data.name !== 'string' || !data.name.trim()) return 'invalid_name';
  if (!['xtream', 'm3u'].includes(data.kind)) return 'invalid_kind';

  if (data.kind === 'xtream') {
    const c = data.credentials || {};
    if (!c.host || !/^https?:\/\//i.test(c.host)) return 'invalid_host';
    if (typeof c.username !== 'string' || !c.username) return 'invalid_username';
    if (typeof c.password !== 'string' || !c.password) return 'invalid_password';
  } else if (data.kind === 'm3u') {
    const c = data.credentials || {};
    if (!c.url || !/^https?:\/\//i.test(c.url)) return 'invalid_url';
  }
  return null;
}
