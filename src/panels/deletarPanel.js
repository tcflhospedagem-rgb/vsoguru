import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { carregarDados, salvarDados, criarBackup } from '../database/db.js';
import { fmtReais, POSICAO_FULL, calcularRaridade } from '../utils/helpers.js';

export function buildDeletarPanel(adminUser, jogador) {
  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const raridade = calcularRaridade(jogador);

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Confirmar Exclusão')
    .setDescription('Você está prestes a **deletar permanentemente** este jogador do banco.\n\nDeseja continuar?')
    .setColor(0xe67e22)
    .addFields(
      { name: '👤 Jogador', value: jogador.nome, inline: true },
      { name: '📊 Overall', value: `${jogador.overall}`, inline: true },
      { name: '📍 Posição', value: posFull, inline: true },
      { name: '🎽 Clube', value: jogador.clube, inline: true },
      { name: '💰 Valor', value: fmtReais(jogador.preco), inline: true },
      { name: '🎴 Raridade', value: raridade, inline: true }
    )
    .setFooter({
      text: `VSO Guru · ADM · ${adminUser.displayName || adminUser.username} · ${new Date().toLocaleDateString('pt-BR')}`
    });

  if (jogador.imagem) {
    embed.setThumbnail(jogador.imagem);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`deletar_confirm_${adminUser.id}_${encodeURIComponent(jogador.nome)}`)
      .setLabel('✅ Confirmar Exclusão')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`deletar_cancel_${adminUser.id}_${encodeURIComponent(jogador.nome)}`)
      .setLabel('✕ Cancelar')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

export async function handleDeletarInteraction(interaction) {
  const { customId } = interaction;
  const parts = customId.split('_');
  const action = parts[1]; // confirm ou cancel
  const adminId = parts[2];
  const jogadorNome = decodeURIComponent(parts.slice(3).join('_'));

  if (interaction.user.id !== adminId) {
    return interaction.reply({ content: '❌ Apenas o administrador pode confirmar.', ephemeral: true });
  }

  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];
  const jogador = disponiveis.find(j => j.nome.toLowerCase() === jogadorNome.toLowerCase());

  if (action === 'confirm') {
    if (!jogador) {
      return interaction.reply({ content: 'Jogador já foi removido ou não encontrado.', ephemeral: true });
    }

    const novosDisponiveis = disponiveis.filter(j => j.nome.toLowerCase() !== jogadorNome.toLowerCase());
    const qtdRemovidos = disponiveis.length - novosDisponiveis.length;
    dados.jogadores_disponiveis = novosDisponiveis;
    salvarDados(dados);
    criarBackup();

    const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;

    const embedSuccess = new EmbedBuilder()
      .setTitle('🗑️ Jogador Deletado')
      .setDescription(`**${jogador.nome}** foi removido do banco.\n\nBackup criado automaticamente.`)
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Jogador', value: jogador.nome, inline: true },
        { name: 'Overall', value: `${jogador.overall}`, inline: true },
        { name: 'Posição', value: posFull, inline: true },
        { name: 'Clube', value: jogador.clube, inline: true },
        { name: 'Entradas removidas', value: `${qtdRemovidos}`, inline: true },
        { name: 'Banco restante', value: `${novosDisponiveis.length} jogadores`, inline: true }
      )
      .setFooter({
        text: `VSO Guru · ADM · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      });

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('deletar_done_confirm')
        .setLabel('Deletado')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.update({ embeds: [embedSuccess], components: [disabledRow] });
  } else if (action === 'cancel') {
    const embedCancel = new EmbedBuilder()
      .setTitle('Operação Cancelada')
      .setDescription(`**${jogadorNome}** não foi deletado.`)
      .setColor(0x95a5a6);

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('deletar_done_cancel')
        .setLabel('Cancelado')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    await interaction.update({ embeds: [embedCancel], components: [disabledRow] });
  }
}
