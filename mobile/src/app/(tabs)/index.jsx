import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "../../lib/tmdb";
import { BACKDROP, POSTER } from "../../lib/config";
import { openMovie } from "../../lib/nav";
import { Button, Chip, COLORS, Eyebrow, Icon, Logo, MovieCard, Notice, PageTitle, SectionTitle } from "../../components/ui";
import NotificationsBell from "../../components/NotificationsBell";

const YEAR = (movie) => (movie.release_date || movie.first_air_date || "").slice(0, 4);
const isTrailer = (v) => v.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(v.type);

// Подборки TMDB для главной и трейлер фильма в центре внимания
async function loadHome() {
  const list = async (path) =>
    (await tmdb(path)).results.map((m) => ({ ...m, media_type: "movie" }));
  const [popular, topRated, nowPlaying] = await Promise.all([
    list("/movie/popular"),
    list("/movie/top_rated"),
    list("/movie/now_playing"),
  ]);
  const featured = [...nowPlaying, ...popular].find((m) => m.backdrop_path) || popular[0] || null;

  let trailerKey = null;
  if (featured) {
    for (const language of ["ru-RU", "en-US"]) {
      const videos = (await tmdb(`/movie/${featured.id}/videos`, { language }).catch(() => ({}))).results || [];
      const trailer = videos.find((v) => isTrailer(v) && v.official) || videos.find(isTrailer);
      if (trailer) {
        trailerKey = trailer.key;
        break;
      }
    }
  }

  const eveningPicks = [...popular]
    .filter((m) => Number(m.vote_average) >= 6.5 && Number(m.vote_count) >= 100)
    .sort((a, b) => b.vote_average * Math.log10(b.vote_count + 1) - a.vote_average * Math.log10(a.vote_count + 1))
    .slice(0, 10);

  return {
    featured,
    trailerKey,
    rows: [
      { title: "Топ по рейтингу TMDB", subtitle: "Самые высоко оценённые фильмы в каталоге TMDB", items: topRated.slice(0, 12) },
      { title: "Что посмотреть вечером", subtitle: "Популярные фильмы с хорошим рейтингом", items: eveningPicks },
      { title: "Сейчас в кино", subtitle: "Фильмы из текущей подборки TMDB", items: nowPlaying.slice(0, 12) },
      { title: "Популярное", subtitle: "Что сейчас часто смотрят и ищут", items: popular.slice(0, 12) },
    ],
  };
}

function MovieRow({ title, subtitle, items }) {
  return (
    <View className="gap-3.5">
      <View className="px-4">
        <SectionTitle>{title}</SectionTitle>
        <Text className="mt-1 text-[13px] text-muted">{subtitle}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
        {items.map((movie, index) => (
          <View key={movie.id} className="w-[112px]">
            <MovieCard
              poster={movie.poster_path ? `${POSTER}${movie.poster_path}` : null}
              title={movie.title}
              footer={YEAR(movie) || "Год неизвестен"}
              onPress={() => openMovie(movie)}
              chips={
                <>
                  <Chip solid tone="orange">★ {Number(movie.vote_average || 0).toFixed(1)}</Chip>
                  {index < 3 && <Chip solid>#{index + 1}</Chip>}
                </>
              }
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// Быстрый переход в раздел, которого нет на нижней панели
const Shortcut = ({ icon, title, onPress }) => (
  <Pressable onPress={onPress} className="flex-1 flex-row items-center gap-2.5 h-12 px-3.5 rounded-[14px] bg-panel border border-white/[0.07] active:opacity-80">
    <Icon name={icon} size={18} color={COLORS.accent} />
    <Text className="text-sm font-bold text-white">{title}</Text>
  </Pressable>
);

// «Главная»: трейлер, подборки TMDB и переходы в «Что смотреть» и ленту друзей
export default function HomeScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ["home"], queryFn: loadHome, staleTime: 10 * 60 * 1000 });
  const featured = data?.featured;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-8 pb-10"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
      >
        <View className="px-4 pt-2 flex-row items-center justify-between">
          <Logo />
          <NotificationsBell />
        </View>

        <View className="px-4 gap-3">
          <View>
            <Eyebrow>Movie night</Eyebrow>
            <PageTitle>Главная</PageTitle>
          </View>
          <View className="flex-row gap-2.5">
            <Shortcut icon="star" title="Что смотреть" onPress={() => router.push("/discover")} />
            <Shortcut icon="activity" title="Лента друзей" onPress={() => router.push("/feed")} />
          </View>
        </View>

        {error ? (
          <View className="px-4">
            <Notice error>{`${error.message}. Проверьте подключение и ключ TMDB.`}</Notice>
          </View>
        ) : null}
        {isLoading && <ActivityIndicator color={COLORS.accent} />}

        {featured && (
          <View className="mx-4 overflow-hidden rounded-[24px] border border-white/[0.08] bg-panel">
            <Pressable
              onPress={() =>
                data.trailerKey
                  ? Linking.openURL(`https://www.youtube.com/watch?v=${data.trailerKey}`)
                  : openMovie(featured)
              }
              className="aspect-video"
            >
              {featured.backdrop_path ? (
                <Image source={{ uri: `${BACKDROP}${featured.backdrop_path}` }} className="w-full h-full" contentFit="cover" />
              ) : (
                <LinearGradient colors={["#252b58", "#0d1021"]} className="w-full h-full" />
              )}
              {data.trailerKey && (
                <View className="absolute inset-0 items-center justify-center bg-black/25">
                  <View className="w-16 h-16 rounded-full bg-accent items-center justify-center">
                    <Icon name="play" size={28} color={COLORS.onAccent} />
                  </View>
                </View>
              )}
            </Pressable>
            <View className="p-5">
              <View className="mb-3 flex-row flex-wrap gap-2">
                <Chip tone="orange">{data.trailerKey ? "Трейлер" : "В центре внимания"}</Chip>
                {YEAR(featured) ? <Chip>{YEAR(featured)}</Chip> : null}
                <Chip>★ {Number(featured.vote_average || 0).toFixed(1)} / 10</Chip>
              </View>
              <Text className="text-2xl font-bold leading-tight text-white">{featured.title}</Text>
              <Text numberOfLines={4} className="mt-3 text-sm leading-relaxed text-[#c4c8e4]">
                {featured.overview || "Посмотрите трейлер и решите, подходит ли этот фильм для следующего вечера."}
              </Text>
              <Button className="mt-5 self-start" size="md" title="Подробнее о фильме" onPress={() => openMovie(featured)} />
            </View>
          </View>
        )}

        {(data?.rows || []).map((row) => (row.items.length ? <MovieRow key={row.title} {...row} /> : null))}
      </ScrollView>
    </SafeAreaView>
  );
}
