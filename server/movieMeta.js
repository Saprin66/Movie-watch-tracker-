// Дополнительные данные записи, нужные для фильтров: год выхода и жанры.
// Приходят от клиента (из ответа TMDB), поэтому проверяются здесь.

const MIN_YEAR = 1870;
const MAX_YEAR = 2100;
const MAX_GENRES = 10;
const MAX_GENRE_LENGTH = 40;

function parseYear(value) {
  return Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR ? value : null;
}

function parseGenres(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = item.trim();
    if (name && name.length <= MAX_GENRE_LENGTH && !result.includes(name)) {
      result.push(name);
    }
    if (result.length === MAX_GENRES) break;
  }
  return result;
}

// body: тело запроса. Возвращает только те поля, которые в нём присутствуют.
function parseMeta(body = {}) {
  const meta = {};
  if (body.releaseYear !== undefined) meta.releaseYear = parseYear(body.releaseYear);
  if (body.genres !== undefined) meta.genres = parseGenres(body.genres);
  return meta;
}

module.exports = { parseMeta, parseYear, parseGenres };
