#!/usr/bin/env node
/**
 * Setup script para Vercel Postgres
 * Cria as tabelas devices e playlists
 *
 * Uso: npm run setup-db (ou node scripts/setup-db.js)
 */

import { sql } from '@vercel/postgres';

async function setupDatabase() {
  console.log('🚀 Configurando banco de dados...\n');

  try {
    // Criar tabela devices
    console.log('📋 Criando tabela devices...');
    await sql`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        code VARCHAR(8) UNIQUE NOT NULL,
        device_id VARCHAR(255) NOT NULL UNIQUE,
        activated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `;
    console.log('✅ Tabela devices criada');

    // Criar índices para devices
    console.log('📝 Criando índices em devices...');
    await sql`CREATE INDEX IF NOT EXISTS idx_devices_code ON devices(code);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_devices_activated ON devices(activated);`;
    console.log('✅ Índices criados');

    // Criar tabela playlists
    console.log('📋 Criando tabela playlists...');
    await sql`
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
    `;
    console.log('✅ Tabela playlists criada');

    // Criar índices para playlists
    console.log('📝 Criando índices em playlists...');
    await sql`CREATE INDEX IF NOT EXISTS idx_playlists_code ON playlists(device_code);`;
    console.log('✅ Índices criados');

    console.log('\n✨ Banco de dados configurado com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Fazer deploy: git push (Vercel detecta changes automaticamente)');
    console.log('2. Testar: curl https://seu-projeto.vercel.app/api/health');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao configurar banco de dados:');
    console.error(error.message);
    process.exit(1);
  }
}

setupDatabase();
