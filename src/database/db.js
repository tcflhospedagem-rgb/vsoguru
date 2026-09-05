import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import { DATA_FILE, BACKUP_DIR, DB_FILE, DATABASE_URL } from '../config.js';

let _dataCache = null;
let _cacheTimestamp = null;
const CACHE_DURATION_MS = 30000;

let sqliteDb = null;
let pgPool = null;

function getSqliteDb() {
  if (!sqliteDb) {
    sqliteDb = new sqlite3.Database(DB_FILE);
    sqliteDb.run('PRAGMA journal_mode = WAL');
    sqliteDb.run('PRAGMA busy_timeout = 5000');
  }
  return sqliteDb;
}

function getPgPool() {
  if (!pgPool && DATABASE_URL) {
    const { Pool } = pg;
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pgPool;
}

export function validarJogador(jogador) {
  if (!jogador || typeof jogador !== 'object') jogador = {};
  const camposObrigatorios = {
    nome: 'Sem Nome',
    posicao: 'MEI',
    overall: 50,
    clube: 'Sem Clube',
    preco: 1000,
    imagem: null
  };
  for (const [campo, padrao] of Object.entries(camposObrigatorios)) {
    if (jogador[campo] === undefined || jogador[campo] === null) {
      jogador[campo] = padrao;
    }
  }
  try {
    jogador.overall = Math.max(1, Math.min(99, parseInt(jogador.overall) || 50));
  } catch {
    jogador.overall = 50;
  }
  try {
    jogador.preco = Math.max(1000, parseInt(jogador.preco) || 1000);
  } catch {
    jogador.preco = 1000;
  }
  return jogador;
}

export function removerDuplicatasElenco(elenco = []) {
  const vistos = new Set();
  const elencoLimpo = [];
  for (const jogador of elenco) {
    const chave = `${jogador.nome?.toLowerCase()}_${jogador.overall}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      elencoLimpo.push(validarJogador(jogador));
    }
  }
  return elencoLimpo;
}

export function validarECorrigirDados(dados) {
  if (!dados || typeof dados !== 'object') {
    dados = { jogadores_disponiveis: [], membros: {} };
  }
  if (!Array.isArray(dados.jogadores_disponiveis)) {
    dados.jogadores_disponiveis = [];
  }
  if (!dados.membros || typeof dados.membros !== 'object') {
    dados.membros = {};
  }

  dados.jogadores_disponiveis = dados.jogadores_disponiveis.map(validarJogador);

  for (const [userId, membro] of Object.entries(dados.membros)) {
    if (membro.saldo === undefined) membro.saldo = 1000;
    if (membro.time_nome === undefined) membro.time_nome = null;
    if (membro.time_sigla === undefined) membro.time_sigla = null;
    if (!Array.isArray(membro.elenco)) membro.elenco = [];
    if (!Array.isArray(membro.titulares)) membro.titulares = [];
    if (membro.cooldown_obter === undefined) membro.cooldown_obter = null;
    if (membro.cooldown_daily === undefined) membro.cooldown_daily = null;

    membro.elenco = removerDuplicatasElenco(membro.elenco);
    membro.titulares = removerDuplicatasElenco(membro.titulares);
  }

  return dados;
}

export function criarBackup() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `data_backup_${timestamp}.json`);
    fs.copyFileSync(DATA_FILE, backupFile);

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('data_backup_'))
      .sort();
    if (files.length > 10) {
      for (const oldFile of files.slice(0, files.length - 10)) {
        fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
      }
    }
    console.log(`✅ Backup criado: ${backupFile}`);
  } catch (err) {
    console.error(`⚠️ Erro ao criar backup: ${err.message}`);
  }
}

export async function inicializarBanco({ resetMembros = true } = {}) {
  try {
    let dados = null;
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bot_config (
          chave VARCHAR(50) PRIMARY KEY,
          valor TEXT NOT NULL
        );
      `);
      const res = await pool.query(`SELECT valor FROM bot_config WHERE chave = 'vso_guru_data'`);
      if (res.rows.length > 0) {
        try { dados = JSON.parse(res.rows[0].valor); } catch {}
      }
    } else {
      const db = getSqliteDb();
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS bot_config (
            chave TEXT PRIMARY KEY,
            valor TEXT NOT NULL
          )
        `, (err) => err ? reject(err) : resolve());
      });

      const row = await new Promise((resolve) => {
        db.get(`SELECT valor FROM bot_config WHERE chave = 'vso_guru_data'`, (err, row) => resolve(row));
      });

      if (row) {
        try { dados = JSON.parse(row.valor); } catch {}
      }
    }

    if (!dados && fs.existsSync(DATA_FILE)) {
      try { dados = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch {}
    }
    if (!dados) dados = { jogadores_disponiveis: [], membros: {} };

    if (resetMembros) {
      dados.membros = {};
      console.log('🧹 Todos os membros existentes foram limpos!');
    }

    dados = validarECorrigirDados(dados);

    _dataCache = structuredClone(dados);
    _cacheTimestamp = Date.now();
    salvarDados(dados);
    console.log('✅ Banco de dados bruto inicializado!');
  } catch (err) {
    console.error(`⚠️ Erro ao inicializar banco: ${err.message}`);
  }
}

export function carregarDados(forcarReload = false) {
  const agora = Date.now();
  if (!forcarReload && _dataCache && _cacheTimestamp) {
    if (agora - _cacheTimestamp < CACHE_DURATION_MS) {
      return structuredClone(_dataCache);
    }
  }

  let dados = null;

  // Quando DATABASE_URL está configurado (Railway, Render, etc.),
  // NÃO lemos do data.json pois o filesystem não é persistente.
  // O cache em memória (_dataCache) é a fonte de verdade — populado
  // pelo inicializarBanco() no boot via PostgreSQL.
  if (DATABASE_URL) {
    if (_dataCache) {
      // Cache expirou mas temos PG: retorna o cache atual até próximo sync
      dados = structuredClone(_dataCache);
    }
  } else {
    // Sem DATABASE_URL: lê do data.json primeiro, depois SQLite
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        if (raw.trim()) dados = JSON.parse(raw);
      } catch (e) {
        console.warn(`⚠️ Falha ao ler data.json: ${e.message}`);
      }
    }

    if (!dados) {
      try {
        const db = getSqliteDb();
        const row = db.prepare
          ? db.prepare(`SELECT valor FROM bot_config WHERE chave = 'vso_guru_data'`).get()
          : null;
        if (row) dados = JSON.parse(row.valor);
      } catch {}
    }
  }

  if (!dados) dados = { jogadores_disponiveis: [], membros: {} };

  dados = validarECorrigirDados(dados);
  _dataCache = structuredClone(dados);
  _cacheTimestamp = agora;
  return dados;
}

export function salvarDados(dados) {
  dados = validarECorrigirDados(dados);
  const dadosJson = JSON.stringify(dados, null, 2);

  // ─── 1. Sempre salva no data.json (compatível com hospedagem) ───
  try {
    fs.writeFileSync(DATA_FILE, dadosJson, 'utf-8');
  } catch (fileErr) {
    console.error(`⚠️ Erro ao salvar data.json: ${fileErr.message}`);
  }

  // ─── 2. Salva também no banco de dados (SQLite ou Postgres) ───
  try {
    if (DATABASE_URL) {
      const pool = getPgPool();
      pool.query(`
        INSERT INTO bot_config (chave, valor)
        VALUES ('vso_guru_data', $1)
        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
      `, [JSON.stringify(dados)]).catch(e => console.error('PG Save Error:', e));
    } else {
      const db = getSqliteDb();
      db.run(
        `INSERT OR REPLACE INTO bot_config (chave, valor) VALUES (?, ?)`,
        ['vso_guru_data', JSON.stringify(dados)],
        (err) => { if (err) console.error('SQLite Save Error:', err.message); }
      );
    }
  } catch (err) {
    console.error(`⚠️ Erro ao salvar no banco SQLite/PG: ${err.message}`);
  }

  _dataCache = structuredClone(dados);
  _cacheTimestamp = Date.now();
}

export function getMembro(dados, userId) {
  if (!dados.membros[userId]) {
    dados.membros[userId] = {
      saldo: 1000,
      time_nome: null,
      time_sigla: null,
      elenco: [],
      titulares: [],
      cooldown_obter: null,
      cooldown_daily: null,
    };
  }
  return dados.membros[userId];
}

export function invalidarCache() {
  _dataCache = null;
  _cacheTimestamp = null;
}
