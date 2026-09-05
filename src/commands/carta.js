import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, getMembro } from '../database/db.js';
import { fmtReais, corPorOverall, medalhaOverall, estrelasOverall, POSICAO_FULL } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('carta')
  .setDescription('Mostra a carta de um jogador do seu elenco')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do jogador')
      .setAutocomplete(true)
      .setRequired(true));

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const dados = carregarDados();
  const membro = getMembro(dados, interaction.user.id);
  const todos = (membro.elenco || []).concat(membro.titulares || []);

  const vistos = new Set();
  const unicos = [];
  for (const j of todos) {
    const chave = `${j.nome.toLowerCase()}_${j.overall}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      unicos.push(j);
    }
  }

  const filtrados = unicos
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
  const todos = (membro.elenco || []).concat(membro.titulares || []);

  const jogador = todos.find(j => j.nome.toLowerCase() === nome.toLowerCase());
  if (!jogador) {
    const embedErr = new EmbedBuilder()
      .setTitle('Não encontrado')
      .setDescription(`${nome} não está no seu elenco.`)
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const posFull = POSICAO_FULL[jogador.posicao] || jogador.posicao;
  const ehTitular = (membro.titulares || []).some(j => j.nome.toLowerCase() === nome.toLowerCase());

  const embed = new EmbedBuilder()
    .setTitle(jogador.nome)
    .setDescription(`${medalhaOverall(jogador.overall)} · ${estrelasOverall(jogador.overall)}\n${ehTitular ? '[ TITULAR ]' : 'Reserva'}`)
    .setColor(corPorOverall(jogador.overall))
    .addFields(
      { name: 'Posição', value: posFull, inline: true },
      { name: 'Overall', value: `${jogador.overall}`, inline: true },
      { name: 'Clube', value: jogador.clube, inline: true },
      { name: 'Valor de Mercado', value: fmtReais(jogador.preco), inline: true }
    )
    .setAuthor({
      name: interaction.user.displayName || interaction.user.username,
      iconURL: interaction.user.displayAvatarURL()
    })
    .setFooter({ text: 'VSO Guru · Liga' });

  if (jogador.imagem) {
    embed.setImage(jogador.imagem);
  }

  await interaction.reply({ embeds: [embed] });
}
