import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { POSICAO_FULL, POSICAO_EMOJI } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('reserva')
  .setDescription('Remove um jogador dos titulares para a reserva')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do jogador')
      .setAutocomplete(true)
      .setRequired(true));

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const dados = carregarDados();
  const membro = getMembro(dados, interaction.user.id);
  const titulares = membro.titulares || [];

  const filtrados = titulares
    .filter(j => j.nome.toLowerCase().includes(focusedValue))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 25);

  await interaction.respond(
    filtrados.map(j => ({
      name: `${j.nome} · ${j.overall} OVR · ${j.posicao} · ${j.clube}`,
      value: j.nome
    }))
  );
}

export async function execute(interaction) {
  const nome = interaction.options.getString('nome');
  const dados = carregarDados();
  const membro = getMembro(dados, interaction.user.id);
  const titulares = membro.titulares || [];

  const jogador = titulares.find(j => j.nome.toLowerCase() === nome.toLowerCase());
  if (!jogador) {
    const embedErr = new EmbedBuilder()
      .setTitle('Não é titular')
      .setDescription(`**${nome}** não está na sua escalação.`)
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  membro.titulares = titulares.filter(j => j.nome.toLowerCase() !== nome.toLowerCase());
  salvarDados(dados);

  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const posEmoji = POSICAO_EMOJI[jogador.posicao] || '⚽';

  const embed = new EmbedBuilder()
    .setTitle(`📥 Reserva: ${jogador.nome}`)
    .setDescription(`**${jogador.nome}** foi enviado para a reserva.`)
    .setColor(0xe67e22)
    .addFields(
      { name: 'Posição', value: `${posEmoji} ${posFull}`, inline: true },
      { name: 'Overall', value: `**${jogador.overall}**`, inline: true },
      { name: 'Titulares restantes', value: `**${membro.titulares.length}/11**`, inline: true }
    )
    .setAuthor({
      name: interaction.user.displayName || interaction.user.username,
      iconURL: interaction.user.displayAvatarURL()
    })
    .setFooter({ text: 'VSO Guru · Liga' });

  if (jogador.imagem) {
    embed.setThumbnail(jogador.imagem);
  }

  await interaction.reply({ embeds: [embed] });
}
