import { useState } from "react";
import Icon from "./Icon";

const REGIONS = [
  { code: "RU", label: "Россия" },
  { code: "BY", label: "Беларусь" },
  { code: "KZ", label: "Казахстан" },
  { code: "UA", label: "Украина" },
  { code: "US", label: "США" },
  { code: "GB", label: "Великобритания" },
  { code: "DE", label: "Германия" },
];

const PROVIDER_GROUPS = [
  { key: "flatrate", label: "По подписке" },
  { key: "free", label: "Бесплатно" },
  { key: "ads", label: "Бесплатно с рекламой" },
  { key: "rent", label: "Аренда" },
  { key: "buy", label: "Покупка" },
];

const readRegion = () => {
  try {
    return localStorage.getItem("watchRegion") || "RU";
  } catch {
    return "RU";
  }
};
const saveRegion = (code) => {
  try {
    localStorage.setItem("watchRegion", code);
  } catch {
    /* без хранилища просто не запоминаем */
  }
};

// «Где смотреть»: сервисы по регионам из TMDB (данные JustWatch).
// results — объект watch/providers.results из деталей фильма, по коду страны.
export default function WatchProviders({ results, loading }) {
  const [region, setRegion] = useState(readRegion);
  const providers = results?.[region] || null;
  const regionLabel = REGIONS.find((r) => r.code === region)?.label || region;
  const groups = providers
    ? PROVIDER_GROUPS.filter((g) => providers[g.key]?.length > 0)
    : [];

  return (
    <section className="mg-glass-panel rounded-[24px] p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4]">
          Где смотреть
        </h2>
        <label className="mg-glass-chip !py-0 !pl-3 !pr-1 h-9 !text-xs !font-bold">
          <Icon n="globe" className="w-3.5 h-3.5 opacity-70" />
          <span className="sr-only">Регион</span>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              saveRegion(e.target.value);
            }}
            aria-label="Регион"
            className="h-8 bg-transparent pr-1 text-xs font-bold text-white focus:outline-none [&>option]:bg-[#12152a]"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-[#aeb3d6] animate-pulse">Ищу, где можно посмотреть…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[#aeb3d6]">
          Для региона «{regionLabel}» нет данных о сервисах. Попробуйте другой регион.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 text-xs font-bold text-[#9aa0c4]">{group.label}</div>
              <div className="flex flex-wrap gap-2">
                {providers[group.key].map((p) => (
                  <span key={p.provider_id} className="mg-glass-chip !pl-1.5 !pr-3.5 !py-1.5 !text-[13px]">
                    {p.logo_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                      />
                    )}
                    {p.provider_name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-[#8b91b5]">
            Данные о доступности предоставлены JustWatch через TMDB.
            {providers.link && (
              <>
                {" "}
                <a
                  href={providers.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#ff935f] hover:underline"
                >
                  Открыть страницу
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
