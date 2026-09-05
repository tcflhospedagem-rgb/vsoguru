import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, validarJogador } from '../database/db.js';
import { isAdmin, fmtReais, calcularRaridade, calcularChancePercentual, corPorOverall, medalhaOverall, estrelasOverall, POSICAO_FULL } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('addplayer')
  .setDescription('[ADM] Adiciona um jogador ao banco')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do jogador')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('posicao')
      .setDescription('Posição (GOL, ZAG, LD, LE, VOL, MEI, ATA ou GK, CB, etc)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('overall')
      .setDescription('Overall (1-99)')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('clube')
      .setDescription('Clube do jogador')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('preco')
      .setDescription('Preço em reais')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('imagem')
      .setDescription('URL da imagem da carta')
      .setRequired(false));

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: 'Apenas administradores podem usar este comando.', ephemeral: true });
  }

  const nome = interaction.options.getString('nome');
  const posicao = interaction.options.getString('posicao');
  const overall = interaction.options.getInteger('overall');
  const clube = interaction.options.getString('clube');
  const preco = interaction.options.getInteger('preco');
  const imagem = interaction.options.getString('imagem');

  const dados = carregarDados();
  const jogador = validarJogador({ nome, posicao, overall, clube, preco, imagem });
  dados.jogadores_disponiveis.push(jogador);
  salvarDados(dados);

  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const raridade = calcularRaridade(jogador);
  const todos = dados.jogadores_disponiveis;
  const chance = calcularChancePercentual(jogador, todos);

  const embed = new EmbedBuilder()
    .setTitle(jogador.nome)
    .setDescription(`${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}\n\nJogador adicionado ao banco da liga.`)
    .setColor(corPorOverall(jogador.overall))
    .addFields(
      { name: 'Posição', value: `${posFull} (\`${jogador.posicao}\`)`, inline: true },
      { name: 'Overall', value: `${jogador.overall}`, inline: true },
      { name: 'Clube', value: clube, inline: true },
      { name: 'Valor de Mercado', value: fmtReais(preco), inline: true },
      { name: 'Raridade', value: raridade, inline: true },
      { name: 'Chance /obter', value: `~${chance}%`, inline: true },
      { name: 'Total no banco', value: `${todos.length} jogadores`, inline: false }
    )
    .setFooter({
      text: `VSO Guru · ADM · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    });

  if (imagem) {
    embed.setImage(imagem);
  }

  await interaction.reply({ embeds: [embed] });
}
