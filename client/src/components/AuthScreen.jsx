import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Footer from "./Footer";
import { POLICY_HASH } from "../legal";
import { Logo } from "./ui";
import { POSTER_LARGE, TMDB, TMDB_API_KEY, tmdbImage } from "../config";

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
  "w-full h-[52px] bg-[#ff7a45] hover:bg-[#ff9166] disabled:opacity-50 disabled:cursor-not-allowed text-[#1b0d07] text-[15px] font-extrabold rounded-[14px] transition-colors flex items-center justify-center gap-2";
const INPUT =
  "w-full h-[52px] bg-[#12152a] border border-white/10 rounded-[14px] px-4 text-base sm:text-[15px] font-medium text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition";

// Запасные «постеры» на случай, если TMDB недоступен
const FALLBACK_POSTERS = [
  { title: "Побег из Шоушенка", h: 210 },
  { title: "Дюна: Часть вторая", h: 28 },
  { title: "Паразиты", h: 140 },
  { title: "Интерстеллар", h: 250 },
];

const COLLAGE = [
  "w-[180px] h-[270px] left-[10%] top-[16%] -rotate-[7deg]",
  "w-[200px] h-[300px] left-[42%] top-[11%] rotate-[4deg]",
  "w-[170px] h-[255px] left-[22%] top-[45%] rotate-[3deg]",
  "w-[185px] h-[278px] left-[54%] top-[42%] -rotate-[5deg]",
];

// Коллаж из популярных постеров TMDB для левой половины экрана входа
function PosterCollage() {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    if (!TMDB_API_KEY) return undefined;
    let cancelled = false;
    fetch(`${TMDB}/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU&page=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPosters(
          (data.results || [])
            .filter((m) => m.poster_path)
            .slice(0, 4)
            .map((m) => ({ title: m.title, src: `${POSTER_LARGE}${m.poster_path}` })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const items = posters.length === 4 ? posters : FALLBACK_POSTERS;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {items.map((p, i) => (
        <div
          key={p.title}
          className={`absolute overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.45)] ${COLLAGE[i]}`}
          style={
            p.src
              ? undefined
              : {
                  background: `radial-gradient(110% 60% at 15% 0%, hsla(${p.h},90%,60%,.55), transparent 62%), linear-gradient(165deg, hsl(${p.h},45%,20%), hsl(${(p.h + 40) % 360},55%,8%))`,
                }
          }
        >
          {p.src ? (
            <img src={tmdbImage(p.src)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="absolute left-3.5 right-3.5 bottom-4 font-display font-bold text-[15px] leading-tight text-white">
              {p.title}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-app bg-[#0a0c18] flex flex-col lg:flex-row">
      <section className="hidden lg:block relative flex-1 min-h-[100dvh] overflow-hidden bg-[#0d1021] mg-glow-auth">
        <div className="absolute left-14 top-12 z-10">
          <Logo size="lg" />
        </div>
        <PosterCollage />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#0d1021] to-transparent" />
        <div className="absolute left-14 right-14 bottom-12 z-10">
          <h2 className="font-display text-[30px] font-semibold leading-[1.15] text-white max-w-md">
            Всё, что ты посмотрел, в одном журнале
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#aeb3d6] max-w-sm">
            Оценки, отзывы и списки на потом. А ещё то, что смотрят друзья.
          </p>
        </div>
      </section>

      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8 safe-top">
        <div className="lg:hidden">
          <Logo size="lg" />
        </div>
        <div className="w-full max-w-[420px]">{children}</div>
        <Footer className="w-full max-w-[420px]" />
      </section>
    </div>
  );
}

const Field = ({ label, icon, ...props }) => (
  <label className="block">
    <span className="block text-[13px] font-bold text-[#aeb3d6] mb-2">{label}</span>
    <div className="relative">
      <Icon
        n={icon}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] opacity-45"
      />
      <input {...props} className={`${INPUT} pl-12`} />
    </div>
  </label>
);

const Notice = ({ error, children }) => (
  <div
    className={`flex items-center gap-2.5 text-sm p-3.5 rounded-xl border ${error ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}
  >
    <Icon n={error ? "circle-alert" : "circle-check"} className="w-4 h-4" />
    {children}
  </div>
);


