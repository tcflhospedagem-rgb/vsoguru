import { EmbedBuilder } from 'discord.js';
import { BEST_PACKS_CHANNEL_ID, BEST_PACKS_MIN_OVR, POSICAO_FULL, POSICAO_EMOJI } from '../config.js';
import { calcularRaridade, corPorOverall, fmtReais } from './helpers.js';

export async function notificarBestPack(client, usuario, jogador, tipo = 'obter') {
  if (!BEST_PACKS_CHANNEL_ID) return;
  if (!jogador || (jogador.overall || 0) < BEST_PACKS_MIN_OVR) return;

  try {
    const canal = await client.channels.fetch(BEST_PACKS_CHANNEL_ID).catch(() => null);
    if (!canal) {
      console.warn(`⚠️ Canal best_packs (ID ${BEST_PACKS_CHANNEL_ID}) não encontrado.`);
      return;
    }

    const raridade = calcularRaridade(jogador);
    const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
    const posEmoji = POSICAO_EMOJI[jogador.posicao] || '⚽';
    const userDisplayName = usuario.displayName || usuario.username;

    const titulo = tipo === 'obter' ? '🎁 PACK INCRÍVEL!' : '🏪 CONTRATAÇÃO DE ELITE!';
    const descricao = tipo === 'obter'
      ? `**${userDisplayName}** tirou uma carta **${jogador.overall} OVR** no sorteio!`
      : `**${userDisplayName}** comprou uma carta **${jogador.overall} OVR** no mercado!`;

    const embed = new EmbedBuilder()
      .setTitle(titulo)
      .setDescription(descricao)
      .setColor(corPorOverall(jogador.overall))
      .addFields(
        { name: '👤 Jogador', value: jogador.nome, inline: true },
        { name: '📊 Overall', value: `**${jogador.overall}** OVR`, inline: true },
        { name: '🎴 Raridade', value: raridade, inline: true },
        { name: `${posEmoji} Posição`, value: posFull, inline: true },
        { name: '🎽 Clube', value: jogador.clube, inline: true },
        { name: '💰 Valor', value: fmtReais(jogador.preco), inline: true }
      )
      .setAuthor({
        name: userDisplayName,
        iconURL: usuario.displayAvatarURL ? usuario.displayAvatarURL() : usuario.avatarURL()
      })
      .setFooter({
        text: `VSO Guru · Best Packs · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      });

    if (jogador.imagem) {
      embed.setImage(jogador.imagem);
    }

    await canal.send({ embeds: [embed] });
  } catch (err) {
    console.error(`⚠️ Erro ao enviar best pack: ${err.message}`);
  }
}
