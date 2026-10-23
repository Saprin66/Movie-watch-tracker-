import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDetails, tmdb } from "../lib/tmdb";
import { POSTER } from "../lib/config";
import { useMovieActions, useMovies } from "../lib/movies";
import { openMovie } from "../lib/nav";
import { keyOf, mergeRecommendations, pickSeeds } from "../utils/recommendations";
import { Button, Chip, COLORS, MovieCard, Notice, Panel, Poster, ScreenHeader, SectionTitle } from "../components/ui";
import ChipSelect from "../components/ChipSelect";
import WatchProviders from "../components/WatchProviders";
import Roulette from "../components/Roulette";

const KINDS = [
  { id: "all", label: "Всё" },
  { id: "movie", label: "Фильмы" },
  { id: "tv", label: "Сериалы" },
];
const typeOf = (movie) => (movie.mediaType === "tv" ? "tv" : "movie");

// Выпавший в рулетке фильм: описание и где посмотреть
function PickedMovie({ movie, onAnother, onWatched }) {
  const actions = useMovieActions();
  const [busy, setBusy] = useState(false);
  const { data: found, error, refetch } = useQuery({
    queryKey: ["tmdb", typeOf(movie), String(movie.tmdbId)],
    queryFn: () => fetchDetails(typeOf(movie), movie.tmdbId),
  });
  const details = found?.data;
  const year = (details?.release_date || details?.first_air_date || "").slice(0, 4);

  return (
    <View className="gap-5">
      <View className="flex-row gap-4">
        <View className="w-28 aspect-[2/3] overflow-hidden rounded-[14px] border border-white/10">
          <Poster uri={movie.posterUrl} title={movie.title} />
        </View>
        <View className="flex-1 gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            {movie.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
            {year ? <Chip>{year}</Chip> : null}
            {details?.vote_average ? <Chip tone="orange">★ {details.vote_average.toFixed(1)}</Chip> : null}
          </View>
          <Text className="text-[22px] font-bold leading-tight text-white" onPress={() => openMovie(movie)}>
            {movie.title}
          </Text>
          {details?.genres?.length > 0 && (
            <Text className="text-xs font-bold text-soft">{details.genres.map((g) => g.name).join(" · ")}</Text>
          )}
        </View>
      </View>
      {error ? (
        <View className="gap-2">
          <Notice error>Не удалось загрузить описание: нет связи с TMDB.</Notice>
          <Button size="md" variant="soft" title="Повторить" onPress={() => refetch()} />
        </View>
      ) : (
        <Text numberOfLines={6} className="text-sm leading-6 text-[#c4c8e4]">
          {details ? details.overview || "Описание отсутствует" : "Загружаю описание..."}
        </Text>
      )}
      <View className="flex-row gap-2.5">
        <Button className="flex-1" size="md" variant="soft" icon="shuffle" title="Ещё раз" onPress={onAnother} />
        <Button
          className="flex-1"
          size="md"
          icon="check"
          title="Посмотрел"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            const ok = await actions.setStatus(movie.id, "WATCHED").then(
              () => true,
              () => false,
            );
            setBusy(false);
            if (ok) onWatched();
          }}
        />
      </View>
      <View className="-mx-4">
        <WatchProviders type={typeOf(movie)} tmdbId={movie.tmdbId} />
      </View>
    </View>
  );
}

