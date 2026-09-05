import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { fmtReais, corPorOverall } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('time')
  .setDescription('Veja ou defina o nome e sigla do seu time')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do seu time (opcional)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('sigla')
      .setDescription('Sigla do time (opcional)')
      .setRequired(false));

export async function execute(interaction) {
  const dados = carregarDados();
  const userId = interaction.user.id;
  const membroDados = getMembro(dados, userId);

  const nome = interaction.options.getString('nome');
  const sigla = interaction.options.getString('sigla');

  if (nome || sigla) {
    if (nome) membroDados.time_nome = nome;
    if (sigla) membroDados.time_sigla = sigla.toUpperCase();
    salvarDados(dados);

    const embed = new EmbedBuilder()
      .setTitle('Clube Atualizado')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Nome', value: membroDados.time_nome || 'Não definido', inline: true },
        { name: 'Sigla', value: membroDados.time_sigla || 'Não definida', inline: true }
      )
      .setAuthor({
        name: interaction.user.displayName || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setFooter({ text: 'VSO Guru · Liga' });

    return interaction.reply({ embeds: [embed] });
  }

  const timeNome = membroDados.time_nome || 'Clube sem nome';
  const timeSigla = membroDados.time_sigla || '???';
  const elencoLista = membroDados.elenco || [];
  const titularesLista = membroDados.titulares || [];

  const media = titularesLista.length > 0
    ? Number((titularesLista.reduce((s, j) => s + j.overall, 0) / titularesLista.length).toFixed(1))
    : 0;

  const embed = new EmbedBuilder()
    .setTitle(`${timeNome} [${timeSigla}]`)
    .setDescription(
      `Overall médio: ${media > 0 ? media : '—'} · Titulares: ${titularesLista.length}/11\n` +
      `Saldo: ${fmtReais(membroDados.saldo)}`
    )
    .setColor(media > 0 ? corPorOverall(Math.floor(media)) : 0x95a5a6)
    .setAuthor({
      name: interaction.user.displayName || interaction.user.username,
      iconURL: interaction.user.displayAvatarURL()
    });

  if (elencoLista.length > 0) {
    const ordenados = [...elencoLista].sort((a, b) => b.overall - a.overall);
    const linhas = ordenados.map(j => `${j.overall} ${j.nome} (${j.posicao}) — ${j.clube}`);
    embed.addFields({
      name: `Elenco Completo (${elencoLista.length} jogadores)`,
      value: linhas.join('\n').slice(0, 1024),
      inline: false
    });
  } else {
    embed.addFields({ name: 'Elenco', value: 'Nenhum jogador. Use /obter!', inline: false });
  }

  embed.setFooter({
    text: `VSO Guru · Liga · ${new Date().toLocaleDateString('pt-BR')}`
  });

  await interaction.reply({ embeds: [embed] });
}
