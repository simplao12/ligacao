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
let memStore = null;
const hasDb = !!dbUrl;

// Lazy load do pool - cria apenas quando necessário
function getPool() {
  if (!hasDb) return null;
  if (pool) return pool;

  try {
    // Para Supabase, ignorar verificação de certificado SSL
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    pool = new Pool({
      connectionString: dbUrl,
      ssl: true,
    });
    return pool;
  } catch (error) {
    console.error('Erro ao criar pool:', error.message);
    return null;
  }
}

function getMem() {
  if (!memStore) memStore = new Map();
  return memStore;
}

// ─────────────────────────────────────────────────────────────
// Devices
// ─────────────────────────────────────────────────────────────

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
    const existing = await getPool().query(
      'SELECT code FROM devices WHERE device_id = $1 AND deleted_at IS NULL',
      [deviceId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].code;
    }

    // Gera novo código
    const code = generateCode();

    await getPool().query(
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
    const result = await getPool().query(
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
    const result = await getPool().query(
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
    const device = await getPool().query(
      'SELECT id FROM devices WHERE code = $1 AND deleted_at IS NULL',
      [code]
    );

    if (device.rows.length === 0) {
      const error = new Error('Device not found');
      error.status = 404;
      throw error;
    }

    // Remove playlist anterior
    await getPool().query('DELETE FROM playlists WHERE device_code = $1', [code]);

    // Insere nova playlist
    const { kind, name, credentials } = playlistData;
    await getPool().query(
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
    await getPool().query(
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
    const result = await getPool().query(
      'SELECT * FROM playlists WHERE device_code = $1 LIMIT 1',
      [code]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[getPlaylist]', error);
    throw error;
  }
}

export async function getPlaylists(code) {
  if (!hasDb) {
    const device = getMem().get(code);
    return device?.playlist ? [device.playlist] : [];
  }

  try {
    const result = await getPool().query(
      'SELECT id, kind, name, host, username, password, url, epg_url, created_at FROM playlists WHERE device_code = $1 ORDER BY created_at DESC',
      [code]
    );
    return result.rows;
  } catch (error) {
    console.error('[getPlaylists]', error);
    throw error;
  }
}

export async function updatePlaylist(code, playlistId, playlistData) {
  if (!hasDb) {
    const device = getMem().get(code);
    if (!device) {
      const error = new Error('Device not found');
      error.status = 404;
      throw error;
    }
    if (device.playlist) {
      device.playlist.name = playlistData.name;
      Object.assign(device.playlist.credentials, playlistData.credentials);
    }
    return true;
  }

  try {
    const device = await getPool().query(
      'SELECT id FROM devices WHERE code = $1 AND deleted_at IS NULL',
      [code]
    );

    if (device.rows.length === 0) {
      const error = new Error('Device not found');
      error.status = 404;
      throw error;
    }

    const { kind, name, credentials } = playlistData;
    await getPool().query(
      'UPDATE playlists SET kind = $1, name = $2, host = $3, username = $4, password = $5, url = $6, epg_url = $7, updated_at = NOW() WHERE id = $8 AND device_code = $9',
      [
        kind,
        name,
        credentials?.host || null,
        credentials?.username || null,
        credentials?.password || null,
        credentials?.url || null,
        credentials?.epgUrl || null,
        playlistId,
        code,
      ]
    );

    return true;
  } catch (error) {
    console.error('[updatePlaylist]', error);
    throw error;
  }
}

export async function deletePlaylistById(code, playlistId) {
  if (!hasDb) {
    const device = getMem().get(code);
    if (device) {
      delete device.playlist;
      device.activated = false;
    }
    return true;
  }

  try {
    const result = await getPool().query(
      'DELETE FROM playlists WHERE id = $1 AND device_code = $2 RETURNING id',
      [playlistId, code]
    );

    if (result.rows.length > 0) {
      const remaining = await getPool().query(
        'SELECT COUNT(*) as count FROM playlists WHERE device_code = $1',
        [code]
      );
      if (remaining.rows[0].count === 0) {
        await getPool().query('UPDATE devices SET activated = false WHERE code = $1', [code]);
      }
    }

    return true;
  } catch (error) {
    console.error('[deletePlaylistById]', error);
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
    await getPool().query('DELETE FROM playlists WHERE device_code = $1', [code]);
    await getPool().query('UPDATE devices SET activated = false WHERE code = $1', [code]);
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
