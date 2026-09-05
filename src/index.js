import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOKEN, BEST_PACKS_CHANNEL_ID, BEST_PACKS_MIN_OVR, validarConfiguracao } from './config.js';
import { inicializarBanco, carregarDados, salvarDados, criarBackup } from './database/db.js';
import { deployCommands } from './deploy-commands.js';
import { handleMercadoInteraction } from './panels/mercadoPanel.js';
import { handleObterInteraction } from './panels/obterPanel.js';
import { handleVerCartaInteraction } from './panels/verCartaPanel.js';
import { handleSetarInteraction } from './panels/setarPanel.js';
import { handleJogarInteraction } from './panels/jogarPanel.js';
import { handleDeletarInteraction } from './panels/deletarPanel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ]
});

function isUnknownInteractionError(error) {
  return error?.code === 10062 || error?.message?.includes('Unknown interaction');
}

function installInteractionSafety(interaction) {
  if (!interaction || typeof interaction !== 'object') return;

  const originalReply = interaction.reply?.bind(interaction);
  const originalFollowUp = interaction.followUp?.bind(interaction);
  const originalEditReply = interaction.editReply?.bind(interaction);
  const originalUpdate = interaction.update?.bind(interaction);

  interaction.reply = async function(payload) {
    try {
      if (interaction.replied) {
        return await interaction.followUp(payload);
      }
      if (interaction.deferred) {
        return await interaction.editReply(payload);
      }
      await interaction.deferReply({ ephemeral: payload?.ephemeral ?? false });
      return await interaction.editReply(payload);
    } catch (error) {
      if (isUnknownInteractionError(error)) return null;
      throw error;
    }
  };

  interaction.followUp = async function(payload) {
    try {
      return await originalFollowUp(payload);
    } catch (error) {
      if (isUnknownInteractionError(error)) return null;
      throw error;
    }
  };

  interaction.editReply = async function(payload) {
    try {
      return await originalEditReply(payload);
    } catch (error) {
      if (isUnknownInteractionError(error)) return null;
      throw error;
    }
  };

  interaction.update = async function(payload) {
    try {
      return await originalUpdate(payload);
    } catch (error) {
      if (isUnknownInteractionError(error)) return null;
      throw error;
    }
  };
}

client.commands = new Collection();

// Carrega todos os Slash Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[AVISO] O comando em ${filePath} está sem a propriedade "data" ou "execute".`);
  }
}

client.once('ready', async () => {
  console.log(`🤖 Inicializando VSO Guru Bot em JavaScript...`);
  // resetMembros: false — preserva os dados existentes entre reinicializações
  await inicializarBanco({ resetMembros: false });
  criarBackup();

  const dados = carregarDados(true);
  salvarDados(dados);

  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`📊 ${dados.jogadores_disponiveis.length} jogadores no banco`);
  console.log(`👥 ${Object.keys(dados.membros).length} membros registrados`);

  if (BEST_PACKS_CHANNEL_ID) {
    console.log(`🏆 Best Packs ativado → canal ID ${BEST_PACKS_CHANNEL_ID} (OVR ${BEST_PACKS_MIN_OVR}+)`);
  }

  // Tenta registrar os comandos automaticamente com o ID do bot
  try {
    // Valida IDs de canais e cargos configurados no .env
    await validarConfiguracao(client);
    await deployCommands(client.user.id, TOKEN);
  } catch (err) {
    console.error(`⚠️ Erro ao registrar comandos na inicialização: ${err.message}`);
  }
});

// Manipulador global de interações
client.on('interactionCreate', async (interaction) => {
  installInteractionSafety(interaction);

  try {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Comando não encontrado: ${interaction.commandName}`);
        return;
      }
      await command.execute(interaction);
      return;
    }

    // 2. Autocomplete
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        await command.autocomplete(interaction);
      }
      return;
    }

    // 3. Componentes V2 - Botões
    if (interaction.isButton()) {
      const { customId } = interaction;
      if (customId.startsWith('mercado_')) {
        await handleMercadoInteraction(interaction);
      } else if (customId.startsWith('obter_')) {
        await handleObterInteraction(interaction);
      } else if (customId.startsWith('deletar_')) {
        await handleDeletarInteraction(interaction);
      }
      return;
    }

    // 4. Componentes V2 - StringSelectMenu (Navegação de Cartas)
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      if (customId.startsWith('vercarta_select_')) {
        const parts = customId.split('_');
        const alvoId = parts[2];
        const dados = carregarDados();
        const membroDados = dados.membros ? dados.membros[alvoId] : null;

        if (!membroDados) {
          return interaction.reply({ content: 'Elenco não encontrado.', ephemeral: true });
        }

        const targetUser = await interaction.client.users.fetch(alvoId).catch(() => null);
        const targetMember = targetUser ? await interaction.guild?.members.fetch(alvoId).catch(() => null) : null;
        const targetName = targetMember?.displayName || targetUser?.username || 'Membro';
        const targetAvatar = targetUser ? targetUser.displayAvatarURL() : '';

        const todos = (membroDados.elenco || []).concat(membroDados.titulares || []);
        await handleVerCartaInteraction(interaction, todos, targetName, targetAvatar);
      }
      return;
    }

    // 5. Componentes V2 - UserSelectMenu (Atribuição ADM & Desafio Partida)
    if (interaction.isUserSelectMenu()) {
      const { customId } = interaction;
      if (customId.startsWith('setar_user_select_')) {
        await handleSetarInteraction(interaction);
      } else if (customId.startsWith('jogar_user_select_')) {
        await handleJogarInteraction(interaction);
      }
      return;
    }
  } catch (err) {
    console.error(`⚠️ Erro ao processar interação: ${err.stack || err.message}`);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Ocorreu um erro ao executar essa ação.', ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: 'Ocorreu um erro ao executar essa ação.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(TOKEN).catch((err) => {
  console.error(`❌ Erro de login no Discord: ${err.message}`);
});
