import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados } from '../database/db.js';
import { isAdmin, fmtReais, calcularRaridade } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('listaplayers')
  .setDescription('[ADM] Lista todos os jogadores do banco');

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Apenas administradores.', ephemeral: true });
  }

  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];

  if (disponiveis.length === 0) {
    const embedErr = new EmbedBuilder().setTitle('Banco Vazio').setColor(0x95a5a6);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const ordenados = [...disponiveis].sort((a, b) => b.overall - a.overall);
  const embed = new EmbedBuilder()
    .setTitle('Banco de Jogadores')
    .setDescription(`${disponiveis.length} jogadores no banco.`)
    .setColor(0x1e90ff);

  const linhas = ordenados.map(j => {
    const imgTag = j.imagem ? ' 🖼' : '';
    const raridade = calcularRaridade(j);
    return `${j.overall} ${j.nome} · ${j.posicao} · ${j.clube} · ${fmtReais(j.preco)} · ${raridade}${imgTag}`;
  });

  embed.addFields({
    name: 'Jogadores',
    value: linhas.join('\n').slice(0, 4000),
    inline: false
  });

  embed.setFooter({
    text: `VSO Guru · ADM · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