export default function AuthScreen() {
  // 'auth' | 'verify' | 'forgot' (ввод email) | 'reset' (код и новый пароль)
  const [step, setStep] = useState("auth");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
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

    if (!isLogin && !acceptedPolicy) {
      setError(
        "Чтобы создать аккаунт, примите политику конфиденциальности",
      );
      return;
    }

    setIsLoading(true);

    const result = isLogin
      ? await login(email, password)
      : await register(username, email, password, acceptedPolicy);

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
        <div className="mb-7">
          <div className="w-14 h-14 mb-5 rounded-2xl bg-[#ff7a45]/15 flex items-center justify-center">
            <Icon n="key-round" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <h1 className="font-display text-[26px] sm:text-[28px] font-semibold text-white mb-2.5">
            Сброс пароля
          </h1>
          <p className="text-[15px] text-[#8b91b5]">
            Укажите email аккаунта, и мы отправим на него код
          </p>
        </div>

        <form onSubmit={handleForgotSubmit} className="space-y-[18px]">
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
            className="w-full min-h-[44px] text-[#8b91b5] hover:text-white text-sm font-bold flex items-center justify-center gap-2"
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
        <div className="mb-7">
          <div className="w-14 h-14 mb-5 rounded-2xl bg-[#ff7a45]/15 flex items-center justify-center">
            <Icon n="shield-check" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <h1 className="font-display text-[26px] sm:text-[28px] font-semibold text-white mb-2.5">
            Новый пароль
          </h1>
          <p className="text-sm text-[#8b91b5]">
            Введите код из письма и придумайте новый пароль
          </p>
        </div>

        <form onSubmit={handleResetSubmit} className="space-y-[18px]">
          <label className="block">
            <span className="block text-[13px] font-bold text-[#aeb3d6] mb-2">
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
            className="w-full min-h-[44px] text-[#ff935f] hover:text-[#ffa27d] text-sm font-bold"
          >
            Отправить код ещё раз
          </button>

          <button
            type="button"
            onClick={backToLogin}
            className="w-full min-h-[44px] text-[#8b91b5] hover:text-white text-sm font-bold flex items-center justify-center gap-2"
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
        <div className="mb-7">
          <div className="w-14 h-14 mb-5 rounded-2xl bg-[#ff7a45]/15 flex items-center justify-center">
            <Icon n="mail" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <h1 className="font-display text-[26px] sm:text-[28px] font-semibold text-white mb-2.5">
            Подтверждение email
          </h1>
          <p className="text-sm text-[#8b91b5]">
            Мы отправили 6-значный код на адрес
          </p>
          <p className="text-sm font-semibold text-white mt-1">
            {user?.email || email}
          </p>
        </div>

        <form onSubmit={handleVerifySubmit} className="space-y-[18px]">
          <label className="block">
            <span className="block text-[13px] font-bold text-[#aeb3d6] mb-2">
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
            className="w-full min-h-[44px] text-[#ff935f] hover:text-[#ffa27d] disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2"
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
            className="w-full min-h-[44px] text-[#8b91b5] hover:text-white text-sm font-bold flex items-center justify-center gap-2"
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
      <div className="mb-7">
        <h1 className="font-display text-[26px] sm:text-[28px] font-semibold text-white">
          {isLogin ? "С возвращением" : "Создать аккаунт"}
        </h1>
        <p className="mt-2.5 text-[15px] text-[#8b91b5]">
          {isLogin ? "Твой личный дневник киномана" : "Это бесплатно и займёт минуту"}
        </p>
      </div>

      <div className="flex gap-1.5 p-[5px] rounded-[15px] bg-[#0f1226] border border-white/[0.06] mb-7" role="tablist">
        {[
          { v: true, l: "Вход" },
          { v: false, l: "Регистрация" },
        ].map((t) => (
          <button
            key={t.l}
            type="button"
            role="tab"
            aria-selected={isLogin === t.v}
            onClick={() => switchMode(t.v)}
            className={`flex-1 min-h-[44px] rounded-[11px] text-sm font-bold transition-colors ${
              isLogin === t.v
                ? "bg-[#1d2140] text-white"
                : "text-[#8b91b5] hover:text-white"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <form onSubmit={handleAuthSubmit} className="space-y-[18px]">
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
              className="min-h-[36px] text-[13px] font-bold text-[#ff935f] hover:text-[#ffa27d] transition-colors"
            >
              Забыли пароль?
            </button>
          </div>
        )}

        {!isLogin && (
          <label className="flex items-start gap-3 text-[13px] leading-relaxed text-[#8b91b5] cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(e) => setAcceptedPolicy(e.target.checked)}
              className="mt-0.5 w-[22px] h-[22px] shrink-0 accent-[#ff7a45] cursor-pointer"
            />
            <span>
              Я прочитал(а){" "}
              <a
                href={POLICY_HASH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff935f] font-bold hover:underline"
              >
                политику конфиденциальности
              </a>{" "}
              и даю согласие на обработку моих персональных данных
            </span>
          </label>
        )}

        {error && <Notice error>{error}</Notice>}
        {successMsg && <Notice>{successMsg}</Notice>}

        <button
          type="submit"
          disabled={isLoading || (!isLogin && !acceptedPolicy)}
          className={`${BTN} mt-2`}
        >
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
            "Войти"
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
