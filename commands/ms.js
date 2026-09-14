const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ms')
    .setDescription('Envia uma mensagem simples em um canal específico.')
    .addStringOption(option =>
      option.setName('mensagem')
        .setDescription('Texto da mensagem')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal para enviar a mensagem')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allowedUserId = '1192943976018350261';

    if (interaction.user.id !== allowedUserId) {
      return interaction.editReply({
        content: '❌ Você não tem permissão para usar este comando.'
      });
    }

    const mensagem = interaction.options.getString('mensagem');
    const canal = interaction.options.getChannel('canal');

    if (!canal || !canal.send) {
      return interaction.editReply({
        content: '❌ Canal inválido.'
      });
    }

    await canal.send(mensagem);

    return interaction.editReply({
      content: `✅ Mensagem enviada em ${canal}.`
    });
  }
};
