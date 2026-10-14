const childProcess = require('child_process');

/** Разбирает вывод yt-dlp -j: по одному JSON-объекту в строке, битые строки пропускаются. */
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

/**
 * Обёртка над бинарником yt-dlp: всё, что связано с запуском процесса.
 * Знание о том, что именно искать и как из ответа собрать трек, живёт в экстракторе.
 * spawn подменяется в тестах.
 */
function createYtDlp({ binaryPath = 'yt-dlp', cookiesPath = null, spawn } = {}) {
  const doSpawn = (args, options) => (spawn ?? childProcess.spawn)(binaryPath, args, options);

  // Общие флаги для всех вызовов yt-dlp.
  // --js-runtimes node: для YouTube yt-dlp требует внешний JS-рантайм, а по умолчанию
  // включён только Deno. Node у нас уже есть в образе.
  function baseArgs() {
    const args = ['--js-runtimes', 'node'];
    if (cookiesPath) args.push('--cookies', cookiesPath);
    return args;
  }

  /** Запускает yt-dlp и собирает stdout как текст (для метаданных: -j / --dump-json). */
  function runJson(args) {
    return new Promise((resolve, reject) => {
      const proc = doSpawn([...baseArgs(), ...args], { windowsHide: true });
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

  /** Метаданные как массив объектов. */
  async function runJsonLines(args) {
    return parseJsonLines(await runJson(args));
  }

  /**
   * Аудиопоток лучшего качества: yt-dlp пишет его в stdout, мы отдаём stdout как Readable.
   * Промис резолвится только когда пошли первые байты: если YouTube сразу отказал (403 и т.п.),
   * ошибка уходит в discord-player как ошибка трека, а не теряется внутри уже запущенного потока.
   */
  function createAudioStream(url) {
    const proc = doSpawn(
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

    return new Promise((resolve, reject) => {
      let started = false;
      const fail = (error) => {
        if (started) proc.stdout.emit('error', error);
        else reject(error);
      };

      // 'readable' не забирает данные из потока, в отличие от 'data'. Он же приходит
      // и на конец пустого потока - тогда ждём close с кодом выхода.
      const onReadable = () => {
        if (!proc.stdout.readableLength) return;
        proc.stdout.removeListener('readable', onReadable);
        started = true;
        resolve(proc.stdout);
      };
      proc.stdout.on('readable', onReadable);

      proc.once('error', fail);
      proc.once('close', (code) => {
        proc.stdout.removeListener('readable', onReadable);
        if (code !== 0 && code !== null) {
          const reason = stderr.trim().split('\n').pop() || `код ${code}`;
          console.error(`[yt-dlp stream] код ${code}: ${stderr.slice(-500)}`);
          fail(new Error(`yt-dlp: ${reason.slice(0, 300)}`));
        } else if (!started) {
          fail(new Error('yt-dlp не вернул аудио'));
        }
      });
    });
  }

  return { runJson, runJsonLines, createAudioStream };
}

module.exports = { createYtDlp, parseJsonLines };
