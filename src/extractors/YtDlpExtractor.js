const { spawn } = require('child_process');
const {
  BaseExtractor,
  QueryType,
  Track,
  Playlist,
  Util,
} = require('discord-player');
const config = require('../config');

const YOUTUBE_URL_RE = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;

// Общие флаги для всех вызовов yt-dlp.
// --js-runtimes node: для YouTube yt-dlp требует внешний JS-рантайм, а по умолчанию
// включён только Deno. Node у нас уже есть в образе.
function baseArgs() {
  const args = ['--js-runtimes', 'node'];
  if (config.ytdlp.cookiesPath) args.push('--cookies', config.ytdlp.cookiesPath);
  return args;
}

/**
 * Запускает yt-dlp и собирает stdout как текст (используется для метаданных: -j / --dump-json).
 */
function runYtDlpJson(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.ytdlp.binaryPath, [...baseArgs(), ...args], { windowsHide: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => (stdout += chunk));
    proc.stderr.on('data', (chunk) => (stderr += chunk));

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        const error = new Error(`yt-dlp завершился с кодом ${code}: ${stderr.slice(0, 500)}`);
        console.error('[yt-dlp]', error.message);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

function parseJsonLines(stdout) {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

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
 */
class YtDlpExtractor extends BaseExtractor {
  static identifier = 'com.kgk44.ytdlp-extractor';

  async activate() {
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
    return [
      QueryType.YOUTUBE,
      QueryType.YOUTUBE_VIDEO,
      QueryType.YOUTUBE_PLAYLIST,
      QueryType.YOUTUBE_SEARCH,
      QueryType.AUTO,
      QueryType.AUTO_SEARCH,
    ].includes(type);
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

  async handle(query, context) {
    // Прямая ссылка на видео
    if (YOUTUBE_URL_RE.test(query) && !/[?&]list=/.test(query)) {
      const stdout = await runYtDlpJson([
        query,
        '-j',
        '--no-warnings',
        '--no-playlist',
        '--skip-download',
      ]).catch(() => null);
      if (!stdout) return this.emptyResponse();

      const [info] = parseJsonLines(stdout);
      if (!info) return this.emptyResponse();

      return { playlist: null, tracks: [this.trackFromInfo(info, context)] };
    }

    // Плейлист
    if (/[?&]list=/.test(query) || context.type === QueryType.YOUTUBE_PLAYLIST) {
      const stdout = await runYtDlpJson([
        query,
        '-j',
        '--no-warnings',
        '--yes-playlist',
        '--flat-playlist',
        '--playlist-end',
        '100',
        '--skip-download',
      ]).catch(() => null);
      if (!stdout) return this.emptyResponse();

      const entries = parseJsonLines(stdout);
      if (!entries.length) return this.emptyResponse();

      const playlist = new Playlist(this.context.player, {
        title: entries[0].playlist_title || 'YouTube плейлист',
        description: '',
        thumbnail: entries[0].thumbnails?.[0]?.url,
        type: 'playlist',
        source: 'youtube',
        author: { name: entries[0].playlist_uploader || 'YouTube', url: query },
        tracks: [],
        id: entries[0].playlist_id || query,
        url: query,
        rawPlaylist: entries,
      });

      const tracks = entries.map((entry) => {
        const url = entry.url?.startsWith('http')
          ? entry.url
          : `https://www.youtube.com/watch?v=${entry.id}`;
        const track = this.trackFromInfo({ ...entry, webpage_url: url }, context);
        track.playlist = playlist;
        return track;
      });
      playlist.tracks = tracks;

      return { playlist, tracks };
    }

    // Текстовый поиск
    const searchQuery = query.replace(/^ytsearch:?/i, '').trim();
    const stdout = await runYtDlpJson([
      `ytsearch5:${searchQuery}`,
      '-j',
      '--no-warnings',
      '--skip-download',
    ]).catch(() => null);
    if (!stdout) return this.emptyResponse();

    const entries = parseJsonLines(stdout);
    if (!entries.length) return this.emptyResponse();

    const tracks = entries.map((info) => this.trackFromInfo(info, context));
    return { playlist: null, tracks };
  }

  async stream(track) {
    return this.createReadableStream(track.url);
  }

  createReadableStream(url) {
    const proc = spawn(
      config.ytdlp.binaryPath,
      [
        ...baseArgs(),
        url,
        '-f',
        'bestaudio[acodec!=none]/bestaudio/best',
        '-o',
        '-',
        '--quiet',
        '--no-warnings',
        '--no-playlist',
        '--no-part',
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    proc.stdout.once('close', () => {
      if (!proc.killed) proc.kill('SIGKILL');
    });
    proc.stdout.once('error', () => {
      if (!proc.killed) proc.kill('SIGKILL');
    });

    proc.once('error', (err) => {
      proc.stdout.emit('error', err);
    });
    proc.once('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[yt-dlp stream] код ${code}: ${stderr.slice(-500)}`);
        proc.stdout.emit('error', new Error(`yt-dlp завершился с кодом ${code}: ${stderr.slice(-500)}`));
      }
    });

    return proc.stdout;
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

  async getRelatedTracks(track, context) {
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
