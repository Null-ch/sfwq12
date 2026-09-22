const UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];

/** 55403 -> "54.1 КБ" */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'неизвестно';
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${UNITS[unitIndex]}`;
}

module.exports = { formatBytes };
