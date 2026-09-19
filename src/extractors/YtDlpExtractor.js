const { BaseExtractor, QueryType, Track, Playlist, Util } = require('discord-player');
const { createYtDlp } = require('./ytdlp');

const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;
const PLAYLIST_PARAM_RE = /[?&]list=/;

const SEARCH_RESULTS = 5;
const PLAYLIST_LIMIT = 100;

// Типы запросов, которые этот экстрактор готов обработать даже без youtube-ссылки.
const SUPPORTED_QUERY_TYPES = new Set([
  QueryType.YOUTUBE,
  QueryType.YOUTUBE_VIDEO,
  QueryType.YOUTUBE_PLAYLIST,
  QueryType.YOUTUBE_SEARCH,
  QueryType.AUTO,
  QueryType.AUTO_SEARCH,
]);

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  return Util.buildTimeCode(Util.parseMS(seconds * 1000));
}

/**
 * Кастомный экстрактор для YouTube поверх yt-dlp.
 *
 * discord-player перестал поставлять свой YoutubeExtractor начиная с v7,
 * потому что YouTube регулярно ломает JS-реализации извлечения потока.
 * yt-dlp обновляется активнее любой библиотеки под Node.js, поэтому мы
 * делегируем ему и поиск, и получение аудиопотока. Если YouTube снова
 * что-то поменяет - решение одно: обновить бинарник yt-dlp на сервере
 * (`yt-dlp -U` или `pip install -U yt-dlp`), без изменений в коде бота.
 *
 * Запуск yt-dlp приходит через options.ytdlp (см. createYtDlp), поэтому
 * сам экстрактор от процессов и конфигурации не зависит.
 */
class YtDlpExtractor extends BaseExtractor {
  static identifier = 'com.kgk44.ytdlp-extractor';

  async activate() {
    this.ytdlp = this.options?.ytdlp ?? createYtDlp();
    this.protocols = ['ytsearch', 'youtube'];
    // Выше приоритет built-in экстракторов (SoundCloud/Spotify/AppleMusic и т.д.),
    // чтобы обычный текстовый поиск по умолчанию уходил на YouTube.
    this.priority = 10;
  }

  async deactivate() {
    this.protocols = [];
  }

  async validate(query, type) {
    if (typeof query !== 'string') return false;
    if (YOUTUBE_URL_RE.test(query)) return true;
    return SUPPORTED_QUERY_TYPES.has(type);
  }

  emptyResponse() {
    return { playlist: null, tracks: [] };
  }

  trackFromInfo(info, context) {
    const track = new Track(this.context.player, {
      title: info.title || 'Без названия',
      url: info.webpage_url || info.url,
      duration: formatDuration(info.duration),
      description: info.description ?? '',
      thumbnail:
        info.thumbnail ||
        (Array.isArray(info.thumbnails) && info.thumbnails.length
          ? info.thumbnails[info.thumbnails.length - 1].url
          : undefined),
      views: info.view_count ?? 0,
      author: info.uploader || info.channel || 'Неизвестен',
      requestedBy: context.requestedBy,
      source: 'youtube',
      queryType: QueryType.YOUTUBE_VIDEO,
      metadata: info,
      requestMetadata: async () => info,
    });
    track.extractor = this;
    return track;
  }

  /** Ошибка yt-dlp (уже залогированная) для пользователя равна "ничего не найдено". */
  async queryInfo(args) {
    return this.ytdlp.runJsonLines(args).catch(() => []);
  }

  async handle(query, context) {
    if (YOUTUBE_URL_RE.test(query) && !PLAYLIST_PARAM_RE.test(query)) {
      return this.handleVideo(query, context);
    }
    if (PLAYLIST_PARAM_RE.test(query) || context.type === QueryType.YOUTUBE_PLAYLIST) {
      return this.handlePlaylist(query, context);
    }
    return this.handleSearch(query, context);
  }

  /** Прямая ссылка на видео. */
  async handleVideo(url, context) {
    const [info] = await this.queryInfo([url, '-j', '--no-warnings', '--no-playlist', '--skip-download']);
    if (!info) return this.emptyResponse();

    return { playlist: null, tracks: [this.trackFromInfo(info, context)] };
  }

  /** Плейлист: берём только первые PLAYLIST_LIMIT записей (защита от гигантских плейлистов). */
  async handlePlaylist(url, context) {
    const entries = await this.queryInfo([
      url,
      '-j',
      '--no-warnings',
      '--yes-playlist',
      '--flat-playlist',
      '--playlist-end',
      String(PLAYLIST_LIMIT),
      '--skip-download',
    ]);
    if (!entries.length) return this.emptyResponse();

    const playlist = new Playlist(this.context.player, {
      title: entries[0].playlist_title || 'YouTube плейлист',
      description: '',
      thumbnail: entries[0].thumbnails?.[0]?.url,
      type: 'playlist',
      source: 'youtube',
      author: { name: entries[0].playlist_uploader || 'YouTube', url },
      tracks: [],
      id: entries[0].playlist_id || url,
      url,
      rawPlaylist: entries,
    });

    const tracks = entries.map((entry) => {
      const trackUrl = entry.url?.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id}`;
      const track = this.trackFromInfo({ ...entry, webpage_url: trackUrl }, context);
      track.playlist = playlist;
      return track;
    });
    playlist.tracks = tracks;

    return { playlist, tracks };
  }

  /** Текстовый поиск. */
  async handleSearch(query, context) {
    const searchQuery = query.replace(/^ytsearch:?/i, '').trim();
    const entries = await this.queryInfo([
      `ytsearch${SEARCH_RESULTS}:${searchQuery}`,
      '-j',
      '--no-warnings',
      '--skip-download',
    ]);
    if (!entries.length) return this.emptyResponse();

    return { playlist: null, tracks: entries.map((info) => this.trackFromInfo(info, context)) };
  }

  async stream(track) {
    return this.ytdlp.createAudioStream(track.url);
  }

  /**
   * Вызывается фреймворком, когда трек из другого экстрактора (например Spotify,
   * который сам по себе не умеет отдавать аудио) нужно "мостом" перенаправить
   * на источник, который реально может стримить звук - в нашем случае YouTube.
   */
  async bridge(track, sourceExtractor) {
    if (sourceExtractor?.identifier === this.identifier) {
      return this.stream(track);
    }

    const query = sourceExtractor?.createBridgeQuery
      ? sourceExtractor.createBridgeQuery(track)
      : `${track.author} - ${track.title}`;

    const info = await this.handle(query, {
      type: QueryType.YOUTUBE_SEARCH,
      requestedBy: track.requestedBy,
    });

    if (!info.tracks.length) return null;

    const bridgedTrack = info.tracks[0];
    const result = await this.stream(bridgedTrack);

    if (result) {
      track.bridgedTrack = bridgedTrack;
      track.bridgedExtractor = this;
    }

    return result;
  }

  async getRelatedTracks(track) {
    const info = await this.handle(`${track.author} ${track.title}`, {
      type: QueryType.YOUTUBE_SEARCH,
      requestedBy: track.requestedBy,
    }).catch(() => this.emptyResponse());

    return this.createResponse(
      null,
      info.tracks.filter((t) => t.url !== track.url).slice(0, 5),
    );
  }
}

module.exports = { YtDlpExtractor };
