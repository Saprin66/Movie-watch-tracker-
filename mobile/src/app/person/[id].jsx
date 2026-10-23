import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "../../lib/tmdb";
import { POSTER, POSTER_LARGE } from "../../lib/config";
import { useMovies } from "../../lib/movies";
import { openMovie } from "../../lib/nav";
import { pluralize } from "../../utils/plural";
import { Button, Chip, COLORS, Icon, MovieCard, Notice, Poster } from "../../components/ui";
import ChipSelect from "../../components/ChipSelect";

const DEPARTMENTS = {
  Acting: "Актёр",
  Directing: "Режиссёр",
  Writing: "Сценарист",
  Production: "Продюсер",
  Sound: "Композитор",
  Camera: "Оператор",
};

// Разделы фильмографии: роли и основные должности в съёмочной группе
const ROLE_TABS = [
  { id: "cast", label: "Актёр" },
  { id: "Director", label: "Режиссёр" },
  { id: "Writer", label: "Сценарист", jobs: ["Writer", "Screenplay", "Story", "Novel"] },
  { id: "Producer", label: "Продюсер", jobs: ["Producer", "Executive Producer"] },
];

// Появления «в роли себя» (ток-шоу, документалки) — не роли, в фильмографию не берём
const SELF_ROLE = /^(self|himself|herself|themselves|сам|сама)\b/i;

const yearOf = (item) => (item.release_date || item.first_air_date || "").slice(0, 4);
const keyOf = (item) => `${item.media_type}-${item.id}`;

