import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { corPorOverall, medalhaOverall, estrelasOverall, POSICAO_FULL, POSICAO_EMOJI } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('promover')
  .setDescription('Promove um jogador para titular')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do jogador')
      .setAutocomplete(true)
      .setRequired(true));

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const dados = carregarDados();
  const membro = getMembro(dados, interaction.user.id);
  const elenco = membro.elenco || [];
  const titularesNomes = new Set((membro.titulares || []).map(j => j.nome.toLowerCase()));
  const reservas = elenco.filter(j => !titularesNomes.has(j.nome.toLowerCase()));

  const filtrados = reservas
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
  const elenco = membro.elenco || [];
  const titulares = membro.titulares || [];

  const jogador = elenco.find(j => j.nome.toLowerCase() === nome.toLowerCase());
  if (!jogador) {
    const embedErr = new EmbedBuilder()
      .setTitle('Não encontrado')
      .setDescription(`${nome} não está no seu elenco.`)
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  if (titulares.some(j => j.nome.toLowerCase() === nome.toLowerCase())) {
    return interaction.reply({ content: `${nome} já está entre os titulares.`, ephemeral: true });
  }

  if (titulares.length >= 11) {
    return interaction.reply({ content: 'Você já tem 11 titulares. Remova um antes.', ephemeral: true });
  }

  titulares.push(jogador);
  membro.titulares = titulares;
  salvarDados(dados);

  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const posEmoji = POSICAO_EMOJI[jogador.posicao] || '⚽';

  const embed = new EmbedBuilder()
    .setTitle('🔺 ESCALAÇÃO CONFIRMADA!')
    .setDescription(`**${jogador.nome}** foi escalado no time titular.\n${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}`)
    .setColor(corPorOverall(jogador.overall))
    .addFields(
      { name: '📍 Posição', value: `${posEmoji} ${posFull}`, inline: true },
      { name: '📊 Overall', value: `\`${jogador.overall}\` OVR`, inline: true },
      { name: '👥 Time Titular', value: `**${titulares.length}/11** titulares`, inline: true }
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
