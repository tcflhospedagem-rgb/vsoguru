import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, removerDuplicatasElenco, criarBackup } from '../database/db.js';
import { isAdmin } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('limpar_duplicatas')
  .setDescription('[ADM] Remove jogadores duplicados dos elencos');

export async function execute(interaction) {
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
  }

  const dados = carregarDados(true);
  let totalRemovidos = 0;

  for (const [userId, membro] of Object.entries(dados.membros || {})) {
    const antesElenco = (membro.elenco || []).length;
    const antesTitulares = (membro.titulares || []).length;

    membro.elenco = removerDuplicatasElenco(membro.elenco || []);
    membro.titulares = removerDuplicatasElenco(membro.titulares || []);

    const depoisElenco = membro.elenco.length;
    const depoisTitulares = membro.titulares.length;

    totalRemovidos += (antesElenco - depoisElenco) + (antesTitulares - depoisTitulares);
  }

  salvarDados(dados);
  criarBackup();

  const embed = new EmbedBuilder()
    .setTitle('✅ Limpeza Concluída')
    .setDescription(`**${totalRemovidos}** duplicatas removidas.\nBackup criado automaticamente.`)
    .setColor(0x2ecc71)
    .setFooter({
      text: `VSO Guru · ADM · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
