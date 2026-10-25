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

const CIS = ["RU", "BY", "KZ"];
const WEST = ["US", "GB", "DE", "UA"];
const ALL = [...CIS, ...WEST];

// Сервисы с поиском по названию. match — как узнать сервис в ответе TMDB,
// local — искать по русскому названию, иначе по оригинальному
const SERVICES = [
  { id: "kinopoisk", name: "Кинопоиск", color: "#ff6600", regions: CIS, local: true, match: /kinopoisk|кинопоиск/i, url: (q) => `https://www.kinopoisk.ru/index.php?kp_query=${q}` },
  { id: "okko", name: "Okko", color: "#6c3cf5", regions: CIS, local: true, match: /okko/i, url: (q) => `https://okko.tv/search/${q}` },
  { id: "ivi", name: "Иви", color: "#ea003d", regions: CIS, local: true, match: /\bivi\b|иви/i, url: (q) => `https://www.ivi.tv/search?q=${q}` },
  { id: "wink", name: "Wink", color: "#ff4f12", regions: ["RU"], local: true, match: /wink/i, url: (q) => `https://wink.ru/search?query=${q}` },
  { id: "kion", name: "Кион", color: "#e30611", regions: ["RU"], local: true, match: /kion|кион/i, url: (q) => `https://kion.ru/search?text=${q}` },
  { id: "start", name: "Start", color: "#2f6bff", regions: CIS, local: true, match: /^start\b/i, url: (q) => `https://start.ru/search?q=${q}` },
  { id: "premier", name: "Premier", color: "#fcd34d", regions: ["RU"], local: true, match: /premier/i, url: (q) => `https://premier.one/search?query=${q}` },
  { id: "netflix", name: "Netflix", color: "#e50914", regions: WEST, match: /netflix/i, url: (q) => `https://www.netflix.com/search?q=${q}` },
  { id: "prime", name: "Prime Video", color: "#00a8e1", regions: WEST, match: /amazon|prime video/i, url: (q) => `https://www.primevideo.com/search?phrase=${q}` },
  { id: "apple", name: "Apple TV", color: "#a1a1aa", regions: ALL, match: /apple/i, url: (q) => `https://tv.apple.com/search?term=${q}` },
  { id: "max", name: "Max", color: "#2b4bff", regions: ["US"], match: /\bmax\b|hbo/i, url: (q) => `https://play.max.com/search?q=${q}` },
  { id: "google", name: "Google Play", color: "#34a853", regions: ALL, match: /google/i, url: (q) => `https://play.google.com/store/search?q=${q}&c=movies` },
  { id: "youtube", name: "YouTube", color: "#ff0033", regions: ALL, match: /youtube/i, url: (q) => `https://www.youtube.com/results?search_query=${q}` },
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
  const shownIds = new Set(
    groups.flatMap((g) => providers[g.key].map((p) => findService(p)?.id).filter(Boolean)),
  );
  const searchServices = titles?.local
    ? SERVICES.filter((s) => s.regions.includes(region) && !shownIds.has(s.id))
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
      ) : (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-sm text-[#aeb3d6]">
              {searchServices.length > 0
                ? `Для региона «${regionLabel}» нет точных данных о сервисах, но фильм можно поискать на популярных площадках.`
                : `Для региона «${regionLabel}» нет данных о сервисах. Попробуйте другой регион.`}
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

          {searchServices.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-bold text-[#9aa0c4]">Поискать на сервисах</div>
              <div className="flex flex-wrap gap-2">
                {searchServices.map((s) => (
                  <a
                    key={s.id}
                    href={s.url(serviceQuery(s, titles))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CHIP}
                  >
                    <span
                      className="w-7 h-7 rounded-lg grid place-items-center text-[13px] font-extrabold text-black/80"
                      style={{ background: s.color }}
                    >
                      {s.name[0]}
                    </span>
                    {s.name}
                    <Icon n="external-link" className="w-3 h-3 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}

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
