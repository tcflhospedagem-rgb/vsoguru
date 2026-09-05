import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { fmtReais } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('saldo')
  .setDescription('Veja seu saldo na liga')
  .addUserOption(option =>
    option.setName('membro')
      .setDescription('Ver saldo de outro membro (opcional)')
      .setRequired(false));

export async function execute(interaction) {
  const dados = carregarDados();
  const alvo = interaction.options.getUser('membro') || interaction.user;
  const alvoMember = await interaction.guild?.members.fetch(alvo.id).catch(() => null);
  const alvoName = alvoMember?.displayName || alvo.username;

  const membroDados = getMembro(dados, alvo.id);
  salvarDados(dados);

  const coins = membroDados.saldo || 0;
  let nivel = 'Iniciante';
  let cor = 0x95a5a6;

  if (coins >= 10000000) {
    nivel = 'Magnata';
    cor = 0xffd700;
  } else if (coins >= 1000000) {
    nivel = 'Rico';
    cor = 0x2ecc71;
  } else if (coins >= 100000) {
    nivel = 'Estável';
    cor = 0x1e90ff;
  }

  const embed = new EmbedBuilder()
    .setTitle('Carteira do Clube')
    .setDescription(`Nível financeiro: ${nivel}`)
    .setColor(cor)
    .setAuthor({
      name: alvoName,
      iconURL: alvo.displayAvatarURL()
    })
    .addFields({ name: 'Saldo Disponível', value: fmtReais(coins), inline: false })
    .setFooter({
      text: `VSO Guru · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    });

  await interaction.reply({ embeds: [embed] });
}
