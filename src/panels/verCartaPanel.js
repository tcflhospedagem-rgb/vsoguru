import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { fmtReais, calcularRaridade, corPorOverall, medalhaOverall, estrelasOverall, POSICAO_FULL } from '../utils/helpers.js';

export function buildVerCartaPanel(alvoUser, jogadores) {
  const sorted = [...jogadores].sort((a, b) => b.overall - a.overall);

  const embed = new EmbedBuilder()
    .setTitle(`🎴 Elenco de ${alvoUser.displayName || alvoUser.username}`)
    .setDescription(`Selecione um jogador abaixo para visualizar a carta.\n\n**Total:** ${sorted.length} jogador${sorted.length !== 1 ? 'es' : ''}`)
    .setColor(0x1e90ff)
    .setAuthor({
      name: alvoUser.displayName || alvoUser.username,
      iconURL: alvoUser.displayAvatarURL()
    })
    .setFooter({ text: 'VSO Guru · Liga' });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`vercarta_select_${alvoUser.id}`)
    .setPlaceholder(`Selecione um jogador (${sorted.length} no elenco)`);

  const top25 = sorted.slice(0, 25);
  for (const j of top25) {
    const posFull = POSICAO_FULL[j.posicao] || j.posicao;
    let emoji = '⚽';
    if (j.overall >= 90) emoji = '🏆';
    else if (j.overall >= 85) emoji = '💎';
    else if (j.overall >= 80) emoji = '⭐';

    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${j.nome} · ${j.overall} OVR`)
        .setDescription(`${posFull} · ${j.clube}`)
        .setValue(`${j.nome}_${j.overall}`)
        .setEmoji(emoji)
    );
  }

  const row = new ActionRowBuilder().addComponents(select);
  return { embed, components: [row], sorted };
}

export async function handleVerCartaInteraction(interaction, targetJogadores, alvoName, alvoAvatar) {
  const selectedValue = interaction.values[0];
  const jogador = targetJogadores.find(j => `${j.nome}_${j.overall}` === selectedValue);

  if (!jogador) {
    return interaction.reply({ content: 'Jogador não encontrado.', ephemeral: true });
  }

  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const raridade = calcularRaridade(jogador);

  const embed = new EmbedBuilder()
    .setTitle(jogador.nome)
    .setDescription(`${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}`)
    .setColor(corPorOverall(jogador.overall))
    .addFields(
      { name: '📍 Posição', value: `${posFull} (\`${jogador.posicao}\`)`, inline: true },
      { name: '📊 Overall', value: `**${jogador.overall}**`, inline: true },
      { name: '🎽 Clube', value: jogador.clube, inline: true },
      { name: '💰 Valor de Mercado', value: fmtReais(jogador.preco), inline: true },
      { name: '🎴 Raridade', value: raridade, inline: true },
      { name: '💵 Valor de Venda', value: fmtReais(jogador.preco * 0.6), inline: true }
    )
    .setAuthor({ name: `Elenco de ${alvoName}`, iconURL: alvoAvatar })
    .setFooter({ text: `VSO Guru · Liga · ${new Date().toLocaleDateString('pt-BR')}` });

  if (jogador.imagem) {
    embed.setImage(jogador.imagem);
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
