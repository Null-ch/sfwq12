// GamerPower.com: используется только ради срока окончания раздач Steam -
// сам Steam его не отдаёт. Наличие раздачи по этим данным не определяется.

const normalizeTitle = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

function createGamerPowerClient({ http }) {
  /** Карта "название -> дата окончания". При сбое возвращает пустую карту: срок - не критичные данные. */
  async function fetchEndDates() {
    try {
      const list = await http.getJson('https://www.gamerpower.com/api/giveaways?platform=steam&type=game');
      const dates = new Map();
      for (const g of Array.isArray(list) ? list : []) {
        if (!/^\d{4}-\d{2}-\d{2} /.test(g.end_date ?? '')) continue; // "N/A" - без срока
        const title = g.title.replace(/\s*\(Steam\)\s*(Key\s*)?Giveaway\s*$/i, '');
        // GamerPower отдаёт "YYYY-MM-DD HH:mm:ss" в UTC.
        dates.set(normalizeTitle(title), new Date(g.end_date.replace(' ', 'T') + 'Z'));
      }
      return dates;
    } catch (error) {
      console.error('[free-games] не удалось получить сроки раздач Steam:', error.message);
      return new Map();
    }
  }

  return { fetchEndDates };
}

module.exports = { createGamerPowerClient, normalizeTitle };
