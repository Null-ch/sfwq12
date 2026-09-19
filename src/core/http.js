class HttpError extends Error {
  constructor(message, { url, status }) {
    super(message);
    this.name = 'HttpError';
    this.url = url;
    this.status = status;
  }
}

/**
 * Тонкая обёртка над fetch: общие заголовки, таймаут и единая обработка HTTP-ошибок.
 * Текст ошибки задаёт вызывающий сервис (errorMessage), т.к. он показывается пользователю
 * и у каждого API свой. fetchImpl подменяется в тестах; по умолчанию берётся глобальный fetch.
 */
function createHttpClient({ fetchImpl, headers, timeoutMs, errorMessage } = {}) {
  const describeError = errorMessage ?? ((url, status) => `HTTP ${status}: ${url}`);

  /** Сырой запрос: статус не проверяется. */
  function request(url, { method } = {}) {
    const doFetch = fetchImpl ?? globalThis.fetch;
    return doFetch(url, {
      ...(method && { method }),
      headers,
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  }

  async function getJson(url) {
    const res = await request(url);
    if (!res.ok) {
      throw new HttpError(describeError(url, res.status), { url, status: res.status });
    }
    return res.json();
  }

  return { request, getJson };
}

module.exports = { createHttpClient, HttpError };
