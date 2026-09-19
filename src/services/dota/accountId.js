const STEAM64_BASE = 76561197960265728n;

/**
 * Извлекает числовой account_id из разных форматов: чистое число,
 * ссылка на профиль OpenDota/Dotabuff/Stratz, или SteamID64.
 */
function normalizeAccountId(input) {
  const raw = String(input).trim();

  const urlMatch = raw.match(/(?:players|id)\/(\d+)/i);
  if (urlMatch) return Number(urlMatch[1]);

  if (/^\d+$/.test(raw)) {
    // SteamID64 не помещается в безопасный диапазон Number (2^53-1),
    // поэтому конвертируем через BigInt, чтобы не терять последние цифры.
    const big = BigInt(raw);
    if (big > STEAM64_BASE) {
      return Number(big - STEAM64_BASE);
    }
    return Number(big);
  }

  throw new Error('Не удалось распознать account_id. Передай число или ссылку на профиль OpenDota/Dotabuff.');
}

/** account_id (Steam32) -> SteamID64 строкой. */
function toSteam64(accountId) {
  return (BigInt(accountId) + STEAM64_BASE).toString();
}

module.exports = { normalizeAccountId, toSteam64 };
