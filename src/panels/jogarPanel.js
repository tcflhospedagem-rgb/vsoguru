import { EmbedBuilder, ActionRowBuilder, UserSelectMenuBuilder } from 'discord.js';
import { carregarDados } from '../database/db.js';
import { simularPartida } from '../utils/matchSimulator.js';

export function buildJogarPanel(user, timeNome, ovrMedio, titularesQtd) {
  const descriptionParts = [
    `**${timeNome}** está pronto!`,
    `**Overall médio:** ${ovrMedio}`,
    `**Titulares:** ${titularesQtd}/11`,
    'Selecione seu adversário:'
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle('⚽ Iniciar Partida')
    .setDescription(descriptionParts.join('\n'))
    .setColor(0x1e90ff)
    .setAuthor({
      name: user.displayName || user.username,
      iconURL: user.displayAvatarURL()
    })
    .setFooter({ text: 'VSO Guru · Liga' });

  const select = new UserSelectMenuBuilder()
    .setCustomId(`jogar_user_select_${user.id}`)
    .setPlaceholder('Selecione seu adversário para o jogo')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(select);
  return { embed, components: [row] };
}

export async function handleJogarInteraction(interaction) {
  const { customId, values } = interaction;
  const parts = customId.split('_');
  const ownerId = parts[3];

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'Este menu não é seu.', ephemeral: true });
  }

  const advUserId = values[0];
  if (advUserId === ownerId) {
    return interaction.reply({ content: '❌ Você não pode jogar contra si mesmo!', ephemeral: true });
  }

  const dados = carregarDados();
  const userDados = dados.membros[ownerId];
  const advDados = dados.membros[advUserId];

  if (!advDados) {
    return interaction.reply({ content: '❌ Este usuário ainda não está registrado na liga!', ephemeral: true });
  }

  const advTitulares = advDados.titulares || [];
  if (advTitulares.length === 0) {
    return interaction.reply({ content: '❌ O adversário selecionado não possui titulares escalados!', ephemeral: true });
  }

  const advUser = await interaction.client.users.fetch(advUserId).catch(() => null);
  const advMember = advUser ? await interaction.guild?.members.fetch(advUserId).catch(() => null) : null;
  const advName = advDados.time_nome || (advMember ? advMember.displayName : (advUser ? advUser.username : 'Adversário'));

  const userTitulares = userDados.titulares || [];
  const userTimeNome = userDados.time_nome || `Time de ${interaction.user.displayName || interaction.user.username}`;

  const resultado = simularPartida(userTitulares, advTitulares, userTimeNome, advName);

  if (!resultado) {
    return interaction.reply({ content: '❌ Erro ao simular a partida.', ephemeral: true });
  }

  let cor = 0xf39c12;
  let titulo = '🤝 EMPATE';

  if (resultado.vencedor === userTimeNome) {
    cor = 0x2ecc71;
    titulo = '🏆 VITÓRIA!';
  } else if (resultado.vencedor === advName) {
    cor = 0xe74c3c;
    titulo = '😞 DERROTA';
  }

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(`**${resultado.time1}** ${resultado.gols1} x ${resultado.gols2} **${resultado.time2}**`)
    .setColor(cor)
    .addFields(
      { name: `${resultado.time1} (OVR ${resultado.ovr1})`, value: `⚽ ${resultado.gols1} gol${resultado.gols1 !== 1 ? 's' : ''}`, inline: true },
      { name: `${resultado.time2} (OVR ${resultado.ovr2})`, value: `⚽ ${resultado.gols2} gol${resultado.gols2 !== 1 ? 's' : ''}`, inline: true }
    );

  if (resultado.eventos && resultado.eventos.length > 0) {
    const eventosTexto = resultado.eventos.map(e => `\`${e.minuto}'\` ⚽ **${e.jogador}** (${e.time})`).join('\n');
    embed.addFields({ name: '📋 Lances da Partida', value: eventosTexto.slice(0, 1024), inline: false });
  }

  embed.setFooter({
    text: `VSO Guru · Partida Amistosa · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  });

  const disabledSelect = new UserSelectMenuBuilder()
    .setCustomId('jogar_done')
    .setPlaceholder('Partida encerrada!')
    .setDisabled(true);

  const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);

  await interaction.update({ embeds: [embed], components: [disabledRow] });
}
