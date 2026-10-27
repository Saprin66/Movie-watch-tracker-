import { useRef, useState } from "react";
import Icon from "./Icon";
import { UI_STYLES } from "../hooks/useUiStyle";
import { CARD_VIEWS, setCardView, useCardView } from "../hooks/useCardView";
import { CONTACT_EMAIL, POLICY_HASH, SUPPORT_TELEGRAM } from "../legal";
import { PLAN_NAMES, PROFILE_THEMES, themeOf } from "../utils/plans";

// Настройки в стиле iPhone: крупный заголовок, сгруппированные списки
// со скруглёнными углами, цветные квадратные иконки, тумблеры и подстраницы.

// Системные цвета iOS для плашек иконок
const TINT = {
  orange: "bg-[#ff9500]",
  blue: "bg-[#0a84ff]",
  green: "bg-[#30d158]",
  indigo: "bg-[#5e5ce6]",
  purple: "bg-[#bf5af2]",
  red: "bg-[#ff453a]",
  gray: "bg-[#8e8e93]",
  teal: "bg-[#40c8e0]",
  yellow: "bg-[#ffcc00]",
};

const ROW =
  "relative w-full min-h-[48px] flex items-center gap-3.5 pl-4 pr-3.5 py-2.5 text-left transition-colors active:bg-white/[0.08] hover:bg-white/[0.03] disabled:opacity-50 disabled:pointer-events-none";

function IconTile({ icon, tint }) {
  return (
    <span className={`w-[30px] h-[30px] shrink-0 rounded-[8px] flex items-center justify-center ${TINT[tint]}`}>
      <Icon n={icon} className="w-[18px] h-[18px]" />
    </span>
  );
}

// Группа строк: подпись сверху, пояснение снизу, разделители между строками
function Group({ header, footer, children }) {
  return (
    <section>
      {header && (
        <h2 className="px-4 mb-1.5 text-[12px] font-medium uppercase tracking-[0.04em] text-[#8e8e93]">{header}</h2>
      )}
      <div className="mg-ios-group overflow-hidden rounded-[14px] bg-[#16192d] border border-white/[0.04]">
        {children}
      </div>
      {footer && <p className="px-4 mt-1.5 text-[12px] leading-relaxed text-[#8e8e93]">{footer}</p>}
    </section>
  );
}

function RowContent({ icon, tint, label, value, chevron, danger, center }) {
  return (
    <>
      {icon && <IconTile icon={icon} tint={tint} />}
      <span
        className={`flex-1 whitespace-nowrap text-[15px] ${center ? "text-center" : ""} ${
          danger ? "text-[#ff453a]" : "text-white"
        }`}
      >
        {label}
      </span>
      {value !== undefined && value !== null && (
        <span className="min-w-0 truncate text-[15px] text-[#8e8e93]">{value}</span>
      )}
      {chevron && <Icon n="chevron-right" className="w-[18px] h-[18px] opacity-40 shrink-0" />}
    </>
  );
}

function Row({ onClick, href, disabled, ...content }) {
  if (href) {
    return (
      <a
        href={href}
        className={ROW}
        data-icon={content.icon ? "" : undefined}
        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <RowContent {...content} />
      </a>
    );
  }
  // Строка только для чтения (имя, email): без подсветки и курсора-руки
  if (!onClick) {
    return (
      <div className={`${ROW} !bg-transparent`} data-icon={content.icon ? "" : undefined}>
        <RowContent {...content} />
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={ROW} data-icon={content.icon ? "" : undefined}>
      <RowContent {...content} />
    </button>
  );
}

// Тумблер как в iOS: зелёный, когда включён
function ToggleRow({ icon, tint, label, checked, busy, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={ROW}
      data-icon=""
    >
      <RowContent icon={icon} tint={tint} label={label} />
      <span
        className={`relative w-[51px] h-[31px] shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-[#30d158]" : "bg-[#39393d]"
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}

// Строка-вариант с галочкой справа (выбор одного из нескольких)
function CheckRow({ label, checked, onClick }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onClick} className={ROW}>
      <span className="min-w-0 flex-1 text-[15px] text-white">{label}</span>
      {checked && <Icon n="check" className="w-5 h-5 shrink-0 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />}
    </button>
  );
}

function Alert({ tone = "error", children }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`px-4 text-[13px] ${tone === "error" ? "text-[#ff6961]" : "text-[#30d158]"}`}
    >
      {children}
    </p>
  );
}

function AvatarCircle({ user, size }) {
  return (
    <span className={`${size} shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#ff7a45] to-[#8b5cf6] flex items-center justify-center`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-display font-bold text-white">{user?.username?.[0]?.toUpperCase() || "U"}</span>
      )}
    </span>
  );
}

