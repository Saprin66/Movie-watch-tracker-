import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ORANGE_FILTER =
  "[filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]";
const Icon = ({ n, className = "w-4 h-4" }) => (
  <img
    src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`}
    alt=""
    className={`${className} invert shrink-0`}
  />
);

const BTN =
  "w-full bg-[#f47c4f] hover:bg-[#ff8f66] disabled:opacity-50 disabled:cursor-not-allowed text-[#1a1020] font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2";
const INPUT =
  "w-full bg-[#1c2040] border border-white/5 rounded-lg px-4 py-3 text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60 transition-colors";

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#0f1226] bg-[radial-gradient(ellipse_at_top_left,rgba(244,124,79,0.15),transparent_55%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#171a33] border border-white/5 rounded-2xl p-8 shadow-2xl shadow-black/50">
        {children}
      </div>
    </div>
  );
}

const Field = ({ label, icon, ...props }) => (
  <label className="block">
    <span className="block text-xs text-[#8a90b8] mb-1.5">{label}</span>
    <div className="relative">
      <Icon
        n={icon}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] opacity-50"
      />
      <input {...props} className={`${INPUT} pl-11`} />
    </div>
  </label>
);

const Notice = ({ error, children }) => (
  <div
    className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${error ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}
  >
    <Icon n={error ? "circle-alert" : "circle-check"} className="w-4 h-4" />
    {children}
  </div>
);

const Logo = () => (
  <div className="flex items-center justify-center gap-2 mb-1">
    <Icon n="clapperboard" className={`w-8 h-8 ${ORANGE_FILTER}`} />
    <span className="text-2xl font-bold text-white">
      Movie<span className="text-[#f47c4f]">Grade</span>
    </span>
  </div>
);

export default function AuthScreen() {
  // 'auth' | 'verify' | 'forgot' (ввод email) | 'reset' (код и новый пароль)
  const [step, setStep] = useState("auth");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    login,
    register,
    verifyEmail,
    resendCode,
    forgotPassword,
    resetPassword,
    user,
  } = useAuth();

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    const result = isLogin
      ? await login(email, password)
      : await register(username, email, password);

    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      // Если при входе сервер сказал "нужно подтверждение", переходим на шаг ввода кода
      if (result.needsVerification) {
        setStep("verify");
      }
    } else {
      // Если регистрация прошла успешно, переходим к вводу кода
      if (!isLogin) {
        setStep("verify");
        setSuccessMsg("Регистрация успешна! Код отправлен на твой email.");
      }
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await verifyEmail(code);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Email подтвержден! Добро пожаловать.");
      setTimeout(() => {
        setStep("auth");
        setCode("");
        setSuccessMsg("");
      }, 1500);
    } else {
      setError(result.error);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSuccessMsg("");
    setIsLoading(true);
    const result = await resendCode();
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Новый код отправлен на email!");
    } else {
      setError(result.error);
    }
  };

  const switchMode = (login) => {
    setIsLogin(login);
    setError("");
    setSuccessMsg("");
  };

  const backToLogin = () => {
    setStep("auth");
    setIsLogin(true);
    setResetCode("");
    setNewPassword("");
    setError("");
    setSuccessMsg("");
  };

  const openForgot = () => {
    setStep("forgot");
    setError("");
    setSuccessMsg("");
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);
    const result = await forgotPassword(email.trim());
    setIsLoading(false);

    if (result.success) {
      setStep("reset");
      setSuccessMsg(result.message);
    } else {
      setError(result.error);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Пароль должен содержать не менее 8 символов");
      return;
    }
    setIsLoading(true);
    const result = await resetPassword(email.trim(), resetCode, newPassword);
    setIsLoading(false);

    if (result.success) {
      setStep("auth");
      setIsLogin(true);
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setSuccessMsg("Пароль изменён. Войдите с новым паролем.");
    } else {
      setError(result.error);
    }
  };

  // ========== ЗАБЫЛИ ПАРОЛЬ: ВВОД EMAIL ==========
  if (step === "forgot") {
    return (
      <Shell>
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f47c4f]/15 flex items-center justify-center">
            <Icon n="key-round" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Сброс пароля
          </h1>
          <p className="text-sm text-[#8a90b8]">
            Укажите email аккаунта, и мы отправим на него код
          </p>
        </div>

        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <Field
            label="Email"
            icon="mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="your@email.com"
          />

          {error && <Notice error>{error}</Notice>}

          <button type="submit" disabled={isLoading || !email} className={BTN}>
            {isLoading ? "Отправка..." : "Отправить код"}
          </button>

          <button
            type="button"
            onClick={backToLogin}
            className="w-full text-[#8a90b8] hover:text-white text-sm py-2 flex items-center justify-center gap-2"
          >
            <Icon n="arrow-left" className="w-4 h-4 opacity-70" />
            Вернуться ко входу
          </button>
        </form>
      </Shell>
    );
  }

  // ========== ЗАБЫЛИ ПАРОЛЬ: КОД И НОВЫЙ ПАРОЛЬ ==========
  if (step === "reset") {
    return (
      <Shell>
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f47c4f]/15 flex items-center justify-center">
            <Icon n="shield-check" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Новый пароль
          </h1>
          <p className="text-sm text-[#8a90b8]">
            Введите код из письма и придумайте новый пароль
          </p>
        </div>

        <form onSubmit={handleResetSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs text-[#8a90b8] mb-1.5">
              Код из письма
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={resetCode}
              onChange={(e) =>
                setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              className={`${INPUT} text-center text-2xl tracking-[0.5em] font-mono`}
              placeholder="000000"
            />
          </label>

          <Field
            label="Новый пароль"
            icon="lock"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            placeholder="Не менее 8 символов"
          />

          {error && <Notice error>{error}</Notice>}
          {successMsg && !error && <Notice>{successMsg}</Notice>}

          <button
            type="submit"
            disabled={isLoading || resetCode.length !== 6 || !newPassword}
            className={BTN}
          >
            {isLoading ? "Сохранение..." : "Сменить пароль"}
          </button>

          <button
            type="button"
            onClick={openForgot}
            className="w-full text-[#f47c4f] hover:text-[#ff8f66] text-sm py-2"
          >
            Отправить код ещё раз
          </button>

          <button
            type="button"
            onClick={backToLogin}
            className="w-full text-[#8a90b8] hover:text-white text-sm py-2 flex items-center justify-center gap-2"
          >
            <Icon n="arrow-left" className="w-4 h-4 opacity-70" />
            Вернуться ко входу
          </button>
        </form>
      </Shell>
    );
  }

  // ========== ЭКРАН ПОДТВЕРЖДЕНИЯ КОДА ==========
  if (step === "verify") {
    return (
      <Shell>
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f47c4f]/15 flex items-center justify-center">
            <Icon n="mail" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Подтверждение email
          </h1>
          <p className="text-sm text-[#8a90b8]">
            Мы отправили 6-значный код на адрес
          </p>
          <p className="text-sm font-semibold text-white mt-1">
            {user?.email || email}
          </p>
        </div>

        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs text-[#8a90b8] mb-1.5">
              Код подтверждения
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              className={`${INPUT} text-center text-2xl tracking-[0.5em] font-mono`}
              placeholder="000000"
            />
          </label>

          {error && <Notice error>{error}</Notice>}
          {successMsg && <Notice>{successMsg}</Notice>}

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className={BTN}
          >
            {isLoading ? "Проверка..." : "Подтвердить"}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={isLoading}
            className="w-full text-[#f47c4f] hover:text-[#ff8f66] disabled:opacity-50 text-sm py-2 flex items-center justify-center gap-2"
          >
            <Icon n="refresh-cw" className={`w-4 h-4 ${ORANGE_FILTER}`} />
            Отправить код повторно
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("auth");
              setCode("");
              setError("");
              setSuccessMsg("");
            }}
            className="w-full text-[#8a90b8] hover:text-white text-sm py-2 flex items-center justify-center gap-2"
          >
            <Icon n="arrow-left" className="w-4 h-4 opacity-70" />
            Вернуться ко входу
          </button>
        </form>
      </Shell>
    );
  }

  // ========== ОБЫЧНЫЙ ЭКРАН ВХОДА / РЕГИСТРАЦИИ ==========
  return (
    <Shell>
      <div className="text-center mb-7">
        <Logo />
        <p className="text-sm text-[#8a90b8]">Твой личный дневник киномана</p>
      </div>

      <div className="flex gap-6 border-b border-white/5 mb-6">
        {[
          { v: true, l: "Вход" },
          { v: false, l: "Регистрация" },
        ].map((t) => (
          <button
            key={t.l}
            onClick={() => switchMode(t.v)}
            className={`pb-3 -mb-px text-sm border-b-2 transition-colors ${
              isLogin === t.v
                ? "text-[#f47c4f] border-[#f47c4f]"
                : "text-[#8a90b8] border-transparent hover:text-white"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {/* 1. Поле EMAIL: показываем ВСЕГДА (и при входе, и при регистрации) */}
        <Field
          label="Email"
          icon="mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete={isLogin ? "username" : "email"}
          placeholder={isLogin ? "your@email.com" : "Введите email"}
        />

        {/* 2. Поле ИМЯ ПОЛЬЗОВАТЕЛЯ: показываем ТОЛЬКО при регистрации */}
        {!isLogin && (
          <Field
            label="Имя пользователя"
            icon="user"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            placeholder="Придумайте никнейм"
          />
        )}

        {/* 3. Поле ПАРОЛЬ: показываем всегда */}
        <Field
          label="Пароль"
          icon="lock"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder="Введите пароль"
        />

        {isLogin && (
          <div className="text-right -mt-1">
            <button
              type="button"
              onClick={openForgot}
              className="text-xs text-[#8a90b8] hover:text-[#f47c4f] transition-colors"
            >
              Забыли пароль?
            </button>
          </div>
        )}

        {error && <Notice error>{error}</Notice>}
        {successMsg && <Notice>{successMsg}</Notice>}

        <button type="submit" disabled={isLoading} className={`${BTN} mt-2`}>
          {isLoading ? (
            <>
              <img
                src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/loader-circle.svg"
                alt=""
                className="w-5 h-5 animate-spin [filter:brightness(0.1)]"
              />
              Загрузка...
            </>
          ) : isLogin ? (
            "Войти по Email"
          ) : (
            "Создать аккаунт"
          )}
        </button>
      </form>

      {/* <form onSubmit={handleAuthSubmit} className="space-y-4">
        <Field
          label="Имя пользователя"
          icon="user"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          placeholder="Введите имя пользователя"
        />

        {!isLogin && (
          <Field
            label="Email"
            icon="mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Введите email"
          />
        )}

        <Field
          label="Пароль"
          icon="lock"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder="Введите пароль"
        />

        {error && <Notice error>{error}</Notice>}
        {successMsg && <Notice>{successMsg}</Notice>}

        <button type="submit" disabled={isLoading} className={`${BTN} mt-2`}>
          {isLoading ? (
            <>
              <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/loader-circle.svg" alt="" className="w-5 h-5 animate-spin [filter:brightness(0.1)]" />
              Загрузка...
            </>
          ) : (
            isLogin ? 'Войти в аккаунт' : 'Создать аккаунт'
          )}
        </button>
      </form> */}
    </Shell>
  );
}
