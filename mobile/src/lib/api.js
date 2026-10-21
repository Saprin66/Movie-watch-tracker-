import { API_URL } from "./config";

// Ошибка запроса к нашему серверу: status 0 значит, что сервер недоступен
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Запрос к API сайта. Возвращает разобранный JSON или бросает ApiError
// с текстом ошибки от сервера.
export async function api(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Нет связи с сервером. Проверьте интернет.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `Ошибка сервера (${res.status})`, res.status);
  }
  return data;
}