// «Что смотреть»: рулетка по своему списку и рекомендации по высоким оценкам
export default function DiscoverScreen() {
  const { data: movies = [], isLoading } = useMovies();
  const [kind, setKind] = useState("all");
  const [pickedId, setPickedId] = useState(null);
  const [seedKey, setSeedKey] = useState(0);

  const watchlist = useMemo(
    () => movies.filter((m) => m.status === "WATCHLIST" && (kind === "all" || typeOf(m) === kind)),
    [movies, kind],
  );
  const picked = watchlist.find((m) => m.id === pickedId) || null;

  // Опорные фильмы выбираются заново по кнопке «Другая подборка»
  const hasWatched = movies.some((m) => m.status === "WATCHED");
  const seeds = useMemo(() => pickSeeds(movies, 3), [seedKey, hasWatched]); // eslint-disable-line react-hooks/exhaustive-deps
  const recs = useQuery({
    queryKey: ["recommendations", seeds.map((s) => s.id)],
    enabled: seeds.length > 0,
    queryFn: async () => {
      const lists = await Promise.all(
        seeds.map((seed) =>
          tmdb(`/${typeOf(seed)}/${seed.tmdbId}/recommendations`)
            .then((data) => ({ seed, results: data.results }))
            .catch(() => ({ seed, results: [] })),
        ),
      );
      return mergeRecommendations(lists);
    },
  });
  const journalKeys = new Set(movies.map((m) => keyOf(m.mediaType, m.tmdbId)));
  const visibleRecs = (recs.data || []).filter((r) => !journalKeys.has(r.key)).slice(0, 12);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader title="Что смотреть" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="gap-8 pb-10">
        <View className="px-4">
          <Panel className="p-4 gap-5">
            <View>
              <SectionTitle>Рулетка</SectionTitle>
              <Text className="mt-1 text-[13px] text-muted">Случайный фильм из «Буду смотреть»</Text>
            </View>
            <View className="-mx-4">
              <ChipSelect
                options={KINDS}
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  setPickedId(null);
                }}
              />
            </View>
            {isLoading ? (
              <ActivityIndicator color={COLORS.accent} />
            ) : watchlist.length > 0 ? (
              // key: при смене фильтра рулетка начинает заново
              <Roulette
                key={kind}
                watchlist={watchlist}
                winner={picked}
                onWinner={(m) => setPickedId(m?.id ?? null)}
                renderWinner={(spinAgain) => (
                  <PickedMovie
                    key={picked.id}
                    movie={picked}
                    onAnother={spinAgain}
                    onWatched={() => setPickedId(null)}
                  />
                )}
              />
            ) : (
              <Text className="py-6 text-center text-sm text-muted">
                В списке «Буду смотреть» пока ничего нет{kind !== "all" ? " для этого фильтра" : ""}. Добавьте фильмы через
                поиск или из подборки ниже.
              </Text>
            )}
          </Panel>
        </View>

        <View className="gap-4">
          <View className="px-4 gap-3">
            <SectionTitle>Рекомендации по вашим оценкам</SectionTitle>
            {hasWatched && (
              <Button
                className="self-start"
                size="md"
                variant="soft"
                icon="refresh-cw"
                title="Другая подборка"
                disabled={recs.isFetching}
                onPress={() => setSeedKey((k) => k + 1)}
              />
            )}
            {seeds.length > 0 && (
              <Text className="text-[13px] text-muted">
                На основе: {seeds.map((s) => (s.rating ? `${s.title} (${s.rating})` : s.title)).join(", ")}
              </Text>
            )}
          </View>
          {!hasWatched ? (
            <Text className="px-4 text-sm text-muted">
              Отметьте несколько фильмов просмотренными и поставьте оценки, и здесь появятся рекомендации.
            </Text>
          ) : recs.isLoading ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : visibleRecs.length === 0 ? (
            <Text className="px-4 text-sm text-muted">Новых рекомендаций не нашлось. Попробуйте другую подборку.</Text>
          ) : (
            <View className="px-4 flex-row flex-wrap gap-y-5 justify-between">
              {visibleRecs.map(({ key, item }) => (
                <View key={key} className="w-[31%]">
                  <MovieCard
                    poster={item.poster_path ? `${POSTER}${item.poster_path}` : null}
                    title={item.title || item.name}
                    footer={(item.release_date || item.first_air_date || "").slice(0, 4)}
                    onPress={() => openMovie(item)}
                    chips={item.vote_average ? <Chip solid tone="orange">★ {item.vote_average.toFixed(1)}</Chip> : null}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
