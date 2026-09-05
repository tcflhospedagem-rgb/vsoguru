import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados } from '../database/db.js';
import { buildVerCartaPanel } from '../panels/verCartaPanel.js';

export const data = new SlashCommandBuilder()
  .setName('vercarta')
  .setDescription('Visualiza a carta de um jogador de qualquer usuário')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuário dono do jogador (opcional)')
      .setRequired(false));

export async function execute(interaction) {
  const dados = carregarDados();
  const alvo = interaction.options.getUser('usuario') || interaction.user;
  const alvoMember = await interaction.guild?.members.fetch(alvo.id).catch(() => null);

  const membroDados = dados.membros ? dados.membros[alvo.id] : null;

  if (!membroDados) {
    return interaction.reply({
      content: `❌ **${alvoMember?.displayName || alvo.username}** ainda não está registrado na liga!`,
      ephemeral: true
    });
  }

  const todos = (membroDados.elenco || []).concat(membroDados.titulares || []);
  const vistos = new Set();
  const unicos = [];
  for (const j of todos) {
    const chave = `${j.nome}_${j.overall}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      unicos.push(j);
    }
  }

  if (unicos.length === 0) {
    return interaction.reply({
      content: `❌ **${alvoMember?.displayName || alvo.username}** não tem jogadores!`,
      ephemeral: true
    });
  }

  const { embed, components } = buildVerCartaPanel(alvo, unicos);
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}
