import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useMovies } from "../../lib/movies";
import { DEFAULT_FILTERS, KIND_OPTIONS, RATING_OPTIONS, collectFacets, countActiveFilters, filterMovies, isFiltering } from "../../utils/filterMovies";
import { SORT_OPTIONS, sortMovies } from "../../utils/sortMovies";
import { Button, Chip, COLORS, Empty, Eyebrow, Field, Icon, MovieCard, PageTitle } from "../../components/ui";
import ChipSelect from "../../components/ChipSelect";

const STATUS_TABS = [
  { id: "all", label: "Все" },
  { id: "watched", label: "Просмотрено" },
  { id: "watchlist", label: "Буду смотреть" },
];

// «Мой список»: журнал пользователя с вкладками, поиском, фильтрами и сортировкой
export default function MyListScreen() {
  const { user } = useAuth();
  const { data: movies = [], isLoading, isRefetching, refetch, error } = useMovies();
  const [status, setStatus] = useState("all");
  const [sortMode, setSortMode] = useState("added");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const counts = {
    all: movies.length,
    watched: movies.filter((m) => m.status === "WATCHED").length,
    watchlist: movies.filter((m) => m.status === "WATCHLIST").length,
  };
  const byStatus = useMemo(
    () =>
      status === "all"
        ? movies
        : movies.filter((m) => m.status === (status === "watched" ? "WATCHED" : "WATCHLIST")),
    [movies, status],
  );
  const shown = useMemo(() => sortMovies(filterMovies(byStatus, filters), sortMode), [byStatus, filters, sortMode]);
  const facets = useMemo(() => collectFacets(movies), [movies]);
  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  // «Всё / Фильмы / Сериалы» всегда на виду, поэтому в счётчик фильтров не входит
  const activeCount = countActiveFilters({ ...filters, kind: "all" });

  const header = (
    <View className="gap-5 pb-5">
      <View className="px-4 pt-2 flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Eyebrow>Мой список</Eyebrow>
          <PageTitle>Журнал {user?.username || ""}</PageTitle>
        </View>
        <Button icon="plus" size="md" square onPress={() => router.navigate("/search")} />
      </View>

      <View className="flex-row gap-5 px-4 border-b border-white/[0.07]">
        {STATUS_TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setStatus(t.id)}
            className={`flex-row items-center gap-2 py-3 -mb-px border-b-2 ${status === t.id ? "border-accent" : "border-transparent"}`}
          >
            <Text className={`text-sm font-bold ${status === t.id ? "text-accent-light" : "text-muted"}`}>{t.label}</Text>
            <Text className="text-xs px-2 rounded-full bg-white/[0.07] text-soft overflow-hidden">{counts[t.id]}</Text>
          </Pressable>
        ))}
      </View>

      <ChipSelect options={KIND_OPTIONS} value={filters.kind} onChange={setFilter("kind")} />

      <View className="px-4 flex-row gap-2.5">
        <Field
          className="flex-1"
          icon="search"
          value={filters.query}
          onChangeText={setFilter("query")}
          placeholder="Найти в журнале"
          size="md"
        />
        <Pressable
          onPress={() => setFiltersOpen((v) => !v)}
          className={`h-11 px-3.5 rounded-xl flex-row items-center gap-1.5 ${filtersOpen || activeCount ? "bg-accent/15" : "bg-white/[0.07]"}`}
        >
          <Icon name="sliders" size={16} color={filtersOpen || activeCount ? COLORS.accent : COLORS.ink} />
          {activeCount > 0 && <Text className="text-[13px] font-bold text-accent-light">{activeCount}</Text>}
        </Pressable>
      </View>

      {filtersOpen && (
        <View className="gap-3">
          <ChipSelect options={SORT_OPTIONS} value={sortMode} onChange={setSortMode} />
          <ChipSelect options={RATING_OPTIONS} value={filters.rating} onChange={setFilter("rating")} />
          {facets.genres.length > 0 && (
            <ChipSelect
              options={[{ id: "", label: "Все жанры" }, ...facets.genres.map((g) => ({ id: g.name, label: `${g.name} · ${g.count}` }))]}
              value={filters.genre}
              onChange={setFilter("genre")}
            />
          )}
          {facets.decades.length > 0 && (
            <ChipSelect
              options={[{ id: "", label: "Любые годы" }, ...facets.decades.map((d) => ({ id: String(d.decade), label: `${d.decade}-е` }))]}
              value={filters.decade}
              onChange={setFilter("decade")}
            />
          )}
        </View>
      )}
    </View>
  );

  let empty;
  if (isLoading) {
    empty = <ActivityIndicator color={COLORS.accent} className="mt-10" />;
  } else if (error) {
    empty = (
      <Empty text={error.message}>
        <Button title="Повторить" variant="soft" size="md" onPress={() => refetch()} />
      </Empty>
    );
  } else if (isFiltering(filters) && byStatus.length > 0) {
    empty = (
      <Empty text="По этим условиям ничего не нашлось.">
        <Button title="Сбросить фильтры" variant="soft" size="md" onPress={() => setFilters(DEFAULT_FILTERS)} />
      </Empty>
    );
  } else {
    empty = <Empty text="Здесь пока пусто. Нажми «+» и добавь первый фильм." />;
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <FlatList
        data={shown}
        keyExtractor={(m) => m.id}
        numColumns={3}
        ListHeaderComponent={header}
        ListEmptyComponent={<View className="px-4">{empty}</View>}
        columnWrapperClassName="gap-3 px-4"
        contentContainerClassName="gap-5 pb-8"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
        renderItem={({ item: movie, index }) => (
          <>
            <MovieCard
              poster={movie.posterUrl}
              title={movie.title}
              onPress={() => router.push(`/review/${movie.id}`)}
              footer={movie.releaseYear ? String(movie.releaseYear) : movie.mediaType === "tv" ? "Сериал" : "Фильм"}
              chips={
                <>
                  <Chip solid tone={movie.status === "WATCHED" ? "green" : "blue"}>
                    {movie.status === "WATCHED" ? "Смотрел" : "Буду"}
                  </Chip>
                  {movie.rating ? <Chip solid tone="orange">★ {movie.rating}</Chip> : null}
                  {movie.mediaType === "tv" && filters.kind !== "tv" ? (
                    <Chip solid tone="orange">
                      Сериал
                    </Chip>
                  ) : null}
                </>
              }
            />
            {/* Последний ряд добиваем пустыми ячейками, чтобы карточки не растягивались */}
            {index === shown.length - 1 &&
              Array.from({ length: (3 - (shown.length % 3)) % 3 }, (_, i) => <View key={i} className="flex-1" />)}
          </>
        )}
      />
    </SafeAreaView>
  );
}
