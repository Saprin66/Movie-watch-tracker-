import { API_URL, POSTER } from "../config";

// Запросы к общим спискам. Возвращают { ok, data, error }.
export async function listsRequest(token, path = "", { method = "GET", body } = {}) {
  try {
    const res = await fetch(`${API_URL}/api/lists${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.error || "Ошибка сервера" };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, error: "Нет связи с сервером" };
  }
}

// Данные фильма TMDB в формате, который ждёт сервер
export function itemFromTmdb(movie) {
  const mediaType = movie.media_type === "tv" || movie.mediaType === "tv" ? "tv" : "movie";
  const year = Number(
    (movie.release_date || movie.first_air_date || "").slice(0, 4) || movie.releaseYear || movie.year,
  );
  return {
    tmdbId: Number(movie.tmdbId ?? movie.id),
    mediaType,
    title: movie.title || movie.name,
    posterUrl: movie.posterUrl || (movie.poster_path ? `${POSTER}${movie.poster_path}` : null),
    releaseYear: Number.isInteger(year) && year > 0 ? year : null,
  };
}
