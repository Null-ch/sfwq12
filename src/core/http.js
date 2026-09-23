const { setTimeout: sleep } = require('node:timers/promises');

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
 * retries - сколько раз повторить getJson при временном сбое (5xx, 429, сеть/таймаут);
 * пауза между попытками растёт линейно: retryDelayMs, 2*retryDelayMs, ...
 */
function createHttpClient({ fetchImpl, headers, timeoutMs, errorMessage, retries = 0, retryDelayMs = 1000 } = {}) {
  const describeError = errorMessage ?? ((url, status) => `HTTP ${status}: ${url}`);

  /** Сырой запрос: статус не проверяется. json - тело запроса, отправляется как JSON. */
  function request(url, { method, json } = {}) {
    const doFetch = fetchImpl ?? globalThis.fetch;
    return doFetch(url, {
      ...(method && { method }),
      headers: json === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
      ...(json !== undefined && { body: JSON.stringify(json) }),
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  }

  async function getJsonOnce(url) {
    const res = await request(url);
    if (!res.ok) {
      throw new HttpError(describeError(url, res.status), { url, status: res.status });
    }
    return res.json();
  }

  async function getJson(url) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await getJsonOnce(url);
      } catch (error) {
        if (attempt >= retries || !isTransient(error)) throw error;
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  return { request, getJson };
}

/** Ошибки, которые имеет смысл повторить: сбой на стороне сервера, лимит запросов, сеть/таймаут. */
function isTransient(error) {
  if (error instanceof HttpError) return error.status >= 500 || error.status === 429;
  // fetch кидает TypeError при сетевой ошибке и TimeoutError при срабатывании AbortSignal.timeout
  return error?.name === 'TypeError' || error?.name === 'TimeoutError';
}

module.exports = { createHttpClient, HttpError };
