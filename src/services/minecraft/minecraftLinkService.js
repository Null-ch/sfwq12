const { HttpError } = require('../../core/http');

/**
 * Клиент к link-server из репозитория minecraft-server: отдаёт по токену самый свежий
 * бэкап мира (/latest) и собранный клиент-пак с модами (/client). Ссылки бессрочные -
 * link-server сам резолвит "самое свежее" на момент запроса, здесь только HTTP-обвязка.
 */
function createMinecraftLinkService({ http, baseUrl, token }) {
  const configured = Boolean(baseUrl && token);

  function buildUrl(pathname) {
    const url = new URL(pathname, baseUrl);
    url.searchParams.set('token', token);
    return url;
  }

  async function head(pathname) {
    const url = buildUrl(pathname);
    const res = await http.request(url, { method: 'HEAD' });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new HttpError(`link-server ответил HTTP ${res.status} на ${pathname}`, {
        url: url.toString(),
        status: res.status,
      });
    }
    const lastModifiedHeader = res.headers.get('last-modified');
    return {
      url: url.toString(),
      size: Number(res.headers.get('content-length')) || null,
      lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : null,
    };
  }

  function getBackupInfo() {
    return head('/latest');
  }

  function getClientPackInfo() {
    return head('/client');
  }

  async function fetchClientPack() {
    const url = buildUrl('/client');
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