// Шапка подстраницы: «‹ Настройки» слева и заголовок по центру
function NavBar({ title, onBack, backLabel }) {
  return (
    <div className="relative flex items-center justify-center h-11 mb-4">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-0 inline-flex items-center gap-0.5 h-11 pr-3 text-[17px] text-[#ff9a6c] hover:text-[#ffb08c]"
      >
        <Icon n="chevron-left" className="w-6 h-6 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
        {backLabel}
      </button>
      <h1 className="text-[17px] font-semibold text-white">{title}</h1>
    </div>
  );
}

const styleLabel = (id) => UI_STYLES.find((s) => s.id === id)?.label || "";

export default function SettingsPage({
  user,
  onBack,
  uiStyles,
  onUiStyleChange,
  privacy,
  avatar,
  onEditProfile,
  onOpenPremium,
  plan = "free",
  planUntil = null,
  theme,
  onLetterboxdFile,
  importState,
  onImportFile,
  onLogout,
  onDeleteAccount,
}) {
  const [page, setPage] = useState("root");
  const cardView = useCardView();
  const avatarInput = useRef(null);
  const importInput = useRef(null);
  const letterboxdInput = useRef(null);
  const supportSubject = encodeURIComponent(
    plan === "brilliant" ? "[Brilliant] Выделенная линия" : plan === "gold" ? "[Gold] Приоритетная поддержка" : "MovieGrade",
  );

  const open = (next) => {
    setPage(next);
    window.scrollTo({ top: 0 });
  };

  const fileInputs = (
    <>
      <input ref={avatarInput} type="file" accept="image/*" onChange={avatar.onFile} className="hidden" />
      <input
        ref={importInput}
        type="file"
        accept=".txt,.docx"
        onChange={onImportFile}
        disabled={importState.importing}
        className="hidden"
      />
      <input
        ref={letterboxdInput}
        type="file"
        accept=".csv,text/csv"
        onChange={onLetterboxdFile}
        disabled={importState.importing}
        className="hidden"
      />
    </>
  );

  if (page === "appearance") {
    return (
      <div key="appearance" className="mg-page-rise mx-auto max-w-2xl space-y-7 pb-28">
        {fileInputs}
        <NavBar title="Внешний вид" backLabel="Настройки" onBack={() => open("root")} />
        <Group header="Вид карточек фильмов" footer="Сетка — крупные постеры. Список — строки с описанием фильма или твоим отзывом.">
          <div role="radiogroup" aria-label="Вид карточек фильмов" className="mg-ios-group">
            {CARD_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={cardView === v.id}
                onClick={() => setCardView(v.id)}
                className={ROW}
                data-icon=""
              >
                <IconTile icon={v.icon} tint={v.id === "grid" ? "orange" : "teal"} />
                <span className="min-w-0 flex-1 text-[15px] text-white">{v.label}</span>
                {cardView === v.id && (
                  <Icon n="check" className="w-5 h-5 shrink-0 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
                )}
              </button>
            ))}
          </div>
        </Group>
        {[
          { id: "desktop", label: "На компьютере" },
          { id: "mobile", label: "На телефоне" },
        ].map((device) => (
          <Group
            key={device.id}
            header={device.label}
            footer={device.id === "mobile" ? "Оформление сохраняется на этом устройстве и включается само, когда меняется ширина экрана." : undefined}
          >
            <div role="radiogroup" aria-label={`Оформление: ${device.label.toLowerCase()}`} className="mg-ios-group">
              {UI_STYLES.map((style) => (
                <CheckRow
                  key={style.id}
                  label={style.label}
                  checked={uiStyles[device.id] === style.id}
                  onClick={() => onUiStyleChange(device.id, style.id)}
                />
              ))}
            </div>
          </Group>
        ))}
      </div>
    );
  }

  if (page === "theme") {
    return (
      <div key="theme" className="mg-page-rise mx-auto max-w-2xl space-y-7 pb-28">
        {fileInputs}
        <NavBar title="Тема профиля" backLabel="Настройки" onBack={() => open("root")} />
        <div className="space-y-2">
          <Group header="Свечение за аватаром" footer="Тему видят все, кто открывает твой профиль. Доступно в Brilliant.">
            <div role="radiogroup" aria-label="Тема профиля" className="mg-ios-group">
              <CheckRow label="Как у аватара" checked={!theme.value} onClick={() => theme.onChange(null)} />
              {PROFILE_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={theme.value === t.id}
                  onClick={() => theme.onChange(t.id)}
                  className={ROW}
                >
                  <span
                    className="w-[30px] h-[30px] shrink-0 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${t.glows[0]}, ${t.glows[1]})` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 text-[15px] text-white">{t.name}</span>
                  {theme.value === t.id && (
                    <Icon n="check" className="w-5 h-5 shrink-0 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
                  )}
                </button>
              ))}
            </div>
          </Group>
          {theme.error && <Alert>{theme.error}</Alert>}
        </div>
      </div>
    );
  }

  if (page === "account") {
    return (
      <div key="account" className="mg-page-rise mx-auto max-w-2xl space-y-7 pb-28">
        {fileInputs}
        <NavBar title="Аккаунт" backLabel="Настройки" onBack={() => open("root")} />

        <div className="flex flex-col items-center text-center">
          <AvatarCircle user={user} size="w-24 h-24 text-[40px]" />
          <button
            type="button"
            disabled={avatar.saving}
            onClick={() => avatarInput.current?.click()}
            className="mt-3 text-[15px] text-[#ff9a6c] hover:text-[#ffb08c] disabled:opacity-50"
          >
            {avatar.saving ? "Сохранение…" : user?.avatar ? "Изменить фото" : "Добавить фото"}
          </button>
        </div>

        <Group>
          <Row icon="user-round" tint="orange" label="Имя" value={user?.username} />
          <Row icon="at-sign" tint="blue" label="Email" value={user?.email} />
          <Row icon="pencil" tint="indigo" label="Редактировать профиль" chevron onClick={onEditProfile} />
        </Group>

        <div className="space-y-2">
          <Group footer="JPG, PNG, WebP и другие форматы, которые открывает браузер. Файл до 10 МБ — он будет обрезан и сжат автоматически.">
            <Row
              icon="image-plus"
              tint="green"
              label="Выбрать фото"
              chevron
              disabled={avatar.saving}
              onClick={() => avatarInput.current?.click()}
            />
            {user?.avatar && (
              <Row label="Удалить фото" danger disabled={avatar.saving} onClick={avatar.onRemove} />
            )}
          </Group>
          {avatar.message && <Alert tone="ok">{avatar.message}</Alert>}
          {avatar.error && <Alert>{avatar.error}</Alert>}
        </div>
      </div>
    );
  }

  return (
    <div key="root" className="mg-page-rise mx-auto max-w-2xl space-y-7 pb-28">
      {fileInputs}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex items-center gap-0.5 h-11 pr-3 text-[17px] text-[#ff9a6c] hover:text-[#ffb08c]"
        >
          <Icon n="chevron-left" className="w-6 h-6 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
          Профиль
        </button>
        <h1 className="mt-1 px-1 text-[34px] font-bold leading-tight tracking-[-0.02em] text-white">Настройки</h1>
      </div>

      <Group>
        <button type="button" onClick={() => open("account")} className={`${ROW} !py-3`}>
          <AvatarCircle user={user} size="w-[60px] h-[60px] text-[24px]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[20px] font-semibold text-white">{user?.username}</span>
            <span className="block truncate text-[13px] text-[#8e8e93]">Аккаунт, фото и данные профиля</span>
          </span>
          <Icon n="chevron-right" className="w-[18px] h-[18px] opacity-40 shrink-0" />
        </button>
      </Group>

      <Group>
        <Row
          icon="crown"
          tint="yellow"
          label="Подписка"
          value={
            planUntil && plan !== "free"
              ? `${PLAN_NAMES[plan]} до ${new Date(planUntil).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`
              : PLAN_NAMES[plan]
          }
          chevron
          onClick={onOpenPremium}
        />
        {plan === "brilliant" && (
          <Row
            icon="sparkles"
            tint="purple"
            label="Тема профиля"
            value={themeOf(theme.value)?.name || "Как у аватара"}
            chevron
            onClick={() => open("theme")}
          />
        )}
      </Group>

      <div className="space-y-2">
        <Group
          footer={
            privacy.isPrivate
              ? "Журнал, статистику и друзей видят только твои друзья. Остальные видят ник, аватар и отметку о приватном режиме."
              : "Сейчас профиль открыт: его могут посмотреть все пользователи MovieGrade."
          }
        >
          <Row
            icon="palette"
            tint="indigo"
            label="Внешний вид"
            value={`${styleLabel(uiStyles.desktop)} · ${CARD_VIEWS.find((v) => v.id === cardView)?.label}`}
            chevron
            onClick={() => open("appearance")}
          />
          <ToggleRow
            icon="lock"
            tint="blue"
            label="Приватный профиль"
            checked={privacy.isPrivate}
            busy={privacy.saving}
            onChange={privacy.onChange}
          />
        </Group>
        {privacy.error && <Alert>{privacy.error}</Alert>}
      </div>

      <Group
        footer={
          plan === "brilliant"
            ? "Файл .txt или .docx: каждая строка — название и оценка. Из Letterboxd: ratings.csv, watched.csv, diary.csv или watchlist.csv из экспорта данных."
            : "Файл .txt или .docx со списком фильмов: каждая строка — название и, если хочешь, оценка в конце. Импорт из Letterboxd — ранний доступ в Brilliant."
        }
      >
        <Row
          icon="file-up"
          tint="green"
          label="Импорт из файла"
          value={importState.importing ? `${importState.current} из ${importState.total}` : undefined}
          chevron={!importState.importing}
          disabled={importState.importing}
          onClick={() => importInput.current?.click()}
        />
        <Row
          icon="clapperboard"
          tint="teal"
          label="Импорт из Letterboxd"
          value={plan === "brilliant" ? "Ранний доступ" : "Brilliant"}
          chevron={!importState.importing}
          disabled={importState.importing}
          onClick={() => (plan === "brilliant" ? letterboxdInput.current?.click() : onOpenPremium())}
        />
      </Group>

      <Group
        footer={
          plan === "brilliant"
            ? "Выделенная линия: письма с пометкой Brilliant разбираем в первую очередь."
            : plan === "gold"
              ? "Приоритетная поддержка: письма с пометкой Gold разбираем раньше обычных."
              : undefined
        }
      >
        <Row
          icon="life-buoy"
          tint="gray"
          label={plan === "brilliant" ? "Выделенная линия" : plan === "gold" ? "Приоритетная поддержка" : "Поддержка"}
          value={CONTACT_EMAIL}
          chevron
          href={`mailto:${CONTACT_EMAIL}?subject=${supportSubject}`}
        />
        {plan === "brilliant" && SUPPORT_TELEGRAM && (
          <Row icon="send" tint="blue" label="Telegram" value={`@${SUPPORT_TELEGRAM}`} chevron href={`https://t.me/${SUPPORT_TELEGRAM}`} />
        )}
        <Row icon="file-text" tint="gray" label="Политика конфиденциальности" chevron href={POLICY_HASH} />
      </Group>

      <Group>
        <Row label="Выйти из аккаунта" danger center onClick={onLogout} />
      </Group>

      <Group footer="Аккаунт удалится навсегда вместе с журналом, оценками, отзывами, друзьями и созданными тобой общими списками. Восстановить его будет нельзя.">
        <Row label="Удалить аккаунт" danger center onClick={onDeleteAccount} />
      </Group>
    </div>
  );
}
