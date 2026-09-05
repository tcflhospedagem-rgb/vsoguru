import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { carregarDados, getMembro } from '../database/db.js';
import { corPorOverall, estrelasOverall, POSICAO_FULL } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('elenco')
  .setDescription('Mostra o elenco titular')
  .addUserOption(option =>
    option.setName('membro')
      .setDescription('Ver elenco de outro membro (opcional)')
      .setRequired(false));

export async function execute(interaction) {
  const dados = carregarDados();
  const alvo = interaction.options.getUser('membro') || interaction.user;
  const alvoMember = await interaction.guild?.members.fetch(alvo.id).catch(() => null);
  const alvoName = alvoMember?.displayName || alvo.username;

  const membroDados = getMembro(dados, alvo.id);
  const titulares = membroDados.titulares || [];
  const timeNome = membroDados.time_nome || `Time de ${alvoName}`;
  const timeSigla = membroDados.time_sigla || '???';

  if (titulares.length === 0) {
    const embedErr = new EmbedBuilder()
      .setTitle('Sem titulares')
      .setDescription('Nenhum titular definido.')
      .setColor(0x95a5a6);
    return interaction.reply({ embeds: [embedErr], ephemeral: true });
  }

  const somaOvr = titulares.reduce((acc, j) => acc + j.overall, 0);
  const media = Number((somaOvr / titulares.length).toFixed(1));

  const embed = new EmbedBuilder()
    .setTitle(`${timeNome} · ${timeSigla}`)
    .setDescription(`${titulares.length}/11 titulares · OVR médio: ${media}\n${estrelasOverall(Math.floor(media))}`)
    .setColor(corPorOverall(Math.floor(media)))
    .setAuthor({
      name: alvoName,
      iconURL: alvo.displayAvatarURL()
    })
    .setFooter({
      text: `VSO Guru · Liga · ${new Date().toLocaleDateString('pt-BR')}`
    });

  const posicoesOrdem = ['GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MEI', 'ATA'];
  const grupos = {};
  for (const j of titulares) {
    if (!grupos[j.posicao]) grupos[j.posicao] = [];
    grupos[j.posicao].push(j);
  }

  for (const pos of posicoesOrdem) {
    if (grupos[pos]) {
      const posFull = POSICAO_FULL[pos] || pos;
      const linhas = grupos[pos].map(j => `${j.overall} ${estrelasOverall(j.overall)} ${j.nome} — ${j.clube}`);
      embed.addFields({
        name: posFull,
        value: linhas.join('\n'),
        inline: false
      });
    }
  }

  await interaction.reply({ embeds: [embed] });
}
