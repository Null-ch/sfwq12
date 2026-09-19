/** "Moscow, Kyiv,,  " -> ['Moscow', 'Kyiv'] */
function parseList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = { parseList };
