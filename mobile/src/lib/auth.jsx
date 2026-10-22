import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { storage } from "./storage";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { unregisterPush } from "./push";

const TOKEN_KEY = "token";
const AuthContext = createContext(null);

// Вход, регистрация и текущий пользователь. Токен хранится в защищённом
// хранилище телефона (Keychain на iOS, Keystore на Android).
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const saveToken = async (value) => {
    if (value) await storage.set(TOKEN_KEY, value);
    else await storage.remove(TOKEN_KEY);
    setToken(value);
  };

  const logout = useCallback(async () => {
    // Телефон больше не должен получать уведомления этого аккаунта
    const current = await storage.get(TOKEN_KEY).catch(() => null);
    if (current) await unregisterPush(current).catch(() => {});
    await saveToken(null);
    setUser(null);
    // Данные прежнего пользователя не должны достаться следующему
    queryClient.clear();
  }, [queryClient]);

  // При запуске достаём сохранённый токен и проверяем его на сервере
  useEffect(() => {
    (async () => {
      const saved = await storage.get(TOKEN_KEY).catch(() => null);
      if (saved) {
        setToken(saved);
        try {
          setUser(await api("/api/auth/me", { token: saved }));
        } catch (error) {
          // Токен протух: выходим. Нет сети: остаёмся в аккаунте.
          if (error.status === 401 || error.status === 404) await logout();
        }
      }
      setReady(true);
    })();
  }, [logout]);

  const login = async (email, password) => {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: { email: email.trim(), password },
    });
    await saveToken(data.token);
    setUser({ ...data.user, isVerified: true });
  };

  const register = async (username, email, password) => {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: { username: username.trim(), email: email.trim(), password, acceptedPolicy: true },
    });
    await saveToken(data.token);
    setUser(data.user);
  };

  const verifyEmail = async (code) => {
    await api("/api/auth/verify-email", { token, method: "POST", body: { code } });
    setUser((current) => ({ ...current, isVerified: true }));
  };

  const resendCode = () => api("/api/auth/resend-code", { token, method: "POST" });

  const forgotPassword = (email) =>
    api("/api/auth/forgot-password", { method: "POST", body: { email: email.trim() } });

  const resetPassword = (email, code, password) =>
    api("/api/auth/reset-password", {
      method: "POST",
      body: { email: email.trim(), code, password },
    });

  // Перечитать данные пользователя с сервера (после смены ника или аватара)
  const refreshUser = async () => {
    if (token) setUser(await api("/api/auth/me", { token }));
  };

  const deleteAccount = async (password) => {
    await api("/api/auth/me", { token, method: "DELETE", body: { password } });
    await logout();
  };

  const value = {
    ready,
    token,
    user,
    // Вошёл и подтвердил email. Если сервер был недоступен при запуске,
    // пользователь ещё не загружен, но токен есть: пускаем в приложение.
    signedIn: Boolean(token) && user?.isVerified !== false,
    needsVerification: Boolean(token) && user?.isVerified === false,
    login,
    register,
    verifyEmail,
    resendCode,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
