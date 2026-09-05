import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, salvarDados, getMembro } from '../database/db.js';
import { fmtReais, getCooldown, setCooldown } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Resgate R$ 25.000 diários (cooldown: 24h)');

export async function execute(interaction) {
  const dados = carregarDados();
  const userIdStr = interaction.user.id;
  const membro = getMembro(dados, userIdStr);
  const agora = new Date();

  const ultimoUso = getCooldown(membro, 'cooldown_daily');
  if (ultimoUso) {
    const diffMs = agora - ultimoUso;
    const vinteQuatroHorasMs = 24 * 60 * 60 * 1000;
    if (diffMs < vinteQuatroHorasMs) {
      const restanteMs = vinteQuatroHorasMs - diffMs;
      const horas = Math.floor(restanteMs / 3600000);
      const minutos = Math.floor((restanteMs % 3600000) / 60000);
      const segundos = Math.floor((restanteMs % 60000) / 1000);

      const embedCd = new EmbedBuilder()
        .setTitle('⏰ Daily já resgatado!')
        .setDescription(`Volte em **${horas}h ${minutos}m ${segundos}s**.`)
        .setColor(0xe67e22)
        .setFooter({ text: 'VSO Guru · Liga' });

      return interaction.reply({ embeds: [embedCd], ephemeral: true });
    }
  }

  setCooldown(membro, 'cooldown_daily', agora);
  const bonus = 25000;
  membro.saldo = (membro.saldo || 0) + bonus;
  salvarDados(dados);

  const embed = new EmbedBuilder()
    .setTitle('💰 Daily Resgatado!')
    .setDescription(`Você recebeu **${fmtReais(bonus)}** na sua carteira!\n\nVolte amanhã para resgatar novamente.`)
    .setColor(0xffd700)
    .addFields(
      { name: 'Valor recebido', value: fmtReais(bonus), inline: true },
      { name: 'Novo saldo', value: fmtReais(membro.saldo), inline: true }
    )
    .setAuthor({
      name: interaction.user.displayName || interaction.user.username,
      iconURL: interaction.user.displayAvatarURL()
    })
    .setFooter({
      text: `VSO Guru · ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    });

  await interaction.reply({ embeds: [embed] });
}
