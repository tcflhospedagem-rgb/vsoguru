import { EmbedBuilder, ActionRowBuilder, UserSelectMenuBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { fmtReais, POSICAO_FULL, medalhaOverall, estrelasOverall, corPorOverall, calcularRaridade } from '../utils/helpers.js';

export function buildSetarPanel(adminUser, jogador) {
  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const raridade = calcularRaridade(jogador);

  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Setar Jogador: ${jogador.nome}`)
    .setDescription(`${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}\n\nSelecione o membro que receberá o jogador:`)
    .setColor(corPorOverall(jogador.overall))
    .addFields(
      { name: 'Posição', value: posFull, inline: true },
      { name: 'Overall', value: `${jogador.overall}`, inline: true },
      { name: 'Clube', value: jogador.clube, inline: true },
      { name: 'Valor', value: fmtReais(jogador.preco), inline: true },
      { name: 'Raridade', value: raridade, inline: true }
    )
    .setFooter({
      text: `VSO Guru · ADM · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    });

  if (jogador.imagem) {
    embed.setThumbnail(jogador.imagem);
  }

  const select = new UserSelectMenuBuilder()
    .setCustomId(`setar_user_select_${adminUser.id}_${encodeURIComponent(jogador.nome)}`)
    .setPlaceholder('Selecione o membro que receberá o jogador')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(select);
  return { embed, components: [row] };
}

export async function handleSetarInteraction(interaction) {
  const { customId, values } = interaction;
  const parts = customId.split('_');
  const adminId = parts[3];
  const jogadorNome = decodeURIComponent(parts.slice(4).join('_'));

  if (interaction.user.id !== adminId) {
    return interaction.reply({ content: 'Apenas o administrador que executou o comando pode usar este menu.', ephemeral: true });
  }

  const targetUserId = values[0];
  const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
  const targetMember = targetUser ? await interaction.guild?.members.fetch(targetUserId).catch(() => null) : null;
  const targetName = targetMember?.displayName || targetUser?.username || 'Membro';

  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];
  const jogador = disponiveis.find(j => j.nome.toLowerCase() === jogadorNome.toLowerCase());

  if (!jogador) {
    return interaction.reply({ content: 'Jogador não encontrado no banco.', ephemeral: true });
  }

  const membroDados = getMembro(dados, targetUserId);
  const jaPossui = (membroDados.elenco || []).some(j => j.nome.toLowerCase() === jogador.nome.toLowerCase());

  if (jaPossui) {
    return interaction.reply({
      content: `❌ **${targetName}** já possui **${jogador.nome}** no elenco!`,
      ephemeral: true
    });
  }

  membroDados.elenco.push(jogador);
  salvarDados(dados);

  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const embedSuccess = new EmbedBuilder()
    .setTitle('✅ Jogador Setado!')
    .setDescription(`**${jogador.nome}** foi adicionado ao elenco de **${targetName}**.`)
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Jogador', value: jogador.nome, inline: true },
      { name: 'Overall', value: `${jogador.overall}`, inline: true },
      { name: 'Posição', value: posFull, inline: true },
      { name: 'Clube', value: jogador.clube, inline: true },
      { name: 'Valor', value: fmtReais(jogador.preco), inline: true },
      { name: 'Elenco Total', value: `${membroDados.elenco.length} jogadores`, inline: true }
    )
    .setAuthor({ name: targetName, iconURL: targetUser ? targetUser.displayAvatarURL() : undefined })
    .setFooter({ text: `Setado por ${interaction.user.displayName || interaction.user.username}` });

  if (jogador.imagem) {
    embedSuccess.setThumbnail(jogador.imagem);
  }

  const disabledSelect = new UserSelectMenuBuilder()
    .setCustomId('setar_done')
    .setPlaceholder('Jogador atribuído!')
    .setDisabled(true);

  const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);

  await interaction.update({ embeds: [embedSuccess], components: [disabledRow] });

  if (targetUser) {
    try {
      const notifEmbed = new EmbedBuilder()
        .setTitle('🎁 Novo Jogador Recebido!')
        .setDescription(`Você recebeu **${jogador.nome}** (${jogador.overall} OVR) no seu elenco!`)
        .setColor(corPorOverall(jogador.overall))
        .setFooter({ text: 'VSO Guru · Liga' });
      await targetUser.send({ embeds: [notifEmbed] });
    } catch {}
  }
}
