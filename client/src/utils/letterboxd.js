// Разбор CSV из экспорта Letterboxd (Settings → Data → Export your data).
// Поддерживаются ratings.csv, watched.csv, diary.csv и watchlist.csv:
// в них есть колонки Name и Year, а в оценках — Rating от 0.5 до 5.

// CSV с кавычками: поля в "..." могут содержать запятые, переносы и "" внутри
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

// Записи для журнала: название, год, статус и оценка по шкале 1–10
export function parseLetterboxd(text, fileName = "") {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const nameCol = col("name");
  const yearCol = col("year");
  const ratingCol = col("rating");
  if (nameCol < 0) return [];
  const status = /watchlist/i.test(fileName) ? "WATCHLIST" : "WATCHED";

  const seen = new Set();
  const result = [];
  for (const r of rows) {
    const title = (r[nameCol] || "").trim();
    if (!title) continue;
    const year = parseInt(r[yearCol], 10) || null;
    const key = `${title.toLowerCase()}|${year}`;
    // В дневнике один фильм может встречаться несколько раз
    if (seen.has(key)) continue;
    seen.add(key);
    const stars = parseFloat(r[ratingCol]);
    const rating = Number.isFinite(stars) && stars > 0 ? Math.min(10, Math.max(1, Math.round(stars * 2))) : undefined;
    result.push({ title, year, status, rating });
  }
  return result;
}
