import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { fmtReais, POSICAO_FULL, POSICAO_EMOJI, medalhaOverall, estrelasOverall, corPorOverall, calcularRaridade, calcularChancePercentual } from '../utils/helpers.js';

export function buildObterEmbed(user, jogador, chance, totalElenco) {
  const raridade = calcularRaridade(jogador);
  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const posEmoji = POSICAO_EMOJI[jogador.posicao] || '⚽';
  const cor = corPorOverall(jogador.overall);

  const embed = new EmbedBuilder()
    .setTitle('🎁 NOVO REFORÇO CONTRATADO!')
    .setDescription(
      `**${user.displayName || user.username}** abriu um pacote da liga!\n` +
      `**Jogador:** ${jogador.nome}\n` +
      `${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}\n` +
      `────────────────────────`
    )
    .setColor(cor)
    .addFields(
      { name: '📍 Posição', value: `${posEmoji} ${posFull}`, inline: true },
      { name: '📊 Overall', value: `\`${jogador.overall}\` OVR`, inline: true },
      { name: '🎽 Clube', value: jogador.clube, inline: true },
      { name: '💰 Valor de Mercado', value: fmtReais(jogador.preco), inline: true },
      { name: '💵 Valor de Venda', value: fmtReais(jogador.preco * 0.6), inline: true },
      { name: '📋 Elenco Total', value: `${totalElenco} jogadores`, inline: true },
      { name: '✨ Detalhes do Sorteio', value: `Raridade: ${raridade} · Chance obtida: ~${chance}%`, inline: false }
    )
    .setAuthor({
      name: user.displayName || user.username,
      iconURL: user.displayAvatarURL()
    })
    .setFooter({
      text: `VSO Guru · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    });

  if (jogador.imagem) {
    embed.setImage(jogador.imagem);
  }

  return embed;
}

export function buildObterComponents(userId, jogadorId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`obter_promover_${userId}_${encodeURIComponent(jogadorId)}`)
      .setLabel('▲ Escalar como Titular')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`obter_vender_${userId}_${encodeURIComponent(jogadorId)}`)
      .setLabel('✕ Vender')
      .setStyle(ButtonStyle.Danger)
  );
  return [row];
}

export async function handleObterInteraction(interaction) {
  const { customId } = interaction;
  const parts = customId.split('_');
  const action = parts[1]; // promover ou vender
  const ownerId = parts[2];
  const jogadorNome = decodeURIComponent(parts.slice(3).join('_'));

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'Esses botões não são seus.', ephemeral: true });
  }

  const dados = carregarDados();
  const membro = getMembro(dados, ownerId);

  if (action === 'promover') {
    const titulares = membro.titulares || [];

    if (titulares.some(j => j.nome.toLowerCase() === jogadorNome.toLowerCase())) {
      return interaction.reply({ content: `**${jogadorNome}** já está entre os titulares.`, ephemeral: true });
    }

    if (titulares.length >= 11) {
      return interaction.reply({ content: 'Você já tem 11 titulares. Remova um antes.', ephemeral: true });
    }

    const jogadorNoElenco = (membro.elenco || []).find(j => j.nome.toLowerCase() === jogadorNome.toLowerCase());
    if (!jogadorNoElenco) {
      return interaction.reply({ content: 'Jogador não encontrado no elenco.', ephemeral: true });
    }

    titulares.push(jogadorNoElenco);
    membro.titulares = titulares;
    salvarDados(dados);

    // Desabilita os botões na mensagem original
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('obter_done_promover')
        .setLabel('✓ Escalado!')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('obter_done_vender')
        .setLabel('✕ Vender')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });

    const embedSuccess = new EmbedBuilder()
      .setTitle('Titular Confirmado')
      .setDescription(`**${jogadorNoElenco.nome}** entrou no time titular.\n${titulares.length}/11 posições preenchidas.`)
      .setColor(0x2ecc71)
      .setFooter({ text: 'VSO Guru · Liga' });

    if (jogadorNoElenco.imagem) {
      embedSuccess.setThumbnail(jogadorNoElenco.imagem);
    }

    await interaction.followUp({ embeds: [embedSuccess], ephemeral: true });
  } else if (action === 'vender') {
    const elenco = membro.elenco || [];
    const idx = elenco.findIndex(j => j.nome.toLowerCase() === jogadorNome.toLowerCase());

    if (idx === -1) {
      return interaction.reply({ content: 'Jogador não encontrado no elenco.', ephemeral: true });
    }

    const jogador = elenco[idx];
    const precoVenda = Math.floor((jogador.preco || 0) * 0.6);

    elenco.splice(idx, 1);
    membro.elenco = elenco;
    membro.saldo = (membro.saldo || 0) + precoVenda;
    membro.titulares = (membro.titulares || []).filter(j => j.nome.toLowerCase() !== jogadorNome.toLowerCase());
    salvarDados(dados);

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('obter_done_promover')
        .setLabel('▲ Escalar como Titular')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('obter_done_vender')
        .setLabel('Vendido')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });

    const embedSuccess = new EmbedBuilder()
      .setTitle('Negociação Concluída')
      .setDescription(
        `**${jogador.nome}** foi vendido.\n\n` +
        `**Valor recebido:** ${fmtReais(precoVenda)} *(60% do valor de mercado)*\n` +
        `**Saldo atual:** ${fmtReais(membro.saldo)}`
      )
      .setColor(0xe74c3c)
      .setFooter({ text: 'VSO Guru · Liga' });

    await interaction.followUp({ embeds: [embedSuccess], ephemeral: true });
  }
}
