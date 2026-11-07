import { API_URL } from "../config";

// Запрос к API. Возвращает { ok, status, data, error } и не бросает ошибок.
// token можно не передавать для открытых запросов (публичный профиль).
export async function apiRequest(path, { token, method = "GET", body } = {}) {
  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data.error || "Ошибка сервера" };
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, error: "Нет связи с сервером" };
  }
}

// Ссылка на публичную страницу профиля
export const publicProfileUrl = (username) =>
  `${window.location.origin}/#/u/${encodeURIComponent(username)}`;
