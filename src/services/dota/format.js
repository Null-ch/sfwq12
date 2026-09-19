function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} мин`;
  return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

module.exports = { formatMinutes };
