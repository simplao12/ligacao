#!/usr/bin/env node
/**
 * Setup script para PostgreSQL (Vercel/Supabase)
 * Cria as tabelas devices e playlists
 *
 * Uso: npm run setup-db
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadDotEnvFile() {
  const cwd = process.cwd();
  const fileNames = ['.env.local', '.env'];
  for (const fileName of fileNames) {
    const filePath = path.join(cwd, fileName);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = parseEnvValue(trimmed.substring(eqIndex + 1));
      if (key && value && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    break;
  }
}

loadDotEnvFile();

// Tentar múltiplas variáveis de ambiente (preferir NON_POOLING para setup)
const dbUrl = process.env.POSTGRES_URL_NON_POOLING ||
              process.env.POSTGRES_URL ||
              process.env.POSTGRES_PRISMA_URL ||
              process.env.DATABASE_URL;

async function setupDatabase() {
  console.log('🚀 Configurando banco de dados...\n');

  if (!dbUrl) {
    console.error('❌ Erro: DATABASE_URL não está configurada.');
    console.error('\n👉 Opção 1: Puxar do Vercel');
    console.error('   npx vercel env pull .env.local\n');
    console.error('👉 Opção 2: Criar .env.local manualmente');
    console.error('   DATABASE_URL=postgresql://user:pass@host/db\n');
    process.exit(1);
  }

  const hostMatch = dbUrl.match(/@([^/]+)/);
  const host = hostMatch ? hostMatch[1] : 'database';
  console.log(`📡 Conectando ao banco: ${host}\n`);

  let pg;
  try {
    pg = await import('pg');
  } catch (e) {
    console.error('❌ Erro: módulo "pg" não está instalado');
    console.error('   Execute: npm install pg');
    process.exit(1);
  }

  // Configuração para Supabase/PostgreSQL
  const clientConfig = {
    connectionString: dbUrl,
    // Aceitar qualquer certificado SSL (necessário para Supabase)
    ssl: {
      rejectUnauthorized: false,
    },
    // Timeout para conexão lenta
    connectionTimeoutMillis: 30000,
  };

  const client = new pg.Client(clientConfig);

  try {
    console.log('⏳ Conectando...');
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Criar tabela devices
    console.log('📋 Criando tabela devices...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        code VARCHAR(8) UNIQUE NOT NULL,
        device_id VARCHAR(255) NOT NULL UNIQUE,
        activated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `);
    console.log('✅ Tabela devices criada');

    // Criar índices para devices
    console.log('📝 Criando índices em devices...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_devices_code ON devices(code);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_devices_activated ON devices(activated);');
    console.log('✅ Índices criados');

    // Criar tabela playlists
    console.log('📋 Criando tabela playlists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        device_code VARCHAR(8) NOT NULL,
        kind VARCHAR(10) DEFAULT 'xtream',
        name VARCHAR(255),
        host VARCHAR(255),
        username VARCHAR(255),
        password VARCHAR(255),
        url VARCHAR(1024),
        epg_url VARCHAR(1024),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_code) REFERENCES devices(code) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabela playlists criada');

    // Criar índices para playlists
    console.log('📝 Criando índices em playlists...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playlists_code ON playlists(device_code);');
    console.log('✅ Índices criados');

    console.log('\n✨ Banco de dados configurado com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Fazer deploy: git push');
    console.log('2. Testar: curl https://seu-projeto.vercel.app/api/health');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao configurar banco de dados:');
    console.error(error.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

setupDatabase();
