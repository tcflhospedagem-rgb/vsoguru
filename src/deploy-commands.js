import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOKEN, CLIENT_ID } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function deployCommands(clientId = CLIENT_ID, token = TOKEN) {
  if (!token) {
    console.error('❌ DISCORD_TOKEN não foi configurado no arquivo .env!');
    return;
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`⏳ Registrando ${commands.length} comandos Slash na API do Discord...`);

    if (clientId) {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log('✅ Comandos Slash registrados globalmente com sucesso!');
    } else {
      console.log('⚠️ CLIENT_ID não especificado no .env. Os comandos serão registrados automaticamente quando o bot se conectar e obtiver seu próprio ID.');
    }
  } catch (error) {
    console.error(`⚠️ Erro ao registrar comandos: ${error.message}`);
  }
}

// Se executado diretamente via "node src/deploy-commands.js"
if (process.argv[1] && process.argv[1].endsWith('deploy-commands.js')) {
  deployCommands();
}
