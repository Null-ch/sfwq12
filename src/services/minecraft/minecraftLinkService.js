const { HttpError } = require('../../core/http');

/**
 * Клиент к link-server из репозитория minecraft-server (за caddy): отдаёт самый свежий
 * бэкап мира и собранный клиент-пак с модами. Ссылки бессрочные и открытые (без токена
 * и без пароля - доступ по знанию ссылки). Для метаданных/скачивания используются
 * "файловые" пути (/backup/file, /client/file), а пользователю в Discord показывается
 * красивая HTML-страница-заглушка (/backup, /client), которая сама начинает скачивание.
 */
function createMinecraftLinkService({ http, baseUrl }) {
  const configured = Boolean(baseUrl);

  function buildUrl(pathname) {
    return new URL(pathname, baseUrl);
  }

  async function head(filePathname, displayPathname) {
    const fileUrl = buildUrl(filePathname);
    const res = await http.request(fileUrl, { method: 'HEAD' });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new HttpError(`link-server ответил HTTP ${res.status} на ${filePathname}`, {
        url: fileUrl.toString(),
        status: res.status,
      });
    }
    const lastModifiedHeader = res.headers.get('last-modified');
    return {
      url: buildUrl(displayPathname).toString(),
      size: Number(res.headers.get('content-length')) || null,
      lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : null,
    };
  }

  function getBackupInfo() {
    return head('/backup/file', '/backup');
  }

  function getClientPackInfo() {
    return head('/client/file', '/client');
  }

  async function fetchClientPack() {
    const url = buildUrl('/client/file');
    const res = await http.request(url);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new HttpError(`Не удалось скачать клиент-пак: HTTP ${res.status}`, { url: url.toString(), status: res.status });
    }
    return Buffer.from(await res.arrayBuffer());
  }

  return { configured, getBackupInfo, getClientPackInfo, fetchClientPack };
}

module.exports = { createMinecraftLinkService };
