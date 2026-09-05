import dotenv from 'dotenv';
dotenv.config();

export const TOKEN = process.env.DISCORD_TOKEN;
export const CLIENT_ID = process.env.CLIENT_ID || '';
export const DATABASE_URL = process.env.DATABASE_URL || '';

// Lê IDs dos cargos de administrador do .env (separados por vírgula)
// Apenas os cargos definidos em ADMIN_ROLE_IDS no .env têm acesso ADM
export const ADMIN_ROLE_IDS = process.env.ADMIN_ROLE_IDS
  ? process.env.ADMIN_ROLE_IDS.split(',').map(id => id.trim()).filter(Boolean)
  : [];

export const BEST_PACKS_CHANNEL_ID = (process.env.BEST_PACKS_CHANNEL_ID || '').trim();
export const BEST_PACKS_MIN_OVR = parseInt(process.env.BEST_PACKS_MIN_OVR || '90', 10);

export const DATA_FILE = 'data.json';
export const BACKUP_DIR = 'backups';
export const DB_FILE = 'bot_data.db';

export const POSICAO_NORMALIZE = {
  'GK': 'GOL', 'CB': 'ZAG', 'LB': 'LE', 'RB': 'LD',
  'CDM': 'VOL', 'CM': 'MEI', 'CAM': 'MEI', 'LM': 'MEI', 'RM': 'MEI',
  'LW': 'ATA', 'RW': 'ATA', 'ST': 'ATA', 'CF': 'ATA',
  'GOL': 'GOL', 'ZAG': 'ZAG', 'LD': 'LD', 'LE': 'LE',
  'VOL': 'VOL', 'MEI': 'MEI', 'ATA': 'ATA'
};

export const POSICAO_FULL = {
  'GOL': 'Goleiro',
  'ZAG': 'Zagueiro',
  'LD': 'Lateral Direito',
  'LE': 'Lateral Esquerdo',
  'VOL': 'Volante',
  'MEI': 'Meia',
  'ATA': 'Atacante'
};

export const POSICAO_EMOJI = {
  'GOL': '🧤',
  'ZAG': '🛡️',
  'LD': '🏃‍♂️',
  'LE': '🏃‍♂️',
  'VOL': '⚙️',
  'MEI': '🧠',
  'ATA': '⚡'
};

/**
 * Valida os IDs configurados no .env e verifica permissões do canal.
 */
export async function validarConfiguracao(client) {
  console.log('\n🔍 Verificando configurações do .env...');

  // 1. Valida TOKEN
  if (!TOKEN) {
    console.error('❌ ERRO CRÍTICO: DISCORD_TOKEN não foi configurado no arquivo .env!');
  } else {
    console.log('✅ DISCORD_TOKEN encontrado.');
  }

  // 2. Valida Cargos de ADM
  console.log(`👑 Cargos de ADM configurados: ${ADMIN_ROLE_IDS.length} cargo(s) [${ADMIN_ROLE_IDS.join(', ')}]`);

  // 3. Valida Canal de Best Packs
  if (!BEST_PACKS_CHANNEL_ID) {
    console.warn('⚠️  [AVISO] Best Packs desativado — Nenhum ID foi definido em BEST_PACKS_CHANNEL_ID no .env.');
    return;
  }

  // Checa formato de Snowflake (deve conter apenas números entre 17 e 20 dígitos)
  if (!/^\d{17,20}$/.test(BEST_PACKS_CHANNEL_ID)) {
    console.error(`❌ ERRO DE CONFIGURAÇÃO: BEST_PACKS_CHANNEL_ID="${BEST_PACKS_CHANNEL_ID}" não é um ID de canal válido! (Deve ser apenas números com 17 a 20 dígitos).`);
    return;
  }

  // Tenta buscar o canal no Discord
  if (client) {
    try {
      const canal = await client.channels.fetch(BEST_PACKS_CHANNEL_ID).catch(() => null);
      if (!canal) {
        console.error(`❌ ERRO DE CANAL: O canal de ID ${BEST_PACKS_CHANNEL_ID} não foi encontrado! Verifique se o ID está correto ou se o bot foi adicionado ao servidor.`);
      } else if (!canal.isTextBased()) {
        console.error(`❌ ERRO DE CANAL: O canal ${canal.name} (ID: ${BEST_PACKS_CHANNEL_ID}) não é um canal de texto válido!`);
      } else {
        console.log(`🏆 Best Packs ativo no canal: #${canal.name} (ID: ${BEST_PACKS_CHANNEL_ID}) para cartas ${BEST_PACKS_MIN_OVR}+ OVR.`);
      }
    } catch (err) {
      console.error(`⚠️ Erro ao verificar o canal BEST_PACKS_CHANNEL_ID: ${err.message}`);
    }
  }
}
