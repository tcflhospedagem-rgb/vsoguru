import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados } from '../database/db.js';
import { isAdmin } from '../utils/helpers.js';
import { buildSetarPanel } from '../panels/setarPanel.js';

export const data = new SlashCommandBuilder()
  .setName('setar')
  .setDescription('[ADM] Adiciona um jogador ao elenco de um membro')
  .addStringOption(option =>
    option.setName('nome')
      .setDescription('Nome do jogador')
      .setAutocomplete(true)
      .setRequired(true));

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];
  const filtrados = disponiveis
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
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
  }

  const nome = interaction.options.getString('nome');
  const dados = carregarDados();
  const disponiveis = dados.jogadores_disponiveis || [];

  if (disponiveis.length === 0) {
    const embedErr = new EmbedBuilder().setTitle('❌ Banco Vazio').setColor(0xe74c3c);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const jogador = disponiveis.find(j => j.nome.toLowerCase() === nome.toLowerCase()) ||
                  disponiveis.find(j => j.nome.toLowerCase().includes(nome.toLowerCase()));

  if (!jogador) {
    const sugestoes = disponiveis
      .filter(j => j.nome.toLowerCase().startsWith(nome.toLowerCase()[0]))
      .slice(0, 5);
    const sugestoesTexto = sugestoes.length > 0
      ? sugestoes.map(s => `• ${s.nome}`).join('\n')
      : 'Nenhuma sugestão.';

    const embedErr = new EmbedBuilder()
      .setTitle('❌ Não Encontrado')
      .setDescription(`**${nome}** não está no banco.\n\n**Sugestões:**\n${sugestoesTexto}`)
      .setColor(0xe74c3c);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const { embed, components } = buildSetarPanel(interaction.user, jogador);
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}
