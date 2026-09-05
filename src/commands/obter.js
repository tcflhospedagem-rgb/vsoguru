import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { isAdmin, getCooldown, setCooldown, clearCooldown, sortearJogadorPonderado, calcularChancePercentual } from '../utils/helpers.js';
import { buildObterEmbed, buildObterComponents } from '../panels/obterPanel.js';
import { notificarBestPack } from '../utils/notifications.js';

export const data = new SlashCommandBuilder()
  .setName('obter')
  .setDescription('Sorteia um jogador do banco (cooldown: 20min)');

export async function execute(interaction) {
  let dados = carregarDados();
  const userIdStr = interaction.user.id;
  const membro = getMembro(dados, userIdStr);

  // Cooldown persistente
  if (!isAdmin(interaction.member)) {
    const agora = new Date();
    const ultimoUso = getCooldown(membro, 'cooldown_obter');
    if (ultimoUso) {
      const diffMs = agora - ultimoUso;
      const vinteMinMs = 20 * 60 * 1000;
      if (diffMs < vinteMinMs) {
        const restanteMs = vinteMinMs - diffMs;
        const minutos = Math.floor(restanteMs / 60000);
        const segundos = Math.floor((restanteMs % 60000) / 1000);

        const embedCd = new EmbedBuilder()
          .setTitle('⏰ Cooldown Ativo')
          .setDescription(`Aguarde **${minutos}m ${segundos}s** para usar \`/obter\` novamente.`)
          .setColor(0xe67e22)
          .setFooter({ text: 'VSO Guru · Liga' });

        return interaction.reply({ embeds: [embedCd], ephemeral: true });
      }
    }
    setCooldown(membro, 'cooldown_obter', agora);
    salvarDados(dados);
    dados = carregarDados();
  }

  const disponiveis = dados.jogadores_disponiveis || [];
  if (disponiveis.length === 0) {
    const embedErr = new EmbedBuilder()
      .setTitle('Banco Vazio')
      .setDescription('Nenhum jogador disponível.')
      .setColor(0x95a5a6);
    if (!isAdmin(interaction.member)) {
      clearCooldown(membro, 'cooldown_obter');
      salvarDados(dados);
    }
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const membroObj = getMembro(dados, userIdStr);
  const elencoNomes = new Set((membroObj.elenco || []).concat(membroObj.titulares || []).map(j => j.nome.toLowerCase()));
  const disponiveisFiltrados = disponiveis.filter(j => !elencoNomes.has(j.nome.toLowerCase()));

  if (disponiveisFiltrados.length === 0) {
    const embedErr = new EmbedBuilder()
      .setTitle('🏆 Coleção Completa!')
      .setDescription('Você já possui todos os jogadores disponíveis!')
      .setColor(0xffd700);
    if (!isAdmin(interaction.member)) {
      clearCooldown(membroObj, 'cooldown_obter');
      salvarDados(dados);
    }
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const jogador = sortearJogadorPonderado(disponiveisFiltrados);
  const chance = calcularChancePercentual(jogador, disponiveis);

  membroObj.elenco.push(jogador);
  salvarDados(dados);

  const embed = buildObterEmbed(interaction.user, jogador, chance, membroObj.elenco.length);
  const components = buildObterComponents(userIdStr, jogador.nome);

  await interaction.reply({ embeds: [embed], components });

  await notificarBestPack(interaction.client, interaction.user, jogador, 'obter');
}
