import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados } from '../database/db.js';
import { buildMercadoEmbed, buildMercadoComponents } from '../panels/mercadoPanel.js';

export const data = new SlashCommandBuilder()
  .setName('comprar')
  .setDescription('Abre o mercado de transferências');

export async function execute(interaction) {
  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];

  if (disponiveis.length === 0) {
    const embedErr = new EmbedBuilder()
      .setTitle('🏪 Mercado Vazio')
      .setDescription('Sem jogadores disponíveis.')
      .setColor(0x95a5a6);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const { embed, page, totalPaginas, paginaJogadores } = buildMercadoEmbed(interaction.user.id, disponiveis, 0);
  const components = buildMercadoComponents(interaction.user.id, page, totalPaginas, paginaJogadores);

  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}
