import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { fmtReais, calcularRaridade, POSICAO_FULL, POSICAO_EMOJI, medalhaOverall, estrelasOverall } from '../utils/helpers.js';
import { notificarBestPack } from '../utils/notifications.js';

export function buildMercadoEmbed(userId, disponiveis, pagina = 0) {
  const itensPorPagina = 10;
  const ordenados = [...disponiveis].sort((a, b) => b.overall - a.overall);
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / itensPorPagina));
  const page = Math.max(0, Math.min(pagina, totalPaginas - 1));

  const dados = carregarDados();
  const membro = getMembro(dados, String(userId));
  const saldo = membro.saldo || 0;

  const embed = new EmbedBuilder()
    .setTitle('🏪 Mercado de Transferências')
    .setDescription(`💰 **Seu Saldo:** ${fmtReais(saldo)}\n\n*Clique nos botões abaixo para realizar a contratação:*`)
    .setColor(0x00d2ff)
    .setFooter({
      text: `VSO Guru · Página ${page + 1}/${totalPaginas} · ${ordenados.length} jogadores disponíveis`
    });

  const inicio = page * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, ordenados.length);
  const paginaJogadores = ordenados.slice(inicio, fim);

  for (const jogador of paginaJogadores) {
    const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
    const posEmoji = POSICAO_EMOJI[jogador.posicao] || '⚽';
    const podeComprar = saldo >= jogador.preco ? '🟢' : '🔴';
    const raridade = calcularRaridade(jogador);

    embed.addFields({
      name: `${podeComprar} ${jogador.nome}`,
      value: `**OVR:** \`${jogador.overall}\` · ${posEmoji} ${posFull}\n**Clube:** ${jogador.clube}\n**Valor:** ${fmtReais(jogador.preco)}\n${raridade}`,
      inline: true
    });
  }

  return { embed, page, totalPaginas, paginaJogadores };
}

export function buildMercadoComponents(userId, page, totalPaginas, paginaJogadores) {
  const rows = [];

  // Linha 0: Navegação de Páginas
  const navRow = new ActionRowBuilder();
  if (page > 0) {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`mercado_prev_${userId}_${page - 1}`)
        .setLabel('◀ Anterior')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  if (page < totalPaginas - 1) {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`mercado_next_${userId}_${page + 1}`)
        .setLabel('Próximo ▶')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (navRow.components.length > 0) {
    rows.push(navRow);
  }

  // Linhas 1+: Botões dos jogadores (máximo 5 por ActionRow, até 2 ActionRows para 10 jogadores)
  for (let i = 0; i < paginaJogadores.length; i += 5) {
    const row = new ActionRowBuilder();
    const chunk = paginaJogadores.slice(i, i + 5);

    for (let j = 0; j < chunk.length; j++) {
      const jogador = chunk[j];
      const idxGlobal = (page * 10) + i + j;
      const label = `${jogador.nome.slice(0, 18)} · ${fmtReais(jogador.preco)}`;

      let style = ButtonStyle.Secondary;
      if (jogador.overall >= 90) style = ButtonStyle.Success;
      else if (jogador.overall >= 80) style = ButtonStyle.Primary;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mercado_buy_${userId}_${idxGlobal}`)
          .setLabel(label)
          .setStyle(style)
      );
    }
    rows.push(row);
  }

  return rows;
}

export async function handleMercadoInteraction(interaction) {
  const { customId } = interaction;
  const parts = customId.split('_');
  const action = parts[1]; // prev, next, buy
  const ownerId = parts[2];

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'Esta lista não é sua.', ephemeral: true });
  }

  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];

  if (action === 'prev' || action === 'next') {
    const targetPage = parseInt(parts[3]) || 0;
    const { embed, page, totalPaginas, paginaJogadores } = buildMercadoEmbed(ownerId, disponiveis, targetPage);
    const components = buildMercadoComponents(ownerId, page, totalPaginas, paginaJogadores);

    await interaction.update({ embeds: [embed], components });
  } else if (action === 'buy') {
    const idxGlobal = parseInt(parts[3]);
    const ordenados = [...disponiveis].sort((a, b) => b.overall - a.overall);
    const jogador = ordenados[idxGlobal];

    if (!jogador) {
      return interaction.reply({ content: 'Jogador não encontrado no mercado.', ephemeral: true });
    }

    const membro = getMembro(dados, ownerId);
    const preco = jogador.preco || 0;
    const saldo = membro.saldo || 0;

    if (saldo < preco) {
      const embedErr = new EmbedBuilder()
        .setTitle('💸 Saldo Insuficiente')
        .setColor(0xe74c3c)
        .addFields(
          { name: 'Preço', value: fmtReais(preco), inline: true },
          { name: 'Seu saldo', value: fmtReais(saldo), inline: true },
          { name: 'Faltam', value: fmtReais(preco - saldo), inline: true }
        );
      return interaction.reply({ embeds: [embedErr], ephemeral: true });
    }

    const todosMembro = (membro.elenco || []).concat(membro.titulares || []);
    if (todosMembro.some(j => j.nome.toLowerCase() === jogador.nome.toLowerCase())) {
      return interaction.reply({ content: `Você já tem **${jogador.nome}** no seu elenco!`, ephemeral: true });
    }

    membro.saldo -= preco;
    membro.elenco.push(jogador);
    salvarDados(dados);

    const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
    const posEmoji = POSICAO_EMOJI[jogador.posicao] || '⚽';

    const embedSuccess = new EmbedBuilder()
      .setTitle('🤝 CONTRATAÇÃO CONFIRMADA!')
      .setDescription(
        `**${jogador.nome}** assinou com o seu clube!\n` +
        `${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}\n` +
        `────────────────────────`
      )
      .setColor(0x00f076)
      .addFields(
        { name: '📍 Posição', value: `${posEmoji} ${posFull}`, inline: true },
        { name: '📊 Overall', value: `\`${jogador.overall}\` OVR`, inline: true },
        { name: '🎽 Clube Anterior', value: jogador.clube, inline: true },
        { name: '💵 Valor Pago', value: fmtReais(preco), inline: true },
        { name: '💳 Novo Saldo', value: fmtReais(membro.saldo), inline: true },
        { name: '📋 Elenco Total', value: `${membro.elenco.length} jogadores`, inline: true }
      )
      .setAuthor({
        name: interaction.user.displayName || interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setFooter({
        text: `VSO Guru · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      });

    if (jogador.imagem) {
      embedSuccess.setThumbnail(jogador.imagem);
    }

    await interaction.reply({ embeds: [embedSuccess] });

    await notificarBestPack(interaction.client, interaction.user, jogador, 'comprar');

    // Atualiza a mensagem original do mercado
    const { embed: updatedEmbed, page, totalPaginas, paginaJogadores } = buildMercadoEmbed(ownerId, disponiveis, 0);
    const updatedComponents = buildMercadoComponents(ownerId, page, totalPaginas, paginaJogadores);
    await interaction.message.edit({ embeds: [updatedEmbed], components: updatedComponents }).catch(() => {});
  }
}