async function loadPerson(id) {
  const data = await tmdb(`/person/${id}`, { append_to_response: "combined_credits" });
  // Биографии на русском часто нет — берём английскую
  if (!data.biography) {
    const en = await tmdb(`/person/${id}`, { language: "en-US" }).catch(() => null);
    if (en?.biography) data.biography = en.biography;
  }
  if (data.birthday && !data.deathday) {
    data.age = Math.floor((Date.now() - new Date(data.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
  }
  return data;
}

// Фильмография по разделу: без дублей, от новых к старым, ещё не вышедшее — в начале
function filmography(credits, tab) {
  const source =
    tab.id === "cast"
      ? credits?.cast || []
      : (credits?.crew || []).filter((c) => (tab.jobs || [tab.id]).includes(c.job));
  const byKey = new Map();
  for (const item of source) {
    if (item.media_type !== "movie" && item.media_type !== "tv") continue;
    if (tab.id === "cast" && SELF_ROLE.test(item.character || "")) continue;
    const prev = byKey.get(keyOf(item));
    // У сериалов одна роль может быть записана несколько раз — склеиваем
    if (prev) {
      if (item.character && !prev.character?.includes(item.character)) {
        prev.character = [prev.character, item.character].filter(Boolean).join(", ");
      }
    } else {
      byKey.set(keyOf(item), { ...item });
    }
  }
  return [...byKey.values()].sort((a, b) => (yearOf(b) || "9999").localeCompare(yearOf(a) || "9999"));
}

const InfoChip = ({ icon, children, tone = "soft" }) => (
  <View
    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
      tone === "green" ? "bg-emerald-400/[0.14]" : tone === "orange" ? "bg-accent/[0.16]" : "bg-white/[0.08]"
    }`}
  >
    {icon && <Icon name={icon} size={13} color={tone === "green" ? COLORS.green : COLORS.muted} />}
    <Text
      className={`text-xs font-bold ${tone === "green" ? "text-[#58dcaa]" : tone === "orange" ? "text-[#ff9a6c]" : "text-soft"}`}
    >
      {children}
    </Text>
  </View>
);

// Актёр или режиссёр: фото, биография и фильмография с отметками «смотрел / в списке»
export default function PersonScreen() {
  const { id } = useLocalSearchParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tmdb", "person", id],
    queryFn: () => loadPerson(id),
  });
  const { data: movies } = useMovies();
  const [bioOpen, setBioOpen] = useState(false);
  const [tabId, setTabId] = useState(null);

  // Записи журнала по ключу «movie-123», чтобы отметить уже просмотренное
  const journal = useMemo(
    () => new Map((movies || []).map((m) => [`${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`, m])),
    [movies],
  );

  const tabs = useMemo(
    () =>
      ROLE_TABS.map((t) => ({ ...t, items: filmography(data?.combined_credits, t) })).filter((t) => t.items.length > 0),
    [data],
  );
  // По умолчанию — основная профессия человека
  const mainTab = { Directing: "Director", Writing: "Writer", Production: "Producer" }[data?.known_for_department] || "cast";
  const activeTab = tabs.find((t) => t.id === tabId) || tabs.find((t) => t.id === mainTab) || tabs[0];

  const allKeys = new Set(tabs.flatMap((t) => t.items.map(keyOf)));
  const watchedCount = [...allKeys].filter((k) => journal.get(k)?.status === "WATCHED").length;

  const photo = data?.profile_path ? `${POSTER_LARGE}${data.profile_path}` : null;
  const born = data?.birthday
    ? new Date(data.birthday).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const back = (
    <Pressable
      onPress={() => router.back()}
      className="absolute top-3 left-3 z-20 w-11 h-11 items-center justify-center rounded-full bg-[#080a16]/70"
    >
      <Icon name="chevron-left" size={24} />
    </Pressable>
  );

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-panel">
        {back}
        <View className="flex-1 justify-center px-6 gap-4">
          {isLoading ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <>
              <Notice error>Не удалось загрузить данные: {error?.message || "человек не найден в TMDB"}</Notice>
              <Button title="Повторить" variant="soft" onPress={() => refetch()} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const items = activeTab?.items || [];
  const rows = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-panel">
      {back}
      <ScrollView contentContainerClassName="pb-10">
        {/* Фон: фото, уходящее в тёмный фон */}
        <View className="absolute inset-x-0 top-0 h-[420px]">
          {photo && <Image source={{ uri: photo }} className="w-full h-full opacity-40" contentFit="cover" blurRadius={6} />}
          <LinearGradient colors={["rgba(18,21,42,0.3)", "#12152a"]} className="absolute inset-0" />
        </View>

        <View className="items-center px-5 pt-14">
          <View className="w-[150px] aspect-[2/3] overflow-hidden rounded-[20px] border border-white/20">
            <Poster uri={photo} title={data.name} />
          </View>
          <Text className="mt-5 text-[26px] font-bold text-white text-center leading-tight">{data.name}</Text>
          <View className="mt-4 flex-row flex-wrap justify-center gap-2">
            {data.known_for_department && (
              <InfoChip tone="orange">{DEPARTMENTS[data.known_for_department] || data.known_for_department}</InfoChip>
            )}
            {born && (
              <InfoChip icon="gift">
                {born}
                {data.age != null ? ` · ${data.age} ${pluralize(data.age, "год", "года", "лет")}` : ""}
              </InfoChip>
            )}
            {data.place_of_birth && <InfoChip icon="map-pin">{data.place_of_birth}</InfoChip>}
            {allKeys.size > 0 && (
              <InfoChip icon="check" tone="green">
                Вы смотрели {watchedCount} из {allKeys.size}
              </InfoChip>
            )}
          </View>
        </View>

        <View className="mx-4 mt-7 bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-4">
          <Text className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-[#7b81a6] mb-2">Биография</Text>
          {data.biography ? (
            <>
              <Text numberOfLines={bioOpen ? undefined : 6} className="text-sm text-[#d0d3ea] leading-6">
                {data.biography}
              </Text>
              {data.biography.length > 320 && (
                <Pressable onPress={() => setBioOpen((v) => !v)} className="mt-1 py-2 self-start">
                  <Text className="text-sm font-bold text-accent-light">{bioOpen ? "Свернуть" : "Читать полностью"}</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text className="text-sm text-soft">Биографии пока нет.</Text>
          )}
        </View>

        {activeTab && (
          <View className="mt-8 gap-4">
            <Text className="px-4 text-[19px] font-semibold text-white">
              Фильмография <Text className="text-muted">· {items.length}</Text>
            </Text>
            {tabs.length > 1 && (
              <ChipSelect
                options={tabs.map((t) => ({ id: t.id, label: t.label }))}
                value={activeTab.id}
                onChange={setTabId}
              />
            )}
            <View className="gap-5 px-4">
              {rows.map((row) => (
                <View key={keyOf(row[0])} className="flex-row gap-3">
                  {row.map((item) => {
                    const entry = journal.get(keyOf(item));
                    const year = yearOf(item);
                    return (
                      <MovieCard
                        key={keyOf(item)}
                        poster={item.poster_path ? `${POSTER}${item.poster_path}` : null}
                        title={item.title || item.name}
                        footer={`${year || "Скоро"}${activeTab.id === "cast" && item.character ? ` · ${item.character}` : ""}`}
                        onPress={() => openMovie(item)}
                        chips={
                          <>
                            {entry?.status === "WATCHED" && (
                              <Chip solid tone="green">
                                {entry.rating ? `✓ ${entry.rating}` : "✓ Смотрел"}
                              </Chip>
                            )}
                            {entry?.status === "WATCHLIST" && (
                              <Chip solid tone="blue">
                                В списке
                              </Chip>
                            )}
                            {item.media_type === "tv" && (
                              <Chip solid tone="orange">
                                Сериал
                              </Chip>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                  {Array.from({ length: 3 - row.length }, (_, i) => (
                    <View key={i} className="flex-1" />
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
