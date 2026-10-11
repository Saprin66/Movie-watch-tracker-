import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          // Если токен протух (401) — выходим
          if (res.status === 401) {
            logout();
            return;
          }

          // Если другая ошибка сервера (500, 503) — НЕ выходим
          if (!res.ok) {
            console.warn("Ошибка сервера, но не выходим из аккаунта");
            return;
          }

          const data = await res.json();
          if (data.id) {
            setUser(data);
          }
        })
        .catch((error) => {
          // Если ошибка сети (нет интернета) — НЕ выходим!
          if (error.message === "Failed to fetch" || !navigator.onLine) {
            console.warn(
              "Нет подключения к сети. Оставляем пользователя в системе.",
            );
            return;
          }
          // Для других ошибок — выходим
          logout();
        });
    }
  }, [token]);

  // const login = async (username, password) => {
  //   try {
  //     const res = await fetch(`${API_URL}/api/auth/login`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ username, password })
  //     });
  //     const data = await res.json();
  //     if (data.token) {
  //       localStorage.setItem('token', data.token);
  //       setToken(data.token);
  //       setUser(data.user);
  //       return { success: true };
  //     }
  //     return { success: false, error: data.error, needsVerification: data.needsVerification };
  //   } catch (error) {
  //     return { success: false, error: 'Ошибка сети. Убедитесь, что сервер запущен.' };
  //   }
  // };

  //вход по email
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Ошибка входа" };
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error("Ошибка входа:", error);
      return { success: false, error: "Ошибка соединения с сервером" };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return {
        success: false,
        error: "Ошибка сети. Убедитесь, что сервер запущен.",
      };
    }
  };

  const verifyEmail = async (code) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ ...user, isVerified: true });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: "Ошибка сети." };
    }
  };

  const updateProfile = async (newUsername) => {
    //Обновление профиля - СМЕНА НИКА
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Ошибка обновления" };
      }

      setUser(data.user);
      return { success: true, message: data.message };
    } catch (error) {
      console.error("Ошибка обновления профиля:", error);
      return { success: false, error: "Ошибка соединения с сервером" };
    }
  };

  const resendCode = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) return { success: true, message: data.message };
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: "Ошибка сети." };
    }
  };

  const searchUsers = async (query) => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/search?query=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Ошибка поиска:", error);
      return [];
    }
  };

  const getFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Ошибка загрузки друзей:", res.status);
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Ошибка getFriends:", error);
      return [];
    }
  };

  const getFriendRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Ошибка:", error);
      return [];
    }
  };

  const handleFriendRequest = async (userId, action) => {
    try {
      await fetch(`${API_URL}/api/users/${userId}/friend-request`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: "Ошибка сети" };
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/friend-request`, {
        method: "POST", // <-- ИМЕННО POST для отправки новой заявки
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) return { success: true, message: data.message };
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: "Ошибка сети" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        verifyEmail,
        updateProfile,
        resendCode,
        logout,
        searchUsers,
        getFriends,
        getFriendRequests,
        handleFriendRequest,
        sendFriendRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
