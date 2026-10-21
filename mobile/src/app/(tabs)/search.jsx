import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { tmdb } from "../../lib/tmdb";
import { Button, COLORS, Empty, Eyebrow, Field, Icon, Notice, PageTitle, SectionTitle } from "../../components/ui";
import ChipSelect from "../../components/ChipSelect";
import TmdbGrid from "../../components/TmdbGrid";

const TYPES = [
  { id: "movie", label: "Фильмы" },
  { id: "tv", label: "Сериалы" },
];
const MIN_RATINGS = [
  { id: "0", label: "Любой рейтинг" },
  { id: "6", label: "От 6.0" },
  { id: "7", label: "От 7.0" },
  { id: "7.5", label: "От 7.5" },
  { id: "8", label: "От 8.0" },
];
const sortOptions = (type) => [
  { id: "popularity.desc", label: "Сначала популярные" },
  { id: "vote_average.desc", label: "По рейтингу" },
  { id: type === "tv" ? "first_air_date.desc" : "primary_release_date.desc", label: "Сначала новые" },
  { id: "vote_count.desc", label: "По количеству оценок" },
];
const DEFAULT_FILTERS = { type: "movie", genres: [], yearFrom: "", yearTo: "", minRating: "0", sortBy: "popularity.desc" };

// Значение поля, которое меняется не чаще чем раз в delay мс
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Параметры TMDB /discover для подбора по фильтрам. Бросает ошибку при неверных годах.
function discoverParams(f) {
  const from = f.yearFrom.trim();
  const to = f.yearTo.trim();
  if ((from && !/^\d{4}$/.test(from)) || (to && !/^\d{4}$/.test(to))) {
    throw new Error("Укажи год четырьмя цифрами, например 2000.");
  }
  if (from && to && Number(from) > Number(to)) throw new Error("Год «от» не может быть больше года «до».");
  const dateField = f.type === "tv" ? "first_air_date" : "primary_release_date";
  return {
    sort_by: f.sortBy,
    "vote_count.gte": "10",
    ...(f.genres.length ? { with_genres: f.genres.join(",") } : {}),
    ...(f.minRating !== "0" ? { "vote_average.gte": f.minRating } : {}),
    ...(from ? { [`${dateField}.gte`]: `${from}-01-01` } : {}),
    ...(to ? { [`${dateField}.lte`]: `${to}-12-31` } : {}),
  };
}

