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

// Поиск по названию на сайте сервиса — показываем только для сервисов, где
// фильм есть по данным TMDB. local — искать по русскому названию, иначе по оригинальному
const SERVICES = [
  { id: "kinopoisk", name: "Кинопоиск", local: true, match: /kinopoisk|кинопоиск/i, url: (q) => `https://www.kinopoisk.ru/index.php?kp_query=${q}` },
  { id: "okko", name: "Okko", local: true, match: /okko/i, url: (q) => `https://okko.tv/search/${q}` },
  { id: "ivi", name: "Иви", local: true, match: /\bivi\b|иви/i, url: (q) => `https://www.ivi.tv/search?q=${q}` },
  { id: "wink", name: "Wink", local: true, match: /wink/i, url: (q) => `https://wink.ru/search?query=${q}` },
  { id: "kion", name: "Кион", local: true, match: /kion|кион/i, url: (q) => `https://kion.ru/search?text=${q}` },
  { id: "start", name: "Start", local: true, match: /^start\b/i, url: (q) => `https://start.ru/search?q=${q}` },
  { id: "premier", name: "Premier", local: true, match: /premier/i, url: (q) => `https://premier.one/search?query=${q}` },
  { id: "netflix", name: "Netflix", match: /netflix/i, url: (q) => `https://www.netflix.com/search?q=${q}` },
  { id: "prime", name: "Prime Video", match: /amazon|prime video/i, url: (q) => `https://www.primevideo.com/search?phrase=${q}` },
  { id: "apple", name: "Apple TV", match: /apple/i, url: (q) => `https://tv.apple.com/search?term=${q}` },
  { id: "max", name: "Max", match: /\bmax\b|hbo/i, url: (q) => `https://play.max.com/search?q=${q}` },
  { id: "google", name: "Google Play", match: /google/i, url: (q) => `https://play.google.com/store/search?q=${q}&c=movies` },
  { id: "youtube", name: "YouTube", match: /youtube/i, url: (q) => `https://www.youtube.com/results?search_query=${q}` },
];

const serviceQuery = (service, titles) =>
  encodeURIComponent(service.local ? titles.local : titles.original);
const findService = (p) => SERVICES.find((s) => s.match.test(p.provider_name));

const LINK_CHIP = "mg-glass-chip !pl-1.5 !pr-3.5 !py-1.5 !text-[13px] transition-colors hover:text-white hover:border-[#ff935f]/60";

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
// results — объект watch/providers.results из деталей фильма, по коду страны,
// titles — { local, original } для поиска на сайтах сервисов.
export default function WatchProviders({ results, loading, titles }) {
  const [region, setRegion] = useState(readRegion);
  const providers = results?.[region] || null;
  const regionLabel = REGIONS.find((r) => r.code === region)?.label || region;
  const groups = providers
    ? PROVIDER_GROUPS.filter((g) => providers[g.key]?.length > 0)
    : [];

  // Сервис из TMDB ведём на поиск по нему, неизвестный — на страницу JustWatch
  const providerHref = (p) => {
    const service = findService(p);
    return service ? service.url(serviceQuery(service, titles)) : providers.link;
  };
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
      ) : (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-sm text-[#aeb3d6]">
              Для региона «{regionLabel}» нет данных о сервисах. Попробуйте другой регион.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 text-xs font-bold text-[#9aa0c4]">{group.label}</div>
              <div className="flex flex-wrap gap-2">
                {providers[group.key].map((p) => (
                  <a
                    key={p.provider_id}
                    href={providerHref(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CHIP}
                  >
                    {p.logo_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                      />
                    )}
                    {p.provider_name}
                    <Icon n="external-link" className="w-3 h-3 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          ))}

          {providers && (
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
          )}
        </div>
      )}
    </section>
  );
}
