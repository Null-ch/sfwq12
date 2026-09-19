const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Включить трек/плейлист (YouTube, Spotify, SoundCloud) или добавить его в очередь')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Название трека, или ссылка на YouTube / Spotify / SoundCloud')
        .setRequired(true),
    ),

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;
    if (!channel) {
      return interaction.reply({
        content: '❌ Зайди сначала в голосовой канал.',
        ephemeral: true,
      });
    }

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    const player = useMainPlayer();

    try {
      const { track, queue } = await player.play(channel, query, {
        nodeOptions: {
          metadata: { textChannel: interaction.channel },
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 5 * 60_000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 5 * 60_000,
          volume: 50,
          selfDeaf: true,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setDescription(
          queue.currentTrack === track
            ? `▶️ Играю: **[${track.title}](${track.url})** — \`${track.duration}\``
            : `➕ Добавлено в очередь: **[${track.title}](${track.url})** — \`${track.duration}\``,
        )
        .setThumbnail(track.thumbnail || null)
        .setFooter({ text: `Запросил: ${interaction.user.tag}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Ошибка /play:', error);
      await interaction.editReply(
        `❌ Не получилось найти или воспроизвести это: \`${error.message}\``,
      );
    }
  },
};