// «Искать»: поиск по каталогу TMDB и подбор по фильтрам
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query.trim(), 350);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_FILTERS); // то, что выбрано в панели
  const [applied, setApplied] = useState(null); // то, по чему ищем (после «Подобрать»)
  const [filterError, setFilterError] = useState("");
  const setDraftField = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const genres = useQuery({
    queryKey: ["tmdbGenres", draft.type],
    queryFn: () => tmdb(`/genre/${draft.type}/list`),
    enabled: filtersOpen,
  });

  // Что показываем: поиск по названию, подбор по фильтрам или популярное
  const mode = debouncedQuery ? "text" : applied ? "filters" : "popular";
  const results = useInfiniteQuery({
    queryKey: ["tmdbSearch", mode, debouncedQuery, applied],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = String(pageParam);
      if (mode === "text") {
        const data = await tmdb("/search/multi", { query: debouncedQuery, page });
        return { ...data, results: data.results.filter((r) => r.media_type !== "person") };
      }
      if (mode === "filters") {
        const data = await tmdb(`/discover/${applied.type}`, { ...discoverParams(applied), page });
        return { ...data, results: data.results.map((r) => ({ ...r, media_type: applied.type })) };
      }
      const data = await tmdb("/movie/popular", { page });
      return { ...data, results: data.results.map((r) => ({ ...r, media_type: "movie" })) };
    },
    getNextPageParam: (last) => (last.page < Math.min(last.total_pages, 500) ? last.page + 1 : undefined),
  });
  const items = (results.data?.pages || []).flatMap((p) => p.results);
  // TMDB иногда повторяет фильм на соседних страницах
  const unique = items.filter((item, i) => items.findIndex((x) => x.id === item.id && x.media_type === item.media_type) === i);

  const applyFilters = () => {
    try {
      discoverParams(draft);
      setFilterError("");
      setQuery("");
      setApplied(draft);
      setFiltersOpen(false);
    } catch (e) {
      setFilterError(e.message);
    }
  };

  const header = (
    <View className="gap-4 pb-5">
      <View className="px-4 pt-2">
        <Eyebrow>Каталог TMDB</Eyebrow>
        <PageTitle>Открыть новое</PageTitle>
      </View>

      <View className="px-4 flex-row gap-2.5">
        <Field
          className="flex-1"
          icon="search"
          value={query}
          onChangeText={setQuery}
          placeholder="Фильм или сериал"
          returnKeyType="search"
          size="md"
        />
        <Pressable
          onPress={() => setFiltersOpen((v) => !v)}
          className={`h-11 px-3.5 rounded-xl flex-row items-center ${filtersOpen || applied ? "bg-accent/15" : "bg-white/[0.07]"}`}
        >
          <Icon name="sliders" size={16} color={filtersOpen || applied ? COLORS.accent : COLORS.ink} />
        </Pressable>
      </View>

      {filtersOpen && (
        <View className="gap-3">
          <ChipSelect
            options={TYPES}
            value={draft.type}
            onChange={(type) => setDraft((d) => ({ ...d, type, genres: [], sortBy: "popularity.desc" }))}
          />
          <View className="px-4 flex-row gap-2.5">
            <Field
              className="flex-1"
              value={draft.yearFrom}
              onChangeText={setDraftField("yearFrom")}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Год от"
              size="md"
            />
            <Field
              className="flex-1"
              value={draft.yearTo}
              onChangeText={setDraftField("yearTo")}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Год до"
              size="md"
            />
          </View>
          <ChipSelect options={MIN_RATINGS} value={draft.minRating} onChange={setDraftField("minRating")} />
          <ChipSelect options={sortOptions(draft.type)} value={draft.sortBy} onChange={setDraftField("sortBy")} />
          <View className="px-4 flex-row flex-wrap gap-2">
            {(genres.data?.genres || []).map((g) => {
              const active = draft.genres.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      genres: active ? d.genres.filter((id) => id !== g.id) : [...d.genres, g.id],
                    }))
                  }
                  className={`min-h-[36px] px-4 rounded-full border justify-center ${active ? "border-accent bg-accent/15" : "border-white/10 bg-deep"}`}
                >
                  <Text className={`text-[13px] font-bold ${active ? "text-[#ffa27d]" : "text-soft"}`}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {filterError ? (
            <View className="px-4">
              <Notice error>{filterError}</Notice>
            </View>
          ) : null}
          <View className="px-4 flex-row gap-2.5">
            <Button
              className="flex-1"
              size="md"
              variant="soft"
              title="Сбросить"
              onPress={() => {
                setDraft(DEFAULT_FILTERS);
                setApplied(null);
              }}
            />
            <Button className="flex-1" size="md" title="Подобрать" onPress={applyFilters} />
          </View>
        </View>
      )}

      {mode === "popular" && (
        <SectionTitle className="px-4">Сейчас популярно</SectionTitle>
      )}
      {mode === "filters" && !filtersOpen && (
        <View className="px-4 flex-row items-center justify-between">
          <SectionTitle>Подбор по фильтрам</SectionTitle>
          <Pressable onPress={() => setApplied(null)}>
            <Text className="text-[13px] font-bold text-accent-light">Сбросить</Text>
          </Pressable>
        </View>
      )}
      {results.error ? (
        <View className="px-4">
          <Notice error>{results.error.message}</Notice>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <TmdbGrid
        items={unique}
        ListHeaderComponent={header}
        ListEmptyComponent={
          results.isLoading ? (
            <ActivityIndicator color={COLORS.accent} className="mt-10" />
          ) : results.error ? null : (
            <View className="px-4">
              <Empty
                text={
                  mode === "filters"
                    ? "По этим фильтрам ничего не найдено. Попробуй изменить жанры или годы."
                    : "Ничего не найдено"
                }
              />
            </View>
          )
        }
        onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
        onEndReachedThreshold={0.6}
        ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator color={COLORS.accent} /> : null}
      />
    </SafeAreaView>
  );
}
