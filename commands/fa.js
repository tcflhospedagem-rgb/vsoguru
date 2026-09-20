const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { ALLOWED_FA_CHANNELS, ALLOWED_TEAM_ROLES, FA_ANNOUNCEMENT_CHANNEL, ALLOWED_RELEASE_CHANNELS } = require('../config/constants');
const { getTransferWindow } = require('../systems/transferWindow');

async function getRobloxAvatarUrl(username) {
  const userResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
  });

  if (!userResponse.ok) return null;

  const users = await userResponse.json();
  const userId = users.data?.[0]?.id;
  if (!userId) return null;

  const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
  if (!avatarResponse.ok) return null;

  const avatars = await avatarResponse.json();
  return avatars.data?.[0]?.imageUrl ?? null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fa')
    .setDescription('Anunciar que você está Free Agent')
    .addStringOption(opt => opt
      .setName('posicao')
      .setDescription('Sua posição (ex.: GK, CB, CM, ST)')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('informacao')
      .setDescription('Informações como EXP, TCSA, TCSR ou BCS')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('nick_roblox')
      .setDescription('Seu nick no Roblox')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('mensagem')
      .setDescription('Mensagem adicional do seu anúncio')
      .setRequired(false)),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const transferWindow = getTransferWindow();
    if (!transferWindow.freeAgent) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('🚫 Janela de Free Agent Fechada')
            .setDescription('Os anúncios de **Free Agent** estão desativados no momento.\nAguarde a abertura da janela para se anunciar.')
            .setFooter({ text: 'BCS 2K26 • Janela de FA fechada' })
            .setTimestamp()
        ]
      });
    }

    if (!ALLOWED_FA_CHANNELS.includes(interaction.channelId)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('❌ Canal Não Permitido')
            .setDescription(`Este comando só pode ser utilizado em: ${ALLOWED_FA_CHANNELS.map(id => `<#${id}>`).join(', ')}`)
            .setFooter({ text: `ID deste canal: ${interaction.channelId}` })
            .setTimestamp()
        ]
      });
    }

    const hasTeamRole = ALLOWED_TEAM_ROLES.some(id => interaction.member.roles.cache.has(id));
    if (hasTeamRole) {
      return interaction.editReply({
        content: `❌ Você já é de um time! Se quiser sair, use **/release** no canal <#${ALLOWED_RELEASE_CHANNELS[0]}>.`,
      });
    }

    const posicao = interaction.options.getString('posicao');
    const informacao = interaction.options.getString('informacao');
    const nickRoblox = interaction.options.getString('nick_roblox');
    const mensagem = interaction.options.getString('mensagem');
    const userName = interaction.user.username;
    const userId = interaction.user.id;
    let avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });

    try {
      avatarUrl = await getRobloxAvatarUrl(nickRoblox) ?? avatarUrl;
    } catch (err) {
      console.error('❌ Erro ao buscar avatar do Roblox:', err);
    }

    const faEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setAuthor({ name: userName, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .addFields(
        { name: 'POSIÇÃO', value: posicao.toUpperCase(), inline: true },
        { name: 'INFORMAÇÃO', value: informacao, inline: true },
        { name: 'NICK DO ROBLOX', value: nickRoblox, inline: false },
        ...(mensagem ? [{ name: 'MENSAGEM', value: mensagem, inline: false }] : [])
      )
      .setThumbnail(avatarUrl)
      .setFooter({ text: `BCS 2K26 • ${new Date().toLocaleDateString('pt-BR')}` })
      .setTimestamp();

    await interaction.editReply({ content: '✅ Seu anúncio de Free Agent foi publicado!' });

    try {
      const channel = await interaction.guild.channels.fetch(FA_ANNOUNCEMENT_CHANNEL);
      if (channel) {
        await channel.send({ embeds: [faEmbed] });
      }
    } catch (err) {
      console.error('❌ Erro ao enviar FA no canal de anúncios:', err);
    }
  }
};
