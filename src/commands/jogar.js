import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, getMembro } from '../database/db.js';
import { buildJogarPanel } from '../panels/jogarPanel.js';

export const data = new SlashCommandBuilder()
  .setName('jogar')
  .setDescription('Simula uma partida contra outro jogador');

export async function execute(interaction) {
  const dados = carregarDados();
  const userId = interaction.user.id;
  const membroDados = getMembro(dados, userId);
  const titulares = membroDados.titulares || [];

  if (titulares.length === 0) {
    const embedErr = new EmbedBuilder()
      .setTitle('❌ Sem Titulares')
      .setDescription('Use `/promover` para montar seu time.')
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  if (titulares.length < 11) {
    const embedErr = new EmbedBuilder()
      .setTitle('⚠️ Time Incompleto')
      .setDescription(`Você tem **${titulares.length}/11** titulares escalados. Completo 11 titulares para jogar!`)
      .setColor(0xf39c12);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const timeNome = membroDados.time_nome || `Time de ${interaction.user.displayName || interaction.user.username}`;
  const ovrMedio = Number((titulares.reduce((s, j) => s + j.overall, 0) / titulares.length).toFixed(1));

  const { embed, components } = buildJogarPanel(interaction.user, timeNome, ovrMedio, titulares.length);
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}
