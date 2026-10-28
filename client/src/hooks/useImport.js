import { useState } from "react";
import { API_URL, POSTER, TMDB, TMDB_API_KEY } from "../config";
import { metaFromTmdb } from "../utils/genres";
import { tmdbToEntry } from "../utils/journal";
import { parseLetterboxd } from "../utils/letterboxd";

const pause = () => new Promise((resolve) => setTimeout(resolve, 250));

// Строки файла «Название 8» → просмотрено с оценкой, «Название» → буду смотреть
function parseTextList(text) {
  const cleanText = text
    .replace(/^\uFEFF/, "")
    .replace(/\uFEFF|\u200B|\u200C|\u200D|\u00A0|\u202F|\u2060/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const parsed = [];
  for (const line of cleanText.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.toLowerCase() === "фильмы") continue;
    const ratingMatch = line.match(/\s+(\d+[.,]\d+|\d+)\s*(?:\/\s*\d+)?\s*$/);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1].replace(",", "."));
      const title = line.replace(ratingMatch[0], "").trim();
      if (title && rating >= 1 && rating <= 10) parsed.push({ title, status: "WATCHED", rating });
      else if (title) parsed.push({ title, status: "WATCHLIST" });
    } else {
      const title = line.replace(/\s*[+]+\s*$/, "").trim();
      if (title) parsed.push({ title, status: "WATCHLIST" });
    }
  }
  return parsed;
}

async function readFileText(file) {
  if (file.name.toLowerCase().endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const extractRawText = mammoth.extractRawText || mammoth.default.extractRawText;
    const result = await extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  return file.text();
}

// Импорт журнала из файла (.docx/.txt со списком) и из экспорта Letterboxd
export function useImport({ token, movies, setMovies, fetchMovies }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  const post = (body) =>
    fetch(`${API_URL}/api/movies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

  // Общий ход импорта: entries по одному сопоставляются с TMDB через importOne
  const run = async (event, parse, importOne, label) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setProgress({ current: 0, total: 0 });
    setResult(null);
    const outcome = { success: [], failed: [], skipped: [] };
    try {
      const entries = await parse(file);
      if (!entries) return;
      setProgress({ current: 0, total: entries.length });
      for (let i = 0; i < entries.length; i++) {
        try {
          await importOne(entries[i], outcome);
        } catch (err) {
          console.error(`Ошибка импорта${label}:`, entries[i].title, err);
          outcome.failed.push({ title: entries[i].title });
        }
        setProgress((prev) => ({ ...prev, current: i + 1 }));
        await pause();
      }
      await fetchMovies();
      setResult(outcome);
    } catch (error) {
      console.error(`Ошибка импорта${label}:`, error);
      alert(`Ошибка при чтении файла: ${error.message}`);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const importTextFile = (event) =>
    run(
      event,
      async (file) => {
        const entries = parseTextList(await readFileText(file));
        if (entries.length === 0) {
          alert("Не удалось найти фильмы в файле.");
          return null;
        }
        return entries;
      },
      async ({ title, status, rating }, outcome) => {
        const res = await fetch(
          `${TMDB}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=ru-RU`,
        );
        const data = await res.json();
        const item = (data.results || []).find((r) => r.media_type === "movie" || r.media_type === "tv");
        if (!item) {
          outcome.failed.push({ title });
          return;
        }
        const itemTitle = item.title || item.name;
        if (movies.some((m) => m.tmdbId === item.id && m.mediaType === item.media_type)) {
          outcome.skipped.push({ title, tmdbTitle: itemTitle });
          return;
        }
        await post({
          tmdbId: item.id,
          title: itemTitle,
          posterUrl: item.poster_path ? `${POSTER}${item.poster_path}` : null,
          status,
          rating,
          mediaType: item.media_type,
          ...metaFromTmdb(item),
        });
        outcome.success.push({ title, tmdbTitle: itemTitle, status, mediaType: item.media_type });
        // Сразу в журнал, чтобы повтор в том же файле считался пропущенным
        setMovies((prev) => [...prev, { tmdbId: item.id, title: itemTitle, status, mediaType: item.media_type }]);
      },
      "",
    );

  // Импорт из Letterboxd (ранний доступ Brilliant): CSV из экспорта Letterboxd
  const importLetterboxd = (event) =>
    run(
      event,
      async (file) => {
        const entries = parseLetterboxd(await file.text(), file.name);
        if (entries.length === 0) {
          alert("Не удалось найти фильмы в файле. Загрузи ratings.csv, watched.csv, diary.csv или watchlist.csv из экспорта Letterboxd.");
          return null;
        }
        return entries;
      },
      async ({ title, year, status, rating }, outcome) => {
        const params = new URLSearchParams({ api_key: TMDB_API_KEY, query: title, language: "ru-RU" });
        if (year) params.set("year", String(year));
        const res = await fetch(`${TMDB}/search/movie?${params}`);
        const data = await res.json();
        const item = (data.results || [])[0];
        if (!item) {
          outcome.failed.push({ title });
        } else if (movies.some((m) => m.tmdbId === item.id && m.mediaType !== "tv")) {
          outcome.skipped.push({ title, tmdbTitle: item.title });
        } else {
          await post({
            ...tmdbToEntry({ ...item, media_type: "movie" }, status),
            ...(rating ? { rating } : {}),
          });
          outcome.success.push({ title, tmdbTitle: item.title, status, mediaType: "movie" });
        }
      },
      " из Letterboxd",
    );

  return {
    importing,
    progress,
    result,
    closeResult: () => setResult(null),
    importTextFile,
    importLetterboxd,
  };
}
