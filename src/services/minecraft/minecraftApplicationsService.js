const { HttpError } = require('../../core/http');

/**
 * Клиент к API заявок link-server (/api/applications): заявки подаются с сайта или
 * через /minecraft apply, одобряются кнопками в личке. Одобрение добавляет ник в
 * whitelist - это делает сам link-server через RCON, бот к Minecraft напрямую не ходит.
 */
function createMinecraftApplicationsService({ http, baseUrl, apiToken }) {
  const configured = Boolean(baseUrl && apiToken);

  async function call(pathname, { method, json } = {}) {
    const url = new URL(pathname, baseUrl);
    const res = await http.request(url, { method, json });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error = new HttpError(data?.error || `link-server ответил HTTP ${res.status}`, {
        url: url.toString(),
        status: res.status,
      });
      // 409 на решение - заявку уже рассмотрели; в ответе её актуальное состояние.
      error.application = data?.application ?? null;
      throw error;
    }
    return data;
  }

  return {
    configured,
    listPending: () => call('/api/applications?status=pending'),
    create: ({ nickname, comment, discordUserId, discordTag }) =>
      call('/api/applications', {
        method: 'POST',
        json: { nickname, comment, contact: `Discord: ${discordTag}`, discordUserId, discordTag },
      }),
    /** decision: 'approve' | 'reject' */
    decide: (id, decision, decidedBy) =>
      call(`/api/applications/${encodeURIComponent(id)}/${decision}`, { method: 'POST', json: { decidedBy } }),
  };
}

module.exports = { createMinecraftApplicationsService };
