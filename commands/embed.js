const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Cria um embed personalizado com as opções da imagem.')
    .addStringOption(option =>
      option.setName('descricao')
        .setDescription('Descrição principal do embed')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal onde o embed será enviado')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('titulo')
        .setDescription('Título do embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('cor')
        .setDescription('Cor do embed em HEX (ex.: FF0000 ou #FF0000)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('mencionar')
        .setDescription('Tipo de menção para incluir no embed')
        .setRequired(false)
        .addChoices(
          { name: 'Nenhum', value: 'none' },
          { name: '@everyone', value: 'everyone' },
          { name: '@here', value: 'here' }
        )
    )
    .addStringOption(option =>
      option.setName('imagem_url')
        .setDescription('URL da imagem principal do embed')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('imagem_anexo')
        .setDescription('Arquivo para usar como imagem do embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('thumb_url')
        .setDescription('URL da thumbnail do embed')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('thumb_anexo')
        .setDescription('Arquivo para usar como thumbnail do embed')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allowedUserId = '1192943976018350261';

    if (interaction.user.id !== allowedUserId) {
      return interaction.editReply({
        content: '❌ Você não tem permissão para usar este comando.'
      });
    }

    const targetChannel = interaction.options.getChannel('canal') ?? interaction.channel;
    const title = interaction.options.getString('titulo');
    const description = interaction.options.getString('descricao');
    const color = interaction.options.getString('cor');
    const mentionChoice = interaction.options.getString('mencionar');
    const imageUrl = interaction.options.getString('imagem_url');
    const thumbUrl = interaction.options.getString('thumb_url');
    const imageAttachment = interaction.options.getAttachment('imagem_anexo');
    const thumbAttachment = interaction.options.getAttachment('thumb_anexo');

    if (!targetChannel || !targetChannel.send) {
      return interaction.editReply({
        content: '❌ Canal inválido para enviar o embed.'
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(description);

    if (title) {
      embed.setTitle(title);
    }

    if (color) {
      embed.setColor(color);
    }

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    if (imageAttachment) {
      embed.setImage(imageAttachment.url);
    }

    if (thumbUrl) {
      embed.setThumbnail(thumbUrl);
    }

    if (thumbAttachment) {
      embed.setThumbnail(thumbAttachment.url);
    }

    const payload = { embeds: [embed] };

    if (mentionChoice === 'everyone') {
      payload.content = '@everyone';
    } else if (mentionChoice === 'here') {
      payload.content = '@here';
    }

    await targetChannel.send(payload);

    return interaction.editReply({
      content: `✅ Embed enviado em ${targetChannel}.`
    });
  }
};
